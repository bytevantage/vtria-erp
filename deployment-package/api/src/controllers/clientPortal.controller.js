const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ============ AUTHENTICATION METHODS ============

// Client portal login
exports.clientPortalLogin = async (req, res) => {
    try {
        const { email, password, access_token } = req.body;
        
        let client;
        
        if (access_token) {
            // Login with access token (for initial setup)
            const [clients] = await db.execute(
                'SELECT * FROM client_portal_access WHERE access_token = ? AND is_active = TRUE',
                [access_token]
            );
            
            if (clients.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid access token'
                });
            }
            
            client = clients[0];
            
        } else if (email && password) {
            // Login with email and password
            const [clients] = await db.execute(
                'SELECT * FROM client_portal_access WHERE portal_user_email = ? AND is_active = TRUE',
                [email]
            );
            
            if (clients.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            client = clients[0];
            
            if (!client.portal_password_hash) {
                return res.status(401).json({
                    success: false,
                    message: 'Password not set. Please use access token for first login.'
                });
            }
            
            const isValidPassword = await bcrypt.compare(password, client.portal_password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide either access token or email/password'
            });
        }
        
        // Update login tracking
        await db.execute(
            'UPDATE client_portal_access SET last_login_at = NOW(), login_count = login_count + 1 WHERE id = ?',
            [client.id]
        );
        
        // Generate JWT token
        const token = jwt.sign(
            {
                clientPortalUserId: client.id,
                clientId: client.client_id,
                email: client.portal_user_email
            },
            process.env.JWT_SECRET || 'vtria_client_portal_secret',
            { expiresIn: '7d' }
        );
        
        // Get client details
        const [clientDetails] = await db.execute(
            'SELECT c.* FROM clients c WHERE c.id = ?',
            [client.client_id]
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                client_portal_user: {
                    id: client.id,
                    name: client.portal_user_name,
                    email: client.portal_user_email,
                    access_level: client.access_level,
                    permissions: {
                        can_approve_milestones: client.can_approve_milestones,
                        can_add_comments: client.can_add_comments,
                        can_upload_files: client.can_upload_files,
                        can_view_costs: client.can_view_costs
                    }
                },
                client: clientDetails[0] || null
            }
        });
        
    } catch (error) {
        console.error('Error in client portal login:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Register client portal user (set password on first login)
exports.registerClientPortalUser = async (req, res) => {
    try {
        const { access_token, password, confirm_password } = req.body;
        
        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        // Find client by access token
        const [clients] = await db.execute(
            'SELECT * FROM client_portal_access WHERE access_token = ? AND is_active = TRUE',
            [access_token]
        );
        
        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid access token'
            });
        }
        
        const client = clients[0];
        
        if (client.portal_password_hash) {
            return res.status(400).json({
                success: false,
                message: 'Password already set for this account'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Update client with password
        await db.execute(
            'UPDATE client_portal_access SET portal_password_hash = ? WHERE id = ?',
            [hashedPassword, client.id]
        );
        
        res.json({
            success: true,
            message: 'Password set successfully. You can now login with your email and password.'
        });
        
    } catch (error) {
        console.error('Error registering client portal user:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Verify token
exports.verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vtria_client_portal_secret');
        
        // Get current client data
        const [clients] = await db.execute(
            'SELECT cpa.*, c.company_name FROM client_portal_access cpa JOIN clients c ON cpa.client_id = c.id WHERE cpa.id = ? AND cpa.is_active = TRUE',
            [decoded.clientPortalUserId]
        );
        
        if (clients.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        res.json({
            success: true,
            data: {
                clientPortalUserId: decoded.clientPortalUserId,
                clientId: decoded.clientId,
                client: clients[0]
            }
        });
        
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: error.message
        });
    }
};

// ============ DASHBOARD AND OVERVIEW METHODS ============

// Get client dashboard data
exports.getClientDashboard = async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const [
            casesSummary,
            milestonesSummary,
            recentActivities,
            upcomingMilestones,
            pendingApprovals
        ] = await Promise.all([
            // Cases summary
            db.execute(`
                SELECT 
                    COUNT(*) as total_cases,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_cases,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_cases,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_cases
                FROM cases 
                WHERE client_id = ?
            `, [clientId]),
            
            // Milestones summary
            db.execute(`
                SELECT 
                    COUNT(*) as total_milestones,
                    SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
                    SUM(CASE WHEN cm.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_milestones,
                    SUM(CASE WHEN cm.status = 'not_started' THEN 1 ELSE 0 END) as not_started_milestones,
                    AVG(cm.progress_percentage) as avg_progress
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.client_id = ?
            `, [clientId]),
            
            // Recent activities
            db.execute(`
                SELECT 
                    ma.activity_type,
                    ma.activity_description,
                    ma.created_at,
                    cm.milestone_name,
                    c.case_number
                FROM milestone_activities ma
                JOIN case_milestones cm ON ma.milestone_id = cm.id
                JOIN cases c ON cm.case_id = c.id
                WHERE c.client_id = ? 
                AND ma.client_visible = TRUE
                ORDER BY ma.created_at DESC
                LIMIT 10
            `, [clientId]),
            
            // Upcoming milestones
            db.execute(`
                SELECT 
                    cm.*,
                    c.case_number,
                    c.project_name
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.client_id = ?
                AND cm.status IN ('not_started', 'in_progress')
                AND cm.planned_end_date >= CURDATE()
                ORDER BY cm.planned_end_date ASC
                LIMIT 5
            `, [clientId]),
            
            // Pending approvals
            db.execute(`
                SELECT 
                    cm.*,
                    c.case_number,
                    c.project_name
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.client_id = ?
                AND cm.requires_client_approval = TRUE
                AND cm.client_approval_received = FALSE
                AND cm.status = 'completed'
                ORDER BY cm.actual_end_date DESC
            `, [clientId])
        ]);
        
        res.json({
            success: true,
            data: {
                cases_summary: casesSummary[0] || {},
                milestones_summary: milestonesSummary[0] || {},
                recent_activities: recentActivities,
                upcoming_milestones: upcomingMilestones,
                pending_approvals: pendingApprovals
            }
        });
        
    } catch (error) {
        console.error('Error fetching client dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
};

// Get client cases
exports.getClientCases = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { status, limit = 20, offset = 0 } = req.query;
        
        let whereClause = 'WHERE c.client_id = ?';
        const params = [clientId];
        
        if (status) {
            whereClause += ' AND c.status = ?';
            params.push(status);
        }
        
        const [cases] = await db.execute(`
            SELECT 
                c.*,
                cl.company_name,
                COUNT(cm.id) as total_milestones,
                SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
                AVG(cm.progress_percentage) as overall_progress,
                MAX(cm.updated_at) as last_milestone_update
            FROM cases c
            JOIN clients cl ON c.client_id = cl.id
            LEFT JOIN case_milestones cm ON c.id = cm.case_id
            ${whereClause}
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `, params);
        
        res.json({
            success: true,
            data: cases
        });
        
    } catch (error) {
        console.error('Error fetching client cases:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cases',
            error: error.message
        });
    }
};

