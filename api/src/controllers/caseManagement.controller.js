const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

// Check if user has access to a specific case
const checkCaseAccess = async (caseId, userId, userRole) => {
    try {
        // Get case details
        const [caseRows] = await db.query(
            'SELECT created_by, assigned_to FROM cases WHERE id = ?',
            [caseId]
        );

        if (caseRows.length === 0) {
            return false; // Case doesn't exist
        }

        const caseData = caseRows[0];

        // Admin and Director have access to all cases
        if (['admin', 'director'].includes(userRole)) {
            return true;
        }

        // Users can access cases they created or are assigned to
        if (caseData.created_by === userId || caseData.assigned_to === userId) {
            return true;
        }

        // Role-based access for other roles
        switch (userRole) {
            case 'sales-admin':
                // Sales admin can access sales-related cases
                return true;
            case 'designer':
                // Designers can access cases in design/estimation phase
                return true;
            case 'accounts':
                // Accounts can access financial cases
                return true;
            case 'technician':
                // Technicians can only access assigned cases (already checked above)
                return false;
            default:
                return false;
        }
    } catch (error) {
        console.error('Error checking case access:', error);
        return false;
    }
};

// Enhanced Case States with Sub-states
const ENHANCED_CASE_STATES = {
    ENQUIRY: {
        name: 'enquiry',
        substates: ['received', 'under_review', 'clarification_pending', 'approved']
    },
    ESTIMATION: {
        name: 'estimation',
        substates: ['assigned', 'in_progress', 'technical_review', 'management_review', 'approved']
    },
    QUOTATION: {
        name: 'quotation',
        substates: ['draft', 'internal_review', 'sent_to_client', 'negotiation', 'approved']
    },
    ORDER: {
        name: 'order',
        substates: ['po_received', 'po_review', 'confirmed']
    },
    PRODUCTION: {
        name: 'production',
        substates: ['planning', 'material_procurement', 'manufacturing', 'quality_check', 'ready']
    },
    DELIVERY: {
        name: 'delivery',
        substates: ['packaging', 'dispatched', 'in_transit', 'delivered', 'installation', 'acceptance']
    },
    CLOSED: {
        name: 'closed',
        substates: ['completed', 'cancelled']
    }
};

// Case States
const CASE_STATES = {
    ENQUIRY: 'enquiry',
    ESTIMATION: 'estimation', 
    QUOTATION: 'quotation',
    ORDER: 'order',
    PRODUCTION: 'production',
    DELIVERY: 'delivery',
    CLOSED: 'closed'
};

// Get all active cases with their current state
exports.getAllCases = async (req, res) => {
    try {
        const { state, client_id } = req.query;
        
        let whereClause = "WHERE c.status != 'closed'";
        const params = [];
        
        if (state) {
            whereClause += " AND c.current_state = ?";
            params.push(state);
        }
        
        if (client_id) {
            whereClause += " AND se.client_id = ?";
            params.push(client_id);
        }
        
        const query = `
            SELECT 
                c.id as case_id,
                c.case_number,
                c.current_state,
                c.created_at as case_created,
                c.updated_at as last_updated,
                se.enquiry_id,
                se.project_name,
                se.requirements,
                se.priority,
                cl.company_name as client_name,
                cl.contact_person,
                cl.city,
                cl.state as client_state,
                e.estimation_id,
                e.total_final_price as estimation_value,
                e.status as estimation_status,
                q.quotation_id,
                q.grand_total as quotation_value,
                q.status as quotation_status,
                q.valid_until as quotation_validity,
                so.sales_order_id,
                so.total_amount as order_value,
                so.status as order_status,
                so.delivery_date as expected_delivery,
                u.full_name as assigned_to
            FROM cases c
            JOIN sales_enquiries se ON c.enquiry_id = se.id
            JOIN clients cl ON se.client_id = cl.id
            LEFT JOIN estimations e ON se.id = e.enquiry_id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            LEFT JOIN sales_orders so ON q.id = so.quotation_id
            LEFT JOIN users u ON c.assigned_to = u.id
            ${whereClause}
            ORDER BY c.updated_at DESC
        `;
        
        const [cases] = await db.execute(query, params);
        
        // Group cases by state for easy queue management
        const casesByState = cases.reduce((acc, caseItem) => {
            const state = caseItem.current_state;
            if (!acc[state]) acc[state] = [];
            acc[state].push(caseItem);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: {
                all_cases: cases,
                by_state: casesByState,
                total_count: cases.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching cases:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cases',
            error: error.message
        });
    }
};

// Get single case with complete details
exports.getCaseDetails = async (req, res) => {
    try {
        const { case_number } = req.params;
        
        const query = `
            SELECT 
                c.*,
                se.*,
                cl.company_name as client_name,
                cl.contact_person,
                cl.email as client_email,
                cl.phone as client_phone,
                cl.address as client_address,
                cl.city,
                cl.state as client_state,
                cl.gst_number as client_gst,
                u.full_name as assigned_to_name
            FROM cases c
            JOIN sales_enquiries se ON c.enquiry_id = se.id
            JOIN clients cl ON se.client_id = cl.id
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.case_number = ?
        `;
        
        const [caseDetails] = await db.execute(query, [case_number]);
        
        if (!caseDetails[0]) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        // Get estimation details if exists
        let estimation = null;
        const [estimationData] = await db.execute(
            'SELECT * FROM estimations WHERE enquiry_id = ?',
            [caseDetails[0].enquiry_id]
        );
        if (estimationData[0]) {
            estimation = estimationData[0];
        }
        
        // Get quotation details if exists
        let quotation = null;
        if (estimation) {
            const [quotationData] = await db.execute(
                'SELECT * FROM quotations WHERE estimation_id = ?',
                [estimation.id]
            );
            if (quotationData[0]) {
                quotation = quotationData[0];
            }
        }
        
        // Get sales order details if exists
        let salesOrder = null;
        if (quotation) {
            const [orderData] = await db.execute(
                'SELECT * FROM sales_orders WHERE quotation_id = ?',
                [quotation.id]
            );
            if (orderData[0]) {
                salesOrder = orderData[0];
            }
        }
        
        // Get case timeline
        const [timeline] = await db.execute(`
            SELECT 
                cst.*,
                u.full_name as created_by_name
            FROM case_state_transitions cst
            JOIN users u ON cst.created_by = u.id
            WHERE cst.case_id = ?
            ORDER BY cst.created_at ASC
        `, [caseDetails[0].id]);
        
        res.json({
            success: true,
            data: {
                case_info: caseDetails[0],
                estimation,
                quotation,
                sales_order: salesOrder,
                timeline
            }
        });
        
    } catch (error) {
        console.error('Error fetching case details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching case details',
            error: error.message
        });
    }
};

