const db = require('../config/database');
const logger = require('../utils/logger');

class ShopFloorController {
  // ============================================================================
  // PRODUCTION MACHINES MANAGEMENT
  // ============================================================================

  // Get all production machines
  async getProductionMachines(req, res) {
    try {
      const { manufacturing_unit_id, status, is_active } = req.query;

      let query = `
        SELECT 
          pm.*,
          mu.unit_name as manufacturing_unit_name,
          DATEDIFF(pm.next_maintenance_date, CURDATE()) as days_until_maintenance
        FROM production_machines pm
        LEFT JOIN manufacturing_units mu ON pm.manufacturing_unit_id = mu.id
        WHERE 1=1
      `;
      const params = [];

      if (manufacturing_unit_id) {
        query += ' AND pm.manufacturing_unit_id = ?';
        params.push(manufacturing_unit_id);
      }

      if (status) {
        query += ' AND pm.status = ?';
        params.push(status);
      }

      if (is_active !== undefined) {
        query += ' AND pm.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY pm.machine_name ASC';

      const [machines] = await db.execute(query, params);

      // Parse specifications JSON
      machines.forEach(machine => {
        if (machine.specifications && typeof machine.specifications === 'string') {
          machine.specifications = JSON.parse(machine.specifications);
        }
      });

      res.json({
        success: true,
        data: machines
      });
    } catch (error) {
      logger.error('Error fetching production machines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production machines',
        error: error.message
      });
    }
  }

