const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');
const POGRNValidationService = require('../services/POGRNValidationService');
const InventoryManagementService = require('../services/InventoryManagementService');

class GRNController {
    // Create new GRN
    async createGRN(req, res) {
        const connection = await db.getConnection();

        try {
            const {
                purchase_order_id,
                supplier_id,
                lr_number,
                supplier_invoice_number,
                supplier_invoice_date,
                items,
                skip_validation = false // For emergency receipts
            } = req.body;

            const received_by = req.user?.id || 1; // Default for development

            // Comprehensive PO-GRN Validation
            console.log('Starting PO-GRN validation...');
            const validationResults = await POGRNValidationService.validateGRNAgainstPO({
                purchase_order_id,
                supplier_id,
                items
            });

            // Handle validation results
            if (!validationResults.isValid && !skip_validation) {
                return res.status(400).json({
                    success: false,
                    message: 'GRN validation failed',
                    validation_errors: validationResults.errors,
                    validation_warnings: validationResults.warnings,
                    validation_summary: validationResults.summary,
                    can_force_create: true, // Allow force creation with skip_validation=true
                    data: null
                });
            }

            // Log validation warnings even if proceeding
            if (validationResults.warnings.length > 0) {
                console.log('GRN Validation Warnings:', validationResults.warnings);
            }

            await connection.beginTransaction();

            // Generate GRN number
            const grn_number = await generateDocumentId(DOCUMENT_TYPES.GOODS_RECEIVED_NOTE);

            // Calculate total amount
            const total_amount = items.reduce((sum, item) =>
                sum + (item.received_quantity * item.unit_price), 0
            );

            // Insert GRN
            const [result] = await connection.execute(`
                INSERT INTO goods_received_notes 
                (grn_number, purchase_order_id, supplier_id, grn_date, lr_number, 
                 supplier_invoice_number, supplier_invoice_date, total_amount, received_by, status) 
                VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, 'draft')
            `, [grn_number, purchase_order_id, supplier_id, lr_number,
                supplier_invoice_number, supplier_invoice_date, total_amount, received_by]);

            const grn_id = result.insertId;

            // Insert GRN items
            if (items && items.length > 0) {
                const itemsQuery = `
                    INSERT INTO grn_items 
                    (grn_id, product_id, ordered_quantity, received_quantity, accepted_quantity, 
                     rejected_quantity, unit_price, serial_numbers, warranty_start_date, 
                     warranty_end_date, location_id, notes) 
                    VALUES ?
                `;

                const itemsData = items.map(item => [
                    grn_id,
                    item.product_id,
                    item.ordered_quantity,
                    item.received_quantity,
                    item.accepted_quantity || item.received_quantity,
                    item.rejected_quantity || 0,
                    item.unit_price,
                    item.serial_numbers || null,
                    item.warranty_start_date || null,
                    item.warranty_end_date || null,
                    item.location_id,
                    item.notes || null
                ]);

                await connection.query(itemsQuery, [itemsData]);

                // Update stock for accepted items
                for (const item of items) {
                    if (item.accepted_quantity > 0) {
                        // Update main stock table
                        await connection.execute(`
                            INSERT INTO stock (product_id, location_id, quantity) 
                            VALUES (?, ?, ?) 
                            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                        `, [item.product_id, item.location_id, item.accepted_quantity]);

                        // Update inventory warehouse stock table (for inventory system integration)
                        await connection.execute(`
                            INSERT INTO inventory_warehouse_stock (item_id, location_id, current_stock) 
                            VALUES (?, ?, ?) 
                            ON DUPLICATE KEY UPDATE current_stock = current_stock + VALUES(current_stock)
                        `, [item.product_id, item.location_id, item.accepted_quantity]);

                        // Record stock movement
                        await connection.execute(`
                            INSERT INTO stock_movements 
                            (product_id, to_location_id, quantity, movement_type, reference_type, reference_id) 
                            VALUES (?, ?, ?, 'in', 'GRN', ?)
                        `, [item.product_id, item.location_id, item.accepted_quantity, grn_number]);
                    }
                }
            }

            // Get PO completion status after this GRN
            const completionStatus = await POGRNValidationService.getPOCompletionStatus(purchase_order_id);

            // Update PO status if fully completed
            if (completionStatus.overall_status === 'completed') {
                await connection.execute(`
                    UPDATE purchase_orders 
                    SET status = 'completed', completed_at = NOW()
                    WHERE id = ?
                `, [purchase_order_id]);
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'GRN created successfully',
                data: {
                    id: grn_id,
                    grn_number,
                    validation_warnings: validationResults.warnings,
                    po_completion_status: completionStatus
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating GRN',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Get all GRNs
    async getAllGRNs(req, res) {
        try {
            const query = `
                SELECT 
                    grn.*,
                    s.company_name as supplier_name,
                    po.po_id as po_number,
                    u.full_name as received_by_name,
                    v.full_name as verified_by_name,
                    a.full_name as approved_by_name
                FROM goods_received_notes grn
                LEFT JOIN suppliers s ON grn.supplier_id = s.id
                LEFT JOIN purchase_orders po ON grn.purchase_order_id = po.id
                LEFT JOIN users u ON grn.received_by = u.id
                LEFT JOIN users v ON grn.verified_by = v.id
                LEFT JOIN users a ON grn.approved_by = a.id
                ORDER BY grn.created_at DESC
            `;

            const [grns] = await db.execute(query);

            res.json({
                success: true,
                data: grns,
                count: grns.length
            });
        } catch (error) {
            console.error('Error fetching GRNs:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching GRNs',
                error: error.message
            });
        }
    }

    // Get GRN by ID
    async getGRNById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    grn.*,
                    s.company_name as supplier_name,
                    s.address as supplier_address,
                    po.po_id as po_number,
                    u.full_name as received_by_name
                FROM goods_received_notes grn
                LEFT JOIN suppliers s ON grn.supplier_id = s.id
                LEFT JOIN purchase_orders po ON grn.purchase_order_id = po.id
                LEFT JOIN users u ON grn.received_by = u.id
                WHERE grn.id = ?
            `;

            const [grns] = await db.execute(query, [id]);

            if (grns.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GRN not found'
                });
            }

            // Get GRN items
            const itemsQuery = `
                SELECT 
                    gi.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    l.name as location_name
                FROM grn_items gi
                LEFT JOIN products p ON gi.product_id = p.id
                LEFT JOIN locations l ON gi.location_id = l.id
                WHERE gi.grn_id = ?
                ORDER BY gi.id
            `;

            const [items] = await db.execute(itemsQuery, [id]);

            res.json({
                success: true,
                data: {
                    ...grns[0],
                    items
                }
            });
        } catch (error) {
            console.error('Error fetching GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching GRN',
                error: error.message
            });
        }
    }

    // Verify GRN
    async verifyGRN(req, res) {
        try {
            const { id } = req.params;
            const verified_by = req.user?.id || 1;

            await db.execute(
                'UPDATE goods_received_notes SET status = "verified", verified_by = ? WHERE id = ?',
                [verified_by, id]
            );

            res.json({
                success: true,
                message: 'GRN verified successfully'
            });
        } catch (error) {
            console.error('Error verifying GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error verifying GRN',
                error: error.message
            });
        }
    }

    // Approve GRN
    async approveGRN(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;
            const approved_by = req.user?.id || 1;

            // Get GRN details and items for inventory processing
            const [grnDetails] = await connection.execute(`
                SELECT * FROM goods_received_notes WHERE id = ?
            `, [id]);

            if (grnDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'GRN not found'
                });
            }

            const grn = grnDetails[0];

            // Check if already approved
            if (grn.status === 'approved') {
                return res.status(400).json({
                    success: false,
                    message: 'GRN is already approved'
                });
            }

            // Get GRN items
            const [grnItems] = await connection.execute(`
                SELECT * FROM grn_items WHERE grn_id = ?
            `, [id]);

            // Process enhanced inventory updates only if not already processed
            if (!grn.batch_processed) {
                console.log('Processing enhanced inventory updates for GRN:', grn.grn_number);

                const inventoryUpdates = await InventoryManagementService.processGRNInventoryUpdates(
                    id,
                    grnItems,
                    connection
                );

                // Update GRN to mark batch processing as complete
                await connection.execute(`
                    UPDATE goods_received_notes 
                    SET batch_processed = TRUE, quality_checked = TRUE
                    WHERE id = ?
                `, [id]);

                console.log('Inventory updates completed:', {
                    successful_updates: inventoryUpdates.successful_updates.length,
                    failed_updates: inventoryUpdates.failed_updates.length,
                    batch_records: inventoryUpdates.batch_records.length,
                    serial_records: inventoryUpdates.serial_records.length
                });
            }

            // Approve GRN
            await connection.execute(
                'UPDATE goods_received_notes SET status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ?',
                [approved_by, id]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'GRN approved successfully with enhanced inventory tracking',
                data: {
                    grn_id: id,
                    grn_number: grn.grn_number,
                    inventory_processed: !grn.batch_processed
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error approving GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error approving GRN',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Validate GRN against PO before creation
    async validateGRNBeforeCreation(req, res) {
        try {
            const { purchase_order_id, supplier_id, items } = req.body;

            if (!purchase_order_id || !supplier_id || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: purchase_order_id, supplier_id, and items'
                });
            }

            const validationResults = await POGRNValidationService.validateGRNAgainstPO({
                purchase_order_id,
                supplier_id,
                items
            });

            res.json({
                success: true,
                message: 'GRN validation completed',
                data: {
                    validation_results: validationResults,
                    can_proceed: validationResults.isValid,
                    requires_approval: !validationResults.isValid && validationResults.warnings.length > 0
                }
            });

        } catch (error) {
            console.error('Error validating GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error validating GRN',
                error: error.message
            });
        }
    }

    // Get PO completion status
    async getPOCompletionStatus(req, res) {
        try {
            const { po_id } = req.params;

            if (!po_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Purchase Order ID is required'
                });
            }

            const completionStatus = await POGRNValidationService.getPOCompletionStatus(po_id);

            res.json({
                success: true,
                message: 'PO completion status retrieved successfully',
                data: completionStatus
            });

        } catch (error) {
            console.error('Error getting PO completion status:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving PO completion status',
                error: error.message
            });
        }
    }

    // Get GRN discrepancy report
    async getGRNDiscrepancyReport(req, res) {
        try {
            const { grn_id } = req.params;

            const query = `
                SELECT 
                    grn.grn_number,
                    grn.grn_date,
                    po.po_number,
                    s.company_name as supplier_name,
                    grni.product_id,
                    p.name as product_name,
                    poi.quantity as ordered_quantity,
                    grni.received_quantity,
                    grni.accepted_quantity,
                    grni.rejected_quantity,
                    poi.unit_price as po_unit_price,
                    grni.unit_price as grn_unit_price,
                    (poi.unit_price - grni.unit_price) as price_variance,
                    (grni.received_quantity - poi.quantity) as quantity_variance,
                    CASE 
                        WHEN grni.received_quantity > poi.quantity THEN 'Over Receipt'
                        WHEN grni.received_quantity < poi.quantity THEN 'Under Receipt'
                        ELSE 'Exact Match'
                    END as quantity_status,
                    CASE 
                        WHEN ABS(poi.unit_price - grni.unit_price) / poi.unit_price > 0.05 THEN 'Price Variance > 5%'
                        ELSE 'Price OK'
                    END as price_status
                FROM goods_received_notes grn
                JOIN grn_items grni ON grn.id = grni.grn_id
                JOIN purchase_orders po ON grn.purchase_order_id = po.id
                JOIN purchase_order_items poi ON po.id = poi.purchase_order_id AND grni.product_id = poi.product_id
                LEFT JOIN suppliers s ON grn.supplier_id = s.id
                LEFT JOIN products p ON grni.product_id = p.id
                WHERE grn.id = ?
                ORDER BY grni.id
            `;

            const [discrepancies] = await db.execute(query, [grn_id]);

            // Calculate summary statistics
            const summary = {
                total_items: discrepancies.length,
                over_receipts: 0,
                under_receipts: 0,
                exact_matches: 0,
                price_variances: 0,
                total_quantity_variance: 0,
                total_price_variance: 0
            };

            discrepancies.forEach(item => {
                if (item.quantity_status === 'Over Receipt') summary.over_receipts++;
                else if (item.quantity_status === 'Under Receipt') summary.under_receipts++;
                else summary.exact_matches++;

                if (item.price_status.includes('Variance')) summary.price_variances++;

                summary.total_quantity_variance += parseFloat(item.quantity_variance) || 0;
                summary.total_price_variance += parseFloat(item.price_variance) || 0;
            });

            res.json({
                success: true,
                message: 'GRN discrepancy report generated successfully',
                data: {
                    grn_details: discrepancies[0] ? {
                        grn_number: discrepancies[0].grn_number,
                        grn_date: discrepancies[0].grn_date,
                        po_number: discrepancies[0].po_number,
                        supplier_name: discrepancies[0].supplier_name
                    } : null,
                    discrepancies: discrepancies,
                    summary: summary
                }
            });

        } catch (error) {
            console.error('Error generating GRN discrepancy report:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating discrepancy report',
                error: error.message
            });
        }
    }

    // Get inventory movement history for a product
    async getInventoryMovementHistory(req, res) {
        try {
            const { product_id } = req.params;
            const { limit, from_date, to_date, movement_type } = req.query;

            const movements = await InventoryManagementService.getInventoryMovementHistory(
                product_id,
                {
                    limit: parseInt(limit) || 50,
                    fromDate: from_date,
                    toDate: to_date,
                    movementType: movement_type
                }
            );

            res.json({
                success: true,
                message: 'Inventory movement history retrieved successfully',
                data: {
                    movements,
                    count: movements.length
                }
            });

        } catch (error) {
            console.error('Error getting inventory movement history:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving movement history',
                error: error.message
            });
        }
    }

    // Get current stock levels with batch details
    async getCurrentStockLevels(req, res) {
        try {
            const { location_id, product_id } = req.query;

            const stockLevels = await InventoryManagementService.getCurrentStockLevels(
                location_id ? parseInt(location_id) : null,
                product_id ? parseInt(product_id) : null
            );

            // Calculate summary statistics
            const summary = {
                total_products: stockLevels.length,
                total_quantity: stockLevels.reduce((sum, item) => sum + parseFloat(item.current_stock), 0),
                total_value: stockLevels.reduce((sum, item) => sum + parseFloat(item.stock_value), 0),
                locations: [...new Set(stockLevels.map(item => item.location_name))].length
            };

            res.json({
                success: true,
                message: 'Current stock levels retrieved successfully',
                data: {
                    stock_levels: stockLevels,
                    summary
                }
            });

        } catch (error) {
            console.error('Error getting current stock levels:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving stock levels',
                error: error.message
            });
        }
    }

    // Get batch details for a product
    async getProductBatchDetails(req, res) {
        try {
            const { product_id } = req.params;
            const { location_id, status } = req.query;

            let whereClause = 'ib.product_id = ?';
            const queryParams = [product_id];

            if (location_id) {
                whereClause += ' AND ib.location_id = ?';
                queryParams.push(location_id);
            }

            if (status) {
                whereClause += ' AND ib.status = ?';
                queryParams.push(status);
            }

            const [batches] = await db.execute(`
                SELECT 
                    ib.*,
                    p.name as product_name,
                    il.name as location_name,
                    s.company_name as supplier_name,
                    COUNT(isn.id) as serial_count
                FROM inventory_batches ib
                LEFT JOIN products p ON ib.product_id = p.id
                LEFT JOIN inventory_locations il ON ib.location_id = il.id
                LEFT JOIN suppliers s ON ib.supplier_id = s.id
                LEFT JOIN inventory_serial_numbers isn ON ib.id = isn.batch_id
                WHERE ${whereClause}
                GROUP BY ib.id
                ORDER BY ib.received_date DESC
            `, queryParams);

            // Get serial numbers for each batch if they exist
            for (const batch of batches) {
                if (batch.serial_count > 0) {
                    const [serials] = await db.execute(`
                        SELECT serial_number, status, warranty_start_date, warranty_end_date
                        FROM inventory_serial_numbers
                        WHERE batch_id = ?
                        ORDER BY serial_number
                    `, [batch.id]);

                    batch.serial_numbers = serials;
                }
            }

            res.json({
                success: true,
                message: 'Product batch details retrieved successfully',
                data: {
                    batches,
                    count: batches.length
                }
            });

        } catch (error) {
            console.error('Error getting product batch details:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving batch details',
                error: error.message
            });
        }
    }
}

module.exports = new GRNController();