// Get case details for client portal
exports.getCaseDetails = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        const [cases] = await db.execute(`
            SELECT 
                c.*,
                cl.company_name,
                cl.contact_person,
                cl.email as client_email,
                cl.phone as client_phone
            FROM cases c
            JOIN clients cl ON c.client_id = cl.id
            WHERE c.case_number = ?
        `, [caseNumber]);
        
        if (cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const caseData = cases[0];
        
        // Get milestones for this case
        const [milestones] = await db.execute(`
            SELECT 
                cm.*,
                COUNT(ma.id) as activity_count,
                MAX(ma.created_at) as last_activity
            FROM case_milestones cm
            LEFT JOIN milestone_activities ma ON cm.id = ma.milestone_id AND ma.client_visible = TRUE
            WHERE cm.case_id = ?
            GROUP BY cm.id
            ORDER BY cm.sequence_order
        `, [caseData.id]);
        
        // Get recent communications
        const [communications] = await db.execute(`
            SELECT 
                cc.*,
                u.full_name as internal_user_name
            FROM client_communications cc
            LEFT JOIN users u ON cc.internal_user_id = u.id
            WHERE cc.case_id = ? 
            AND cc.visible_to_client = TRUE
            ORDER BY cc.created_at DESC
            LIMIT 5
        `, [caseData.id]);
        
        res.json({
            success: true,
            data: {
                case: caseData,
                milestones,
                recent_communications: communications
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

// ============ MILESTONE TRACKING METHODS ============

// Get case milestones for client portal
exports.getCaseMilestones = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        // Get case ID
        const [cases] = await db.execute(
            'SELECT id, client_id FROM cases WHERE case_number = ?',
            [caseNumber]
        );
        
        if (cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        const caseId = cases[0].id;
        
        const [milestones] = await db.execute(`
            SELECT 
                cm.*,
                COUNT(ma.id) as activity_count,
                MAX(ma.created_at) as last_activity_date,
                CASE 
                    WHEN cm.planned_end_date < CURDATE() AND cm.status != 'completed' THEN TRUE
                    ELSE FALSE
                END as is_overdue
            FROM case_milestones cm
            LEFT JOIN milestone_activities ma ON cm.id = ma.milestone_id AND ma.client_visible = TRUE
            WHERE cm.case_id = ?
            GROUP BY cm.id
            ORDER BY cm.sequence_order
        `, [caseId]);
        
        // Calculate project statistics
        const totalMilestones = milestones.length;
        const completedMilestones = milestones.filter(m => m.status === 'completed').length;
        const overdueMilestones = milestones.filter(m => m.is_overdue).length;
        const overallProgress = totalMilestones > 0 ? 
            milestones.reduce((sum, m) => sum + parseFloat(m.progress_percentage), 0) / totalMilestones : 0;
        
        res.json({
            success: true,
            data: {
                milestones,
                project_stats: {
                    total_milestones: totalMilestones,
                    completed_milestones: completedMilestones,
                    overdue_milestones: overdueMilestones,
                    overall_progress: Math.round(overallProgress),
                    next_milestone: milestones.find(m => m.status === 'in_progress') || 
                                   milestones.find(m => m.status === 'not_started')
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching case milestones:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching milestones',
            error: error.message
        });
    }
};

// Get milestone details
exports.getMilestoneDetails = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        
        const [milestones] = await db.execute(`
            SELECT 
                cm.*,
                c.case_number,
                c.project_name,
                c.client_id
            FROM case_milestones cm
            JOIN cases c ON cm.case_id = c.id
            WHERE cm.id = ?
        `, [milestoneId]);
        
        if (milestones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found'
            });
        }
        
        const milestone = milestones[0];
        
        // Get milestone activities
        const [activities] = await db.execute(`
            SELECT 
                ma.*,
                u.full_name as performed_by_name
            FROM milestone_activities ma
            LEFT JOIN users u ON ma.performed_by = u.id
            WHERE ma.milestone_id = ? 
            AND ma.client_visible = TRUE
            ORDER BY ma.created_at DESC
        `, [milestoneId]);
        
        res.json({
            success: true,
            data: {
                milestone,
                activities
            }
        });
        
    } catch (error) {
        console.error('Error fetching milestone details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching milestone details',
            error: error.message
        });
    }
};