  // Create production machine
  async createProductionMachine(req, res) {
    try {
      const {
        machine_code,
        machine_name,
        machine_type,
        manufacturer,
        model_number,
        serial_number,
        manufacturing_unit_id,
        workstation,
        capacity_per_hour,
        capacity_unit,
        hourly_rate,
        maintenance_interval_days = 90,
        specifications
      } = req.body;

      // Validate required fields
      if (!machine_code || !machine_name) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: machine_code, machine_name'
        });
      }

      // Calculate next maintenance date
      const next_maintenance_date = new Date();
      next_maintenance_date.setDate(next_maintenance_date.getDate() + maintenance_interval_days);

      const query = `
        INSERT INTO production_machines 
        (machine_code, machine_name, machine_type, manufacturer, model_number, 
         serial_number, manufacturing_unit_id, workstation, capacity_per_hour, 
         capacity_unit, hourly_rate, next_maintenance_date, maintenance_interval_days, 
         specifications, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        machine_code,
        machine_name,
        machine_type,
        manufacturer,
        model_number,
        serial_number,
        manufacturing_unit_id || null,
        workstation,
        capacity_per_hour,
        capacity_unit,
        hourly_rate,
        next_maintenance_date.toISOString().split('T')[0],
        maintenance_interval_days,
        specifications ? JSON.stringify(specifications) : null,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Production machine created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error creating production machine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create production machine',
        error: error.message
      });
    }
  }

  // Update machine status
  async updateMachineStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const validStatuses = ['available', 'in_use', 'maintenance', 'breakdown', 'retired'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }

      const query = `
        UPDATE production_machines
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await db.execute(query, [status, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      res.json({
        success: true,
        message: 'Machine status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating machine status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update machine status',
        error: error.message
      });
    }
  }

  // Record maintenance
  async recordMaintenance(req, res) {
    try {
      const { id } = req.params;
      const { maintenance_interval_days } = req.body;

      // Update last maintenance and calculate next maintenance date
      const interval = maintenance_interval_days || 90;
      const next_maintenance_date = new Date();
      next_maintenance_date.setDate(next_maintenance_date.getDate() + interval);

      const query = `
        UPDATE production_machines
        SET 
          last_maintenance_date = CURDATE(),
          next_maintenance_date = ?,
          maintenance_interval_days = ?,
          status = 'available',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await db.execute(query, [
        next_maintenance_date.toISOString().split('T')[0],
        interval,
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Machine not found'
        });
      }

      res.json({
        success: true,
        message: 'Maintenance recorded successfully'
      });
    } catch (error) {
      logger.error('Error recording maintenance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record maintenance',
        error: error.message
      });
    }
  }

  // ============================================================================
  // WORK ORDER OPERATION TRACKING
  // ============================================================================

  // Get operation tracking records
  async getOperationTracking(req, res) {
    try {
      const {
        work_order_id,
        operator_id,
        machine_id,
        status,
        from_date,
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          wot.*,
          wo.work_order_number,
          po.operation_name,
          pm.machine_name,
          CONCAT(u.first_name, ' ', u.last_name) as operator_name,
          TIMESTAMPDIFF(MINUTE, wot.started_at, COALESCE(wot.completed_at, NOW())) as elapsed_minutes
        FROM work_order_operation_tracking wot
        INNER JOIN manufacturing_work_orders wo ON wot.work_order_id = wo.id
        LEFT JOIN production_operations po ON wot.operation_id = po.id
        LEFT JOIN production_machines pm ON wot.machine_id = pm.id
        LEFT JOIN users u ON wot.operator_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (work_order_id) {
        query += ' AND wot.work_order_id = ?';
        params.push(work_order_id);
      }

      if (operator_id) {
        query += ' AND wot.operator_id = ?';
        params.push(operator_id);
      }

      if (machine_id) {
        query += ' AND wot.machine_id = ?';
        params.push(machine_id);
      }

      if (status) {
        query += ' AND wot.status = ?';
        params.push(status);
      }

      if (from_date) {
        query += ' AND DATE(wot.started_at) >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND DATE(wot.started_at) <= ?';
        params.push(to_date);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY wot.started_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [records] = await db.execute(query, params);

      res.json({
        success: true,
        data: records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching operation tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch operation tracking',
        error: error.message
      });
    }
  }

  // Start operation
  async startOperation(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        work_order_operation_id,
        work_order_id,
        operation_id,
        operator_id,
        machine_id,
        workstation,
        quantity_planned
      } = req.body;

      // Validate required fields
      if (!work_order_id || !operation_id || !quantity_planned) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: work_order_id, operation_id, quantity_planned'
        });
      }

      // Update machine status to in_use
      if (machine_id) {
        await connection.execute(
          'UPDATE production_machines SET status = "in_use" WHERE id = ?',
          [machine_id]
        );
      }

      const query = `
        INSERT INTO work_order_operation_tracking 
        (work_order_operation_id, work_order_id, operation_id, operator_id, 
         machine_id, workstation, started_at, quantity_planned, status)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'in_progress')
      `;

      const [result] = await connection.execute(query, [
        work_order_operation_id || null,
        work_order_id,
        operation_id,
        operator_id || req.user.id,
        machine_id || null,
        workstation,
        quantity_planned
      ]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Operation started successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Error starting operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start operation',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Pause operation
  async pauseOperation(req, res) {
    try {
      const { id } = req.params;
      const { pause_reason } = req.body;

      const query = `
        UPDATE work_order_operation_tracking
        SET 
          paused_at = NOW(),
          pause_reason = ?,
          status = 'paused',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'in_progress'
      `;

      const [result] = await db.execute(query, [pause_reason, id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Operation not found or not in progress'
        });
      }

      res.json({
        success: true,
        message: 'Operation paused successfully'
      });
    } catch (error) {
      logger.error('Error pausing operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause operation',
        error: error.message
      });
    }
  }

  // Resume operation
  async resumeOperation(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE work_order_operation_tracking
        SET 
          resumed_at = NOW(),
          status = 'in_progress',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'paused'
      `;

      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Operation not found or not paused'
        });
      }

      res.json({
        success: true,
        message: 'Operation resumed successfully'
      });
    } catch (error) {
      logger.error('Error resuming operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume operation',
        error: error.message
      });
    }
  }

  // Complete operation
  async completeOperation(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        quantity_completed,
        quantity_good,
        quantity_rejected,
        quantity_rework,
        operator_notes
      } = req.body;

      // Calculate performance metrics
      const efficiency_percentage = quantity_completed && quantity_good
        ? (quantity_good / quantity_completed) * 100
        : 0;

      const quality_percentage = quantity_completed
        ? (quantity_good / quantity_completed) * 100
        : 0;

      // Get the tracking record to find machine
      const [trackingRecords] = await connection.execute(
        'SELECT machine_id FROM work_order_operation_tracking WHERE id = ?',
        [id]
      );

      const query = `
        UPDATE work_order_operation_tracking
        SET 
          completed_at = NOW(),
          actual_duration_minutes = TIMESTAMPDIFF(MINUTE, started_at, NOW()),
          quantity_completed = ?,
          quantity_good = ?,
          quantity_rejected = ?,
          quantity_rework = ?,
          efficiency_percentage = ?,
          quality_percentage = ?,
          operator_notes = ?,
          status = 'completed',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status IN ('in_progress', 'paused')
      `;

      const [result] = await connection.execute(query, [
        quantity_completed,
        quantity_good || 0,
        quantity_rejected || 0,
        quantity_rework || 0,
        efficiency_percentage.toFixed(2),
        quality_percentage.toFixed(2),
        operator_notes,
        id
      ]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Operation not found or already completed'
        });
      }

      // Update machine status back to available
      if (trackingRecords.length > 0 && trackingRecords[0].machine_id) {
        await connection.execute(
          'UPDATE production_machines SET status = "available" WHERE id = ?',
          [trackingRecords[0].machine_id]
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Operation completed successfully'
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Error completing operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete operation',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ============================================================================
  // MACHINE UTILIZATION LOGGING
  // ============================================================================

  // Get machine utilization log
  async getMachineUtilizationLog(req, res) {
    try {
      const {
        machine_id,
        utilization_type,
        from_date,
        to_date,
        page = 1,
        limit = 50
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          mul.*,
          pm.machine_name,
          pm.machine_code,
          wo.work_order_number,
          CONCAT(u.first_name, ' ', u.last_name) as operator_name
        FROM machine_utilization_log mul
        INNER JOIN production_machines pm ON mul.machine_id = pm.id
        LEFT JOIN manufacturing_work_orders wo ON mul.work_order_id = wo.id
        LEFT JOIN users u ON mul.operator_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (machine_id) {
        query += ' AND mul.machine_id = ?';
        params.push(machine_id);
      }

      if (utilization_type) {
        query += ' AND mul.utilization_type = ?';
        params.push(utilization_type);
      }

      if (from_date) {
        query += ' AND DATE(mul.start_time) >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND DATE(mul.start_time) <= ?';
        params.push(to_date);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY mul.start_time DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [logs] = await db.execute(query, params);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching machine utilization log:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch machine utilization log',
        error: error.message
      });
    }
  }

  // Log machine utilization
  async logMachineUtilization(req, res) {
    try {
      const {
        machine_id,
        work_order_id,
        operation_tracking_id,
        utilization_type,
        downtime_reason,
        downtime_category,
        actual_output,
        target_output,
        operator_id,
        notes
      } = req.body;

      // Validate required fields
      if (!machine_id || !utilization_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: machine_id, utilization_type'
        });
      }

      // Calculate efficiency if outputs provided
      let efficiency_percentage = null;
      if (actual_output && target_output && target_output > 0) {
        efficiency_percentage = (actual_output / target_output) * 100;
      }

      const query = `
        INSERT INTO machine_utilization_log 
        (machine_id, work_order_id, operation_tracking_id, start_time, utilization_type, 
         downtime_reason, downtime_category, actual_output, target_output, 
         efficiency_percentage, operator_id, notes)
        VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        machine_id,
        work_order_id || null,
        operation_tracking_id || null,
        utilization_type,
        downtime_reason,
        downtime_category,
        actual_output,
        target_output,
        efficiency_percentage,
        operator_id || req.user.id,
        notes
      ]);

      res.status(201).json({
        success: true,
        message: 'Machine utilization logged successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error logging machine utilization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to log machine utilization',
        error: error.message
      });
    }
  }

  // End utilization log entry
  async endMachineUtilization(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE machine_utilization_log
        SET 
          end_time = NOW(),
          duration_minutes = TIMESTAMPDIFF(MINUTE, start_time, NOW())
        WHERE id = ? AND end_time IS NULL
      `;

      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Utilization log not found or already ended'
        });
      }

      res.json({
        success: true,
        message: 'Machine utilization log ended successfully'
      });
    } catch (error) {
      logger.error('Error ending machine utilization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end machine utilization',
        error: error.message
      });
    }
  }

  // ============================================================================
  // SHOP FLOOR DASHBOARD & ANALYTICS
  // ============================================================================

  // Get shop floor realtime dashboard
  async getShopFloorDashboard(req, res) {
    try {
      const { manufacturing_unit_id } = req.query;

      // Active operations
      let operationsQuery = `
        SELECT 
          wot.id,
          wot.work_order_id,
          wo.work_order_number,
          po.operation_name,
          wot.status,
          wot.started_at,
          wot.quantity_planned,
          wot.quantity_completed,
          pm.machine_name,
          CONCAT(u.first_name, ' ', u.last_name) as operator_name,
          TIMESTAMPDIFF(MINUTE, wot.started_at, NOW()) as elapsed_minutes
        FROM work_order_operation_tracking wot
        INNER JOIN manufacturing_work_orders wo ON wot.work_order_id = wo.id
        LEFT JOIN production_operations po ON wot.operation_id = po.id
        LEFT JOIN production_machines pm ON wot.machine_id = pm.id
        LEFT JOIN users u ON wot.operator_id = u.id
        WHERE wot.status IN ('in_progress', 'paused')
      `;
      const operationsParams = [];

      if (manufacturing_unit_id) {
        operationsQuery += ' AND pm.manufacturing_unit_id = ?';
        operationsParams.push(manufacturing_unit_id);
      }

      operationsQuery += ' ORDER BY wot.started_at ASC';

      const [activeOperations] = await db.execute(operationsQuery, operationsParams);

      // Machine status summary
      let machinesQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM production_machines
        WHERE is_active = TRUE
      `;
      const machinesParams = [];

      if (manufacturing_unit_id) {
        machinesQuery += ' AND manufacturing_unit_id = ?';
        machinesParams.push(manufacturing_unit_id);
      }

      machinesQuery += ' GROUP BY status';

      const [machinesSummary] = await db.execute(machinesQuery, machinesParams);

      // Today's production summary
      let productionQuery = `
        SELECT 
          COUNT(DISTINCT wot.id) as operations_count,
          COUNT(DISTINCT CASE WHEN wot.status = 'completed' THEN wot.id END) as completed_operations,
          SUM(CASE WHEN wot.status = 'completed' THEN wot.quantity_good ELSE 0 END) as total_good_quantity,
          SUM(CASE WHEN wot.status = 'completed' THEN wot.quantity_rejected ELSE 0 END) as total_rejected_quantity,
          AVG(CASE WHEN wot.status = 'completed' THEN wot.efficiency_percentage END) as avg_efficiency,
          AVG(CASE WHEN wot.status = 'completed' THEN wot.quality_percentage END) as avg_quality
        FROM work_order_operation_tracking wot
        LEFT JOIN production_machines pm ON wot.machine_id = pm.id
        WHERE DATE(wot.started_at) = CURDATE()
      `;
      const productionParams = [];

      if (manufacturing_unit_id) {
        productionQuery += ' AND pm.manufacturing_unit_id = ?';
        productionParams.push(manufacturing_unit_id);
      }

      const [productionSummary] = await db.execute(productionQuery, productionParams);

      res.json({
        success: true,
        data: {
          active_operations: activeOperations,
          machines_status: machinesSummary,
          today_summary: productionSummary[0]
        }
      });
    } catch (error) {
      logger.error('Error fetching shop floor dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch shop floor dashboard',
        error: error.message
      });
    }
  }

  // Get machine utilization summary
  async getMachineUtilizationSummary(req, res) {
    try {
      const { machine_id, from_date, to_date } = req.query;

      let query = `
        SELECT 
          pm.id as machine_id,
          pm.machine_code,
          pm.machine_name,
          pm.status as current_status,
          mu.unit_name as manufacturing_unit,
          COUNT(DISTINCT mul.id) as utilization_records,
          SUM(CASE WHEN mul.utilization_type = 'productive' THEN mul.duration_minutes ELSE 0 END) as productive_minutes,
          SUM(CASE WHEN mul.utilization_type = 'breakdown' THEN mul.duration_minutes ELSE 0 END) as breakdown_minutes,
          SUM(CASE WHEN mul.utilization_type = 'maintenance' THEN mul.duration_minutes ELSE 0 END) as maintenance_minutes,
          SUM(CASE WHEN mul.utilization_type = 'idle' THEN mul.duration_minutes ELSE 0 END) as idle_minutes,
          SUM(CASE WHEN mul.utilization_type = 'setup' THEN mul.duration_minutes ELSE 0 END) as setup_minutes,
          SUM(mul.duration_minutes) as total_minutes,
          ROUND((SUM(CASE WHEN mul.utilization_type = 'productive' THEN mul.duration_minutes ELSE 0 END) / 
                 NULLIF(SUM(mul.duration_minutes), 0)) * 100, 2) as utilization_percentage
        FROM production_machines pm
        LEFT JOIN manufacturing_units mu ON pm.manufacturing_unit_id = mu.id
        LEFT JOIN machine_utilization_log mul ON pm.id = mul.machine_id
      `;
      const params = [];

      let havingClause = ' WHERE 1=1';

      if (machine_id) {
        havingClause += ' AND pm.id = ?';
        params.push(machine_id);
      }

      if (from_date || to_date) {
        query += havingClause;
        if (from_date) {
          query += ' AND mul.start_time >= ?';
          params.push(from_date);
        }
        if (to_date) {
          query += ' AND mul.start_time <= ?';
          params.push(to_date);
        }
      } else {
        // Default to last 30 days
        query += havingClause + ' AND mul.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      }

      query += ' GROUP BY pm.id, pm.machine_code, pm.machine_name, pm.status, mu.unit_name';
      query += ' ORDER BY utilization_percentage DESC';

      const [summary] = await db.execute(query, params);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error fetching machine utilization summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch machine utilization summary',
        error: error.message
      });
    }
  }
}

module.exports = new ShopFloorController();
