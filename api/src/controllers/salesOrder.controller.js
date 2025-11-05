const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

// Helper function to calculate taxes for a sales order
async function calculateSalesOrderTaxes(connection, salesOrderId) {
    const [items] = await connection.execute(
        'SELECT * FROM sales_order_items WHERE sales_order_id = ?',
        [salesOrderId]
    );

    let subtotal = 0;
    let totalTax = 0;

    for (const item of items) {
        const itemAmount = parseFloat(item.amount) || 0;
        subtotal += itemAmount;

        // Calculate tax for this item
        const cgstRate = parseFloat(item.cgst_percentage) || 0;
        const sgstRate = parseFloat(item.sgst_percentage) || 0;
        const igstRate = parseFloat(item.igst_percentage) || 0;

        const itemTax = itemAmount * ((cgstRate + sgstRate + igstRate) / 100);
        totalTax += itemTax;
    }

    const grandTotal = subtotal + totalTax;

    // Update the sales order with calculated totals
    await connection.execute(`
        UPDATE sales_orders 
        SET total_amount = ?, tax_amount = ?, grand_total = ?
        WHERE id = ?
    `, [subtotal, totalTax, grandTotal, salesOrderId]);

    return {
        subtotal,
        totalTax,
        grandTotal,
        itemCount: items.length
    };
}

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
                au.full_name as approved_by_name,
                cases.case_number,
                CASE 
                    WHEN COUNT(mc.id) > 0 AND COUNT(CASE WHEN mc.status NOT IN ('completed', 'cancelled') THEN 1 END) > 0
                    THEN 'open'
                    WHEN COUNT(mc.id) > 0 AND COUNT(CASE WHEN mc.status NOT IN ('completed', 'cancelled') THEN 1 END) = 0
                    THEN 'closed'
                    ELSE 'none'
                END as manufacturing_case_status
            FROM sales_orders so
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id  
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users cu ON so.created_by = cu.id
            LEFT JOIN users au ON so.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            LEFT JOIN manufacturing_cases mc ON so.case_id = mc.case_id
            WHERE so.deleted_at IS NULL
            AND (cases.id IS NULL OR cases.current_state IN ('quotation', 'order'))
            GROUP BY so.id
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

