const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Audit trail queries
router.get('/record/:tableName/:recordId', 
    checkPermission('audit', 'read'),
    auditController.getRecordAuditTrail
);

router.get('/case/:caseId', 
    checkPermission('audit', 'read'),
    auditController.getCaseAuditTrail
);

router.get('/scope-changes/:caseId', 
    checkPermission('audit', 'read'),
    auditController.getCaseScopeChanges
);

router.get('/user-activity/:userId', 
    checkPermission('audit', 'read'),
    auditController.getUserActivity
);

router.get('/high-value-changes', 
    checkPermission('audit', 'read'),
    auditController.getHighValueChanges
);

router.get('/pending-approvals', 
    checkPermission('audit', 'read'),
    auditController.getPendingApprovals
);

router.get('/dashboard', 
    checkPermission('audit', 'read'),
    auditController.getAuditDashboard
);

// Export and system health
router.get('/export', 
    checkPermission('audit', 'read'),
    auditController.exportAuditData
);

router.get('/system-health', 
    checkPermission('audit', 'read'),
    auditController.getSystemHealth
);

// Approval actions
router.post('/approve/:auditId', 
    checkPermission('audit', 'approve'),
    auditController.processApproval
);

module.exports = router;