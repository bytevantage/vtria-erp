const express = require('express');
const router = express.Router();
const caseManagementController = require('../controllers/caseManagement.controller');
const caseAssignmentController = require('../controllers/caseAssignment.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get all cases (root route)
router.get('/', authMiddleware.verifyToken, caseManagementController.getAllCases);

// Create a new case
router.post('/create', authMiddleware.verifyToken, caseManagementController.createCase);

// Get case details by ID (numeric)
router.get('/id/:id', authMiddleware.verifyToken, caseManagementController.getCaseById);

// Get case details by case number
router.get('/:caseNumber', authMiddleware.verifyToken, caseManagementController.getCaseDetails);

// Get cases by state for queue management
router.get('/state/:state', authMiddleware.verifyToken, caseManagementController.getCasesByState);

// Transition case to next state
router.put('/:caseNumber/transition', authMiddleware.verifyToken, caseManagementController.transitionCaseState);

// Cancel/Close case at any stage
router.put('/:caseNumber/cancel', authMiddleware.verifyToken, caseManagementController.cancelCase);

// Get case statistics
router.get('/stats/overview', authMiddleware.verifyToken, caseManagementController.getCaseStatistics);

// Get case timeline
router.get('/:caseNumber/timeline', authMiddleware.verifyToken, caseManagementController.getCaseTimeline);

// Update case information
router.put('/:caseNumber/update', authMiddleware.verifyToken, caseManagementController.updateCase);

// Search cases
router.get('/search/query', caseManagementController.searchCases);

// Enhanced Workflow Endpoints
router.get('/workflow/definitions', caseManagementController.getWorkflowDefinitions);
router.get('/workflow/status/:caseNumber', caseManagementController.getWorkflowStatus);
router.put('/workflow/transition/:caseNumber', caseManagementController.transitionWorkflowStep);
router.get('/workflow/sla-alerts', caseManagementController.getSLAAlerts);
router.post('/workflow/approve/:caseNumber', caseManagementController.approveWorkflowStep);
router.get('/workflow/pending-approvals', caseManagementController.getPendingApprovals);

// SLA Automation & Notification Endpoints
router.get('/notifications/queue', caseManagementController.getNotificationQueue);
router.post('/notifications/send/:id', caseManagementController.sendNotification);
router.get('/notifications/templates', caseManagementController.getNotificationTemplates);
router.post('/notifications/test/:caseNumber', caseManagementController.testNotification);

// Escalation Management Endpoints
router.get('/escalations/rules', caseManagementController.getEscalationRules);
router.post('/escalations/trigger/:caseNumber', caseManagementController.triggerManualEscalation);
router.get('/escalations/history/:caseNumber', caseManagementController.getEscalationHistory);
router.put('/escalations/resolve/:escalationId', caseManagementController.resolveEscalation);

// Performance Analytics Endpoints
router.get('/analytics/performance', caseManagementController.getPerformanceMetrics);
router.get('/analytics/sla-compliance', caseManagementController.getSLAComplianceReport);
router.get('/analytics/escalation-trends', caseManagementController.getEscalationTrends);
router.get('/analytics/dashboard-data', caseManagementController.getDashboardAnalytics);

// Milestone Management Endpoints
router.get('/milestones/templates', caseManagementController.getProjectTemplates);
router.post('/milestones/create-from-template', caseManagementController.createMilestonesFromTemplate);
router.get('/milestones/:caseNumber', caseManagementController.getCaseMilestones);
router.put('/milestones/:milestoneId/update', caseManagementController.updateMilestone);
router.post('/milestones/:milestoneId/activity', caseManagementController.addMilestoneActivity);
router.get('/milestones/:milestoneId/activities', caseManagementController.getMilestoneActivities);
router.put('/milestones/:milestoneId/progress', caseManagementController.updateMilestoneProgress);

// Workflow Progress Endpoint
router.get('/:caseId/workflow-progress', authMiddleware.verifyToken, caseManagementController.getWorkflowProgress);

// Data integrity fix: Create missing estimation records
router.post('/fix/missing-estimations', authMiddleware.verifyToken, caseManagementController.fixMissingEstimations);
router.post('/fix/missing-quotations', authMiddleware.verifyToken, caseManagementController.fixMissingQuotations);
router.post('/fix/workflow-integrity', authMiddleware.verifyToken, caseManagementController.fixWorkflowIntegrity);
router.post('/fix/all-data-integrity', authMiddleware.verifyToken, caseManagementController.fixAllDataIntegrity);

// Case Assignment & Queue Management
router.get('/assignments/queue', authMiddleware.verifyToken, caseAssignmentController.getCaseQueue);
router.put('/assignments/:case_id/assign', authMiddleware.verifyToken, caseAssignmentController.assignCase);
router.put('/assignments/:case_id/unassign', authMiddleware.verifyToken, caseAssignmentController.unassignCase);
router.get('/assignments/:case_id/history', authMiddleware.verifyToken, caseAssignmentController.getCaseAssignmentHistory);
router.get('/assignments/:case_id/available-users', authMiddleware.verifyToken, caseAssignmentController.getAvailableAssignees);

// Stage-Specific Delete & Recreation Management
router.delete('/:caseNumber/stage', caseManagementController.deleteStageData);
router.get('/:caseNumber/deleted-stages', caseManagementController.getDeletedStages);
router.post('/stage-backup/:backupId/recreate', caseManagementController.recreateStage);

// Legacy Case Delete & Recreation Management (kept for compatibility)
router.delete('/:caseNumber/delete', caseManagementController.softDeleteCase);
router.get('/deleted/list', caseManagementController.getDeletedCases);

module.exports = router;
