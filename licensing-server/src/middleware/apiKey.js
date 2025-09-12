/**
 * API Key Middleware for ByteVantage Licensing Server
 * Validates API keys for accessing licensing endpoints
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * API Key validation middleware
 */
const apiKeyMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key is required',
          code: 'API_KEY_REQUIRED'
        }
      });
    }

    // Validate API key format (basic check)
    if (apiKey.length < 32) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid API key format',
          code: 'INVALID_API_KEY_FORMAT'
        }
      });
    }

    // Check API key in database
    const result = await db.query(`
      SELECT 
        ak.id, ak.key_name, ak.permissions, ak.rate_limit, ak.is_active,
        ak.expires_at, ak.last_used,
        c.id as client_id, c.client_name, c.is_active as client_active
      FROM api_keys ak
      LEFT JOIN clients c ON ak.client_id = c.id
      WHERE ak.api_key = $1
    `, [apiKey]);

    if (result.rows.length === 0) {
      logger.warn('Invalid API key attempt', {
        api_key: apiKey.substring(0, 8) + '...',
        ip: req.ip,
        user_agent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }
      });
    }

    const apiKeyData = result.rows[0];

    // Check if API key is active
    if (!apiKeyData.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key is inactive',
          code: 'API_KEY_INACTIVE'
        }
      });
    }

    // Check if API key has expired
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'API key has expired',
          code: 'API_KEY_EXPIRED'
        }
      });
    }

    // Check if associated client is active (if applicable)
    if (apiKeyData.client_id && !apiKeyData.client_active) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Associated client is inactive',
          code: 'CLIENT_INACTIVE'
        }
      });
    }

    // Check rate limiting (basic implementation)
    const rateLimitKey = `rate_limit:${apiKeyData.id}`;
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    
    // In a production environment, you'd use Redis for rate limiting
    // For now, we'll do a simple database-based check
    const rateLimitCheck = await checkRateLimit(apiKeyData.id, apiKeyData.rate_limit);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            limit: apiKeyData.rate_limit,
            reset_time: rateLimitCheck.reset_time
          }
        }
      });
    }

    // Update last used timestamp (async, don't wait)
    updateLastUsed(apiKeyData.id).catch(error => {
      logger.error('Failed to update API key last used:', error);
    });

    // Add API key info to request object
    req.apiKey = {
      id: apiKeyData.id,
      name: apiKeyData.key_name,
      permissions: apiKeyData.permissions,
      client_id: apiKeyData.client_id,
      client_name: apiKeyData.client_name
    };

    next();

  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'API key validation failed',
        code: 'VALIDATION_ERROR'
      }
    });
  }
};

/**
 * Check rate limit for API key
 */
async function checkRateLimit(apiKeyId, rateLimit) {
  try {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);

    // Count requests in current hour
    const result = await db.query(`
      SELECT COUNT(*) as request_count
      FROM license_validations
      WHERE created_at >= $1
      AND validation_key IN (
        SELECT api_key FROM api_keys WHERE id = $2
      )
    `, [currentHour, apiKeyId]);

    const requestCount = parseInt(result.rows[0].request_count);
    const allowed = requestCount < rateLimit;
    
    const nextHour = new Date(currentHour);
    nextHour.setHours(nextHour.getHours() + 1);

    return {
      allowed,
      current_count: requestCount,
      limit: rateLimit,
      reset_time: nextHour.toISOString()
    };

  } catch (error) {
    logger.error('Rate limit check error:', error);
    // Allow request if rate limit check fails
    return { allowed: true };
  }
}

/**
 * Update API key last used timestamp
 */
async function updateLastUsed(apiKeyId) {
  try {
    await db.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
      [apiKeyId]
    );
  } catch (error) {
    logger.error('Failed to update last used timestamp:', error);
  }
}

/**
 * Check if API key has specific permission
 */
function hasPermission(req, permission) {
  if (!req.apiKey || !req.apiKey.permissions) {
    return false;
  }

  const permissions = req.apiKey.permissions;
  
  // If permissions is a wildcard or contains the specific permission
  return permissions === '*' || 
         permissions.includes(permission) ||
         (typeof permissions === 'object' && permissions[permission] === true);
}

module.exports = {
  apiKeyMiddleware,
  hasPermission
};
