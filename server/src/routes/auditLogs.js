/**
 * Audit Log Routes for VTRIA ERP
 * System audit logs and activity tracking
 */

const express = require('express');
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Apply authentication middleware to all routes
// License middleware is applied globally in server.js
router.use(authenticate);

/**
 * GET /api/audit-logs
 * Get audit logs with pagination and filtering
 * Restricted to Director and Manager roles
 */
router.get('/', rbac(['director', 'manager']), auditController.getAuditLogs);

/**
 * GET /api/audit-logs/:id
 * Get audit log by ID
 * Restricted to Director and Manager roles
 */
router.get('/:id', rbac(['director', 'manager']), auditController.getAuditLogById);

/**
 * GET /api/audit-logs/entity/:entity_type/:entity_id
 * Get audit logs for a specific entity
 * Restricted to Director and Manager roles
 */
router.get('/entity/:entity_type/:entity_id', rbac(['director', 'manager']), auditController.getEntityAuditLogs);

/**
 * GET /api/audit-logs/user/:user_id
 * Get user activity logs
 * Users can view their own logs, Directors and Managers can view any user's logs
 */
router.get('/user/:user_id', auditController.getUserActivityLogs);

/**
 * GET /api/audit-logs/stats
 * Get audit log statistics
 * Restricted to Director and Manager roles
 */
router.get('/stats', rbac(['director', 'manager']), auditController.getAuditStats);

/**
 * POST /api/audit-logs
 * Create a manual audit log entry
 * Restricted to Director role
 */
router.post('/', rbac(['director']), auditController.createAuditLog);

module.exports = router;
