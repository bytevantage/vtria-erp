const express = require('express');
const router = express.Router();
const caseManagementController = require('../controllers/caseManagement.controller');
const caseAssignmentController = require('../controllers/caseAssignment.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Create a new case
router.post('/create', caseManagementController.createCase);

// Get case details by case number
router.get('/:caseNumber', caseManagementController.getCaseDetails);

// Get cases by state for queue management
router.get('/state/:state', caseManagementController.getCasesByState);

// Transition case to next state
router.put('/:caseNumber/transition', caseManagementController.transitionCaseState);

// Get case statistics
router.get('/stats/overview', caseManagementController.getCaseStatistics);

// Get case timeline
router.get('/:caseNumber/timeline', caseManagementController.getCaseTimeline);

// Update case information
router.put('/:caseNumber/update', caseManagementController.updateCase);

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

// Case Assignment & Queue Management
router.get('/assignments/queue', authMiddleware.verifyToken, caseAssignmentController.getCaseQueue);
router.put('/assignments/:case_id/assign', authMiddleware.verifyToken, caseAssignmentController.assignCase);
router.put('/assignments/:case_id/unassign', authMiddleware.verifyToken, caseAssignmentController.unassignCase);
router.get('/assignments/:case_id/history', authMiddleware.verifyToken, caseAssignmentController.getCaseAssignmentHistory);
router.get('/assignments/:case_id/available-users', authMiddleware.verifyToken, caseAssignmentController.getAvailableAssignees);

module.exports = router;
