/**
 * License Routes for ByteVantage Licensing Server
 * Handles license validation, generation, and management
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../utils/logger');
const { generateLicenseKey, validateLicenseFormat } = require('../utils/licenseUtils');

const router = express.Router();

/**
 * POST /api/licenses/validate
 * Validate a license key
 */
router.post('/validate', [
  body('license_key')
    .notEmpty()
    .withMessage('License key is required')
    .isLength({ min: 10, max: 255 })
    .withMessage('Invalid license key format'),
  body('client_info').optional().isObject(),
  body('usage_data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { license_key, client_info = {}, usage_data = {} } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate license key format
    if (!validateLicenseFormat(license_key)) {
      await logValidation(null, license_key, clientIp, userAgent, 'invalid', 'Invalid license key format');
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid license key format',
          code: 'INVALID_FORMAT'
        }
      });
    }

    // Check license validity using database function
    const validationResult = await db.query(
      'SELECT check_license_validity($1) as result',
      [license_key]
    );

    const result = validationResult.rows[0].result;

    // Log validation attempt
    await logValidation(
      result.license_id || null,
      license_key,
      clientIp,
      userAgent,
      result.status,
      result.message,
      { client_info, usage_data }
    );

    if (result.valid) {
      // Update usage statistics if provided
      if (usage_data.active_users || usage_data.active_locations) {
        await updateUsageStats(result.license_id, usage_data);
      }

      res.json({
        success: true,
        data: {
          valid: true,
          status: result.status,
          license: {
            id: result.license_id,
            client_name: result.client_name,
            product_name: result.product_name,
            expiry_date: result.expiry_date,
            max_users: result.max_users,
            current_users: result.current_users,
            max_locations: result.max_locations,
            current_locations: result.current_locations,
            features: result.features,
            restrictions: result.restrictions,
            is_trial: result.is_trial
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: {
          message: result.message,
          code: result.status.toUpperCase(),
          details: {
            status: result.status,
            expiry_date: result.expiry_date
          }
        }
      });
    }

  } catch (error) {
    logger.error('License validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'License validation failed',
        code: 'VALIDATION_ERROR'
      }
    });
  }
});

/**
 * POST /api/licenses/generate
 * Generate a new license key
 */
router.post('/generate', [
  body('client_id')
    .isUUID()
    .withMessage('Valid client ID is required'),
  body('product_id')
    .isUUID()
    .withMessage('Valid product ID is required'),
  body('license_name')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('License name must be 1-200 characters'),
  body('expiry_date')
    .isISO8601()
    .withMessage('Valid expiry date is required'),
  body('max_users')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max users must be between 1 and 10000'),
  body('max_locations')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max locations must be between 1 and 100'),
  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be a valid JSON object'),
  body('is_trial')
    .optional()
    .isBoolean()
    .withMessage('is_trial must be a boolean'),
  body('trial_days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Trial days must be between 1 and 365')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const {
      client_id,
      product_id,
      license_name,
      expiry_date,
      max_users = 1,
      max_locations = 1,
      features = {},
      restrictions = {},
      is_trial = false,
      trial_days,
      auto_renew = false
    } = req.body;

    // Get client and product information
    const clientResult = await db.query(
      'SELECT client_code, client_name FROM clients WHERE id = $1 AND is_active = true',
      [client_id]
    );

    const productResult = await db.query(
      'SELECT product_code, product_name FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Client not found or inactive',
          code: 'CLIENT_NOT_FOUND'
        }
      });
    }

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Product not found or inactive',
          code: 'PRODUCT_NOT_FOUND'
        }
      });
    }

    const client = clientResult.rows[0];
    const product = productResult.rows[0];

    // Generate license key
    const licenseKey = generateLicenseKey(client.client_code, product.product_code);

    // Insert new license
    const licenseResult = await db.query(`
      INSERT INTO licenses (
        license_key, client_id, product_id, license_name, expiry_date,
        max_users, max_locations, features, restrictions, is_trial,
        trial_days, auto_renew
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, license_key, status, issue_date, start_date, expiry_date
    `, [
      licenseKey, client_id, product_id, license_name, expiry_date,
      max_users, max_locations, JSON.stringify(features), JSON.stringify(restrictions),
      is_trial, trial_days, auto_renew
    ]);

    const newLicense = licenseResult.rows[0];

    logger.info('License generated successfully', {
      license_id: newLicense.id,
      license_key: licenseKey,
      client_name: client.client_name,
      product_name: product.product_name
    });

    res.status(201).json({
      success: true,
      data: {
        license: {
          id: newLicense.id,
          license_key: newLicense.license_key,
          client_name: client.client_name,
          product_name: product.product_name,
          status: newLicense.status,
          issue_date: newLicense.issue_date,
          start_date: newLicense.start_date,
          expiry_date: newLicense.expiry_date,
          max_users,
          max_locations,
          features,
          restrictions,
          is_trial,
          trial_days,
          auto_renew
        }
      }
    });

  } catch (error) {
    logger.error('License generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'License generation failed',
        code: 'GENERATION_ERROR'
      }
    });
  }
});

/**
 * GET /api/licenses/:license_key
 * Get license information
 */
