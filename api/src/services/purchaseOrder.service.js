const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const { calculateTaxes } = require('../utils/taxCalculator');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

class PurchaseOrderService {
    async createPurchaseOrder(data, userId) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Validate prerequisites
            await this.validatePurchaseRequest(connection, data.purchase_request_id);
            await this.validateSupplier(connection, data.supplier_id);
            
            // Generate document numbers
            const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
            const poId = await DocumentNumberGenerator.generateNumber('PO', financialYear);
            const piId = await DocumentNumberGenerator.generateNumber('PI', financialYear);
            
            // Calculate tax and totals
            const { items, taxDetails } = await this.calculateItemsAndTaxes(
                connection,
                data.items,
                data.supplier_id
            );
            
            // Create purchase order
            const po = await this.insertPurchaseOrder(
                connection,
                {
                    ...data,
                    poId,
                    piId,
                    ...taxDetails,
                    userId
                }
            );
            
            // Insert items
            await this.insertPurchaseOrderItems(connection, po.id, items);
            
            // Create initial case history
            await this.createCaseHistory(
                connection,
                'purchase_order',
                po.id,
                'draft',
                'Purchase order created',
                userId
            );
            
            // Close purchase request
            await this.updatePurchaseRequestStatus(
                connection,
                data.purchase_request_id,
                'closed'
            );
            
            await connection.commit();
            
            // Trigger notifications
            await this.sendNotifications(po.id, 'created');
            
            return {
                id: po.id,
                po_id: poId,
                pi_id: piId,
                ...taxDetails
            };
            
        } catch (error) {
            await connection.rollback();
            logger.error('Error in createPurchaseOrder:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    async approvePurchaseOrder(id, userId, userRole) {
        if (!['director', 'admin'].includes(userRole)) {
            throw new UnauthorizedError('Unauthorized to approve purchase orders');
        }
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Verify PO exists and is in draft state
            const po = await this.getPurchaseOrderById(connection, id);
            if (po.status !== 'draft') {
                throw new ValidationError('Only draft purchase orders can be approved');
            }
            
            // Update status
            await connection.execute(
                `UPDATE purchase_orders 
                 SET status = 'approved',
                     approved_by = ?,
                     approved_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [userId, id]
            );
            
            // Create case history
            await this.createCaseHistory(
                connection,
                'purchase_order',
                id,
                'approved',
                'Purchase order approved',
                userId
            );
            
            await connection.commit();
            
            // Trigger notifications and workflow actions
            await this.sendNotifications(id, 'approved');
            await this.triggerWorkflowActions(id, 'approved');
            
            return true;
            
        } catch (error) {
            await connection.rollback();
            logger.error('Error in approvePurchaseOrder:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
    
    async getPurchaseOrderDetails(id) {
        try {
            const [po] = await db.execute(
                `SELECT po.*, 
                        pr.request_id as pr_reference,
                        s.company_name as supplier_name,
                        s.contact_person as supplier_contact,
                        s.address as supplier_address,
                        s.gstin as supplier_gstin,
                        s.bank_details,
                        u1.full_name as created_by_name,
                        u2.full_name as approved_by_name,
                        (
                            SELECT COUNT(*)
                            FROM goods_receipts gr
                            WHERE gr.po_id = po.id
                        ) as received_items_count
                 FROM purchase_orders po
                 JOIN purchase_requests pr ON po.purchase_request_id = pr.id
                 JOIN suppliers s ON po.supplier_id = s.id
                 JOIN users u1 ON po.created_by = u1.id
                 LEFT JOIN users u2 ON po.approved_by = u2.id
                 WHERE po.id = ?`,
                [id]
            );
            
            if (!po[0]) {
                throw new NotFoundError('Purchase order not found');
            }
            
            const details = {
                purchase_order: po[0],
                items: await this.getPurchaseOrderItems(id),
                history: await this.getCaseHistory(id),
                related_documents: await this.getRelatedDocuments(id)
            };
            
            return details;
            
        } catch (error) {
            logger.error('Error in getPurchaseOrderDetails:', error);
            throw error;
        }
    }
    
    // Private helper methods
    async validatePurchaseRequest(connection, prId) {
        const [pr] = await connection.execute(
            'SELECT status FROM purchase_requests WHERE id = ?',
            [prId]
        );
        
        if (!pr[0]) {
            throw new ValidationError('Invalid purchase request');
        }
        
        if (pr[0].status === 'closed') {
            throw new ValidationError('Purchase request is already closed');
        }
    }
    
    async validateSupplier(connection, supplierId) {
        const [supplier] = await connection.execute(
            'SELECT status FROM suppliers WHERE id = ?',
            [supplierId]
        );
        
        if (!supplier[0]) {
            throw new ValidationError('Invalid supplier');
        }
        
        if (supplier[0].status !== 'active') {
            throw new ValidationError('Supplier is not active');
        }
    }
    
    async calculateItemsAndTaxes(connection, items, supplierId) {
        const [supplier] = await connection.execute(
            'SELECT state FROM suppliers WHERE id = ?',
            [supplierId]
        );
        
        const calculatedItems = [];
        let totalAmount = 0;
        let totalTax = 0;
        
        for (const item of items) {
            const { amount, tax } = calculateTaxes(
                item.quantity,
                item.price,
                supplier[0].state
            );
            
            calculatedItems.push({
                ...item,
                amount,
                tax_percentage: tax.percentage
            });
            
            totalAmount += amount;
            totalTax += tax.amount;
        }
        
        return {
            items: calculatedItems,
            taxDetails: {
                total_amount: totalAmount,
                total_tax: totalTax,
                grand_total: totalAmount + totalTax
            }
        };
    }
    
    async insertPurchaseOrder(connection, data) {
        const [result] = await connection.execute(
            'INSERT INTO purchase_orders SET ?',
            {
                po_id: data.poId,
                pi_id: data.piId,
                purchase_request_id: data.purchase_request_id,
                supplier_id: data.supplier_id,
                date: new Date(),
                delivery_date: data.delivery_date,
                shipping_address: data.shipping_address,
                billing_address: data.billing_address,
                payment_terms: data.payment_terms,
                delivery_terms: data.delivery_terms,
                total_amount: data.total_amount,
                total_tax: data.total_tax,
                grand_total: data.grand_total,
                notes: data.notes,
                created_by: data.userId
            }
        );
        
        return { id: result.insertId };
    }
    
    async sendNotifications(poId, event) {
        // Implementation for sending notifications
        // This could integrate with a notification service
    }
    
    async triggerWorkflowActions(poId, event) {
        // Implementation for workflow actions
        // This could integrate with a workflow engine
    }
}

module.exports = new PurchaseOrderService();
