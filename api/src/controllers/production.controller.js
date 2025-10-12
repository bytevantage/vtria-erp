const db = require('../config/database');
const logger = require('../utils/logger');

class ProductionController {
  // ====================
  // Production Items Management
  // ====================

  // Get all production items
  async getProductionItems(req, res) {
    try {
      const query = `
        SELECT 
          pi.*,
          pc.category_name
        FROM production_items pi
        LEFT JOIN production_categories pc ON pi.category_id = pc.id
        ORDER BY pi.created_at DESC
        LIMIT 20
      `;

      const [items] = await db.execute(query);

      res.json({
        success: true,
        data: items
      });
    } catch (error) {
      logger.error('Error fetching production items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production items',
        error: error.message
      });
    }
  }

  // Create production item
  async createProductionItem(req, res) {
    try {
      const {
        item_name,
        item_code,
        description,
        category_id,
        unit_of_measurement = 'PCS',
        standard_cost,
        standard_time_hours,
        batch_size = 1,
        minimum_stock_level = 0,
        requires_inspection = true,
        shelf_life_days
      } = req.body;

      const query = `
        INSERT INTO production_items 
        (item_name, item_code, description, category_id, unit_of_measurement, 
         standard_cost, standard_time_hours, batch_size, minimum_stock_level, 
         requires_inspection, shelf_life_days, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        item_name,
        item_code,
        description,
        category_id,
        unit_of_measurement,
        standard_cost,
        standard_time_hours,
        batch_size,
        minimum_stock_level,
        requires_inspection,
        shelf_life_days,
        req.user.id  // Default user if not available
      ]);

      res.status(201).json({
        success: true,
        message: 'Production item created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error creating production item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create production item',
        error: error.message
      });
    }
  }

  // ====================
  // BOM Management
  // ====================

  // Get BOM for production item
  async getBOM(req, res) {
    try {
      const { production_item_id } = req.params;
      const { version } = req.query;

      let whereClause = 'WHERE bh.production_item_id = ?';
      const params = [production_item_id];

      if (version) {
        whereClause += ' AND bh.version = ?';
        params.push(version);
      } else {
        whereClause += ' AND bh.is_current_version = 1';
      }

      // Get BOM header
      const [bomHeaders] = await db.execute(`
        SELECT bh.*, pi.item_name as production_item_name
        FROM bom_headers bh
        LEFT JOIN production_items pi ON bh.production_item_id = pi.id
        ${whereClause}
        ORDER BY bh.created_at DESC
        LIMIT 1
      `, params);

      if (bomHeaders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'BOM not found'
        });
      }

      const bomHeader = bomHeaders[0];

      // Get BOM components
      const [bomComponents] = await db.execute(`
        SELECT bc.*, ii.item_name as component_name
        FROM bom_components bc
        LEFT JOIN inventory_items ii ON bc.inventory_item_id = ii.id
        WHERE bc.bom_header_id = ?
        ORDER BY bc.sequence_number
      `, [bomHeader.id]);

      res.json({
        success: true,
        data: {
          header: bomHeader,
          components: bomComponents
        }
      });
    } catch (error) {
      logger.error('Error fetching BOM:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch BOM',
        error: error.message
      });
    }
  }

  // Create BOM
  async createBOM(req, res) {
    try {
      const {
        production_item_id,
        version = '1.0',
        description,
        quantity_per_unit = 1,
        components = [],
        effective_from
      } = req.body;

      // Generate BOM number
      const bomNumber = `BOM-${Date.now()}`;

      // Get connection for transaction
      const connection = await db.getConnection();

      try {
        // Start transaction
        await connection.beginTransaction();

        // Create BOM header
        const [headerResult] = await connection.execute(`
          INSERT INTO bom_headers 
          (bom_number, production_item_id, version, description, quantity_per_unit, 
           effective_from, status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
        `, [bomNumber, production_item_id, version, description, quantity_per_unit, effective_from, req.user.id]);

        const bomHeaderId = headerResult.insertId;

        // Create BOM components
        for (let i = 0; i < components.length; i++) {
          const component = components[i];
          await connection.execute(`
            INSERT INTO bom_components 
            (bom_header_id, inventory_item_id, quantity_required, unit_cost, 
             sequence_number, is_optional, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            bomHeaderId,
            component.inventory_item_id,
            component.quantity_required,
            component.unit_cost || 0,
            i + 1,
            component.is_optional || false,
            component.notes || null
          ]);
        }

        await connection.commit();

        res.status(201).json({
          success: true,
          message: 'BOM created successfully',
          data: { id: bomHeaderId, bom_number: bomNumber }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('Error creating BOM:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create BOM',
        error: error.message
      });
    }
  }

  // ====================
  // Work Order Management (using existing work_orders table)
  // ====================

  // Get all work orders
  async getWorkOrders(req, res) {
    try {
      const query = `
        SELECT 
          wo.*,
          u.full_name as assigned_user_name
        FROM work_orders wo
        LEFT JOIN users u ON wo.assigned_to = u.id
        ORDER BY wo.planned_start_date DESC, wo.priority DESC
        LIMIT 20
      `;

      const [workOrders] = await db.execute(query);

      res.json({
        success: true,
        data: workOrders
      });
    } catch (error) {
      logger.error('Error fetching work orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work orders',
        error: error.message
      });
    }
  }

  // Create work order
  async createWorkOrder(req, res) {
    try {
      const {
        sales_order_id,
        sales_order_item_id,
        title,
        description,
        assigned_to,
        priority = 'medium',
        estimated_hours,
        planned_start_date,
        planned_end_date,
        technical_specifications,
        quality_requirements,
        safety_notes
      } = req.body;

      // Generate work order ID
      const workOrderId = `WO-${Date.now()}`;

      const query = `
        INSERT INTO work_orders 
        (work_order_id, sales_order_id, sales_order_item_id, title, description,
         assigned_to, priority, estimated_hours, planned_start_date, planned_end_date,
         technical_specifications, quality_requirements, safety_notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(query, [
        workOrderId,
        sales_order_id,
        sales_order_item_id,
        title,
        description,
        assigned_to,
        priority,
        estimated_hours,
        planned_start_date,
        planned_end_date,
        technical_specifications,
        quality_requirements,
        safety_notes,
        req.user.id
      ]);

      res.status(201).json({
        success: true,
        message: 'Work order created successfully',
        data: { id: result.insertId, work_order_id: workOrderId }
      });
    } catch (error) {
      logger.error('Error creating work order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create work order',
        error: error.message
      });
    }
  }

  // Get work order details
  async getWorkOrderDetails(req, res) {
    try {
      const { id } = req.params;

      // Get work order header
      const [workOrders] = await db.execute(`
        SELECT 
          wo.*,
          u.full_name as assigned_user_name
        FROM work_orders wo
        LEFT JOIN users u ON wo.assigned_to = u.id
        WHERE wo.id = ?
      `, [id]);

      if (workOrders.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Work order not found'
        });
      }

      res.json({
        success: true,
        data: workOrders[0]
      });
    } catch (error) {
      logger.error('Error fetching work order details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work order details',
        error: error.message
      });
    }
  }

  // Update work order status
  async updateWorkOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      await db.execute(`
        UPDATE work_orders 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, id]);

      res.json({
        success: true,
        message: 'Work order status updated successfully'
      });
    } catch (error) {
      logger.error('Error updating work order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update work order status',
        error: error.message
      });
    }
  }

  // ====================
  // Dashboard & Analytics
  // ====================

  // Get production dashboard
  async getProductionDashboard(req, res) {
    try {
      // Get manufacturing work order summary by status
      const [workOrderStats] = await db.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM manufacturing_work_orders 
        GROUP BY status
      `);

      // Get recent manufacturing work orders
      const [recentWorkOrders] = await db.execute(`
        SELECT 
          mwo.*,
          u.full_name as assigned_user_name
        FROM manufacturing_work_orders mwo
        LEFT JOIN users u ON mwo.assigned_to = u.id
        ORDER BY mwo.created_at DESC
        LIMIT 5
      `);

      // Get manufacturing cases count
      const [caseStats] = await db.execute(`
        SELECT COUNT(*) as total_cases FROM manufacturing_cases WHERE deleted_at IS NULL
      `);

      // Get BOM count
      const [bomStats] = await db.execute(`
        SELECT COUNT(*) as total_boms FROM bom_headers WHERE status = 'active'
      `);

      res.json({
        success: true,
        data: {
          work_order_stats: workOrderStats,
          recent_work_orders: recentWorkOrders,
          manufacturing_cases_count: caseStats[0].total_cases,
          bom_count: bomStats[0].total_boms || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching production dashboard:', error.message);
      logger.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production dashboard',
        error: error.message
      });
    }
  }

  // ====================
  // Master Data
  // ====================

  // Get manufacturing units
  async getManufacturingUnits(req, res) {
    try {
      const [units] = await db.execute(`
        SELECT * FROM manufacturing_units 
        WHERE status = 'active'
        ORDER BY unit_name
      `);

      res.json({
        success: true,
        data: units
      });
    } catch (error) {
      logger.error('Error fetching manufacturing units:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing units',
        error: error.message
      });
    }
  }

  // Create manufacturing unit
  async createManufacturingUnit(req, res) {
    try {
      const {
        unit_name,
        unit_code,
        location,
        capacity_per_day,
        unit_of_measurement,
        manager_employee_id,
        contact_phone,
        contact_email
      } = req.body;

      // Validate required fields
      if (!unit_name || !unit_code) {
        return res.status(400).json({
          success: false,
          message: 'Unit name and code are required'
        });
      }

      // Check if unit code already exists
      const [existing] = await db.execute(
        'SELECT id FROM manufacturing_units WHERE unit_code = ?',
        [unit_code]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Unit code already exists'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO manufacturing_units 
        (unit_name, unit_code, location, capacity_per_day, unit_of_measurement, 
         manager_employee_id, contact_phone, contact_email, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `, [
        unit_name,
        unit_code,
        location || null,
        capacity_per_day || null,
        unit_of_measurement || 'PCS',
        manager_employee_id || null,
        contact_phone || null,
        contact_email || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Manufacturing unit created successfully',
        data: { id: result.insertId, unit_name, unit_code }
      });
    } catch (error) {
      logger.error('Error creating manufacturing unit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create manufacturing unit',
        error: error.message
      });
    }
  }

  // Update manufacturing unit
  async updateManufacturingUnit(req, res) {
    try {
      const { id } = req.params;
      const {
        unit_name,
        unit_code,
        location,
        capacity_per_day,
        unit_of_measurement,
        manager_employee_id,
        contact_phone,
        contact_email,
        status
      } = req.body;

      // Check if unit exists
      const [existing] = await db.execute(
        'SELECT id FROM manufacturing_units WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing unit not found'
        });
      }

      // Check if unit code already exists (excluding current unit)
      if (unit_code) {
        const [codeExists] = await db.execute(
          'SELECT id FROM manufacturing_units WHERE unit_code = ? AND id != ?',
          [unit_code, id]
        );

        if (codeExists.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Unit code already exists'
          });
        }
      }

      await db.execute(`
        UPDATE manufacturing_units 
        SET unit_name = ?, unit_code = ?, location = ?, capacity_per_day = ?, 
            unit_of_measurement = ?, manager_employee_id = ?, contact_phone = ?, 
            contact_email = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        unit_name,
        unit_code,
        location || null,
        capacity_per_day || null,
        unit_of_measurement || null,
        manager_employee_id || null,
        contact_phone || null,
        contact_email || null,
        status || 'active',
        id
      ]);

      res.json({
        success: true,
        message: 'Manufacturing unit updated successfully'
      });
    } catch (error) {
      logger.error('Error updating manufacturing unit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update manufacturing unit',
        error: error.message
      });
    }
  }

  // Delete manufacturing unit (soft delete)
  async deleteManufacturingUnit(req, res) {
    try {
      const { id } = req.params;

      // Check if unit exists
      const [existing] = await db.execute(
        'SELECT id FROM manufacturing_units WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing unit not found'
        });
      }

      // Soft delete by setting status to inactive
      await db.execute(
        'UPDATE manufacturing_units SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', id]
      );

      res.json({
        success: true,
        message: 'Manufacturing unit deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting manufacturing unit:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete manufacturing unit',
        error: error.message
      });
    }
  }

  // Get production operations (legacy endpoint - returns empty for compatibility)
  async getProductionOperations(req, res) {
    res.json({
      success: true,
      data: []
    });
  }

  // Create production operation
  async createProductionOperation(req, res) {
    try {
      const {
        operation_code,
        operation_name,
        description,
        operation_type,
        work_center_code,
        setup_time_hours,
        run_time_per_unit_hours,
        teardown_time_hours,
        hourly_rate,
        setup_cost,
        requires_inspection,
        inspection_percentage
      } = req.body;

      // Validate required fields
      if (!operation_code || !operation_name || !operation_type) {
        return res.status(400).json({
          success: false,
          message: 'Operation code, name and type are required'
        });
      }

      // Check if operation code already exists
      const [existing] = await db.execute(
        'SELECT id FROM production_operations WHERE operation_code = ?',
        [operation_code]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Operation code already exists'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO production_operations 
        (operation_code, operation_name, description, operation_type, work_center_code,
         setup_time_hours, run_time_per_unit_hours, teardown_time_hours, hourly_rate,
         setup_cost, requires_inspection, inspection_percentage, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `, [
        operation_code,
        operation_name,
        description,
        operation_type,
        work_center_code || null,
        setup_time_hours || 0,
        run_time_per_unit_hours || 0,
        teardown_time_hours || 0,
        hourly_rate || 0,
        setup_cost || 0,
        requires_inspection || false,
        inspection_percentage || 0
      ]);

      res.status(201).json({
        success: true,
        message: 'Production operation created successfully',
        data: { id: result.insertId, operation_code, operation_name }
      });
    } catch (error) {
      logger.error('Error creating production operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create production operation',
        error: error.message
      });
    }
  }

  // Update production operation
  async updateProductionOperation(req, res) {
    try {
      const { id } = req.params;
      const {
        operation_code,
        operation_name,
        description,
        operation_type,
        work_center_code,
        setup_time_hours,
        run_time_per_unit_hours,
        teardown_time_hours,
        hourly_rate,
        setup_cost,
        requires_inspection,
        inspection_percentage,
        status
      } = req.body;

      // Check if operation exists
      const [existing] = await db.execute(
        'SELECT id FROM production_operations WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production operation not found'
        });
      }

      // Check if operation code already exists (excluding current operation)
      if (operation_code) {
        const [codeExists] = await db.execute(
          'SELECT id FROM production_operations WHERE operation_code = ? AND id != ?',
          [operation_code, id]
        );

        if (codeExists.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Operation code already exists'
          });
        }
      }

      await db.execute(`
        UPDATE production_operations 
        SET operation_code = ?, operation_name = ?, description = ?, operation_type = ?,
            work_center_code = ?, setup_time_hours = ?, run_time_per_unit_hours = ?,
            teardown_time_hours = ?, hourly_rate = ?, setup_cost = ?, 
            requires_inspection = ?, inspection_percentage = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        operation_code,
        operation_name,
        description || null,
        operation_type,
        work_center_code || null,
        setup_time_hours || null,
        run_time_per_unit_hours || null,
        teardown_time_hours || null,
        hourly_rate || null,
        setup_cost || null,
        requires_inspection || null,
        inspection_percentage || null,
        status || 'active',
        id
      ]);

      res.json({
        success: true,
        message: 'Production operation updated successfully'
      });
    } catch (error) {
      logger.error('Error updating production operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update production operation',
        error: error.message
      });
    }
  }

  // Delete production operation (soft delete)
  async deleteProductionOperation(req, res) {
    try {
      const { id } = req.params;

      // Check if operation exists
      const [existing] = await db.execute(
        'SELECT id FROM production_operations WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production operation not found'
        });
      }

      // Soft delete by setting status to inactive
      await db.execute(
        'UPDATE production_operations SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', id]
      );

      res.json({
        success: true,
        message: 'Production operation deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting production operation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete production operation',
        error: error.message
      });
    }
  }

  // Get production categories (legacy endpoint - returns empty for compatibility)
  async getProductionCategories(req, res) {
    res.json({
      success: true,
      data: []
    });
  }

  // Create production category
  async createProductionCategory(req, res) {
    try {
      const {
        category_name,
        category_code,
        description,
        parent_category_id,
        default_lead_time_days,
        default_batch_size,
        requires_quality_check
      } = req.body;

      // Validate required fields
      if (!category_name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Check if category code already exists (if provided)
      if (category_code) {
        const [existing] = await db.execute(
          'SELECT id FROM production_categories WHERE category_code = ?',
          [category_code]
        );

        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Category code already exists'
          });
        }
      }

      const [result] = await db.execute(`
        INSERT INTO production_categories 
        (category_name, category_code, description, parent_category_id, 
         default_lead_time_days, default_batch_size, requires_quality_check, 
         status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `, [
        category_name,
        category_code || null,
        description || null,
        parent_category_id || null,
        default_lead_time_days || 7,
        default_batch_size || 1,
        requires_quality_check !== undefined ? requires_quality_check : true
      ]);

      res.status(201).json({
        success: true,
        message: 'Production category created successfully',
        data: { id: result.insertId, category_name, category_code }
      });
    } catch (error) {
      logger.error('Error creating production category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create production category',
        error: error.message
      });
    }
  }

  // Update production category
  async updateProductionCategory(req, res) {
    try {
      const { id } = req.params;
      const {
        category_name,
        category_code,
        description,
        parent_category_id,
        default_lead_time_days,
        default_batch_size,
        requires_quality_check,
        status
      } = req.body;

      // Check if category exists
      const [existing] = await db.execute(
        'SELECT id FROM production_categories WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production category not found'
        });
      }

      // Check if category code already exists (excluding current category)
      if (category_code) {
        const [codeExists] = await db.execute(
          'SELECT id FROM production_categories WHERE category_code = ? AND id != ?',
          [category_code, id]
        );

        if (codeExists.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Category code already exists'
          });
        }
      }

      await db.execute(`
        UPDATE production_categories 
        SET category_name = ?, category_code = ?, description = ?, 
            parent_category_id = ?, default_lead_time_days = ?, 
            default_batch_size = ?, requires_quality_check = ?, 
            status = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        category_name,
        category_code || null,
        description || null,
        parent_category_id || null,
        default_lead_time_days || null,
        default_batch_size || null,
        requires_quality_check || null,
        status || 'active',
        id
      ]);

      res.json({
        success: true,
        message: 'Production category updated successfully'
      });
    } catch (error) {
      logger.error('Error updating production category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update production category',
        error: error.message
      });
    }
  }

  // Delete production category (soft delete)
  async deleteProductionCategory(req, res) {
    try {
      const { id } = req.params;

      // Check if category exists
      const [existing] = await db.execute(
        'SELECT id FROM production_categories WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production category not found'
        });
      }

      // Check if category has any active production items
      const [items] = await db.execute(
        'SELECT id FROM production_items WHERE category_id = ? AND status = ?',
        [id, 'active']
      );

      if (items.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with active production items'
        });
      }

      // Soft delete by setting status to inactive
      await db.execute(
        'UPDATE production_categories SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', id]
      );

      res.json({
        success: true,
        message: 'Production category deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting production category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete production category',
        error: error.message
      });
    }
  }

  // ====================
  // Manufacturing Cases Management
  // ====================

  // Get cases ready for production (cases in 'order' state with accepted quotations)
  async getCasesReadyForProduction(req, res) {
    try {
      const query = `
        SELECT 
          c.id,
          c.case_number,
          c.project_name,
          c.estimated_value,
          c.final_value,
          c.created_at,
          c.expected_completion_date,
          cl.company_name as client_name,
          q.quotation_id,
          q.grand_total as quotation_amount,
          e.estimation_id,
          u.full_name as assigned_to_name
        FROM cases c
        INNER JOIN quotations q ON c.id = q.case_id
        INNER JOIN estimations e ON q.estimation_id = e.id
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.current_state = 'order' 
        AND c.status = 'active'
        AND q.status IN ('approved', 'accepted')
        AND c.id NOT IN (
          SELECT DISTINCT case_id 
          FROM manufacturing_cases 
          WHERE case_id IS NOT NULL
        )
        ORDER BY c.created_at DESC
      `;

      const [cases] = await db.execute(query);

      res.json({
        success: true,
        data: cases
      });
    } catch (error) {
      logger.error('Error fetching cases ready for production:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cases ready for production',
        error: error.message
      });
    }
  }

  // Move case to production and create manufacturing case
  async moveToProduction(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { case_id } = req.params;
      const {
        planned_start_date = null,
        planned_end_date = null,
        manufacturing_unit_id = null,
        priority = 'medium',
        notes = null
      } = req.body;

      const created_by = req.user.id;

      // Verify case is in 'order' state
      const [caseData] = await connection.execute(
        'SELECT id, case_number, project_name, final_value FROM cases WHERE id = ? AND current_state = ?',
        [case_id, 'order']
      );

      if (caseData.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Case not found or not in order state'
        });
      }

      // Generate manufacturing case number
      const manufacturing_case_number = `MC/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;

      // Get BOM for this case (if exists)
      const [bomData] = await connection.execute(`
        SELECT bh.id as bom_header_id, bh.bom_number, bh.material_cost
        FROM bom_headers bh
        INNER JOIN production_items pi ON bh.production_item_id = pi.id
        WHERE pi.item_code = ?
        AND bh.status = 'active'
        ORDER BY bh.created_at DESC
        LIMIT 1
      `, [`CASE-${case_id}`]);

      const bomHeaderId = bomData.length > 0 ? bomData[0].bom_header_id : null;

      // Create manufacturing case
      const [manufacturingResult] = await connection.execute(`
        INSERT INTO manufacturing_cases (
          manufacturing_case_number,
          case_id,
          planned_start_date,
          planned_end_date,
          manufacturing_unit_id,
          priority,
          status,
          notes,
          bom_header_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'planning', ?, ?, ?)
      `, [
        manufacturing_case_number,
        case_id,
        planned_start_date,
        planned_end_date,
        manufacturing_unit_id,
        priority,
        notes,
        bomHeaderId,
        created_by
      ]);

      const manufacturingCaseId = manufacturingResult.insertId;

      // Update case state to 'production'
      await connection.execute(
        'UPDATE cases SET current_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['production', case_id]
      );

      // Log the production move for audit trail
      await connection.execute(`
        INSERT INTO case_history (
          reference_type, reference_id, status, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        'case',
        case_id,
        'MOVED_TO_PRODUCTION',
        `Manufacturing case ${manufacturing_case_number} created by user ${created_by}`,
        created_by
      ]);

      // Get estimation details for the case
      const [estimationData] = await connection.execute(`
        SELECT e.id as estimation_id, e.estimation_id as estimation_number
        FROM estimations e
        INNER JOIN quotations q ON e.id = q.estimation_id
        WHERE q.case_id = ?
        ORDER BY e.created_at DESC
        LIMIT 1
      `, [case_id]);

      if (estimationData.length > 0) {
        // Get estimation sections and items
        const [sections] = await connection.execute(`
          SELECT 
            es.id as section_id,
            es.heading as section_name,
            es.sort_order as section_order,
            ess.id as subsection_id,
            ess.subsection_name,
            ess.subsection_order
          FROM estimation_sections es
          LEFT JOIN estimation_subsections ess ON es.id = ess.section_id
          WHERE es.estimation_id = ?
          ORDER BY es.sort_order, ess.subsection_order
        `, [estimationData[0].estimation_id]);

        // Get estimation items
        const [items] = await connection.execute(`
          SELECT 
            ei.*,
            p.name as product_name,
            p.part_code,
            p.make,
            p.model,
            es.heading as section_name,
            ess.subsection_name
          FROM estimation_items ei
          LEFT JOIN products p ON ei.product_id = p.id
          LEFT JOIN estimation_sections es ON ei.section_id = es.id
          LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
          WHERE ei.estimation_id = ?
          ORDER BY es.sort_order, ess.subsection_order, ei.id
        `, [estimationData[0].estimation_id]);

        // Create manufacturing work orders for each section
        for (const item of items) {
          const workOrderNumber = `WO/${new Date().getFullYear()}/${String(Date.now() + Math.random()).slice(-8)}`;

          await connection.execute(`
            INSERT INTO manufacturing_work_orders (
              work_order_number,
              manufacturing_case_id,
              operation_name,
              sequence_number,
              status,
              estimated_hours,
              planned_start_date,
              created_by
            ) VALUES (?, ?, ?, ?, 'pending', ?, CURDATE(), ?)
          `, [
            workOrderNumber,
            manufacturingCaseId,
            `${item.section_name || 'General'} - ${item.product_name || 'Item'}`,
            item.id || 1,
            Math.ceil((parseFloat(item.final_price) || 100) / 50), // Rough estimate: ₹50 per hour
            created_by
          ]);
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Manufacturing case created successfully',
        data: {
          manufacturing_case_id: manufacturingCaseId,
          manufacturing_case_number,
          case_id
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Error moving case to production:', error);
      console.error('Full error details:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to move case to production',
        error: error.message,
        details: error.sql || error.sqlMessage || 'No SQL details available'
      });
    } finally {
      connection.release();
    }
  }

  // Get all manufacturing cases
  async getManufacturingCases(req, res) {
    try {
      const query = `
        SELECT 
          mc.*,
          c.case_number,
          c.project_name,
          c.current_state,
          cl.company_name as client_name,
          mu.unit_name as manufacturing_unit_name,
          u.full_name as created_by_name,
          bh.bom_number,
          bh.material_cost as bom_material_cost,
          bh.status as bom_status,
          COUNT(mwo.id) as work_orders_count,
          SUM(CASE WHEN mwo.status = 'completed' THEN 1 ELSE 0 END) as completed_work_orders
        FROM manufacturing_cases mc
        INNER JOIN cases c ON mc.case_id = c.id
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN manufacturing_units mu ON mc.manufacturing_unit_id = mu.id
        LEFT JOIN users u ON mc.created_by = u.id
        LEFT JOIN bom_headers bh ON mc.bom_header_id = bh.id
        LEFT JOIN manufacturing_work_orders mwo ON mc.id = mwo.manufacturing_case_id
        GROUP BY mc.id
        ORDER BY mc.created_at DESC
      `;

      const [cases] = await db.execute(query);

      res.json({
        success: true,
        data: cases
      });
    } catch (error) {
      logger.error('Error fetching manufacturing cases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch manufacturing cases',
        error: error.message
      });
    }
  }

  // Get estimation details for a case
  async getEstimationDetailsForCase(req, res) {
    try {
      const { case_id } = req.params;

      // Get estimation information
      const [estimationData] = await db.execute(`
        SELECT 
          e.id,
          e.estimation_id,
          e.date,
          e.total_final_price,
          c.case_number,
          c.project_name
        FROM estimations e
        INNER JOIN quotations q ON e.id = q.estimation_id
        INNER JOIN cases c ON q.case_id = c.id
        WHERE c.id = ?
        ORDER BY e.created_at DESC
        LIMIT 1
      `, [case_id]);

      if (estimationData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No estimation found for this case'
        });
      }

      const estimation = estimationData[0];

      // Get sections and subsections
      const [sections] = await db.execute(`
        SELECT 
          es.id as section_id,
          es.heading as section_name,
          es.sort_order as section_order,
          ess.id as subsection_id,
          ess.subsection_name,
          ess.subsection_order
        FROM estimation_sections es
        LEFT JOIN estimation_subsections ess ON es.id = ess.section_id
        WHERE es.estimation_id = ?
        ORDER BY es.sort_order, ess.subsection_order
      `, [estimation.id]);

      // Get estimation items with product details
      const [items] = await db.execute(`
        SELECT 
          ei.*,
          p.name as product_name,
          p.part_code,
          p.make,
          p.model,
          p.description,
          es.heading as section_name,
          ess.subsection_name,
          es.sort_order as section_order,
          ess.subsection_order
        FROM estimation_items ei
        LEFT JOIN products p ON ei.product_id = p.id
        LEFT JOIN estimation_sections es ON ei.section_id = es.id
        LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
        WHERE ei.estimation_id = ?
        ORDER BY es.sort_order, ess.subsection_order, ei.id
      `, [estimation.id]);

      // Organize data by sections and subsections
      const organizedData = {
        estimation: estimation,
        sections: []
      };

      const sectionMap = new Map();

      sections.forEach(section => {
        if (!sectionMap.has(section.section_id)) {
          sectionMap.set(section.section_id, {
            section_id: section.section_id,
            section_name: section.section_name,
            section_order: section.section_order,
            subsections: []
          });
        }

        if (section.subsection_id) {
          sectionMap.get(section.section_id).subsections.push({
            subsection_id: section.subsection_id,
            subsection_name: section.subsection_name,
            subsection_order: section.subsection_order,
            items: []
          });
        }
      });

      // Add items to their respective sections/subsections
      items.forEach(item => {
        const section = sectionMap.get(item.section_id);
        if (section) {
          if (item.subsection_id) {
            const subsection = section.subsections.find(sub => sub.subsection_id === item.subsection_id);
            if (subsection) {
              subsection.items.push(item);
            }
          } else {
            // Add items without subsection directly to section
            if (!section.items) section.items = [];
            section.items.push(item);
          }
        }
      });

      organizedData.sections = Array.from(sectionMap.values());

      res.json({
        success: true,
        data: organizedData
      });

    } catch (error) {
      logger.error('Error fetching estimation details for case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch estimation details',
        error: error.message
      });
    }
  }

  // Update manufacturing case status
  async updateManufacturingCaseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, actual_start_date, actual_end_date, notes } = req.body;
      const updated_by = req.user.id;

      const [result] = await db.execute(`
        UPDATE manufacturing_cases 
        SET status = ?, 
            actual_start_date = COALESCE(?, actual_start_date),
            actual_end_date = COALESCE(?, actual_end_date),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [status, actual_start_date || null, actual_end_date || null, notes || null, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      // Get current status first
      const [currentStatus] = await db.execute(
        'SELECT status FROM manufacturing_cases WHERE id = ?', [id]
      );

      // Log status change in case history
      if (currentStatus.length > 0) {
        await db.execute(`
          INSERT INTO case_history (
            reference_type, reference_id, status, notes, created_by
          ) VALUES (?, ?, ?, ?, ?)
        `, ['manufacturing_case', id, `Status changed from ${currentStatus[0].status} to ${status}`, notes || null, updated_by]);
      }

      res.json({
        success: true,
        message: 'Manufacturing case status updated successfully'
      });

    } catch (error) {
      logger.error('Error updating manufacturing case status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update manufacturing case status',
        error: error.message
      });
    }
  }

  // Get work orders for a manufacturing case
  async getManufacturingCaseWorkOrders(req, res) {
    try {
      const { id } = req.params;

      const [workOrders] = await db.execute(`
        SELECT 
          mwo.*,
          u.full_name as assigned_to_name
        FROM manufacturing_work_orders mwo
        LEFT JOIN users u ON mwo.assigned_to = u.id
        WHERE mwo.manufacturing_case_id = ?
        ORDER BY mwo.sequence_number, mwo.created_at ASC
      `, [id]);

      res.json({
        success: true,
        data: workOrders
      });

    } catch (error) {
      logger.error('Error fetching work orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch work orders',
        error: error.message
      });
    }
  }

  // Create work orders for a manufacturing case
  async createManufacturingCaseWorkOrders(req, res) {
    try {
      const { id } = req.params;
      const { title, description, priority = 'medium' } = req.body;
      const created_by = req.user?.id || 1;

      // First check if the manufacturing case exists
      const [manufacturingCase] = await db.execute(
        'SELECT id, manufacturing_case_number FROM manufacturing_cases WHERE id = ?',
        [id]
      );

      if (manufacturingCase.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Manufacturing case with ID ${id} not found`
        });
      }

      const caseData = manufacturingCase[0];

      // Check existing work orders to prevent unlimited creation
      const [existingWorkOrders] = await db.execute(
        'SELECT COUNT(*) as count FROM manufacturing_work_orders WHERE manufacturing_case_id = ?',
        [id]
      );

      const maxWorkOrders = 10; // Business rule: max 10 work orders per manufacturing case
      if (existingWorkOrders[0].count >= maxWorkOrders) {
        return res.status(400).json({
          success: false,
          message: `Cannot create more work orders. Maximum of ${maxWorkOrders} work orders allowed per manufacturing case.`
        });
      }

      // Generate work order number
      const timestamp = Date.now().toString().slice(-6);
      const workOrderNumber = `VESPL/WO/${new Date().getFullYear()}/${timestamp}`;

      // Create the work order
      const [result] = await db.execute(`
        INSERT INTO manufacturing_work_orders 
        (manufacturing_case_id, work_order_number, operation_name, status, 
         planned_start_date, estimated_hours, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        workOrderNumber,
        title || `Work Order for ${caseData.manufacturing_case_number}`,
        'pending',
        new Date().toISOString().split('T')[0], // Today's date
        8.0, // Default 8 hours
        created_by
      ]);

      // Fetch the created work order
      const [newWorkOrder] = await db.execute(`
        SELECT 
          mwo.*,
          u.full_name as assigned_to_name
        FROM manufacturing_work_orders mwo
        LEFT JOIN users u ON mwo.assigned_to = u.id
        WHERE mwo.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'Work order created successfully',
        data: {
          work_orders: newWorkOrder // This is already an array from the query result
        }
      });

    } catch (error) {
      logger.error('Error creating work order for manufacturing case:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create work order',
        error: error.message
      });
    }
  }

  // Update work order
  async updateWorkOrder(req, res) {
    try {
      const { workOrderId } = req.params;
      const { operation_name, status, assigned_to, estimated_hours, actual_hours, planned_start_date, planned_end_date, actual_start_date, actual_end_date } = req.body;

      // Check if work order exists
      const [existingWorkOrder] = await db.execute(
        'SELECT id FROM manufacturing_work_orders WHERE id = ?',
        [workOrderId]
      );

      if (existingWorkOrder.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Work order with ID ${workOrderId} not found`
        });
      }

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (operation_name !== undefined) {
        updates.push('operation_name = ?');
        values.push(operation_name);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        values.push(assigned_to);
      }
      if (estimated_hours !== undefined) {
        updates.push('estimated_hours = ?');
        values.push(estimated_hours);
      }
      if (actual_hours !== undefined) {
        updates.push('actual_hours = ?');
        values.push(actual_hours);
      }
      if (planned_start_date !== undefined) {
        updates.push('planned_start_date = ?');
        values.push(planned_start_date);
      }
      if (planned_end_date !== undefined) {
        updates.push('planned_end_date = ?');
        values.push(planned_end_date);
      }
      if (actual_start_date !== undefined) {
        updates.push('actual_start_date = ?');
        values.push(actual_start_date);
      }
      if (actual_end_date !== undefined) {
        updates.push('actual_end_date = ?');
        values.push(actual_end_date);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields provided for update'
        });
      }

      values.push(workOrderId);

      await db.execute(`
        UPDATE manufacturing_work_orders 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, values);

      res.json({
        success: true,
        message: 'Work order updated successfully'
      });

    } catch (error) {
      console.error('ERROR: Error updating work order:', error.message);
      console.error('ERROR: Stack trace:', error.stack);
      console.error('ERROR: Work order ID:', workOrderId);
      console.error('ERROR: Request body:', req.body);
      logger.error('Error updating work order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update work order',
        error: error.message
      });
    }
  }

  // Delete work order
  async deleteWorkOrder(req, res) {
    try {
      const { workOrderId } = req.params;

      // Check if work order exists
      const [existingWorkOrder] = await db.execute(
        'SELECT id, manufacturing_case_id, work_order_number FROM manufacturing_work_orders WHERE id = ?',
        [workOrderId]
      );

      if (existingWorkOrder.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Work order with ID ${workOrderId} not found`
        });
      }

      const workOrder = existingWorkOrder[0];

      // Delete the work order
      await db.execute(
        'DELETE FROM manufacturing_work_orders WHERE id = ?',
        [workOrderId]
      );

      res.json({
        success: true,
        message: `Work order ${workOrder.work_order_number} deleted successfully`
      });

    } catch (error) {
      logger.error('Error deleting work order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete work order',
        error: error.message
      });
    }
  }

  // Update manufacturing case progress
  async updateManufacturingCaseProgress(req, res) {
    try {
      const { id } = req.params;
      const { progress_percentage, notes } = req.body;
      const updated_by = req.user.id;

      const [result] = await db.execute(`
        UPDATE manufacturing_cases 
        SET progress_percentage = ?, 
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [progress_percentage, notes, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      res.json({
        success: true,
        message: 'Manufacturing case progress updated successfully'
      });

    } catch (error) {
      logger.error('Error updating manufacturing case progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update manufacturing case progress',
        error: error.message
      });
    }
  }

  // Generate manufacturing case report
  async generateManufacturingCaseReport(req, res) {
    try {
      const { id } = req.params;

      // Get manufacturing case details
      const [mfgCase] = await db.execute(`
        SELECT 
          mc.*,
          c.case_number,
          c.project_name,
          cl.company_name as client_name,
          u.full_name as created_by_name
        FROM manufacturing_cases mc
        LEFT JOIN cases c ON mc.case_id = c.id
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN users u ON mc.created_by = u.id
        WHERE mc.id = ?
      `, [id]);

      if (mfgCase.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Manufacturing case not found'
        });
      }

      // Get work orders
      const [workOrders] = await db.execute(`
        SELECT 
          mwo.*,
          u.full_name as assigned_to_name
        FROM manufacturing_work_orders mwo
        LEFT JOIN users u ON mwo.assigned_to = u.id
        WHERE mwo.manufacturing_case_id = ?
        ORDER BY mwo.sequence_number
      `, [id]);

      // Get manufacturing case notes as status history
      const [statusHistory] = await db.execute(`
        SELECT 
          mcn.*,
          u.full_name as created_by_name
        FROM manufacturing_case_notes mcn
        LEFT JOIN users u ON mcn.created_by = u.id
        WHERE mcn.case_id = ?
        ORDER BY mcn.created_at DESC
      `, [id]);

      const report = {
        manufacturing_case: mfgCase[0],
        work_orders: workOrders,
        status_history: statusHistory,
        summary: {
          total_work_orders: workOrders.length,
          completed_work_orders: workOrders.filter(wo => wo.status === 'completed').length,
          in_progress_work_orders: workOrders.filter(wo => wo.status === 'in_progress').length,
          pending_work_orders: workOrders.filter(wo => wo.status === 'pending').length,
          total_estimated_hours: workOrders.reduce((sum, wo) => sum + (parseFloat(wo.estimated_hours) || 0), 0),
          total_actual_hours: workOrders.reduce((sum, wo) => sum + (parseFloat(wo.actual_hours) || 0), 0)
        },
        generated_at: new Date().toISOString(),
        generated_by: req.user.id
      };

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error generating manufacturing case report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate manufacturing case report',
        error: error.message
      });
    }
  }

  // Get active BOMs
  async getActiveBOMs(req, res) {
    try {
      const [boms] = await db.execute(`
        SELECT 
          bh.*,
          pi.item_name as production_item_name,
          pi.item_code as production_item_code,
          COUNT(bc.id) as components_count
        FROM bom_headers bh
        LEFT JOIN production_items pi ON bh.production_item_id = pi.id
        LEFT JOIN bom_components bc ON bh.id = bc.bom_header_id
        WHERE bh.status = 'active'
        GROUP BY bh.id, bh.bom_number, bh.production_item_id, bh.version, bh.description, 
                 bh.quantity_per_unit, bh.material_cost, bh.labor_cost, bh.overhead_cost, 
                 bh.total_cost, bh.effective_from, bh.effective_to, bh.status, bh.created_by, 
                 bh.created_at, bh.updated_at, pi.item_name, pi.item_code
        ORDER BY bh.created_at DESC
      `);

      res.json({
        success: true,
        data: boms
      });

    } catch (error) {
      logger.error('Error fetching active BOMs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active BOMs',
        error: error.message
      });
    }
  }

  // Get BOM components
  async getBOMComponents(req, res) {
    try {
      const { id } = req.params;

      const [components] = await db.execute(`
        SELECT 
          bc.*,
          p.name as product_name,
          p.part_code
        FROM bom_components bc
        LEFT JOIN products p ON bc.item_id = p.id
        WHERE bc.bom_header_id = ?
        ORDER BY bc.component_type, bc.category, bc.component_name
      `, [id]);

      res.json({
        success: true,
        data: components
      });

    } catch (error) {
      logger.error('Error fetching BOM components:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch BOM components',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionController();