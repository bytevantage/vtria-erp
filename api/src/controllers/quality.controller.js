const db = require('../config/database');
const logger = require('../utils/logger');

class QualityController {
  // ============================================================================
  // QUALITY CHECKPOINTS MANAGEMENT
  // ============================================================================

  // Get all quality checkpoints
  async getQualityCheckpoints(req, res) {
    try {
      const { checkpoint_type, is_active } = req.query;

      let query = 'SELECT * FROM quality_checkpoints WHERE 1=1';
      const params = [];

      if (checkpoint_type) {
        query += ' AND checkpoint_type = ?';
        params.push(checkpoint_type);
      }

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY sequence_order ASC';

      const [checkpoints] = await db.execute(query, params);

      res.json({
        success: true,
        data: checkpoints
      });
    } catch (error) {
      logger.error('Error fetching quality checkpoints:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality checkpoints',
        error: error.message
      });
    }
  }

  // Create quality checkpoint
  async createQualityCheckpoint(req, res) {
    try {
      const {
        checkpoint_code,
        checkpoint_name,
        checkpoint_type,
        description,
        is_mandatory = true,
        sequence_order = 0,
        applicable_categories
      } = req.body;

      // Validate required fields
      if (!checkpoint_code || !checkpoint_name || !checkpoint_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: checkpoint_code, checkpoint_name, checkpoint_type'
        });
      }

      const query = `
        INSERT INTO quality_checkpoints 
        (checkpoint_code, checkpoint_name, checkpoint_type, description, 
         is_mandatory, sequence_order, applicable_categories, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        checkpoint_code,
        checkpoint_name,
        checkpoint_type,
        description,
        is_mandatory,
        sequence_order,
        applicable_categories ? JSON.stringify(applicable_categories) : null,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Quality checkpoint created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error creating quality checkpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quality checkpoint',
        error: error.message
      });
    }
  }

  // ============================================================================
  // DEFECT TYPES MANAGEMENT
  // ============================================================================

  // Get all defect types
  async getDefectTypes(req, res) {
    try {
      const { category, is_active } = req.query;

      let query = 'SELECT * FROM quality_defect_types WHERE 1=1';
      const params = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY category, defect_name ASC';

      const [defectTypes] = await db.execute(query, params);

      res.json({
        success: true,
        data: defectTypes
      });
    } catch (error) {
      logger.error('Error fetching defect types:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch defect types',
        error: error.message
      });
    }
  }

  // Create defect type
  async createDefectType(req, res) {
    try {
      const {
        defect_code,
        defect_name,
        category,
        description,
        root_cause_category,
        corrective_action_required = false
      } = req.body;

      // Validate required fields
      if (!defect_code || !defect_name || !category) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: defect_code, defect_name, category'
        });
      }

      const query = `
        INSERT INTO quality_defect_types 
        (defect_code, defect_name, category, description, root_cause_category, 
         corrective_action_required)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        defect_code,
        defect_name,
        category,
        description,
        root_cause_category,
        corrective_action_required
      ]);

      res.status(201).json({
        success: true,
        message: 'Defect type created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error creating defect type:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create defect type',
        error: error.message
      });
    }
  }

  // ============================================================================
  // QUALITY INSPECTIONS MANAGEMENT
  // ============================================================================

  // Get all quality inspections
  async getQualityInspections(req, res) {
    try {
      const {
        inspection_type,
        overall_result,
        status,
        work_order_id,
        from_date,
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      let query = `
        SELECT 
          qi.*,
          wo.work_order_number,
          mc.manufacturing_case_number,
          p.name as product_name,
          qc.checkpoint_name,
          CONCAT(u.first_name, ' ', u.last_name) as inspector_name
        FROM quality_inspections_enhanced qi
        LEFT JOIN manufacturing_work_orders wo ON qi.work_order_id = wo.id
        LEFT JOIN manufacturing_cases mc ON qi.manufacturing_case_id = mc.id
        LEFT JOIN products p ON qi.product_id = p.id
        LEFT JOIN quality_checkpoints qc ON qi.checkpoint_id = qc.id
        LEFT JOIN users u ON qi.inspector_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (inspection_type) {
        query += ' AND qi.inspection_type = ?';
        params.push(inspection_type);
      }

      if (overall_result) {
        query += ' AND qi.overall_result = ?';
        params.push(overall_result);
      }

      if (status) {
        query += ' AND qi.status = ?';
        params.push(status);
      }

      if (work_order_id) {
        query += ' AND qi.work_order_id = ?';
        params.push(work_order_id);
      }

      if (from_date) {
        query += ' AND qi.inspection_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND qi.inspection_date <= ?';
        params.push(to_date);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult && countResult.length > 0 ? countResult[0].total : 0;

      // Get paginated results
      query += ' ORDER BY qi.inspection_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [inspections] = await db.execute(query, params);

      // Parse JSON fields
      inspections.forEach(inspection => {
        if (inspection.inspection_criteria && typeof inspection.inspection_criteria === 'string') {
          inspection.inspection_criteria = JSON.parse(inspection.inspection_criteria);
        }
        if (inspection.defects_found && typeof inspection.defects_found === 'string') {
          inspection.defects_found = JSON.parse(inspection.defects_found);
        }
        if (inspection.measurements && typeof inspection.measurements === 'string') {
          inspection.measurements = JSON.parse(inspection.measurements);
        }
        if (inspection.attachments && typeof inspection.attachments === 'string') {
          inspection.attachments = JSON.parse(inspection.attachments);
        }
      });

      res.json({
        success: true,
        data: inspections,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching quality inspections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality inspections',
        error: error.message
      });
    }
  }

  // Get single quality inspection
  async getQualityInspection(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          qi.*,
          wo.work_order_number,
          mc.manufacturing_case_number,
          p.name as product_name,
          qc.checkpoint_name,
          CONCAT(inspector.first_name, ' ', inspector.last_name) as inspector_name,
          CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
        FROM quality_inspections_enhanced qi
        LEFT JOIN manufacturing_work_orders wo ON qi.work_order_id = wo.id
        LEFT JOIN manufacturing_cases mc ON qi.manufacturing_case_id = mc.id
        LEFT JOIN products p ON qi.product_id = p.id
        LEFT JOIN quality_checkpoints qc ON qi.checkpoint_id = qc.id
        LEFT JOIN users inspector ON qi.inspector_id = inspector.id
        LEFT JOIN users approver ON qi.approved_by = approver.id
        WHERE qi.id = ?
      `;

      const [inspections] = await db.execute(query, [id]);

      if (inspections.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Quality inspection not found'
        });
      }

      const inspection = inspections[0];

      // Parse JSON fields
      if (inspection.inspection_criteria && typeof inspection.inspection_criteria === 'string') {
        inspection.inspection_criteria = JSON.parse(inspection.inspection_criteria);
      }
      if (inspection.defects_found && typeof inspection.defects_found === 'string') {
        inspection.defects_found = JSON.parse(inspection.defects_found);
      }
      if (inspection.measurements && typeof inspection.measurements === 'string') {
        inspection.measurements = JSON.parse(inspection.measurements);
      }
      if (inspection.attachments && typeof inspection.attachments === 'string') {
        inspection.attachments = JSON.parse(inspection.attachments);
      }

      // Get defect records
      const defectQuery = `
        SELECT 
          qdr.*,
          qdt.defect_name,
          qdt.category as defect_category,
          CONCAT(u.first_name, ' ', u.last_name) as responsible_person_name
        FROM quality_defect_records qdr
        LEFT JOIN quality_defect_types qdt ON qdr.defect_type_id = qdt.id
        LEFT JOIN users u ON qdr.responsible_person_id = u.id
        WHERE qdr.inspection_id = ?
        ORDER BY qdr.severity DESC, qdr.created_at ASC
      `;

      const [defects] = await db.execute(defectQuery, [id]);
      inspection.defect_records = defects;

      res.json({
        success: true,
        data: inspection
      });
    } catch (error) {
      logger.error('Error fetching quality inspection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality inspection',
        error: error.message
      });
    }
  }

  // Create quality inspection
  async createQualityInspection(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        inspection_number,
        work_order_id,
        manufacturing_case_id,
        product_id,
        checkpoint_id,
        batch_number,
        lot_number,
        inspection_type,
        inspection_date,
        sample_size,
        quantity_inspected,
        inspection_criteria,
        observations
      } = req.body;

      // Validate required fields
      if (!inspection_number || !inspection_type || !inspection_date || !sample_size || !quantity_inspected) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const query = `
        INSERT INTO quality_inspections_enhanced 
        (inspection_number, work_order_id, manufacturing_case_id, product_id, 
         checkpoint_id, batch_number, lot_number, inspection_type, inspection_date, 
         inspector_id, sample_size, quantity_inspected, inspection_criteria, 
         observations, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `;

      const [result] = await connection.execute(query, [
        inspection_number,
        work_order_id || null,
        manufacturing_case_id || null,
        product_id || null,
        checkpoint_id || null,
        batch_number,
        lot_number,
        inspection_type,
        inspection_date,
        req.user.id,
        sample_size,
        quantity_inspected,
        inspection_criteria ? JSON.stringify(inspection_criteria) : null,
        observations
      ]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Quality inspection created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating quality inspection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create quality inspection',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Update quality inspection results
  async updateInspectionResults(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        quantity_accepted,
        quantity_rejected,
        quantity_rework,
        overall_result,
        measurements,
        defects_found,
        inspector_notes,
        action_required,
        corrective_action,
        preventive_action,
        attachments
      } = req.body;

      // Calculate conformance percentage
      const total_checked = quantity_accepted + quantity_rejected + quantity_rework;
      const conformance_percentage = total_checked > 0
        ? (quantity_accepted / total_checked) * 100
        : 0;

      const query = `
        UPDATE quality_inspections_enhanced
        SET 
          quantity_accepted = ?,
          quantity_rejected = ?,
          quantity_rework = ?,
          overall_result = ?,
          conformance_percentage = ?,
          measurements = ?,
          defects_found = ?,
          inspector_notes = ?,
          action_required = ?,
          corrective_action = ?,
          preventive_action = ?,
          attachments = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await connection.execute(query, [
        quantity_accepted || 0,
        quantity_rejected || 0,
        quantity_rework || 0,
        overall_result,
        conformance_percentage.toFixed(2),
        measurements ? JSON.stringify(measurements) : null,
        defects_found ? JSON.stringify(defects_found) : null,
        inspector_notes,
        action_required || 'none',
        corrective_action,
        preventive_action,
        attachments ? JSON.stringify(attachments) : null,
        id
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: 'Inspection results updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating inspection results:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inspection results',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Submit inspection for approval
  async submitInspection(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE quality_inspections_enhanced
        SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'draft'
      `;

      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Inspection not found or already submitted'
        });
      }

      res.json({
        success: true,
        message: 'Inspection submitted for approval'
      });
    } catch (error) {
      logger.error('Error submitting inspection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit inspection',
        error: error.message
      });
    }
  }

  // Approve/Reject inspection
  async approveInspection(req, res) {
    try {
      const { id } = req.params;
      const { action, rejection_reason } = req.body;

      if (!['approved', 'rejected'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be "approved" or "rejected"'
        });
      }

      let query = `
        UPDATE quality_inspections_enhanced
        SET 
          status = ?,
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;
      const params = [action, req.user.id];

      if (action === 'rejected' && rejection_reason) {
        query += ', inspector_notes = CONCAT(COALESCE(inspector_notes, ""), "\n\nRejection Reason: ", ?)';
        params.push(rejection_reason);
      }

      query += ' WHERE id = ? AND status = "submitted"';
      params.push(id);

      const [result] = await db.execute(query, params);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Inspection not found or not in submitted status'
        });
      }

      res.json({
        success: true,
        message: `Inspection ${action} successfully`
      });
    } catch (error) {
      logger.error('Error approving/rejecting inspection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process inspection approval',
        error: error.message
      });
    }
  }

  // ============================================================================
  // DEFECT RECORDS MANAGEMENT
  // ============================================================================

  // Add defect record to inspection
  async addDefectRecord(req, res) {
    try {
      const { inspection_id } = req.params;
      const {
        defect_type_id,
        defect_count = 1,
        severity,
        location,
        description,
        root_cause,
        corrective_action,
        responsible_person_id,
        cost_impact
      } = req.body;

      // Validate required fields
      if (!defect_type_id || !severity) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: defect_type_id, severity'
        });
      }

      const query = `
        INSERT INTO quality_defect_records 
        (inspection_id, defect_type_id, defect_count, severity, location, 
         description, root_cause, corrective_action, responsible_person_id, cost_impact)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        inspection_id,
        defect_type_id,
        defect_count,
        severity,
        location,
        description,
        root_cause,
        corrective_action,
        responsible_person_id || null,
        cost_impact || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Defect record added successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error adding defect record:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add defect record',
        error: error.message
      });
    }
  }

  // Get defects for inspection
  async getInspectionDefects(req, res) {
    try {
      const { inspection_id } = req.params;

      const query = `
        SELECT 
          qdr.*,
          qdt.defect_name,
          qdt.defect_code,
          qdt.category as defect_category,
          CONCAT(u.first_name, ' ', u.last_name) as responsible_person_name
        FROM quality_defect_records qdr
        INNER JOIN quality_defect_types qdt ON qdr.defect_type_id = qdt.id
        LEFT JOIN users u ON qdr.responsible_person_id = u.id
        WHERE qdr.inspection_id = ?
        ORDER BY qdr.severity DESC, qdr.created_at ASC
      `;

      const [defects] = await db.execute(query, [inspection_id]);

      res.json({
        success: true,
        data: defects
      });
    } catch (error) {
      logger.error('Error fetching inspection defects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inspection defects',
        error: error.message
      });
    }
  }

  // Resolve defect
  async resolveDefect(req, res) {
    try {
      const { id } = req.params;

      const query = `
        UPDATE quality_defect_records
        SET resolved_at = CURRENT_TIMESTAMP
        WHERE id = ? AND resolved_at IS NULL
      `;

      const [result] = await db.execute(query, [id]);

      if (result.affectedRows === 0) {
        return res.status(400).json({
          success: false,
          message: 'Defect not found or already resolved'
        });
      }

      res.json({
        success: true,
        message: 'Defect marked as resolved'
      });
    } catch (error) {
      logger.error('Error resolving defect:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve defect',
        error: error.message
      });
    }
  }

  // ============================================================================
  // QUALITY ANALYTICS
  // ============================================================================

  // Get quality metrics dashboard
  async getQualityMetricsDashboard(req, res) {
    try {
      const { from_date, to_date, inspection_type } = req.query;

      let query = `
        SELECT 
          DATE(inspection_date) as inspection_date,
          inspection_type,
          COUNT(id) as total_inspections,
          COUNT(CASE WHEN overall_result = 'passed' THEN 1 END) as passed_count,
          COUNT(CASE WHEN overall_result = 'failed' THEN 1 END) as failed_count,
          COUNT(CASE WHEN overall_result = 'conditional' THEN 1 END) as conditional_count,
          SUM(quantity_inspected) as total_inspected,
          SUM(quantity_accepted) as total_accepted,
          SUM(quantity_rejected) as total_rejected,
          ROUND((SUM(quantity_accepted) / NULLIF(SUM(quantity_inspected), 0)) * 100, 2) as acceptance_rate,
          ROUND(AVG(conformance_percentage), 2) as avg_conformance
        FROM quality_inspections_enhanced
        WHERE status IN ('submitted', 'approved')
      `;
      const params = [];

      if (from_date) {
        query += ' AND inspection_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND inspection_date <= ?';
        params.push(to_date);
      }

      if (inspection_type) {
        query += ' AND inspection_type = ?';
        params.push(inspection_type);
      }

      query += ' GROUP BY DATE(inspection_date), inspection_type ORDER BY inspection_date DESC';

      const [metrics] = await db.execute(query, params);

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error fetching quality metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality metrics',
        error: error.message
      });
    }
  }

  // Get defect analysis
  async getDefectAnalysis(req, res) {
    try {
      const { from_date, to_date, severity } = req.query;

      let query = `
        SELECT 
          qdt.defect_name,
          qdt.defect_code,
          qdt.category,
          qdr.severity,
          COUNT(qdr.id) as defect_count,
          SUM(qdr.defect_count) as total_defects,
          SUM(qdr.cost_impact) as total_cost_impact,
          AVG(qdr.cost_impact) as avg_cost_per_defect,
          COUNT(CASE WHEN qdr.resolved_at IS NOT NULL THEN 1 END) as resolved_count,
          COUNT(CASE WHEN qdr.resolved_at IS NULL THEN 1 END) as open_count
        FROM quality_defect_records qdr
        INNER JOIN quality_defect_types qdt ON qdr.defect_type_id = qdt.id
        INNER JOIN quality_inspections_enhanced qi ON qdr.inspection_id = qi.id
        WHERE 1=1
      `;
      const params = [];

      if (from_date) {
        query += ' AND qi.inspection_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND qi.inspection_date <= ?';
        params.push(to_date);
      }

      if (severity) {
        query += ' AND qdr.severity = ?';
        params.push(severity);
      }

      query += ' GROUP BY qdt.id, qdt.defect_name, qdt.defect_code, qdt.category, qdr.severity';
      query += ' ORDER BY total_defects DESC';

      const [analysis] = await db.execute(query, params);

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error fetching defect analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch defect analysis',
        error: error.message
      });
    }
  }

  // Get quality summary report
  async getQualitySummaryReport(req, res) {
    try {
      const { from_date, to_date } = req.query;

      // Summary statistics
      let summaryQuery = `
        SELECT 
          COUNT(DISTINCT id) as total_inspections,
          COUNT(DISTINCT work_order_id) as work_orders_inspected,
          SUM(quantity_inspected) as total_quantity_inspected,
          SUM(quantity_accepted) as total_quantity_accepted,
          SUM(quantity_rejected) as total_quantity_rejected,
          ROUND((SUM(quantity_accepted) / NULLIF(SUM(quantity_inspected), 0)) * 100, 2) as overall_acceptance_rate,
          ROUND(AVG(conformance_percentage), 2) as avg_conformance_rate,
          COUNT(CASE WHEN overall_result = 'passed' THEN 1 END) as passed_inspections,
          COUNT(CASE WHEN overall_result = 'failed' THEN 1 END) as failed_inspections
        FROM quality_inspections_enhanced
        WHERE status IN ('submitted', 'approved')
      `;
      const summaryParams = [];

      if (from_date) {
        summaryQuery += ' AND inspection_date >= ?';
        summaryParams.push(from_date);
      }

      if (to_date) {
        summaryQuery += ' AND inspection_date <= ?';
        summaryParams.push(to_date);
      }

      const [summary] = await db.execute(summaryQuery, summaryParams);

      // Defect summary
      let defectQuery = `
        SELECT 
          qdr.severity,
          COUNT(qdr.id) as defect_occurrence_count,
          SUM(qdr.defect_count) as total_defects,
          SUM(qdr.cost_impact) as total_cost_impact
        FROM quality_defect_records qdr
        INNER JOIN quality_inspections_enhanced qi ON qdr.inspection_id = qi.id
        WHERE qi.status IN ('submitted', 'approved')
      `;
      const defectParams = [];

      if (from_date) {
        defectQuery += ' AND qi.inspection_date >= ?';
        defectParams.push(from_date);
      }

      if (to_date) {
        defectQuery += ' AND qi.inspection_date <= ?';
        defectParams.push(to_date);
      }

      defectQuery += ' GROUP BY qdr.severity ORDER BY qdr.severity';

      const [defects] = await db.execute(defectQuery, defectParams);

      res.json({
        success: true,
        data: {
          summary: summary[0],
          defects_by_severity: defects
        }
      });
    } catch (error) {
      logger.error('Error fetching quality summary report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quality summary report',
        error: error.message
      });
    }
  }
}

module.exports = new QualityController();
