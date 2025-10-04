const logger = require('../utils/logger');
const db = require('../config/database');

// Audit log entry types
const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  VIEW: 'VIEW',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ASSIGN: 'ASSIGN',
  EXPORT: 'EXPORT',
  PRINT: 'PRINT',
};

// Sensitive fields to exclude from logging
const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'secret',
  'private_key',
  'api_key',
];

// Clean data by removing sensitive fields
const cleanData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const cleaned = { ...data };
  
  for (const field of SENSITIVE_FIELDS) {
    if (cleaned[field]) {
      cleaned[field] = '[REDACTED]';
    }
  }
  
  // Recursively clean nested objects
  Object.keys(cleaned).forEach(key => {
    if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      cleaned[key] = cleanData(cleaned[key]);
    }
  });
  
  return cleaned;
};

// Create audit log entry
const createAuditLog = async (auditData) => {
  try {
    const {
      user_id,
      action,
      resource_type,
      resource_id,
      old_values,
      new_values,
      ip_address,
      user_agent,
      details,
    } = auditData;

    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, details,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await db.execute(query, [
      user_id || null,
      action,
      resource_type,
      resource_id || null,
      old_values ? JSON.stringify(cleanData(old_values)) : null,
      new_values ? JSON.stringify(cleanData(new_values)) : null,
      ip_address,
      user_agent,
      details || null,
    ]);

    logger.info('Audit log created', {
      user_id,
      action,
      resource_type,
      resource_id,
      ip_address,
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw error to avoid disrupting the main operation
  }
};

// Middleware for automatic audit logging
const auditLogger = (options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Store original data for comparison
    req.auditData = {
      action: options.action || getActionFromMethod(req.method),
      resource_type: options.resource_type || getResourceTypeFromPath(req.path),
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent'),
      user_id: req.user?.id,
      timestamp: new Date(),
      old_values: options.includeOldValues ? await getOldValues(req) : null,
    };

    // Override response methods to capture response data
    res.send = function(data) {
      res.locals.responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };

    // Continue with the request
    next();
  };
};

// Post-response audit logging
const logAuditTrail = async (req, res, next) => {
  try {
    // Only log successful operations (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const auditData = {
        user_id: req.user?.id,
        action: req.auditData?.action,
        resource_type: req.auditData?.resource_type,
        resource_id: getResourceId(req),
        old_values: req.auditData?.old_values,
        new_values: getNewValues(req, res),
        ip_address: req.auditData?.ip_address,
        user_agent: req.auditData?.user_agent,
        details: getAuditDetails(req, res),
      };

      await createAuditLog(auditData);
    }
  } catch (error) {
    logger.error('Audit logging failed:', error);
  }
  
  next();
};

// Helper functions
const getActionFromMethod = (method) => {
  const actionMap = {
    'POST': AUDIT_ACTIONS.CREATE,
    'PUT': AUDIT_ACTIONS.UPDATE,
    'PATCH': AUDIT_ACTIONS.UPDATE,
    'DELETE': AUDIT_ACTIONS.DELETE,
    'GET': AUDIT_ACTIONS.VIEW,
  };
  return actionMap[method] || 'UNKNOWN';
};

const getResourceTypeFromPath = (path) => {
  // Extract resource type from API path
  const match = path.match(/\/api\/([^\/]+)/);
  return match ? match[1].toUpperCase() : 'UNKNOWN';
};

const getResourceId = (req) => {
  // Try to get ID from params, response data, or body
  if (req.params.id) return req.params.id;
  if (req.body.id) return req.body.id;
  return null;
};

const getNewValues = (req, res) => {
  const responseData = res.locals.responseData;
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    return responseData || req.body;
  }
  return null;
};

const getOldValues = async (req) => {
  // This would need to be implemented based on your specific use case
  // For now, return null
  return null;
};

const getAuditDetails = (req, res) => {
  const details = {
    method: req.method,
    path: req.path,
    query: req.query,
    status_code: res.statusCode,
  };

  // Add specific details for different actions
  if (req.body?.status && req.auditData?.action === AUDIT_ACTIONS.UPDATE) {
    details.status_change = req.body.status;
  }

  if (req.body?.assigned_to && req.auditData?.action === AUDIT_ACTIONS.ASSIGN) {
    details.assigned_to = req.body.assigned_to;
  }

  return JSON.stringify(details);
};

// Specific audit functions for common operations
const auditFunctions = {
  login: async (user_id, ip_address, user_agent, success = true) => {
    await createAuditLog({
      user_id,
      action: AUDIT_ACTIONS.LOGIN,
      resource_type: 'AUTH',
      ip_address,
      user_agent,
      details: JSON.stringify({ success }),
    });
  },

  logout: async (user_id, ip_address, user_agent) => {
    await createAuditLog({
      user_id,
      action: AUDIT_ACTIONS.LOGOUT,
      resource_type: 'AUTH',
      ip_address,
      user_agent,
    });
  },

  approve: async (user_id, resource_type, resource_id, ip_address) => {
    await createAuditLog({
      user_id,
      action: AUDIT_ACTIONS.APPROVE,
      resource_type,
      resource_id,
      ip_address,
    });
  },

  reject: async (user_id, resource_type, resource_id, reason, ip_address) => {
    await createAuditLog({
      user_id,
      action: AUDIT_ACTIONS.REJECT,
      resource_type,
      resource_id,
      ip_address,
      details: JSON.stringify({ reason }),
    });
  },

  export: async (user_id, resource_type, format, ip_address) => {
    await createAuditLog({
      user_id,
      action: AUDIT_ACTIONS.EXPORT,
      resource_type,
      ip_address,
      details: JSON.stringify({ format }),
    });
  },
};

module.exports = {
  AUDIT_ACTIONS,
  auditLogger,
  logAuditTrail,
  createAuditLog,
  auditFunctions,
};