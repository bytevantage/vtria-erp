const db = require('../config/database');

class CaseHistoryController {
    // Get case history for any case type
    async getCaseHistory(req, res) {
        try {
            const { caseType, caseId } = req.params;
            
            let query = '';
            let params = [caseId];
            
            switch (caseType) {
                case 'sales_enquiry':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            se.enquiry_id as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN sales_enquiries se ON ch.reference_id = se.id
                        WHERE ch.reference_type = 'sales_enquiry' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                case 'estimation':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            e.estimation_id as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN estimations e ON ch.reference_id = e.id
                        WHERE ch.reference_type = 'estimation' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                case 'quotation':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            q.quotation_id as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN quotations q ON ch.reference_id = q.id
                        WHERE ch.reference_type = 'quotation' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                case 'sales_order':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            so.sales_order_id as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN sales_orders so ON ch.reference_id = so.id
                        WHERE ch.reference_type = 'sales_order' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                case 'purchase_order':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            po.po_number as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN purchase_orders po ON ch.reference_id = po.id
                        WHERE ch.reference_type = 'purchase_order' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                case 'manufacturing':
                    query = `
                        SELECT 
                            ch.id,
                            ch.status,
                            ch.notes,
                            ch.created_at,
                            u.full_name as created_by_name,
                            wo.work_order_id as reference_number
                        FROM case_history ch
                        LEFT JOIN users u ON ch.created_by = u.id
                        LEFT JOIN work_orders wo ON ch.reference_id = wo.id
                        WHERE ch.reference_type = 'work_order' AND ch.reference_id = ?
                        ORDER BY ch.created_at ASC
                    `;
                    break;
                    
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid case type'
                    });
            }
            
            const [history] = await db.execute(query, params);
            
            res.json({
                success: true,
                history: history
            });
            
        } catch (error) {
            console.error('Error fetching case history:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching case history',
                error: error.message
            });
        }
    }
    
    // Add new case history entry
    async addCaseHistory(req, res) {
        try {
            const { caseType, caseId } = req.params;
            const { status, notes, userId } = req.body;
            
            if (!status || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Status and userId are required'
                });
            }
            
            const query = `
                INSERT INTO case_history (reference_type, reference_id, status, notes, created_by)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await db.execute(query, [
                caseType,
                caseId,
                status,
                notes || null,
                userId
            ]);
            
            res.json({
                success: true,
                message: 'Case history entry added successfully',
                historyId: result.insertId
            });
            
        } catch (error) {
            console.error('Error adding case history:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding case history',
                error: error.message
            });
        }
    }
    
    // Get workflow status for a specific case
    async getWorkflowStatus(req, res) {
        try {
            const { caseType, caseId } = req.params;
            
            let query = '';
            let params = [caseId];
            
            switch (caseType) {
                case 'sales_enquiry':
                    query = `
                        SELECT 
                            se.id,
                            se.enquiry_id,
                            se.status,
                            se.created_at,
                            se.updated_at,
                            c.company_name as client_name,
                            u1.full_name as enquiry_by_name,
                            u2.full_name as assigned_to_name
                        FROM sales_enquiries se
                        LEFT JOIN clients c ON se.client_id = c.id
                        LEFT JOIN users u1 ON se.enquiry_by = u1.id
                        LEFT JOIN users u2 ON se.assigned_to = u2.id
                        WHERE se.id = ?
                    `;
                    break;
                    
                case 'purchase_order':
                    query = `
                        SELECT 
                            po.id,
                            po.po_number,
                            po.status,
                            po.created_at,
                            po.updated_at,
                            s.supplier_name,
                            u1.full_name as created_by_name,
                            u2.full_name as approved_by_name
                        FROM purchase_orders po
                        LEFT JOIN suppliers s ON po.supplier_id = s.id
                        LEFT JOIN users u1 ON po.created_by = u1.id
                        LEFT JOIN users u2 ON po.approved_by = u2.id
                        WHERE po.id = ?
                    `;
                    break;
                    
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid case type'
                    });
            }
            
            const [rows] = await db.execute(query, params);
            
            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Case not found'
                });
            }
            
            res.json({
                success: true,
                case: rows[0]
            });
            
        } catch (error) {
            console.error('Error fetching workflow status:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching workflow status',
                error: error.message
            });
        }
    }
    
    // Update case status and add history entry
    async updateCaseStatus(req, res) {
        try {
            const { caseType, caseId } = req.params;
            const { status, notes, userId } = req.body;
            
            if (!status || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'Status and userId are required'
                });
            }
            
            // Start transaction
            await db.execute('START TRANSACTION');
            
            try {
                // Update the main table status
                let updateQuery = '';
                let updateParams = [status, caseId];
                
                switch (caseType) {
                    case 'sales_enquiry':
                        updateQuery = 'UPDATE sales_enquiries SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    case 'estimation':
                        updateQuery = 'UPDATE estimations SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    case 'quotation':
                        updateQuery = 'UPDATE quotations SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    case 'sales_order':
                        updateQuery = 'UPDATE sales_orders SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    case 'purchase_order':
                        updateQuery = 'UPDATE purchase_orders SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    case 'work_order':
                        updateQuery = 'UPDATE work_orders SET status = ?, updated_at = NOW() WHERE id = ?';
                        break;
                    default:
                        throw new Error('Invalid case type');
                }
                
                await db.execute(updateQuery, updateParams);
                
                // Add history entry
                const historyQuery = `
                    INSERT INTO case_history (reference_type, reference_id, status, notes, created_by)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                await db.execute(historyQuery, [
                    caseType,
                    caseId,
                    status,
                    notes || null,
                    userId
                ]);
                
                // Commit transaction
                await db.execute('COMMIT');
                
                res.json({
                    success: true,
                    message: 'Case status updated successfully'
                });
                
            } catch (error) {
                // Rollback transaction
                await db.execute('ROLLBACK');
                throw error;
            }
            
        } catch (error) {
            console.error('Error updating case status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating case status',
                error: error.message
            });
        }
    }
}

module.exports = new CaseHistoryController();