// Get only confirmed sales orders for invoice creation
exports.getApprovedSalesOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                so.id,
                so.sales_order_id as order_number,
                so.order_date,
                so.grand_total as total_amount,
                0 as advance_amount,
                so.grand_total as balance_amount,
                so.status,
                q.quotation_id,
                se.enquiry_id,
                se.project_name,
                c.id as client_id,
                c.company_name as client_name,
                c.contact_person,
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
            WHERE so.status = 'confirmed'
            AND so.id NOT IN (
                SELECT DISTINCT reference_id 
                FROM invoices 
                WHERE reference_type = 'sales_order' 
                AND reference_id IS NOT NULL
                AND status != 'cancelled'
            )
            ORDER BY so.created_at DESC
        `;

        const [salesOrders] = await db.execute(query);


        res.json({
            success: true,
            data: salesOrders,
            count: salesOrders.length
        });
    } catch (error) {
        console.error('Error fetching approved sales orders:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection error. Please ensure the database is running and properly configured.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Create sales order from quotation
exports.createSalesOrder = async (req, res) => {
    console.log('=== Starting createSalesOrder ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        console.log('Transaction started');

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

        console.log('Parsed request data:', {
            quotation_id,
            advance_amount,
            production_priority,
            has_billing_address: !!billing_address,
            has_shipping_address: !!shipping_address
        });

        // Generate sales order ID (VESPL/SO/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const salesOrderId = await DocumentNumberGenerator.generateNumber('SO', financialYear);

        // Check if there's already an active sales order for this quotation
        console.log('Checking for existing active sales order for quotation ID:', quotation_id);
        const [existingSalesOrder] = await connection.execute(
            `SELECT id, sales_order_id, status FROM sales_orders 
             WHERE quotation_id = ? AND deleted_at IS NULL`,
            [quotation_id]
        );

        if (existingSalesOrder.length > 0) {
            const errorMsg = `Sales order already exists for this quotation. Existing sales order: ${existingSalesOrder[0].sales_order_id} (Status: ${existingSalesOrder[0].status})`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Get quotation details
        console.log('Fetching quotation details for ID:', quotation_id);
        const [quotation] = await connection.execute(
            `SELECT q.*, e.case_id, c.id as client_id, c.company_name, c.address, c.city, c.state
             FROM quotations q 
             JOIN estimations e ON q.estimation_id = e.id
             JOIN sales_enquiries se ON e.enquiry_id = se.id
             JOIN clients c ON se.client_id = c.id
             WHERE q.id = ? AND (q.status = 'approved' OR q.status = 'accepted')`,
            [quotation_id]
        );

        console.log('Quotation query result:', {
            found: quotation.length > 0,
            status: quotation[0]?.status,
            id: quotation[0]?.id
        });

        if (!quotation[0]) {
            const errorMsg = `Approved quotation not found for ID: ${quotation_id}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const quotationData = quotation[0];
        const balanceAmount = quotationData.grand_total - advance_amount;

        // Handle potential undefined values
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass

        // Insert sales order
        console.log('Inserting sales order with data:', {
            salesOrderId,
            quotation_id,
            expected_delivery_date: expected_delivery_date || null,
            customer_po_number: customer_po_number || null,
            customer_po_date: customer_po_date || null,
            billing_address: billing_address || quotationData.address || null,
            shipping_address: shipping_address || quotationData.address || null,
            total_amount: quotationData.grand_total || 0,
            advance_amount,
            balanceAmount,
            userId
        });

        const [salesOrder] = await connection.execute(
            `INSERT INTO sales_orders 
            (sales_order_id, quotation_id, case_id, order_date, expected_delivery_date,
             customer_po_number, total_amount, advance_amount, balance_amount, 
             client_id, created_by) 
            VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)`,
            [
                salesOrderId,
                quotation_id,
                quotationData.case_id,
                expected_delivery_date || null,
                customer_po_number || null,
                quotationData.grand_total || 0,
                advance_amount,
                balanceAmount,
                quotationData.client_id,
                userId
            ]
        );

        console.log('Sales order inserted with ID:', salesOrder.insertId);

        // Copy quotation items to sales order items
        const [quotationItems] = await connection.execute(
            'SELECT * FROM quotation_items WHERE quotation_id = ?',
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

        // Calculate taxes and update sales order totals
        const taxCalculation = await calculateSalesOrderTaxes(connection, salesOrder.insertId);

        console.log('Tax calculation:', taxCalculation);

        // Record advance payment if provided
        // TODO: Re-enable when sales_order_payments table is created
        // if (advance_amount > 0) {
        //     await connection.execute(
        //         `INSERT INTO sales_order_payments 
        //         (sales_order_id, payment_type, amount, payment_date, 
        //          payment_method, status, recorded_by) 
        //         VALUES (?, 'advance', ?, CURDATE(), 'bank_transfer', 'pending', ?)`,
        //         [salesOrder.insertId, advance_amount, userId]
        //     );
        // }

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', salesOrder.insertId, 'draft', 'Sales order created from quotation', userId]
        );

        // Get the case ID from the estimation (but don't transition case state yet for draft orders)
        const [caseResult] = await connection.execute(
            `SELECT e.case_id 
             FROM quotations q 
             JOIN estimations e ON q.estimation_id = e.id 
             WHERE q.id = ?`,
            [quotation_id]
        );

        if (caseResult.length > 0) {
            const caseId = caseResult[0].case_id;
            console.log('Case ID found:', caseId, '- keeping in quotation state until sales order is approved');

            // Note: Case state remains 'quotation' until sales order is confirmed/approved
            // This will be handled in the confirmSalesOrder method
        } else {
            console.warn('Could not find case ID for quotation:', quotation_id);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Sales order created successfully',
            data: {
                id: salesOrder.insertId,
                sales_order_id: salesOrderId,
                quotation_id: quotation_id,
                total_amount: quotationData.grand_total,
                advance_amount: advance_amount,
                balance_amount: balanceAmount,
                case_id: caseResult[0]?.case_id || null
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

        // Update sales order (handle undefined values by converting to null)
        await connection.execute(
            `UPDATE sales_orders
             SET customer_po_number = ?, expected_delivery_date = ?,
                 advance_amount = ?, updated_at = NOW()
             WHERE id = ?`,
            [
                customer_po_number || null,
                expected_delivery_date || null,
                advance_amount || null,
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
        // Recalculate taxes in case advance amount changed affecting calculations
        const taxCalculation = await calculateSalesOrderTaxes(connection, id);
        console.log('Tax recalculation on update:', taxCalculation);

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
            'SELECT * FROM sales_order_items WHERE sales_order_id = ? ORDER BY id',
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
                ...salesOrder[0],
                items: items || [],
                payments: [], // Empty array for now - payments table doesn't exist
                schedule: [], // Empty array for now - production_schedule table doesn't exist
                history: history
            }
        });
    } catch (error) {
        console.error('Error fetching sales order:', error);

        res.status(500).json({
            success: false,
            message: 'Database connection error. Please ensure the database is running and properly configured.',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Submit sales order for approval
exports.submitForApproval = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { notes } = req.body;
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass

        // Update sales order status
        await connection.execute(
            `UPDATE sales_orders 
             SET status = 'pending_approval' 
             WHERE id = ? AND status IN ('draft', 'pending_approval')`,
            [id]
        );

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, 'pending_approval', notes || 'Sales order submitted for approval', userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Sales order submitted for approval successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error submitting sales order for approval:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting sales order for approval',
            error: error.message
        });
    } finally {
        connection.release();
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
             WHERE id = ? AND status = 'pending_approval'`,
            [userId, id]
        );

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, 'confirmed', notes || 'Sales order confirmed', userId]
        );

        // Now transition the case state to 'order' since sales order is confirmed
        const [caseResult] = await connection.execute(
            `SELECT e.case_id 
             FROM sales_orders so
             JOIN quotations q ON so.quotation_id = q.id
             JOIN estimations e ON q.estimation_id = e.id 
             WHERE so.id = ?`,
            [id]
        );

        if (caseResult.length > 0) {
            const caseId = caseResult[0].case_id;
            console.log('Transitioning case to order state after sales order confirmation. Case ID:', caseId);

            // Update case state to 'order' and record the transition
            await connection.execute(
                `UPDATE cases 
                 SET current_state = 'order', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [caseId]
            );

            await connection.execute(
                `INSERT INTO case_state_transitions 
                 (case_id, from_state, to_state, reference_id, created_by) 
                 VALUES (?, 'quotation', 'order', ?, ?)`,
                [caseId, id, userId]
            );

            console.log('Case state transitioned to order after sales order confirmation');
        } else {
            console.warn('Could not find case ID for sales order:', id);
        }

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

