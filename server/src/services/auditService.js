/**
 * Audit Service for VTRIA ERP
 * Handles audit logging for case lifecycle events
 */

const { sequelize } = require('../config/database');

class AuditService {
  /**
   * Log audit event
   */
  static async log(action, userId, details = {}, ipAddress = null) {
    try {
      const auditLog = {
        user_id: userId,
        action: action,
        table_name: details.table_name || this.getTableFromAction(action),
        record_id: details.case_id || details.record_id,
        old_values: details.old_values || null,
        new_values: details.new_values || null,
        ip_address: ipAddress,
        user_agent: details.user_agent || null,
        additional_data: details,
        created_at: new Date()
      };

      // Insert directly using raw query to avoid model dependencies
      await sequelize.query(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, additional_data, created_at)
        VALUES (:user_id, :action, :table_name, :record_id, :old_values, :new_values, :ip_address, :user_agent, :additional_data, :created_at)
      `, {
        replacements: {
          user_id: auditLog.user_id,
          action: auditLog.action,
          table_name: auditLog.table_name,
          record_id: auditLog.record_id,
          old_values: auditLog.old_values ? JSON.stringify(auditLog.old_values) : null,
          new_values: auditLog.new_values ? JSON.stringify(auditLog.new_values) : null,
          ip_address: auditLog.ip_address,
          user_agent: auditLog.user_agent,
          additional_data: JSON.stringify(auditLog.additional_data),
          created_at: auditLog.created_at
        }
      });

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw error to avoid breaking main operations
    }
  }

  /**
   * Get table name from action
   */
  static getTableFromAction(action) {
    const actionTableMap = {
      'case_created': 'cases',
      'case_updated': 'cases',
      'case_status_changed': 'cases',
      'case_assigned': 'cases',
      'case_note_added': 'case_notes',
      'case_deleted': 'cases',
      'user_login': 'users',
      'user_logout': 'users'
    };

    return actionTableMap[action] || 'unknown';
  }

  /**
   * Get audit logs for a specific record
   */
  static async getRecordAuditLogs(tableName, recordId, limit = 50) {
    try {
      const [results] = await sequelize.query(`
        SELECT 
          al.*,
          u.first_name,
          u.last_name,
          u.email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.table_name = :table_name AND al.record_id = :record_id
        ORDER BY al.created_at DESC
        LIMIT :limit
      `, {
        replacements: {
          table_name: tableName,
          record_id: recordId,
          limit: limit
        }
      });

      return results;
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserActivityLogs(userId, limit = 100) {
    try {
      const [results] = await sequelize.query(`
        SELECT *
        FROM audit_logs
        WHERE user_id = :user_id
        ORDER BY created_at DESC
        LIMIT :limit
      `, {
        replacements: {
          user_id: userId,
          limit: limit
        }
      });

      return results;
    } catch (error) {
      console.error('Failed to fetch user activity logs:', error);
      return [];
    }
  }
}

module.exports = AuditService;
