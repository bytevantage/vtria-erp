const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

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
                    s.company_name as supplier_name,
                    q.quotation_id,
                    u.full_name as created_by_name
                FROM purchase_requisitions pr
                LEFT JOIN suppliers s ON pr.supplier_id = s.id
                LEFT JOIN quotations q ON pr.quotation_id = q.id
                LEFT JOIN users u ON pr.created_by = u.id
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
                    s.company_name as supplier_name,
                    s.email as supplier_email,
                    s.phone as supplier_phone,
                    s.address as supplier_address,
                    q.quotation_id,
                    u.full_name as created_by_name
                FROM purchase_requisitions pr
                LEFT JOIN suppliers s ON pr.supplier_id = s.id
                LEFT JOIN quotations q ON pr.quotation_id = q.id
                LEFT JOIN users u ON pr.created_by = u.id
                WHERE pr.id = ?
            `;
            
            const [requisitions] = await db.execute(query, [id]);
            
            if (requisitions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Purchase requisition not found'
                });
            }
            
            // Get PR items
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
            
            res.json({
                success: true,
                data: {
                    ...requisitions[0],
                    items
                }
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
}

module.exports = new PurchaseRequisitionController();
