const db = require('../config/database');
const geolib = require('geolib');

class LocationBasedAccessController {
  // ============================================================================
  // OFFICE LOCATIONS MANAGEMENT
  // ============================================================================

  // Get all office locations
  async getOfficeLocations(req, res) {
    try {
      const [locations] = await db.execute(`
        SELECT * FROM office_locations 
        WHERE is_active = TRUE
        ORDER BY location_type, location_name
      `);

      res.json({
        success: true,
        data: locations
      });
    } catch (error) {
      console.error('Error fetching office locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch office locations',
        error: error.message
      });
    }
  }

  // Create office location
  async createOfficeLocation(req, res) {
    try {
      const {
        location_name,
        address,
        latitude,
        longitude,
        radius_meters = 100,
        location_type = 'branch_office',
        timezone = 'Asia/Kolkata'
      } = req.body;

      if (!location_name || !address || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Location name, address, latitude, and longitude are required'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO office_locations (
          location_name, address, latitude, longitude, radius_meters, 
          location_type, timezone
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [location_name, address, latitude, longitude, radius_meters, location_type, timezone]);

      res.json({
        success: true,
        message: 'Office location created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating office location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create office location',
        error: error.message
      });
    }
  }

  // Update office location
  async updateOfficeLocation(req, res) {
    try {
      const { id } = req.params;
      const updateFields = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Location ID is required'
        });
      }

      const allowedFields = [
        'location_name', 'address', 'latitude', 'longitude', 'radius_meters',
        'location_type', 'timezone', 'is_active'
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
        UPDATE office_locations SET ${setClause} WHERE id = ?
      `, values);

      res.json({
        success: true,
        message: 'Office location updated successfully'
      });
    } catch (error) {
      console.error('Error updating office location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update office location',
        error: error.message
      });
    }
  }

  // ============================================================================
  // EMPLOYEE LOCATION PERMISSIONS
  // ============================================================================

  // Get employee location permissions
  async getEmployeeLocationPermissions(req, res) {
    try {
      const { employee_id } = req.query;

      let query = `
        SELECT 
          elp.*,
          e.employee_id as emp_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          ol.location_name,
          ol.address,
          ol.location_type
        FROM employee_location_permissions elp
        JOIN employees e ON elp.employee_id = e.id
        JOIN office_locations ol ON elp.location_id = ol.id
        WHERE elp.is_active = TRUE
      `;
      const params = [];

      if (employee_id) {
        query += ' AND elp.employee_id = ?';
        params.push(employee_id);
      }

      query += ' ORDER BY e.first_name, ol.location_name';

      const [permissions] = await db.execute(query, params);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error fetching employee location permissions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee location permissions',
        error: error.message
      });
    }
  }

  // Grant location permission to employee
  async grantLocationPermission(req, res) {
    try {
      const {
        employee_id,
        location_id,
        permission_type = 'both',
        is_remote_work_authorized = false,
        remote_work_start_date,
        remote_work_end_date
      } = req.body;

      if (!employee_id || !location_id) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID and Location ID are required'
        });
      }

      // Check if permission already exists
      const [existing] = await db.execute(`
        SELECT id FROM employee_location_permissions 
        WHERE employee_id = ? AND location_id = ?
      `, [employee_id, location_id]);

      if (existing.length > 0) {
        // Update existing permission
        await db.execute(`
          UPDATE employee_location_permissions 
          SET permission_type = ?, is_remote_work_authorized = ?, 
              remote_work_start_date = ?, remote_work_end_date = ?, is_active = TRUE
          WHERE employee_id = ? AND location_id = ?
        `, [permission_type, is_remote_work_authorized, remote_work_start_date, 
            remote_work_end_date, employee_id, location_id]);
      } else {
        // Create new permission
        await db.execute(`
          INSERT INTO employee_location_permissions (
            employee_id, location_id, permission_type, is_remote_work_authorized,
            remote_work_start_date, remote_work_end_date
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [employee_id, location_id, permission_type, is_remote_work_authorized,
            remote_work_start_date, remote_work_end_date]);
      }

      res.json({
        success: true,
        message: 'Location permission granted successfully'
      });
    } catch (error) {
      console.error('Error granting location permission:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to grant location permission',
        error: error.message
      });
    }
  }

  // Validate location access
  async validateLocationAccess(req, res) {
    try {
      const { employee_id, latitude, longitude, access_type = 'attendance' } = req.body;

      if (!employee_id || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID, latitude, and longitude are required'
        });
      }

      // Get employee's authorized locations
      const [permissions] = await db.execute(`
        SELECT 
          elp.*,
          ol.location_name,
          ol.latitude as location_lat,
          ol.longitude as location_lng,
          ol.radius_meters,
          ol.location_type
        FROM employee_location_permissions elp
        JOIN office_locations ol ON elp.location_id = ol.id
        WHERE elp.employee_id = ? 
          AND elp.is_active = TRUE 
          AND ol.is_active = TRUE
          AND (elp.permission_type = ? OR elp.permission_type = 'both')
      `, [employee_id, access_type]);

      const currentLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
      const validLocations = [];

      for (const permission of permissions) {
        const officeLocation = {
          latitude: parseFloat(permission.location_lat),
          longitude: parseFloat(permission.location_lng)
        };

        const distance = geolib.getDistance(currentLocation, officeLocation);

        if (distance <= permission.radius_meters) {
          validLocations.push({
            location_id: permission.location_id,
            location_name: permission.location_name,
            location_type: permission.location_type,
            distance_meters: distance,
            is_remote_authorized: permission.is_remote_work_authorized
          });
        }
      }

      const isValid = validLocations.length > 0;

      res.json({
        success: true,
        data: {
          is_valid: isValid,
          valid_locations: validLocations,
          current_location: currentLocation,
          message: isValid ? 'Location access authorized' : 'Location access denied'
        }
      });
    } catch (error) {
      console.error('Error validating location access:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate location access',
        error: error.message
      });
    }
  }

  // ============================================================================
  // IP ACCESS CONTROLS
  // ============================================================================

  // Get IP access controls
  async getIPAccessControls(req, res) {
    try {
      const [controls] = await db.execute(`
        SELECT 
          iac.*,
          ol.location_name
        FROM ip_access_controls iac
        LEFT JOIN office_locations ol ON iac.location_id = ol.id
        WHERE iac.is_active = TRUE
        ORDER BY iac.access_type, iac.rule_name
      `);

      res.json({
        success: true,
        data: controls
      });
    } catch (error) {
      console.error('Error fetching IP access controls:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch IP access controls',
        error: error.message
      });
    }
  }

  // Create IP access control rule
  async createIPAccessControl(req, res) {
    try {
      const {
        rule_name,
        ip_address,
        subnet_mask,
        access_type = 'allow',
        location_id,
        description
      } = req.body;

      if (!rule_name || !ip_address) {
        return res.status(400).json({
          success: false,
          message: 'Rule name and IP address are required'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO ip_access_controls (
          rule_name, ip_address, subnet_mask, access_type, location_id, description
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [rule_name, ip_address, subnet_mask, access_type, location_id, description]);

      res.json({
        success: true,
        message: 'IP access control rule created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating IP access control:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create IP access control',
        error: error.message
      });
    }
  }

  // Validate IP access
  async validateIPAccess(req, res) {
    try {
      const { ip_address } = req.body;

      if (!ip_address) {
        return res.status(400).json({
          success: false,
          message: 'IP address is required'
        });
      }

      // Get all active IP access rules
      const [rules] = await db.execute(`
        SELECT * FROM ip_access_controls WHERE is_active = TRUE
        ORDER BY access_type DESC  -- Deny rules first
      `);

      let accessAllowed = true;
      let matchedRule = null;

      for (const rule of rules) {
        const isMatch = this.isIPMatch(ip_address, rule.ip_address, rule.subnet_mask);
        
        if (isMatch) {
          matchedRule = rule;
          accessAllowed = rule.access_type === 'allow';
          break; // First match wins
        }
      }

      res.json({
        success: true,
        data: {
          access_allowed: accessAllowed,
          ip_address,
          matched_rule: matchedRule,
          message: accessAllowed ? 'IP access authorized' : 'IP access denied'
        }
      });
    } catch (error) {
      console.error('Error validating IP access:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate IP access',
        error: error.message
      });
    }
  }

  // ============================================================================
  // LOGIN ATTEMPT LOGGING
  // ============================================================================

  // Log login attempt
  async logLoginAttempt(req, res) {
    try {
      const {
        employee_id,
        email,
        ip_address,
        user_agent,
        location_data,
        attempt_result,
        failure_reason,
        session_token
      } = req.body;

      if (!email || !ip_address || !attempt_result) {
        return res.status(400).json({
          success: false,
          message: 'Email, IP address, and attempt result are required'
        });
      }

      await db.execute(`
        INSERT INTO login_attempt_logs (
          employee_id, email, ip_address, user_agent, location_data,
          attempt_result, failure_reason, session_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        employee_id, email, ip_address, user_agent, 
        JSON.stringify(location_data), attempt_result, failure_reason, session_token
      ]);

      res.json({
        success: true,
        message: 'Login attempt logged successfully'
      });
    } catch (error) {
      console.error('Error logging login attempt:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log login attempt',
        error: error.message
      });
    }
  }

  // Get login attempt logs
  async getLoginAttemptLogs(req, res) {
    try {
      const { 
        employee_id, 
        start_date, 
        end_date, 
        attempt_result,
        page = 1, 
        limit = 50 
      } = req.query;

      let query = `
        SELECT 
          lal.*,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          e.employee_id as emp_id
        FROM login_attempt_logs lal
        LEFT JOIN employees e ON lal.employee_id = e.id
        WHERE 1=1
      `;
      const params = [];

      if (employee_id) {
        query += ' AND lal.employee_id = ?';
        params.push(employee_id);
      }

      if (start_date) {
        query += ' AND DATE(lal.login_timestamp) >= ?';
        params.push(start_date);
      }

      if (end_date) {
        query += ' AND DATE(lal.login_timestamp) <= ?';
        params.push(end_date);
      }

      if (attempt_result) {
        query += ' AND lal.attempt_result = ?';
        params.push(attempt_result);
      }

      query += ' ORDER BY lal.login_timestamp DESC';

      const offset = (page - 1) * limit;
      query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

      const [logs] = await db.execute(query, params);

      // Get total count
      let countQuery = query.split('ORDER BY')[0].replace(/SELECT .*? FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching login attempt logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch login attempt logs',
        error: error.message
      });
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  // Check if IP matches rule (simplified implementation)
  isIPMatch(clientIP, ruleIP, subnetMask) {
    if (subnetMask) {
      // TODO: Implement proper subnet matching
      return clientIP.startsWith(ruleIP.split('.').slice(0, 3).join('.'));
    }
    return clientIP === ruleIP;
  }

  // Get distance between two coordinates in meters
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

module.exports = new LocationBasedAccessController();