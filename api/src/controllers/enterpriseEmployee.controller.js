const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Enterprise Employee Management Controller
 * 
 * Provides comprehensive employee management with:
 * - Role-based access control (RBAC)
 * - Multi-group user management
 * - Enterprise-level features
 * - Hierarchical organizational structure
 */
class EnterpriseEmployeeController {

  // ===================================================================
  // EMPLOYEE MANAGEMENT
  // ===================================================================

  /**
   * Get all employees with advanced filtering and pagination
   */
  async getAllEmployees(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        department_id,
        position_id,
        location_id,
        employment_status = 'active',
        employee_type,
        search,
        sort_by = 'hire_date',
        sort_order = 'DESC',
        include_inactive = false
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];

      // Apply filters
      if (employment_status && employment_status !== 'all') {
        whereClause += ' AND e.status = ?';
        params.push(employment_status);
      }

      if (!include_inactive) {
        whereClause += ' AND e.status != ?';
        params.push('terminated');
      }

      if (department_id) {
        whereClause += ' AND e.department_id = ?';
        params.push(department_id);
      }

      if (position_id) {
        whereClause += ' AND e.position_id = ?';
        params.push(position_id);
      }

      if (location_id) {
        whereClause += ' AND e.work_location = ?';
        params.push(location_id);
      }

      if (employee_type) {
        whereClause += ' AND e.employee_type = ?';
        params.push(employee_type);
      }

