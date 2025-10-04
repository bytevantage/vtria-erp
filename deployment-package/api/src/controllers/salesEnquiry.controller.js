const db = require('../config/database');
const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');

class SalesEnquiryController {
    // Get all enquiries with client information and case details
    async getAllEnquiries(req, res) {
        try {
            const query = `
                SELECT 
                    se.*,
                    c.company_name as client_name,
                    c.contact_person,
                    c.city,
                    c.state,
                    u.full_name as enquiry_by_name,
                    au.full_name as assigned_to_name,
                    cs.case_number,
                    cs.current_state as case_state,
                    cs.status as case_status
                FROM sales_enquiries se
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON se.enquiry_by = u.id
                LEFT JOIN users au ON se.assigned_to = au.id
                LEFT JOIN cases cs ON se.case_id = cs.id
                WHERE se.deleted_at IS NULL 
                AND (cs.id IS NULL OR cs.current_state = 'enquiry')
                ORDER BY se.created_at DESC
            `;

            const [enquiries] = await db.execute(query);

            res.json({
                success: true,
                data: enquiries,
                count: enquiries.length
            });
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            res.status(500).json({
                success: false,
                message: 'Database connection error. Please ensure the database is running and properly configured.',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Get single enquiry by ID
    async getEnquiryById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    se.*,
                    c.company_name as client_name,
                    c.contact_person,
                    c.email,
                    c.phone,
                    c.address,
                    c.city,
                    c.state,
                    c.pincode,
                    c.gstin,
                    u.full_name as assigned_to_name
                FROM sales_enquiries se
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON se.assigned_to = u.id
                WHERE se.id = ?
            `;

            const [enquiries] = await db.execute(query, [id]);

            if (enquiries.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Enquiry not found'
                });
            }

            res.json({
                success: true,
                data: enquiries[0]
            });
        } catch (error) {
            console.error('Error fetching enquiry:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching enquiry',
                error: error.message
            });
        }
    }

    // Create new enquiry with case management integration
    async createEnquiry(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                client_id,
                project_name,
                description,
                requirements,
                priority = 'medium',
                estimated_value,
                enquiry_by, // This should be a user ID
                status = 'new'
            } = req.body;

            // Validate required fields
            if (!client_id || !project_name || !enquiry_by) {
                return res.status(400).json({
                    success: false,
                    message: 'Client, project name, and enquiry by are required'
                });
            }

            // Generate enquiry ID within transaction
            const currentYear = new Date().getFullYear();
            const financialYear = `${currentYear % 100}${(currentYear + 1) % 100}`;

            // Get the highest existing sequence number for this financial year
            const [existingEnquiries] = await connection.execute(
                'SELECT enquiry_id FROM sales_enquiries WHERE enquiry_id LIKE ? ORDER BY enquiry_id DESC LIMIT 1',
                [`VESPL/EQ/${financialYear}/%`]
            );

            let nextSequence = 1;
            if (existingEnquiries.length > 0) {
                const lastEnquiryId = existingEnquiries[0].enquiry_id;
                const sequencePart = lastEnquiryId.split('/').pop();
                const lastSequence = parseInt(sequencePart, 10);
                nextSequence = lastSequence + 1;
            }

            const enquiry_id = `VESPL/EQ/${financialYear}/${nextSequence.toString().padStart(3, '0')}`;
            const date = new Date().toISOString().split('T')[0];

            // Insert enquiry (using only columns that exist in the table)
            const enquiryQuery = `
                INSERT INTO sales_enquiries 
                (enquiry_id, date, client_id, project_name, description, enquiry_by, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            // Convert undefined values to null for MySQL compatibility
            const enquiryParams = [
                enquiry_id,
                date,
                client_id || null,
                project_name || null,
                description || null,
                enquiry_by || null,
                status || 'new'
            ];

            const [enquiryResult] = await connection.execute(enquiryQuery, enquiryParams);

            const enquiry_insert_id = enquiryResult.insertId;

            // Automatically create a case from this enquiry
            try {
                // Generate case number
                const caseNumber = await generateDocumentId(DOCUMENT_TYPES.CASE);

                // Create case
                const [caseResult] = await connection.execute(
                    `INSERT INTO cases
                    (case_number, enquiry_id, current_state, client_id, project_name, requirements,
                     priority, estimated_value, created_by, updated_by)
                    VALUES (?, ?, 'enquiry', ?, ?, ?, 'medium', ?, ?, ?)`,
                    [
                        caseNumber,
                        enquiry_insert_id,
                        client_id,
                        project_name,
                        description,
                        estimated_value || null,
                        enquiry_by,
                        enquiry_by
                    ]
                );

                const case_id = caseResult.insertId;

                // Update enquiry with case_id
                await connection.execute(
                    'UPDATE sales_enquiries SET case_id = ? WHERE id = ?',
                    [case_id, enquiry_insert_id]
                );

                // Create initial state transition
                await connection.execute(
                    `INSERT INTO case_state_transitions 
                    (case_id, from_state, to_state, transition_reason, reference_type, reference_id, created_by)
                    VALUES (?, NULL, 'enquiry', 'Case created from enquiry', 'enquiry', ?, ?)`,
                    [case_id, enquiry_insert_id, enquiry_by]
                );

                console.log(`Created case ${caseNumber} for enquiry ${enquiry_id}`);
            } catch (caseError) {
                console.error('Error creating case:', caseError);
                // Don't fail the enquiry creation if case creation fails
            }

            await connection.commit();
            connection.release();

            res.status(201).json({
                success: true,
                message: 'Enquiry created successfully',
                data: {
                    enquiry_id: enquiry_insert_id,
                    enquiry_number: enquiry_id
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating enquiry:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating enquiry and case',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Update enquiry
    async updateEnquiry(req, res) {
        try {
            const { id } = req.params;
            const {
                client_id,
                project_name,
                description,
                enquiry_by,
                status,
                assigned_to
            } = req.body;

            // Get current enquiry to check status change
            const [currentEnquiry] = await db.execute(
                'SELECT status FROM sales_enquiries WHERE id = ?',
                [id]
            );

            if (currentEnquiry.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Enquiry not found'
                });
            }

            const query = `
                UPDATE sales_enquiries 
                SET client_id = ?, project_name = ?, description = ?, enquiry_by = ?, 
                    status = ?, assigned_to = ?
                WHERE id = ?
            `;

            await db.execute(query, [
                client_id || null,
                project_name || null,
                description || null,
                enquiry_by || null,
                status || null,
                assigned_to || null,
                id
            ]);

            // Add status history if status changed
            if (status && status !== currentEnquiry[0].status) {
                await db.execute(
                    'INSERT INTO enquiry_status_history (enquiry_id, previous_status, new_status, comments) VALUES (?, ?, ?, ?)',
                    [id, currentEnquiry[0].status, status, `Status changed from ${currentEnquiry[0].status} to ${status}`]
                );
            }

            res.json({
                success: true,
                message: 'Enquiry updated successfully'
            });
        } catch (error) {
            console.error('Error updating enquiry:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating enquiry',
                error: error.message
            });
        }
    }

    // Assign enquiry to designer/team
    async assignEnquiry(req, res) {
        try {
            const { id } = req.params;
            const { assigned_to, comments } = req.body;

            const query = `
                UPDATE sales_enquiries 
                SET assigned_to = ?, assigned_date = NOW(), status = 'assigned'
                WHERE id = ?
            `;

            await db.execute(query, [assigned_to, id]);

            // Add status history
            await db.execute(
                'INSERT INTO enquiry_status_history (enquiry_id, previous_status, new_status, comments) VALUES (?, ?, ?, ?)',
                [id, 'new', 'assigned', comments || 'Enquiry assigned to design team']
            );

            res.json({
                success: true,
                message: 'Enquiry assigned successfully'
            });
        } catch (error) {
            console.error('Error assigning enquiry:', error);
            res.status(500).json({
                success: false,
                message: 'Error assigning enquiry',
                error: error.message
            });
        }
    }

    // Get dashboard stats
    async getDashboardStats(req, res) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_enquiries,
                    COUNT(CASE WHEN status = 'new' THEN 1 END) as new_enquiries,
                    COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_enquiries,
                    COUNT(CASE WHEN status = 'estimation' THEN 1 END) as in_estimation,
                    COUNT(CASE WHEN status = 'quotation' THEN 1 END) as in_quotation,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_enquiries,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enquiries
                FROM sales_enquiries
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `;

            const [stats] = await db.execute(statsQuery);

            res.json({
                success: true,
                data: stats[0]
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard stats',
                error: error.message
            });
        }
    }

    // Delete enquiry
    async deleteEnquiry(req, res) {
        try {
            const { id } = req.params;

            // Check if enquiry exists
            const [enquiry] = await db.execute(
                'SELECT id FROM sales_enquiries WHERE id = ?',
                [id]
            );

            if (enquiry.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Enquiry not found'
                });
            }

            await db.execute('DELETE FROM sales_enquiries WHERE id = ?', [id]);

            res.json({
                success: true,
                message: 'Enquiry deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting enquiry:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting enquiry',
                error: error.message
            });
        }
    }
}

module.exports = new SalesEnquiryController();