// Approve milestone
exports.approveMilestone = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        const { approval_notes, client_portal_user_id } = req.body;
        
        // Verify milestone exists and requires approval
        const [milestones] = await db.execute(`
            SELECT cm.*, c.client_id
            FROM case_milestones cm
            JOIN cases c ON cm.case_id = c.id
            WHERE cm.id = ? 
            AND cm.requires_client_approval = TRUE
            AND cm.client_approval_received = FALSE
        `, [milestoneId]);
        
        if (milestones.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Milestone not found or approval not required'
            });
        }
        
        // Update milestone approval
        await db.execute(`
            UPDATE case_milestones 
            SET client_approval_received = TRUE,
                completion_notes = ?,
                updated_at = NOW()
            WHERE id = ?
        `, [approval_notes, milestoneId]);
        
        // Log approval activity
        await db.execute(`
            INSERT INTO milestone_activities (
                milestone_id, activity_type, activity_description,
                performed_by, client_visible
            ) VALUES (?, 'approval_given', ?, ?, TRUE)
        `, [
            milestoneId,
            approval_notes || 'Milestone approved by client',
            client_portal_user_id
        ]);
        
        // Create communication record
        await db.execute(`
            INSERT INTO client_communications (
                case_id, milestone_id, client_portal_user_id,
                communication_type, subject, message, is_from_client,
                visible_to_client
            ) VALUES (?, ?, ?, 'approval_response', ?, ?, TRUE, TRUE)
        `, [
            milestones[0].case_id,
            milestoneId,
            client_portal_user_id,
            `Milestone Approved: ${milestones[0].milestone_name}`,
            approval_notes || 'Milestone approved by client'
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

// ============ COMMUNICATIONS METHODS ============

// Get communications for a case
exports.getCommunications = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        const { limit = 50, offset = 0 } = req.query;
        
        // Get case ID
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
        
        const [communications] = await db.execute(`
            SELECT 
                cc.*,
                cpa.portal_user_name as client_user_name,
                u.full_name as internal_user_name,
                cm.milestone_name,
                parent.subject as parent_subject
            FROM client_communications cc
            LEFT JOIN client_portal_access cpa ON cc.client_portal_user_id = cpa.id
            LEFT JOIN users u ON cc.internal_user_id = u.id
            LEFT JOIN case_milestones cm ON cc.milestone_id = cm.id
            LEFT JOIN client_communications parent ON cc.parent_communication_id = parent.id
            WHERE cc.case_id = ? 
            AND cc.visible_to_client = TRUE
            ORDER BY cc.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `, [cases[0].id]);
        
        res.json({
            success: true,
            data: communications
        });
        
    } catch (error) {
        console.error('Error fetching communications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching communications',
            error: error.message
        });
    }
};

