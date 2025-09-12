/**
 * Validation Middleware for VTRIA ERP
 * Input validation for API requests
 */

const { body, query, param, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Helper function to validate results
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error:', errors.array());
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Notification query validation
exports.validateNotificationQuery = [
  query('unread_only').optional().isBoolean().withMessage('unread_only must be a boolean'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be a non-negative integer'),
  validateResults
];

// Notification read validation
exports.validateNotificationRead = [
  param('id').isUUID().withMessage('Invalid notification ID format'),
  validateResults
];

// Audit log query validation
exports.validateAuditLogQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('user_id').optional().isUUID().withMessage('user_id must be a valid UUID'),
  query('action_type').optional().isString().withMessage('action_type must be a string'),
  query('entity_type').optional().isString().withMessage('entity_type must be a string'),
  query('entity_id').optional().isString().withMessage('entity_id must be a string'),
  query('severity').optional().isIn(['info', 'warning', 'error']).withMessage('severity must be info, warning, or error'),
  query('start_date').optional().isDate().withMessage('start_date must be a valid date'),
  query('end_date').optional().isDate().withMessage('end_date must be a valid date'),
  query('location_id').optional().isUUID().withMessage('location_id must be a valid UUID'),
  validateResults
];

// Test notification validation
exports.validateTestNotification = [
  body('recipient_id').isUUID().withMessage('recipient_id must be a valid UUID'),
  body('type').isString().withMessage('type must be a string'),
  body('title').isString().withMessage('title must be a string'),
  body('message').isString().withMessage('message must be a string'),
  validateResults
];

// Manual audit log creation validation
exports.validateAuditLogCreate = [
  body('action_type').isString().withMessage('action_type must be a string'),
  body('entity_type').isString().withMessage('entity_type must be a string'),
  body('entity_id').optional().isString().withMessage('entity_id must be a string'),
  body('description').isString().withMessage('description must be a string'),
  body('severity').optional().isIn(['info', 'warning', 'error']).withMessage('severity must be info, warning, or error'),
  body('metadata').optional().isObject().withMessage('metadata must be an object'),
  validateResults
];
