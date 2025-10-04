const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

// Get all work orders with related information
exports.getAllWorkOrders = async (req, res) => {
    try {
        const query = `
            SELECT 
                wo.*,
                so.sales_order_id,
                so.customer_po_number,
                CONCAT(c.company_name) as client_name,
                se.project_name,
                u1.full_name as assigned_to_name,
                u2.full_name as created_by_name,
                u3.full_name as approved_by_name,
                COUNT(pt.id) as total_tasks,
                SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
            FROM work_orders wo
            LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u1 ON wo.assigned_to = u1.id
            LEFT JOIN users u2 ON wo.created_by = u2.id
            LEFT JOIN users u3 ON wo.approved_by = u3.id
            LEFT JOIN production_tasks pt ON wo.id = pt.work_order_id
            GROUP BY wo.id
            ORDER BY wo.created_at DESC
        `;
        
        const [workOrders] = await db.execute(query);
        
        res.json({
            success: true,
            data: workOrders,
            count: workOrders.length
        });
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching work orders',
            error: error.message
        });
    }
};

// Create new work order from sales order
exports.createWorkOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const {
            sales_order_id,
            sales_order_item_id,
            title,
            description,
            assigned_to,
            priority = 'medium',
            estimated_hours,
            planned_start_date,
            planned_end_date,
            technical_specifications,
            quality_requirements,
            safety_notes
        } = req.body;
        
        const userId = req.user.id; // User must be authenticated
        
        // Generate work order ID (VESPL/WO/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const workOrderId = await DocumentNumberGenerator.generateNumber('WO', financialYear);
        
        // Validate sales order exists and is confirmed
        const [salesOrder] = await connection.execute(
            `SELECT so.*, c.company_name as client_name 
             FROM sales_orders so
             LEFT JOIN quotations q ON so.quotation_id = q.id
             LEFT JOIN estimations e ON q.estimation_id = e.id
             LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
             LEFT JOIN clients c ON se.client_id = c.id
             WHERE so.id = ? AND so.status IN ('confirmed', 'in_production')`,
            [sales_order_id]
        );
        
        if (!salesOrder[0]) {
            throw new Error('Confirmed sales order not found');
        }
        
        // Insert work order
        const [workOrder] = await connection.execute(
            `INSERT INTO work_orders 
            (work_order_id, sales_order_id, sales_order_item_id, title, description,
             assigned_to, priority, estimated_hours, planned_start_date, planned_end_date,
             technical_specifications, quality_requirements, safety_notes, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                workOrderId,
                sales_order_id,
                sales_order_item_id || null,
                title,
                description || null,
                assigned_to || null,
                priority,
                estimated_hours || null,
                planned_start_date || null,
                planned_end_date || null,
                technical_specifications || null,
                quality_requirements || null,
                safety_notes || null,
                userId
            ]
        );
        
        // Update sales order status to in_production if not already
        await connection.execute(
            `UPDATE sales_orders 
             SET status = 'in_production' 
             WHERE id = ? AND status = 'confirmed'`,
            [sales_order_id]
        );
        
        // Create initial production tasks if specified
        if (req.body.tasks && Array.isArray(req.body.tasks)) {
            for (let i = 0; i < req.body.tasks.length; i++) {
                const task = req.body.tasks[i];
                await connection.execute(
                    `INSERT INTO production_tasks 
                    (work_order_id, task_name, description, sequence_order, 
                     assigned_to, estimated_hours) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        workOrder.insertId,
                        task.task_name,
                        task.description || null,
                        i + 1,
                        task.assigned_to || assigned_to,
                        task.estimated_hours || null
                    ]
                );
            }
        }
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['work_order', workOrder.insertId, 'created', 'Work order created for production', userId]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Work order created successfully',
            data: {
                id: workOrder.insertId,
                work_order_id: workOrderId
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error creating work order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating work order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get work order details with tasks and materials
exports.getWorkOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get work order details
        const [workOrderResult] = await db.execute(`
            SELECT 
                wo.*,
                so.sales_order_id,
                so.customer_po_number,
                c.company_name as client_name,
                se.project_name,
                u1.full_name as assigned_to_name,
                u2.full_name as created_by_name,
                u3.full_name as approved_by_name
            FROM work_orders wo
            LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
            LEFT JOIN quotations q ON so.quotation_id = q.id
            LEFT JOIN estimations e ON q.estimation_id = e.id
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u1 ON wo.assigned_to = u1.id
            LEFT JOIN users u2 ON wo.created_by = u2.id
            LEFT JOIN users u3 ON wo.approved_by = u3.id
            WHERE wo.id = ?
        `, [id]);
        
        if (!workOrderResult[0]) {
            return res.status(404).json({
                success: false,
                message: 'Work order not found'
            });
        }
        
        // Get production tasks
        const [tasks] = await db.execute(`
            SELECT pt.*, u.full_name as assigned_to_name
            FROM production_tasks pt
            LEFT JOIN users u ON pt.assigned_to = u.id
            WHERE pt.work_order_id = ?
            ORDER BY pt.sequence_order
        `, [id]);
        
        // Get material usage
        const [materials] = await db.execute(`
            SELECT mu.*, p.name as product_name,
                   u1.full_name as issued_by_name,
                   u2.full_name as consumed_by_name
            FROM material_usage mu
            LEFT JOIN products p ON mu.product_id = p.id
            LEFT JOIN users u1 ON mu.issued_by = u1.id
            LEFT JOIN users u2 ON mu.consumed_by = u2.id
            WHERE mu.work_order_id = ?
        `, [id]);
        
        // Get quality checkpoints
        const [checkpoints] = await db.execute(`
            SELECT qc.*, u.full_name as inspected_by_name
            FROM quality_checkpoints qc
            LEFT JOIN users u ON qc.inspected_by = u.id
            WHERE qc.work_order_id = ?
            ORDER BY qc.sequence_order
        `, [id]);
        
        res.json({
            success: true,
            data: {
                workOrder: workOrderResult[0],
                tasks: tasks,
                materials: materials,
                checkpoints: checkpoints
            }
        });
        
    } catch (error) {
        console.error('Error fetching work order details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching work order details',
            error: error.message
        });
    }
};

