const moment = require('moment');
const db = require('../config/database');

class ManufacturingWorkflowController {
    // Get manufacturing jobs with technician assignments
    async getManufacturingJobs(req, res) {
        try {
            const { status, technician_id, priority } = req.query;
            
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (status) {
                whereClause += ' AND mj.status = ?';
                params.push(status);
            }
            
            if (technician_id) {
                whereClause += ' AND mj.assigned_technician_id = ?';
                params.push(technician_id);
            }
            
            if (priority) {
                whereClause += ' AND mj.priority = ?';
                params.push(priority);
            }
            
            const query = `
                SELECT 
                    mj.*,
                    so.order_number,
                    c.name as client_name,
                    u.name as technician_name,
                    u.phone as technician_phone,
                    COUNT(mjt.id) as total_tasks,
                    SUM(CASE WHEN mjt.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                    ROUND((SUM(CASE WHEN mjt.status = 'completed' THEN 1 ELSE 0 END) / COUNT(mjt.id)) * 100, 2) as progress_percentage
                FROM manufacturing_jobs mj
                LEFT JOIN sales_orders so ON mj.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                LEFT JOIN users u ON mj.assigned_technician_id = u.id
                LEFT JOIN manufacturing_job_tasks mjt ON mj.id = mjt.job_id
                ${whereClause}
                GROUP BY mj.id
                ORDER BY mj.priority DESC, mj.start_date ASC
            `;
            
            const [rows] = await db.execute(query, params);
            
            res.json({
                success: true,
                data: rows
            });
            
        } catch (error) {
            console.error('Error fetching manufacturing jobs:', error);
            res.status(500).json({ error: 'Failed to fetch manufacturing jobs' });
        }
    }
    
    // Get job details with tasks and materials
    async getJobDetails(req, res) {
        try {
            const { jobId } = req.params;
            
            // Get job header
            const jobQuery = `
                SELECT 
                    mj.*,
                    so.order_number,
                    c.name as client_name,
                    c.phone as client_phone,
                    u.name as technician_name,
                    u.phone as technician_phone,
                    u.email as technician_email
                FROM manufacturing_jobs mj
                LEFT JOIN sales_orders so ON mj.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                LEFT JOIN users u ON mj.assigned_technician_id = u.id
                WHERE mj.id = ?
            `;
            
            const [jobRows] = await db.execute(jobQuery, [jobId]);
            
            if (jobRows.length === 0) {
                return res.status(404).json({ error: 'Manufacturing job not found' });
            }
            
            // Get job tasks
            const tasksQuery = `
                SELECT 
                    mjt.*,
                    u.name as assigned_to_name
                FROM manufacturing_job_tasks mjt
                LEFT JOIN users u ON mjt.assigned_to = u.id
                WHERE mjt.job_id = ?
                ORDER BY mjt.sequence_order, mjt.id
            `;
            
            const [taskRows] = await db.execute(tasksQuery, [jobId]);
            
            // Get material requirements
            const materialsQuery = `
                SELECT 
                    mjm.*,
                    p.name as material_name,
                    p.sku as material_sku,
                    p.unit,
                    s.quantity as available_stock,
                    CASE 
                        WHEN s.quantity >= mjm.required_quantity THEN 'available'
                        WHEN s.quantity > 0 THEN 'partial'
                        ELSE 'unavailable'
                    END as availability_status
                FROM manufacturing_job_materials mjm
                LEFT JOIN products p ON mjm.product_id = p.id
                LEFT JOIN stock s ON (mjm.product_id = s.product_id AND s.location_id = ?)
                WHERE mjm.job_id = ?
                ORDER BY mjm.id
            `;
            
            const [materialRows] = await db.execute(materialsQuery, [1, jobId]); // Default location
            
            // Get work logs
            const workLogsQuery = `
                SELECT 
                    mwl.*,
                    u.name as technician_name
                FROM manufacturing_work_logs mwl
                LEFT JOIN users u ON mwl.technician_id = u.id
                WHERE mwl.job_id = ?
                ORDER BY mwl.log_date DESC, mwl.id DESC
            `;
            
            const [workLogRows] = await db.execute(workLogsQuery, [jobId]);
            
            res.json({
                success: true,
                data: {
                    job: jobRows[0],
                    tasks: taskRows,
                    materials: materialRows,
                    workLogs: workLogRows
                }
            });
            
        } catch (error) {
            console.error('Error fetching job details:', error);
            res.status(500).json({ error: 'Failed to fetch job details' });
        }
    }
    
