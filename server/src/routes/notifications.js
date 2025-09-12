/**
 * Notification Routes for VTRIA ERP
 * System notifications and alerts management
 */

const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validateNotificationQuery } = require('../middleware/validation');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Apply authentication middleware to all routes
// License middleware is applied globally in server.js
router.use(authenticate);

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', notificationController.getUserNotifications);

/**
 * GET /api/notifications/unread/count
 * Get unread notification count
 */
router.get('/unread/count', notificationController.getUnreadCount);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', notificationController.markAsRead);

/**
 * PUT /api/notifications/read/all
 * Mark all notifications as read
 */
router.put('/read/all', notificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * DELETE /api/notifications/read
 * Delete all read notifications
 */
router.delete('/read/all', notificationController.deleteAllRead);

/**
 * POST /api/notifications/test
 * Send test notification (admin only)
 */
router.post('/test', rbac(['director', 'manager']), notificationController.sendTestNotification);

module.exports = router;