router.get('/:license_key', [
  param('license_key')
    .notEmpty()
    .withMessage('License key is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { license_key } = req.params;

    const result = await db.query(`
      SELECT 
        l.*,
        c.client_name,
        c.company,
        p.product_name,
        p.version as product_version
      FROM licenses l
      JOIN clients c ON l.client_id = c.id
      JOIN products p ON l.product_id = p.id
      WHERE l.license_key = $1
    `, [license_key]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        }
      });
    }

    const license = result.rows[0];

    res.json({
      success: true,
      data: {
        license: {
          id: license.id,
          license_key: license.license_key,
          license_name: license.license_name,
          status: license.status,
          client_name: license.client_name,
          company: license.company,
          product_name: license.product_name,
          product_version: license.product_version,
          issue_date: license.issue_date,
          start_date: license.start_date,
          expiry_date: license.expiry_date,
          grace_period_days: license.grace_period_days,
          max_users: license.max_users,
          current_users: license.current_users,
          max_locations: license.max_locations,
          current_locations: license.current_locations,
          features: license.features,
          restrictions: license.restrictions,
          is_trial: license.is_trial,
          trial_days: license.trial_days,
          auto_renew: license.auto_renew,
          last_validated: license.last_validated,
          validation_count: license.validation_count
        }
      }
    });

  } catch (error) {
    logger.error('License retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve license',
        code: 'RETRIEVAL_ERROR'
      }
    });
  }
});

/**
 * PUT /api/licenses/:license_key/status
 * Update license status
 */
router.put('/:license_key/status', [
  param('license_key').notEmpty().withMessage('License key is required'),
  body('status')
    .isIn(['active', 'suspended', 'revoked'])
    .withMessage('Status must be active, suspended, or revoked'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { license_key } = req.params;
    const { status, reason } = req.body;

    const result = await db.query(
      'UPDATE licenses SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE license_key = $2 RETURNING id, status',
      [status, license_key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        }
      });
    }

    logger.info('License status updated', {
      license_key,
      new_status: status,
      reason
    });

    res.json({
      success: true,
      data: {
        license_id: result.rows[0].id,
        status: result.rows[0].status,
        message: `License status updated to ${status}`
      }
    });

  } catch (error) {
    logger.error('License status update error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update license status',
        code: 'UPDATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/licenses/:license_key/usage
 * Get license usage statistics
 */
router.get('/:license_key/usage', [
  param('license_key').notEmpty().withMessage('License key is required'),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { license_key } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Get license ID
    const licenseResult = await db.query(
      'SELECT id FROM licenses WHERE license_key = $1',
      [license_key]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'License not found',
          code: 'LICENSE_NOT_FOUND'
        }
      });
    }

    const licenseId = licenseResult.rows[0].id;

    // Get usage statistics
    const usageResult = await db.query(`
      SELECT 
        usage_date,
        active_users,
        active_locations,
        api_calls,
        feature_usage,
        peak_concurrent_users,
        total_session_minutes
      FROM license_usage
      WHERE license_id = $1 
      AND usage_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY usage_date DESC
    `, [licenseId]);

    res.json({
      success: true,
      data: {
        license_key,
        usage_period_days: days,
        usage_data: usageResult.rows
      }
    });

  } catch (error) {
    logger.error('License usage retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve usage statistics',
        code: 'USAGE_ERROR'
      }
    });
  }
});

// Helper function to log validation attempts
async function logValidation(licenseId, licenseKey, clientIp, userAgent, result, errorMessage, validationData = {}) {
  try {
    await db.query(`
      INSERT INTO license_validations (
        license_id, validation_key, client_ip, user_agent,
        validation_result, validation_data, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      licenseId,
      licenseKey,
      clientIp,
      userAgent,
      result,
      JSON.stringify(validationData),
      errorMessage
    ]);
  } catch (error) {
    logger.error('Failed to log validation:', error);
  }
}

// Helper function to update usage statistics
async function updateUsageStats(licenseId, usageData) {
  try {
    await db.query(`
      INSERT INTO license_usage (
        license_id, usage_date, active_users, active_locations,
        api_calls, peak_concurrent_users, total_session_minutes
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
      ON CONFLICT (license_id, usage_date)
      DO UPDATE SET
        active_users = GREATEST(license_usage.active_users, EXCLUDED.active_users),
        active_locations = GREATEST(license_usage.active_locations, EXCLUDED.active_locations),
        api_calls = license_usage.api_calls + COALESCE(EXCLUDED.api_calls, 0),
        peak_concurrent_users = GREATEST(license_usage.peak_concurrent_users, EXCLUDED.peak_concurrent_users),
        total_session_minutes = license_usage.total_session_minutes + COALESCE(EXCLUDED.total_session_minutes, 0)
    `, [
      licenseId,
      usageData.active_users || 0,
      usageData.active_locations || 0,
      usageData.api_calls || 1,
      usageData.peak_concurrent_users || 0,
      usageData.total_session_minutes || 0
    ]);
  } catch (error) {
    logger.error('Failed to update usage stats:', error);
  }
}

module.exports = router;
