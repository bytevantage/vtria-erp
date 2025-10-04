const db = require('../config/database');

/**
 * Advanced Audit Trail Middleware
 * Automatically tracks all database changes, business logic changes, and user actions
 */

class AuditTrailService {
    constructor() {
        this.trackedTables = new Set([
            'quotations',
            'quotation_items', 
            'purchase_requisitions',
            'purchase_requisition_items',
            'sales_orders',
            'sales_order_items',
            'estimations',
            'estimation_items',
            'cases',
            'invoices',
            'payments'
        ]);
    }

    /**
     * Log audit trail entry
     */
    async logAudit({
        tableName,
        recordId,
        action,
        oldValues = null,
        newValues = null,
        changedFields = null,
        userId = null,
        userName = null,
        userRole = null,
        sessionId = null,
        ipAddress = null,
        userAgent = null,
        caseId = null,
        caseNumber = null,
        businessReason = null,
        approvalRequired = false,
        systemGenerated = false
    }) {
        try {
            const auditEntry = {
                table_name: tableName,
                record_id: recordId.toString(),
                action: action,
                old_values: oldValues ? JSON.stringify(oldValues) : null,
                new_values: newValues ? JSON.stringify(newValues) : null,
                changed_fields: changedFields ? JSON.stringify(changedFields) : null,
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                session_id: sessionId,
                ip_address: ipAddress,
                user_agent: userAgent,
                case_id: caseId,
                case_number: caseNumber,
                business_reason: businessReason,
                approval_required: approvalRequired,
                system_generated: systemGenerated
            };

            const [result] = await db.execute(`
                INSERT INTO audit_logs (
                    table_name, record_id, action, old_values, new_values, changed_fields,
                    user_id, user_name, user_role, session_id, ip_address, user_agent,
                    case_id, case_number, business_reason, approval_required, system_generated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                auditEntry.table_name, auditEntry.record_id, auditEntry.action,
                auditEntry.old_values, auditEntry.new_values, auditEntry.changed_fields,
                auditEntry.user_id, auditEntry.user_name, auditEntry.user_role,
                auditEntry.session_id, auditEntry.ip_address, auditEntry.user_agent,
                auditEntry.case_id, auditEntry.case_number, auditEntry.business_reason,
                auditEntry.approval_required, auditEntry.system_generated
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Audit logging failed:', error);
            // Don't throw error to avoid breaking business operations
            return null;
        }
    }

    /**
     * Log scope change
     */
    async logScopeChange({
        entityType,
        entityId,
        entityNumber,
        caseId,
        changeType,
        originalValue,
        newValue,
        itemDetails = null,
        justification,
        requestedBy,
        clientApprovalRequired = false
    }) {
        try {
            const valueDifference = newValue && originalValue ? newValue - originalValue : null;
            const percentageChange = originalValue && originalValue > 0 ? 
                ((valueDifference / originalValue) * 100) : null;

            const [result] = await db.execute(`
                INSERT INTO scope_changes (
                    entity_type, entity_id, entity_number, case_id, change_type,
                    original_value, new_value, value_difference, percentage_change,
                    item_details, justification, requested_by, client_approval_required
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                entityType, entityId, entityNumber, caseId, changeType,
                originalValue, newValue, valueDifference, percentageChange,
                itemDetails ? JSON.stringify(itemDetails) : null,
                justification, requestedBy, clientApprovalRequired
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Scope change logging failed:', error);
            return null;
        }
    }

    /**
     * Compare objects and find changed fields
     */
    findChangedFields(oldObj, newObj) {
        const changedFields = [];
        const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);
        
        for (const key of allKeys) {
            if (oldObj[key] !== newObj[key]) {
                changedFields.push(key);
            }
        }
        
        return changedFields;
    }

    /**
     * Extract user context from request
     */
    extractUserContext(req) {
        return {
            userId: req.user?.id || 1, // Default to user ID 1 when auth is bypassed
            userName: req.user?.name || req.user?.username || req.user?.full_name || 'Admin User',
            userRole: req.user?.role || req.user?.user_role || 'admin',
            sessionId: req.sessionID || req.headers['x-session-id'] || null,
            ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'localhost',
            userAgent: req.headers['user-agent'] || null
        };
    }

    /**
     * Detect if change requires approval
     */
    requiresApproval(tableName, action, oldValues, newValues) {
        // High-value changes require approval
        if (tableName === 'quotations' || tableName === 'purchase_requisitions') {
            if (action === 'UPDATE') {
                const oldTotal = parseFloat(oldValues?.total_amount || oldValues?.total_value || 0);
                const newTotal = parseFloat(newValues?.total_amount || newValues?.total_value || 0);
                const difference = Math.abs(newTotal - oldTotal);
                
                // Require approval for changes > 10% or > Rs. 50,000
                if (difference > 50000 || (oldTotal > 0 && (difference / oldTotal) > 0.1)) {
                    return true;
                }
            }
        }
        
        // Status changes to approved/rejected require approval
        if (action === 'APPROVE' || action === 'REJECT') {
            return true;
        }
        
        return false;
    }
}

const auditService = new AuditTrailService();

/**
 * Middleware to automatically track database changes
 */
const auditTrailMiddleware = (options = {}) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        const userContext = auditService.extractUserContext(req);
        
