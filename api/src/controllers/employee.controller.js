const db = require('../config/database');
const logger = require('../utils/logger');

class EmployeeController {
  // ====================
  // Employee Management
  // ====================

  // Get all employees with pagination and filtering
  async getAllEmployees(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        department,
        status = 'active',
        employee_type,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (status && status !== 'all') {
        whereClause += ' AND e.status = ?';
        params.push(status);
      }

      if (department) {
        whereClause += ' AND d.id = ?';
        params.push(department);
      }

      if (employee_type) {
        whereClause += ' AND e.employee_type = ?';
        params.push(employee_type);
      }

      if (search) {
        whereClause += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        ${whereClause}
      `;

      // Main query
      const query = `
        SELECT 
          e.*,
          d.department_name,
          d.department_code,
          CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
          mgr.employee_id as manager_employee_id
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult] = await db.execute(countQuery, params);
      const [employees] = await db.execute(query, [...params, parseInt(limit), parseInt(offset)]);

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

  // Get employee by ID
  async getEmployee(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          e.*,
          d.department_name,
          CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
          mgr.employee_id as manager_employee_id
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.id
        WHERE e.id = ?
      `;

      const [employees] = await db.execute(query, [id]);

      if (employees.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        data: employees[0]
      });
    } catch (error) {
      logger.error('Error fetching employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee',
        error: error.message
      });
    }
  }

  // Create new employee
  async createEmployee(req, res) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        employee_type = 'full_time',
        date_of_birth,
        gender,
        address,
        emergency_contact_name,
        emergency_contact_phone,
        hire_date,
        probation_end_date,
        department_id,
        designation,
        reporting_manager_id,
        work_location,
        basic_salary
      } = req.body;

      // Generate employee ID
      const employeeIdQuery = `
        SELECT CONCAT('EMP/', YEAR(CURDATE()), '/', 
          LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(employee_id, '/', -1) AS UNSIGNED)), 0) + 1, 3, '0')
        ) as next_employee_id
        FROM employees 
        WHERE employee_id LIKE CONCAT('EMP/', YEAR(CURDATE()), '/%')
      `;
      
      const [employeeIdResult] = await db.execute(employeeIdQuery);
      const employeeId = employeeIdResult[0].next_employee_id;

      const insertQuery = `
        INSERT INTO employees (
          employee_id, first_name, last_name, email, phone, employee_type,
          date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone,
          hire_date, probation_end_date, department_id, designation, 
          reporting_manager_id, work_location, basic_salary, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(insertQuery, [
        employeeId, first_name, last_name, email, phone, employee_type,
        date_of_birth, gender, address, emergency_contact_name, emergency_contact_phone,
        hire_date, probation_end_date, department_id, designation,
        reporting_manager_id, work_location, basic_salary, req.user?.id || 1
      ]);

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: {
          id: result.insertId,
          employee_id: employeeId
        }
      });
    } catch (error) {
      logger.error('Error creating employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create employee',
        error: error.message
      });
    }
  }

  // Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Build dynamic update query
      const allowedFields = [
        'first_name', 'last_name', 'email', 'phone', 'employee_type', 'status',
        'date_of_birth', 'gender', 'address', 'emergency_contact_name', 'emergency_contact_phone',
        'termination_date', 'probation_end_date', 'confirmation_date',
        'department_id', 'designation', 'reporting_manager_id', 'work_location', 'basic_salary'
      ];

      const updateFields = [];
      const values = [];

      Object.keys(updates).forEach(field => {
        if (allowedFields.includes(field) && updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(updates[field]);
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
        UPDATE employees 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      const [result] = await db.execute(updateQuery, values);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        message: 'Employee updated successfully'
      });
    } catch (error) {
      logger.error('Error updating employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee',
        error: error.message
      });
    }
  }

  // ====================
  // Attendance Management
  // ====================

  // Record attendance (check-in/check-out)
  async recordAttendance(req, res) {
    try {
      const {
        employee_id,
        attendance_date = new Date().toISOString().split('T')[0],
        action, // 'check_in' or 'check_out'
        timestamp = new Date(),
        location,
        latitude,
        longitude,
        method = 'manual',
        device_info
      } = req.body;

      // Check if attendance record exists for the date
      const checkQuery = `
        SELECT * FROM attendance_records 
        WHERE employee_id = ? AND attendance_date = ?
      `;
      
      const [existing] = await db.execute(checkQuery, [employee_id, attendance_date]);

      let query, params;

      if (existing.length === 0) {
        // Create new attendance record
        if (action === 'check_out') {
          return res.status(400).json({
            success: false,
            message: 'Cannot check out without checking in first'
          });
        }

        query = `
          INSERT INTO attendance_records (
            employee_id, attendance_date, check_in_time, check_in_location,
            check_in_latitude, check_in_longitude, check_in_method, check_in_device_info
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        params = [
          employee_id, attendance_date, timestamp, location,
          latitude, longitude, method, JSON.stringify(device_info)
        ];
      } else {
        // Update existing record
        const record = existing[0];
        
        if (action === 'check_in' && record.check_in_time) {
          return res.status(400).json({
            success: false,
            message: 'Already checked in for today'
          });
        }

        if (action === 'check_out' && !record.check_in_time) {
          return res.status(400).json({
            success: false,
            message: 'Cannot check out without checking in first'
          });
        }

        if (action === 'check_out' && record.check_out_time) {
          return res.status(400).json({
            success: false,
            message: 'Already checked out for today'
          });
        }

        if (action === 'check_in') {
          query = `
            UPDATE attendance_records 
            SET check_in_time = ?, check_in_location = ?, check_in_latitude = ?,
                check_in_longitude = ?, check_in_method = ?, check_in_device_info = ?
            WHERE id = ?
          `;
          params = [timestamp, location, latitude, longitude, method, JSON.stringify(device_info), record.id];
        } else {
          // Calculate hours worked
          const checkInTime = new Date(record.check_in_time);
          const checkOutTime = new Date(timestamp);
          const totalHours = Math.abs(checkOutTime - checkInTime) / (1000 * 60 * 60);

          query = `
            UPDATE attendance_records 
            SET check_out_time = ?, check_out_location = ?, check_out_latitude = ?,
                check_out_longitude = ?, check_out_method = ?, check_out_device_info = ?,
                total_hours = ?, regular_hours = ?, overtime_hours = ?
            WHERE id = ?
          `;
          
          const regularHours = Math.min(totalHours, 9); // Assuming 9 hours regular
          const overtimeHours = Math.max(0, totalHours - 9);
          
          params = [
            timestamp, location, latitude, longitude, method, JSON.stringify(device_info),
            totalHours, regularHours, overtimeHours, record.id
          ];
        }
      }

      await db.execute(query, params);

      res.json({
        success: true,
        message: `Successfully ${action.replace('_', 'ed ')}`
      });
    } catch (error) {
      logger.error('Error recording attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record attendance',
        error: error.message
      });
    }
  }

  // Get attendance records
  async getAttendanceRecords(req, res) {
    try {
      const {
        employee_id,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (employee_id) {
        whereClause += ' AND ar.employee_id = ?';
        params.push(employee_id);
      }

      if (start_date) {
        whereClause += ' AND ar.attendance_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ' AND ar.attendance_date <= ?';
        params.push(end_date);
      }

      const query = `
        SELECT 
          ar.*,
          e.employee_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          ws.shift_name
        FROM attendance_records ar
        JOIN employees e ON ar.employee_id = e.id
        LEFT JOIN work_shifts ws ON ar.shift_id = ws.id
        ${whereClause}
        ORDER BY ar.attendance_date DESC, ar.check_in_time DESC
        LIMIT ? OFFSET ?
      `;

      const [records] = await db.execute(query, [...params, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      logger.error('Error fetching attendance records:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance records',
        error: error.message
      });
    }
  }

  // ====================
  // Leave Management
  // ====================

  // Apply for leave
  async applyLeave(req, res) {
    try {
      const {
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        is_half_day = false,
        half_day_session,
        reason,
        emergency_contact_during_leave,
        contact_phone
      } = req.body;

      // Generate application ID
      const appIdQuery = `
        SELECT CONCAT('LA/', YEAR(CURDATE()), '/', 
          LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(application_id, '/', -1) AS UNSIGNED)), 0) + 1, 4, '0')
        ) as next_application_id
        FROM leave_applications 
        WHERE application_id LIKE CONCAT('LA/', YEAR(CURDATE()), '/%')
      `;
      
      const [appIdResult] = await db.execute(appIdQuery);
      const applicationId = appIdResult[0].next_application_id;

      // Calculate total days
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      let totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      if (is_half_day) {
        totalDays = 0.5;
      }

      // Check leave balance
      const balanceQuery = `
        SELECT available_balance 
        FROM employee_leave_balances 
        WHERE employee_id = ? AND leave_type_id = ? AND leave_year = YEAR(CURDATE())
      `;
      
      const [balanceResult] = await db.execute(balanceQuery, [employee_id, leave_type_id]);
      
      if (balanceResult.length === 0 || balanceResult[0].available_balance < totalDays) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient leave balance'
        });
      }

      const insertQuery = `
        INSERT INTO leave_applications (
          application_id, employee_id, leave_type_id, start_date, end_date,
          total_days, is_half_day, half_day_session, reason,
          emergency_contact_during_leave, contact_phone, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)
      `;

      const [result] = await db.execute(insertQuery, [
        applicationId, employee_id, leave_type_id, start_date, end_date,
        totalDays, is_half_day, half_day_session, reason,
        emergency_contact_during_leave, contact_phone, req.user?.id || 1
      ]);

      res.status(201).json({
        success: true,
        message: 'Leave application submitted successfully',
        data: {
          id: result.insertId,
          application_id: applicationId
        }
      });
    } catch (error) {
      logger.error('Error applying for leave:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply for leave',
        error: error.message
      });
    }
  }

  // Get leave applications
  async getLeaveApplications(req, res) {
    try {
      const {
        employee_id,
        status,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (employee_id) {
        whereClause += ' AND la.employee_id = ?';
        params.push(employee_id);
      }

      if (status) {
        whereClause += ' AND la.status = ?';
        params.push(status);
      }

      if (start_date) {
        whereClause += ' AND la.start_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ' AND la.end_date <= ?';
        params.push(end_date);
      }

      const query = `
        SELECT 
          la.*,
          e.employee_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          lt.leave_type_name,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
        FROM leave_applications la
        JOIN employees e ON la.employee_id = e.id
        JOIN leave_types lt ON la.leave_type_id = lt.id
        LEFT JOIN employees approver ON la.final_approved_by = approver.id
        ${whereClause}
        ORDER BY la.applied_date DESC
        LIMIT ? OFFSET ?
      `;

      const [applications] = await db.execute(query, [...params, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      logger.error('Error fetching leave applications:', error);
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
      const { action, comments } = req.body; // action: 'approve' or 'reject'

      const updateQuery = `
        UPDATE leave_applications 
        SET status = ?, final_approved_by = ?, final_approved_date = ?, 
            ${action === 'reject' ? 'rejection_reason' : 'admin_remarks'} = ?
        WHERE id = ?
      `;

      const status = action === 'approve' ? 'approved' : 'rejected';
      await db.execute(updateQuery, [
        status, req.user?.id || 1, new Date(), comments, id
      ]);

      // If approved, update leave balance
      if (action === 'approve') {
        const leaveQuery = `
          SELECT employee_id, leave_type_id, total_days 
          FROM leave_applications 
          WHERE id = ?
        `;
        
        const [leaveResult] = await db.execute(leaveQuery, [id]);
        
        if (leaveResult.length > 0) {
          const { employee_id, leave_type_id, total_days } = leaveResult[0];
          
          const balanceUpdateQuery = `
            UPDATE employee_leave_balances 
            SET used_days = used_days + ? 
            WHERE employee_id = ? AND leave_type_id = ? AND leave_year = YEAR(CURDATE())
          `;
          
          await db.execute(balanceUpdateQuery, [total_days, employee_id, leave_type_id]);
        }
      }

      res.json({
        success: true,
        message: `Leave application ${action}d successfully`
      });
    } catch (error) {
      logger.error('Error processing leave application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process leave application',
        error: error.message
      });
    }
  }

  // Get employee leave balances
  async getLeaveBalances(req, res) {
    try {
      const { employee_id } = req.params;
      const { year = new Date().getFullYear() } = req.query;

      const query = `
        SELECT 
          elb.*,
          lt.leave_type_name,
          lt.leave_code,
          lt.is_paid
        FROM employee_leave_balances elb
        JOIN leave_types lt ON elb.leave_type_id = lt.id
        WHERE elb.employee_id = ? AND elb.leave_year = ?
        ORDER BY lt.leave_type_name
      `;

      const [balances] = await db.execute(query, [employee_id, year]);

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      logger.error('Error fetching leave balances:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave balances',
        error: error.message
      });
    }
  }

  // ====================
  // Dashboard & Reports
  // ====================

  // Get employee dashboard data
  async getDashboardData(req, res) {
    try {
      // Total employees by status
      const statusQuery = `
        SELECT status, COUNT(*) as count 
        FROM employees 
        GROUP BY status
      `;

      // Department wise employee count
      const deptQuery = `
        SELECT d.department_name, COUNT(e.id) as employee_count
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
        GROUP BY d.id, d.department_name
        ORDER BY employee_count DESC
      `;

      // Today's attendance summary
      const attendanceQuery = `
        SELECT 
          COUNT(*) as total_employees,
          SUM(CASE WHEN ar.check_in_time IS NOT NULL THEN 1 ELSE 0 END) as checked_in,
          SUM(CASE WHEN ar.attendance_status = 'on_leave' THEN 1 ELSE 0 END) as on_leave,
          SUM(CASE WHEN ar.is_late = 1 THEN 1 ELSE 0 END) as late_arrivals
        FROM employees e
        LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
          AND ar.attendance_date = CURDATE()
        WHERE e.status = 'active'
      `;

      // Pending leave applications
      const leaveQuery = `
        SELECT COUNT(*) as pending_leaves
        FROM leave_applications
        WHERE status = 'submitted'
      `;

      const [statusResult] = await db.execute(statusQuery);
      const [deptResult] = await db.execute(deptQuery);
      const [attendanceResult] = await db.execute(attendanceQuery);
      const [leaveResult] = await db.execute(leaveQuery);

      res.json({
        success: true,
        data: {
          employee_status_summary: statusResult,
          department_summary: deptResult,
          today_attendance: attendanceResult[0],
          pending_leaves: leaveResult[0].pending_leaves
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  // ====================
  // Master Data Management
  // ====================

  // Get all departments
  async getDepartments(req, res) {
    try {
      const query = `
        SELECT 
          d.*,
          CONCAT(hod.first_name, ' ', hod.last_name) as head_name,
          COUNT(e.id) as employee_count
        FROM departments d
        LEFT JOIN employees hod ON d.head_of_department_id = hod.id
        LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
        WHERE d.status = 'active'
        GROUP BY d.id
        ORDER BY d.department_name
      `;

      const [departments] = await db.execute(query);

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

  // Get all leave types
  async getLeaveTypes(req, res) {
    try {
      const query = `
        SELECT * FROM leave_types 
        WHERE status = 'active'
        ORDER BY leave_type_name
      `;

      const [leaveTypes] = await db.execute(query);

      res.json({
        success: true,
        data: leaveTypes
      });
    } catch (error) {
      logger.error('Error fetching leave types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leave types',
        error: error.message
      });
    }
  }

  // Get work locations
  async getWorkLocations(req, res) {
    try {
      const query = `
        SELECT * FROM work_locations 
        WHERE status = 'active'
        ORDER BY location_name
      `;

      const [locations] = await db.execute(query);

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
}

module.exports = new EmployeeController();