// Create new case from sales enquiry
exports.createCase = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { enquiry_id, assigned_to } = req.body;
        
        // Generate case number (VESPL/C/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const caseNumber = await DocumentNumberGenerator.generateNumber('C', financialYear);
        
        // Create case record
        const [caseResult] = await connection.execute(
            `INSERT INTO cases 
            (case_number, enquiry_id, current_state, assigned_to, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            [caseNumber, enquiry_id, CASE_STATES.ENQUIRY, assigned_to, req.user.id]
        );
        
        // Create initial state transition
        await connection.execute(
            `INSERT INTO case_state_transitions 
            (case_id, from_state, to_state, notes, created_by) 
            VALUES (?, NULL, ?, ?, ?)`,
            [caseResult.insertId, CASE_STATES.ENQUIRY, 'Case created from sales enquiry', req.user.id]
        );
        
        // Update sales enquiry to link with case
        await connection.execute(
            'UPDATE sales_enquiries SET case_id = ? WHERE id = ?',
            [caseResult.insertId, enquiry_id]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Case created successfully',
            data: {
                case_id: caseResult.insertId,
                case_number: caseNumber,
                current_state: CASE_STATES.ENQUIRY
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error creating case:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating case',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Move case to next state
exports.transitionCaseState = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { case_number } = req.params;
        const { to_state, notes, reference_id } = req.body;
        
        // Get current case details
        const [currentCase] = await connection.execute(
            'SELECT * FROM cases WHERE case_number = ?',
            [case_number]
        );
        
        if (!currentCase[0]) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const fromState = currentCase[0].current_state;
        
        // Validate state transition
        const validTransitions = {
            [CASE_STATES.ENQUIRY]: [CASE_STATES.ESTIMATION],
            [CASE_STATES.ESTIMATION]: [CASE_STATES.QUOTATION],
            [CASE_STATES.QUOTATION]: [CASE_STATES.ORDER],
            [CASE_STATES.ORDER]: [CASE_STATES.PRODUCTION],
            [CASE_STATES.PRODUCTION]: [CASE_STATES.DELIVERY],
            [CASE_STATES.DELIVERY]: [CASE_STATES.CLOSED]
        };
        
        if (!validTransitions[fromState] || !validTransitions[fromState].includes(to_state)) {
            return res.status(400).json({
                success: false,
                message: `Invalid state transition from ${fromState} to ${to_state}`
            });
        }
        
        // Update case state
        await connection.execute(
            `UPDATE cases 
             SET current_state = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE case_number = ?`,
            [to_state, case_number]
        );
        
        // Record state transition
        await connection.execute(
            `INSERT INTO case_state_transitions 
            (case_id, from_state, to_state, notes, reference_id, created_by) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [currentCase[0].id, fromState, to_state, notes, reference_id, req.user.id]
        );
        
        // Update related records based on state
        switch (to_state) {
            case CASE_STATES.ESTIMATION:
                // Estimation created - update estimation status
                if (reference_id) {
                    await connection.execute(
                        'UPDATE estimations SET status = ? WHERE id = ?',
                        ['in_progress', reference_id]
                    );
                }
                break;
                
            case CASE_STATES.QUOTATION:
                // Quotation created - update quotation status
                if (reference_id) {
                    await connection.execute(
                        'UPDATE quotations SET status = ? WHERE id = ?',
                        ['draft', reference_id]
                    );
                }
                break;
                
            case CASE_STATES.ORDER:
                // Order confirmed - update sales order status
                if (reference_id) {
                    await connection.execute(
                        'UPDATE sales_orders SET status = ? WHERE id = ?',
                        ['confirmed', reference_id]
                    );
                }
                break;
                
            case CASE_STATES.CLOSED:
                // Case closed - update sales enquiry
                await connection.execute(
                    `UPDATE sales_enquiries 
                     SET status = 'closed', closed_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [currentCase[0].enquiry_id]
                );
                break;
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: `Case transitioned from ${fromState} to ${to_state}`,
            data: {
                case_number,
                from_state: fromState,
                to_state,
                updated_at: new Date()
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error transitioning case state:', error);
        res.status(500).json({
            success: false,
            message: 'Error transitioning case state',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Get cases by state (for queue management)
exports.getCasesByState = async (req, res) => {
    try {
        const { state } = req.params;
        
        const query = `
            SELECT 
                c.case_number,
                c.current_state,
                c.created_at,
                c.updated_at,
                se.project_name,
                se.description,
                cl.company_name as client_name,
                cl.contact_person as client_email,
                u.full_name as case_owner_name,
                u.role as case_owner_role,
                DATEDIFF(CURRENT_DATE, c.created_at) as days_in_system,
                CASE 
                    WHEN c.current_state = 'enquiry' THEN se.description
                    WHEN c.current_state = 'estimation' THEN CONCAT('Est Value: ₹', COALESCE(e.total_final_price, 0))
                    WHEN c.current_state = 'quotation' THEN CONCAT('Quote Value: ₹', COALESCE(q.grand_total, 0))
                    WHEN c.current_state = 'order' THEN CONCAT('Order Value: ₹', COALESCE(so.total_amount, 0))
                    ELSE 'In Progress'
                END as current_info
            FROM cases c
            JOIN sales_enquiries se ON c.enquiry_id = se.id
            JOIN clients cl ON se.client_id = cl.id
            LEFT JOIN users u ON c.assigned_to = u.id
            LEFT JOIN estimations e ON se.id = e.enquiry_id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            LEFT JOIN sales_orders so ON q.id = so.quotation_id
            WHERE c.current_state = ?
            ORDER BY c.created_at ASC
        `;
        
        const [cases] = await db.execute(query, [state]);
        
        res.json({
            success: true,
            data: cases,
            count: cases.length,
            state: state
        });
        
    } catch (error) {
        console.error('Error fetching cases by state:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cases by state',
            error: error.message
        });
    }
};

// Get case statistics
exports.getCaseStatistics = async (req, res) => {
    try {
        const [stats] = await db.execute(`
            SELECT 
                current_state,
                COUNT(*) as count,
                AVG(DATEDIFF(CURRENT_DATE, created_at)) as avg_days_in_state
            FROM cases 
            WHERE current_state != 'closed'
            GROUP BY current_state
            
            UNION ALL
            
            SELECT 
                'closed' as current_state,
                COUNT(*) as count,
                AVG(DATEDIFF(updated_at, created_at)) as avg_days_in_state
            FROM cases 
            WHERE current_state = 'closed'
            AND updated_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        `);
        
        const [totalValue] = await db.execute(`
            SELECT 
                SUM(CASE WHEN c.current_state = 'quotation' THEN q.grand_total ELSE 0 END) as pending_quotation_value,
                SUM(CASE WHEN c.current_state = 'order' THEN so.total_amount ELSE 0 END) as pending_order_value,
                COUNT(CASE WHEN c.current_state != 'closed' THEN 1 END) as active_cases,
                COUNT(CASE WHEN c.current_state = 'closed' AND c.updated_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY) THEN 1 END) as closed_this_month
            FROM cases c
            LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
            LEFT JOIN estimations e ON se.id = e.enquiry_id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            LEFT JOIN sales_orders so ON q.id = so.quotation_id
        `);
        
        res.json({
            success: true,
            data: {
                by_state: stats,
                summary: totalValue[0]
            }
        });
        
    } catch (error) {
        console.error('Error fetching case statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching case statistics',
            error: error.message
        });
    }
};

// Get case timeline
exports.getCaseTimeline = async (req, res) => {
    try {
        const { case_number } = req.params;
        
        const [timeline] = await db.execute(`
            SELECT 
                cst.*,
                u.full_name as created_by_name
            FROM case_state_transitions cst
            JOIN users u ON cst.created_by = u.id
            JOIN cases c ON cst.case_id = c.id
            WHERE c.case_number = ?
            ORDER BY cst.created_at ASC
        `, [case_number]);
        
        res.json({
            success: true,
            data: timeline
        });
        
    } catch (error) {
        console.error('Error fetching case timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching case timeline',
            error: error.message
        });
    }
};

// Search cases
exports.searchCases = async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const query = `
            SELECT 
                c.case_number,
                c.current_state,
                c.created_at,
                c.updated_at,
                se.project_name,
                se.description,
                cl.company_name as client_name,
                cl.contact_person,
                cl.email as client_email,
                u.full_name as case_owner_name,
                u.role as case_owner_role
            FROM cases c
            JOIN sales_enquiries se ON c.enquiry_id = se.id
            JOIN clients cl ON se.client_id = cl.id
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE 
                c.case_number LIKE ? OR
                se.project_name LIKE ? OR
                cl.company_name LIKE ? OR
                cl.contact_person LIKE ? OR
                se.enquiry_id LIKE ?
            ORDER BY c.updated_at DESC
            LIMIT 50
        `;
        
        const searchTerm = `%${q}%`;
        const [results] = await db.execute(query, [searchTerm, searchTerm, searchTerm, searchTerm, q]);
        
        res.json({
            success: true,
            data: results,
            count: results.length
        });
        
    } catch (error) {
        console.error('Error searching cases:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching cases',
            error: error.message
        });
    }
};

// Update case
exports.updateCase = async (req, res) => {
    try {
        const { case_number } = req.params;
        const { assigned_to, notes } = req.body;
        
        const [result] = await db.execute(
            `UPDATE cases 
             SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE case_number = ?`,
            [assigned_to, case_number]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        // Add note if provided
        if (notes) {
            const [caseData] = await db.execute('SELECT id FROM cases WHERE case_number = ?', [case_number]);
            await db.execute(
                `INSERT INTO case_state_transitions 
                (case_id, from_state, to_state, notes, created_by) 
                VALUES (?, (SELECT current_state FROM cases WHERE case_number = ?), (SELECT current_state FROM cases WHERE case_number = ?), ?, ?)`,
                [caseData[0].id, case_number, case_number, notes, req.user.id]
            );
        }
        
        res.json({
            success: true,
            message: 'Case updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating case:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating case',
            error: error.message
        });
    }
};

// =================== ENHANCED WORKFLOW METHODS ===================

// Get workflow definitions
exports.getWorkflowDefinitions = async (req, res) => {
    try {
        const { state } = req.query;
        
        let whereClause = '';
        const params = [];
        
        if (state) {
            whereClause = 'WHERE state_name = ?';
            params.push(state);
        }
        
        const [definitions] = await db.execute(`
            SELECT 
                state_name,
                sub_state_name,
                step_order,
                display_name,
                description,
                sla_hours,
                requires_approval,
                approval_role,
                is_client_visible,
                is_billable,
                resource_type,
                notify_on_entry,
                notify_on_sla_breach,
                escalation_hours,
                escalation_to
            FROM case_workflow_definitions
            ${whereClause}
            ORDER BY state_name, step_order
        `, params);
        
        // Group by state
        const groupedDefinitions = definitions.reduce((acc, def) => {
            if (!acc[def.state_name]) {
                acc[def.state_name] = [];
            }
            acc[def.state_name].push(def);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: {
                definitions: groupedDefinitions,
                all_definitions: definitions
            }
        });
        
    } catch (error) {
        console.error('Error fetching workflow definitions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching workflow definitions',
            error: error.message
        });
    }
};

// Get workflow status for a specific case
exports.getWorkflowStatus = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        const [status] = await db.execute(`
            SELECT * FROM case_workflow_status WHERE case_number = ?
        `, [caseNumber]);
        
        if (status.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        // Get transition history
        const [transitions] = await db.execute(`
            SELECT 
                cst.*,
                u.name as created_by_name
            FROM case_substate_transitions cst
            LEFT JOIN users u ON cst.created_by = u.id
            WHERE case_id = (SELECT id FROM cases WHERE case_number = ?)
            ORDER BY created_at DESC
        `, [caseNumber]);
        
        res.json({
            success: true,
            data: {
                current_status: status[0],
                transition_history: transitions
            }
        });
        
    } catch (error) {
        console.error('Error fetching workflow status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching workflow status',
            error: error.message
        });
    }
};

// Transition case to next workflow step
exports.transitionWorkflowStep = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        const { notes, created_by } = req.body;
        
        // Use stored procedure for transition
        await db.execute(`
            CALL TransitionCaseSubState(
                (SELECT id FROM cases WHERE case_number = ?),
                ?,
                ?
            )
        `, [caseNumber, notes || '', created_by || 1]);
        
        // Get updated status
        const [updatedStatus] = await db.execute(`
            SELECT * FROM case_workflow_status WHERE case_number = ?
        `, [caseNumber]);
        
        res.json({
            success: true,
            message: 'Case transitioned successfully',
            data: updatedStatus[0]
        });
        
    } catch (error) {
        console.error('Error transitioning case:', error);
        res.status(500).json({
            success: false,
            message: 'Error transitioning case',
            error: error.message
        });
    }
};

// Get SLA breach alerts
exports.getSLAAlerts = async (req, res) => {
    try {
        // Use stored procedure for alerts
        const [alerts] = await db.execute(`CALL GetSLABreachAlerts()`);
        
        res.json({
            success: true,
            data: alerts[0] || []
        });
        
    } catch (error) {
        console.error('Error fetching SLA alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching SLA alerts',
            error: error.message
        });
    }
};

// Approve workflow step
exports.approveWorkflowStep = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        const { approved_by, approval_notes } = req.body;
        
        await db.execute(`
            UPDATE cases 
            SET 
                requires_approval = FALSE,
                approval_pending_from = NULL,
                last_activity_at = NOW()
            WHERE case_number = ?
        `, [caseNumber]);
        
        // Log the approval in transitions
        await db.execute(`
            INSERT INTO case_substate_transitions 
            (case_id, from_state, from_sub_state, to_state, to_sub_state, 
             transition_type, approval_required, approved_by, approved_at, approval_notes, created_by)
            SELECT 
                id, current_state, sub_state, current_state, sub_state,
                'approval', TRUE, ?, NOW(), ?, ?
            FROM cases WHERE case_number = ?
        `, [approved_by, approval_notes, approved_by, caseNumber]);
        
        res.json({
            success: true,
            message: 'Workflow step approved successfully'
        });
        
    } catch (error) {
        console.error('Error approving workflow step:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving workflow step',
            error: error.message
        });
    }
};

// Get pending approvals
exports.getPendingApprovals = async (req, res) => {
    try {
        const { user_role } = req.query;
        
        let whereClause = 'WHERE c.requires_approval = TRUE';
        const params = [];
        
        if (user_role) {
            whereClause += ` AND cwd.approval_role = ?`;
            params.push(user_role);
        }
        
        const [pending] = await db.execute(`
            SELECT 
                c.id,
                c.case_number,
                c.current_state,
                c.sub_state,
                c.project_name,
                cl.name as client_name,
                cwd.display_name as current_step,
                cwd.approval_role,
                c.state_entered_at,
                c.expected_state_completion,
                TIMESTAMPDIFF(HOUR, c.state_entered_at, NOW()) as hours_pending,
                u.name as assigned_to_name
            FROM cases c
            LEFT JOIN case_workflow_definitions cwd ON (
                cwd.state_name = c.current_state 
                AND cwd.sub_state_name = c.sub_state
            )
            LEFT JOIN clients cl ON c.client_id = cl.id
            LEFT JOIN users u ON c.assigned_to = u.id
            ${whereClause}
            ORDER BY c.expected_state_completion ASC
        `, params);
        
        res.json({
            success: true,
            data: pending
        });
        
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending approvals',
            error: error.message
        });
    }
};

// =================== SLA AUTOMATION & NOTIFICATIONS ===================

// Get notification queue
exports.getNotificationQueue = async (req, res) => {
    try {
        const { status, template_type, limit = 50 } = req.query;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND nq.status = ?';
            params.push(status);
        }
        
        if (template_type) {
            whereClause += ' AND nt.template_type = ?';
            params.push(template_type);
        }
        
        const [notifications] = await db.execute(`
            SELECT 
                nq.id,
                nq.case_id,
                c.case_number,
                c.project_name,
                nt.template_name,
                nt.template_type,
                nq.recipient_type,
                nq.recipient_email,
                u.name as recipient_name,
                nq.status,
                nq.scheduled_at,
                nq.sent_at,
                nq.failed_reason,
                nq.retry_count,
                nq.subject,
                nq.notification_channels,
                nq.trigger_event
            FROM notification_queue nq
            LEFT JOIN notification_templates nt ON nq.template_id = nt.id
            LEFT JOIN cases c ON nq.case_id = c.id
            LEFT JOIN users u ON nq.recipient_id = u.id
            ${whereClause}
            ORDER BY nq.created_at DESC
            LIMIT ?
        `, [...params, parseInt(limit)]);
        
        res.json({
            success: true,
            data: notifications
        });
        
    } catch (error) {
        console.error('Error fetching notification queue:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notification queue',
            error: error.message
        });
    }
};

// Get notification templates
exports.getNotificationTemplates = async (req, res) => {
    try {
        const { template_type, is_active = true } = req.query;
        
        let whereClause = 'WHERE is_active = ?';
        const params = [is_active];
        
        if (template_type) {
            whereClause += ' AND template_type = ?';
            params.push(template_type);
        }
        
        const [templates] = await db.execute(`
            SELECT 
                id,
                template_name,
                template_type,
                subject_template,
                body_template,
                notification_channels,
                trigger_hours_before,
                max_frequency_hours,
                client_visible,
                is_active
            FROM notification_templates
            ${whereClause}
            ORDER BY template_type, template_name
        `, params);
        
        res.json({
            success: true,
            data: templates
        });
        
    } catch (error) {
        console.error('Error fetching notification templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notification templates',
            error: error.message
        });
    }
};

// Test notification (for debugging)
exports.testNotification = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        const { template_type = 'sla_warning' } = req.body;
        
        // Get case details
        const [caseData] = await db.execute(`
            SELECT c.*, cl.name as client_name, u.name as assigned_to_name
            FROM cases c
            LEFT JOIN clients cl ON c.client_id = cl.id
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.case_number = ?
        `, [caseNumber]);
        
        if (caseData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const case_info = caseData[0];
        
        // Queue test notification
        await db.execute(`
            INSERT INTO notification_queue (
                case_id, 
                template_id, 
                recipient_type, 
                recipient_id,
                subject,
                message_body,
                notification_channels,
                scheduled_at,
                trigger_event,
                context_data
            )
            SELECT 
                ?,
                nt.id,
                'user',
                ?,
                REPLACE(nt.subject_template, '{{case_number}}', ?),
                REPLACE(REPLACE(nt.body_template, '{{case_number}}', ?), '{{project_name}}', ?),
                nt.notification_channels,
                NOW(),
                'test_notification',
                JSON_OBJECT('test_mode', true)
            FROM notification_templates nt
            WHERE nt.template_type = ?
            LIMIT 1
        `, [
            case_info.id, 
            case_info.assigned_to || 1, 
            caseNumber, 
            caseNumber, 
            case_info.project_name,
            template_type
        ]);
        
        res.json({
            success: true,
            message: 'Test notification queued successfully'
        });
        
    } catch (error) {
        console.error('Error queuing test notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error queuing test notification',
            error: error.message
        });
    }
};

// =================== ESCALATION MANAGEMENT ===================

// Get escalation rules
exports.getEscalationRules = async (req, res) => {
    try {
        const { is_active = true } = req.query;
        
        const [rules] = await db.execute(`
            SELECT 
                id,
                rule_name,
                trigger_type,
                state_name,
                sub_state_name,
                priority_level,
                hours_overdue,
                escalate_to_role,
                escalate_after_hours,
                max_escalation_levels,
                send_notification,
                auto_reassign,
                reassignment_logic,
                is_active
            FROM escalation_rules
            WHERE is_active = ?
            ORDER BY trigger_type, state_name, hours_overdue
        `, [is_active]);
        
        res.json({
            success: true,
            data: rules
        });
        
    } catch (error) {
        console.error('Error fetching escalation rules:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching escalation rules',
            error: error.message
        });
    }
};

// Trigger manual escalation
exports.triggerManualEscalation = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        const { escalate_to_role, reason, escalated_by } = req.body;
        
        // Get case ID
        const [caseData] = await db.execute(`
            SELECT id, assigned_to FROM cases WHERE case_number = ?
        `, [caseNumber]);
        
        if (caseData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const case_info = caseData[0];
        
        // Create escalation record
        const [escalationResult] = await db.execute(`
            INSERT INTO case_escalations (
                case_id,
                escalation_rule_id,
                escalation_level,
                triggered_by,
                escalated_from_user,
                escalated_to_role,
                created_by,
                client_impact_level
            ) VALUES (?, NULL, 1, 'manual', ?, ?, ?, 'medium')
        `, [case_info.id, case_info.assigned_to, escalate_to_role, escalated_by]);
        
        // Queue escalation notification
        await db.execute(`
            INSERT INTO notification_queue (
                case_id, 
                template_id, 
                recipient_type, 
                recipient_role,
                subject,
                message_body,
                notification_channels,
                scheduled_at,
                trigger_event,
                context_data
            )
            SELECT 
                ?,
                nt.id,
                'role',
                ?,
                REPLACE(REPLACE(nt.subject_template, '{{case_number}}', ?), '{{escalation_reason}}', ?),
                REPLACE(REPLACE(REPLACE(nt.body_template, '{{case_number}}', ?), '{{escalation_reason}}', ?), '{{escalated_from_name}}', u.name),
                nt.notification_channels,
                NOW(),
                'manual_escalation',
                JSON_OBJECT('manual', true, 'reason', ?)
            FROM notification_templates nt
            CROSS JOIN users u
            WHERE nt.template_name = 'Escalation Notice'
            AND u.id = ?
        `, [
            case_info.id, 
            escalate_to_role, 
            caseNumber, 
            reason,
            caseNumber, 
            reason,
            reason,
            escalated_by
        ]);
        
        res.json({
            success: true,
            message: 'Case escalated successfully',
            escalation_id: escalationResult.insertId
        });
        
    } catch (error) {
        console.error('Error triggering escalation:', error);
        res.status(500).json({
            success: false,
            message: 'Error triggering escalation',
            error: error.message
        });
    }
};

// Get escalation history
exports.getEscalationHistory = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        const [escalations] = await db.execute(`
            SELECT 
                ce.id,
                ce.escalation_level,
                ce.triggered_by,
                ce.escalated_to_role,
                ce.triggered_at,
                ce.resolved_at,
                ce.resolution_action,
                ce.resolution_notes,
                ce.hours_to_resolution,
                ce.client_impact_level,
                u1.name as escalated_from_name,
                u2.name as escalated_to_name,
                er.rule_name
            FROM case_escalations ce
            LEFT JOIN escalation_rules er ON ce.escalation_rule_id = er.id
            LEFT JOIN users u1 ON ce.escalated_from_user = u1.id
            LEFT JOIN users u2 ON ce.escalated_to_user = u2.id
            LEFT JOIN cases c ON ce.case_id = c.id
            WHERE c.case_number = ?
            ORDER BY ce.triggered_at DESC
        `, [caseNumber]);
        
        res.json({
            success: true,
            data: escalations
        });
        
    } catch (error) {
        console.error('Error fetching escalation history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching escalation history',
            error: error.message
        });
    }
};

// =================== PERFORMANCE ANALYTICS ===================

// Get performance metrics
exports.getPerformanceMetrics = async (req, res) => {
    try {
        const { period = '30', case_id, state_name } = req.query;
        
        let whereClause = 'WHERE cpm.calculated_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
        const params = [parseInt(period)];
        
        if (case_id) {
            whereClause += ' AND cpm.case_id = ?';
            params.push(case_id);
        }
        
        if (state_name) {
            whereClause += ' AND c.current_state = ?';
            params.push(state_name);
        }
        
        const [metrics] = await db.execute(`
            SELECT 
                cpm.*,
                c.case_number,
                c.project_name,
                c.current_state,
                cl.name as client_name
            FROM case_performance_metrics cpm
            LEFT JOIN cases c ON cpm.case_id = c.id
            LEFT JOIN clients cl ON c.client_id = cl.id
            ${whereClause}
            ORDER BY cpm.calculated_at DESC
        `, params);
        
        // Calculate summary statistics
        const totalCases = metrics.length;
        const avgCycleTime = totalCases > 0 ? 
            metrics.reduce((sum, m) => sum + (m.total_cycle_time_hours || 0), 0) / totalCases : 0;
        const avgSLACompliance = totalCases > 0 ?
            metrics.reduce((sum, m) => sum + (m.sla_compliance_percentage || 100), 0) / totalCases : 100;
        
        res.json({
            success: true,
            data: {
                metrics: metrics,
                summary: {
                    total_cases: totalCases,
                    average_cycle_time_hours: Math.round(avgCycleTime * 100) / 100,
                    average_sla_compliance: Math.round(avgSLACompliance * 100) / 100,
                    period_days: parseInt(period)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance metrics',
            error: error.message
        });
    }
};

// Get SLA compliance report
exports.getSLAComplianceReport = async (req, res) => {
    try {
        const [compliance] = await db.execute(`
            SELECT 
                c.current_state,
                COUNT(*) as total_cases,
                SUM(CASE WHEN c.is_sla_breached = FALSE THEN 1 ELSE 0 END) as compliant_cases,
                ROUND((SUM(CASE WHEN c.is_sla_breached = FALSE THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) as compliance_percentage,
                AVG(TIMESTAMPDIFF(HOUR, c.state_entered_at, 
                    CASE WHEN c.status = 'completed' THEN c.updated_at ELSE NOW() END)) as avg_time_in_state
            FROM cases c
            WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY c.current_state
            ORDER BY compliance_percentage DESC
        `);
        
        res.json({
            success: true,
            data: compliance
        });
        
    } catch (error) {
        console.error('Error fetching SLA compliance report:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching SLA compliance report',
            error: error.message
        });
    }
};

// Get dashboard analytics
// Send notification
exports.sendNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [notification] = await db.execute(
            'SELECT * FROM notification_queue WHERE id = ?',
            [id]
        );
        
        if (!notification[0]) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        // In a real implementation, this would send an actual notification
        // For now, we'll just update the status
        await db.execute(
            'UPDATE notification_queue SET status = ?, sent_at = NOW() WHERE id = ?',
            ['sent', id]
        );
        
        res.json({
            success: true,
            message: 'Notification sent successfully',
            data: {
                notification_id: id,
                status: 'sent'
            }
        });
        
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending notification',
            error: error.message
        });
    }
};

// Get escalation trends
exports.getEscalationTrends = async (req, res) => {
    try {
        const [trends] = await db.execute(`
            SELECT 
                DATE(triggered_at) as date,
                COUNT(*) as escalation_count,
                AVG(time_to_resolve_minutes) as avg_resolution_time
            FROM case_escalations
            WHERE triggered_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(triggered_at)
            ORDER BY date DESC
        `);
        
        res.json({
            success: true,
            data: trends
        });
        
    } catch (error) {
        console.error('Error fetching escalation trends:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching escalation trends',
            error: error.message
        });
    }
};

// Resolve an escalation
exports.resolveEscalation = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { escalationId } = req.params;
        const { resolution_notes } = req.body;
        
        // Update escalation status
        await connection.execute(
            `UPDATE case_escalations 
             SET status = 'resolved', 
                 resolved_at = NOW(),
                 resolution_notes = ?,
                 resolved_by = ?
             WHERE id = ?`,
            [resolution_notes, req.user?.id || 1, escalationId]
        );
        
        // Get case ID for updating case status
        const [escalation] = await connection.execute(
            'SELECT case_id FROM case_escalations WHERE id = ?',
            [escalationId]
        );
        
        if (escalation[0]?.case_id) {
            // Update case status based on escalation resolution
            await connection.execute(
                `UPDATE cases 
                 SET status = 'in_progress',
                     updated_at = NOW()
                 WHERE id = ?`,
                [escalation[0].case_id]
            );
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Escalation resolved successfully',
            data: {
                escalation_id: escalationId,
                status: 'resolved'
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error resolving escalation:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving escalation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getDashboardAnalytics = async (req, res) => {
    try {
        // Get multiple analytics in parallel
        const [
            [slaBreaches],
            [escalationCounts],
            [notificationStats],
            [performanceOverview]
        ] = await Promise.all([
            // SLA breaches in last 24 hours
            db.execute(`
                SELECT COUNT(*) as breach_count
                FROM cases 
                WHERE is_sla_breached = TRUE 
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `),
            
            // Escalations by state
            db.execute(`
                SELECT 
                    c.current_state,
                    COUNT(ce.id) as escalation_count
                FROM case_escalations ce
                JOIN cases c ON ce.case_id = c.id
                WHERE ce.triggered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY c.current_state
                ORDER BY escalation_count DESC
            `),
            
            // Notification delivery stats
            db.execute(`
                SELECT 
                    nt.template_type,
                    COUNT(*) as total_sent,
                    SUM(CASE WHEN nq.status = 'failed' THEN 1 ELSE 0 END) as failed_count
                FROM notification_queue nq
                JOIN notification_templates nt ON nq.template_id = nt.id
                WHERE nq.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY nt.template_type
            `),
            
            // Performance overview
            db.execute(`
                SELECT 
                    AVG(sla_compliance_percentage) as avg_sla_compliance,
                    AVG(total_cycle_time_hours) as avg_cycle_time,
                    COUNT(*) as cases_with_metrics
                FROM case_performance_metrics
                WHERE calculated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `)
        ]);
        
        res.json({
            success: true,
            data: {
                sla_breaches_24h: slaBreaches[0]?.breach_count || 0,
                escalations_by_state: escalationCounts,
                notification_stats: notificationStats,
                performance_overview: performanceOverview[0] || {
                    avg_sla_compliance: 0,
                    avg_cycle_time: 0,
                    cases_with_metrics: 0
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard analytics',
            error: error.message
        });
    }
};

// ============ MILESTONE MANAGEMENT METHODS ============

// Get all project templates
exports.getProjectTemplates = async (req, res) => {
    try {
        const [templates] = await db.execute(`
            SELECT 
                pt.*,
                COUNT(mt.id) as milestone_count
            FROM project_templates pt
            LEFT JOIN milestone_templates mt ON pt.id = mt.template_id
            WHERE pt.is_active = TRUE
            GROUP BY pt.id
            ORDER BY pt.template_type, pt.template_name
        `);
        
        res.json({
            success: true,
            data: templates
        });
        
    } catch (error) {
        console.error('Error fetching project templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching project templates',
            error: error.message
        });
    }
};

// Create milestones from template for a case
exports.createMilestonesFromTemplate = async (req, res) => {
    try {
        const { caseNumber, templateId, projectStartDate } = req.body;
        const createdBy = req.user?.id || 1;
        
        // Get case ID from case number
        const [cases] = await db.execute(
            'SELECT id FROM cases WHERE case_number = ?',
            [caseNumber]
        );
        
        if (cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const caseId = cases[0].id;
        
        // Check if milestones already exist for this case
        const [existingMilestones] = await db.execute(
            'SELECT COUNT(*) as count FROM case_milestones WHERE case_id = ?',
            [caseId]
        );
        
        if (existingMilestones[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Milestones already exist for this case'
            });
        }
        
        // Create milestones using stored procedure
        await db.execute(
            'CALL CreateMilestonesFromTemplate(?, ?, ?, ?)',
            [caseId, templateId, projectStartDate, createdBy]
        );
        
        // Get created milestones
        const [createdMilestones] = await db.execute(`
            SELECT cm.*, mt.milestone_name as template_name
            FROM case_milestones cm
            LEFT JOIN milestone_templates mt ON cm.milestone_template_id = mt.id
            WHERE cm.case_id = ?
            ORDER BY cm.sequence_order
        `, [caseId]);
        
        res.json({
            success: true,
            message: `Created ${createdMilestones.length} milestones for case ${caseNumber}`,
            data: createdMilestones
        });
        
    } catch (error) {
        console.error('Error creating milestones from template:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating milestones from template',
            error: error.message
        });
    }
};

// Get milestones for a specific case
exports.getCaseMilestones = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        const [milestones] = await db.execute(`
            SELECT 
                cm.*,
                u1.full_name as assigned_to_name,
                u2.full_name as created_by_name,
                u3.full_name as updated_by_name,
                mt.milestone_name as template_name
            FROM case_milestones cm
            JOIN cases c ON cm.case_id = c.id
            LEFT JOIN users u1 ON cm.assigned_to = u1.id
            LEFT JOIN users u2 ON cm.created_by = u2.id
            LEFT JOIN users u3 ON cm.updated_by = u3.id
            LEFT JOIN milestone_templates mt ON cm.milestone_template_id = mt.id
            WHERE c.case_number = ?
            ORDER BY cm.sequence_order
        `, [caseNumber]);
        
        // Get overall project progress
        const totalMilestones = milestones.length;
        const completedMilestones = milestones.filter(m => m.status === 'completed').length;
        const overallProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
        
        // Calculate critical path status
        const criticalPathMilestones = milestones.filter(m => m.is_critical_path);
        const criticalPathCompleted = criticalPathMilestones.filter(m => m.status === 'completed').length;
        const criticalPathProgress = criticalPathMilestones.length > 0 ? 
            (criticalPathCompleted / criticalPathMilestones.length) * 100 : 0;
        
        res.json({
            success: true,
            data: {
                milestones,
                project_summary: {
                    total_milestones: totalMilestones,
                    completed_milestones: completedMilestones,
                    overall_progress: Math.round(overallProgress),
                    critical_path_progress: Math.round(criticalPathProgress),
                    critical_path_milestones: criticalPathMilestones.length
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching case milestones:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching case milestones',
            error: error.message
        });
    }
};

// Update milestone details
exports.updateMilestone = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { 
            milestone_name, status, assigned_to, planned_start_date, 
            planned_end_date, actual_start_date, actual_end_date,
            deliverables, success_criteria, estimated_hours, estimated_cost 
        } = req.body;
        const updatedBy = req.user?.id || 1;
        
        const updateFields = [];
        const updateValues = [];
        
        if (milestone_name !== undefined) {
            updateFields.push('milestone_name = ?');
            updateValues.push(milestone_name);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        if (assigned_to !== undefined) {
            updateFields.push('assigned_to = ?');
            updateValues.push(assigned_to);
        }
        if (planned_start_date !== undefined) {
            updateFields.push('planned_start_date = ?');
            updateValues.push(planned_start_date);
        }
        if (planned_end_date !== undefined) {
            updateFields.push('planned_end_date = ?');
            updateValues.push(planned_end_date);
        }
        if (actual_start_date !== undefined) {
            updateFields.push('actual_start_date = ?');
            updateValues.push(actual_start_date);
        }
        if (actual_end_date !== undefined) {
            updateFields.push('actual_end_date = ?');
            updateValues.push(actual_end_date);
        }
        if (deliverables !== undefined) {
            updateFields.push('deliverables = ?');
            updateValues.push(deliverables);
        }
        if (success_criteria !== undefined) {
            updateFields.push('success_criteria = ?');
            updateValues.push(success_criteria);
        }
        if (estimated_hours !== undefined) {
            updateFields.push('estimated_hours = ?');
            updateValues.push(estimated_hours);
        }
        if (estimated_cost !== undefined) {
            updateFields.push('estimated_cost = ?');
            updateValues.push(estimated_cost);
        }
        
        updateFields.push('updated_by = ?');
        updateValues.push(updatedBy);
        
        updateValues.push(milestoneId);
        
        await db.execute(`
            UPDATE case_milestones 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);
        
        // Log the update activity
        await db.execute(`
            INSERT INTO milestone_activities (
                milestone_id, activity_type, activity_description, 
                performed_by, client_visible
            ) VALUES (?, 'status_change', ?, ?, ?)
        `, [
            milestoneId,
            `Milestone updated: ${Object.keys(req.body).join(', ')}`,
            updatedBy,
            false
        ]);
        
        res.json({
            success: true,
            message: 'Milestone updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating milestone:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating milestone',
            error: error.message
        });
    }
};