// Send message
exports.sendMessage = async (req, res) => {
    try {
        const { 
            case_id, milestone_id, client_portal_user_id, subject, 
            message, communication_type, requires_response 
        } = req.body;
        
        const [result] = await db.execute(`
            INSERT INTO client_communications (
                case_id, milestone_id, client_portal_user_id,
                communication_type, subject, message, is_from_client,
                requires_response, visible_to_client
            ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, TRUE)
        `, [
            case_id, milestone_id, client_portal_user_id,
            communication_type || 'comment', subject, message,
            requires_response || false
        ]);
        
        res.json({
            success: true,
            message: 'Message sent successfully',
            data: { communication_id: result.insertId }
        });
        
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending message',
            error: error.message
        });
    }
};

// ============ NOTIFICATIONS METHODS ============

// Get notifications
exports.getNotifications = async (req, res) => {
    try {
        const { clientPortalUserId } = req.params;
        const { limit = 20, unread_only = false } = req.query;
        
        let whereClause = 'WHERE cpn.client_portal_user_id = ?';
        const params = [clientPortalUserId];
        
        if (unread_only === 'true') {
            whereClause += ' AND cpn.is_read = FALSE';
        }
        
        const [notifications] = await db.execute(`
            SELECT 
                cpn.*,
                c.case_number,
                cm.milestone_name
            FROM client_portal_notifications cpn
            LEFT JOIN cases c ON cpn.case_id = c.id
            LEFT JOIN case_milestones cm ON cpn.milestone_id = cm.id
            ${whereClause}
            ORDER BY cpn.created_at DESC
            LIMIT ${parseInt(limit)}
        `, params);
        
        res.json({
            success: true,
            data: notifications
        });
        
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notifications',
            error: error.message
        });
    }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        await db.execute(
            'UPDATE client_portal_notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
            [notificationId]
        );
        
        res.json({
            success: true,
            message: 'Notification marked as read'
        });
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notification',
            error: error.message
        });
    }
};

// Get live progress updates
exports.getLiveProgress = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        // Get case ID
        const [cases] = await db.execute(
            'SELECT id, client_id FROM cases WHERE case_number = ?',
            [caseNumber]
        );
        
        if (cases.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }
        
        // Get current milestone statuses and recent updates
        const [liveData] = await db.execute(`
            SELECT 
                cm.id,
                cm.milestone_name,
                cm.status,
                cm.progress_percentage,
                cm.planned_end_date,
                cm.actual_end_date,
                cm.is_critical_path,
                CASE 
                    WHEN cm.planned_end_date < CURDATE() AND cm.status != 'completed' THEN TRUE
                    ELSE FALSE
                END as is_overdue,
                ma.activity_description as latest_update,
                ma.created_at as latest_update_time
            FROM case_milestones cm
            LEFT JOIN (
                SELECT 
                    milestone_id,
                    activity_description,
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY milestone_id ORDER BY created_at DESC) as rn
                FROM milestone_activities 
                WHERE client_visible = TRUE
            ) ma ON cm.id = ma.milestone_id AND ma.rn = 1
            WHERE cm.case_id = ?
            ORDER BY cm.sequence_order
        `, [cases[0].id]);
        
        // Calculate real-time stats
        const totalMilestones = liveData.length;
        const completedMilestones = liveData.filter(m => m.status === 'completed').length;
        const inProgressMilestones = liveData.filter(m => m.status === 'in_progress').length;
        const overdueMilestones = liveData.filter(m => m.is_overdue).length;
        const overallProgress = totalMilestones > 0 ? 
            liveData.reduce((sum, m) => sum + parseFloat(m.progress_percentage), 0) / totalMilestones : 0;
        
        res.json({
            success: true,
            data: {
                case_number: caseNumber,
                last_updated: new Date().toISOString(),
                milestones: liveData,
                live_stats: {
                    total_milestones: totalMilestones,
                    completed_milestones: completedMilestones,
                    in_progress_milestones: inProgressMilestones,
                    overdue_milestones: overdueMilestones,
                    overall_progress: Math.round(overallProgress * 100) / 100,
                    completion_percentage: Math.round((completedMilestones / totalMilestones) * 100)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching live progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching live progress',
            error: error.message
        });
    }
};

