/**
 * Case Queue Routes for VTRIA ERP
 * REST API endpoints for queue management
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const CaseQueue = require('../models/CaseQueue');
const { authenticate } = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Apply middleware
router.use(authenticate);
// License middleware is applied globally in server.js

/**
 * GET /api/case-queues
 * Get all case queues
 */
router.get('/', async (req, res) => {
  try {
    const { location_id, department, is_active = true } = req.query;
    
    const where = {};
    if (location_id) where.location_id = location_id;
    if (department) where.department = department;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const queues = await CaseQueue.findAll({
      where,
      include: [{
        model: Location,
        as: 'location',
        attributes: ['id', 'name', 'code']
      }],
      order: [['sort_order', 'ASC'], ['queue_name', 'ASC']]
    });

    res.json({
      success: true,
      data: queues
    });

  } catch (error) {
    console.error('Get case queues error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch case queues'
    });
  }
});

/**
 * POST /api/case-queues
 * Create new case queue (Manager, Director only)
 */
router.post('/',
  rbac(['Manager', 'Director']),
  [
    body('queue_name').trim().isLength({ min: 3, max: 100 }).withMessage('Queue name must be 3-100 characters'),
    body('queue_code').trim().isLength({ min: 2, max: 20 }).withMessage('Queue code must be 2-20 characters'),
    body('department').trim().isLength({ min: 2, max: 50 }).withMessage('Department required'),
    body('location_id').isUUID().withMessage('Valid location ID required'),
    body('allowed_roles').isArray().withMessage('Allowed roles must be an array'),
    body('sla_hours').optional().isInt({ min: 1 }).withMessage('SLA hours must be positive integer')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const queue = await CaseQueue.create(req.body);

      res.status(201).json({
        success: true,
        data: queue,
        message: 'Case queue created successfully'
      });

    } catch (error) {
      console.error('Create case queue error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create case queue'
      });
    }
  }
);

/**
 * PUT /api/case-queues/:id
 * Update case queue (Manager, Director only)
 */
router.put('/:id',
  rbac(['Manager', 'Director']),
  [
    param('id').isUUID().withMessage('Invalid queue ID'),
    body('queue_name').optional().trim().isLength({ min: 3, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('allowed_roles').optional().isArray(),
    body('sla_hours').optional().isInt({ min: 1 }),
    body('is_active').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const queue = await CaseQueue.findByPk(req.params.id);
      if (!queue) {
        return res.status(404).json({
          success: false,
          error: 'Case queue not found'
        });
      }

      await queue.update(req.body);

      res.json({
        success: true,
        data: queue,
        message: 'Case queue updated successfully'
      });

    } catch (error) {
      console.error('Update case queue error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update case queue'
      });
    }
  }
);

module.exports = router;