// Add milestone activity
exports.addMilestoneActivity = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { 
            activity_type, activity_description, progress_percentage,
            attachment_path, client_visible 
        } = req.body;
        const performedBy = req.user?.id || 1;
        
        await db.execute(`
            INSERT INTO milestone_activities (
                milestone_id, activity_type, activity_description,
                progress_percentage, attachment_path, client_visible,
                performed_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            milestoneId, activity_type, activity_description,
            progress_percentage, attachment_path, client_visible || false,
            performedBy
        ]);
        
        res.json({
            success: true,
            message: 'Milestone activity added successfully'
        });
        
    } catch (error) {
        console.error('Error adding milestone activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding milestone activity',
            error: error.message
        });
    }
};

// Get milestone activities
exports.getMilestoneActivities = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { client_view } = req.query;
        
        let whereClause = 'WHERE ma.milestone_id = ?';
        const params = [milestoneId];
        
        if (client_view === 'true') {
            whereClause += ' AND ma.client_visible = TRUE';
        }
        
        const [activities] = await db.execute(`
            SELECT 
                ma.*,
                u.full_name as performed_by_name
            FROM milestone_activities ma
            LEFT JOIN users u ON ma.performed_by = u.id
            ${whereClause}
            ORDER BY ma.created_at DESC
        `, params);
        
        res.json({
            success: true,
            data: activities
        });
        
    } catch (error) {
        console.error('Error fetching milestone activities:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching milestone activities',
            error: error.message
        });
    }
};

// Update milestone progress
exports.updateMilestoneProgress = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { progress_percentage, actual_hours, notes } = req.body;
        const updatedBy = req.user?.id || 1;
        
        // Update milestone progress
        await db.execute(`
            UPDATE case_milestones 
            SET progress_percentage = ?, actual_hours = ?, updated_by = ?
            WHERE id = ?
        `, [progress_percentage, actual_hours, updatedBy, milestoneId]);
        
        // Log progress update
        await db.execute(`
            INSERT INTO milestone_activities (
                milestone_id, activity_type, activity_description,
                progress_percentage, performed_by, client_visible
            ) VALUES (?, 'progress_update', ?, ?, ?, ?)
        `, [
            milestoneId,
            notes || `Progress updated to ${progress_percentage}%`,
            progress_percentage,
            updatedBy,
            true
        ]);
        
        res.json({
            success: true,
            message: 'Milestone progress updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating milestone progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating milestone progress',
            error: error.message
        });
    }
};

// Approve milestone (for client approval milestones)
exports.approveMilestone = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { approval_notes } = req.body;
        const approvedBy = req.user?.id || 1;
        
        // Update milestone approval status
        await db.execute(`
            UPDATE case_milestones 
            SET client_approval_received = TRUE, 
                status = 'completed',
                actual_end_date = CURRENT_DATE,
                progress_percentage = 100.00,
                completion_notes = ?,
                updated_by = ?
            WHERE id = ?
        `, [approval_notes, approvedBy, milestoneId]);
        
        // Log approval activity
        await db.execute(`
            INSERT INTO milestone_activities (
                milestone_id, activity_type, activity_description,
                performed_by, client_visible
            ) VALUES (?, 'approval_given', ?, ?, ?)
        `, [
            milestoneId,
            approval_notes || 'Milestone approved',
            approvedBy,
            true
        ]);
        
        res.json({
            success: true,
            message: 'Milestone approved successfully'
        });
        
    } catch (error) {
        console.error('Error approving milestone:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving milestone',
            error: error.message
        });
    }
};

// Get milestone analytics
exports.getMilestoneAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const [
            overallStats,
            progressStats,
            typeStats,
            delayStats
        ] = await Promise.all([
            // Overall milestone statistics
            db.execute(`
                SELECT 
                    COUNT(*) as total_milestones,
                    SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
                    SUM(CASE WHEN cm.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_milestones,
                    SUM(CASE WHEN cm.status = 'blocked' THEN 1 ELSE 0 END) as blocked_milestones,
                    AVG(cm.progress_percentage) as avg_progress
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [days]),
            
            // Progress distribution
            db.execute(`
                SELECT 
                    CASE 
                        WHEN cm.progress_percentage = 0 THEN 'Not Started'
                        WHEN cm.progress_percentage <= 25 THEN '1-25%'
                        WHEN cm.progress_percentage <= 50 THEN '26-50%'
                        WHEN cm.progress_percentage <= 75 THEN '51-75%'
                        WHEN cm.progress_percentage <= 99 THEN '76-99%'
                        ELSE 'Completed'
                    END as progress_range,
                    COUNT(*) as milestone_count
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY progress_range
            `, [days]),
            
            // Milestone type distribution
            db.execute(`
                SELECT 
                    cm.milestone_type,
                    COUNT(*) as count,
                    AVG(DATEDIFF(cm.actual_end_date, cm.actual_start_date)) as avg_duration_days
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND cm.actual_start_date IS NOT NULL
                GROUP BY cm.milestone_type
                ORDER BY count DESC
            `, [days]),
            
            // Delay analysis
            db.execute(`
                SELECT 
                    COUNT(*) as delayed_milestones,
                    AVG(DATEDIFF(cm.actual_end_date, cm.planned_end_date)) as avg_delay_days
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND cm.actual_end_date > cm.planned_end_date
            `, [days])
        ]);
        
        res.json({
            success: true,
            data: {
                overall_stats: overallStats[0] || {},
                progress_distribution: progressStats,
                milestone_types: typeStats,
                delay_analysis: delayStats[0] || { delayed_milestones: 0, avg_delay_days: 0 }
            }
        });
        
    } catch (error) {
        console.error('Error fetching milestone analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching milestone analytics',
            error: error.message
        });
    }
};

