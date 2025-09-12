/**
 * Role-Based Access Control (RBAC) Middleware for VTRIA ERP
 * Handles role-based permissions for case lifecycle operations
 */

const rbac = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has roles
      if (!req.user.roles || !Array.isArray(req.user.roles)) {
        return res.status(403).json({
          success: false,
          error: 'User roles not found'
        });
      }

      // Extract role names
      const userRoles = req.user.roles.map(role => 
        typeof role === 'string' ? role : role.name
      );

      // Check if user has any of the allowed roles
      const hasPermission = allowedRoles.some(role => userRoles.includes(role));

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
};

module.exports = rbac;
