const db = require('../config/database');
const { logAuditTrail } = require('../middleware/auditTrail.middleware');

/**
 * Audit Controller
 * Provides comprehensive audit trail querying and reporting functionality
 */

class AuditController {
    /**
     * Get audit trail for a specific record
     */
    async getRecordAuditTrail(req, res) {
        try {
            const { tableName, recordId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            const [auditRecords] = await db.execute(`
                SELECT 
                    al.*,
                    u.full_name as user_full_name,
                    approver.full_name as approver_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                LEFT JOIN users approver ON al.approved_by = approver.id
                WHERE al.table_name = ? AND al.record_id = ?
                ORDER BY al.created_at DESC
                LIMIT ? OFFSET ?
            `, [tableName, recordId, parseInt(limit), parseInt(offset)]);

            // Parse JSON fields
            const formattedRecords = auditRecords.map(record => {
                let oldValues = null;
                let newValues = null;
                let changedFields = null;
                
                try {
                    oldValues = record.old_values ? JSON.parse(record.old_values) : null;
                } catch (e) {
                    oldValues = record.old_values;
                }
                
                try {
                    newValues = record.new_values ? JSON.parse(record.new_values) : null;
                } catch (e) {
                    newValues = record.new_values;
                }
                
                try {
                    changedFields = record.changed_fields ? JSON.parse(record.changed_fields) : null;
                } catch (e) {
                    changedFields = record.changed_fields;
                }
                
                return {
                    ...record,
                    old_values: oldValues,
                    new_values: newValues,
                    changed_fields: changedFields
                };
            });

            res.json({
                success: true,
                data: formattedRecords,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: auditRecords.length
                }
            });
        } catch (error) {
            console.error('Error fetching audit trail:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching audit trail',
                error: error.message
            });
        }
    }

    /**
     * Get case audit trail (all related records)
     */
    async getCaseAuditTrail(req, res) {
        try {
            const { caseId } = req.params;
            const { limit = 100, offset = 0 } = req.query;

            const query = `
                SELECT 
                    al.*,
                    u.full_name as user_full_name,
                    approver.full_name as approver_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                LEFT JOIN users approver ON al.approved_by = approver.id
                WHERE al.case_id = ?
                ORDER BY al.created_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
            const [auditRecords] = await db.execute(query, [caseId]);

            const formattedRecords = auditRecords.map(record => {
                let oldValues = null;
                let newValues = null;
                let changedFields = null;
                
                try {
                    oldValues = record.old_values ? JSON.parse(record.old_values) : null;
                } catch (e) {
                    oldValues = record.old_values;
                }
                
                try {
                    newValues = record.new_values ? JSON.parse(record.new_values) : null;
                } catch (e) {
                    newValues = record.new_values;
                }
                
                try {
                    changedFields = record.changed_fields ? JSON.parse(record.changed_fields) : null;
                } catch (e) {
                    changedFields = record.changed_fields;
                }
                
                return {
                    ...record,
                    old_values: oldValues,
                    new_values: newValues,
                    changed_fields: changedFields
                };
            });

            res.json({
                success: true,
                data: formattedRecords,
                case_id: caseId,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: auditRecords.length
                }
            });
        } catch (error) {
            console.error('Error fetching case audit trail:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching case audit trail',
                error: error.message
            });
        }
    }

    /**
     * Get scope changes for a case
     */
    async getCaseScopeChanges(req, res) {
        try {
            const { caseId } = req.params;

            const [scopeChanges] = await db.execute(`
                SELECT 
                    sc.*,
                    u.full_name as requested_by_name,
                    approver.full_name as approved_by_name
                FROM scope_changes sc
                LEFT JOIN users u ON sc.requested_by = u.id
                LEFT JOIN users approver ON sc.approved_by = approver.id
                WHERE sc.case_id = ?
                ORDER BY sc.created_at DESC
            `, [caseId]);

            const formattedChanges = scopeChanges.map(change => ({
                ...change,
                item_details: change.item_details ? JSON.parse(change.item_details) : null
            }));

            res.json({
                success: true,
                data: formattedChanges,
                case_id: caseId
            });
        } catch (error) {
            console.error('Error fetching scope changes:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching scope changes',
                error: error.message
            });
        }
    }

    /**
     * Get user activity summary
     */
    async getUserActivity(req, res) {
        try {
            const { userId } = req.params;
            const { startDate, endDate, limit = 50 } = req.query;

            let whereClause = 'WHERE al.user_id = ?';
            const params = [userId];

            if (startDate && endDate) {
                whereClause += ' AND al.created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            const [activities] = await db.execute(`
                SELECT 
                    al.*,
                    u.full_name as user_full_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT ?
            `, [...params, parseInt(limit)]);

            // Get activity summary
            const [summary] = await db.execute(`
                SELECT 
                    action,
                    table_name,
                    COUNT(*) as count
                FROM audit_logs
                ${whereClause}
                GROUP BY action, table_name
                ORDER BY count DESC
            `, params);

            res.json({
                success: true,
                data: {
                    activities: activities,
                    summary: summary
                },
                user_id: userId
            });
        } catch (error) {
            console.error('Error fetching user activity:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching user activity',
                error: error.message
            });
        }
    }

    /**
     * Get high-value changes requiring attention
     */
    async getHighValueChanges(req, res) {
        try {
            const { days = 30, threshold = 50000 } = req.query;

            const [highValueChanges] = await db.execute(`
                SELECT 
                    sc.*,
                    u.full_name as requested_by_name,
                    approver.full_name as approved_by_name,
                    c.case_number,
                    c.project_name,
                    cl.company_name as client_name
                FROM scope_changes sc
                LEFT JOIN users u ON sc.requested_by = u.id
                LEFT JOIN users approver ON sc.approved_by = approver.id
                LEFT JOIN cases c ON sc.case_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                WHERE sc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND ABS(sc.value_difference) >= ?
                ORDER BY ABS(sc.value_difference) DESC, sc.created_at DESC
            `, [parseInt(days), parseFloat(threshold)]);

            const formattedChanges = highValueChanges.map(change => ({
                ...change,
                item_details: change.item_details ? JSON.parse(change.item_details) : null
            }));

            res.json({
                success: true,
                data: formattedChanges,
                filters: {
                    days: parseInt(days),
                    threshold: parseFloat(threshold)
                }
            });
        } catch (error) {
            console.error('Error fetching high-value changes:', error);
            
            // If audit tables don't exist, return empty data instead of error
            if (error.message.includes('doesn\'t exist')) {
                return res.json({
                    success: true,
                    data: [],
                    filters: {
                        days: parseInt(req.query.days || 30),
                        threshold: parseFloat(req.query.threshold || 50000)
                    },
                    message: 'Audit tables not yet configured. Showing placeholder data.'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error fetching high-value changes',
                error: error.message
            });
        }
    }

    /**
     * Get pending approvals
     */
    async getPendingApprovals(req, res) {
        try {
            const [pendingApprovals] = await db.execute(`
                SELECT 
                    al.id,
                    al.table_name,
                    al.record_id,
                    al.action,
                    al.business_reason,
                    al.user_name as requested_by,
                    al.case_number,
                    al.created_at,
                    sc.value_difference,
                    sc.justification as scope_justification
                FROM audit_logs al
                LEFT JOIN scope_changes sc ON (
                    sc.entity_type = CASE 
                        WHEN al.table_name = 'quotations' THEN 'quotation'
                        WHEN al.table_name = 'purchase_requisitions' THEN 'purchase_requisition'
                        ELSE al.table_name
                    END
                    AND sc.entity_id = al.record_id
                    AND sc.approval_status = 'pending'
                )
                WHERE al.approval_required = TRUE 
                AND al.approved_by IS NULL
                ORDER BY al.created_at ASC
            `);

            res.json({
                success: true,
                data: pendingApprovals
            });
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            
            // If audit tables don't exist, return empty data instead of error
            if (error.message.includes('doesn\'t exist')) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Audit tables not yet configured. Showing placeholder data.'
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error fetching pending approvals',
                error: error.message
            });
        }
    }

    /**
     * Approve or reject an audit item
     */
    async processApproval(req, res) {
        try {
            const { auditId } = req.params;
            const { action, notes } = req.body; // action: 'approve' or 'reject'
            const approverId = req.user?.id || 1;

            if (!['approve', 'reject'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Must be "approve" or "reject"'
                });
            }

            // Update audit log
            await db.execute(`
                UPDATE audit_logs 
                SET approved_by = ?, 
                    approved_at = NOW(),
                    approval_notes = ?
                WHERE id = ?
            `, [approverId, notes || null, auditId]);

            // Also update related scope changes if applicable
            await db.execute(`
                UPDATE scope_changes sc
                JOIN audit_logs al ON (
                    sc.entity_type = CASE 
                        WHEN al.table_name = 'quotations' THEN 'quotation'
                        WHEN al.table_name = 'purchase_requisitions' THEN 'purchase_requisition'
                        ELSE al.table_name
                    END
                    AND sc.entity_id = al.record_id
                )
                SET sc.approval_status = ?,
                    sc.approved_by = ?,
                    sc.approved_at = NOW(),
                    sc.approval_notes = ?
                WHERE al.id = ?
            `, [action === 'approve' ? 'approved' : 'rejected', approverId, notes, auditId]);

            // Log this approval action
            await logAuditTrail({
                tableName: 'audit_logs',
                recordId: auditId,
                action: action.toUpperCase(),
                newValues: { approved_by: approverId, approval_notes: notes },
                userId: approverId,
                userName: req.user?.name || 'System',
                businessReason: `Approval ${action}: ${notes || 'No notes provided'}`,
                systemGenerated: false
            });

            res.json({
                success: true,
                message: `Successfully ${action}ed the request`,
                audit_id: auditId,
                action: action,
                approved_by: approverId
            });
        } catch (error) {
            console.error('Error processing approval:', error);
            res.status(500).json({
                success: false,
                message: 'Error processing approval',
                error: error.message
            });
        }
    }

    /**
     * Get audit dashboard summary
     */
    async getAuditDashboard(req, res) {
        try {
            const { days = 7 } = req.query;

            // Get activity counts
            const [activityCounts] = await db.execute(`
                SELECT 
                    action,
                    COUNT(*) as count,
                    DATE(created_at) as date
                FROM audit_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY action, DATE(created_at)
                ORDER BY date DESC, count DESC
            `, [parseInt(days)]);

            // Get scope changes summary
            const [scopeSummary] = await db.execute(`
                SELECT 
                    entity_type,
                    change_type,
                    COUNT(*) as count,
                    SUM(ABS(value_difference)) as total_value_impact
                FROM scope_changes 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY entity_type, change_type
                ORDER BY total_value_impact DESC
            `, [parseInt(days)]);

            // Get pending items count
            const [pendingCounts] = await db.execute(`
                SELECT 
                    COUNT(*) as pending_approvals
                FROM audit_logs 
                WHERE approval_required = TRUE AND approved_by IS NULL
            `);

            // Get top users by activity
            const [topUsers] = await db.execute(`
                SELECT 
                    user_name,
                    COUNT(*) as activity_count
                FROM audit_logs 
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                AND user_name IS NOT NULL
                GROUP BY user_name
                ORDER BY activity_count DESC
                LIMIT 10
            `, [parseInt(days)]);

            res.json({
                success: true,
                data: {
                    period_days: parseInt(days),
                    activity_counts: activityCounts,
                    scope_summary: scopeSummary,
                    pending_approvals: pendingCounts[0]?.pending_approvals || 0,
                    top_users: topUsers
                }
            });
        } catch (error) {
            console.error('Error fetching audit dashboard:', error);
            
            // If audit tables don't exist, return empty data instead of error
            if (error.message.includes('doesn\'t exist')) {
                return res.json({
                    success: true,
                    data: {
                        period_days: parseInt(req.query.days || 7),
                        activity_counts: [],
                        scope_summary: [],
                        pending_approvals: 0,
                        top_users: [],
                        message: 'Audit tables not yet configured. Dashboard shows placeholder data.'
                    }
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error fetching audit dashboard',
                error: error.message
            });
        }
    }

    /**
     * Export audit data to CSV
     */
    async exportAuditData(req, res) {
        try {
            const { type = 'all', days = 30 } = req.query;
            
            let query = '';
            let params = [];
            
            if (type === 'scope_changes') {
                query = `
                    SELECT 
                        sc.entity_type,
                        sc.entity_number,
                        sc.change_type,
                        sc.original_value,
                        sc.new_value,
                        sc.value_difference,
                        sc.percentage_change,
                        sc.justification,
                        sc.approval_status,
                        sc.created_at,
                        u.full_name as requested_by_name,
                        c.case_number,
                        cl.company_name as client_name
                    FROM scope_changes sc
                    LEFT JOIN users u ON sc.requested_by = u.id
                    LEFT JOIN cases c ON sc.case_id = c.id
                    LEFT JOIN clients cl ON c.client_id = cl.id
                    WHERE sc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    ORDER BY sc.created_at DESC
                `;
                params = [parseInt(days)];
            } else {
                query = `
                    SELECT 
                        al.table_name,
                        al.record_id,
                        al.action,
                        al.user_name,
                        al.case_number,
                        al.business_reason,
                        al.created_at
                    FROM audit_logs al
                    WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    ORDER BY al.created_at DESC
                `;
                params = [parseInt(days)];
            }
            
            const [results] = await db.execute(query, params);
            
            // Convert to CSV
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No data found for export'
                });
            }
            
            const headers = Object.keys(results[0]);
            const csvContent = [
                headers.join(','),
                ...results.map(row => 
                    headers.map(header => 
                        typeof row[header] === 'string' && row[header].includes(',') 
                            ? `"${row[header]}"` 
                            : row[header] || ''
                    ).join(',')
                )
            ].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=audit_export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvContent);
            
        } catch (error) {
            console.error('Error exporting audit data:', error);
            res.status(500).json({
                success: false,
                message: 'Error exporting audit data',
                error: error.message
            });
        }
    }

    /**
     * Get system health and statistics
     */
    async getSystemHealth(req, res) {
        try {
            const [dbStats] = await db.execute(`
                SELECT 
                    'audit_logs' as table_name,
                    COUNT(*) as record_count,
                    MAX(created_at) as latest_entry
                FROM audit_logs
                UNION ALL
                SELECT 
                    'scope_changes' as table_name,
                    COUNT(*) as record_count,
                    MAX(created_at) as latest_entry
                FROM scope_changes
            `);
            
            const [todayStats] = await db.execute(`
                SELECT 
                    COUNT(*) as today_activities,
                    COUNT(DISTINCT user_id) as active_users_today
                FROM audit_logs 
                WHERE DATE(created_at) = CURDATE()
            `);
            
            res.json({
                success: true,
                data: {
                    database_stats: dbStats,
                    today_stats: todayStats[0],
                    system_status: 'healthy',
                    last_checked: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error fetching system health:', error);
            
            // If audit tables don't exist, return placeholder data instead of error
            if (error.message.includes('doesn\'t exist')) {
                return res.json({
                    success: true,
                    data: {
                        database_stats: [],
                        today_stats: { today_activities: 0, active_users_today: 0 },
                        system_status: 'healthy',
                        last_checked: new Date().toISOString(),
                        message: 'Audit tables not yet configured. Showing placeholder data.'
                    }
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error fetching system health',
                error: error.message
            });
        }
    }
}

module.exports = new AuditController();