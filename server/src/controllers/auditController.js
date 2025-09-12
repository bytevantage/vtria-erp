/**
 * Audit Controller for VTRIA ERP
 * Handles API endpoints for audit log management
 */

const AuditLog = require('../models/AuditLog');
const auditService = require('../services/auditService');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Get audit logs with pagination and filtering
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action_type,
      entity_type,
      entity_id,
      severity,
      start_date,
      end_date,
      location_id
    } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const offset = (pageNumber - 1) * pageSize;

    // Build where clause based on filters
    const whereClause = {};

    if (user_id) whereClause.user_id = user_id;
    if (action_type) whereClause.action_type = action_type;
    if (entity_type) whereClause.entity_type = entity_type;
    if (entity_id) whereClause.entity_id = entity_id;
    if (severity) whereClause.severity = severity;
    if (location_id) whereClause.location_id = location_id;

    // Date range filter
    if (start_date || end_date) {
      whereClause.created_at = {};
      if (start_date) whereClause.created_at[Op.gte] = new Date(start_date);
      if (end_date) whereClause.created_at[Op.lte] = new Date(end_date);
    }

    // Get audit logs with pagination
    const { count, rows } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: sequelize.models.Location,
          as: 'location',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / pageSize);
    const hasNext = pageNumber < totalPages;
    const hasPrev = pageNumber > 1;

    return res.status(200).json({
      success: true,
      count,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalPages,
        hasNext,
        hasPrev
      },
      data: rows
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

/**
 * Get audit log by ID
 */
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const auditLog = await AuditLog.findByPk(id, {
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: sequelize.models.Location,
          as: 'location',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!auditLog) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    logger.error('Error fetching audit log by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
};

/**
 * Get audit logs for a specific entity
 */
exports.getEntityAuditLogs = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;
    const { limit = 50 } = req.query;

    const auditLogs = await auditService.getRecordAuditLogs(
      entity_type,
      entity_id,
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      count: auditLogs.length,
      data: auditLogs
    });
  } catch (error) {
    logger.error('Error fetching entity audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entity audit logs',
      error: error.message
    });
  }
};

/**
 * Get user activity logs
 */
exports.getUserActivityLogs = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { limit = 100 } = req.query;

    // Check if requesting user has permission to view other user's logs
    if (req.user.id !== user_id && 
        !req.user.roles.includes('Director') && 
        !req.user.roles.includes('Manager')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only view your own activity logs'
      });
    }

    const activityLogs = await auditService.getUserActivityLogs(
      user_id,
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      count: activityLogs.length,
      data: activityLogs
    });
  } catch (error) {
    logger.error('Error fetching user activity logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity logs',
      error: error.message
    });
  }
};

/**
 * Get audit log statistics
 */
exports.getAuditStats = async (req, res) => {
  try {
    // Check if user has permission to view statistics
    if (!req.user.roles.includes('Director') && !req.user.roles.includes('Manager')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only Directors and Managers can view audit statistics'
      });
    }

    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Get action type counts
    const [actionTypeCounts] = await sequelize.query(`
      SELECT action_type, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= :daysAgo
      GROUP BY action_type
      ORDER BY count DESC
    `, {
      replacements: { daysAgo }
    });

    // Get entity type counts
    const [entityTypeCounts] = await sequelize.query(`
      SELECT entity_type, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= :daysAgo
      GROUP BY entity_type
      ORDER BY count DESC
    `, {
      replacements: { daysAgo }
    });

    // Get severity counts
    const [severityCounts] = await sequelize.query(`
      SELECT severity, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= :daysAgo
      GROUP BY severity
      ORDER BY count DESC
    `, {
      replacements: { daysAgo }
    });

    // Get daily activity counts
    const [dailyActivity] = await sequelize.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= :daysAgo
      GROUP BY DATE(created_at)
      ORDER BY date
    `, {
      replacements: { daysAgo }
    });

    // Get top users by activity
    const [topUsers] = await sequelize.query(`
      SELECT 
        al.user_id,
        u.first_name,
        u.last_name,
        COUNT(*) as count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= :daysAgo
      GROUP BY al.user_id, u.first_name, u.last_name
      ORDER BY count DESC
      LIMIT 10
    `, {
      replacements: { daysAgo }
    });

    return res.status(200).json({
      success: true,
      data: {
        actionTypeCounts,
        entityTypeCounts,
        severityCounts,
        dailyActivity,
        topUsers
      }
    });
  } catch (error) {
    logger.error('Error fetching audit statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
};

/**
 * Create a manual audit log entry (admin only)
 */
exports.createAuditLog = async (req, res) => {
  try {
    // Check if user has admin role
    if (!req.user.roles.includes('Director')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only Directors can create manual audit logs'
      });
    }

    const {
      action_type,
      entity_type,
      entity_id,
      description,
      severity,
      metadata
    } = req.body;

    if (!action_type || !entity_type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create audit log
    const auditLog = await AuditLog.create({
      user_id: req.user.id,
      action_type,
      entity_type,
      entity_id,
      description,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      metadata,
      severity: severity || 'info',
      location_id: req.user.location_id
    });

    return res.status(201).json({
      success: true,
      message: 'Audit log created',
      data: auditLog
    });
  } catch (error) {
    logger.error('Error creating audit log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create audit log',
      error: error.message
    });
  }
};
