const db = require('../config/database');
const logger = require('../utils/logger');

class ProductionPlanningController {
  // ============================================================================
  // PRODUCTION SCHEDULE MANAGEMENT
  // ============================================================================

  // Get production schedules
  async getProductionSchedules(req, res) {
    try {
      const {
        manufacturing_unit_id,
        schedule_date,
        status,
        from_date,
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          ps.*,
          mu.unit_name as manufacturing_unit_name,
          CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name,
          COUNT(psi.id) as total_items,
          COUNT(CASE WHEN psi.status = 'completed' THEN 1 END) as completed_items
        FROM production_schedule ps
        LEFT JOIN manufacturing_units mu ON ps.manufacturing_unit_id = mu.id
        LEFT JOIN users creator ON ps.created_by = creator.id
        LEFT JOIN users approver ON ps.approved_by = approver.id
        LEFT JOIN production_schedule_items psi ON ps.id = psi.schedule_id
        WHERE 1=1
      `;
      const params = [];

      if (manufacturing_unit_id) {
        query += ' AND ps.manufacturing_unit_id = ?';
        params.push(manufacturing_unit_id);
      }

      if (schedule_date) {
        query += ' AND ps.schedule_date = ?';
        params.push(schedule_date);
      }

      if (status) {
        query += ' AND ps.status = ?';
        params.push(status);
      }

      if (from_date) {
        query += ' AND ps.schedule_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND ps.schedule_date <= ?';
        params.push(to_date);
      }

      query += ' GROUP BY ps.id';

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT ps.id) as total 
        FROM production_schedule ps 
        WHERE 1=1 ${manufacturing_unit_id ? 'AND ps.manufacturing_unit_id = ?' : ''}
        ${status ? 'AND ps.status = ?' : ''}
        ${from_date ? 'AND ps.schedule_date >= ?' : ''}
        ${to_date ? 'AND ps.schedule_date <= ?' : ''}
      `;
      const countParams = [];
      if (manufacturing_unit_id) countParams.push(manufacturing_unit_id);
      if (status) countParams.push(status);
      if (from_date) countParams.push(from_date);
      if (to_date) countParams.push(to_date);

      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY ps.schedule_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [schedules] = await db.execute(query, params);

      res.json({
        success: true,
        data: schedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching production schedules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production schedules',
        error: error.message
      });
    }
  }

  // Get single production schedule with items
  async getProductionSchedule(req, res) {
    try {
      const { id } = req.params;

      // Get schedule header
      const scheduleQuery = `
        SELECT 
          ps.*,
          mu.unit_name as manufacturing_unit_name,
          CONCAT(creator.first_name, ' ', creator.last_name) as created_by_name,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
        FROM production_schedule ps
        LEFT JOIN manufacturing_units mu ON ps.manufacturing_unit_id = mu.id
        LEFT JOIN users creator ON ps.created_by = creator.id
        LEFT JOIN users approver ON ps.approved_by = approver.id
        WHERE ps.id = ?
      `;

      const [schedules] = await db.execute(scheduleQuery, [id]);

      if (schedules.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production schedule not found'
        });
      }

      const schedule = schedules[0];

      // Get schedule items
      const itemsQuery = `
        SELECT 
          psi.*,
          wo.work_order_number,
          wo.quantity as work_order_quantity,
          pm.machine_name,
          CONCAT(u.first_name, ' ', u.last_name) as operator_name
        FROM production_schedule_items psi
        INNER JOIN manufacturing_work_orders wo ON psi.work_order_id = wo.id
        LEFT JOIN production_machines pm ON psi.assigned_machine_id = pm.id
        LEFT JOIN users u ON psi.assigned_operator_id = u.id
        WHERE psi.schedule_id = ?
        ORDER BY psi.sequence_order ASC
      `;

      const [items] = await db.execute(itemsQuery, [id]);
      schedule.items = items;

      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      logger.error('Error fetching production schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production schedule',
        error: error.message
      });
    }
  }

  // Create production schedule
  async createProductionSchedule(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        schedule_code,
        schedule_name,
        schedule_type,
        schedule_date,
        manufacturing_unit_id,
        planned_capacity,
        work_order_ids, // Array of work order IDs to schedule
        notes
      } = req.body;

      // Validate required fields
      if (!schedule_code || !schedule_name || !schedule_date) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: schedule_code, schedule_name, schedule_date'
        });
      }

      // Create schedule header
      const scheduleQuery = `
        INSERT INTO production_schedule 
        (schedule_code, schedule_name, schedule_type, schedule_date, manufacturing_unit_id, 
         planned_capacity, allocated_capacity, available_capacity, notes, created_by, status)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'draft')
      `;

      const [scheduleResult] = await connection.execute(scheduleQuery, [
        schedule_code,
        schedule_name,
        schedule_type || 'daily',
        schedule_date,
        manufacturing_unit_id || null,
        planned_capacity || 0,
        planned_capacity || 0,
        notes,
        req.user.id
      ]);

      const schedule_id = scheduleResult.insertId;

      // Add work orders if provided
      if (work_order_ids && work_order_ids.length > 0) {
        const itemQuery = `
          INSERT INTO production_schedule_items 
          (schedule_id, work_order_id, sequence_order, priority, status)
          VALUES (?, ?, ?, 'medium', 'scheduled')
        `;

        for (let i = 0; i < work_order_ids.length; i++) {
          await connection.execute(itemQuery, [schedule_id, work_order_ids[i], i + 1]);
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Production schedule created successfully',
        data: { id: schedule_id }
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating production schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create production schedule',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Add work order to schedule
  async addWorkOrderToSchedule(req, res) {
    try {
      const { schedule_id } = req.params;
      const {
        work_order_id,
        planned_start_time,
        planned_end_time,
        estimated_duration_minutes,
        assigned_machine_id,
        assigned_operator_id,
        priority = 'medium'
      } = req.body;

      if (!work_order_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: work_order_id'
        });
      }

      // Get current max sequence order
      const [maxSeq] = await db.execute(
        'SELECT COALESCE(MAX(sequence_order), 0) as max_seq FROM production_schedule_items WHERE schedule_id = ?',
        [schedule_id]
      );

      const sequence_order = maxSeq[0].max_seq + 1;

      const query = `
        INSERT INTO production_schedule_items 
        (schedule_id, work_order_id, sequence_order, planned_start_time, planned_end_time, 
         estimated_duration_minutes, assigned_machine_id, assigned_operator_id, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `;

      const [result] = await db.execute(query, [
        schedule_id,
        work_order_id,
        sequence_order,
        planned_start_time,
        planned_end_time,
        estimated_duration_minutes,
        assigned_machine_id || null,
        assigned_operator_id || null,
        priority
      ]);

      res.status(201).json({
        success: true,
        message: 'Work order added to schedule successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error adding work order to schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add work order to schedule',
        error: error.message
      });
    }
  }

  // Update schedule item status
  async updateScheduleItemStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, delay_reason, actual_start_time, actual_end_time } = req.body;

      const validStatuses = ['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }

      let query = `
        UPDATE production_schedule_items
        SET status = ?, updated_at = CURRENT_TIMESTAMP
      `;
      const params = [status];

      if (delay_reason) {
        query += ', delay_reason = ?';
        params.push(delay_reason);
      }

      if (actual_start_time) {
        query += ', actual_start_time = ?';
        params.push(actual_start_time);
      }

      if (actual_end_time) {
        query += ', actual_end_time = ?, actual_duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_time, ?)';
        params.push(actual_end_time, actual_end_time);
      }

      query += ' WHERE id = ?';
      params.push(id);

      const [result] = await db.execute(query, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Schedule item not found'
        });
      }

      res.json({
        success: true,
        message: 'Schedule item status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating schedule item status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule item status',
        error: error.message
      });
    }
  }

  // Approve production schedule
  async approveProductionSchedule(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE production_schedule
        SET 
          status = 'planned',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'draft'
      `;

      const [result] = await db.execute(query, [req.user.id, id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Schedule not found or already approved'
        });
      }

      res.json({
        success: true,
        message: 'Production schedule approved successfully'
      });
    } catch (error) {
      logger.error('Error approving production schedule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve production schedule',
        error: error.message
      });
    }
  }

  // ============================================================================
  // WASTE TRACKING
  // ============================================================================

  // Get waste categories
  async getWasteCategories(req, res) {
    try {
      const { waste_type, is_active } = req.query;

      let query = 'SELECT * FROM waste_categories WHERE 1=1';
      const params = [];

      if (waste_type) {
        query += ' AND waste_type = ?';
        params.push(waste_type);
      }

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY waste_type, category_name ASC';

      const [categories] = await db.execute(query, params);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching waste categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch waste categories',
        error: error.message
      });
    }
  }

  // Get waste records
  async getWasteRecords(req, res) {
    try {
      const {
        work_order_id,
        waste_category_id,
        from_date,
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          pwr.*,
          wo.work_order_number,
          wc.category_name as waste_category_name,
          wc.waste_type,
          CONCAT(operator.first_name, ' ', operator.last_name) as responsible_operator_name,
          CONCAT(reporter.first_name, ' ', reporter.last_name) as reported_by_name
        FROM production_waste_records pwr
        INNER JOIN manufacturing_work_orders wo ON pwr.work_order_id = wo.id
        INNER JOIN waste_categories wc ON pwr.waste_category_id = wc.id
        LEFT JOIN users operator ON pwr.responsible_operator_id = operator.id
        LEFT JOIN users reporter ON pwr.reported_by = reporter.id
        WHERE 1=1
      `;
      const params = [];

      if (work_order_id) {
        query += ' AND pwr.work_order_id = ?';
        params.push(work_order_id);
      }

      if (waste_category_id) {
        query += ' AND pwr.waste_category_id = ?';
        params.push(waste_category_id);
      }

      if (from_date) {
        query += ' AND pwr.waste_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND pwr.waste_date <= ?';
        params.push(to_date);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY pwr.waste_date DESC LIMIT ? OFFSET ?';
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
      logger.error('Error fetching waste records:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch waste records',
        error: error.message
      });
    }
  }

  // Record waste
  async recordWaste(req, res) {
    try {
      const {
        work_order_id,
        waste_category_id,
        waste_quantity,
        waste_unit,
        material_cost,
        labor_cost,
        overhead_cost,
        waste_reason,
        root_cause,
        corrective_action,
        responsible_operator_id,
        waste_date
      } = req.body;

      // Validate required fields
      if (!work_order_id || !waste_category_id || !waste_quantity || !waste_unit) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: work_order_id, waste_category_id, waste_quantity, waste_unit'
        });
      }

      // Calculate total cost
      const total_cost = (material_cost || 0) + (labor_cost || 0) + (overhead_cost || 0);

      const query = `
        INSERT INTO production_waste_records 
        (work_order_id, waste_category_id, waste_quantity, waste_unit, 
         material_cost, labor_cost, overhead_cost, total_cost, waste_reason, 
         root_cause, corrective_action, responsible_operator_id, reported_by, waste_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        work_order_id,
        waste_category_id,
        waste_quantity,
        waste_unit,
        material_cost || 0,
        labor_cost || 0,
        overhead_cost || 0,
        total_cost,
        waste_reason,
        root_cause,
        corrective_action,
        responsible_operator_id || null,
        req.user.id,
        waste_date || new Date().toISOString().split('T')[0]
      ]);

      res.status(201).json({
        success: true,
        message: 'Waste recorded successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error recording waste:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record waste',
        error: error.message
      });
    }
  }

  // Get waste analytics
  async getWasteAnalytics(req, res) {
    try {
      const { from_date, to_date, waste_type } = req.query;

      let query = `
        SELECT 
          wc.category_name,
          wc.waste_type,
          COUNT(pwr.id) as waste_occurrence_count,
          SUM(pwr.waste_quantity) as total_waste_quantity,
          pwr.waste_unit,
          SUM(pwr.material_cost) as total_material_cost,
          SUM(pwr.labor_cost) as total_labor_cost,
          SUM(pwr.overhead_cost) as total_overhead_cost,
          SUM(pwr.total_cost) as total_waste_cost,
          COUNT(DISTINCT pwr.work_order_id) as affected_work_orders
        FROM production_waste_records pwr
        INNER JOIN waste_categories wc ON pwr.waste_category_id = wc.id
        WHERE 1=1
      `;
      const params = [];

      if (from_date) {
        query += ' AND pwr.waste_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND pwr.waste_date <= ?';
        params.push(to_date);
      }

      if (waste_type) {
        query += ' AND wc.waste_type = ?';
        params.push(waste_type);
      }

      query += ' GROUP BY wc.id, wc.category_name, wc.waste_type, pwr.waste_unit';
      query += ' ORDER BY total_waste_cost DESC';

      const [analytics] = await db.execute(query, params);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching waste analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch waste analytics',
        error: error.message
      });
    }
  }

  // ============================================================================
  // OEE (OVERALL EQUIPMENT EFFECTIVENESS) ANALYTICS
  // ============================================================================

  // Get OEE records
  async getOEERecords(req, res) {
    try {
      const {
        machine_id,
        manufacturing_unit_id,
        from_date,
        to_date,
        oee_rating,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          oee.*,
          pm.machine_name,
          pm.machine_code,
          mu.unit_name as manufacturing_unit_name,
          wo.work_order_number
        FROM production_oee_records oee
        LEFT JOIN production_machines pm ON oee.machine_id = pm.id
        LEFT JOIN manufacturing_units mu ON oee.manufacturing_unit_id = mu.id
        LEFT JOIN manufacturing_work_orders wo ON oee.work_order_id = wo.id
        WHERE 1=1
      `;
      const params = [];

      if (machine_id) {
        query += ' AND oee.machine_id = ?';
        params.push(machine_id);
      }

      if (manufacturing_unit_id) {
        query += ' AND oee.manufacturing_unit_id = ?';
        params.push(manufacturing_unit_id);
      }

      if (from_date) {
        query += ' AND oee.record_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND oee.record_date <= ?';
        params.push(to_date);
      }

      if (oee_rating) {
        query += ' AND oee.oee_rating = ?';
        params.push(oee_rating);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Get paginated results
      query += ' ORDER BY oee.record_date DESC, oee.oee_percentage DESC LIMIT ? OFFSET ?';
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
      logger.error('Error fetching OEE records:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch OEE records',
        error: error.message
      });
    }
  }

  // Calculate and record OEE
  async calculateOEE(req, res) {
    try {
      const {
        machine_id,
        manufacturing_unit_id,
        work_order_id,
        record_date,
        shift,
        planned_production_time_minutes,
        actual_runtime_minutes,
        downtime_minutes = 0,
        target_quantity,
        actual_quantity,
        good_quantity,
        rejected_quantity = 0,
        notes
      } = req.body;

      // Validate required fields
      if (!planned_production_time_minutes || !actual_runtime_minutes || !target_quantity || !actual_quantity || !good_quantity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for OEE calculation'
        });
      }

      // Calculate OEE components
      // Availability = (Actual Runtime / Planned Production Time) × 100
      const availability = (actual_runtime_minutes / planned_production_time_minutes) * 100;

      // Performance = (Actual Quantity / Target Quantity) × 100
      const performance = (actual_quantity / target_quantity) * 100;

      // Quality = (Good Quantity / Actual Quantity) × 100
      const quality = (good_quantity / actual_quantity) * 100;

      // OEE = Availability × Performance × Quality / 10000
      const oee = (availability * performance * quality) / 10000;

      const query = `
        INSERT INTO production_oee_records 
        (machine_id, manufacturing_unit_id, work_order_id, record_date, shift, 
         planned_production_time_minutes, actual_runtime_minutes, downtime_minutes, 
         target_quantity, actual_quantity, good_quantity, rejected_quantity, 
         availability_percentage, performance_percentage, quality_percentage, 
         oee_percentage, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        machine_id || null,
        manufacturing_unit_id || null,
        work_order_id || null,
        record_date || new Date().toISOString().split('T')[0],
        shift,
        planned_production_time_minutes,
        actual_runtime_minutes,
        downtime_minutes,
        target_quantity,
        actual_quantity,
        good_quantity,
        rejected_quantity,
        availability.toFixed(2),
        performance.toFixed(2),
        quality.toFixed(2),
        oee.toFixed(2),
        notes
      ]);

      res.status(201).json({
        success: true,
        message: 'OEE calculated and recorded successfully',
        data: {
          id: result.insertId,
          availability_percentage: parseFloat(availability.toFixed(2)),
          performance_percentage: parseFloat(performance.toFixed(2)),
          quality_percentage: parseFloat(quality.toFixed(2)),
          oee_percentage: parseFloat(oee.toFixed(2)),
          oee_rating: oee >= 85 ? 'world_class' : oee >= 75 ? 'excellent' : oee >= 65 ? 'good' : oee >= 50 ? 'fair' : 'poor'
        }
      });
    } catch (error) {
      logger.error('Error calculating OEE:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate OEE',
        error: error.message
      });
    }
  }

  // Get OEE summary/dashboard
  async getOEESummary(req, res) {
    try {
      const { machine_id, manufacturing_unit_id, from_date, to_date } = req.query;

      let query = `
        SELECT 
          pm.machine_name,
          mu.unit_name as manufacturing_unit_name,
          COUNT(oee.id) as total_records,
          AVG(oee.availability_percentage) as avg_availability,
          AVG(oee.performance_percentage) as avg_performance,
          AVG(oee.quality_percentage) as avg_quality,
          AVG(oee.oee_percentage) as avg_oee,
          MIN(oee.oee_percentage) as min_oee,
          MAX(oee.oee_percentage) as max_oee,
          COUNT(CASE WHEN oee.oee_rating = 'world_class' THEN 1 END) as world_class_count,
          COUNT(CASE WHEN oee.oee_rating = 'excellent' THEN 1 END) as excellent_count,
          COUNT(CASE WHEN oee.oee_rating = 'good' THEN 1 END) as good_count,
          COUNT(CASE WHEN oee.oee_rating = 'fair' THEN 1 END) as fair_count,
          COUNT(CASE WHEN oee.oee_rating = 'poor' THEN 1 END) as poor_count
        FROM production_oee_records oee
        LEFT JOIN production_machines pm ON oee.machine_id = pm.id
        LEFT JOIN manufacturing_units mu ON oee.manufacturing_unit_id = mu.id
        WHERE 1=1
      `;
      const params = [];

      if (machine_id) {
        query += ' AND oee.machine_id = ?';
        params.push(machine_id);
      }

      if (manufacturing_unit_id) {
        query += ' AND oee.manufacturing_unit_id = ?';
        params.push(manufacturing_unit_id);
      }

      if (from_date) {
        query += ' AND oee.record_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND oee.record_date <= ?';
        params.push(to_date);
      }

      query += ' GROUP BY pm.id, pm.machine_name, mu.unit_name';

      const [summary] = await db.execute(query, params);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error fetching OEE summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch OEE summary',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionPlanningController();