// Get case timeline for client portal
exports.getCaseTimeline = async (req, res) => {
    try {
        const { caseNumber } = req.params;
        
        // Get case ID
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
        
        // Get timeline events
        const [timelineEvents] = await db.execute(`
            SELECT 
                'milestone_activity' as event_type,
                ma.id as event_id,
                ma.activity_type,
                ma.activity_description as description,
                ma.created_at as event_date,
                cm.milestone_name as context,
                'milestone' as category,
                ma.progress_percentage
            FROM milestone_activities ma
            JOIN case_milestones cm ON ma.milestone_id = cm.id
            WHERE cm.case_id = ? 
            AND ma.client_visible = TRUE
            
            UNION ALL
            
            SELECT 
                'communication' as event_type,
                cc.id as event_id,
                cc.communication_type as activity_type,
                cc.message as description,
                cc.created_at as event_date,
                cc.subject as context,
                'communication' as category,
                NULL as progress_percentage
            FROM client_communications cc
            WHERE cc.case_id = ? 
            AND cc.visible_to_client = TRUE
            
            ORDER BY event_date DESC
            LIMIT 50
        `, [cases[0].id, cases[0].id]);
        
        res.json({
            success: true,
            data: timelineEvents
        });
        
    } catch (error) {
        console.error('Error fetching case timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching timeline',
            error: error.message
        });
    }
};

// ============ ADDITIONAL AUTHENTICATION METHODS ============

// Forgot password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        const [clients] = await db.execute(
            'SELECT * FROM client_portal_access WHERE portal_user_email = ? AND is_active = TRUE',
            [email]
        );
        
        if (clients.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await db.execute(
            'UPDATE client_portal_access SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
            [resetToken, tokenExpiry, clients[0].id]
        );
        
        // In a real implementation, send email with reset link
        // For now, just return the token (development only)
        res.json({
            success: true,
            message: 'Password reset token generated',
            reset_token: resetToken // Remove this in production
        });
        
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request',
            error: error.message
        });
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { reset_token, password, confirm_password } = req.body;
        
        if (password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }
        
        const [clients] = await db.execute(
            'SELECT * FROM client_portal_access WHERE password_reset_token = ? AND password_reset_expires > NOW() AND is_active = TRUE',
            [reset_token]
        );
        
        if (clients.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 12);
        
        await db.execute(
            'UPDATE client_portal_access SET portal_password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
            [hashedPassword, clients[0].id]
        );
        
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
};

// ============ ADDITIONAL COMMUNICATION METHODS ============

// Mark communication as read
exports.markAsRead = async (req, res) => {
    try {
        const { communicationId } = req.params;
        
        await db.execute(
            'UPDATE client_communications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
            [communicationId]
        );
        
        res.json({
            success: true,
            message: 'Message marked as read'
        });
        
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating message',
            error: error.message
        });
    }
};

// Reply to message
exports.replyToMessage = async (req, res) => {
    try {
        const { communicationId } = req.params;
        const { message, client_portal_user_id } = req.body;
        
        // Get original communication
        const [originalComm] = await db.execute(
            'SELECT * FROM client_communications WHERE id = ?',
            [communicationId]
        );
        
        if (originalComm.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Original message not found'
            });
        }
        
        const original = originalComm[0];
        
        // Create reply
        await db.execute(`
            INSERT INTO client_communications (
                case_id, milestone_id, client_portal_user_id,
                communication_type, subject, message, is_from_client,
                parent_communication_id, visible_to_client
            ) VALUES (?, ?, ?, 'comment', ?, ?, TRUE, ?, TRUE)
        `, [
            original.case_id,
            original.milestone_id,
            client_portal_user_id,
            `Re: ${original.subject}`,
            message,
            communicationId
        ]);
        
        res.json({
            success: true,
            message: 'Reply sent successfully'
        });
        
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reply',
            error: error.message
        });
    }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
    try {
        const { clientPortalUserId } = req.params;
        
        await db.execute(
            'UPDATE client_portal_notifications SET is_read = TRUE, read_at = NOW() WHERE client_portal_user_id = ? AND is_read = FALSE',
            [clientPortalUserId]
        );
        
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
        
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating notifications',
            error: error.message
        });
    }
};

// Get milestone activities
exports.getMilestoneActivities = async (req, res) => {
    try {
        const { milestoneId } = req.params;
        
        const [activities] = await db.execute(`
            SELECT 
                ma.*,
                u.full_name as performed_by_name
            FROM milestone_activities ma
            LEFT JOIN users u ON ma.performed_by = u.id
            WHERE ma.milestone_id = ? 
            AND ma.client_visible = TRUE
            ORDER BY ma.created_at DESC
        `, [milestoneId]);
        
        res.json({
            success: true,
            data: activities
        });
        
    } catch (error) {
        console.error('Error fetching milestone activities:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activities',
            error: error.message
        });
    }
};

// ============ ANALYTICS AND REPORTING METHODS ============

// Get client analytics
exports.getClientAnalytics = async (req, res) => {
    try {
        const { clientId } = req.params;
        const { days = 30 } = req.query;
        
        const [
            projectMetrics,
            milestoneMetrics,
            communicationMetrics
        ] = await Promise.all([
            // Project metrics
            db.execute(`
                SELECT 
                    COUNT(*) as total_projects,
                    AVG(DATEDIFF(COALESCE(c.completion_date, NOW()), c.created_at)) as avg_project_duration,
                    SUM(CASE WHEN c.status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
                    SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_projects
                FROM cases c
                WHERE c.client_id = ?
                AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [clientId, days]),
            
            // Milestone metrics
            db.execute(`
                SELECT 
                    COUNT(*) as total_milestones,
                    AVG(cm.progress_percentage) as avg_progress,
                    SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
                    SUM(CASE WHEN cm.planned_end_date < CURDATE() AND cm.status != 'completed' THEN 1 ELSE 0 END) as overdue_milestones
                FROM case_milestones cm
                JOIN cases c ON cm.case_id = c.id
                WHERE c.client_id = ?
                AND cm.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [clientId, days]),
            
            // Communication metrics
            db.execute(`
                SELECT 
                    COUNT(*) as total_communications,
                    SUM(CASE WHEN cc.is_from_client = TRUE THEN 1 ELSE 0 END) as client_messages,
                    SUM(CASE WHEN cc.requires_response = TRUE AND cc.is_resolved = FALSE THEN 1 ELSE 0 END) as pending_responses,
                    AVG(TIMESTAMPDIFF(HOUR, cc.created_at, cc.resolved_at)) as avg_response_time_hours
                FROM client_communications cc
                JOIN cases c ON cc.case_id = c.id
                WHERE c.client_id = ?
                AND cc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [clientId, days])
        ]);
        
        res.json({
            success: true,
            data: {
                period_days: parseInt(days),
                project_metrics: projectMetrics[0] || {},
                milestone_metrics: milestoneMetrics[0] || {},
                communication_metrics: communicationMetrics[0] || {}
            }
        });
        
    } catch (error) {
        console.error('Error fetching client analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
};

// Get project status report
exports.getProjectStatusReport = async (req, res) => {
    try {
        const { clientId } = req.params;
        
        const [projects] = await db.execute(`
            SELECT 
                c.case_number,
                c.project_name,
                c.status as case_status,
                c.priority,
                c.created_at,
                COUNT(cm.id) as total_milestones,
                SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
                AVG(cm.progress_percentage) as overall_progress,
                MIN(CASE WHEN cm.status != 'completed' THEN cm.planned_end_date END) as next_milestone_date,
                MAX(ma.created_at) as last_activity_date
            FROM cases c
            LEFT JOIN case_milestones cm ON c.id = cm.case_id
            LEFT JOIN milestone_activities ma ON cm.id = ma.milestone_id AND ma.client_visible = TRUE
            WHERE c.client_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [clientId]);
        
        res.json({
            success: true,
            data: {
                report_generated_at: new Date().toISOString(),
                projects
            }
        });
        
    } catch (error) {
        console.error('Error generating project status report:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating report',
            error: error.message
        });
    }
};