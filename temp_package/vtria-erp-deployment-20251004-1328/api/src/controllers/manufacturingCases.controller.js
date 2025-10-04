const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const fs = require('fs').promises;
const path = require('path');

class ManufacturingCasesController {

  // Get all manufacturing cases
  async getAllCases(req, res) {
    try {
      const query = `
        SELECT 
          mc.*,
          c.case_number,
          se.project_name,
          cl.company_name as client_name,
          e.estimation_id,
          e.id as estimation_number,
          cu.full_name as created_by_name,
          au.full_name as assigned_to_name,
          (SELECT COUNT(*) FROM manufacturing_case_notes mcn WHERE mcn.case_id = mc.id) as notes_count,
          (SELECT COUNT(*) FROM manufacturing_case_documents mcd WHERE mcd.case_id = mc.id) as documents_count,
          (SELECT COUNT(*) FROM manufacturing_work_orders mwo WHERE mwo.manufacturing_case_id = mc.id) as work_orders_count
        FROM manufacturing_cases mc
        LEFT JOIN cases c ON mc.case_id = c.id
        LEFT JOIN estimations e ON e.case_id = c.id
        LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
        LEFT JOIN clients cl ON se.client_id = cl.id
        LEFT JOIN users cu ON mc.created_by = cu.id
        LEFT JOIN users au ON mc.assigned_to = au.id
        WHERE mc.deleted_at IS NULL
        ORDER BY mc.created_at DESC
      `;

      const [cases] = await db.execute(query);

      res.json({
        success: true,
        data: cases,
        count: cases.length
      });
    } catch (error) {
      console.error('Error fetching manufacturing cases:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching manufacturing cases',
        error: error.message
      });
    }
  }

  // Create manufacturing case from accepted quotation
  async createCaseFromQuote(req, res) {
    const connection = await db.getConnection();
    const self = this;

    try {
      await connection.beginTransaction();

      const { quotation_id, priority = 'medium', notes } = req.body;
      const userId = req.user?.id || 1;

      // Verify quotation exists and is approved
      const [quotation] = await connection.execute(
        `SELECT q.*, e.case_id, se.project_name 
         FROM quotations q
         LEFT JOIN estimations e ON q.estimation_id = e.id
         LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
         WHERE q.id = ? AND q.status = 'approved'`,
        [quotation_id]
      );

      if (quotation.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Approved quotation not found'
        });
      }

      const quote = quotation[0];

      // Check if manufacturing case already exists for this case
      const [existingCase] = await connection.execute(
        'SELECT id FROM manufacturing_cases WHERE case_id = ? AND status != "cancelled"',
        [quote.case_id]
      );

      if (existingCase.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Manufacturing case already exists for this quotation'
        });
      }

      // Generate manufacturing case number
      const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
      const caseNumber = await DocumentNumberGenerator.generateNumber('MC', financialYear);

      // Create manufacturing case
      const [caseResult] = await connection.execute(
        `INSERT INTO manufacturing_cases 
        (manufacturing_case_number, case_id, priority, status, notes, created_by, created_at)
        VALUES (?, ?, ?, 'approved', ?, ?, CURRENT_TIMESTAMP)`,
        [caseNumber, quote.case_id, priority, notes, userId]
      );

      const manufacturingCaseId = caseResult.insertId;

      // Create BOM from quotation items
      try {
        await self.createBOMFromQuotation(connection, manufacturingCaseId, quotation_id, userId);
      } catch (error) {
        console.error('Error creating BOM:', error);
      }

      // Create initial work orders from BOM
      try {
        await self.createWorkOrdersFromBOM(connection, manufacturingCaseId, quote.case_id, userId);
      } catch (error) {
        console.error('Error creating work orders:', error);
      }

      // Update case status to production
      await connection.execute(
        'UPDATE cases SET current_state = "production" WHERE id = ?',
        [quote.case_id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Manufacturing case created successfully',
        data: {
          id: manufacturingCaseId,
          case_number: caseNumber
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating manufacturing case:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating manufacturing case',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Helper method to create BOM from quotation
  async createBOMFromQuotation(connection, manufacturingCaseId, quotationId, userId) {
    // Get quotation items
    const [quotationItems] = await connection.execute(
      'SELECT * FROM quotation_items WHERE quotation_id = ?',
      [quotationId]
    );

    if (quotationItems.length > 0) {
      // Generate BOM number
      const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
      const bomNumber = await DocumentNumberGenerator.generateNumber('BOM', financialYear);

      // Create BOM header
      const [bomResult] = await connection.execute(
        `INSERT INTO bill_of_materials 
        (bom_number, manufacturing_case_id, product_name, description, status, created_by)
        VALUES (?, ?, ?, ?, 'active', ?)`,
        [bomNumber, manufacturingCaseId, 'Manufacturing Assembly', 'Generated from quotation', userId]
      );

      const bomId = bomResult.insertId;

      // Create BOM items from quotation items
      for (const item of quotationItems) {
        await connection.execute(
          `INSERT INTO bom_items 
          (bom_id, item_name, part_number, quantity_required, unit, unit_cost, total_cost, section)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bomId,
            item.item_name,
            item.hsn_code || item.item_code,
            item.quantity,
            item.unit || 'Nos',
            item.rate,
            item.amount,
            'Main Assembly'
          ]
        );
      }
    }
  }

  // Helper method to create work orders from BOM
  async createWorkOrdersFromBOM(connection, manufacturingCaseId, caseId, userId) {
    // Create primary work order for manufacturing
    const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
    const workOrderNumber = await DocumentNumberGenerator.generateNumber('WO', financialYear);

    await connection.execute(
      `INSERT INTO manufacturing_work_orders 
      (work_order_number, manufacturing_case_id, case_id, title, description, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'planned', ?)`,
      [
        workOrderNumber,
        manufacturingCaseId,
        caseId,
        'Primary Manufacturing Assembly',
        'Main manufacturing work order for case execution',
        userId
      ]
    );
  }

  // Get case details
  async getCaseDetails(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          mc.*,
          c.case_number,
          se.project_name,
          cl.company_name as client_name,
          cu.full_name as created_by_name,
          au.full_name as assigned_to_name,
          mu.unit_name as manufacturing_unit_name
        FROM manufacturing_cases mc
        LEFT JOIN cases c ON mc.case_id = c.id
        LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
        LEFT JOIN clients cl ON se.client_id = cl.id
        LEFT JOIN users cu ON mc.created_by = cu.id
        LEFT JOIN users au ON mc.assigned_to = au.id
        LEFT JOIN manufacturing_units mu ON mc.manufacturing_unit_id = mu.id
        WHERE mc.id = ?
      `;

      const [cases] = await db.execute(query, [id]);

      if (cases.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      res.json({
        success: true,
        data: cases[0]
      });
    } catch (error) {
      console.error('Error fetching case details:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching case details',
        error: error.message
      });
    }
  }

  // Approve/Reject manufacturing case
  async approveCase(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { approved, notes } = req.body;
      const userId = req.user?.id || 1;

      const newStatus = approved ? 'approved' : 'rejected';
      const approvedAt = approved ? 'CURRENT_TIMESTAMP' : 'NULL';

      await connection.execute(
        `UPDATE manufacturing_cases 
         SET status = ?, approved_by = ?, approved_at = ${approvedAt}, notes = ?
         WHERE id = ?`,
        [newStatus, userId, notes, id]
      );

      // Add case note for approval/rejection
      await connection.execute(
        `INSERT INTO manufacturing_case_notes 
        (case_id, note_type, content, created_by, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          id,
          approved ? 'approval' : 'rejection',
          notes || `Case ${approved ? 'approved' : 'rejected'}`,
          userId
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: `Manufacturing case ${approved ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating case approval:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating case approval',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Get case BOM
  async getCaseBOM(req, res) {
    try {
      const { id } = req.params;

      // Get BOM header
      const [bomHeader] = await db.execute(
        `SELECT bom.* FROM bill_of_materials bom 
         WHERE bom.manufacturing_case_id = ? AND bom.status = 'active'
         ORDER BY bom.created_at DESC LIMIT 1`,
        [id]
      );

      if (bomHeader.length === 0) {
        return res.json({
          success: true,
          data: null,
          message: 'No BOM found for this case'
        });
      }

      const bom = bomHeader[0];

      // Get BOM items with inventory availability
      const [bomItems] = await db.execute(
        `SELECT 
          bi.*,
          COALESCE(inv.quantity_available, 0) as stock_quantity,
          CASE 
            WHEN COALESCE(inv.quantity_available, 0) >= bi.quantity_required 
            THEN 'available'
            WHEN COALESCE(inv.quantity_available, 0) > 0 
            THEN 'partial'
            ELSE 'unavailable'
          END as availability_status,
          inv.last_updated as inventory_last_updated
        FROM bom_items bi
        LEFT JOIN inventory inv ON bi.part_number = inv.product_code
        WHERE bi.bom_id = ?
        ORDER BY bi.section, bi.sequence_number`,
        [bom.id]
      );

      res.json({
        success: true,
        data: {
          ...bom,
          items: bomItems
        }
      });
    } catch (error) {
      console.error('Error fetching case BOM:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching case BOM',
        error: error.message
      });
    }
  }

  // Get case notes
  async getCaseNotes(req, res) {
    try {
      const { id } = req.params;

      const [notes] = await db.execute(
        `SELECT 
          mcn.*,
          u.full_name as created_by_name,
          u.email as created_by_email
        FROM manufacturing_case_notes mcn
        LEFT JOIN users u ON mcn.created_by = u.id
        WHERE mcn.case_id = ?
        ORDER BY mcn.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      console.error('Error fetching case notes:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching case notes',
        error: error.message
      });
    }
  }

  // Add case note
  async addCaseNote(req, res) {
    try {
      const { id } = req.params;
      const { content, note_type = 'general', is_internal = false } = req.body;
      const userId = req.user?.id || 1;

      const [result] = await db.execute(
        `INSERT INTO manufacturing_case_notes 
        (case_id, note_type, content, is_internal, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, note_type, content, is_internal, userId]
      );

      res.json({
        success: true,
        message: 'Note added successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error adding case note:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding case note',
        error: error.message
      });
    }
  }

  // Get case documents
  async getCaseDocuments(req, res) {
    try {
      const { id } = req.params;

      const [documents] = await db.execute(
        `SELECT 
          mcd.*,
          u.full_name as uploaded_by_name
        FROM manufacturing_case_documents mcd
        LEFT JOIN users u ON mcd.uploaded_by = u.id
        WHERE mcd.case_id = ?
        ORDER BY mcd.upload_date DESC`,
        [id]
      );

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      console.error('Error fetching case documents:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching case documents',
        error: error.message
      });
    }
  }

  // Upload document
  async uploadDocument(req, res) {
    try {
      const { caseId } = req.params;
      const { document_type = 'general', description = '' } = req.body;
      const userId = req.user?.id || 1;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const [result] = await db.execute(
        `INSERT INTO manufacturing_case_documents 
        (case_id, document_name, file_path, file_size, document_type, description, uploaded_by, upload_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          caseId,
          req.file.originalname,
          req.file.path,
          req.file.size,
          document_type,
          description,
          userId
        ]
      );

      res.json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: result.insertId,
          filename: req.file.originalname
        }
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading document',
        error: error.message
      });
    }
  }

  // Get optimal product selection
  async getOptimalProducts(req, res) {
    try {
      const { part_number, quantity_required, sort_by = 'cost' } = req.query;

      let orderBy = 'p.cost_price ASC';
      if (sort_by === 'warranty') {
        orderBy = 'p.warranty_end_date DESC';
      } else if (sort_by === 'location') {
        orderBy = 'p.location ASC';
      }

      const query = `
        SELECT 
          p.*,
          inv.quantity_available,
          DATEDIFF(p.warranty_end_date, CURDATE()) as warranty_days_remaining,
          CASE 
            WHEN p.warranty_end_date < CURDATE() THEN 'expired'
            WHEN DATEDIFF(p.warranty_end_date, CURDATE()) <= 30 THEN 'expiring'
            ELSE 'valid'
          END as warranty_status
        FROM products p
        LEFT JOIN inventory inv ON p.product_code = inv.product_code
        WHERE p.part_number LIKE ? 
        AND inv.quantity_available >= ?
        AND p.status = 'active'
        ORDER BY ${orderBy}
        LIMIT 20
      `;

      const [products] = await db.execute(query, [`%${part_number}%`, quantity_required]);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error fetching optimal products:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching optimal products',
        error: error.message
      });
    }
  }

  // Dashboard data
  async getDashboardData(req, res) {
    try {
      // Get case counts by status
      const [statusCounts] = await db.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM manufacturing_cases
        WHERE deleted_at IS NULL
        GROUP BY status
      `);

      // Get priority distribution
      const [priorityCounts] = await db.execute(`
        SELECT 
          priority,
          COUNT(*) as count
        FROM manufacturing_cases
        WHERE deleted_at IS NULL AND status != 'completed'
        GROUP BY priority
      `);

      // Get recent activities
      const [recentActivities] = await db.execute(`
        SELECT 
          mc.manufacturing_case_number,
          mc.status,
          mc.updated_at,
          se.project_name
        FROM manufacturing_cases mc
        LEFT JOIN cases c ON mc.case_id = c.id
        LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
        WHERE mc.deleted_at IS NULL
        ORDER BY mc.updated_at DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          status_counts: statusCounts,
          priority_counts: priorityCounts,
          recent_activities: recentActivities
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
        error: error.message
      });
    }
  }

  // Update manufacturing case status
  async updateCaseStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id || 1;

      const validStatuses = ['draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled', 'on_hold'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }

      // Check if manufacturing case exists
      const [existingCase] = await connection.execute(
        'SELECT mc.*, c.case_number FROM manufacturing_cases mc LEFT JOIN cases c ON mc.case_id = c.id WHERE mc.id = ?',
        [id]
      );

      if (existingCase.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Manufacturing case with ID ${id} not found`
        });
      }

      const manufacturingCase = existingCase[0];

      // Update manufacturing case status
      await connection.execute(
        'UPDATE manufacturing_cases SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );

      // Add note for status change
      if (notes) {
        await connection.execute(
          `INSERT INTO manufacturing_case_notes 
          (case_id, note_type, content, created_by, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, 'progress', notes, userId]
        );
      }

      // If status is completed, check if we should create sales order automatically
      if (status === 'completed') {
        await this.handleManufacturingCompletion(connection, manufacturingCase, userId);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Manufacturing case status updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error updating manufacturing case status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating manufacturing case status',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Handle manufacturing completion and create sales order if needed
  async handleManufacturingCompletion(connection, manufacturingCase, userId) {
    try {
      // Check if there's already a sales order for this case
      const [existingSalesOrder] = await connection.execute(
        'SELECT id FROM sales_orders WHERE case_id = ?',
        [manufacturingCase.case_id]
      );

      if (existingSalesOrder.length === 0) {
        // Get the approved quotation for this case
        const [quotation] = await connection.execute(
          `SELECT q.*, e.case_id 
           FROM quotations q
           LEFT JOIN estimations e ON q.estimation_id = e.id
           WHERE e.case_id = ? AND q.status = 'approved'
           ORDER BY q.created_at DESC LIMIT 1`,
          [manufacturingCase.case_id]
        );

        if (quotation.length > 0) {
          const quote = quotation[0];

          // Generate sales order number
          const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
          const salesOrderNumber = await DocumentNumberGenerator.generateNumber('SO', financialYear);

          // Create sales order
          await connection.execute(
            `INSERT INTO sales_orders 
            (sales_order_id, quotation_id, case_id, order_date, 
             total_amount, tax_amount, grand_total, status, created_by, created_at)
            VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP)`,
            [
              salesOrderNumber,
              quote.id,
              manufacturingCase.case_id,
              quote.total_amount,
              quote.tax_amount,
              quote.grand_total,
              userId
            ]
          );

          // Update case status to order
          await connection.execute(
            'UPDATE cases SET current_state = "order" WHERE id = ?',
            [manufacturingCase.case_id]
          );
        }
      }
    } catch (error) {
      console.error('Error handling manufacturing completion:', error);
      // Don't throw here as this is a secondary operation
    }
  }

  // Get case with inherited notes from all stages
  async getCaseWithAllNotes(req, res) {
    try {
      const { id } = req.params;

      // Get manufacturing case details
      const [caseData] = await db.execute(
        `SELECT mc.*, c.case_number, se.project_name, se.id as enquiry_id
         FROM manufacturing_cases mc
         LEFT JOIN cases c ON mc.case_id = c.id
         LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
         WHERE mc.id = ?`,
        [id]
      );

      if (caseData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      const case_ = caseData[0];

      // Get all notes from different stages
      const [allNotes] = await db.execute(
        `SELECT 
          'sales_enquiry' as source_stage,
          se.notes as content,
          'general' as note_type,
          se.created_at,
          u.full_name as created_by_name,
          'Sales Enquiry Notes' as stage_label
        FROM sales_enquiries se
        LEFT JOIN users u ON se.created_by = u.id
        WHERE se.id = ? AND se.notes IS NOT NULL AND se.notes != ''
        
        UNION ALL
        
        SELECT 
          'estimation' as source_stage,
          e.notes as content,
          'technical' as note_type,
          e.created_at,
          u.full_name as created_by_name,
          'Estimation Notes' as stage_label
        FROM estimations e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.case_id = ? AND e.notes IS NOT NULL AND e.notes != ''
        
        UNION ALL
        
        SELECT 
          'quotation' as source_stage,
          q.notes as content,
          'commercial' as note_type,
          q.created_at,
          u.full_name as created_by_name,
          'Quotation Notes' as stage_label
        FROM quotations q
        LEFT JOIN estimations e ON q.estimation_id = e.id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE e.case_id = ? AND q.notes IS NOT NULL AND q.notes != ''
        
        UNION ALL
        
        SELECT 
          'manufacturing' as source_stage,
          mcn.content,
          mcn.note_type,
          mcn.created_at,
          u.full_name as created_by_name,
          'Manufacturing Notes' as stage_label
        FROM manufacturing_case_notes mcn
        LEFT JOIN users u ON mcn.created_by = u.id
        WHERE mcn.case_id = ?
        
        ORDER BY created_at DESC`,
        [case_.enquiry_id, case_.case_id, case_.case_id, id]
      );

      res.json({
        success: true,
        data: {
          ...case_,
          all_notes: allNotes
        }
      });
    } catch (error) {
      console.error('Error fetching case with all notes:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching case with notes',
        error: error.message
      });
    }
  }

  // Create sales order from completed manufacturing case
  async createSalesOrderFromManufacturing(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        customer_po_number,
        customer_po_date,
        expected_delivery_date,
        advance_amount,
        payment_terms,
        delivery_terms,
        warranty_terms,
        notes
      } = req.body;
      const userId = req.user?.id || 1;

      // Get manufacturing case
      const [manufacturingCase] = await connection.execute(
        'SELECT * FROM manufacturing_cases WHERE id = ? AND status = "completed"',
        [id]
      );

      if (manufacturingCase.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Manufacturing case not found or not completed'
        });
      }

      const case_ = manufacturingCase[0];

      // Check if sales order already exists
      const [existingSalesOrder] = await connection.execute(
        'SELECT id FROM sales_orders WHERE case_id = ?',
        [case_.case_id]
      );

      if (existingSalesOrder.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Sales order already exists for this manufacturing case'
        });
      }

      // Get quotation data
      const [quotation] = await connection.execute(
        `SELECT q.* FROM quotations q
         LEFT JOIN estimations e ON q.estimation_id = e.id
         WHERE e.case_id = ? AND q.status = 'approved'
         ORDER BY q.created_at DESC LIMIT 1`,
        [case_.case_id]
      );

      if (quotation.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No approved quotation found for this case'
        });
      }

      const quote = quotation[0];

      // Generate sales order number
      const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
      const salesOrderNumber = await DocumentNumberGenerator.generateNumber('SO', financialYear);

      // Create sales order
      const [salesOrderResult] = await connection.execute(
        `INSERT INTO sales_orders 
        (sales_order_id, quotation_id, case_id, order_date, 
         customer_po_number, customer_po_date, expected_delivery_date,
         total_amount, tax_amount, grand_total, advance_amount,
         payment_terms, delivery_terms, warranty_terms,
         status, created_by, created_at)
        VALUES (?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP)`,
        [
          salesOrderNumber,
          quote.id,
          case_.case_id,
          customer_po_number,
          customer_po_date,
          expected_delivery_date,
          quote.total_amount,
          quote.tax_amount,
          quote.grand_total,
          advance_amount || 0,
          payment_terms,
          delivery_terms,
          warranty_terms,
          userId
        ]
      );

      // Add notes if provided
      if (notes) {
        await connection.execute(
          `INSERT INTO manufacturing_case_notes 
          (case_id, note_type, content, created_by, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [id, 'sales_order_creation', notes, userId]
        );
      }

      // Update case status
      await connection.execute(
        'UPDATE cases SET current_state = "order" WHERE id = ?',
        [case_.case_id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Sales order created successfully from manufacturing case',
        data: {
          sales_order_id: salesOrderResult.insertId,
          sales_order_number: salesOrderNumber
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error creating sales order from manufacturing:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating sales order',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // Update manufacturing case (placeholder for basic updates)
  async updateCase(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id || 1;

      // Basic update functionality
      const fieldsToUpdate = [];
      const values = [];

      if (updateData.priority) {
        fieldsToUpdate.push('priority = ?');
        values.push(updateData.priority);
      }
      if (updateData.notes) {
        fieldsToUpdate.push('notes = ?');
        values.push(updateData.notes);
      }
      if (updateData.estimated_cost) {
        fieldsToUpdate.push('estimated_cost = ?');
        values.push(updateData.estimated_cost);
      }

      fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      if (fieldsToUpdate.length > 1) {
        await db.execute(
          `UPDATE manufacturing_cases SET ${fieldsToUpdate.join(', ')} WHERE id = ?`,
          values
        );
      }

      res.json({
        success: true,
        message: 'Manufacturing case updated successfully'
      });
    } catch (error) {
      console.error('Error updating manufacturing case:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating manufacturing case',
        error: error.message
      });
    }
  }

  // Delete manufacturing case (soft delete)
  async deleteCase(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;

      await db.execute(
        'UPDATE manufacturing_cases SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Manufacturing case deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting manufacturing case:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting manufacturing case',
        error: error.message
      });
    }
  }

  // Get case work orders (placeholder)
  async getCaseWorkOrders(req, res) {
    try {
      const { id } = req.params;

      const [workOrders] = await db.execute(
        `SELECT mwo.*, u.full_name as assigned_to_name
         FROM manufacturing_work_orders mwo
         LEFT JOIN users u ON mwo.assigned_to = u.id
         WHERE mwo.manufacturing_case_id = ?
         ORDER BY mwo.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: workOrders
      });
    } catch (error) {
      console.error('Error fetching work orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching work orders',
        error: error.message
      });
    }
  }

  // Get all manufacturing work orders
  async getAllWorkOrders(req, res) {
    try {
      const [workOrders] = await db.execute(
        `SELECT mwo.*, 
                mc.manufacturing_case_number,
                e.estimation_id,
                c.project_name,
                cl.company_name,
                u.full_name as assigned_to_name
         FROM manufacturing_work_orders mwo
         LEFT JOIN manufacturing_cases mc ON mwo.manufacturing_case_id = mc.id
         LEFT JOIN cases c ON mc.case_id = c.id
         LEFT JOIN estimations e ON e.case_id = c.id
         LEFT JOIN clients cl ON c.client_id = cl.id
         LEFT JOIN users u ON mwo.assigned_to = u.id
         ORDER BY mwo.created_at DESC`
      );

      res.json({
        success: true,
        data: workOrders
      });
    } catch (error) {
      console.error('Error fetching all work orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching work orders',
        error: error.message
      });
    }
  }

  // Create work order (placeholder)
  async createWorkOrder(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id: caseId } = req.params;
      const { operations = [], title, description } = req.body;
      const userId = req.user?.id || 1;

      // Validate manufacturing case exists and is approved
      const [caseResult] = await connection.execute(
        `SELECT mc.id, mc.manufacturing_case_number, mc.status, mc.case_id,
                e.estimation_id, c.project_name, cl.company_name
         FROM manufacturing_cases mc
         LEFT JOIN cases c ON mc.case_id = c.id
         LEFT JOIN estimations e ON e.case_id = c.id
         LEFT JOIN clients cl ON c.client_id = cl.id
         WHERE mc.id = ?`,
        [caseId]
      );

      if (caseResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      const manufacturingCase = caseResult[0];

      if (manufacturingCase.status !== 'approved') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Manufacturing case must be approved to create work orders'
        });
      }

      // Generate work order numbers and create work orders
      const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
      const createdWorkOrders = [];

      // If no specific operations provided, create a default work order
      if (!operations || operations.length === 0) {
        const workOrderNumber = await DocumentNumberGenerator.generateNumber('WO', financialYear);

        const [result] = await connection.execute(
          `INSERT INTO manufacturing_work_orders 
           (manufacturing_case_id, work_order_number, operation_name, sequence_number, 
            status, created_by, planned_start_date, estimated_hours)
           VALUES (?, ?, ?, ?, 'pending', ?, CURDATE(), ?)`,
          [
            caseId,
            workOrderNumber,
            title || `Manufacturing Work Order for ${manufacturingCase.manufacturing_case_number}`,
            1,
            userId,
            8.0 // Default 8 hours
          ]
        );

        createdWorkOrders.push({
          id: result.insertId,
          work_order_number: workOrderNumber,
          operation_name: title || `Manufacturing Work Order for ${manufacturingCase.manufacturing_case_number}`,
          sequence_number: 1,
          status: 'pending'
        });
      } else {
        // Create work orders for each operation
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          const workOrderNumber = await DocumentNumberGenerator.generateNumber('WO', financialYear);

          const [result] = await connection.execute(
            `INSERT INTO manufacturing_work_orders 
             (manufacturing_case_id, work_order_number, operation_name, sequence_number, 
              status, created_by, planned_start_date, estimated_hours)
             VALUES (?, ?, ?, ?, 'pending', ?, CURDATE(), ?)`,
            [
              caseId,
              workOrderNumber,
              operation.name || `Operation ${i + 1}`,
              operation.sequence || (i + 1),
              userId,
              operation.estimated_hours || 4.0
            ]
          );

          createdWorkOrders.push({
            id: result.insertId,
            work_order_number: workOrderNumber,
            operation_name: operation.name || `Operation ${i + 1}`,
            sequence_number: operation.sequence || (i + 1),
            status: 'pending',
            estimated_hours: operation.estimated_hours || 4.0
          });
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: `Created ${createdWorkOrders.length} work order(s) successfully`,
        data: {
          manufacturing_case: manufacturingCase,
          work_orders: createdWorkOrders
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating work order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create work order'
      });
    } finally {
      connection.release();
    }
  }

  // Update work order status (placeholder)
  async updateWorkOrderStatus(req, res) {
    res.json({
      success: true,
      message: 'Work order status update not yet implemented'
    });
  }

  // Update note (placeholder)
  async updateNote(req, res) {
    res.json({
      success: true,
      message: 'Note update not yet implemented'
    });
  }

  // Delete note (placeholder)
  async deleteNote(req, res) {
    res.json({
      success: true,
      message: 'Note deletion not yet implemented'
    });
  }

  // Delete document (placeholder)
  async deleteDocument(req, res) {
    res.json({
      success: true,
      message: 'Document deletion not yet implemented'
    });
  }

  // Download document (placeholder)
  async downloadDocument(req, res) {
    res.json({
      success: true,
      message: 'Document download not yet implemented'
    });
  }

  // Create case BOM (placeholder)
  async createCaseBOM(req, res) {
    res.json({
      success: true,
      message: 'BOM creation not yet implemented'
    });
  }

  // Update case BOM (placeholder)
  async updateCaseBOM(req, res) {
    res.json({
      success: true,
      message: 'BOM update not yet implemented'
    });
  }

  // Allocate materials (placeholder)
  async allocateMaterials(req, res) {
    res.json({
      success: true,
      message: 'Material allocation not yet implemented'
    });
  }

  // Get case progress (placeholder)
  async getCaseProgress(req, res) {
    res.json({
      success: true,
      message: 'Progress tracking not yet implemented'
    });
  }

  // Update case progress (placeholder)
  async updateCaseProgress(req, res) {
    res.json({
      success: true,
      message: 'Progress update not yet implemented'
    });
  }

  // Get quality checkpoints (placeholder)
  async getQualityCheckpoints(req, res) {
    res.json({
      success: true,
      message: 'Quality checkpoints not yet implemented'
    });
  }

  // Create quality checkpoint (placeholder)
  async createQualityCheckpoint(req, res) {
    res.json({
      success: true,
      message: 'Quality checkpoint creation not yet implemented'
    });
  }

  // Update quality checkpoint (placeholder)
  async updateQualityCheckpoint(req, res) {
    res.json({
      success: true,
      message: 'Quality checkpoint update not yet implemented'
    });
  }

  // Get efficiency metrics (placeholder)
  async getEfficiencyMetrics(req, res) {
    res.json({
      success: true,
      message: 'Efficiency metrics not yet implemented'
    });
  }
}

module.exports = new ManufacturingCasesController();