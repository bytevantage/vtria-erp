/**
 * Authentication Controller for VTRIA ERP
 * Handles user authentication, registration, and JWT token management
 * WAMP Server Compatible with License Validation
 */

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User, Role, UserRole } = require('../models');
const { generateToken } = require('../middleware/auth');
const { validateLicenseKey } = require('../middleware/license');
const logger = require('../utils/logger');

/**
 * User Login Controller
 * POST /api/auth/login
 */
const login = async (req, res) => {
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

    const { email, password } = req.body;

    // Find user with roles
    const user = await User.findOne({
      where: { email, is_active: true },
      include: [{
        model: Role,
        through: { model: UserRole, where: { is_active: true } },
        attributes: ['id', 'name', 'permissions', 'level']
      }]
    });

    if (!user) {
      logger.warn(`Login attempt with invalid email: ${email}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login attempt with invalid password for: ${email}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    // Check license user limit before allowing login
    if (req.license && req.license.maxUsers) {
      const activeUserCount = await User.count({ where: { is_active: true } });
      const currentlyLoggedIn = await User.count({ 
        where: { 
          is_active: true,
          last_login: { [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });
      
      if (currentlyLoggedIn >= req.license.maxUsers && !user.last_login) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Maximum concurrent user limit reached',
            code: 'USER_LIMIT_EXCEEDED'
          }
        });
      }
    }

    // Update last login timestamp
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user, user.Roles);

    logger.info(`User ${email} logged in successfully from IP: ${req.ip}`);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          employee_id: user.employee_id,
          department: user.department,
          locations: user.locations,
          roles: user.Roles.map(role => ({
            id: role.id,
            name: role.name,
            level: role.level
          })),
          last_login: user.last_login
        },
        license: req.license ? {
          features: req.license.features,
          expiresAt: req.license.expiresAt,
          maxUsers: req.license.maxUsers
        } : null
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        code: 'LOGIN_ERROR'
      }
    });
  }
};

/**
 * User Registration Controller
 * POST /api/auth/register
 */
const register = async (req, res) => {
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

    const { email, password, first_name, last_name, employee_id, department } = req.body;

    // Check license user limit
    if (req.license && req.license.maxUsers) {
      const activeUserCount = await User.count({ where: { is_active: true } });
      if (activeUserCount >= req.license.maxUsers) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Maximum user limit reached for current license',
            code: 'USER_LIMIT_EXCEEDED'
          }
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User already exists',
          code: 'USER_EXISTS'
        }
      });
    }

    // Check if employee ID already exists
    if (employee_id) {
      const existingEmployeeId = await User.findOne({ where: { employee_id } });
      if (existingEmployeeId) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Employee ID already exists',
            code: 'EMPLOYEE_ID_EXISTS'
          }
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      first_name,
      last_name,
      employee_id,
      department,
      // phone field removed as it doesn't exist in the database
      locations: req.license?.locations || ['Mangalore'] // Default to available locations
    });

    // Assign default User role
    const userRole = await Role.findOne({ where: { name: 'User' } });
    if (userRole) {
      await UserRole.create({
        user_id: user.id,
        role_id: userRole.id,
        assigned_by: req.user?.id || user.id
      });
    }

    logger.info(`New user registered: ${email} by ${req.user?.email || 'system'}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          employee_id: user.employee_id,
          department: user.department
        }
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      }
    });
  }
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Role,
        through: { model: UserRole, where: { is_active: true } },
        attributes: ['id', 'name', 'permissions', 'level']
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: { 
        user,
        license: req.license ? {
          features: req.license.features,
          expiresAt: req.license.expiresAt,
          maxUsers: req.license.maxUsers,
          locations: req.license.locations
        } : null
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get profile',
        code: 'PROFILE_ERROR'
      }
    });
  }
};

/**
 * Refresh JWT Token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Role,
        through: { model: UserRole, where: { is_active: true } },
        attributes: ['id', 'name', 'permissions', 'level']
      }]
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found or inactive',
          code: 'USER_INACTIVE'
        }
      });
    }

    const token = generateToken(user, user.Roles);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Token refresh failed',
        code: 'REFRESH_ERROR'
      }
    });
  }
};

/**
 * User Logout
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Update user's last activity
    await User.update(
      { last_login: new Date() },
      { where: { id: req.user.id } }
    );

    logger.info(`User ${req.user.email} logged out`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        code: 'LOGOUT_ERROR'
      }
    });
  }
};

/**
 * Get License Status (Admin only)
 * GET /api/auth/license-status
 */
const getLicenseStatus = async (req, res) => {
  try {
    const licenseKey = process.env.LICENSE_KEY;
    if (!licenseKey) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'No license key configured',
          code: 'NO_LICENSE_KEY'
        }
      });
    }

    const { getLicenseStatus: getLicenseStatusUtil } = require('../middleware/license');
    const status = await getLicenseStatusUtil(licenseKey);

    res.json({
      success: true,
      data: { licenseStatus: status }
    });
  } catch (error) {
    logger.error('License status error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get license status',
        code: 'LICENSE_STATUS_ERROR'
      }
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  refreshToken,
  logout,
  getLicenseStatus
};
