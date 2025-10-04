const db = require('../config/database');
const geolib = require('geolib');

class EnhancedAttendanceController {
  // ============================================================================
  // ATTENDANCE VALIDATION RULES MANAGEMENT
  // ============================================================================

  // Get attendance validation rules
  async getValidationRules(req, res) {
    try {
      const [rules] = await db.execute(`
        SELECT 
          avr.*,
          ol.location_name,
          ol.address,
          ol.location_type
        FROM attendance_validation_rules avr
        JOIN office_locations ol ON avr.location_id = ol.id
        WHERE avr.is_active = TRUE
        ORDER BY ol.location_name
      `);

      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Error fetching validation rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch validation rules',
        error: error.message
      });
    }
  }

  // Create attendance validation rule
  async createValidationRule(req, res) {
    try {
      const {
        rule_name,
        location_id,
        max_distance_meters = 100,
        allow_outside_hours = false,
        start_time = '08:00:00',
        end_time = '18:00:00',
        grace_period_minutes = 15,
        require_photo = false,
        require_manager_approval = false
      } = req.body;

      if (!rule_name || !location_id) {
        return res.status(400).json({
          success: false,
          message: 'Rule name and location ID are required'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO attendance_validation_rules (
          rule_name, location_id, max_distance_meters, allow_outside_hours,
          start_time, end_time, grace_period_minutes, require_photo, require_manager_approval
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        rule_name, location_id, max_distance_meters, allow_outside_hours,
        start_time, end_time, grace_period_minutes, require_photo, require_manager_approval
      ]);

      res.json({
        success: true,
        message: 'Validation rule created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating validation rule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create validation rule',
        error: error.message
      });
    }
  }

  // ============================================================================
  // ENHANCED ATTENDANCE RECORDING
  // ============================================================================

  // Record attendance with enhanced validation
  async recordAttendance(req, res) {
    try {
      const {
        employee_id,
        action, // 'check_in' or 'check_out'
        latitude,
        longitude,
        photo_data, // base64 encoded photo
        notes
      } = req.body;

      if (!employee_id || !action || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID, action, latitude, and longitude are required'
        });
      }

      const attendanceDate = new Date().toISOString().split('T')[0];
      const currentTime = new Date();

      // Get or create attendance record for today
      let [attendanceRecords] = await db.execute(`
        SELECT * FROM attendance_records_enhanced 
        WHERE employee_id = ? AND attendance_date = ?
      `, [employee_id, attendanceDate]);

      let attendanceRecord = attendanceRecords[0];

      // Validate location access
      const locationValidation = await this.validateAttendanceLocation(employee_id, latitude, longitude);
      if (!locationValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: locationValidation.message,
          validation_details: locationValidation
        });
      }

      const validLocation = locationValidation.validLocations[0];

      if (action === 'check_in') {
        // Validate check-in
        if (attendanceRecord && attendanceRecord.check_in_time) {
          return res.status(400).json({
            success: false,
            message: 'Employee has already checked in today'
          });
        }

        // Check working hours and calculate late status
        const workingHours = await this.getWorkingHours(validLocation.location_id);
        const isLate = currentTime.getHours() > parseInt(workingHours.start_time.split(':')[0]) + 
                       (workingHours.grace_period_minutes / 60);
        const lateMinutes = isLate ? 
          Math.max(0, (currentTime.getHours() - parseInt(workingHours.start_time.split(':')[0])) * 60 + 
                      currentTime.getMinutes() - parseInt(workingHours.start_time.split(':')[1])) : 0;

        // Save photo if required
        let photoPath = null;
        if (photo_data && workingHours.require_photo) {
          photoPath = await this.saveAttendancePhoto(employee_id, 'check_in', photo_data);
        }

        if (attendanceRecord) {
          // Update existing record
          await db.execute(`
            UPDATE attendance_records_enhanced 
            SET check_in_time = NOW(),
                check_in_location_id = ?,
                check_in_latitude = ?,
                check_in_longitude = ?,
                check_in_distance_meters = ?,
                check_in_photo_path = ?,
                is_late = ?,
                late_minutes = ?,
                validation_status = ?,
                attendance_status = 'present'
            WHERE id = ?
          `, [
            validLocation.location_id, latitude, longitude, validLocation.distance,
            photoPath, isLate, lateMinutes, locationValidation.validationStatus,
            attendanceRecord.id
          ]);
        } else {
          // Create new record
          await db.execute(`
            INSERT INTO attendance_records_enhanced (
              employee_id, attendance_date, check_in_time, check_in_location_id,
              check_in_latitude, check_in_longitude, check_in_distance_meters,
              check_in_photo_path, is_late, late_minutes, validation_status,
              attendance_status
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, 'present')
          `, [
            employee_id, attendanceDate, validLocation.location_id, latitude, longitude,
            validLocation.distance, photoPath, isLate, lateMinutes, locationValidation.validationStatus
          ]);
        }

        res.json({
          success: true,
          message: 'Check-in recorded successfully',
          data: {
            check_in_time: currentTime,
            location: validLocation.location_name,
            is_late: isLate,
            late_minutes: lateMinutes,
            distance_meters: validLocation.distance
          }
        });

      } else if (action === 'check_out') {
        if (!attendanceRecord || !attendanceRecord.check_in_time) {
          return res.status(400).json({
            success: false,
            message: 'Employee must check in before checking out'
          });
        }

        if (attendanceRecord.check_out_time) {
          return res.status(400).json({
            success: false,
            message: 'Employee has already checked out today'
          });
        }

        // Calculate total hours
        const checkInTime = new Date(attendanceRecord.check_in_time);
        const totalHours = (currentTime - checkInTime) / (1000 * 60 * 60);

        // Check for early departure
        const workingHours = await this.getWorkingHours(validLocation.location_id);
        const expectedEndTime = new Date();
        expectedEndTime.setHours(parseInt(workingHours.end_time.split(':')[0]), 
                                parseInt(workingHours.end_time.split(':')[1]), 0, 0);
        
        const isEarlyDeparture = currentTime < expectedEndTime;
        const earlyDepartureMinutes = isEarlyDeparture ? 
          Math.max(0, (expectedEndTime - currentTime) / (1000 * 60)) : 0;

        // Save photo if required
        let photoPath = null;
        if (photo_data && workingHours.require_photo) {
          photoPath = await this.saveAttendancePhoto(employee_id, 'check_out', photo_data);
        }

        // Update attendance record
        await db.execute(`
          UPDATE attendance_records_enhanced 
          SET check_out_time = NOW(),
              check_out_location_id = ?,
              check_out_latitude = ?,
              check_out_longitude = ?,
              check_out_distance_meters = ?,
              check_out_photo_path = ?,
              total_hours = ?,
              is_early_departure = ?,
              early_departure_minutes = ?
          WHERE id = ?
        `, [
          validLocation.location_id, latitude, longitude, validLocation.distance,
          photoPath, totalHours, isEarlyDeparture, earlyDepartureMinutes,
          attendanceRecord.id
        ]);

        res.json({
          success: true,
          message: 'Check-out recorded successfully',
          data: {
            check_out_time: currentTime,
            location: validLocation.location_name,
            total_hours: Math.round(totalHours * 100) / 100,
            is_early_departure: isEarlyDeparture,
            early_departure_minutes: Math.round(earlyDepartureMinutes),
            distance_meters: validLocation.distance
          }
        });
      }

    } catch (error) {
      console.error('Error recording attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record attendance',
        error: error.message
      });
    }
  }

  // Get enhanced attendance records
  async getEnhancedAttendanceRecords(req, res) {
    try {
      const {
        employee_id,
        start_date,
        end_date,
        status,
        validation_status,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT 
          are.*,
          e.employee_id as emp_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          cin_loc.location_name as check_in_location_name,
          cout_loc.location_name as check_out_location_name,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
        FROM attendance_records_enhanced are
        JOIN employees e ON are.employee_id = e.id
        LEFT JOIN office_locations cin_loc ON are.check_in_location_id = cin_loc.id
        LEFT JOIN office_locations cout_loc ON are.check_out_location_id = cout_loc.id
        LEFT JOIN employees approver ON are.approved_by = approver.id
        WHERE 1=1
      `;
      const params = [];

      if (employee_id) {
        query += ' AND are.employee_id = ?';
        params.push(employee_id);
      }

      if (start_date) {
        query += ' AND are.attendance_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND are.attendance_date <= ?';
        params.push(end_date);
      }

      if (status) {
        query += ' AND are.attendance_status = ?';
        params.push(status);
      }

      if (validation_status) {
        query += ' AND are.validation_status = ?';
        params.push(validation_status);
      }

      query += ' ORDER BY are.attendance_date DESC, e.first_name';

      const offset = (page - 1) * limit;
      query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [records] = await db.execute(query, params);

      // Get total count
      let countQuery = query.split('ORDER BY')[0].replace(/SELECT .*? FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: {
          records,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance records',
        error: error.message
      });
    }
  }

  // ============================================================================
  // ATTENDANCE EXCEPTIONS AND APPROVALS
  // ============================================================================

  // Request attendance exception
  async requestAttendanceException(req, res) {
    try {
      const {
        attendance_record_id,
        exception_type,
        description
      } = req.body;
      const requested_by = req.user?.id || 1;

      if (!attendance_record_id || !exception_type || !description) {
        return res.status(400).json({
          success: false,
          message: 'Attendance record ID, exception type, and description are required'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO attendance_exceptions (
          attendance_record_id, exception_type, description, requested_by
        ) VALUES (?, ?, ?, ?)
      `, [attendance_record_id, exception_type, description, requested_by]);

      res.json({
        success: true,
        message: 'Attendance exception request submitted successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error requesting attendance exception:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request attendance exception',
        error: error.message
      });
    }
  }

  // Process attendance exception
  async processAttendanceException(req, res) {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body; // action: 'approve' or 'reject'
      const approved_by = req.user?.id || 1;

      if (!id || !action) {
        return res.status(400).json({
          success: false,
          message: 'Exception ID and action are required'
        });
      }

      const status = action === 'approve' ? 'approved' : 'rejected';

      await db.execute(`
        UPDATE attendance_exceptions 
        SET status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ?
        WHERE id = ?
      `, [status, approved_by, rejection_reason, id]);

      if (action === 'approve') {
        // Update the related attendance record validation status
        const [exceptions] = await db.execute(`
          SELECT attendance_record_id FROM attendance_exceptions WHERE id = ?
        `, [id]);

        if (exceptions.length > 0) {
          await db.execute(`
            UPDATE attendance_records_enhanced 
            SET validation_status = 'valid', approved_by = ?
            WHERE id = ?
          `, [approved_by, exceptions[0].attendance_record_id]);
        }
      }

      res.json({
        success: true,
        message: `Attendance exception ${action}d successfully`
      });
    } catch (error) {
      console.error('Error processing attendance exception:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process attendance exception',
        error: error.message
      });
    }
  }

  // ============================================================================
  // ATTENDANCE ANALYTICS AND REPORTS
  // ============================================================================

  // Get attendance analytics
  async getAttendanceAnalytics(req, res) {
    try {
      const { start_date, end_date, employee_id } = req.query;

      let dateFilter = '';
      const params = [];

      if (start_date && end_date) {
        dateFilter = 'AND are.attendance_date BETWEEN ? AND ?';
        params.push(start_date, end_date);
      } else {
        // Default to current month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        dateFilter = 'AND are.attendance_date BETWEEN ? AND ?';
        params.push(firstDay, lastDay);
      }

      let employeeFilter = '';
      if (employee_id) {
        employeeFilter = 'AND are.employee_id = ?';
        params.push(employee_id);
      }

      // Overall statistics
      const [overallStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN are.check_in_time IS NOT NULL THEN 1 END) as check_ins,
          COUNT(CASE WHEN are.check_out_time IS NOT NULL THEN 1 END) as check_outs,
          COUNT(CASE WHEN are.is_late = 1 THEN 1 END) as late_arrivals,
          COUNT(CASE WHEN are.is_early_departure = 1 THEN 1 END) as early_departures,
          COUNT(CASE WHEN are.validation_status = 'suspicious' THEN 1 END) as suspicious_records,
          AVG(are.total_hours) as avg_daily_hours,
          AVG(are.late_minutes) as avg_late_minutes
        FROM attendance_records_enhanced are
        JOIN employees e ON are.employee_id = e.id
        WHERE e.status = 'active' ${dateFilter} ${employeeFilter}
      `, params);

      // Location-wise statistics
      const [locationStats] = await db.execute(`
        SELECT 
          ol.location_name,
          ol.location_type,
          COUNT(are.id) as total_check_ins,
          AVG(are.check_in_distance_meters) as avg_distance,
          COUNT(CASE WHEN are.validation_status = 'suspicious' THEN 1 END) as suspicious_count
        FROM attendance_records_enhanced are
        JOIN office_locations ol ON are.check_in_location_id = ol.id
        JOIN employees e ON are.employee_id = e.id
        WHERE e.status = 'active' ${dateFilter} ${employeeFilter}
        GROUP BY ol.id, ol.location_name, ol.location_type
        ORDER BY total_check_ins DESC
      `, params);

      res.json({
        success: true,
        data: {
          overall_statistics: overallStats[0],
          location_statistics: locationStats,
          date_range: {
            start_date: params[0],
            end_date: params[1]
          }
        }
      });
    } catch (error) {
      console.error('Error fetching attendance analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance analytics',
        error: error.message
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  // Validate attendance location
  async validateAttendanceLocation(employeeId, latitude, longitude) {
    try {
      // Get employee's authorized locations
      const [permissions] = await db.execute(`
        SELECT 
          elp.*,
          ol.location_name,
          ol.latitude as location_lat,
          ol.longitude as location_lng,
          ol.radius_meters,
          ol.location_type,
          avr.max_distance_meters,
          avr.allow_outside_hours,
          avr.start_time,
          avr.end_time,
          avr.grace_period_minutes
        FROM employee_location_permissions elp
        JOIN office_locations ol ON elp.location_id = ol.id
        LEFT JOIN attendance_validation_rules avr ON ol.id = avr.location_id AND avr.is_active = TRUE
        WHERE elp.employee_id = ? 
          AND elp.is_active = TRUE 
          AND ol.is_active = TRUE
          AND (elp.permission_type = 'attendance' OR elp.permission_type = 'both')
      `, [employeeId]);

      const currentLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
      const validLocations = [];

      for (const permission of permissions) {
        const officeLocation = {
          latitude: parseFloat(permission.location_lat),
          longitude: parseFloat(permission.location_lng)
        };

        const distance = geolib.getDistance(currentLocation, officeLocation);
        const maxDistance = permission.max_distance_meters || permission.radius_meters;

        if (distance <= maxDistance) {
          validLocations.push({
            location_id: permission.location_id,
            location_name: permission.location_name,
            location_type: permission.location_type,
            distance: distance,
            max_distance: maxDistance,
            is_remote_authorized: permission.is_remote_work_authorized
          });
        }
      }

      const isValid = validLocations.length > 0;
      const validationStatus = isValid ? 'valid' : 'invalid';

      return {
        isValid,
        validationStatus,
        validLocations,
        message: isValid ? 'Location validation successful' : 'No authorized locations found within range'
      };
    } catch (error) {
      console.error('Error validating attendance location:', error);
      return {
        isValid: false,
        validationStatus: 'invalid',
        validLocations: [],
        message: 'Location validation failed'
      };
    }
  }

  // Get working hours for location
  async getWorkingHours(locationId) {
    try {
      const [rules] = await db.execute(`
        SELECT * FROM attendance_validation_rules 
        WHERE location_id = ? AND is_active = TRUE 
        LIMIT 1
      `, [locationId]);

      if (rules.length > 0) {
        return rules[0];
      }

      // Return default working hours
      return {
        start_time: '09:00:00',
        end_time: '18:00:00',
        grace_period_minutes: 15,
        require_photo: false
      };
    } catch (error) {
      console.error('Error getting working hours:', error);
      return {
        start_time: '09:00:00',
        end_time: '18:00:00',
        grace_period_minutes: 15,
        require_photo: false
      };
    }
  }

  // Save attendance photo (placeholder implementation)
  async saveAttendancePhoto(employeeId, action, photoData) {
    try {
      // TODO: Implement actual photo storage (file system, cloud storage, etc.)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `attendance_${employeeId}_${action}_${timestamp}.jpg`;
      const filePath = `/uploads/attendance/${fileName}`;
      
      // In a real implementation, you would save the base64 photoData to the file system
      // For now, we'll just return the file path
      return filePath;
    } catch (error) {
      console.error('Error saving attendance photo:', error);
      return null;
    }
  }
}

module.exports = new EnhancedAttendanceController();