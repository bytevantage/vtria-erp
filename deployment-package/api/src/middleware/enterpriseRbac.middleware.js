const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Enterprise Role-Based Access Control (RBAC) Middleware
 * 
 * Provides comprehensive permission checking with:
 * - User role-based permissions
 * - Group-inherited permissions  
 * - Scope-level access control
 * - Context-aware authorization
 */
class EnterpriseRbacMiddleware {

  /**
   * Main permission checking middleware
   * @param {string} permissionCode - The permission code to check
   * @param {string} scopeLevel - Optional scope level (global, department, team, own)
   */
  checkPermission(permissionCode, scopeLevel = null) {
    return async (req, res, next) => {
      try {
        // Skip auth check if bypassed
        if (process.env.BYPASS_AUTH === 'true') {
          return next();
        }

        if (!req.user || !req.user.id) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        // Get employee ID from user
        const employeeId = await this.getEmployeeIdFromUser(req.user.id);
        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Employee profile not found'
          });
        }

        // Check if employee has the required permission
        const hasPermission = await this.hasPermission(
          employeeId, 
          permissionCode, 
          scopeLevel,
          req
        );

        if (!hasPermission.granted) {
          // Log access denial for audit
          await this.logAccessAudit(req, employeeId, permissionCode, 'access_denied', hasPermission.reason);
          
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            required_permission: permissionCode,
            reason: hasPermission.reason
          });
        }

        // Log successful access
        await this.logAccessAudit(req, employeeId, permissionCode, 'access_granted');

        // Add permission context to request
        req.permission_context = {
          employee_id: employeeId,
          permission_code: permissionCode,
          scope_level: hasPermission.scope_level,
          granted_via: hasPermission.source
        };

        next();

      } catch (error) {
        logger.error('RBAC permission check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Permission check failed',
          error: error.message
        });
      }
    };
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   */
  checkAnyPermission(permissionCodes) {
    return async (req, res, next) => {
      if (process.env.BYPASS_AUTH === 'true') {
        return next();
      }

      try {
        const employeeId = await this.getEmployeeIdFromUser(req.user.id);
        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Employee profile not found'
          });
        }

        // Check each permission until one is found
        for (const permissionCode of permissionCodes) {
          const hasPermission = await this.hasPermission(employeeId, permissionCode, null, req);
          if (hasPermission.granted) {
            req.permission_context = {
              employee_id: employeeId,
              permission_code: permissionCode,
              scope_level: hasPermission.scope_level,
              granted_via: hasPermission.source
            };
            return next();
          }
        }

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required_permissions: permissionCodes
        });

      } catch (error) {
        logger.error('RBAC any permission check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Permission check failed'
        });
      }
    };
  }

  /**
   * Check if user has all specified permissions (AND logic)
   */
  checkAllPermissions(permissionCodes) {
    return async (req, res, next) => {
      if (process.env.BYPASS_AUTH === 'true') {
        return next();
      }

      try {
        const employeeId = await this.getEmployeeIdFromUser(req.user.id);
        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Employee profile not found'
          });
        }

        const grantedPermissions = [];
        const deniedPermissions = [];

        // Check all permissions
        for (const permissionCode of permissionCodes) {
          const hasPermission = await this.hasPermission(employeeId, permissionCode, null, req);
          if (hasPermission.granted) {
            grantedPermissions.push(permissionCode);
          } else {
            deniedPermissions.push(permissionCode);
          }
        }

        if (deniedPermissions.length > 0) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
            denied_permissions: deniedPermissions,
            granted_permissions: grantedPermissions
          });
        }

        req.permission_context = {
          employee_id: employeeId,
          permission_codes: grantedPermissions
        };

        next();

      } catch (error) {
        logger.error('RBAC all permissions check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Permission check failed'
        });
      }
    };
  }

  /**
   * Check permission with resource-level access control
   */
  checkResourcePermission(permissionCode, resourceIdParam = 'id') {
    return async (req, res, next) => {
      if (process.env.BYPASS_AUTH === 'true') {
        return next();
      }

      try {
        const employeeId = await this.getEmployeeIdFromUser(req.user.id);
        if (!employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Employee profile not found'
          });
        }

        const resourceId = req.params[resourceIdParam];
        
        const hasPermission = await this.hasResourcePermission(
          employeeId, 
          permissionCode, 
          resourceId,
          req
        );

        if (!hasPermission.granted) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions for this resource',
            required_permission: permissionCode,
            resource_id: resourceId
          });
        }

        req.permission_context = {
          employee_id: employeeId,
          permission_code: permissionCode,
          resource_id: resourceId,
          scope_level: hasPermission.scope_level
        };

        next();

      } catch (error) {
        logger.error('RBAC resource permission check error:', error);
        return res.status(500).json({
          success: false,
          message: 'Resource permission check failed'
        });
      }
    };
  }

  /**
   * Core permission checking logic
   */
  async hasPermission(employeeId, permissionCode, scopeLevel = null, req = null) {
    try {
      // Query to check if employee has the permission through any path
      const permissionQuery = `
        SELECT DISTINCT
          p.permission_code,
          p.scope_level as permission_scope,
          p.resource_type,
          vep.permission_source,
          vep.role_code,
          vep.assignment_type,
          e.department_id,
          e.reporting_manager_id
        FROM v_employee_permissions vep
        JOIN system_permissions p ON vep.permission_code = p.permission_code
        JOIN enterprise_employees e ON vep.employee_id = e.id
        WHERE vep.employee_id = ? 
          AND vep.permission_code = ?
          AND vep.is_active = TRUE
          AND (vep.effective_to IS NULL OR vep.effective_to >= CURDATE())
      `;

      const [permissions] = await db.execute(permissionQuery, [employeeId, permissionCode]);

      if (permissions.length === 0) {
        return {
          granted: false,
          reason: 'Permission not assigned to user',
          scope_level: null,
          source: null
        };
      }

      // If specific scope level is required, check if user has appropriate scope
      if (scopeLevel) {
        const validPermission = permissions.find(p => 
          this.isScopeCompatible(p.permission_scope, scopeLevel, employeeId, req)
        );

        if (!validPermission) {
          return {
            granted: false,
            reason: `Required scope level '${scopeLevel}' not available`,
            scope_level: null,
            source: null
          };
        }

        return {
          granted: true,
          scope_level: validPermission.permission_scope,
          source: validPermission.permission_source,
          role: validPermission.role_code
        };
      }

      // Return the highest scope permission available
      const highestPermission = this.getHighestScopePermission(permissions);
      
      return {
        granted: true,
        scope_level: highestPermission.permission_scope,
        source: highestPermission.permission_source,
        role: highestPermission.role_code
      };

    } catch (error) {
      logger.error('Error checking permission:', error);
      return {
        granted: false,
        reason: 'Permission check failed',
        scope_level: null,
        source: null
      };
    }
  }

  /**
   * Check resource-specific permissions with ownership logic
   */
  async hasResourcePermission(employeeId, permissionCode, resourceId, req) {
    // First check if user has the base permission
    const basePermission = await this.hasPermission(employeeId, permissionCode, null, req);
    
    if (!basePermission.granted) {
      return basePermission;
    }

    // For 'own' scope, check resource ownership
    if (basePermission.scope_level === 'own') {
      const isOwner = await this.isResourceOwner(employeeId, resourceId, req);
      if (!isOwner) {
        return {
          granted: false,
          reason: 'Can only access own resources',
          scope_level: 'own',
          source: basePermission.source
        };
      }
    }

    // For 'team' scope, check if resource belongs to same team
    if (basePermission.scope_level === 'team') {
      const isSameTeam = await this.isSameTeamResource(employeeId, resourceId, req);
      if (!isSameTeam) {
        return {
          granted: false,
          reason: 'Can only access team resources',
          scope_level: 'team',
          source: basePermission.source
        };
      }
    }

    // For 'department' scope, check if resource belongs to same department
    if (basePermission.scope_level === 'department') {
      const isSameDepartment = await this.isSameDepartmentResource(employeeId, resourceId, req);
      if (!isSameDepartment) {
        return {
          granted: false,
          reason: 'Can only access department resources',
          scope_level: 'department',
          source: basePermission.source
        };
      }
    }

    return basePermission;
  }

  /**
   * Check if scope levels are compatible
   */
  isScopeCompatible(permissionScope, requiredScope, employeeId, req) {
    // Scope hierarchy: global > department > team > own
    const scopeHierarchy = {
      'global': 4,
      'department': 3,
      'team': 2,
      'own': 1
    };

    const permissionLevel = scopeHierarchy[permissionScope] || 0;
    const requiredLevel = scopeHierarchy[requiredScope] || 0;

    return permissionLevel >= requiredLevel;
  }

  /**
   * Get the highest scope permission from available permissions
   */
  getHighestScopePermission(permissions) {
    const scopeOrder = ['global', 'department', 'team', 'own'];
    
    for (const scope of scopeOrder) {
      const permission = permissions.find(p => p.permission_scope === scope);
      if (permission) {
        return permission;
      }
    }
    
    return permissions[0]; // Fallback to first permission
  }

  /**
   * Check if employee owns the resource
   */
  async isResourceOwner(employeeId, resourceId, req) {
    // This is a generic implementation - should be customized per resource type
    try {
      // Try to determine resource table from route
      const resourceType = this.getResourceTypeFromRequest(req);
      
      if (!resourceType) return false;

      // Common ownership patterns
      const ownershipQueries = {
        'employee': 'SELECT 1 FROM enterprise_employees WHERE id = ? AND id = ?',
        'case': 'SELECT 1 FROM cases WHERE id = ? AND assigned_to = ?',
        'sales_order': 'SELECT 1 FROM sales_orders WHERE id = ? AND created_by = ?',
        'purchase_order': 'SELECT 1 FROM purchase_orders WHERE id = ? AND created_by = ?'
      };

      const query = ownershipQueries[resourceType];
      if (!query) return false;

      const [result] = await db.execute(query, [resourceId, employeeId]);
      return result.length > 0;

    } catch (error) {
      logger.error('Error checking resource ownership:', error);
      return false;
    }
  }

  /**
   * Check if resource belongs to same team
   */
  async isSameTeamResource(employeeId, resourceId, req) {
    // Implementation would check if resource belongs to any of employee's teams
    // This is a placeholder - implement based on your team structure
    return true; // Simplified for now
  }

  /**
   * Check if resource belongs to same department
   */
  async isSameDepartmentResource(employeeId, resourceId, req) {
    try {
      const resourceType = this.getResourceTypeFromRequest(req);
      
      // Get employee's department
      const [empDept] = await db.execute(`
        SELECT department_id FROM enterprise_employees WHERE id = ?
      `, [employeeId]);

      if (empDept.length === 0) return false;

      const employeeDeptId = empDept[0].department_id;

      // Check resource's department based on type
      const departmentQueries = {
        'employee': 'SELECT department_id FROM enterprise_employees WHERE id = ?',
        'case': 'SELECT e.department_id FROM cases c JOIN enterprise_employees e ON c.assigned_to = e.id WHERE c.id = ?'
      };

      const query = departmentQueries[resourceType];
      if (!query) return true; // If we can't determine, allow access

      const [resourceDept] = await db.execute(query, [resourceId]);
      
      return resourceDept.length > 0 && resourceDept[0].department_id === employeeDeptId;

    } catch (error) {
      logger.error('Error checking department resource access:', error);
      return false;
    }
  }

  /**
   * Get employee ID from user ID
   */
  async getEmployeeIdFromUser(userId) {
    try {
      const [result] = await db.execute(`
        SELECT id FROM enterprise_employees WHERE user_id = ? AND employment_status = 'active'
      `, [userId]);

      return result.length > 0 ? result[0].id : null;
    } catch (error) {
      logger.error('Error getting employee ID from user:', error);
      return null;
    }
  }

  /**
   * Determine resource type from request path
   */
  getResourceTypeFromRequest(req) {
    const path = req.route?.path || req.path || '';
    
    if (path.includes('employee')) return 'employee';
    if (path.includes('case')) return 'case';
    if (path.includes('sales-order')) return 'sales_order';
    if (path.includes('purchase-order')) return 'purchase_order';
    
    return null;
  }

  /**
   * Log access audit trail
   */
  async logAccessAudit(req, employeeId, permissionCode, result, failureReason = null) {
    try {
      await db.execute(`
        INSERT INTO access_audit_logs 
        (employee_id, user_id, action_type, resource_type, permission_code, 
         ip_address, user_agent, result, failure_reason, additional_data)
        VALUES (?, ?, 'permission_check', ?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId,
        req.user?.id,
        this.getResourceTypeFromRequest(req),
        permissionCode,
        req.ip,
        req.get('User-Agent'),
        result,
        failureReason,
        JSON.stringify({
          method: req.method,
          path: req.path,
          params: req.params
        })
      ]);
    } catch (error) {
      logger.error('Error logging access audit:', error);
    }
  }

  /**
   * Middleware to enforce data filtering based on user scope
   */
  enforceDataScope(resourceType) {
    return async (req, res, next) => {
      if (process.env.BYPASS_AUTH === 'true') {
        return next();
      }

      try {
        const context = req.permission_context;
        if (!context) {
          return next(); // No permission context, skip filtering
        }

        // Add scope filtering to query parameters
        switch (context.scope_level) {
          case 'own':
            req.query._scope_filter = {
              type: 'own',
              employee_id: context.employee_id
            };
            break;
          
          case 'team':
            // Get user's teams
            const [teams] = await db.execute(`
              SELECT group_id FROM employee_group_memberships 
              WHERE employee_id = ? AND is_active = TRUE
            `, [context.employee_id]);
            
            req.query._scope_filter = {
              type: 'team',
              team_ids: teams.map(t => t.group_id)
            };
            break;
          
          case 'department':
            // Get user's department
            const [dept] = await db.execute(`
              SELECT department_id FROM enterprise_employees WHERE id = ?
            `, [context.employee_id]);
            
            req.query._scope_filter = {
              type: 'department',
              department_id: dept[0]?.department_id
            };
            break;
          
          case 'global':
          default:
            // No filtering needed for global scope
            break;
        }

        next();

      } catch (error) {
        logger.error('Error enforcing data scope:', error);
        next(error);
      }
    };
  }
}

module.exports = new EnterpriseRbacMiddleware();