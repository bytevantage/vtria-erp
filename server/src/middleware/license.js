/**
 * License Validation Middleware for VTRIA ERP
 * Validates license key via REST API calls to licenses.bytevantage.in
 * Restricts access if license is invalid or expired
 */

const axios = require('axios');
const logger = require('../utils/logger');
const os = require('os');

// License validation cache to avoid excessive API calls
const licenseCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const LICENSE_API_BASE = 'https://licenses.bytevantage.in/api';

/**
 * Get active user count from database
 */
const getActiveUserCount = async () => {
  try {
    const { User } = require('../models');
    return await User.count({ where: { is_active: true } });
  } catch (error) {
    logger.error('Error getting active user count:', error);
    return 1; // Default value on error
  }
};

/**
 * Get active location count from database
 */
const getActiveLocationCount = async () => {
  try {
    const { Location } = require('../models');
    return await Location.count();
  } catch (error) {
    logger.error('Error getting active location count:', error);
    return 1; // Default value on error
  }
};

/**
 * Validate license key with ByteVantage API
 * @param {string} licenseKey - The license key to validate
 * @param {object} req - Express request object
 * @returns {Promise<Object>} License validation result
 */
const validateLicenseKey = async (licenseKey, req) => {
  try {
    // Check cache first
    const cacheKey = `license_${licenseKey}`;
    const cached = licenseCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      logger.debug('Using cached license validation result');
      return cached.data;
    }

    // Make API call to ByteVantage licensing server
    const response = await axios.post(`${LICENSE_API_BASE}/licenses/validate`, {
      license_key: licenseKey,
      client_info: {
        ip: req.ip,
        hostname: os.hostname(),
        user_agent: req.get('User-Agent')
      },
      usage_data: {
        active_users: await getActiveUserCount(),
        active_locations: await getActiveLocationCount(),
        api_calls: 1
      }
    }, {
      headers: {
        'X-API-Key': process.env.BYTEVANTAGE_API_KEY || 'default-api-key',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    const validationResult = {
      isValid: response.data.valid === true,
      expiresAt: response.data.expires_at,
      features: response.data.features || [],
      maxUsers: response.data.max_users || 10,
      locations: response.data.locations || ['Mangalore', 'Bangalore', 'Pune'],
      message: response.data.message || 'License validated successfully'
    };

    // Cache the result
    licenseCache.set(cacheKey, {
      data: validationResult,
      timestamp: Date.now()
    });

    logger.info(`License validation successful for key: ${licenseKey.substring(0, 8)}...`);
    return validationResult;

  } catch (error) {
    logger.error('License validation failed:', error.message);
    
    // Return invalid result on API failure
    return {
      isValid: false,
      message: 'License validation service unavailable',
      error: error.message
    };
  }
};

/**
 * License validation middleware
 * Checks for valid license before allowing access to protected routes
 */
const licenseMiddleware = async (req, res, next) => {
  try {
    // Skip license check for health endpoint and auth login
    const skipPaths = ['/health', '/api/auth/login'];
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // DEVELOPMENT MODE: Skip license validation for development
    if (process.env.NODE_ENV === 'development') {
      // Add mock license data to request
      req.license = {
        isValid: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        features: ['case_management', 'ticket_management', 'stock_management', 'document_management', 'reporting', 'premium_support'],
        maxUsers: 100,
        locations: ['Mangalore', 'Bangalore', 'Pune'],
        message: 'Development mode - license check bypassed'
      };
      logger.debug('Development mode - license validation bypassed');
      return next();
    }

    // Get license key from environment or request headers
    const licenseKey = process.env.LICENSE_KEY || req.headers['x-license-key'];
    
    if (!licenseKey) {
      logger.warn('No license key provided');
      return res.status(403).json({
        error: {
          message: 'License key required',
          code: 'NO_LICENSE_KEY'
        }
      });
    }

    // Validate license
    const validation = await validateLicenseKey(licenseKey, req);
    
    if (!validation.isValid) {
      logger.warn(`Invalid license key: ${licenseKey.substring(0, 8)}...`);
      return res.status(403).json({
        error: {
          message: validation.message || 'Invalid license key',
          code: 'INVALID_LICENSE'
        }
      });
    }

    // Check if license is expired
    if (validation.expiresAt && new Date(validation.expiresAt) < new Date()) {
      logger.warn(`Expired license key: ${licenseKey.substring(0, 8)}...`);
      return res.status(403).json({
        error: {
          message: 'License has expired',
          code: 'LICENSE_EXPIRED',
          expiresAt: validation.expiresAt
        }
      });
    }

    // Attach license info to request for use in other middleware/routes
    req.license = validation;
    
    logger.debug('License validation passed');
    next();

  } catch (error) {
    logger.error('License middleware error:', error);
    return res.status(500).json({
      error: {
        message: 'License validation error',
        code: 'LICENSE_ERROR'
      }
    });
  }
};

/**
 * Feature-based access control middleware
 * Checks if license includes specific features
 * @param {string|Array} requiredFeatures - Required feature(s)
 */
const requireFeature = (requiredFeatures) => {
  return (req, res, next) => {
    if (!req.license) {
      return res.status(403).json({
        error: {
          message: 'License validation required',
          code: 'NO_LICENSE_INFO'
        }
      });
    }

    const features = req.license.features || [];
    const required = Array.isArray(requiredFeatures) ? requiredFeatures : [requiredFeatures];
    
    const hasRequiredFeature = required.some(feature => features.includes(feature));
    
    if (!hasRequiredFeature) {
      logger.warn(`Feature access denied. Required: ${required.join(', ')}, Available: ${features.join(', ')}`);
      return res.status(403).json({
        error: {
          message: 'Feature not available in current license',
          code: 'FEATURE_NOT_LICENSED',
          required: required,
          available: features
        }
      });
    }

    next();
  };
};

/**
 * User limit check middleware
 * Ensures active users don't exceed license limit
 */
const checkUserLimit = async (req, res, next) => {
  try {
    if (!req.license || !req.license.maxUsers) {
      return next();
    }

    // This would typically check active user count from database
    // For now, we'll implement a basic check
    const { User } = require('../models');
    const activeUserCount = await User.count({ where: { is_active: true } });
    
    if (activeUserCount >= req.license.maxUsers) {
      logger.warn(`User limit exceeded: ${activeUserCount}/${req.license.maxUsers}`);
      return res.status(403).json({
        error: {
          message: 'Maximum user limit reached for current license',
          code: 'USER_LIMIT_EXCEEDED',
          current: activeUserCount,
          limit: req.license.maxUsers
        }
      });
    }

    next();
  } catch (error) {
    logger.error('User limit check error:', error);
    next(); // Continue on error to avoid blocking
  }
};

/**
 * Get current license status
 * Utility function for admin dashboard
 */
const getLicenseStatus = async (licenseKey, req) => {
  try {
    const validation = await validateLicenseKey(licenseKey, req);
    return {
      ...validation,
      cacheSize: licenseCache.size,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Clear license cache
 * Utility function for forcing license revalidation
 */
const clearLicenseCache = () => {
  licenseCache.clear();
  logger.info('License cache cleared');
};

module.exports = {
  licenseMiddleware,
  requireFeature,
  checkUserLimit,
  getLicenseStatus,
  clearLicenseCache,
  validateLicenseKey
};
