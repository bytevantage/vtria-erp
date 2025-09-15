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
        req.user?.id || 1  // Default user if not available
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

      // Start transaction
      await db.beginTransaction();

      try {
        // Create BOM header
        const [headerResult] = await db.execute(`
          INSERT INTO bom_headers 
          (bom_number, production_item_id, version, description, quantity_per_unit, 
           effective_from, status, created_by)
          VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
        `, [bomNumber, production_item_id, version, description, quantity_per_unit, effective_from, req.user?.id || 1]);

        const bomHeaderId = headerResult.insertId;

        // Create BOM components
        for (let i = 0; i < components.length; i++) {
          const component = components[i];
          await db.execute(`
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

        await db.commit();

        res.status(201).json({
          success: true,
          message: 'BOM created successfully',
          data: { id: bomHeaderId, bom_number: bomNumber }
        });
      } catch (error) {
        await db.rollback();
        throw error;
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
        req.user?.id || 1
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
      // Get work order summary by status
      const [workOrderStats] = await db.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM work_orders 
        GROUP BY status
      `);

      // Get recent work orders
      const [recentWorkOrders] = await db.execute(`
        SELECT 
          wo.*,
          u.full_name as assigned_user_name
        FROM work_orders wo
        LEFT JOIN users u ON wo.assigned_to = u.id
        ORDER BY wo.created_at DESC
        LIMIT 5
      `);

      // Get production items count
      const [itemStats] = await db.execute(`
        SELECT COUNT(*) as total_items FROM production_items WHERE status = 'active'
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
          production_items_count: itemStats[0].total_items,
          bom_count: bomStats[0].total_boms
        }
      });
    } catch (error) {
      logger.error('Error fetching production dashboard:', error);
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

  // Get production operations
  async getProductionOperations(req, res) {
    try {
      const [operations] = await db.execute(`
        SELECT * FROM production_operations 
        WHERE status = 'active'
        ORDER BY operation_name
      `);

      res.json({
        success: true,
        data: operations
      });
    } catch (error) {
      logger.error('Error fetching production operations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production operations',
        error: error.message
      });
    }
  }

  // Get production categories
  async getProductionCategories(req, res) {
    try {
      const [categories] = await db.execute(`
        SELECT 
          pc.*,
          COUNT(pi.id) as item_count
        FROM production_categories pc
        LEFT JOIN production_items pi ON pc.id = pi.category_id AND pi.status = 'active'
        WHERE pc.status = 'active'
        GROUP BY pc.id
        ORDER BY pc.category_name
      `);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching production categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch production categories',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionController();