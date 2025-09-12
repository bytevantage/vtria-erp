/**
 * JWT Authentication Middleware with Role-Based Access Control (RBAC)
 * Supports multi-group users for VTRIA ERP System
 * Roles: Director, Manager, Sales Admin, Engineer, etc.
 */

const jwt = require('jsonwebtoken');
const { User, Role, UserRole } = require('../models');
const logger = require('../utils/logger');

// JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'vtria-erp-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object with id and email
 * @param {Array} roles - Array of user roles
 * @returns {String} JWT token
 */
const generateToken = (user, roles = []) => {
  const payload = {
    userId: user.id,
    email: user.email,
    roles: roles.map(role => ({
      id: role.id,
      name: role.name,
      permissions: role.permissions
    })),
    locations: user.locations || [], // Multi-location support
    timestamp: Date.now()
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify JWT token and extract user information
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.warn('Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Access denied. No token provided.',
          code: 'NO_TOKEN'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Fetch user with current roles (in case roles changed)
    const user = await User.findByPk(decoded.userId, {
      include: [{
        model: Role,
        through: { model: UserRole },
        attributes: ['id', 'name', 'permissions', 'level']
      }],
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: {
          message: 'User not found or inactive.',
          code: 'USER_INACTIVE'
        }
      });
    }

    // Attach user and roles to request object
    req.user = {
      ...user.toJSON(),
      roles: user.Roles || [],
      token: decoded
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      error: {
        message: error.message || 'Authentication failed',
        code: 'AUTH_FAILED'
      }
    });
  }
};

/**
 * Authorization middleware - checks if user has required role(s)
 * @param {Array|String} requiredRoles - Required role names
 * @returns {Function} Middleware function
 */
const authorize = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    const userRoles = req.user.roles.map(role => role.name);
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Check if user has any of the required roles
    const hasRequiredRole = rolesArray.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn(`Access denied for user ${req.user.email}. Required: ${rolesArray.join(', ')}, Has: ${userRoles.join(', ')}`);
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: rolesArray,
          current: userRoles
        }
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 * @param {Array|String} requiredPermissions - Required permission names
 * @returns {Function} Middleware function
 */
const authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    const userPermissions = [];
    req.user.roles.forEach(role => {
      if (role.permissions) {
        userPermissions.push(...role.permissions);
      }
    });

    const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const hasRequiredPermission = permissionsArray.some(permission => userPermissions.includes(permission));

    if (!hasRequiredPermission) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissionsArray,
          current: userPermissions
        }
      });
    }

    next();
  };
};

/**
 * Location-based authorization middleware
 * Ensures user can only access data from their assigned locations
 * @param {Boolean} strict - If true, user must have explicit location access
 * @returns {Function} Middleware function
 */
const authorizeLocation = (strict = false) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    const userLocations = req.user.locations || [];
    const requestedLocation = req.params.location || req.body.location || req.query.location;

    // If no specific location requested and not strict, allow
    if (!requestedLocation && !strict) {
      return next();
    }

    // Directors and Managers typically have access to all locations
    const hasGlobalAccess = req.user.roles.some(role => 
      ['Director', 'Manager'].includes(role.name)
    );

    if (hasGlobalAccess) {
      return next();
    }

    // Check if user has access to requested location
    if (requestedLocation && !userLocations.includes(requestedLocation)) {
      return res.status(403).json({
        error: {
          message: 'Access denied for this location',
          code: 'LOCATION_ACCESS_DENIED',
          requested: requestedLocation,
          allowed: userLocations
        }
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await authenticate(req, res, next);
    } else {
      next();
    }
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  authorizePermission,
  authorizeLocation,
  optionalAuth
};
