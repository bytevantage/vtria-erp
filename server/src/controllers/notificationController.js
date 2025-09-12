/**
 * Notification Controller for VTRIA ERP
 * Handles API endpoints for notification management
 */

const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');
const { validateNotificationQuery } = require('../middleware/validation');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Get user notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread_only, limit = 50, offset = 0 } = req.query;

    const notifications = await notificationService.getUserNotifications(userId, {
      unread_only: unread_only === 'true',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    logger.error('Error fetching user notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Get unread notification count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    return res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    logger.error('Error fetching unread notification count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notification count',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await notificationService.markAsRead(id, userId);

    if (result[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      count: result[0]
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

/**
 * Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await Notification.destroy({
      where: {
        id,
        user_id: userId
      }
    });

    if (result === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Delete all read notifications
 */
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await Notification.destroy({
      where: {
        user_id: userId,
        read_at: {
          [Op.ne]: null
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'All read notifications deleted',
      count: result
    });
  } catch (error) {
    logger.error('Error deleting read notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete read notifications',
      error: error.message
    });
  }
};

/**
 * Send test notification (admin only)
 */
exports.sendTestNotification = async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.roles.includes('Director') && !req.user.roles.includes('Manager')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only Directors and Managers can send test notifications'
      });
    }

    const { recipient_id, type, title, message } = req.body;

    if (!recipient_id || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create notification
    const notification = await notificationService.createInAppNotification(
      recipient_id,
      {
        type,
        title,
        message,
        data: {
          test: true,
          sent_by: req.user.id,
          sent_at: new Date()
        }
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Test notification sent',
      data: notification
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
};
