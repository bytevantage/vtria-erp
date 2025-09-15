const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

exports.createEnquiry = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            client_id, 
            project_name, 
            description 
        } = req.body;
        
        // Generate enquiry ID (VESPL/EQ/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const enquiryId = await DocumentNumberGenerator.generateNumber('EQ', financialYear);
        
        // Insert enquiry
        const [result] = await connection.execute(
            `INSERT INTO sales_enquiries 
            (enquiry_id, date, client_id, project_name, description, enquiry_by) 
            VALUES (?, CURDATE(), ?, ?, ?, ?)`,
            [enquiryId, client_id, project_name, description, req.user.id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_enquiry', result.insertId, 'new', 'Sales enquiry created', req.user.id]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Sales enquiry created successfully',
            data: { 
                id: result.insertId,
                enquiry_id: enquiryId
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error creating sales enquiry',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getEnquiry = async (req, res) => {
    try {
        const [enquiry] = await db.execute(
            `SELECT e.*, c.company_name, u.full_name as created_by_name, 
             a.full_name as assigned_to_name
             FROM sales_enquiries e
             LEFT JOIN clients c ON e.client_id = c.id
             LEFT JOIN users u ON e.enquiry_by = u.id
             LEFT JOIN users a ON e.assigned_to = a.id
             WHERE e.id = ?`,
            [req.params.id]
        );
        
        if (enquiry.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sales enquiry not found'
            });
        }
        
        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             LEFT JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'sales_enquiry' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                enquiry: enquiry[0],
                history
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sales enquiry',
            error: error.message
        });
    }
};

exports.assignEnquiry = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { assigned_to } = req.body;
        
        // Update enquiry
        await connection.execute(
            `UPDATE sales_enquiries 
             SET assigned_to = ?, status = 'assigned'
             WHERE id = ?`,
            [assigned_to, req.params.id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['sales_enquiry', req.params.id, 'assigned', 'Enquiry assigned to designer', req.user.id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Sales enquiry assigned successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error assigning sales enquiry',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.listEnquiries = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT e.*, c.company_name, u.full_name as created_by_name,
            a.full_name as assigned_to_name
            FROM sales_enquiries e
            LEFT JOIN clients c ON e.client_id = c.id
            LEFT JOIN users u ON e.enquiry_by = u.id
            LEFT JOIN users a ON e.assigned_to = a.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND e.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Number(offset));
        
        const [enquiries] = await db.execute(query, params);
        
        // Get total count
        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM sales_enquiries WHERE 1=1' + 
            (status ? ' AND status = ?' : ''),
            status ? [status] : []
        );
        
        res.json({
            success: true,
            data: {
                enquiries,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: countResult[0].total
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sales enquiries',
            error: error.message
        });
    }
};
