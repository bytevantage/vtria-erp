/**
 * Client Routes for ByteVantage Licensing Server
 * Handles client management operations
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/clients
 * Get all clients with pagination
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('type').optional().isIn(['individual', 'corporate', 'enterprise', 'trial']).withMessage('Invalid client type')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;
    const type = req.query.type;

    let whereClause = 'WHERE is_active = true';
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (client_name ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (type) {
      whereClause += ` AND client_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM clients ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total);

    // Get clients
    const clientsResult = await db.query(`
      SELECT 
        id, client_name, client_code, client_type, contact_person,
        email, phone, company, city, state, country, is_active,
        created_at, updated_at
      FROM clients 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: {
        clients: clientsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Client listing error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve clients',
        code: 'RETRIEVAL_ERROR'
      }
    });
  }
});

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/', [
  body('client_name')
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Client name must be 2-200 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('client_type')
    .optional()
    .isIn(['individual', 'corporate', 'enterprise', 'trial'])
    .withMessage('Invalid client type'),
  body('contact_person')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Contact person must be max 100 characters'),
  body('phone')
    .optional()
    .isLength({ max: 20 })
    .withMessage('Phone must be max 20 characters'),
  body('company')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Company must be max 200 characters')
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
      client_name,
      email,
      client_type = 'corporate',
      contact_person,
      phone,
      company,
      address,
      city,
      state,
      country = 'India',
      postal_code,
      tax_id,
      website,
      metadata = {}
    } = req.body;

    // Check if email already exists
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE email = $1',
      [email]
    );

    if (existingClient.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Client with this email already exists',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    // Generate client code
    const clientCode = await generateClientCode(client_name);

    // Create client
    const result = await db.query(`
      INSERT INTO clients (
        client_name, client_code, client_type, contact_person, email, phone,
        company, address, city, state, country, postal_code, tax_id, website, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      client_name, clientCode, client_type, contact_person, email, phone,
      company, address, city, state, country, postal_code, tax_id, website,
      JSON.stringify(metadata)
    ]);

    const newClient = result.rows[0];

    logger.info('Client created successfully', {
      client_id: newClient.id,
      client_name: newClient.client_name,
      client_code: newClient.client_code
    });

    res.status(201).json({
      success: true,
      data: {
        client: newClient
      }
    });

  } catch (error) {
    logger.error('Client creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Client creation failed',
        code: 'CREATION_ERROR'
      }
    });
  }
});

/**
 * GET /api/clients/:id
 * Get client by ID
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Valid client ID is required')
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

    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(l.id) as total_licenses,
        COUNT(l.id) FILTER (WHERE l.status = 'active') as active_licenses
      FROM clients c
      LEFT JOIN licenses l ON c.id = l.client_id
      WHERE c.id = $1 AND c.is_active = true
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Client not found',
          code: 'CLIENT_NOT_FOUND'
        }
      });
    }

    const client = result.rows[0];

    res.json({
      success: true,
      data: {
        client: {
          ...client,
          total_licenses: parseInt(client.total_licenses),
          active_licenses: parseInt(client.active_licenses)
        }
      }
    });

  } catch (error) {
    logger.error('Client retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve client',
        code: 'RETRIEVAL_ERROR'
      }
    });
  }
});

/**
 * PUT /api/clients/:id
 * Update client
 */
router.put('/:id', [
  param('id').isUUID().withMessage('Valid client ID is required'),
  body('client_name')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Client name must be 2-200 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('client_type')
    .optional()
    .isIn(['individual', 'corporate', 'enterprise', 'trial'])
    .withMessage('Invalid client type')
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

    const { id } = req.params;
    const updateFields = req.body;

    // Check if client exists
    const existingClient = await db.query(
      'SELECT id FROM clients WHERE id = $1 AND is_active = true',
      [id]
    );

    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Client not found',
          code: 'CLIENT_NOT_FOUND'
        }
      });
    }

    // Check email uniqueness if email is being updated
    if (updateFields.email) {
      const emailCheck = await db.query(
        'SELECT id FROM clients WHERE email = $1 AND id != $2',
        [updateFields.email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already exists for another client',
            code: 'EMAIL_EXISTS'
          }
        });
      }
    }

    // Build update query
    const updateKeys = Object.keys(updateFields);
    const updateValues = Object.values(updateFields);
    const setClause = updateKeys.map((key, index) => `${key} = $${index + 2}`).join(', ');

    const result = await db.query(`
      UPDATE clients 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, ...updateValues]);

    logger.info('Client updated successfully', {
      client_id: id,
      updated_fields: updateKeys
    });

    res.json({
      success: true,
      data: {
        client: result.rows[0]
      }
    });

  } catch (error) {
    logger.error('Client update error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Client update failed',
        code: 'UPDATE_ERROR'
      }
    });
  }
});

/**
 * GET /api/clients/:id/licenses
 * Get all licenses for a client
 */
router.get('/:id/licenses', [
  param('id').isUUID().withMessage('Valid client ID is required'),
  query('status').optional().isIn(['active', 'expired', 'suspended', 'revoked', 'pending']).withMessage('Invalid status')
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

    const { id } = req.params;
    const status = req.query.status;

    let whereClause = 'WHERE l.client_id = $1';
    const queryParams = [id];

    if (status) {
      whereClause += ' AND l.status = $2';
      queryParams.push(status);
    }

    const result = await db.query(`
      SELECT 
        l.id, l.license_key, l.license_name, l.status, l.issue_date,
        l.start_date, l.expiry_date, l.max_users, l.current_users,
        l.max_locations, l.current_locations, l.is_trial, l.auto_renew,
        l.last_validated, l.validation_count,
        p.product_name, p.version as product_version
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `, queryParams);

    res.json({
      success: true,
      data: {
        client_id: id,
        licenses: result.rows
      }
    });

  } catch (error) {
    logger.error('Client licenses retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve client licenses',
        code: 'RETRIEVAL_ERROR'
      }
    });
  }
});

// Helper function to generate client code
async function generateClientCode(clientName) {
  try {
    // Generate base code from client name
    const baseCode = clientName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6);
    
    let clientCode = baseCode;
    let counter = 1;
    
    // Check for uniqueness
    while (true) {
      const existing = await db.query(
        'SELECT id FROM clients WHERE client_code = $1',
        [clientCode]
      );
      
      if (existing.rows.length === 0) {
        break;
      }
      
      clientCode = `${baseCode}${counter.toString().padStart(2, '0')}`;
      counter++;
      
      if (counter > 99) {
        // Fallback to random code if too many conflicts
        clientCode = `CLI${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        break;
      }
    }
    
    return clientCode;
  } catch (error) {
    logger.error('Client code generation error:', error);
    return `CLI${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}

module.exports = router;
