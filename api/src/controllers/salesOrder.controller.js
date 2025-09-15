const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

// Get all sales orders with related information
exports.getAllSalesOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                so.*,
                q.quotation_id,
                e.estimation_id,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                cu.full_name as created_by_name,
                au.full_name as approved_by_name
            FROM sales_orders so
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id  
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users cu ON so.created_by = cu.id
            LEFT JOIN users au ON so.approved_by = au.id
            ORDER BY so.created_at DESC
        `;
        
        const [salesOrders] = await db.execute(query);
        
        res.json({
            success: true,
            data: salesOrders,
            count: salesOrders.length
        });
    } catch (error) {
        console.error('Error fetching sales orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales orders',
            error: error.message
        });
    }
};

// Create sales order from quotation
exports.createSalesOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            quotation_id,
            customer_po_number,
            customer_po_date,
            expected_delivery_date,
            billing_address,
            shipping_address,
            advance_amount = 0,
            production_priority = 'medium',
            special_instructions,
            internal_notes
        } = req.body;
        
        // Generate sales order ID (VESPL/SO/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const salesOrderId = await DocumentNumberGenerator.generateNumber('SO', financialYear);
        
        // Get quotation details
        const [quotation] = await connection.execute(
            `SELECT q.*, c.company_name, c.address, c.city, c.state
             FROM quotations q 
             JOIN estimations e ON q.estimation_id = e.id
             JOIN sales_enquiries se ON e.enquiry_id = se.id
             JOIN clients c ON se.client_id = c.id
             WHERE q.id = ? AND q.status = 'approved'`,
            [quotation_id]
        );
        
        if (!quotation[0]) {
            throw new Error('Approved quotation not found');
        }
        
        const quotationData = quotation[0];
        const balanceAmount = quotationData.grand_total - advance_amount;
        
        // Handle potential undefined values
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass
        
        // Insert sales order
        const [salesOrder] = await connection.execute(
            `INSERT INTO sales_orders 
            (sales_order_id, quotation_id, date, expected_delivery_date,
             customer_po_number, customer_po_date, billing_address, shipping_address,
             total_amount, advance_amount, balance_amount, 
             payment_terms, delivery_terms, warranty_terms,
             production_priority, special_instructions, internal_notes,
             created_by) 
            VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                salesOrderId,
                quotation_id,
                expected_delivery_date || null,
                customer_po_number || null,
                customer_po_date || null,
                billing_address || quotationData.address || null,
                shipping_address || quotationData.address || null,
                quotationData.grand_total || 0,
                advance_amount,
                balanceAmount,
                quotationData.payment_terms || null,
                quotationData.delivery_terms || null,
                quotationData.warranty_terms || null,
                production_priority,
                special_instructions || null,
                internal_notes || null,
                userId
            ]
        );
        
        // Copy quotation items to sales order items
        const [quotationItems] = await connection.execute(
            `SELECT * FROM quotation_items WHERE quotation_id = ?`,
            [quotation_id]
        );
        
        for (const item of quotationItems) {
            await connection.execute(
                `INSERT INTO sales_order_items 
                (sales_order_id, item_name, description, hsn_code,
                 quantity, unit, rate, amount,
                 cgst_percentage, sgst_percentage, igst_percentage) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    salesOrder.insertId,
                    item.item_name,
                    item.description,
                    item.hsn_code,
                    item.quantity,
                    item.unit,
                    item.rate,
                    item.amount,
                    item.cgst_percentage,
                    item.sgst_percentage,
                    item.igst_percentage
                ]
            );
        }
        
        // Record advance payment if provided
        if (advance_amount > 0) {
            await connection.execute(
                `INSERT INTO sales_order_payments 
                (sales_order_id, payment_type, amount, payment_date, 
                 payment_method, status, recorded_by) 
                VALUES (?, 'advance', ?, CURDATE(), 'bank_transfer', 'pending', ?)`,
                [salesOrder.insertId, advance_amount, userId]
            );
        }
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', salesOrder.insertId, 'draft', 'Sales order created from quotation', userId]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Sales order created successfully',
            data: { 
                id: salesOrder.insertId,
                sales_order_id: salesOrderId,
                balance_amount: balanceAmount
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error creating sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating sales order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Update sales order
exports.updateSalesOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            customer_po_number,
            customer_po_date,
            expected_delivery_date,
            advance_amount,
            production_priority,
            special_instructions,
            billing_address,
            shipping_address
        } = req.body;

        const userId = req.user?.id || 1; // Default to user 1 for auth bypass

        // Update sales order
        await connection.execute(
            `UPDATE sales_orders
             SET customer_po_number = ?, customer_po_date = ?, expected_delivery_date = ?,
                 advance_amount = ?, production_priority = ?, special_instructions = ?,
                 billing_address = ?, shipping_address = ?, updated_at = NOW()
             WHERE id = ? AND status = 'draft'`,
            [
                customer_po_number,
                customer_po_date,
                expected_delivery_date,
                advance_amount,
                production_priority,
                special_instructions,
                billing_address,
                shipping_address,
                id
            ]
        );

        // Update balance amount if advance changed
        if (advance_amount !== undefined) {
            await connection.execute(
                `UPDATE sales_orders
                 SET balance_amount = total_amount - ?
                 WHERE id = ?`,
                [advance_amount, id]
            );
        }

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history
            (reference_type, reference_id, status, notes, created_by)
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, 'updated', 'Sales order updated', userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Sales order updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error updating sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating sales order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get specific sales order
exports.getSalesOrder = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get sales order with all related information
        const [salesOrder] = await db.execute(
            `SELECT 
                so.*,
                q.quotation_id,
                e.estimation_id,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.contact_person,
                c.email,
                c.phone,
                c.address,
                c.city,
                c.state,
                c.gstin,
                cu.full_name as created_by_name,
                au.full_name as approved_by_name
            FROM sales_orders so
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id  
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users cu ON so.created_by = cu.id
            LEFT JOIN users au ON so.approved_by = au.id
            WHERE so.id = ?`,
            [id]
        );
        
        if (!salesOrder[0]) {
            return res.status(404).json({
                success: false,
                message: 'Sales order not found'
            });
        }
        
        // Get sales order items
        const [items] = await db.execute(
            `SELECT * FROM sales_order_items WHERE sales_order_id = ? ORDER BY id`,
            [id]
        );
        
        // Get payment history
        const [payments] = await db.execute(
            `SELECT sop.*, u.full_name as recorded_by_name
             FROM sales_order_payments sop
             LEFT JOIN users u ON sop.recorded_by = u.id
             WHERE sop.sales_order_id = ?
             ORDER BY sop.payment_date DESC`,
            [id]
        );
        
        // Get production schedule
        const [schedule] = await db.execute(
            `SELECT ps.*, u.full_name as assigned_to_name, cu.full_name as created_by_name
             FROM production_schedule ps
             LEFT JOIN users u ON ps.assigned_to = u.id
             LEFT JOIN users cu ON ps.created_by = cu.id
             WHERE ps.sales_order_id = ?
             ORDER BY ps.planned_start_date`,
            [id]
        );
        
        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             LEFT JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'sales_order' AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [id]
        );
        
        res.json({
            success: true,
            data: {
                sales_order: salesOrder[0],
                items: items,
                payments: payments,
                schedule: schedule,
                history: history
            }
        });
    } catch (error) {
        console.error('Error fetching sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales order',
            error: error.message
        });
    }
};

// Confirm sales order
exports.confirmSalesOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { notes } = req.body;
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass
        
        // Update sales order status
        await connection.execute(
            `UPDATE sales_orders 
             SET status = 'confirmed', approved_by = ?, approved_at = NOW() 
             WHERE id = ? AND status = 'draft'`,
            [userId, id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, 'confirmed', notes || 'Sales order confirmed', userId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Sales order confirmed successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error confirming sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error confirming sales order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Update production status
exports.updateProductionStatus = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { status, notes } = req.body;
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass
        
        const validStatuses = ['draft', 'confirmed', 'in_production', 'ready_for_dispatch', 'dispatched', 'delivered'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }
        
        // Update sales order status
        await connection.execute(
            `UPDATE sales_orders SET status = ? WHERE id = ?`,
            [status, id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, status, notes || `Status updated to ${status}`, userId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Production status updated successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error updating production status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating production status',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = exports;
