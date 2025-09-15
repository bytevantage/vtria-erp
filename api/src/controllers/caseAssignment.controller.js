const db = require('../config/database');

class CaseAssignmentController {
    // Get all cases with assignment status
    static async getCaseQueue(req, res) {
        try {
            const { status, assigned_to, priority } = req.query;
            const userRole = req.user.role;
            const userId = req.user.id;

            let whereClause = '';
            let params = [];

            // Filter based on user role and permissions
            if (userRole === 'technician') {
                // Technicians can only see cases assigned to them
                whereClause = 'WHERE c.assigned_to = ?';
                params.push(userId);
            } else if (userRole === 'designer') {
                // Designers can see unassigned cases or cases in design phase
                whereClause = 'WHERE (c.assigned_to IS NULL OR c.assigned_to = ?) AND c.current_state IN (\'enquiry\', \'estimation\')';
                params.push(userId);
            } else if (!req.user.permissions.canViewAll) {
                // Other roles see cases they're involved with
                whereClause = 'WHERE c.assigned_to = ? OR c.created_by = ?';
                params.push(userId, userId);
            }

            // Additional filters
            if (status) {
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ' c.status = ?';
                params.push(status);
            }

            if (assigned_to) {
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ' c.assigned_to = ?';
                params.push(assigned_to);
            }

            if (priority) {
                whereClause += whereClause ? ' AND' : 'WHERE';
                whereClause += ' c.priority = ?';
                params.push(priority);
            }

            const query = `
                SELECT
                    c.*,
                    se.enquiry_id,
                    se.project_name,
                    se.client_id,
                    cl.company_name as client_name,
                    u.full_name as assigned_to_name,
                    cu.full_name as created_by_name,
                    TIMESTAMPDIFF(HOUR, c.created_at, NOW()) as hours_since_created,
                    TIMESTAMPDIFF(HOUR, c.state_entered_at, NOW()) as hours_in_current_state
                FROM cases c
                LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
                LEFT JOIN clients cl ON se.client_id = cl.id
                LEFT JOIN users u ON c.assigned_to = u.id
                LEFT JOIN users cu ON c.created_by = cu.id
                ${whereClause}
                ORDER BY
                    CASE
                        WHEN c.priority = 'high' THEN 1
                        WHEN c.priority = 'medium' THEN 2
                        WHEN c.priority = 'low' THEN 3
                    END,
                    c.created_at ASC
            `;

            const [cases] = await db.execute(query, params);

            res.json({
                success: true,
                data: cases,
                count: cases.length
            });
        } catch (error) {
            console.error('Error fetching case queue:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching case queue',
                error: error.message
            });
        }
    }

    // Assign case to user
    static async assignCase(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { case_id } = req.params;
            const { assigned_to, notes } = req.body;
            const assigned_by = req.user.id;

            // Check if user can assign cases
            if (!req.user.permissions.canAssignCases && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to assign cases'
                });
            }

            // Verify case exists
            const [caseData] = await connection.execute(
                'SELECT * FROM cases WHERE id = ?',
                [case_id]
            );

            if (caseData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Case not found'
                });
            }

            // Update case assignment
            await connection.execute(
                'UPDATE cases SET assigned_to = ?, updated_at = NOW() WHERE id = ?',
                [assigned_to, case_id]
            );

            // Log assignment in case history
            await connection.execute(
                `INSERT INTO case_history
                (reference_type, reference_id, status, notes, created_by)
                VALUES (?, ?, ?, ?, ?)`,
                ['assignment', case_id, 'assigned',
                 `Case assigned to user ID ${assigned_to}${notes ? ': ' + notes : ''}`,
                 assigned_by]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Case assigned successfully'
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error assigning case:', error);
            res.status(500).json({
                success: false,
                message: 'Error assigning case',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Unassign case
    static async unassignCase(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { case_id } = req.params;
            const { notes } = req.body;
            const unassigned_by = req.user.id;

            // Check permissions
            if (!req.user.permissions.canAssignCases && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to unassign cases'
                });
            }

            // Update case assignment
            await connection.execute(
                'UPDATE cases SET assigned_to = NULL, updated_at = NOW() WHERE id = ?',
                [case_id]
            );

            // Log unassignment in case history
            await connection.execute(
                `INSERT INTO case_history
                (reference_type, reference_id, status, notes, created_by)
                VALUES (?, ?, ?, ?, ?)`,
                ['assignment', case_id, 'unassigned',
                 `Case unassigned${notes ? ': ' + notes : ''}`,
                 unassigned_by]
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Case unassigned successfully'
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error unassigning case:', error);
            res.status(500).json({
                success: false,
                message: 'Error unassigning case',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Get case assignment history
    static async getCaseAssignmentHistory(req, res) {
        try {
            const { case_id } = req.params;

            const query = `
                SELECT
                    ch.*,
                    u.full_name as created_by_name
                FROM case_history ch
                LEFT JOIN users u ON ch.created_by = u.id
                WHERE ch.reference_type = 'assignment' AND ch.reference_id = ?
                ORDER BY ch.created_at DESC
            `;

            const [history] = await db.execute(query, [case_id]);

            res.json({
                success: true,
                data: history
            });
        } catch (error) {
            console.error('Error fetching assignment history:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching assignment history',
                error: error.message
            });
        }
    }

    // Get available users for assignment based on case state
    static async getAvailableAssignees(req, res) {
        try {
            const { case_id } = req.params;

            // Get case details
            const [caseData] = await db.execute(
                'SELECT current_state, priority FROM cases WHERE id = ?',
                [case_id]
            );

            if (caseData.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Case not found'
                });
            }

            const caseState = caseData[0].current_state;

            // Determine appropriate roles based on case state
            let appropriateRoles = [];
            switch (caseState) {
                case 'enquiry':
                case 'estimation':
                    appropriateRoles = ['designer', 'sales-admin'];
                    break;
                case 'quotation':
                case 'order':
                    appropriateRoles = ['sales-admin', 'admin'];
                    break;
                case 'production':
                case 'delivery':
                    appropriateRoles = ['technician', 'admin'];
                    break;
                default:
                    appropriateRoles = ['admin'];
            }

            // Get users with appropriate roles
            const placeholders = appropriateRoles.map(() => '?').join(',');
            const [users] = await db.execute(
                `SELECT id, full_name, user_role, status FROM users
                 WHERE user_role IN (${placeholders}) AND status = 'active'
                 ORDER BY full_name`,
                appropriateRoles
            );

            res.json({
                success: true,
                data: users,
                case_state: caseState
            });
        } catch (error) {
            console.error('Error fetching available assignees:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching available assignees',
                error: error.message
            });
        }
    }
}

module.exports = CaseAssignmentController;