// Update work order status
exports.updateWorkOrderStatus = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { status, progress_percentage, notes } = req.body;
        const userId = req.user.id;
        
        // Update work order
        await connection.execute(
            `UPDATE work_orders 
             SET status = ?, progress_percentage = ?,
                 actual_start_date = CASE WHEN status = 'in_progress' AND actual_start_date IS NULL THEN CURDATE() ELSE actual_start_date END,
                 actual_end_date = CASE WHEN status = 'completed' THEN CURDATE() ELSE actual_end_date END
             WHERE id = ?`,
            [status, progress_percentage || null, id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['work_order', id, status, notes || `Work order status updated to ${status}`, userId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Work order status updated successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error updating work order status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating work order status',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Assign technician to work order
exports.assignTechnician = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to, notes } = req.body;
        const userId = req.user.id;
        
        await db.execute(
            `UPDATE work_orders 
             SET assigned_to = ?, assigned_date = CURDATE() 
             WHERE id = ?`,
            [assigned_to, id]
        );
        
        // Create case history entry
        await db.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['work_order', id, 'assigned', notes || 'Technician assigned to work order', userId]
        );
        
        res.json({
            success: true,
            message: 'Technician assigned successfully'
        });
        
    } catch (error) {
        console.error('Error assigning technician:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning technician',
            error: error.message
        });
    }
};

// Get production dashboard data
exports.getProductionDashboard = async (req, res) => {
    try {
        // Get work orders summary
        const [statusSummary] = await db.execute(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(estimated_hours) as total_estimated_hours
            FROM work_orders 
            GROUP BY status
        `);
        
        // Get technician workload
        const [technicianWorkload] = await db.execute(`
            SELECT 
                u.full_name,
                COUNT(wo.id) as active_work_orders,
                SUM(wo.estimated_hours) as total_hours
            FROM users u
            LEFT JOIN work_orders wo ON u.id = wo.assigned_to AND wo.status IN ('assigned', 'in_progress')
            WHERE u.user_role IN ('technician', 'designer')
            GROUP BY u.id, u.full_name
        `);
        
        // Get overdue work orders
        const [overdueOrders] = await db.execute(`
            SELECT 
                wo.work_order_id,
                wo.title,
                wo.planned_end_date,
                u.full_name as assigned_to_name,
                so.sales_order_id
            FROM work_orders wo
            LEFT JOIN users u ON wo.assigned_to = u.id
            LEFT JOIN sales_orders so ON wo.sales_order_id = so.id
            WHERE wo.planned_end_date < CURDATE() 
            AND wo.status NOT IN ('completed', 'cancelled')
            ORDER BY wo.planned_end_date
        `);
        
        res.json({
            success: true,
            data: {
                statusSummary,
                technicianWorkload,
                overdueOrders
            }
        });
        
    } catch (error) {
        console.error('Error fetching production dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching production dashboard',
            error: error.message
        });
    }
};

module.exports = exports;
