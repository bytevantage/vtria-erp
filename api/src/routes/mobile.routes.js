const express = require('express');
const router = express.Router();
const mobileAppService = require('../services/mobileAppService');
const db = require('../config/database');

// Mobile Authentication
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;
    
    if (!email || !password || !deviceInfo) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and device info are required'
      });
    }

    const result = await mobileAppService.authenticateMobileUser(email, password, deviceInfo);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Mobile Dashboard
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await mobileAppService.getMobileDashboard(userId);
    res.json(result);
  } catch (error) {
    console.error('Mobile dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
});

// Case Details for Mobile
router.get('/cases/:caseId/details/:userId', async (req, res) => {
  try {
    const { caseId, userId } = req.params;
    const result = await mobileAppService.getCaseDetailsMobile(caseId, userId);
    res.json(result);
  } catch (error) {
    console.error('Mobile case details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load case details'
    });
  }
});

// Update Task Status
router.put('/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes, userId } = req.body;
    
    const result = await mobileAppService.updateTaskStatus(taskId, status, notes, userId);
    res.json(result);
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

// Mobile Search
router.get('/search/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { q: query, type = 'all' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const result = await mobileAppService.searchMobile(userId, query, type);
    res.json(result);
  } catch (error) {
    console.error('Mobile search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
  }
});

// Push Notification
router.post('/notifications/push', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    
    const result = await mobileAppService.sendPushNotification(userId, title, body, data);
    res.json(result);
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// Data Sync
router.get('/sync/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { lastSync } = req.query;
    
    const lastSyncTime = lastSync ? new Date(lastSync) : new Date(0);
    const result = await mobileAppService.syncMobileData(userId, lastSyncTime);
    res.json(result);
  } catch (error) {
    console.error('Mobile sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed'
    });
  }
});

// App Configuration
router.get('/config', async (req, res) => {
  try {
    const result = await mobileAppService.getMobileAppConfig();
    res.json(result);
  } catch (error) {
    console.error('Mobile config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load configuration'
    });
  }
});

// Update Device Info
router.put('/device/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const deviceInfo = req.body;
    
    await mobileAppService.registerDevice(userId, deviceInfo);
    res.json({
      success: true,
      message: 'Device updated successfully'
    });
  } catch (error) {
    console.error('Device update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update device'
    });
  }
});

// Get User Notifications
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const offset = (page - 1) * limit;
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params = [userId];
    
    if (unreadOnly === 'true') {
      query += ` AND is_read = FALSE`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    const [notifications] = await db.execute(query, params);
    
    res.json({
      success: true,
      data: {
        notifications,
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications'
    });
  }
});

// Mark Notification as Read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    await db.execute(`
      UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?
    `, [notificationId]);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Get User's Quick Stats
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get quick statistics
    const [caseStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_cases,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_cases,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_cases
      FROM cases 
      WHERE assigned_to = ? OR team_members LIKE ?
    `, [userId, `%${userId}%`]);
    
    const [taskStats] = await db.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_tasks,
        COUNT(CASE WHEN planned_end_date < NOW() AND status != 'completed' THEN 1 END) as overdue_tasks
      FROM case_milestones 
      WHERE assigned_to = ?
    `, [userId]);
    
    const [notificationStats] = await db.execute(`
      SELECT COUNT(*) as unread_notifications
      FROM notifications 
      WHERE user_id = ? AND is_read = FALSE
    `, [userId]);
    
    res.json({
      success: true,
      data: {
        cases: caseStats[0],
        tasks: taskStats[0],
        notifications: notificationStats[0]
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

// Real-time Events (for WebSocket connections)
router.get('/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get recent events/activities for the user
    const [events] = await db.execute(`
      SELECT 
        'case_update' as event_type,
        c.id as entity_id,
        c.case_number as entity_name,
        c.updated_at as event_time,
        'Case updated' as event_description
      FROM cases c
      WHERE (c.assigned_to = ? OR c.team_members LIKE ?)
        AND c.updated_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
      
      UNION ALL
      
      SELECT 
        'milestone_update' as event_type,
        m.id as entity_id,
        m.milestone_name as entity_name,
        m.updated_at as event_time,
        CONCAT('Milestone ', m.status) as event_description
      FROM case_milestones m
      JOIN cases c ON m.case_id = c.id
      WHERE m.assigned_to = ?
        AND m.updated_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
      
      ORDER BY event_time DESC
      LIMIT 50
    `, [userId, `%${userId}%`, userId]);
    
    res.json({
      success: true,
      data: {
        events,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get events'
    });
  }
});

module.exports = router;