        // Store original data for comparison (if available in request)
        req.auditContext = {
            ...userContext,
            originalData: req.body?.originalData || null,
            businessReason: req.body?.businessReason || req.headers['x-business-reason'] || null
        };

        // Override res.json to capture response data
        res.json = function(data) {
            // Only audit successful operations
            if (data && data.success !== false && res.statusCode < 400) {
                setImmediate(async () => {
                    try {
                        await auditService.logResponse(req, res, data, userContext);
                    } catch (error) {
                        console.error('Audit middleware error:', error);
                    }
                });
            }
            
            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Specific audit function for controllers to call directly
 */
const logAuditTrail = async (auditData) => {
    return auditService.logAudit(auditData);
};

/**
 * Specific function to log scope changes
 */
const logScopeChange = async (scopeData) => {
    return auditService.logScopeChange(scopeData);
};

/**
 * Helper function to audit quotation changes
 */
const auditQuotationChange = async (action, quotationId, oldData, newData, userContext, businessReason = null) => {
    const changedFields = auditService.findChangedFields(oldData, newData);
    const approvalRequired = auditService.requiresApproval('quotations', action, oldData, newData);
    
    // Log main audit trail
    const auditId = await auditService.logAudit({
        tableName: 'quotations',
        recordId: quotationId,
        action: action,
        oldValues: oldData,
        newValues: newData,
        changedFields: changedFields,
        ...userContext,
        caseId: newData?.case_id || oldData?.case_id,
        caseNumber: newData?.case_number || oldData?.case_number,
        businessReason: businessReason,
        approvalRequired: approvalRequired
    });

    // Check for scope changes
    if (action === 'UPDATE' && (oldData?.total_amount !== newData?.total_amount)) {
        await auditService.logScopeChange({
            entityType: 'quotation',
            entityId: quotationId,
            entityNumber: newData?.quotation_id || oldData?.quotation_id,
            caseId: newData?.case_id || oldData?.case_id,
            changeType: 'PRICE_CHANGED',
            originalValue: parseFloat(oldData?.total_amount || 0),
            newValue: parseFloat(newData?.total_amount || 0),
            justification: businessReason || 'Quotation amount updated',
            requestedBy: userContext.userId,
            clientApprovalRequired: parseFloat(newData?.total_amount || 0) > parseFloat(oldData?.total_amount || 0)
        });
    }

    return auditId;
};

/**
 * Helper function to audit purchase requisition changes
 */
const auditPRChange = async (action, prId, oldData, newData, userContext, businessReason = null) => {
    const changedFields = auditService.findChangedFields(oldData, newData);
    const approvalRequired = auditService.requiresApproval('purchase_requisitions', action, oldData, newData);
    
    const auditId = await auditService.logAudit({
        tableName: 'purchase_requisitions',
        recordId: prId,
        action: action,
        oldValues: oldData,
        newValues: newData,
        changedFields: changedFields,
        ...userContext,
        caseId: newData?.case_id || oldData?.case_id,
        caseNumber: newData?.case_number || oldData?.case_number,
        businessReason: businessReason,
        approvalRequired: approvalRequired
    });

    // Check for scope changes
    if (action === 'UPDATE' && (oldData?.total_value !== newData?.total_value)) {
        await auditService.logScopeChange({
            entityType: 'purchase_requisition',
            entityId: prId,
            entityNumber: newData?.pr_number || oldData?.pr_number,
            caseId: newData?.case_id || oldData?.case_id,
            changeType: 'PRICE_CHANGED',
            originalValue: parseFloat(oldData?.total_value || 0),
            newValue: parseFloat(newData?.total_value || 0),
            justification: businessReason || 'Purchase requisition amount updated',
            requestedBy: userContext.userId,
            clientApprovalRequired: false // PR changes typically don't require client approval
        });
    }

    return auditId;
};

module.exports = {
    auditTrailMiddleware,
    logAuditTrail,
    logScopeChange,
    auditQuotationChange,
    auditPRChange,
    auditService
};