const db = require('../config/database');

// Define role permissions
const ROLE_PERMISSIONS = {
  director: {
    // Directors have full access to everything
    sales_enquiry: ['create', 'read', 'update', 'delete', 'approve'],
    estimation: ['create', 'read', 'update', 'delete', 'approve'],
    quotation: ['create', 'read', 'update', 'delete', 'approve'],
    sales_order: ['create', 'read', 'update', 'delete', 'approve'],
    purchase_order: ['create', 'read', 'update', 'delete', 'approve'],
    manufacturing: ['create', 'read', 'update', 'delete', 'approve'],
    inventory: ['create', 'read', 'update', 'delete', 'approve'],
    users: ['create', 'read', 'update', 'delete'],
    clients: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export']
  },
  
  admin: {
    // Admins have broad access but limited delete permissions
    sales_enquiry: ['create', 'read', 'update', 'approve'],
    estimation: ['create', 'read', 'update', 'approve'],
    quotation: ['create', 'read', 'update', 'approve'],
    sales_order: ['create', 'read', 'update', 'approve'],
    purchase_order: ['create', 'read', 'update', 'approve'],
    manufacturing: ['create', 'read', 'update'],
    inventory: ['create', 'read', 'update'],
    users: ['create', 'read', 'update'],
    clients: ['create', 'read', 'update'],
    reports: ['read', 'export']
  },
  
  'sales-admin': {
    // Sales admins focus on sales processes
    sales_enquiry: ['create', 'read', 'update', 'approve'],
    estimation: ['read', 'update'],
    quotation: ['create', 'read', 'update', 'approve'],
    sales_order: ['create', 'read', 'update'],
    purchase_order: ['read'],
    manufacturing: ['read'],
    inventory: ['read'],
    users: ['read'],
    clients: ['create', 'read', 'update'],
    reports: ['read']
  },
  
  designer: {
    // Designers work on estimations and technical aspects
    sales_enquiry: ['read', 'update'],
    estimation: ['create', 'read', 'update'],
    quotation: ['read'],
    sales_order: ['read'],
    purchase_order: ['read'],
    manufacturing: ['read', 'update'],
    inventory: ['read'],
    users: ['read'],
    clients: ['read'],
    reports: ['read']
  },
  
  accounts: {
    // Accounts team handles financial aspects
    sales_enquiry: ['read'],
    estimation: ['read'],
    quotation: ['read'],
    sales_order: ['read', 'update'],
    purchase_order: ['create', 'read', 'update'],
    manufacturing: ['read'],
    inventory: ['read'],
    users: ['read'],
    clients: ['read'],
    reports: ['read', 'export']
  },
  
  technician: {
    // Technicians work on manufacturing and production
    sales_enquiry: ['read'],
    estimation: ['read'],
    quotation: ['read'],
    sales_order: ['read'],
    purchase_order: ['read'],
    manufacturing: ['read', 'update'],
    inventory: ['read', 'update'],
    users: ['read'],
    clients: ['read'],
    reports: ['read']
  }
};

// Middleware to check if user has required permission
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // Bypass RBAC in development mode if BYPASS_AUTH is enabled
      if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
        console.log(`RBAC: Bypassing permission check for ${module}:${action} in development mode`);
        req.user = { id: 1, role: 'director' }; // Mock user for development
        return next();
      }

      // Get user from token (assuming auth middleware sets req.user)
      const userId = req.user?.id || req.headers['x-user-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Get user role from database
      const [userRows] = await db.execute(
        'SELECT user_role FROM users WHERE id = ? AND status = "active"',
        [userId]
      );
      
      if (userRows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }
      
      const userRole = userRows[0].user_role;
      
      // Check if role has permission
      const rolePermissions = ROLE_PERMISSIONS[userRole];
      if (!rolePermissions) {
        return res.status(403).json({
          success: false,
          message: 'Invalid user role'
        });
      }
      
      const modulePermissions = rolePermissions[module];
      if (!modulePermissions || !modulePermissions.includes(action)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${module}:${action}`
        });
      }
      
      // Add user info to request for use in controllers
      req.userRole = userRole;
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Helper function to check multiple permissions
const checkAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.headers['x-user-id'];
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      const [userRows] = await db.execute(
        'SELECT user_role FROM users WHERE id = ? AND status = "active"',
        [userId]
      );
      
      if (userRows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive'
        });
      }
      
      const userRole = userRows[0].user_role;
      const rolePermissions = ROLE_PERMISSIONS[userRole];
      
      if (!rolePermissions) {
        return res.status(403).json({
          success: false,
          message: 'Invalid user role'
        });
      }
      
      // Check if user has any of the required permissions
      const hasPermission = permissions.some(({ module, action }) => {
        const modulePermissions = rolePermissions[module];
        return modulePermissions && modulePermissions.includes(action);
      });
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions'
        });
      }
      
      req.userRole = userRole;
      req.userId = userId;
      
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Get user permissions for frontend
const getUserPermissions = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const [userRows] = await db.execute(
      'SELECT user_role, full_name, email FROM users WHERE id = ? AND status = "active"',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    const user = userRows[0];
    const permissions = ROLE_PERMISSIONS[user.user_role] || {};
    
    res.json({
      success: true,
      user: {
        id: userId,
        role: user.user_role,
        name: user.full_name,
        email: user.email
      },
      permissions
    });
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user permissions'
    });
  }
};

// Check if user can approve (director or admin roles)
const canApprove = (userRole) => {
  return ['director', 'admin', 'sales-admin'].includes(userRole);
};

// Check if user can delete (director only)
const canDelete = (userRole) => {
  return userRole === 'director';
};

module.exports = {
  checkPermission,
  checkAnyPermission,
  getUserPermissions,
  canApprove,
  canDelete,
  ROLE_PERMISSIONS
};