// Get workflow progress for a case
exports.getWorkflowProgress = async (req, res) => {
    try {
        const { caseId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user has access to this case
        const caseAccess = await checkCaseAccess(caseId, userId, userRole);
        if (!caseAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this case'
            });
        }

        // Get case details
        const [caseRows] = await db.query(`
            SELECT c.*, 
                   u1.full_name as created_by_name,
                   u2.full_name as assigned_to_name
            FROM cases c
            LEFT JOIN users u1 ON c.created_by = u1.id
            LEFT JOIN users u2 ON c.assigned_to = u2.id
            WHERE c.id = ?
        `, [caseId]);

        if (caseRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        const caseData = caseRows[0];

        // Define workflow stages with their linking strategies
        const workflowStages = [
            { 
                code: 'EQ', 
                name: 'Enquiry', 
                table: 'sales_enquiries', 
                id_field: 'enquiry_id', 
                date_field: 'date', 
                amount_field: null,
                link_field: 'id',
                link_value: 'enquiry_id'  // cases.enquiry_id = sales_enquiries.id
            },
            { 
                code: 'ET', 
                name: 'Estimation', 
                table: 'estimations', 
                id_field: 'estimation_id', 
                date_field: 'date', 
                amount_field: 'total_final_price',
                link_field: 'case_id',
                link_value: null  // direct case_id match
            },
            { 
                code: 'Q', 
                name: 'Quotation', 
                table: 'quotations', 
                id_field: 'quotation_id', 
                date_field: 'date', 
                amount_field: 'grand_total',
                link_field: 'case_id',
                link_value: null  // direct case_id match
            },
            { 
                code: 'SO', 
                name: 'Sales Order', 
                table: 'sales_orders', 
                id_field: 'sales_order_id', 
                date_field: 'date', 
                amount_field: 'total_amount',
                link_field: 'quotation_id',
                link_value: 'quotation_id'  // join through quotations
            },
            { 
                code: 'PR', 
                name: 'Purchase Request', 
                table: 'purchase_requests', 
                id_field: 'request_id', 
                date_field: 'date', 
                amount_field: null,  // No amount field
                link_field: 'quotation_id',
                link_value: 'quotation_id'  // join through quotations
            },
            { 
                code: 'PO', 
                name: 'Purchase Order', 
                table: 'purchase_orders', 
                id_field: 'po_id', 
                date_field: 'date', 
                amount_field: 'grand_total',
                link_field: 'purchase_request_id',
                link_value: 'purchase_request_id'  // join through purchase_requests
            },
            // { 
            //     code: 'PI', 
            //     name: 'Purchase Invoice', 
            //     table: 'purchase_invoices', 
            //     id_field: 'purchase_invoice_id', 
            //     date_field: 'created_at', 
            //     amount_field: 'total_amount',
            //     link_field: 'case_id',
            //     link_value: null  // direct case_id match
            // },
            // { 
            //     code: 'GRN', 
            //     name: 'Goods Receipt Note', 
            //     table: 'goods_receipt_notes', 
            //     id_field: 'grn_id', 
            //     date_field: 'created_at', 
            //     amount_field: 'total_amount',
            //     link_field: 'case_id',
            //     link_value: null  // direct case_id match
            // },
            { 
                code: 'I', 
                name: 'Invoice', 
                table: 'invoices', 
                id_field: 'invoice_number', 
                date_field: 'invoice_date', 
                amount_field: 'total_amount',
                link_field: 'reference_id',
                link_value: 'sales_order_id'  // join through sales_orders
            },
            { 
                code: 'GRN', 
                name: 'Goods Receipt Note', 
                table: 'goods_received_notes', 
                id_field: 'grn_number', 
                date_field: 'grn_date', 
                amount_field: 'total_amount',
                link_field: 'purchase_order_id',
                link_value: 'purchase_order_id'  // join through purchase_orders
            },
            { 
                code: 'DC', 
                name: 'Delivery Challan', 
                table: 'delivery_challans', 
                id_field: 'dc_number', 
                date_field: 'dc_date', 
                amount_field: null,  // No direct amount field
                link_field: 'sales_order_id',
                link_value: 'sales_order_id'  // join through sales_orders
            }
        ];

        // Get progress for each stage
        const progress = [];
        let currentStageIndex = -1;

        for (let i = 0; i < workflowStages.length; i++) {
            const stage = workflowStages[i];
            let amountSelect;
            if (stage.amount_field) {
                if (stage.code === 'SO') {
                    amountSelect = `so.${stage.amount_field} as amount_value,`;
                } else {
                    amountSelect = `${stage.amount_field} as amount_value,`;
                }
            } else {
                amountSelect = 'NULL as amount_value,';
            }
            
            let query;
            let params = [caseId];

            if (stage.link_value) {
                // Need to join through another table
                if (stage.code === 'EQ') {
                    // Special case: sales_enquiries links via enquiry_id
                    query = `
                        SELECT se.${stage.id_field}, se.${stage.date_field}, 
                               COALESCE(se.status, 'pending') as status,
                               NULL as amount_value, '' as notes
                        FROM ${stage.table} se
                        JOIN cases c ON c.enquiry_id = se.id
                        WHERE c.id = ?
                        ORDER BY se.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'SO') {
                    // Sales orders link through quotations
                    query = `
                        SELECT so.${stage.id_field}, so.${stage.date_field}, 
                               COALESCE(so.status, 'pending') as status,
                               so.${stage.amount_field} as amount_value, '' as notes
                        FROM ${stage.table} so
                        JOIN quotations q ON so.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY so.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'PR') {
                    // Purchase requests link through quotations
                    query = `
                        SELECT pr.${stage.id_field}, pr.${stage.date_field}, 
                               COALESCE(pr.status, 'pending') as status,
                               NULL as amount_value, '' as notes
                        FROM ${stage.table} pr
                        JOIN quotations q ON pr.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY pr.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'PO') {
                    // Purchase orders link through purchase_requests and quotations
                    query = `
                        SELECT po.${stage.id_field}, po.${stage.date_field}, 
                               COALESCE(po.status, 'pending') as status,
                               po.${stage.amount_field} as amount_value, '' as notes
                        FROM ${stage.table} po
                        JOIN purchase_requests pr ON po.purchase_request_id = pr.id
                        JOIN quotations q ON pr.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY po.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'I') {
                    // Invoices link through sales_orders
                    query = `
                        SELECT i.${stage.id_field}, i.${stage.date_field}, 
                               COALESCE(i.status, 'pending') as status,
                               i.${stage.amount_field} as amount_value, '' as notes
                        FROM ${stage.table} i
                        JOIN sales_orders so ON i.reference_id = so.id AND i.reference_type = 'sales_order'
                        JOIN quotations q ON so.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY i.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'GRN') {
                    // Goods receipt notes link through purchase_orders
                    query = `
                        SELECT grn.${stage.id_field}, grn.${stage.date_field}, 
                               COALESCE(grn.status, 'pending') as status,
                               grn.${stage.amount_field} as amount_value, '' as notes
                        FROM ${stage.table} grn
                        JOIN purchase_orders po ON grn.purchase_order_id = po.id
                        JOIN purchase_requests pr ON po.purchase_request_id = pr.id
                        JOIN quotations q ON pr.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY grn.${stage.date_field} DESC
                        LIMIT 1
                    `;
                } else if (stage.code === 'DC') {
                    // Delivery challans link through sales_orders
                    query = `
                        SELECT dc.${stage.id_field}, dc.${stage.date_field}, 
                               COALESCE(dc.status, 'pending') as status,
                               NULL as amount_value, '' as notes
                        FROM ${stage.table} dc
                        JOIN sales_orders so ON dc.sales_order_id = so.id
                        JOIN quotations q ON so.quotation_id = q.id
                        WHERE q.case_id = ?
                        ORDER BY dc.${stage.date_field} DESC
                        LIMIT 1
                    `;
                }
            } else {
                // Direct case_id match
                query = `
                    SELECT ${stage.id_field}, ${stage.date_field}, 
                           COALESCE(status, 'pending') as status,
                           ${amountSelect} '' as notes
                    FROM ${stage.table}
                    WHERE case_id = ?
                    ORDER BY ${stage.date_field} DESC
                    LIMIT 1
                `;
            }

            let stageData = null;
            try {
                const [stageRows] = await db.query(query, params);
                stageData = stageRows.length > 0 ? stageRows[0] : null;
            } catch (dbError) {
                console.warn(`Database error querying ${stage.table} for stage ${stage.code}:`, dbError.message);
                // Continue with stageData = null (stage not completed)
            }

            const stageProgress = {
                code: stage.code,
                name: stage.name,
                completed: !!stageData,
                data: stageData ? {
                    id: stageData[stage.id_field],
                    date: stageData[stage.date_field],
                    status: stageData.status,
                    amount: stageData.amount_value,
                    notes: stageData.notes
                } : null
            };

            progress.push(stageProgress);

            // Track current stage (first incomplete stage)
            if (!stageData && currentStageIndex === -1) {
                currentStageIndex = i;
            }
        }

        // If all stages are complete, current stage is the last one
        if (currentStageIndex === -1) {
            currentStageIndex = workflowStages.length - 1;
        }

        res.json({
            success: true,
            data: {
                case: {
                    id: caseData.id,
                    case_number: caseData.case_number,
                    title: caseData.title,
                    status: caseData.status,
                    priority: caseData.priority,
                    created_by: caseData.created_by_name,
                    assigned_to: caseData.assigned_to_name,
                    created_at: caseData.created_at,
                    updated_at: caseData.updated_at
                },
                workflow: {
                    stages: progress,
                    current_stage: workflowStages[currentStageIndex].code,
                    current_stage_name: workflowStages[currentStageIndex].name,
                    progress_percentage: Math.round(((currentStageIndex + (progress[currentStageIndex]?.completed ? 1 : 0)) / workflowStages.length) * 100)
                }
            }
        });

    } catch (error) {
        console.error('Error getting workflow progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get workflow progress',
            error: error.message
        });
    }
};
