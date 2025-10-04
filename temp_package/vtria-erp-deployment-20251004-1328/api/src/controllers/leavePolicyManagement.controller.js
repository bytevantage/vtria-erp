const db = require('../config/database');

class LeavePolicyManagementController {
  // ============================================================================
  // LEAVE POLICIES MANAGEMENT
  // ============================================================================

  // Get all leave policies
  async getLeavePolicies(req, res) {
    try {
      const [policies] = await db.execute(`
        SELECT lp.*, u.full_name as created_by_name 
        FROM leave_policies lp
        LEFT JOIN users u ON lp.created_by = u.id
        ORDER BY lp.created_at DESC
      `);

      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      console.error('Error fetching leave policies:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave policies',
        error: error.message
      });
    }
  }

  // Create new leave policy
  async createLeavePolicy(req, res) {
    try {
      const { policy_name, description, is_active = true } = req.body;
      const created_by = req.user?.id || 1;

      if (!policy_name) {
        return res.status(400).json({
          success: false,
          message: 'Policy name is required'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO leave_policies (policy_name, description, is_active, created_by)
        VALUES (?, ?, ?, ?)
      `, [policy_name, description, is_active, created_by]);

      res.json({
        success: true,
        message: 'Leave policy created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating leave policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create leave policy',
        error: error.message
      });
    }
  }

  // ============================================================================
  // ENHANCED LEAVE TYPES MANAGEMENT
  // ============================================================================

  // Get all enhanced leave types
  async getEnhancedLeaveTypes(req, res) {
    try {
      const [leaveTypes] = await db.execute(`
        SELECT lt.*, lp.policy_name 
        FROM leave_types_enhanced lt
        LEFT JOIN leave_policies lp ON lt.policy_id = lp.id
        WHERE lt.is_active = TRUE
        ORDER BY lt.leave_type_name
      `);

      res.json({
        success: true,
        data: leaveTypes
      });
    } catch (error) {
      console.error('Error fetching leave types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave types',
        error: error.message
      });
    }
  }

  // Create enhanced leave type
  async createEnhancedLeaveType(req, res) {
    try {
      const {
        leave_type_name,
        leave_code,
        description,
        policy_id = 1,
        is_paid = true,
        is_carryforward = false,
        max_carryforward_days = 0,
        advance_notice_days = 1,
        max_consecutive_days = 365,
        requires_document = false,
        document_required_after_days = 3,
        is_weekend_included = true,
        is_holiday_included = true
      } = req.body;

      if (!leave_type_name || !leave_code) {
        return res.status(400).json({
          success: false,
          message: 'Leave type name and code are required'
        });
      }

      // Check for duplicate leave code
      const [existing] = await db.execute(
        'SELECT id FROM leave_types_enhanced WHERE leave_code = ?',
        [leave_code]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Leave code already exists'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO leave_types_enhanced (
          leave_type_name, leave_code, description, policy_id, is_paid,
          is_carryforward, max_carryforward_days, advance_notice_days,
          max_consecutive_days, requires_document, document_required_after_days,
          is_weekend_included, is_holiday_included
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        leave_type_name, leave_code, description, policy_id, is_paid,
        is_carryforward, max_carryforward_days, advance_notice_days,
        max_consecutive_days, requires_document, document_required_after_days,
        is_weekend_included, is_holiday_included
      ]);

      res.json({
        success: true,
        message: 'Leave type created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating leave type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create leave type',
        error: error.message
      });
    }
  }

  // Update enhanced leave type
  async updateEnhancedLeaveType(req, res) {
    try {
      const { id } = req.params;
      const updateFields = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Leave type ID is required'
        });
      }

      const allowedFields = [
        'leave_type_name', 'description', 'is_paid', 'is_carryforward',
        'max_carryforward_days', 'advance_notice_days', 'max_consecutive_days',
        'requires_document', 'document_required_after_days', 'is_weekend_included',
        'is_holiday_included', 'is_active'
      ];

      const fieldsToUpdate = Object.keys(updateFields).filter(field =>
        allowedFields.includes(field)
      );

      if (fieldsToUpdate.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
      const values = fieldsToUpdate.map(field => updateFields[field]);
      values.push(id);

      await db.execute(`
        UPDATE leave_types_enhanced SET ${setClause} WHERE id = ?
      `, values);

      res.json({
        success: true,
        message: 'Leave type updated successfully'
      });
    } catch (error) {
      console.error('Error updating leave type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update leave type',
        error: error.message
      });
    }
  }

  // ============================================================================
  // EMPLOYEE LEAVE ENTITLEMENTS
  // ============================================================================

  // Get employee leave entitlements
  async getEmployeeLeaveEntitlements(req, res) {
    try {
      const { employee_id, year = new Date().getFullYear() } = req.query;

      let query = `
        SELECT 
          ele.*, 
          e.employee_id as emp_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          lt.leave_type_name,
          lt.leave_code,
          lt.is_paid
        FROM employee_leave_entitlements ele
        JOIN employees e ON ele.employee_id = e.id
        JOIN leave_types_enhanced lt ON ele.leave_type_id = lt.id
        WHERE ele.year = ?
      `;
      const params = [year];

      if (employee_id) {
        query += ' AND ele.employee_id = ?';
        params.push(employee_id);
      }

      query += ' ORDER BY e.first_name, lt.leave_type_name';

      const [entitlements] = await db.execute(query, params);

      res.json({
        success: true,
        data: entitlements
      });
    } catch (error) {
      console.error('Error fetching leave entitlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave entitlements',
        error: error.message
      });
    }
  }

  // Initialize leave entitlements for employee
  async initializeEmployeeEntitlements(req, res) {
    try {
      const { employee_id, year = new Date().getFullYear() } = req.body;

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      // Get all active leave types
      const [leaveTypes] = await db.execute(`
        SELECT id, leave_type_name, leave_code FROM leave_types_enhanced 
        WHERE is_active = TRUE
      `);

      // Get default allocations from company config
      const [configs] = await db.execute(`
        SELECT config_key, config_value FROM company_policy_config 
        WHERE config_key IN ('annual_leave_allocation', 'sick_leave_allocation', 'casual_leave_allocation')
      `);

      const defaultAllocations = {};
      configs.forEach(config => {
        defaultAllocations[config.config_key] = parseInt(config.config_value);
      });

      // Initialize entitlements
      for (const leaveType of leaveTypes) {
        let allocatedDays = 0;

        // Map leave types to default allocations
        switch (leaveType.leave_code) {
          case 'AL':
            allocatedDays = defaultAllocations['annual_leave_allocation'] || 21;
            break;
          case 'SL':
            allocatedDays = defaultAllocations['sick_leave_allocation'] || 12;
            break;
          case 'CL':
            allocatedDays = defaultAllocations['casual_leave_allocation'] || 6;
            break;
          case 'ML':
            allocatedDays = 180;
            break;
          case 'PL':
            allocatedDays = 15;
            break;
          default:
            allocatedDays = 0;
        }

        await db.execute(`
          INSERT IGNORE INTO employee_leave_entitlements 
          (employee_id, leave_type_id, year, allocated_days)
          VALUES (?, ?, ?, ?)
        `, [employee_id, leaveType.id, year, allocatedDays]);
      }

      res.json({
        success: true,
        message: 'Employee leave entitlements initialized successfully'
      });
    } catch (error) {
      console.error('Error initializing leave entitlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize leave entitlements',
        error: error.message
      });
    }
  }

  // Update employee leave entitlement
  async updateEmployeeEntitlement(req, res) {
    try {
      const { id } = req.params;
      const { allocated_days, carried_forward_days } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Entitlement ID is required'
        });
      }

      const updateFields = [];
      const values = [];

      if (allocated_days !== undefined) {
        updateFields.push('allocated_days = ?');
        values.push(allocated_days);
      }

      if (carried_forward_days !== undefined) {
        updateFields.push('carried_forward_days = ?');
        values.push(carried_forward_days);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      values.push(id);

      await db.execute(`
        UPDATE employee_leave_entitlements 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `, values);

      res.json({
        success: true,
        message: 'Leave entitlement updated successfully'
      });
    } catch (error) {
      console.error('Error updating leave entitlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update leave entitlement',
        error: error.message
      });
    }
  }

  // ============================================================================
  // ENHANCED LEAVE APPLICATIONS
  // ============================================================================

  // Submit enhanced leave application
  async submitEnhancedLeaveApplication(req, res) {
    try {
      const {
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        reason,
        emergency_contact,
        handover_notes,
        is_half_day = false,
        half_day_period
      } = req.body;

      if (!employee_id || !leave_type_id || !start_date || !end_date || !reason) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }

      // Calculate total days
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const totalDays = is_half_day ? 0.5 : Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      // Check leave balance
      const year = startDate.getFullYear();
      const [entitlements] = await db.execute(`
        SELECT remaining_days FROM employee_leave_entitlements
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [employee_id, leave_type_id, year]);

      if (entitlements.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Leave entitlement not found for this employee and leave type'
        });
      }

      const remainingDays = parseFloat(entitlements[0].remaining_days);
      if (totalDays > remainingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance. Available: ${remainingDays} days, Requested: ${totalDays} days`
        });
      }

      // Submit application
      const [result] = await db.execute(`
        INSERT INTO leave_applications_enhanced (
          employee_id, leave_type_id, start_date, end_date, total_days,
          reason, emergency_contact, handover_notes, is_half_day, half_day_period
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employee_id, leave_type_id, start_date, end_date, totalDays,
        reason, emergency_contact, handover_notes, is_half_day, half_day_period
      ]);

      // Update pending days in entitlement
      await db.execute(`
        UPDATE employee_leave_entitlements 
        SET pending_days = pending_days + ?
        WHERE employee_id = ? AND leave_type_id = ? AND year = ?
      `, [totalDays, employee_id, leave_type_id, year]);

      res.json({
        success: true,
        message: 'Leave application submitted successfully',
        data: { id: result.insertId, total_days: totalDays }
      });
    } catch (error) {
      console.error('Error submitting leave application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit leave application',
        error: error.message
      });
    }
  }

  // Get enhanced leave applications
  async getEnhancedLeaveApplications(req, res) {
    try {
      const {
        employee_id,
        status,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT 
          la.*,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          e.employee_id as emp_id,
          lt.leave_type_name,
          lt.leave_code,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
        FROM leave_applications_enhanced la
        JOIN employees e ON la.employee_id = e.id
        JOIN leave_types_enhanced lt ON la.leave_type_id = lt.id
        LEFT JOIN employees approver ON la.approved_by = approver.id
        WHERE 1=1
      `;
      const params = [];

      if (employee_id) {
        query += ' AND la.employee_id = ?';
        params.push(employee_id);
      }

      if (status) {
        query += ' AND la.status = ?';
        params.push(status);
      }

      if (start_date) {
        query += ' AND la.start_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND la.end_date <= ?';
        params.push(end_date);
      }

      query += ' ORDER BY la.applied_date DESC';

      const offset = (page - 1) * limit;
      query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [applications] = await db.execute(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM leave_applications_enhanced la
        JOIN employees e ON la.employee_id = e.id
        JOIN leave_types_enhanced lt ON la.leave_type_id = lt.id
        LEFT JOIN employees approver ON la.approved_by = approver.id
        WHERE 1=1
      `;

      // Add the same WHERE conditions as the main query
      const countParams = [];
      if (employee_id) {
        countQuery += ' AND la.employee_id = ?';
        countParams.push(employee_id);
      }
      if (status) {
        countQuery += ' AND la.status = ?';
        countParams.push(status);
      }
      if (start_date) {
        countQuery += ' AND la.start_date >= ?';
        countParams.push(start_date);
      }
      if (end_date) {
        countQuery += ' AND la.end_date <= ?';
        countParams.push(end_date);
      }

      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        data: applications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave applications',
        error: error.message
      });
    }
  }

  // Approve/Reject leave application
  async processLeaveApplication(req, res) {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
      const approved_by = req.user?.id || 1;

      if (!id || !action) {
        return res.status(400).json({
          success: false,
          message: 'Application ID and action are required'
        });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action must be either approve or reject'
        });
      }

      // Get application details
      const [applications] = await db.execute(`
        SELECT * FROM leave_applications_enhanced WHERE id = ?
      `, [id]);

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Leave application not found'
        });
      }

      const application = applications[0];

      if (application.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Application has already been processed'
        });
      }

      const status = action === 'approve' ? 'approved' : 'rejected';

      // Update application status
      await db.execute(`
        UPDATE leave_applications_enhanced 
        SET status = ?, approved_by = ?, approved_date = NOW(), rejection_reason = ?
        WHERE id = ?
      `, [status, approved_by, rejection_reason, id]);

      // Update employee entitlements
      const year = new Date(application.start_date).getFullYear();

      if (action === 'approve') {
        // Move from pending to used days
        await db.execute(`
          UPDATE employee_leave_entitlements 
          SET pending_days = pending_days - ?, used_days = used_days + ?
          WHERE employee_id = ? AND leave_type_id = ? AND year = ?
        `, [application.total_days, application.total_days, application.employee_id, application.leave_type_id, year]);
      } else {
        // Remove from pending days
        await db.execute(`
          UPDATE employee_leave_entitlements 
          SET pending_days = pending_days - ?
          WHERE employee_id = ? AND leave_type_id = ? AND year = ?
        `, [application.total_days, application.employee_id, application.leave_type_id, year]);
      }

      res.json({
        success: true,
        message: `Leave application ${action}d successfully`
      });
    } catch (error) {
      console.error('Error processing leave application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process leave application',
        error: error.message
      });
    }
  }

  // Get employee leave balance summary
  async getEmployeeLeaveBalance(req, res) {
    try {
      const { employee_id } = req.params;
      const { year = new Date().getFullYear() } = req.query;

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID is required'
        });
      }

      const [balances] = await db.execute(`
        SELECT * FROM employee_leave_balances 
        WHERE employee_id = ? AND year = ?
        ORDER BY leave_type_name
      `, [employee_id, year]);

      // Get recent applications
      const [recentApplications] = await db.execute(`
        SELECT 
          la.*,
          lt.leave_type_name,
          lt.leave_code
        FROM leave_applications_enhanced la
        JOIN leave_types_enhanced lt ON la.leave_type_id = lt.id
        WHERE la.employee_id = ?
        ORDER BY la.applied_date DESC
        LIMIT 10
      `, [employee_id]);

      res.json({
        success: true,
        data: {
          balances,
          recent_applications: recentApplications
        }
      });
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave balance',
        error: error.message
      });
    }
  }
}

module.exports = new LeavePolicyManagementController();