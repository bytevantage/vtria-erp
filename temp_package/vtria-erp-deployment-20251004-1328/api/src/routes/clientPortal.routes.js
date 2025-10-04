const express = require('express');
const router = express.Router();
const clientPortalController = require('../controllers/clientPortal.controller');

// Client Portal Authentication
router.post('/auth/login', clientPortalController.clientPortalLogin);
router.post('/auth/register', clientPortalController.registerClientPortalUser);
router.post('/auth/forgot-password', clientPortalController.forgotPassword);
router.post('/auth/reset-password', clientPortalController.resetPassword);
router.get('/auth/verify-token', clientPortalController.verifyToken);

// Client Dashboard
router.get('/dashboard/:clientId', clientPortalController.getClientDashboard);
router.get('/cases/:clientId', clientPortalController.getClientCases);
router.get('/cases/:caseNumber/details', clientPortalController.getCaseDetails);

// Milestone Tracking
router.get('/cases/:caseNumber/milestones', clientPortalController.getCaseMilestones);
router.get('/milestones/:milestoneId', clientPortalController.getMilestoneDetails);
router.post('/milestones/:milestoneId/approve', clientPortalController.approveMilestone);
router.get('/milestones/:milestoneId/activities', clientPortalController.getMilestoneActivities);

// Communications
router.get('/communications/:caseNumber', clientPortalController.getCommunications);
router.post('/communications/send', clientPortalController.sendMessage);
router.put('/communications/:communicationId/read', clientPortalController.markAsRead);
router.post('/communications/:communicationId/reply', clientPortalController.replyToMessage);

// Notifications
router.get('/notifications/:clientPortalUserId', clientPortalController.getNotifications);
router.put('/notifications/:notificationId/read', clientPortalController.markNotificationAsRead);
router.put('/notifications/mark-all-read/:clientPortalUserId', clientPortalController.markAllNotificationsAsRead);

// Real-time Progress Updates
router.get('/progress/:caseNumber/live', clientPortalController.getLiveProgress);
router.get('/timeline/:caseNumber', clientPortalController.getCaseTimeline);

// Analytics and Reporting
router.get('/analytics/:clientId/summary', clientPortalController.getClientAnalytics);
router.get('/reports/:clientId/project-status', clientPortalController.getProjectStatusReport);

module.exports = router;