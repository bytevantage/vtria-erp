import DOMPurify from 'dompurify';

/**
 * VTRIA ERP Security Utilities
 * Provides client-side security functions
 */

/**
 * Role-based access control constants
 */
export const ROLES = {
  DIRECTOR: 'director',
  ADMIN: 'admin', 
  SALES_ADMIN: 'sales-admin',
  DESIGNER: 'designer',
  ACCOUNTS: 'accounts',
  TECHNICIAN: 'technician'
};

export const LOCATIONS = {
  MANGALORE: 'mangalore',
  BANGALORE: 'bangalore',
  PUNE: 'pune'
};

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY = {
  [ROLES.DIRECTOR]: 6,
  [ROLES.ADMIN]: 5,
  [ROLES.SALES_ADMIN]: 4,
  [ROLES.DESIGNER]: 3,
  [ROLES.ACCOUNTS]: 3,
  [ROLES.TECHNICIAN]: 2
};

/**
 * Input sanitization utilities
 */
export const sanitize = {
  /**
   * Sanitize HTML input to prevent XSS attacks
   * @param {string} input - Raw HTML input
   * @returns {string} Sanitized HTML
   */
  html: (input) => {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  },

  /**
   * Sanitize text input for safe display
   * @param {string} input - Raw text input
   * @returns {string} Sanitized text
   */
  text: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>'"&]/g, (match) => {
        const entities = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[match];
      })
      .trim();
  },

  /**
   * Sanitize file names for safe storage
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  filename: (filename) => {
    if (typeof filename !== 'string') return '';
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
};

/**
 * Validation utilities
 */
export const validate = {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {object} Validation result with score and feedback
   */
  password: (password) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommon: !isCommonPassword(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const strength = score < 4 ? 'weak' : score < 6 ? 'medium' : 'strong';

    return {
      isValid: score === 6,
      strength,
      score,
      checks,
      feedback: getPasswordFeedback(checks)
    };
  },

  /**
   * Validate file upload
   * @param {File} file - File to validate
   * @returns {object} Validation result
   */
  file: (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB
    
    const checks = {
      type: allowedTypes.includes(file.type),
      size: file.size <= maxSize,
      name: /^[a-zA-Z0-9._-]+$/.test(file.name)
    };

    return {
      isValid: Object.values(checks).every(Boolean),
      checks,
      errors: getFileValidationErrors(checks, file)
    };
  }
};

/**
 * Permission checking utilities
 */
export const permissions = {
  /**
   * Check if user has required role or higher
   * @param {string} userRole - User's current role
   * @param {string} requiredRole - Required role for access
   * @returns {boolean} Has permission
   */
  hasRole: (userRole, requiredRole) => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  },

  /**
   * Check if user can access specific location
   * @param {string} userLocation - User's location
   * @param {string} targetLocation - Target location
   * @param {string} userRole - User's role
   * @returns {boolean} Can access location
   */
  canAccessLocation: (userLocation, targetLocation, userRole) => {
    // Directors and admins can access all locations
    if ([ROLES.DIRECTOR, ROLES.ADMIN].includes(userRole)) {
      return true;
    }
    
    // Others can only access their assigned location
    return userLocation === targetLocation;
  },

  /**
   * Check if user can perform specific action
   * @param {string} action - Action to check
   * @param {object} user - User object with role and location
   * @param {object} resource - Resource being accessed
   * @returns {boolean} Can perform action
   */
  canPerformAction: (action, user, resource = {}) => {
    const actionPermissions = {
      // User management
      'users.create': [ROLES.DIRECTOR, ROLES.ADMIN],
      'users.edit': [ROLES.DIRECTOR, ROLES.ADMIN],
      'users.delete': [ROLES.DIRECTOR],
      
      // Client management
      'clients.create': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.SALES_ADMIN],
      'clients.edit': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.SALES_ADMIN],
      'clients.view': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.SALES_ADMIN, ROLES.DESIGNER],
      
      // Financial data
      'finance.view': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.ACCOUNTS],
      'finance.edit': [ROLES.DIRECTOR, ROLES.ACCOUNTS],
      
      // Manufacturing
      'manufacturing.view': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.TECHNICIAN],
      'manufacturing.edit': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.TECHNICIAN],
      
      // Quotations and estimates
      'quotations.create': [ROLES.DIRECTOR, ROLES.ADMIN, ROLES.SALES_ADMIN, ROLES.DESIGNER],
      'quotations.approve': [ROLES.DIRECTOR, ROLES.ADMIN],
      
      // System settings
      'settings.view': [ROLES.DIRECTOR, ROLES.ADMIN],
      'settings.edit': [ROLES.DIRECTOR]
    };

    const allowedRoles = actionPermissions[action];
    if (!allowedRoles) return false;

    // Check role permission
    const hasRolePermission = allowedRoles.includes(user.role);
    if (!hasRolePermission) return false;

    // Check location-based access if resource has location
    if (resource.location) {
      return this.canAccessLocation(user.location, resource.location, user.role);
    }

    return true;
  }
};

