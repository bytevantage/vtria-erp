const db = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class MobileAppService {
  // Mobile Authentication
  async authenticateMobileUser(email, password, deviceInfo) {
    try {
      // Check user credentials
      const [users] = await db.execute(`
        SELECT u.*, r.role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ? AND u.is_active = TRUE
      `, [email]);

      if (users.length === 0) {
        return { success: false, message: 'Invalid credentials' };
      }

      const user = users[0];
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      // Register/update device
      await this.registerDevice(user.id, deviceInfo);

      // Generate mobile JWT token (longer expiry for mobile)
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role_name,
          isMobile: true 
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // 30 days for mobile
      );

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role_name,
            profile_picture: user.profile_picture
          },
          token,
          permissions: await this.getUserPermissions(user.id)
        }
      };
    } catch (error) {
      console.error('Mobile authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  // Register mobile device
  async registerDevice(userId, deviceInfo) {
    try {
      const { deviceId, deviceType, osVersion, appVersion, pushToken } = deviceInfo;

      // Check if device already exists
      const [existing] = await db.execute(`
        SELECT id FROM mobile_devices WHERE user_id = ? AND device_id = ?
      `, [userId, deviceId]);

      if (existing.length > 0) {
        // Update existing device
        await db.execute(`
          UPDATE mobile_devices 
          SET device_type = ?, os_version = ?, app_version = ?, 
              push_token = ?, last_active = NOW(), updated_at = NOW()
          WHERE user_id = ? AND device_id = ?
        `, [deviceType, osVersion, appVersion, pushToken, userId, deviceId]);
      } else {
        // Insert new device
        await db.execute(`
          INSERT INTO mobile_devices (
            user_id, device_id, device_type, os_version, app_version, 
            push_token, last_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [userId, deviceId, deviceType, osVersion, appVersion, pushToken]);
      }
    } catch (error) {
      console.error('Device registration error:', error);
    }
  }

  // Get mobile dashboard data
  async getMobileDashboard(userId) {
    try {
      // Get user's assigned cases
      const [cases] = await db.execute(`
        SELECT c.*, cl.company_name, 
               COUNT(m.id) as total_milestones,
               COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_milestones
        FROM cases c
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN case_milestones m ON c.id = m.case_id
        WHERE c.assigned_to = ? OR c.team_members LIKE ?
        GROUP BY c.id
        ORDER BY c.priority DESC, c.created_at DESC
        LIMIT 10
      `, [userId, `%${userId}%`]);

      // Get pending tasks/milestones
      const [tasks] = await db.execute(`
        SELECT m.*, c.case_number, c.project_name
        FROM case_milestones m
        JOIN cases c ON m.case_id = c.id
        WHERE m.assigned_to = ? AND m.status IN ('not_started', 'in_progress')
        ORDER BY m.planned_end_date ASC
        LIMIT 20
      `, [userId]);

      // Get recent notifications
      const [notifications] = await db.execute(`
        SELECT * FROM notifications 
        WHERE user_id = ? AND is_read = FALSE
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);

      // Get AI insights for user's cases
      const [insights] = await db.execute(`
        SELECT ai.*, c.case_number
        FROM ai_insights ai
        JOIN cases c ON ai.case_id = c.id
        WHERE c.assigned_to = ? OR c.team_members LIKE ?
        ORDER BY ai.created_at DESC
        LIMIT 5
      `, [userId, `%${userId}%`]);

      return {
        success: true,
        data: {
          cases,
          tasks,
          notifications,
          insights,
          summary: {
            total_cases: cases.length,
            pending_tasks: tasks.length,
            unread_notifications: notifications.length,
            recent_insights: insights.length
          }
        }
      };
    } catch (error) {
      console.error('Mobile dashboard error:', error);
      return { success: false, message: 'Failed to load dashboard' };
    }
  }

  // Update task status from mobile
  async updateTaskStatus(taskId, status, notes, userId) {
    try {
      // Verify user has permission to update this task
      const [tasks] = await db.execute(`
        SELECT m.*, c.assigned_to, c.team_members
        FROM case_milestones m
        JOIN cases c ON m.case_id = c.id
        WHERE m.id = ?
      `, [taskId]);

      if (tasks.length === 0) {
        return { success: false, message: 'Task not found' };
      }

      const task = tasks[0];
      const hasPermission = task.assigned_to == userId || 
                           task.assigned_to == userId || 
                           (task.team_members && task.team_members.includes(userId.toString()));

      if (!hasPermission) {
        return { success: false, message: 'Permission denied' };
      }

      // Update task status
      await db.execute(`
        UPDATE case_milestones 
        SET status = ?, updated_notes = ?, updated_by = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, notes, userId, taskId]);

      // Log activity
      await db.execute(`
        INSERT INTO case_activity_log (
          case_id, milestone_id, activity_type, description, performed_by, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        task.case_id,
        taskId,
        'milestone_updated',
        `Task status updated to ${status} via mobile app`,
        userId
      ]);

      return { success: true, message: 'Task updated successfully' };
    } catch (error) {
      console.error('Task update error:', error);
      return { success: false, message: 'Failed to update task' };
    }
  }

  // Mobile-optimized case details
  async getCaseDetailsMobile(caseId, userId) {
    try {
      // Get case details
      const [cases] = await db.execute(`
        SELECT c.*, cl.company_name, cl.contact_person, cl.contact_email,
               u.full_name as assigned_user_name
        FROM cases c
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = ?
      `, [caseId]);

      if (cases.length === 0) {
        return { success: false, message: 'Case not found' };
      }

      const caseData = cases[0];

      // Get milestones
      const [milestones] = await db.execute(`
        SELECT m.*, u.full_name as assigned_user_name
        FROM case_milestones m
        LEFT JOIN users u ON m.assigned_to = u.id
        WHERE m.case_id = ?
        ORDER BY m.milestone_order ASC
      `, [caseId]);

      // Get recent activity (last 20 items)
      const [activities] = await db.execute(`
        SELECT a.*, u.full_name as user_name
        FROM case_activity_log a
        LEFT JOIN users u ON a.performed_by = u.id
        WHERE a.case_id = ?
        ORDER BY a.created_at DESC
        LIMIT 20
      `, [caseId]);

      // Get AI insights for this case
      const [insights] = await db.execute(`
        SELECT * FROM ai_insights
        WHERE case_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `, [caseId]);

      return {
        success: true,
        data: {
          case: caseData,
          milestones,
          activities,
          insights
        }
      };
    } catch (error) {
      console.error('Mobile case details error:', error);
      return { success: false, message: 'Failed to load case details' };
    }
  }

  // Send push notification
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      // Get user's devices with push tokens
      const [devices] = await db.execute(`
        SELECT push_token FROM mobile_devices 
        WHERE user_id = ? AND push_token IS NOT NULL AND is_active = TRUE
      `, [userId]);

      if (devices.length === 0) {
        return { success: false, message: 'No active devices found' };
      }

      // Create notification record
      await db.execute(`
        INSERT INTO notifications (
          user_id, title, message, notification_type, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [userId, title, body, 'mobile_push', JSON.stringify(data)]);

      // Here you would integrate with your push notification service
      // (Firebase Cloud Messaging, Apple Push Notifications, etc.)
      console.log(`Push notification to user ${userId}: ${title} - ${body}`);

      return { success: true, message: 'Push notification sent' };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  // Mobile-friendly search
  async searchMobile(userId, query, type = 'all') {
    try {
      const results = [];

      if (type === 'all' || type === 'cases') {
        const [cases] = await db.execute(`
          SELECT 'case' as result_type, c.id, c.case_number as title, 
                 c.project_name as subtitle, c.status, c.priority
          FROM cases c
          WHERE (c.assigned_to = ? OR c.team_members LIKE ?) 
          AND (c.case_number LIKE ? OR c.project_name LIKE ? OR c.description LIKE ?)
          LIMIT 10
        `, [userId, `%${userId}%`, `%${query}%`, `%${query}%`, `%${query}%`]);
        results.push(...cases);
      }

      if (type === 'all' || type === 'tasks') {
        const [tasks] = await db.execute(`
          SELECT 'task' as result_type, m.id, m.milestone_name as title,
                 c.case_number as subtitle, m.status, m.priority_level as priority
          FROM case_milestones m
          JOIN cases c ON m.case_id = c.id
          WHERE m.assigned_to = ?
          AND (m.milestone_name LIKE ? OR m.description LIKE ?)
          LIMIT 10
        `, [userId, `%${query}%`, `%${query}%`]);
        results.push(...tasks);
      }

      if (type === 'all' || type === 'clients') {
        const [clients] = await db.execute(`
          SELECT 'client' as result_type, id, company_name as title,
                 contact_person as subtitle, 'active' as status, 'normal' as priority
          FROM clients
          WHERE company_name LIKE ? OR contact_person LIKE ?
          LIMIT 10
        `, [`%${query}%`, `%${query}%`]);
        results.push(...clients);
      }

      return {
        success: true,
        data: {
          results,
          query,
          total: results.length
        }
      };
    } catch (error) {
      console.error('Mobile search error:', error);
      return { success: false, message: 'Search failed' };
    }
  }

  // Get user permissions for mobile
  async getUserPermissions(userId) {
    try {
      const [permissions] = await db.execute(`
        SELECT DISTINCT p.permission_name, p.resource, p.action
        FROM user_role_permissions urp
        JOIN permissions p ON urp.permission_id = p.id
        WHERE urp.user_id = ?
      `, [userId]);

      return permissions.map(p => ({
        resource: p.resource,
        action: p.action,
        permission: p.permission_name
      }));
    } catch (error) {
      console.error('Get permissions error:', error);
      return [];
    }
  }

  // Sync mobile data (for offline capability)
  async syncMobileData(userId, lastSyncTime) {
    try {
      const syncData = {};

      // Get updated cases since last sync
      const [cases] = await db.execute(`
        SELECT c.*, cl.company_name
        FROM cases c
        LEFT JOIN clients cl ON c.client_id = cl.id
        WHERE (c.assigned_to = ? OR c.team_members LIKE ?)
        AND c.updated_at > ?
      `, [userId, `%${userId}%`, lastSyncTime]);

      // Get updated milestones since last sync
      const [milestones] = await db.execute(`
        SELECT m.*, c.case_number
        FROM case_milestones m
        JOIN cases c ON m.case_id = c.id
        WHERE m.assigned_to = ? AND m.updated_at > ?
      `, [userId, lastSyncTime]);

      // Get new notifications since last sync
      const [notifications] = await db.execute(`
        SELECT * FROM notifications
        WHERE user_id = ? AND created_at > ?
        ORDER BY created_at DESC
      `, [userId, lastSyncTime]);

      syncData.cases = cases;
      syncData.milestones = milestones;
      syncData.notifications = notifications;
      syncData.syncTime = new Date().toISOString();

      return {
        success: true,
        data: syncData
      };
    } catch (error) {
      console.error('Mobile sync error:', error);
      return { success: false, message: 'Sync failed' };
    }
  }

  // Mobile app configuration
  async getMobileAppConfig() {
    try {
      return {
        success: true,
        data: {
          apiVersion: '1.0',
          features: {
            pushNotifications: true,
            offlineMode: true,
            biometricAuth: true,
            darkMode: true,
            realTimeUpdates: true
          },
          endpoints: {
            baseUrl: process.env.API_BASE_URL || 'http://localhost:3001',
            websocket: process.env.WS_URL || 'ws://localhost:3001'
          },
          syncSettings: {
            maxOfflineTime: 72, // hours
            syncInterval: 300, // seconds
            batchSize: 100
          },
          security: {
            tokenRefreshInterval: 86400, // 24 hours
            maxLoginAttempts: 5,
            lockoutDuration: 900 // 15 minutes
          }
        }
      };
    } catch (error) {
      console.error('Mobile config error:', error);
      return { success: false, message: 'Failed to load configuration' };
    }
  }
}

module.exports = new MobileAppService();