/**
 * User Management Routes for VTRIA ERP
 * Admin functions for user management
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { User, Role, UserRole } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/users
 * Get all users (Admin/Manager only)
 */
router.get('/', authorize(['Director', 'Manager']), async (req, res) => {
  try {
    const { page = 1, limit = 20, active_only = true } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (active_only === 'true') where.is_active = true;

    const users = await User.findAndCountAll({
      where,
      include: [{
        model: Role,
        through: { model: UserRole, where: { is_active: true } },
        attributes: ['id', 'name', 'level']
      }],
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['first_name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: {
          total: users.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(users.count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch users' }
    });
  }
});

/**
 * PUT /api/users/:id/roles
 * Assign roles to user (Director only)
 */
router.put('/:id/roles', [
  param('id').isUUID(),
  body('role_ids').isArray()
], authorize(['Director']), async (req, res) => {
  try {
    const { role_ids } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    // Remove existing roles
    await UserRole.destroy({ where: { user_id: user.id } });

    // Add new roles
    const userRoles = role_ids.map(role_id => ({
      user_id: user.id,
      role_id,
      assigned_by: req.user.id
    }));

    await UserRole.bulkCreate(userRoles);

    res.json({
      success: true,
      message: 'User roles updated successfully'
    });
  } catch (error) {
    logger.error('Update user roles error:', error);
    res.status(500).json({
      error: { message: 'Failed to update user roles' }
    });
  }
});

module.exports = router;