// Reject sales order for rework
exports.rejectSalesOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { rejection_reason } = req.body;
        const userId = req.user?.id || 1; // Default to user 1 for auth bypass

        // Update sales order status back to draft
        await connection.execute(
            `UPDATE sales_orders 
             SET status = 'draft', approved_by = NULL, approved_at = NULL 
             WHERE id = ? AND status = 'pending_approval'`,
            [id]
        );

        // Create case history entry for rejection
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_order', id, 'rejected', rejection_reason || 'Sales order rejected for rework', userId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Sales order rejected for rework successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error rejecting sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting sales order',
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

        const validStatuses = ['draft', 'pending_approval', 'pending', 'confirmed', 'in_production', 'ready_for_dispatch', 'dispatched', 'delivered', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`
            });
        }

        // Check if sales order exists and get its case information
        const [existingOrder] = await connection.execute(
            `SELECT so.id, so.status, so.case_id,
                    c.current_state as case_state
             FROM sales_orders so
             LEFT JOIN cases c ON so.case_id = c.id
             WHERE so.id = ?`,
            [id]
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Sales order with ID ${id} not found`
            });
        }

        const order = existingOrder[0];

        // Business rule: Only allow status changes beyond 'draft' if manufacturing case is closed
        if (status !== 'draft' && order.case_id) {
            // Check if there are any open manufacturing cases for this sales order
            const [manufacturingCases] = await connection.execute(
                `SELECT mc.id, mc.status, mc.manufacturing_case_number
                 FROM manufacturing_cases mc
                 WHERE mc.case_id = ? AND mc.status != 'completed' AND mc.status != 'cancelled'`,
                [order.case_id]
            );

            if (manufacturingCases.length > 0) {
                const openCaseNumbers = manufacturingCases.map(mc => mc.manufacturing_case_number).join(', ');
                return res.status(422).json({
                    success: false,
                    message: `Cannot change status to '${status}' while manufacturing case(s) are still open: ${openCaseNumbers}. Manufacturing must be completed first.`,
                    openManufacturingCases: manufacturingCases
                });
            }
        }

        // Update sales order status
        await connection.execute(
            'UPDATE sales_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
        console.error('Error updating sales order status:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });

        res.status(500).json({
            success: false,
            message: 'Error updating sales order status',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    } finally {
        connection.release();
    }
};

// Delete a sales order (soft delete)
exports.deleteSalesOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user?.id || 1; // Default to user 1 if not authenticated

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Deletion reason is required'
            });
        }

        // Get sales order details before deletion
        const [salesOrder] = await connection.execute(
            'SELECT * FROM sales_orders WHERE id = ?',
            [id]
        );

        if (!salesOrder.length) {
            return res.status(404).json({
                success: false,
                message: 'Sales order not found'
            });
        }

        // Soft delete the sales order
        await connection.execute(
            `UPDATE sales_orders 
             SET status = 'deleted', 
                 deleted_at = CURRENT_TIMESTAMP,
                 deleted_by = ?,
                 deletion_reason = ?
             WHERE id = ?`,
            [userId, reason, id]
        );

        // Create a backup of the sales order before deletion
        await connection.execute(
            `INSERT INTO deleted_sales_orders 
             (original_id, sales_order_id, quotation_id, data, deleted_by, deletion_reason)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                salesOrder[0].sales_order_id,
                salesOrder[0].quotation_id,
                JSON.stringify(salesOrder[0]),
                userId,
                reason
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Sales order deleted successfully',
            data: {
                id,
                sales_order_id: salesOrder[0].sales_order_id
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error deleting sales order:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting sales order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get sales order by case number
exports.getSalesOrderByCase = async (req, res) => {
    try {
        const { caseNumber } = req.params;

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
                au.full_name as approved_by_name,
                cases.case_number
            FROM sales_orders so
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id  
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users cu ON so.created_by = cu.id
            LEFT JOIN users au ON so.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE cases.case_number = ?
            ORDER BY so.created_at DESC
            LIMIT 1
        `;

        const [results] = await db.execute(query, [caseNumber]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No sales order found for case ${caseNumber}`
            });
        }

        res.json({
            success: true,
            data: results[0]
        });

    } catch (error) {
        console.error('Error fetching sales order by case:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales order by case number',
            error: error.message
        });
    }
};

module.exports = exports;
