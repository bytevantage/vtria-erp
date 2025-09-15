const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

class GRNController {
    // Create new GRN
    async createGRN(req, res) {
        try {
            const { 
                purchase_order_id, 
                supplier_id, 
                lr_number, 
                supplier_invoice_number, 
                supplier_invoice_date,
                items 
            } = req.body;
            
            const received_by = req.user?.id || 1; // Default for development
            
            // Generate GRN number
            const grn_number = await generateDocumentId(DOCUMENT_TYPES.GOODS_RECEIVED_NOTE);
            
            // Calculate total amount
            const total_amount = items.reduce((sum, item) => 
                sum + (item.received_quantity * item.unit_price), 0
            );
            
            // Insert GRN
            const [result] = await db.execute(`
                INSERT INTO goods_received_notes 
                (grn_number, purchase_order_id, supplier_id, grn_date, lr_number, 
                 supplier_invoice_number, supplier_invoice_date, total_amount, received_by) 
                VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
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
                
                await db.query(itemsQuery, [itemsData]);
                
                // Update stock for accepted items
                for (const item of items) {
                    if (item.accepted_quantity > 0) {
                        await db.execute(`
                            INSERT INTO stock (product_id, location_id, quantity) 
                            VALUES (?, ?, ?) 
                            ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
                        `, [item.product_id, item.location_id, item.accepted_quantity]);
                        
                        // Record stock movement
                        await db.execute(`
                            INSERT INTO stock_movements 
                            (product_id, to_location_id, quantity, movement_type, reference_type, reference_id) 
                            VALUES (?, ?, ?, 'in', 'GRN', ?)
                        `, [item.product_id, item.location_id, item.accepted_quantity, grn_number]);
                    }
                }
            }
            
            res.json({
                success: true,
                message: 'GRN created successfully',
                data: { id: grn_id, grn_number }
            });
        } catch (error) {
            console.error('Error creating GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating GRN',
                error: error.message
            });
        }
    }

    // Get all GRNs
    async getAllGRNs(req, res) {
        try {
            const query = `
                SELECT 
                    grn.*,
                    s.company_name as supplier_name,
                    COALESCE(po.po_number, po.po_id) as po_number,
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
                    po.po_number,
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
        try {
            const { id } = req.params;
            const approved_by = req.user?.id || 1;
            
            await db.execute(
                'UPDATE goods_received_notes SET status = "approved", approved_by = ? WHERE id = ?',
                [approved_by, id]
            );
            
            res.json({
                success: true,
                message: 'GRN approved successfully'
            });
        } catch (error) {
            console.error('Error approving GRN:', error);
            res.status(500).json({
                success: false,
                message: 'Error approving GRN',
                error: error.message
            });
        }
    }
}

module.exports = new GRNController();
