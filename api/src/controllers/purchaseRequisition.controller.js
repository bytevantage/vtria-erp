const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');
const PDFGenerator = require('../utils/pdfGenerator');
const { auditPRChange, logScopeChange, auditService } = require('../middleware/auditTrail.middleware');
const path = require('path');
const fs = require('fs');

class PurchaseRequisitionController {
    // Create new purchase requisition
    async createPurchaseRequisition(req, res) {
        try {
            const { quotation_id, supplier_id, items, notes } = req.body;
            const created_by = req.user?.id || 1; // Default for development

            // Generate PR number
            const pr_number = await generateDocumentId(DOCUMENT_TYPES.PURCHASE_REQUISITION);

            // Insert PR
            const [result] = await db.execute(
                'INSERT INTO purchase_requisitions (pr_number, quotation_id, supplier_id, pr_date, notes, created_by) VALUES (?, ?, ?, CURDATE(), ?, ?)',
                [pr_number, quotation_id, supplier_id, notes, created_by]
            );

            const pr_id = result.insertId;

            // Insert PR items
            if (items && items.length > 0) {
                const itemsQuery = 'INSERT INTO purchase_requisition_items (pr_id, product_id, quantity, estimated_price, notes) VALUES ?';
                const itemsData = items.map(item => [
                    pr_id,
                    item.product_id,
                    item.quantity,
                    item.estimated_price,
                    item.notes || null
                ]);

                await db.query(itemsQuery, [itemsData]);
            }

            res.json({
                success: true,
                message: 'Purchase requisition created successfully',
                data: { id: pr_id, pr_number }
            });
        } catch (error) {
            console.error('Error creating purchase requisition:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating purchase requisition',
                error: error.message
            });
        }
    }

    // Get all purchase requisitions
    async getAllPurchaseRequisitions(req, res) {
        try {
            const query = `
                SELECT 
                    pr.*,
                    v.vendor_name as supplier_name,
                    q.quotation_id,
                    u.full_name as created_by_name,
                    c.case_number,
                    cl.company_name as client_name,
                    e.estimation_id,
                    (SELECT COUNT(*) FROM purchase_requisition_items WHERE pr_id = pr.id) as items_count,
                    (SELECT SUM(quantity * estimated_price) FROM purchase_requisition_items WHERE pr_id = pr.id) as total_value
                FROM purchase_requisitions pr
                LEFT JOIN inventory_vendors v ON pr.supplier_id = v.id
                LEFT JOIN quotations q ON pr.quotation_id = q.id
                LEFT JOIN users u ON pr.created_by = u.id
                LEFT JOIN cases c ON pr.case_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN estimations e ON pr.estimation_id = e.id
                ORDER BY pr.created_at DESC
            `;

            const [requisitions] = await db.execute(query);

            res.json({
                success: true,
                data: requisitions,
                count: requisitions.length
            });
        } catch (error) {
            console.error('Error fetching purchase requisitions:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching purchase requisitions',
                error: error.message
            });
        }
    }



    // Get purchase requisition by ID
    async getPurchaseRequisitionById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    pr.*,
                    v.vendor_name as supplier_name,
                    v.email as supplier_email,
                    v.phone as supplier_phone,
                    v.address as supplier_address,
                    q.quotation_id,
                    u.full_name as created_by_name,
                    c.case_number,
                    e.estimation_id
                FROM purchase_requisitions pr
                LEFT JOIN inventory_vendors v ON pr.supplier_id = v.id
                LEFT JOIN quotations q ON pr.quotation_id = q.id
                LEFT JOIN users u ON pr.created_by = u.id
                LEFT JOIN cases c ON pr.case_id = c.id
                LEFT JOIN estimations e ON pr.estimation_id = e.id
                WHERE pr.id = ?
            `;

            const [requisitions] = await db.execute(query, [id]);

            if (requisitions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase requisition not found'
                });
            }

            // Get items
            const itemsQuery = `
                SELECT 
                    pri.*,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code
                FROM purchase_requisition_items pri
                LEFT JOIN products p ON pri.product_id = p.id
                WHERE pri.pr_id = ?
                ORDER BY pri.id
            `;

            const [items] = await db.execute(itemsQuery, [id]);

            const requisition = {
                ...requisitions[0],
                items: items
            };

            res.json({
                success: true,
                data: requisition
            });
        } catch (error) {
            console.error('Error fetching purchase requisition:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching purchase requisition',
                error: error.message
            });
        }
    }

    // Update purchase requisition status
    async updatePurchaseRequisitionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            await db.execute(
                'UPDATE purchase_requisitions SET status = ?, notes = COALESCE(?, notes) WHERE id = ?',
                [status, notes, id]
            );

            res.json({
                success: true,
                message: 'Purchase requisition status updated successfully'
            });
        } catch (error) {
            console.error('Error updating purchase requisition status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating purchase requisition status',
                error: error.message
            });
        }
    }

    // Create purchase requisition from case/estimation/quotation
    async createFromCase(req, res) {
        try {
            const { case_id, estimation_id, quotation_id, supplier_id, items, notes } = req.body;
            const created_by = req.user?.id || 1;

            // Generate PR number
            const pr_number = await generateDocumentId(DOCUMENT_TYPES.PURCHASE_REQUISITION);

            // Get case information - first try direct case_id, then get from estimation
            let final_case_id = case_id;
            let case_number = null;

            if (!final_case_id && estimation_id) {
                // Get case_id from estimation if not provided directly
                const [estimationResult] = await db.execute(
                    'SELECT case_id FROM estimations WHERE id = ?',
                    [estimation_id]
                );
                final_case_id = estimationResult[0]?.case_id;
            }

            if (final_case_id) {
                const [caseResult] = await db.execute(
                    'SELECT case_number FROM cases WHERE id = ?',
                    [final_case_id]
                );
                case_number = caseResult[0]?.case_number;
            }

            // Insert PR - use final_case_id which might come from estimation
            const [result] = await db.execute(
                `INSERT INTO purchase_requisitions 
                (pr_number, quotation_id, supplier_id, pr_date, notes, created_by, case_id, estimation_id) 
                VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?)`,
                [
                    pr_number,
                    quotation_id || null,
                    supplier_id || null,
                    notes || null,
                    created_by,
                    final_case_id || null,
                    estimation_id || null
                ]
            );

            const pr_id = result.insertId;

            // Insert PR items
            if (items && items.length > 0) {
                const itemsQuery = `INSERT INTO purchase_requisition_items 
                    (pr_id, product_id, quantity, estimated_price, notes, item_name, description, hsn_code, unit) 
                    VALUES ?`;
                const itemsData = items.map(item => [
                    pr_id,
                    item.product_id || null,
                    item.quantity || 0,
                    item.estimated_price || 0,
                    item.notes || null,
                    item.item_name || '',
                    item.description || '',
                    item.hsn_code || '',
                    item.unit || 'Nos'
                ]);

                await db.query(itemsQuery, [itemsData]);
            }

            res.json({
                success: true,
                message: 'Purchase requisition created successfully',
                data: {
                    id: pr_id,
                    pr_number,
                    case_number
                }
            });
        } catch (error) {
            console.error('Error creating purchase requisition from case:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating purchase requisition',
                error: error.message
            });
        }
    }

    // Update purchase requisition status
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, rejection_reason } = req.body;

            let updateQuery = 'UPDATE purchase_requisitions SET status = ?, updated_at = NOW()';
            const params = [status];

            if (status === 'rejected' && rejection_reason) {
                updateQuery += ', rejection_reason = ?';
                params.push(rejection_reason);
            } else if (status === 'draft') {
                // Clear rejection reason when returning to draft
                updateQuery += ', rejection_reason = NULL';
            }

            updateQuery += ' WHERE id = ?';
            params.push(id);

            await db.execute(updateQuery, params);

            res.json({
                success: true,
                message: `Purchase requisition ${status} successfully`
            });
        } catch (error) {
            console.error('Error updating purchase requisition status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating purchase requisition status',
                error: error.message
            });
        }
    }

    // Update purchase requisition items
    async updateItems(req, res) {
        try {
            const { id } = req.params;
            const { items } = req.body;

            // Delete existing items
            await db.execute('DELETE FROM purchase_requisition_items WHERE pr_id = ?', [id]);

            // Insert updated items
            if (items && items.length > 0) {
                const itemsQuery = `INSERT INTO purchase_requisition_items 
                    (pr_id, product_id, quantity, estimated_price, notes, item_name, description, hsn_code, unit) 
                    VALUES ?`;
                const itemsData = items.map(item => [
                    id,
                    item.product_id || null,
                    item.quantity,
                    item.estimated_price,
                    item.notes || null,
                    item.item_name,
                    item.description,
                    item.hsn_code,
                    item.unit
                ]);

                await db.query(itemsQuery, [itemsData]);
            }

            res.json({
                success: true,
                message: 'Purchase requisition items updated successfully'
            });
        } catch (error) {
            console.error('Error updating purchase requisition items:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating purchase requisition items',
                error: error.message
            });
        }
    }

    // Update complete purchase requisition (header + items)
    async updatePurchaseRequisition(req, res) {
        try {
            const { id } = req.params;
            const { supplier_id, notes, items, case_id, estimation_id } = req.body;

            // Update PR header details - include case_id and estimation_id if provided
            if (case_id !== undefined || estimation_id !== undefined) {
                // Special case for fixing case_id and estimation_id
                await db.execute(
                    'UPDATE purchase_requisitions SET case_id = ?, estimation_id = ? WHERE id = ?',
                    [case_id || null, estimation_id || null, id]
                );
            } else {
                // Normal update for supplier and notes
                await db.execute(
                    'UPDATE purchase_requisitions SET supplier_id = ?, notes = ? WHERE id = ?',
                    [supplier_id || null, notes || null, id]
                );
            }

            // Delete existing items
            await db.execute('DELETE FROM purchase_requisition_items WHERE pr_id = ?', [id]);

            // Insert updated items
            if (items && items.length > 0) {
                const itemsQuery = `INSERT INTO purchase_requisition_items 
                    (pr_id, product_id, quantity, estimated_price, notes, item_name, description, hsn_code, unit) 
                    VALUES ?`;
                const itemsData = items.map(item => [
                    id,
                    item.product_id || null,
                    item.quantity,
                    item.estimated_price,
                    item.notes || null,
                    item.item_name,
                    item.description,
                    item.hsn_code,
                    item.unit
                ]);

                await db.query(itemsQuery, [itemsData]);
            }

            res.json({
                success: true,
                message: 'Purchase requisition updated successfully'
            });
        } catch (error) {
            console.error('Error updating purchase requisition:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating purchase requisition',
                error: error.message
            });
        }
    }

    // Delete purchase requisition
    async deletePurchaseRequisition(req, res) {
        try {
            const { id } = req.params;

            // Delete items first (foreign key constraint)
            await db.execute('DELETE FROM purchase_requisition_items WHERE pr_id = ?', [id]);

            // Delete purchase requisition
            await db.execute('DELETE FROM purchase_requisitions WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Purchase requisition deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting purchase requisition:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting purchase requisition',
                error: error.message
            });
        }
    }

    // Get open quotations with grouped parts for vendor price requests
    async getOpenQuotationsWithGroupedParts(req, res) {
        try {
            // First get all quotations that need PR and don't have active PRs yet
            const quotationsQuery = `
                SELECT DISTINCT
                    q.id as quotation_id,
                    q.quotation_id as quotation_number,
                    c.company_name as client_name,
                    se.project_name,
                    q.status as quotation_status,
                    se.case_id,
                    cases.case_number
                FROM quotations q
                JOIN estimations e ON q.estimation_id = e.id
                JOIN sales_enquiries se ON e.enquiry_id = se.id
                JOIN clients c ON se.client_id = c.id
                LEFT JOIN cases ON se.case_id = cases.id
                LEFT JOIN purchase_requisitions pr ON (pr.quotation_id = q.id OR pr.quotation_id = q.quotation_id)
                    AND pr.status IN ('draft', 'pending_approval', 'approved')
                WHERE q.status IN ('approved', 'sent')
                AND pr.id IS NULL
                AND cases.current_state IN ('quotation', 'order', 'production')
                AND cases.status = 'active'
                ORDER BY q.quotation_id
            `;

            const [quotations] = await db.execute(quotationsQuery);

            const quotationData = [];

            for (const quotation of quotations) {
                // Get all items for this quotation with stock information
                const itemsQuery = `
                    SELECT 
                        combined_items.item_name,
                        MAX(combined_items.description) as description,
                        MAX(combined_items.hsn_code) as hsn_code,
                        MAX(combined_items.unit) as unit,
                        SUM(combined_items.quantity) as total_quantity,
                        AVG(combined_items.rate) as avg_estimated_price,
                        MIN(combined_items.rate) as min_price,
                        MAX(combined_items.rate) as max_price,
                        MAX(combined_items.product_id) as product_id,
                        COALESCE(SUM(DISTINCT stock.available_stock), 0) as available_stock,
                        COALESCE(SUM(DISTINCT stock.reserved_stock), 0) as reserved_stock,
                        MAX(p.name) as product_name
                    FROM (
                        SELECT 
                            qi.item_name,
                            qi.description,
                            qi.hsn_code,
                            qi.unit,
                            qi.quantity,
                            qi.rate,
                            NULL as product_id
                        FROM quotation_items qi
                        WHERE qi.quotation_id = ?
                        
                        UNION ALL
                        
                        SELECT 
                            p.name as item_name,
                            p.description,
                            p.hsn_code,
                            'Nos' as unit,
                            ei.quantity,
                            ei.final_price as rate,
                            ei.product_id
                        FROM estimation_items ei
                        JOIN estimations e ON ei.estimation_id = e.id
                        JOIN quotations q2 ON e.id = q2.estimation_id
                        JOIN products p ON ei.product_id = p.id
                        WHERE q2.id = ?
                    ) as combined_items
                    LEFT JOIN products p ON combined_items.product_id = p.id
                    LEFT JOIN inventory_warehouse_stock stock ON p.id = stock.item_id
                    GROUP BY combined_items.item_name
                    ORDER BY combined_items.item_name
                `;

                const [items] = await db.execute(itemsQuery, [quotation.quotation_id, quotation.quotation_id]);

                if (items.length > 0) {
                    quotationData.push({
                        quotation_id: quotation.quotation_id,
                        quotation_number: quotation.quotation_number,
                        client_name: quotation.client_name,
                        project_name: quotation.project_name,
                        status: quotation.quotation_status,
                        case_id: quotation.case_id,
                        case_number: quotation.case_number,
                        items: items.map(item => {
                            const availableStock = parseInt(item.available_stock) || 0;
                            const reservedStock = parseInt(item.reserved_stock) || 0;
                            const totalQuantity = parseInt(item.total_quantity);
                            const shortfall = Math.max(0, totalQuantity - availableStock);

                            return {
                                item_name: item.item_name,
                                description: item.description,
                                hsn_code: item.hsn_code,
                                unit: item.unit,
                                total_quantity: totalQuantity,
                                estimated_price_range: {
                                    min: parseFloat(item.min_price),
                                    max: parseFloat(item.max_price)
                                },
                                avg_estimated_price: parseFloat(item.avg_estimated_price),
                                product_id: item.product_id,
                                product_name: item.product_name,
                                stock_status: {
                                    available: availableStock,
                                    reserved: reservedStock,
                                    shortfall: shortfall,
                                    status: availableStock >= totalQuantity ? 'sufficient' :
                                        availableStock > 0 ? 'partial' : 'none'
                                }
                            };
                        }),
                        total_items: items.length,
                        total_value: items.reduce((sum, item) => sum + (item.total_quantity * item.avg_estimated_price), 0)
                    });
                }
            }

            const summary = {
                total_quotations: quotationData.length,
                total_unique_items: quotationData.reduce((sum, q) => sum + q.items.length, 0),
                total_estimated_value: quotationData.reduce((sum, q) => sum + q.total_value, 0)
            };

            res.json({
                success: true,
                data: quotationData,
                count: quotationData.length,
                summary
            });
        } catch (error) {
            console.error('Error fetching open quotations with grouped parts:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching open quotations with grouped parts',
                error: error.message
            });
        }
    }

    // Create purchase requisition from specific quotation
    async createFromQuotation(req, res) {
        try {
            const { quotation_id, supplier_id, notes, items: customItems } = req.body;
            const created_by = req.user?.id || 1;

            // Check if PR already exists for this quotation (quotation_id is now quotation_number)
            const [existingPr] = await db.execute(
                'SELECT pr_number FROM purchase_requisitions WHERE quotation_id = ?',
                [quotation_id]
            );

            if (existingPr.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Purchase requisition already exists for this quotation: ${existingPr[0].pr_number}`
                });
            }

            // Get quotation and estimation details (quotation_id is numeric ID)
            const [quotationDetails] = await db.execute(`
                SELECT q.*, e.id as estimation_id, e.enquiry_id, se.case_id
                FROM quotations q
                JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                WHERE q.id = ?
            `, [quotation_id]);

            if (quotationDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            const quotation = quotationDetails[0];
            const numeric_quotation_id = quotation.id; // Get the numeric ID for item queries

            // Generate PR number
            const pr_number = await generateDocumentId(DOCUMENT_TYPES.PURCHASE_REQUISITION);

            // Get all items for this quotation (consolidated)
            const itemsQuery = `
                SELECT 
                    item_name,
                    MAX(description) as description,
                    MAX(hsn_code) as hsn_code,
                    MAX(unit) as unit,
                    SUM(quantity) as total_quantity,
                    AVG(rate) as avg_estimated_price
                FROM (
                    SELECT 
                        qi.item_name,
                        qi.description,
                        qi.hsn_code,
                        qi.unit,
                        qi.quantity,
                        qi.rate
                    FROM quotation_items qi
                    WHERE qi.quotation_id = ?
                    
                    UNION ALL
                    
                    SELECT 
                        p.name as item_name,
                        p.description,
                        p.hsn_code,
                        'Nos' as unit,
                        ei.quantity,
                        ei.final_price as rate
                    FROM estimation_items ei
                    JOIN estimations e ON ei.estimation_id = e.id
                    JOIN quotations q2 ON e.id = q2.estimation_id
                    JOIN products p ON ei.product_id = p.id
                    WHERE q2.id = ?
                ) as combined_items
                GROUP BY item_name
                ORDER BY item_name
            `;

            const [items] = await db.execute(itemsQuery, [numeric_quotation_id, numeric_quotation_id]);

            if (items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No items found for this quotation'
                });
            }

            // Insert PR
            const [result] = await db.execute(
                `INSERT INTO purchase_requisitions 
                (pr_number, quotation_id, supplier_id, pr_date, notes, created_by, case_id, estimation_id) 
                VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?)`,
                [pr_number, quotation_id, supplier_id, notes, created_by, quotation.case_id, quotation.estimation_id]
            );

            const pr_id = result.insertId;

            // Use custom quantities if provided, otherwise use default quantities
            let finalItems = items;
            if (customItems && customItems.length > 0) {
                finalItems = items.map(item => {
                    const customItem = customItems.find(ci => ci.item_name === item.item_name);
                    return {
                        ...item,
                        total_quantity: customItem ? customItem.quantity : item.total_quantity
                    };
                });
            }

            // Insert consolidated PR items (using proper columns)
            const itemsData = finalItems.map(item => [
                pr_id,
                null, // product_id (will be null for now)
                item.item_name, // item_name
                item.description || '', // description
                item.hsn_code || '', // hsn_code
                item.unit || 'Nos', // unit
                item.total_quantity, // quantity
                item.avg_estimated_price, // estimated_price
                '' // notes (empty, since we have separate fields now)
            ]);

            const itemsInsertQuery = `INSERT INTO purchase_requisition_items 
                (pr_id, product_id, item_name, description, hsn_code, unit, quantity, estimated_price, notes) 
                VALUES ?`;

            await db.query(itemsInsertQuery, [itemsData]);

            // Calculate total value for audit
            const totalValue = finalItems.reduce((sum, item) => sum + (item.total_quantity * item.avg_estimated_price), 0);
            const quotationValue = parseFloat(quotation.total_amount || 0);

            // Prepare audit data
            const userContext = auditService.extractUserContext(req);
            const newPRData = {
                id: pr_id,
                pr_number,
                quotation_id: quotation_id,
                supplier_id,
                case_id: quotation.case_id,
                estimation_id: quotation.estimation_id,
                total_value: totalValue,
                items_count: finalItems.length,
                created_by: created_by
            };

            // Log audit trail for PR creation
            await auditPRChange(
                'CREATE',
                pr_id,
                null, // no old data for creation
                newPRData,
                userContext,
                `Purchase requisition created from quotation ${quotation.quotation_id}`
            );

            // Check for scope changes (additional items beyond quotation)
            if (customItems && customItems.length > 0 && totalValue > quotationValue) {
                await logScopeChange({
                    entityType: 'purchase_requisition',
                    entityId: pr_id,
                    entityNumber: pr_number,
                    caseId: quotation.case_id,
                    changeType: 'SCOPE_EXPANDED',
                    originalValue: quotationValue,
                    newValue: totalValue,
                    itemDetails: {
                        original_quotation_items: finalItems.filter(item => !customItems.find(ci => ci.item_name === item.item_name)),
                        additional_items: customItems
                    },
                    justification: `Purchase requisition created with expanded scope. Original quotation: Rs.${quotationValue}, New PR: Rs.${totalValue}`,
                    requestedBy: created_by,
                    clientApprovalRequired: totalValue > quotationValue * 1.1 // Require client approval if >10% increase
                });
            }

            res.json({
                success: true,
                message: 'Purchase requisition created successfully',
                data: {
                    id: pr_id,
                    pr_number,
                    quotation_id: quotation_id,
                    items_count: finalItems.length,
                    total_value: totalValue
                }
            });
        } catch (error) {
            console.error('Error creating purchase requisition from quotation:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating purchase requisition',
                error: error.message
            });
        }
    }

    // Create independent purchase requisition (not linked to quotation)
    async createIndependentPR(req, res) {
        try {
            const { supplier_id, items, notes, case_id } = req.body;
            const created_by = req.user?.id || 1;

            if (!items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one item is required'
                });
            }

            if (!supplier_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Supplier is required'
                });
            }

            // Generate PR number
            const pr_number = await generateDocumentId(DOCUMENT_TYPES.PURCHASE_REQUISITION);

            // Insert PR
            const [result] = await db.execute(
                `INSERT INTO purchase_requisitions 
                (pr_number, supplier_id, pr_date, notes, created_by, case_id) 
                VALUES (?, ?, CURDATE(), ?, ?, ?)`,
                [pr_number, supplier_id, notes || null, created_by, case_id || null]
            );

            const pr_id = result.insertId;

            // Insert PR items
            const itemsData = items.map(item => [
                pr_id,
                item.product_id || null,
                item.quantity,
                item.estimated_price,
                item.notes || null,
                item.item_name,
                item.description || null,
                item.hsn_code || null,
                item.unit || null
            ]);

            const itemsInsertQuery = `INSERT INTO purchase_requisition_items 
                (pr_id, product_id, quantity, estimated_price, notes, item_name, description, hsn_code, unit) 
                VALUES ?`;

            await db.query(itemsInsertQuery, [itemsData]);

            // Calculate total value for audit
            const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.estimated_price), 0);

            // Prepare audit data
            const userContext = auditService.extractUserContext(req);
            const newPRData = {
                id: pr_id,
                pr_number,
                supplier_id,
                case_id,
                total_value: totalValue,
                items_count: items.length,
                created_by: created_by
            };

            // Log audit trail for independent PR creation (with error handling)
            try {
                await auditPRChange(
                    'CREATE',
                    pr_id,
                    null, // no old data for creation
                    newPRData,
                    userContext,
                    `Independent purchase requisition created. ${notes || 'No additional notes'}`
                );

                // Log scope change for independent PR (since it's not from quotation)
                if (totalValue > 0) {
                    await logScopeChange({
                        entityType: 'purchase_requisition',
                        entityId: pr_id,
                        entityNumber: pr_number,
                        caseId: case_id,
                        changeType: 'SCOPE_EXPANDED',
                        originalValue: 0, // Independent PR starts from 0
                        newValue: totalValue,
                        itemDetails: {
                            independent_items: items
                        },
                        justification: `Independent purchase requisition created with value Rs.${totalValue}. Items: ${items.map(i => i.item_name).join(', ')}`,
                        requestedBy: created_by,
                        clientApprovalRequired: false // Independent PRs typically don't require client approval
                    });
                }
            } catch (auditError) {
                console.error('Audit logging failed for PR creation:', auditError);
                // Continue with normal response - don't fail the PR creation due to audit issues
            }

            res.json({
                success: true,
                message: 'Independent purchase requisition created successfully',
                data: {
                    id: pr_id,
                    pr_number,
                    items_count: items.length,
                    total_value: totalValue
                }
            });
        } catch (error) {
            console.error('Error creating independent purchase requisition:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating independent purchase requisition',
                error: error.message
            });
        }
    }

    // Generate PDF for purchase requisition
    async generatePDF(req, res) {
        try {
            const { id } = req.params;

            // Get purchase requisition details
            const [prDetails] = await db.execute(`
                SELECT 
                    pr.*,
                    s.company_name as supplier_name,
                    s.contact_person as supplier_contact,
                    s.address as supplier_address,
                    u.full_name as created_by_name
                FROM purchase_requisitions pr
                LEFT JOIN suppliers s ON pr.supplier_id = s.id
                LEFT JOIN users u ON pr.created_by = u.id
                WHERE pr.id = ?
            `, [id]);

            if (prDetails.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase requisition not found'
                });
            }

            // Get PR items - first check what's actually in the table
            const [items] = await db.execute(`
                SELECT pri.*
                FROM purchase_requisition_items pri
                WHERE pri.pr_id = ?
            `, [id]);


            // If items have product_id, try to get product details
            const enrichedItems = [];
            for (const item of items) {
                const enrichedItem = { ...item };

                if (item.product_id) {
                    try {
                        const [productData] = await db.execute(`
                            SELECT name, part_code, description 
                            FROM products 
                            WHERE id = ?
                        `, [item.product_id]);

                        if (productData.length > 0) {
                            enrichedItem.product_name = productData[0].name;
                            enrichedItem.part_code = productData[0].part_code;
                            enrichedItem.description = productData[0].description;
                        }
                    } catch (err) {
                        console.log('Error fetching product data:', err.message);
                    }
                }

                enrichedItems.push(enrichedItem);
            }

            // Get client data - the PR already contains case info, just get client name
            let clientName = 'TBD';
            const caseNumber = 'PENDING';

            if (prDetails[0].quotation_id) {
                try {
                    const [clientData] = await db.execute(`
                        SELECT 
                            c.company_name as client_name
                        FROM quotations q 
                        INNER JOIN estimations e ON q.estimation_id = e.id
                        INNER JOIN sales_enquiries se ON e.enquiry_id = se.id
                        INNER JOIN clients c ON se.client_id = c.id
                        WHERE q.id = ?
                    `, [prDetails[0].quotation_id]);

                    if (clientData.length > 0) {
                        clientName = clientData[0].client_name;
                    }
                } catch (err) {
                    console.log('Could not fetch client data:', err.message);
                }
            }

            // Prepare data for PDF generation
            const prData = {
                ...prDetails[0],
                client_name: clientName,
                case_number: caseNumber,
                items: enrichedItems.filter(item => item.quantity > 0).map((item, index) => {
                    // Use description for part name if no proper part name exists
                    const partName = item.product_name || item.part_name || item.name || item.item_name ||
                        item.description || item.item_description || item.notes || 'No description';

                    // For part code, use actual part_code from products table, or fallback to item fields
                    const partCode = item.part_code || item.code || item.item_code || item.sku || `ITEM-${index + 1}`;

                    // Use description field or notes for details
                    const description = item.description || item.item_description || item.notes || partName;

                    return {
                        part_name: partName,
                        part_code: partCode,
                        description: description,
                        quantity: item.quantity,
                        estimated_price: item.estimated_price,
                        notes: item.notes
                    };
                })
            };

            // Generate PDF with clean filename (consistent with sales orders)
            const cleanPrNumber = prData.pr_number.replace(/\//g, '_');
            const fileName = `purchase_requisition_${cleanPrNumber}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads/documents', fileName);

            const pdfGenerator = new PDFGenerator();
            const generatedPath = await pdfGenerator.generatePurchaseRequisitionPDF(prData, filePath);

            // Return file path for download (consistent with other PDF endpoints)
            res.json({
                success: true,
                message: 'PDF generated successfully',
                filePath: `/uploads/documents/${fileName}`,
                downloadUrl: `/api/pdf/download/${fileName}`
            });

        } catch (error) {
            console.error('Error generating purchase requisition PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating PDF',
                error: error.message
            });
        }
    }

    // Get approved purchase requisitions
    async getApprovedRequisitions(req, res) {
        try {
            const query = `
                SELECT 
                    pr.*,
                    v.vendor_name as supplier_name,
                    u.full_name as created_by_name,
                    COALESCE(c.case_number, 'PENDING') as case_number,
                    COALESCE(cl.company_name, 'TBD') as client_name,
                    (SELECT COUNT(*) FROM purchase_requisition_items WHERE pr_id = pr.id) as items_count,
                    (SELECT SUM(quantity * estimated_price) FROM purchase_requisition_items WHERE pr_id = pr.id) as total_value
                FROM purchase_requisitions pr
                LEFT JOIN inventory_vendors v ON pr.supplier_id = v.id
                LEFT JOIN users u ON pr.created_by = u.id
                LEFT JOIN cases c ON pr.case_id = c.id
                LEFT JOIN sales_enquiries se ON c.id = se.case_id
                LEFT JOIN clients cl ON se.client_id = cl.id
                WHERE pr.status = 'approved'
                ORDER BY pr.created_at DESC
            `;

            const [requisitions] = await db.execute(query);

            res.json({
                success: true,
                data: requisitions,
                count: requisitions.length
            });
        } catch (error) {
            console.error('Error fetching approved requisitions:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching approved requisitions',
                error: error.message
            });
        }
    }
}

module.exports = new PurchaseRequisitionController();