    // Create manufacturing job from sales order
    async createManufacturingJob(req, res) {
        try {
            const {
                sales_order_id,
                job_title,
                description,
                assigned_technician_id,
                priority = 'normal',
                estimated_hours,
                start_date,
                due_date,
                tasks = [],
                materials = []
            } = req.body;
            
            const user_id = req.user.id;
            
            // Get connection for transaction
            const connection = await db.getConnection();
            
            try {
                // Generate job number
                const jobNumber = await this.generateJobNumber(connection);
                
                // Start transaction
                await connection.beginTransaction();
                
                // Create manufacturing job
                const jobQuery = `
                    INSERT INTO manufacturing_jobs 
                    (job_number, sales_order_id, job_title, description, 
                     assigned_technician_id, priority, estimated_hours, 
                     start_date, due_date, status, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
                `;
                
                const [jobResult] = await connection.execute(jobQuery, [
                    jobNumber,
                    sales_order_id,
                    job_title,
                    description,
                    assigned_technician_id,
                    priority,
                    estimated_hours,
                    start_date,
                    due_date,
                    user_id
                ]);
                
                const jobId = jobResult.insertId;
                
                // Add tasks
                for (let i = 0; i < tasks.length; i++) {
                    const task = tasks[i];
                    const taskQuery = `
                        INSERT INTO manufacturing_job_tasks 
                        (job_id, task_name, description, estimated_hours, 
                         sequence_order, assigned_to, status)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending')
                    `;
                    
                    await connection.execute(taskQuery, [
                        jobId,
                        task.task_name,
                        task.description || null,
                        task.estimated_hours || 0,
                        i + 1,
                        task.assigned_to || assigned_technician_id
                    ]);
                }
                
                // Add material requirements
                for (const material of materials) {
                    const materialQuery = `
                        INSERT INTO manufacturing_job_materials 
                        (job_id, product_id, required_quantity, allocated_quantity, unit_cost)
                        VALUES (?, ?, ?, 0, ?)
                    `;
                    
                    await connection.execute(materialQuery, [
                        jobId,
                        material.product_id,
                        material.required_quantity,
                        material.unit_cost || 0
                    ]);
                }
                
                await connection.commit();
                
                res.json({
                    success: true,
                    message: 'Manufacturing job created successfully',
                    job_id: jobId,
                    job_number: jobNumber
                });
                
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Error creating manufacturing job:', error);
            res.status(500).json({ error: 'Failed to create manufacturing job' });
        }
    }
    
    // Update task status
    async updateTaskStatus(req, res) {
        try {
            const { taskId } = req.params;
            const { status, notes, actual_hours } = req.body;
            const user_id = req.user.id;
            
            const query = `
                UPDATE manufacturing_job_tasks 
                SET status = ?, 
                    notes = ?, 
                    actual_hours = ?,
                    completed_by = CASE WHEN ? = 'completed' THEN ? ELSE completed_by END,
                    completed_at = CASE WHEN ? = 'completed' THEN NOW() ELSE completed_at END,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await db.execute(query, [
                status,
                notes || null,
                actual_hours || null,
                status,
                user_id,
                status,
                taskId
            ]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }
            
            // Update job progress
            await this.updateJobProgress(db, taskId);
            
            res.json({
                success: true,
                message: 'Task status updated successfully'
            });
            
        } catch (error) {
            console.error('Error updating task status:', error);
            res.status(500).json({ error: 'Failed to update task status' });
        }
    }
    
    // Add work log entry
    async addWorkLog(req, res) {
        try {
            const { jobId } = req.params;
            const {
                task_id,
                work_description,
                hours_worked,
                materials_used = [],
                issues_encountered,
                photos = []
            } = req.body;
            
            const technician_id = req.user.id;
            
            // Get connection for transaction
            const connection = await db.getConnection();
            
            try {
                // Start transaction
                await connection.beginTransaction();
                
                // Add work log entry
                const logQuery = `
                    INSERT INTO manufacturing_work_logs 
                    (job_id, task_id, technician_id, work_description, 
                     hours_worked, issues_encountered, log_date)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                
                const [logResult] = await connection.execute(logQuery, [
                    jobId,
                    task_id || null,
                    technician_id,
                    work_description,
                    hours_worked,
                    issues_encountered || null
                ]);
                
                const logId = logResult.insertId;
                
                // Add materials used
                for (const material of materials_used) {
                    const materialQuery = `
                        INSERT INTO work_log_materials 
                        (work_log_id, product_id, quantity_used, unit_cost)
                        VALUES (?, ?, ?, ?)
                    `;
                    
                    await connection.execute(materialQuery, [
                        logId,
                        material.product_id,
                        material.quantity_used,
                        material.unit_cost || 0
                    ]);
                    
                    // Update stock
                    const stockQuery = `
                        UPDATE stock 
                        SET quantity = quantity - ?
                        WHERE product_id = ? AND location_id = 1 AND quantity >= ?
                    `;
                    
                    await connection.execute(stockQuery, [
                        material.quantity_used,
                        material.product_id,
                        material.quantity_used
                    ]);
                }
                
                // Add photos
                for (const photo of photos) {
                    const photoQuery = `
                        INSERT INTO work_log_photos 
                        (work_log_id, photo_path, description)
                        VALUES (?, ?, ?)
                    `;
                    
                    await connection.execute(photoQuery, [
                        logId,
                        photo.photo_path,
                        photo.description || null
                    ]);
                }
                
                await connection.commit();
                
                res.json({
                    success: true,
                    message: 'Work log added successfully',
                    log_id: logId
                });
                
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
            
        } catch (error) {
            console.error('Error adding work log:', error);
            res.status(500).json({ error: 'Failed to add work log' });
        }
    }
    
    // Get technician dashboard
    async getTechnicianDashboard(req, res) {
        try {
            const technician_id = req.user?.id || req.query.technician_id;
            
            // Get assigned jobs
            const jobsQuery = `
                SELECT 
                    mj.*,
                    so.order_number,
                    c.name as client_name,
                    COUNT(mjt.id) as total_tasks,
                    SUM(CASE WHEN mjt.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
                FROM manufacturing_jobs mj
                LEFT JOIN sales_orders so ON mj.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                LEFT JOIN manufacturing_job_tasks mjt ON mj.id = mjt.job_id
                WHERE mj.assigned_technician_id = ? AND mj.status IN ('pending', 'in_progress')
                GROUP BY mj.id
                ORDER BY mj.priority DESC, mj.due_date ASC
            `;
            
            const [jobRows] = await db.execute(jobsQuery, [technician_id]);
            
            // Get pending tasks
            const tasksQuery = `
                SELECT 
                    mjt.*,
                    mj.job_title,
                    mj.job_number,
                    so.order_number,
                    c.name as client_name
                FROM manufacturing_job_tasks mjt
                LEFT JOIN manufacturing_jobs mj ON mjt.job_id = mj.id
                LEFT JOIN sales_orders so ON mj.sales_order_id = so.id
                LEFT JOIN clients c ON so.client_id = c.id
                WHERE mjt.assigned_to = ? AND mjt.status IN ('pending', 'in_progress')
                ORDER BY mj.priority DESC, mjt.sequence_order ASC
                LIMIT 10
            `;
            
            const [taskRows] = await db.execute(tasksQuery, [technician_id]);
            
            // Get today's work logs
            const workLogsQuery = `
                SELECT 
                    mwl.*,
                    mj.job_title,
                    mj.job_number
                FROM manufacturing_work_logs mwl
                LEFT JOIN manufacturing_jobs mj ON mwl.job_id = mj.id
                WHERE mwl.technician_id = ? AND DATE(mwl.log_date) = CURDATE()
                ORDER BY mwl.log_date DESC
            `;
            
            const [workLogRows] = await db.execute(workLogsQuery, [technician_id]);
            
            res.json({
                success: true,
                data: {
                    assignedJobs: jobRows,
                    pendingTasks: taskRows,
                    todayWorkLogs: workLogRows
                }
            });
            
        } catch (error) {
            console.error('Error fetching technician dashboard:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    }
    
    // Helper methods
    async generateJobNumber(db) {
        const year = moment().format('YY');
        const query = `
            SELECT COUNT(*) as count 
            FROM manufacturing_jobs 
            WHERE job_number LIKE 'VESPL/MFG/${year}%'
        `;
        
        const [rows] = await db.execute(query);
        const sequence = (rows[0].count + 1).toString().padStart(3, '0');
        
        return `VESPL/MFG/${year}/${sequence}`;
    }
    
    async updateJobProgress(db, taskId) {
        // Get job ID from task
        const [taskRows] = await db.execute('SELECT job_id FROM manufacturing_job_tasks WHERE id = ?', [taskId]);
        
        if (taskRows.length === 0) return;
        
        const jobId = taskRows[0].job_id;
        
        // Calculate progress
        const progressQuery = `
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
            FROM manufacturing_job_tasks 
            WHERE job_id = ?
        `;
        
        const [progressRows] = await db.execute(progressQuery, [jobId]);
        const progress = progressRows[0];
        
        let newStatus = 'pending';
        if (progress.completed_tasks > 0 && progress.completed_tasks < progress.total_tasks) {
            newStatus = 'in_progress';
        } else if (progress.completed_tasks === progress.total_tasks) {
            newStatus = 'completed';
        }
        
        // Update job status
        await db.execute(
            'UPDATE manufacturing_jobs SET status = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, jobId]
        );
    }
}

module.exports = new ManufacturingWorkflowController();