      if (search) {
        whereClause += ` AND (
          e.first_name LIKE ? OR 
          e.last_name LIKE ? OR 
          e.employee_id LIKE ? OR 
          e.email LIKE ? OR
          e.display_name LIKE ?
        )`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM employees e
        ${whereClause}
      `;

      // Main query using existing employees table
      const query = `
        SELECT 
          e.*,
          d.department_name,
          CONCAT_WS(' ', e.first_name, e.last_name) as full_name,
          -- Additional aggregated data
          COUNT(DISTINCT egm.group_id) as total_groups,
          COUNT(DISTINCT era.role_id) as total_roles
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_group_memberships egm ON e.id = egm.employee_id AND egm.is_active = TRUE
        LEFT JOIN employee_role_assignments era ON e.id = era.employee_id AND era.is_active = TRUE
        ${whereClause}
        GROUP BY e.id
        ORDER BY ${sort_by === 'hire_date' ? 'e.hire_date' : 'e.first_name'} ${sort_order === 'ASC' ? 'ASC' : 'DESC'}
        LIMIT ? OFFSET ?
      `;

      const [countResult] = await db.query(countQuery, params);
      const queryParams = [...params, parseInt(limit), parseInt(offset)];
      const [employees] = await db.query(query, queryParams);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: employees,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      logger.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employees',
        error: error.message
      });
    }
  }

  /**
   * Get employee by ID with comprehensive details
   */
  async getEmployee(req, res) {
    try {
      const { id } = req.params;

      // Get basic employee details
      const employeeQuery = `
        SELECT 
          e.*,
          d.department_name,
          CONCAT_WS(' ', e.first_name, e.last_name) as full_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.id = ?
      `;

      // Get employee roles
      const rolesQuery = `
        SELECT 
          r.id,
          r.role_code,
          r.role_name,
          r.description,
          r.role_type,
          era.assignment_type,
          era.effective_from,
          era.effective_to,
          era.assigned_date,
          CASE 
            WHEN era.assignment_type = 'inherited_group' THEN g.group_name
            ELSE 'Direct Assignment'
          END as assignment_source
        FROM employee_role_assignments era
        JOIN user_roles r ON era.role_id = r.id
        LEFT JOIN user_groups g ON era.source_group_id = g.id
        WHERE era.employee_id = ? AND era.is_active = TRUE
        ORDER BY r.hierarchy_level, r.role_name
      `;

      // Get employee groups
      const groupsQuery = `
        SELECT * FROM v_employee_groups
        WHERE employee_id = ? AND is_active = TRUE
        ORDER BY group_type, group_name
      `;

      // Get employee permissions
      const permissionsQuery = `
        SELECT 
          permission_code,
          permission_name,
          action_type,
          resource_type,
          scope_level,
          permission_source
        FROM v_employee_permissions
        WHERE employee_id = ?
        ORDER BY action_type, resource_type
      `;

      // Get reporting hierarchy
      const hierarchyQuery = `
        SELECT 
          id, employee_id, first_name, last_name, 
          designation as position_title, 0 as level, 'direct_report' as relationship
        FROM employees 
        WHERE reporting_manager_id = ?
        ORDER BY last_name
      `;

      const [employee] = await db.execute(employeeQuery, [id]);
      
      if (employee.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      const [roles] = await db.execute(rolesQuery, [id]);
      const [groups] = await db.execute(groupsQuery, [id]);
      const [permissions] = await db.execute(permissionsQuery, [id]);
      const [hierarchy] = await db.execute(hierarchyQuery, [id]);

      // Group permissions by module for better organization
      const permissionsByModule = permissions.reduce((acc, perm) => {
        const key = perm.resource_type || 'general';
        if (!acc[key]) acc[key] = [];
        acc[key].push(perm);
        return acc;
      }, {});

      const employeeDetails = {
        ...employee[0],
        roles: roles,
        groups: groups,
        permissions: permissionsByModule,
        team_members: hierarchy,
        access_summary: {
          total_roles: roles.length,
          total_groups: groups.length,
          total_permissions: permissions.length,
          highest_role: roles.length > 0 ? roles[0].role_name : null
        }
      };

      res.json({
        success: true,
        data: employeeDetails
      });

    } catch (error) {
      logger.error('Error fetching employee details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee details',
        error: error.message
      });
    }
  }

  /**
   * Create new employee with enterprise features
   */
  async createEmployee(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        // Personal Information
        first_name,
        middle_name,
        last_name,
        display_name,
        email,
        personal_email,
        phone,
        personal_phone,
        date_of_birth,
        gender,
        marital_status,
        nationality = 'Indian',

        // Address
        current_address,
        permanent_address,
        city,
        state,
        country = 'India',
        pincode,

        // Emergency Contact
        emergency_contact_name,
        emergency_contact_relationship,
        emergency_contact_phone,
        emergency_contact_address,

        // Employment Details
        employee_type = 'full_time',
        hire_date,
        probation_period_months = 6,
        department_id,
        position_id,
        reporting_manager_id,
        work_location_id,

        // Compensation
        basic_salary,
        total_ctc,
        pay_grade,

        // Additional
        work_schedule = 'regular',
        remote_work_eligible = false,
        travel_required = false,
        professional_summary,
        key_skills,
        languages_spoken,

        // Role and Group Assignments
        initial_roles = [],
        initial_groups = []
      } = req.body;

      // Generate employee ID
      const employeeIdQuery = `
        SELECT CONCAT('EMP/', YEAR(CURDATE()), '/', 
          LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(employee_id, '/', -1) AS UNSIGNED)), 0) + 1, 4, '0')
        ) as next_employee_id
        FROM enterprise_employees 
        WHERE employee_id LIKE CONCAT('EMP/', YEAR(CURDATE()), '/%')
      `;

      const [employeeIdResult] = await connection.execute(employeeIdQuery);
      const employeeId = employeeIdResult[0].next_employee_id;

      // Insert employee
      const insertEmployeeQuery = `
        INSERT INTO enterprise_employees (
          employee_id, first_name, middle_name, last_name, display_name,
          email, personal_email, phone, personal_phone, date_of_birth, gender, marital_status, nationality,
          current_address, permanent_address, city, state, country, pincode,
          emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address,
          employee_type, hire_date, probation_period_months,
          department_id, position_id, reporting_manager_id, work_location_id,
          basic_salary, total_ctc, pay_grade,
          work_schedule, remote_work_eligible, travel_required,
          professional_summary, key_skills, languages_spoken,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [employeeResult] = await connection.execute(insertEmployeeQuery, [
        employeeId, first_name, middle_name, last_name, display_name,
        email, personal_email, phone, personal_phone, date_of_birth, gender, marital_status, nationality,
        current_address, permanent_address, city, state, country, pincode,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, emergency_contact_address,
        employee_type, hire_date, probation_period_months,
        department_id, position_id, reporting_manager_id, work_location_id,
        basic_salary, total_ctc, pay_grade,
        work_schedule, remote_work_eligible, travel_required,
        professional_summary, JSON.stringify(key_skills), JSON.stringify(languages_spoken),
        req.user?.id || 1
      ]);

      const newEmployeeId = employeeResult.insertId;

      // Assign initial roles
      if (initial_roles && initial_roles.length > 0) {
        const roleAssignments = initial_roles.map(roleId => [
          newEmployeeId, roleId, 'direct', req.user?.id || 1, new Date(), new Date()
        ]);

        const roleQuery = `
          INSERT INTO employee_role_assignments 
          (employee_id, role_id, assignment_type, assigned_by, assigned_date, effective_from)
          VALUES ?
        `;

        await connection.query(roleQuery, [roleAssignments]);
      }

      // Add to initial groups
      if (initial_groups && initial_groups.length > 0) {
        const groupMemberships = initial_groups.map(groupId => [
          newEmployeeId, groupId, 'member', new Date(), req.user?.id || 1
        ]);

        const groupQuery = `
          INSERT INTO employee_group_memberships 
          (employee_id, group_id, membership_type, joined_date, created_by)
          VALUES ?
        `;

        await connection.query(groupQuery, [groupMemberships]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: {
          id: newEmployeeId,
          employee_id: employeeId
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error creating employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create employee',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update employee with audit trail
   */
  async updateEmployee(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { id } = req.params;
      const updates = req.body;

      // Get current employee data for audit
      const [currentEmployee] = await connection.execute(
        'SELECT * FROM enterprise_employees WHERE id = ?', 
        [id]
      );

      if (currentEmployee.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Build dynamic update query
      const allowedFields = [
        'first_name', 'middle_name', 'last_name', 'display_name',
        'email', 'personal_email', 'phone', 'personal_phone',
        'date_of_birth', 'gender', 'marital_status', 'nationality',
        'current_address', 'permanent_address', 'city', 'state', 'country', 'pincode',
        'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_phone',
        'employee_type', 'employment_status', 'confirmation_date', 'termination_date',
        'department_id', 'position_id', 'reporting_manager_id', 'work_location_id',
        'basic_salary', 'total_ctc', 'pay_grade', 'salary_review_date',
        'work_schedule', 'remote_work_eligible', 'travel_required',
        'professional_summary', 'key_skills', 'languages_spoken', 'notes'
      ];

      const updateFields = [];
      const values = [];
      const changes = {};

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          
          // Handle JSON fields
          if (['key_skills', 'languages_spoken'].includes(field)) {
            values.push(JSON.stringify(updates[field]));
          } else {
            values.push(updates[field]);
          }
          
          // Track changes for audit
          if (currentEmployee[0][field] !== updates[field]) {
            changes[field] = {
              old: currentEmployee[0][field],
              new: updates[field]
            };
          }
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push('updated_by = ?');
      values.push(req.user?.id || 1);
      values.push(id);

      const updateQuery = `
        UPDATE enterprise_employees 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await connection.execute(updateQuery, values);

      // Log changes if any
      if (Object.keys(changes).length > 0) {
        await connection.execute(`
          INSERT INTO role_change_history 
          (employee_id, change_type, old_value, new_value, changed_by, change_reason)
          VALUES (?, 'employee_updated', ?, ?, ?, 'Employee profile updated')
        `, [
          id, 
          JSON.stringify(Object.keys(changes)), 
          JSON.stringify(changes),
          req.user?.id || 1
        ]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Employee updated successfully',
        changes: Object.keys(changes)
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error updating employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ===================================================================
  // ROLE MANAGEMENT
  // ===================================================================

  /**
   * Assign role to employee
   */
  async assignRole(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { employee_id } = req.params;
      const { 
        role_id, 
        assignment_type = 'direct',
        effective_from = new Date(),
        effective_to,
        assignment_reason 
      } = req.body;

      // Check if role assignment already exists
      const [existing] = await connection.execute(`
        SELECT id FROM employee_role_assignments 
        WHERE employee_id = ? AND role_id = ? AND is_active = TRUE
      `, [employee_id, role_id]);

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Role already assigned to employee'
        });
      }

      // Insert role assignment
      const [result] = await connection.execute(`
        INSERT INTO employee_role_assignments 
        (employee_id, role_id, assignment_type, assigned_by, assigned_date, effective_from, effective_to, assignment_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employee_id, role_id, assignment_type, req.user?.id || 1, 
        new Date(), effective_from, effective_to || null, assignment_reason || null
      ]);

      // Log the change
      await connection.execute(`
        INSERT INTO role_change_history 
        (employee_id, change_type, new_value, changed_by, change_reason)
        VALUES (?, 'role_assigned', ?, ?, ?)
      `, [
        employee_id, 
        JSON.stringify({ role_id, assignment_type }),
        req.user?.id || 1,
        assignment_reason || 'Role assigned'
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Role assigned successfully',
        data: { assignment_id: result.insertId }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error assigning role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Revoke role from employee
   */
  async revokeRole(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { employee_id, role_id } = req.params;
      const { revocation_reason } = req.body;

      // Update role assignment to inactive
      const [result] = await connection.execute(`
        UPDATE employee_role_assignments 
        SET is_active = FALSE, effective_to = ?, assignment_reason = ?
        WHERE employee_id = ? AND role_id = ? AND is_active = TRUE
      `, [new Date(), revocation_reason, employee_id, role_id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Role assignment not found'
        });
      }

      // Log the change
      await connection.execute(`
        INSERT INTO role_change_history 
        (employee_id, change_type, old_value, changed_by, change_reason)
        VALUES (?, 'role_revoked', ?, ?, ?)
      `, [
        employee_id, 
        JSON.stringify({ role_id }),
        req.user?.id || 1,
        revocation_reason || 'Role revoked'
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Role revoked successfully'
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error revoking role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke role',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ===================================================================
  // GROUP MANAGEMENT
  // ===================================================================

  /**
   * Get all user groups
   */
  async getUserGroups(req, res) {
    try {
      const { 
        group_type, 
        department_id, 
        status = 'active',
        include_members = false 
      } = req.query;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (group_type) {
        whereClause += ' AND g.group_type = ?';
        params.push(group_type);
      }

      if (department_id) {
        whereClause += ' AND g.department_id = ?';
        params.push(department_id);
      }

      if (status) {
        whereClause += ' AND g.status = ?';
        params.push(status);
      }

      const query = `
        SELECT 
          g.*,
          d.department_name,
          CONCAT_WS(' ', owner.first_name, owner.last_name) as owner_name,
          COUNT(DISTINCT egm.employee_id) as member_count,
          COUNT(DISTINCT gr.role_id) as role_count
        FROM user_groups g
        LEFT JOIN enterprise_departments d ON g.department_id = d.id
        LEFT JOIN enterprise_employees owner ON g.owner_user_id = owner.id
        LEFT JOIN employee_group_memberships egm ON g.id = egm.group_id AND egm.is_active = TRUE
        LEFT JOIN group_roles gr ON g.id = gr.group_id
        ${whereClause}
        GROUP BY g.id
        ORDER BY g.group_type, g.group_name
      `;

      const [groups] = await db.query(query, params);

      // If members are requested, fetch them for each group
      if (include_members === 'true') {
        for (const group of groups) {
          const [members] = await db.execute(`
            SELECT 
              e.id,
              e.employee_id,
              CONCAT_WS(' ', e.first_name, e.last_name) as employee_name,
              e.email,
              egm.membership_type,
              egm.joined_date
            FROM employee_group_memberships egm
            JOIN enterprise_employees e ON egm.employee_id = e.id
            WHERE egm.group_id = ? AND egm.is_active = TRUE
            ORDER BY egm.membership_type, e.last_name
          `, [group.id]);
          
          group.members = members;
        }
      }

      res.json({
        success: true,
        data: groups
      });

    } catch (error) {
      logger.error('Error fetching user groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user groups',
        error: error.message
      });
    }
  }

  /**
   * Create user group
   */
  async createUserGroup(req, res) {
    try {
      const {
        group_name,
        description,
        group_type = 'functional_team',
        department_id,
        owner_user_id,
        max_members,
        auto_approval = false,
        is_public = false,
        effective_from,
        effective_to,
        initial_roles = []
      } = req.body;

      // Generate group code
      const groupCodeQuery = `
        SELECT CONCAT(UPPER(LEFT(?, 3)), '_', 
          LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(group_code, '_', -1) AS UNSIGNED)), 0) + 1, 3, '0')
        ) as next_group_code
        FROM user_groups 
        WHERE group_code LIKE CONCAT(UPPER(LEFT(?, 3)), '_%')
      `;

      const [codeResult] = await db.execute(groupCodeQuery, [group_name, group_name]);
      const groupCode = codeResult[0].next_group_code;

      // Insert group
      const [result] = await db.execute(`
        INSERT INTO user_groups 
        (group_code, group_name, description, group_type, department_id, owner_user_id, 
         max_members, auto_approval, is_public, effective_from, effective_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        groupCode, group_name, description || null, group_type, department_id || null, owner_user_id || null,
        max_members || null, auto_approval, is_public, effective_from || null, effective_to || null, req.user?.id || 1
      ]);

      const groupId = result.insertId;

      // Assign initial roles to the group
      if (initial_roles.length > 0) {
        const roleAssignments = initial_roles.map(roleId => [
          groupId, roleId, req.user?.id || 1
        ]);

        await db.query(`
          INSERT INTO group_roles (group_id, role_id, assigned_by)
          VALUES ?
        `, [roleAssignments]);
      }

      res.status(201).json({
        success: true,
        message: 'User group created successfully',
        data: {
          id: groupId,
          group_code: groupCode
        }
      });

    } catch (error) {
      logger.error('Error creating user group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user group',
        error: error.message
      });
    }
  }

  /**
   * Add employee to group
   */
  async addEmployeeToGroup(req, res) {
    try {
      const { group_id, employee_id } = req.params;
      const { 
        membership_type = 'member',
        approval_status = 'approved'
      } = req.body;

      // Check if already a member
      const [existing] = await db.execute(`
        SELECT id FROM employee_group_memberships 
        WHERE employee_id = ? AND group_id = ? AND is_active = TRUE
      `, [employee_id, group_id]);

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Employee is already a member of this group'
        });
      }

      // Add to group
      await db.execute(`
        INSERT INTO employee_group_memberships 
        (employee_id, group_id, membership_type, approval_status, approved_by, approved_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        employee_id, group_id, membership_type, approval_status,
        req.user?.id || null, approval_status === 'approved' ? new Date() : null, req.user?.id || 1
      ]);

      res.json({
        success: true,
        message: 'Employee added to group successfully'
      });

    } catch (error) {
      logger.error('Error adding employee to group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add employee to group',
        error: error.message
      });
    }
  }

  /**
   * Remove employee from group
   */
  async removeEmployeeFromGroup(req, res) {
    try {
      const { group_id, employee_id } = req.params;
      const { removal_reason } = req.body;

      const [result] = await db.execute(`
        UPDATE employee_group_memberships 
        SET is_active = FALSE, left_date = ?, notes = ?
        WHERE employee_id = ? AND group_id = ? AND is_active = TRUE
      `, [new Date(), removal_reason, employee_id, group_id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Group membership not found'
        });
      }

      res.json({
        success: true,
        message: 'Employee removed from group successfully'
      });

    } catch (error) {
      logger.error('Error removing employee from group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove employee from group',
        error: error.message
      });
    }
  }

  // ===================================================================
  // PERMISSION CHECKING
  // ===================================================================

  /**
   * Check if employee has specific permission
   */
  async checkPermission(req, res) {
    try {
      const { employee_id } = req.params;
      const { permission_code, resource_id, scope } = req.query;

      const [permissions] = await db.execute(`
        SELECT 
          COUNT(*) as has_permission,
          GROUP_CONCAT(DISTINCT permission_source) as sources
        FROM v_employee_permissions 
        WHERE employee_id = ? AND permission_code = ?
      `, [employee_id, permission_code]);

      const hasPermission = permissions[0].has_permission > 0;

      res.json({
        success: true,
        data: {
          employee_id: parseInt(employee_id),
          permission_code,
          has_permission: hasPermission,
          sources: hasPermission ? permissions[0].sources.split(',') : []
        }
      });

    } catch (error) {
      logger.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        error: error.message
      });
    }
  }

  // ===================================================================
  // MASTER DATA
  // ===================================================================

  /**
   * Get all roles
   */
  async getRoles(req, res) {
    try {
      const { role_type, status = 'active' } = req.query;
      
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (role_type) {
        whereClause += ' AND role_type = ?';
        params.push(role_type);
      }

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      const [roles] = await db.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rp.permission_id) as permission_count,
          COUNT(DISTINCT era.employee_id) as assigned_users
        FROM user_roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN employee_role_assignments era ON r.id = era.role_id AND era.is_active = TRUE
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.hierarchy_level, r.role_name
      `, params);

      res.json({
        success: true,
        data: roles
      });

    } catch (error) {
      logger.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
        error: error.message
      });
    }
  }

  /**
   * Get all departments
   */
  async getDepartments(req, res) {
    try {
      const [departments] = await db.execute(`
        SELECT 
          d.*,
          CONCAT_WS(' ', hod.first_name, hod.last_name) as head_name,
          COUNT(DISTINCT e.id) as employee_count
        FROM departments d
        LEFT JOIN employees hod ON d.head_of_department_id = hod.id
        LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
        WHERE d.status = 'active'
        GROUP BY d.id
        ORDER BY d.department_name
      `);

      res.json({
        success: true,
        data: departments
      });

    } catch (error) {
      logger.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch departments',
        error: error.message
      });
    }
  }

  /**
   * Get work locations
   */
  async getWorkLocations(req, res) {
    try {
      const [locations] = await db.execute(`
        SELECT 
          wl.*,
          COUNT(DISTINCT e.id) as employee_count
        FROM work_locations wl
        LEFT JOIN enterprise_employees e ON wl.id = e.work_location_id AND e.employment_status = 'active'
        WHERE wl.status = 'active'
        GROUP BY wl.id
        ORDER BY wl.is_headquarters DESC, wl.location_name
      `);

      res.json({
        success: true,
        data: locations
      });

    } catch (error) {
      logger.error('Error fetching work locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work locations',
        error: error.message
      });
    }
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  /**
   * Sanitize sort field to prevent SQL injection
   */
  sanitizeSortField(field) {
    const allowedFields = [
      'employee_id', 'first_name', 'last_name', 'email', 'hire_date', 
      'department_name', 'position_title', 'employment_status'
    ];
    
    return allowedFields.includes(field) ? field : 'hire_date';
  }
}

module.exports = new EnterpriseEmployeeController();