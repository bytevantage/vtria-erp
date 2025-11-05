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
        manufacturing_unit_id: manufacturingUnitId,
        schedule_date: scheduleDate,
        status,
        from_date: fromDate,
        to_date: toDate,
        page = 1,
        limit = 20
      } = req.query;

      const parsedPage = Number.parseInt(page, 10);
      const pageNumber = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const parsedLimit = Number.parseInt(limit, 10);
      const limitNumber = Number.isNaN(parsedLimit) || parsedLimit < 1
        ? 20
        : Math.min(parsedLimit, 100);
      const offset = (pageNumber - 1) * limitNumber;
      const limitClause = `LIMIT ${limitNumber} OFFSET ${offset}`;

      const filters = [];
      const filterParams = [];

      if (manufacturingUnitId) {
        filters.push('ps.manufacturing_unit_id = ?');
        filterParams.push(manufacturingUnitId);
      }

      if (scheduleDate) {
        filters.push('ps.schedule_date = ?');
        filterParams.push(scheduleDate);
      }

      if (status) {
        filters.push('ps.status = ?');
        filterParams.push(status);
      }

      if (fromDate) {
        filters.push('ps.schedule_date >= ?');
        filterParams.push(fromDate);
      }

      if (toDate) {
        filters.push('ps.schedule_date <= ?');
        filterParams.push(toDate);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const dataQuery = `
        SELECT 
          ps.*,
          mu.unit_name AS manufacturing_unit_name,
          creator.full_name AS created_by_name,
          approver.full_name AS approved_by_name,
          COALESCE(MIN(psi.planned_start_time), ps.schedule_date) AS start_date,
          COALESCE(MAX(psi.planned_end_time), ps.schedule_date) AS end_date,
          COUNT(psi.id) AS total_work_orders,
          COUNT(CASE WHEN psi.status = 'completed' THEN 1 END) AS completed_work_orders
        FROM production_schedule ps
        LEFT JOIN manufacturing_units mu ON ps.manufacturing_unit_id = mu.id
        LEFT JOIN users creator ON ps.created_by = creator.id
        LEFT JOIN users approver ON ps.approved_by = approver.id
        LEFT JOIN production_schedule_items psi ON ps.id = psi.schedule_id
        ${whereClause}
        GROUP BY ps.id, mu.unit_name, creator.full_name, approver.full_name
        ORDER BY ps.schedule_date DESC
        ${limitClause}
      `;

      const countQuery = `
        SELECT COUNT(DISTINCT ps.id) as total
        FROM production_schedule ps
        ${whereClause}
      `;

      const [countResult] = await db.execute(countQuery, filterParams);
      const total = countResult[0]?.total || 0;

      const [schedules] = await db.execute(dataQuery, filterParams);

      res.json({
        success: true,
        data: schedules,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: total > 0 ? Math.ceil(total / limitNumber) : 0
        }
      });
    } catch (error) {
      logger.error(`Error fetching production schedules: ${error.message} | stack: ${error.stack}`);
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
          creator.full_name as created_by_name,
          approver.full_name as approved_by_name
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
          u.full_name as operator_name
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
      logger.error(`Error fetching production schedule: ${error.message} | stack: ${error.stack}`);
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
        schedule_code: scheduleCode,
        schedule_name: scheduleName,
        schedule_type: scheduleType,
        schedule_date: scheduleDate,
        manufacturing_unit_id: manufacturingUnitId,
        planned_capacity: plannedCapacity,
        work_order_ids: workOrderIds, // Array of work order IDs to schedule
        notes
      } = req.body;

      // Validate required fields
      if (!scheduleCode || !scheduleName || !scheduleDate) {
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
        scheduleCode,
        scheduleName,
        scheduleType || 'daily',
        scheduleDate,
        manufacturingUnitId || null,
        plannedCapacity || 0,
        plannedCapacity || 0,
        notes,
        req.user.id
      ]);

      const scheduleId = scheduleResult.insertId;

      // Add work orders if provided
      if (workOrderIds && workOrderIds.length > 0) {
        const itemQuery = `
          INSERT INTO production_schedule_items 
          (schedule_id, work_order_id, sequence_order, priority, status)
          VALUES (?, ?, ?, 'medium', 'scheduled')
        `;

        for (let i = 0; i < workOrderIds.length; i++) {
          await connection.execute(itemQuery, [scheduleId, workOrderIds[i], i + 1]);
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Production schedule created successfully',
        data: { id: scheduleId }
      });
    } catch (error) {
      await connection.rollback();
      logger.error(`Error creating production schedule: ${error.message} | stack: ${error.stack}`);
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
      const { schedule_id: scheduleId } = req.params;
      const {
        work_order_id: workOrderId,
        planned_start_time: plannedStartTime,
        planned_end_time: plannedEndTime,
        estimated_duration_minutes: estimatedDurationMinutes,
        assigned_machine_id: assignedMachineId,
        assigned_operator_id: assignedOperatorId,
        priority = 'medium'
      } = req.body;

      if (!workOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: work_order_id'
        });
      }

      // Get current max sequence order
      const [maxSeq] = await db.execute(
        'SELECT COALESCE(MAX(sequence_order), 0) as max_seq FROM production_schedule_items WHERE schedule_id = ?',
        [scheduleId]
      );

      const sequenceOrder = maxSeq[0].max_seq + 1;

      const query = `
        INSERT INTO production_schedule_items 
        (schedule_id, work_order_id, sequence_order, planned_start_time, planned_end_time, 
         estimated_duration_minutes, assigned_machine_id, assigned_operator_id, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `;

      const [result] = await db.execute(query, [
        scheduleId,
        workOrderId,
        sequenceOrder,
        plannedStartTime,
        plannedEndTime,
        estimatedDurationMinutes,
        assignedMachineId || null,
        assignedOperatorId || null,
        priority
      ]);

      res.status(201).json({
        success: true,
        message: 'Work order added to schedule successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error(`Error adding work order to schedule: ${error.message} | stack: ${error.stack}`);
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
      const {
        status,
        delay_reason: delayReason,
        actual_start_time: actualStartTime,
        actual_end_time: actualEndTime
      } = req.body;

      const validStatuses = ['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      let query = `
        UPDATE production_schedule_items
        SET status = ?, updated_at = CURRENT_TIMESTAMP
      `;
      const params = [status];

      if (delayReason) {
        query += ', delay_reason = ?';
        params.push(delayReason);
      }

      if (actualStartTime) {
        query += ', actual_start_time = ?';
        params.push(actualStartTime);
      }

      if (actualEndTime) {
        query += ', actual_end_time = ?, actual_duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_time, ?)';
        params.push(actualEndTime, actualEndTime);
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
      logger.error(`Error updating schedule item status: ${error.message} | stack: ${error.stack}`);
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
      logger.error(`Error approving production schedule: ${error.message} | stack: ${error.stack}`);
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
      const {
        waste_type: wasteType,
        is_active: isActive
      } = req.query;

      let query = 'SELECT * FROM waste_categories WHERE 1=1';
      const params = [];

      if (wasteType) {
        query += ' AND waste_type = ?';
        params.push(wasteType);
      }

      if (isActive !== undefined) {
        query += ' AND is_active = ?';
        params.push(isActive === 'true' ? 1 : 0);
      }

      query += ' ORDER BY waste_type, category_name ASC';

      const [categories] = await db.execute(query, params);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error(`Error fetching waste categories: ${error.message} | stack: ${error.stack}`);
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
        work_order_id: workOrderId,
        waste_category_id: wasteCategoryId,
        from_date: fromDate,
        to_date: toDate,
        page = 1,
        limit = 20
      } = req.query;

      const parsedPage = Number.parseInt(page, 10);
      const pageNumber = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const parsedLimit = Number.parseInt(limit, 10);
      const limitNumber = Number.isNaN(parsedLimit) || parsedLimit < 1
        ? 20
        : Math.min(parsedLimit, 100);
      const offset = (pageNumber - 1) * limitNumber;
      const limitClause = `LIMIT ${limitNumber} OFFSET ${offset}`;

      const filters = [];
      const filterParams = [];

      if (workOrderId) {
        filters.push('pwr.work_order_id = ?');
        filterParams.push(workOrderId);
      }

      if (wasteCategoryId) {
        filters.push('pwr.waste_category_id = ?');
        filterParams.push(wasteCategoryId);
      }

      if (fromDate) {
        filters.push('pwr.waste_date >= ?');
        filterParams.push(fromDate);
      }

      if (toDate) {
        filters.push('pwr.waste_date <= ?');
        filterParams.push(toDate);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const dataQuery = `
        SELECT 
          pwr.*,
          wo.work_order_number,
          wc.category_name as waste_category_name,
          wc.waste_type,
          operator.full_name as responsible_operator_name,
          reporter.full_name as reported_by_name,
          pwr.waste_quantity as quantity_wasted,
          COALESCE(pwr.total_cost / NULLIF(pwr.waste_quantity, 0), 0) as unit_cost,
          COALESCE(pwr.total_cost, 0) as total_waste_cost
        FROM production_waste_records pwr
        INNER JOIN manufacturing_work_orders wo ON pwr.work_order_id = wo.id
        INNER JOIN waste_categories wc ON pwr.waste_category_id = wc.id
        LEFT JOIN users operator ON pwr.responsible_operator_id = operator.id
        LEFT JOIN users reporter ON pwr.reported_by = reporter.id
        ${whereClause}
        ORDER BY pwr.waste_date DESC
        ${limitClause}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM production_waste_records pwr
        INNER JOIN manufacturing_work_orders wo ON pwr.work_order_id = wo.id
        INNER JOIN waste_categories wc ON pwr.waste_category_id = wc.id
        LEFT JOIN users operator ON pwr.responsible_operator_id = operator.id
        LEFT JOIN users reporter ON pwr.reported_by = reporter.id
        ${whereClause}
      `;

      const [countResult] = await db.execute(countQuery, filterParams);
      const total = countResult[0]?.total || 0;

      const [records] = await db.execute(dataQuery, filterParams);

      res.json({
        success: true,
        data: records,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: total > 0 ? Math.ceil(total / limitNumber) : 0
        }
      });
    } catch (error) {
      logger.error(`Error fetching waste records: ${error.message} | stack: ${error.stack}`);
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
        work_order_id: workOrderId,
        waste_category_id: wasteCategoryId,
        waste_quantity: wasteQuantity,
        waste_unit: wasteUnit,
        material_cost: materialCost,
        labor_cost: laborCost,
        overhead_cost: overheadCost,
        waste_reason: wasteReason,
        root_cause: rootCause,
        corrective_action: correctiveAction,
        responsible_operator_id: responsibleOperatorId,
        waste_date: wasteDate
      } = req.body;

      // Validate required fields
      if (!workOrderId || !wasteCategoryId || !wasteQuantity || !wasteUnit) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: work_order_id, waste_category_id, waste_quantity, waste_unit'
        });
      }

      // Calculate total cost
      const totalCost = (materialCost || 0) + (laborCost || 0) + (overheadCost || 0);

      const query = `
        INSERT INTO production_waste_records 
        (work_order_id, waste_category_id, waste_quantity, waste_unit, 
         material_cost, labor_cost, overhead_cost, total_cost, waste_reason, 
         root_cause, corrective_action, responsible_operator_id, reported_by, waste_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        workOrderId,
        wasteCategoryId,
        wasteQuantity,
        wasteUnit,
        materialCost || 0,
        laborCost || 0,
        overheadCost || 0,
        totalCost,
        wasteReason,
        rootCause,
        correctiveAction,
        responsibleOperatorId || null,
        req.user.id,
        wasteDate || new Date().toISOString().split('T')[0]
      ]);

      res.status(201).json({
        success: true,
        message: 'Waste recorded successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error(`Error recording waste: ${error.message} | stack: ${error.stack}`);
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
      const {
        from_date: fromDate,
        to_date: toDate,
        waste_type: wasteType
      } = req.query;

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

      if (fromDate) {
        query += ' AND pwr.waste_date >= ?';
        params.push(fromDate);
      }

      if (toDate) {
        query += ' AND pwr.waste_date <= ?';
        params.push(toDate);
      }

      if (wasteType) {
        query += ' AND wc.waste_type = ?';
        params.push(wasteType);
      }

      query += ' GROUP BY wc.id, wc.category_name, wc.waste_type, pwr.waste_unit';
      query += ' ORDER BY total_waste_cost DESC';

      const [analytics] = await db.execute(query, params);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error(`Error fetching waste analytics: ${error.message} | stack: ${error.stack}`);
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
        machine_id: machineId,
        manufacturing_unit_id: manufacturingUnitId,
        from_date: fromDate,
        to_date: toDate,
        oee_rating: oeeRating,
        page = 1,
        limit = 20
      } = req.query;

      const parsedPage = Number.parseInt(page, 10);
      const pageNumber = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const parsedLimit = Number.parseInt(limit, 10);
      const limitNumber = Number.isNaN(parsedLimit) || parsedLimit < 1
        ? 20
        : Math.min(parsedLimit, 100);
      const offset = (pageNumber - 1) * limitNumber;
      const limitClause = `LIMIT ${limitNumber} OFFSET ${offset}`;

      const filters = [];
      const filterParams = [];

      if (machineId) {
        filters.push('oee.machine_id = ?');
        filterParams.push(machineId);
      }

      if (manufacturingUnitId) {
        filters.push('oee.manufacturing_unit_id = ?');
        filterParams.push(manufacturingUnitId);
      }

      if (fromDate) {
        filters.push('oee.record_date >= ?');
        filterParams.push(fromDate);
      }

      if (toDate) {
        filters.push('oee.record_date <= ?');
        filterParams.push(toDate);
      }

      if (oeeRating) {
        filters.push('oee.oee_rating = ?');
        filterParams.push(oeeRating);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const dataQuery = `
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
        ${whereClause}
        ORDER BY oee.record_date DESC, oee.oee_percentage DESC
        ${limitClause}
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM production_oee_records oee
        LEFT JOIN production_machines pm ON oee.machine_id = pm.id
        LEFT JOIN manufacturing_units mu ON oee.manufacturing_unit_id = mu.id
        LEFT JOIN manufacturing_work_orders wo ON oee.work_order_id = wo.id
        ${whereClause}
      `;

      const [countResult] = await db.execute(countQuery, filterParams);
      const total = countResult[0]?.total || 0;

      const [records] = await db.execute(dataQuery, filterParams);

      res.json({
        success: true,
        data: records,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: total > 0 ? Math.ceil(total / limitNumber) : 0
        }
      });
    } catch (error) {
      logger.error(`Error fetching OEE records: ${error.message} | stack: ${error.stack}`);
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
        machine_id: machineId,
        manufacturing_unit_id: manufacturingUnitId,
        work_order_id: workOrderId,
        record_date: recordDate,
        shift,
        planned_production_time_minutes: plannedProductionTimeMinutes,
        actual_runtime_minutes: actualRuntimeMinutes,
        downtime_minutes: downtimeMinutes = 0,
        target_quantity: targetQuantity,
        actual_quantity: actualQuantity,
        good_quantity: goodQuantity,
        rejected_quantity: rejectedQuantity = 0,
        notes
      } = req.body;

      // Validate required fields
      if (
        !plannedProductionTimeMinutes ||
        !actualRuntimeMinutes ||
        !targetQuantity ||
        !actualQuantity ||
        !goodQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields for OEE calculation'
        });
      }

      // Calculate OEE components
      // Availability = (Actual Runtime / Planned Production Time) × 100
      const availability = (actualRuntimeMinutes / plannedProductionTimeMinutes) * 100;

      // Performance = (Actual Quantity / Target Quantity) × 100
      const performance = (actualQuantity / targetQuantity) * 100;

      // Quality = (Good Quantity / Actual Quantity) × 100
      const quality = (goodQuantity / actualQuantity) * 100;

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
        machineId || null,
        manufacturingUnitId || null,
        workOrderId || null,
        recordDate || new Date().toISOString().split('T')[0],
        shift,
        plannedProductionTimeMinutes,
        actualRuntimeMinutes,
        downtimeMinutes,
        targetQuantity,
        actualQuantity,
        goodQuantity,
        rejectedQuantity,
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
      logger.error(`Error calculating OEE: ${error.message} | stack: ${error.stack}`);
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
      const {
        machine_id: machineId,
        manufacturing_unit_id: manufacturingUnitId,
        from_date: fromDate,
        to_date: toDate
      } = req.query;

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

      if (machineId) {
        query += ' AND oee.machine_id = ?';
        params.push(machineId);
      }

      if (manufacturingUnitId) {
        query += ' AND oee.manufacturing_unit_id = ?';
        params.push(manufacturingUnitId);
      }

      if (fromDate) {
        query += ' AND oee.record_date >= ?';
        params.push(fromDate);
      }

      if (toDate) {
        query += ' AND oee.record_date <= ?';
        params.push(toDate);
      }

      query += ' GROUP BY pm.id, pm.machine_name, mu.unit_name';

      const [summary] = await db.execute(query, params);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error(`Error fetching OEE summary: ${error.message} | stack: ${error.stack}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch OEE summary',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionPlanningController();