/**
 * Session security utilities
 */
export const session = {
  /**
   * Get secure session storage
   */
  getStorage: () => {
    return window.sessionStorage;
  },

  /**
   * Securely store session data
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem: (key, value) => {
    try {
      const storage = session.getStorage();
      const secureValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        checksum: generateChecksum(value)
      });
      storage.setItem(key, secureValue);
    } catch (error) {
      console.error('Session storage failed:', error);
    }
  },

  /**
   * Securely retrieve session data
   * @param {string} key - Storage key
   * @returns {any} Retrieved value or null
   */
  getItem: (key) => {
    try {
      const storage = session.getStorage();
      const storedValue = storage.getItem(key);
      
      if (!storedValue) return null;

      const parsed = JSON.parse(storedValue);
      
      // Verify checksum
      if (parsed.checksum !== generateChecksum(parsed.data)) {
        console.warn('Session data integrity check failed');
        storage.removeItem(key);
        return null;
      }

      // Check expiration (8 hours)
      const maxAge = 8 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        storage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Session retrieval failed:', error);
      return null;
    }
  },

  /**
   * Clear all session data
   */
  clear: () => {
    try {
      session.getStorage().clear();
    } catch (error) {
      console.error('Session clear failed:', error);
    }
  }
};

/**
 * Security event logging
 */
export const securityLogger = {
  /**
   * Log security event
   * @param {string} event - Event type
   * @param {object} details - Event details
   */
  log: (event, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...details
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', logEntry);
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.error('Failed to log security event:', error);
      });
    }
  }
};

/**
 * Helper functions
 */
function isCommonPassword(password) {
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  return commonPasswords.includes(password.toLowerCase());
}

function getPasswordFeedback(checks) {
  const feedback = [];
  
  if (!checks.length) feedback.push('Password must be at least 12 characters long');
  if (!checks.uppercase) feedback.push('Add at least one uppercase letter');
  if (!checks.lowercase) feedback.push('Add at least one lowercase letter');
  if (!checks.number) feedback.push('Add at least one number');
  if (!checks.special) feedback.push('Add at least one special character');
  if (!checks.noCommon) feedback.push('Avoid common passwords');
  
  return feedback;
}

function getFileValidationErrors(checks, file) {
  const errors = [];
  
  if (!checks.type) errors.push(`File type '${file.type}' is not allowed`);
  if (!checks.size) errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 10MB limit`);
  if (!checks.name) errors.push('File name contains invalid characters');
  
  return errors;
}

function generateChecksum(data) {
  // Simple checksum for client-side integrity checking
  const str = JSON.stringify(data);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash.toString(36);
}

/**
 * Content Security Policy helpers
 */
export const csp = {
  /**
   * Generate nonce for inline scripts
   * @returns {string} Nonce value
   */
  generateNonce: () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  },

  /**
   * Check if external resource is allowed
   * @param {string} url - Resource URL
   * @returns {boolean} Is allowed
   */
  isAllowedResource: (url) => {
    const allowedDomains = [
      'localhost',
      'vtria-erp.com',
      'api.vtria-erp.com',
      'cdn.vtria-erp.com'
    ];

    try {
      const urlObj = new URL(url);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }
};

export default {
  ROLES,
  LOCATIONS,
  sanitize,
  validate,
  permissions,
  session,
  securityLogger,
  csp
};