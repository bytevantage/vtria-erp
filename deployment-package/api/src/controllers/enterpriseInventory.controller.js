const db = require('../config/database');
const logger = require('../utils/logger');

class EnterpriseInventoryController {
  // ====================
  // Dashboard & Analytics
  // ====================

  // Get comprehensive dashboard data
  async getDashboard(req, res) {
    try {
      const [dashboardData] = await db.execute(`
        SELECT 
          COUNT(DISTINCT ii.id) as total_items,
          COALESCE(SUM(ii.current_stock * COALESCE(ii.average_cost, 0)), 0) as total_value,
          COUNT(CASE WHEN ii.current_stock <= COALESCE(ii.minimum_stock, 0) THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN ii.current_stock > COALESCE(ii.maximum_stock, 999999) THEN 1 END) as overstock_items,
          COUNT(CASE WHEN ii.current_stock = 0 THEN 1 END) as out_of_stock_items,
          AVG(CASE WHEN ii.average_cost > 0 THEN ii.current_stock * ii.average_cost / ii.average_cost END) as avg_turnover
        FROM inventory_items ii
        WHERE ii.is_active = TRUE
      `);

      const [abcAnalysis] = await db.execute(`
        SELECT 
          CASE 
            WHEN (current_stock * COALESCE(average_cost, 0)) >= 10000 THEN 'A'
            WHEN (current_stock * COALESCE(average_cost, 0)) >= 5000 THEN 'B'
            ELSE 'C'
          END as abc_classification,
          COUNT(*) as count
        FROM inventory_items 
        WHERE is_active = TRUE
        GROUP BY abc_classification
      `);

      const [topMovingItems] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name, 
          COALESCE(ii.current_stock * ii.average_cost, 0) as inventory_value,
          ic.category_name
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        WHERE ii.is_active = TRUE 
        ORDER BY inventory_value DESC 
        LIMIT 10
      `);

      const [slowMovingItems] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name, ii.updated_at as last_transaction_date,
          DATEDIFF(NOW(), ii.updated_at) as days_since_last_move
        FROM inventory_items ii
        WHERE ii.is_active = TRUE 
        AND ii.updated_at IS NOT NULL
        ORDER BY ii.updated_at ASC 
        LIMIT 10
      `);

      const [recentTransactions] = await db.execute(`
        SELECT 
          it.id, it.transaction_type, it.quantity, it.created_at,
          ii.item_name, u.full_name as created_by_name
        FROM inventory_transactions it
        JOIN inventory_items ii ON it.item_id = ii.id
        LEFT JOIN users u ON it.created_by = u.id
        ORDER BY it.created_at DESC 
        LIMIT 20
      `);

      // Format ABC analysis
      const abcData = { a: 0, b: 0, c: 0 };
      abcAnalysis.forEach(item => {
        abcData[item.abc_classification.toLowerCase()] = item.count;
      });

      res.json({
        success: true,
        data: {
          summary: dashboardData[0],
          abcAnalysis: abcData,
          topMovingItems,
          slowMovingItems,
          recentTransactions
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

  // Get advanced analytics
  async getAnalytics(req, res) {
    try {
      const { startDate, endDate, locationId } = req.query;
      
      let locationFilter = '';
      let dateFilter = '';
      const params = [];
      
      if (locationId) {
        locationFilter = 'AND iws.location_id = ?';
        params.push(locationId);
      }
      
      if (startDate && endDate) {
        dateFilter = 'AND it.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      // Inventory velocity analysis
      const [velocityAnalysis] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name,
          COALESCE(SUM(ABS(it.quantity)), 0) as total_movement,
          ii.current_stock as avg_stock,
          CASE 
            WHEN ii.current_stock > 0 
            THEN COALESCE(SUM(ABS(it.quantity)), 0) / ii.current_stock
            ELSE 0 
          END as velocity_ratio
        FROM inventory_items ii
        LEFT JOIN inventory_transactions it ON ii.id = it.item_id ${dateFilter}
        WHERE ii.is_active = TRUE
        GROUP BY ii.id, ii.item_code, ii.item_name, ii.current_stock
        ORDER BY velocity_ratio DESC
      `, params);

      // Stock aging analysis - simplified version
      const [stockAging] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name,
          ii.current_stock,
          DATEDIFF(NOW(), ii.created_at) as age_days,
          CASE 
            WHEN DATEDIFF(NOW(), ii.created_at) > 365 THEN 'Very Slow'
            WHEN DATEDIFF(NOW(), ii.created_at) > 180 THEN 'Slow'
            WHEN DATEDIFF(NOW(), ii.created_at) > 90 THEN 'Medium'
            ELSE 'Fast'
          END as movement_category
        FROM inventory_items ii
        WHERE ii.is_active = TRUE AND ii.current_stock > 0
        ORDER BY age_days DESC
      `);

      // Carrying cost analysis - simplified version
      const [carryingCosts] = await db.execute(`
        SELECT 
          SUM(ii.current_stock * COALESCE(ii.average_cost, 0)) as total_inventory_value,
          SUM(ii.current_stock * COALESCE(ii.average_cost, 0) * 0.25) as estimated_carrying_cost,
          COUNT(DISTINCT ii.id) as total_items,
          AVG(COALESCE(ii.average_cost, 0)) as avg_unit_cost
        FROM inventory_items ii
        WHERE ii.is_active = TRUE
      `);

      // Stockout risk analysis - simplified version
      const [stockoutRisk] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name,
          ii.current_stock, COALESCE(ii.minimum_stock, 0) as reorder_level, COALESCE(ii.maximum_stock, 999999) as max_stock_level,
          CASE 
            WHEN ii.current_stock <= 0 THEN 'Critical'
            WHEN ii.current_stock <= COALESCE(ii.minimum_stock, 0) * 0.5 THEN 'High'
            WHEN ii.current_stock <= COALESCE(ii.minimum_stock, 0) THEN 'Medium'
            ELSE 'Low'
          END as risk_level,
          COALESCE(
            (SELECT AVG(ABS(it.quantity)) 
             FROM inventory_transactions it 
             WHERE it.item_id = ii.id 
             AND it.transaction_type IN ('sale', 'consumption', 'issue')
             AND it.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ), 0
          ) as avg_daily_consumption
        FROM inventory_items ii
        WHERE ii.is_active = TRUE
        HAVING risk_level IN ('Critical', 'High', 'Medium')
        ORDER BY 
          CASE risk_level 
            WHEN 'Critical' THEN 1 
            WHEN 'High' THEN 2 
            WHEN 'Medium' THEN 3 
          END
      `);

      res.json({
        success: true,
        data: {
          velocityAnalysis,
          stockAging,
          carryingCosts: carryingCosts[0],
          stockoutRisk
        }
      });
    } catch (error) {
      logger.error('Error fetching analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: error.message
      });
    }
  }

  // ====================
  // Inventory Items Management
  // ====================

  // Get inventory items with advanced filtering
  async getInventoryItems(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search, 
        category, 
        location, 
        status = 'all',
        abcClass,
        sortBy = 'item_name',
        sortOrder = 'ASC'
      } = req.query;

      const offset = (page - 1) * limit;
      const whereConditions = ['ii.status = ?'];
      const params = ['active'];

      if (search) {
        whereConditions.push('(ii.item_code LIKE ? OR ii.item_name LIKE ? OR ii.description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (category) {
        whereConditions.push('ii.category_id = ?');
        params.push(category);
      }

      if (location) {
        whereConditions.push('iws.location_id = ?');
        params.push(location);
      }

      if (abcClass) {
        whereConditions.push('ii.abc_classification = ?');
        params.push(abcClass);
      }

      // Status-based filtering
      if (status === 'low_stock') {
        whereConditions.push('iws.current_stock <= ii.reorder_level');
      } else if (status === 'overstock') {
        whereConditions.push('iws.current_stock > ii.max_stock_level');
      } else if (status === 'out_of_stock') {
        whereConditions.push('iws.current_stock = 0');
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [items] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name, ii.description,
          ii.category_id, ic.category_name, ii.unit_of_measurement,
          ii.unit_cost, ii.reorder_level, ii.max_stock_level,
          ii.abc_classification, ii.status, ii.created_at, ii.updated_at,
          COALESCE(SUM(iws.current_stock), 0) as current_stock,
          COALESCE(SUM(iws.current_stock * ii.unit_cost), 0) as total_value,
          COUNT(DISTINCT iws.location_id) as location_count,
          ii.last_transaction_date,
          COALESCE(ii.turnover_ratio, 0) as turnover_ratio
        FROM inventory_items ii
        LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
        LEFT JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        ${whereClause}
        GROUP BY ii.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `, [...params, parseInt(limit), parseInt(offset)]);

      // Get total count
      const [totalCount] = await db.execute(`
        SELECT COUNT(DISTINCT ii.id) as total
        FROM inventory_items ii
        LEFT JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        ${whereClause}
      `, params);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching inventory items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory items',
        error: error.message
      });
    }
  }

  // Create inventory item
  async createInventoryItem(req, res) {
    try {
      const {
        item_code,
        item_name,
        description,
        category_id,
        unit_of_measurement,
        unit_cost,
        reorder_level,
        max_stock_level,
        abc_classification = 'C',
        initial_stock = 0,
        location_id
      } = req.body;

      // Validate required fields
      if (!item_code || !item_name || !category_id || !unit_of_measurement) {
        return res.status(400).json({
          success: false,
          message: 'Item code, name, category, and unit of measurement are required'
        });
      }

      // Check if item code already exists
      const [existing] = await db.execute(
        'SELECT id FROM inventory_items WHERE item_code = ?',
        [item_code]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Item code already exists'
        });
      }

      // Create inventory item
      const [result] = await db.execute(`
        INSERT INTO inventory_items 
        (item_code, item_name, description, category_id, unit_of_measurement,
         unit_cost, reorder_level, max_stock_level, abc_classification, status,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `, [
        item_code,
        item_name,
        description || null,
        category_id,
        unit_of_measurement,
        unit_cost || 0,
        reorder_level || 0,
        max_stock_level || 0,
        abc_classification
      ]);

      const itemId = result.insertId;

      // If initial stock is provided, create stock entry and transaction
      if (initial_stock > 0 && location_id) {
        // Create stock entry
        await db.execute(`
          INSERT INTO inventory_warehouse_stock 
          (item_id, location_id, current_stock, allocated_stock, available_stock,
           created_at, updated_at)
          VALUES (?, ?, ?, 0, ?, NOW(), NOW())
        `, [itemId, location_id, initial_stock, initial_stock]);

        // Create transaction
        await db.execute(`
          INSERT INTO inventory_transactions 
          (item_id, location_id, transaction_type, quantity, unit_cost,
           reference_type, reference_number, created_by, created_at)
          VALUES (?, ?, 'initial_stock', ?, ?, 'system', 'INIT', ?, NOW())
        `, [itemId, location_id, initial_stock, unit_cost || 0, req.user?.id || 1]);
      }

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: { id: itemId, item_code, item_name }
      });
    } catch (error) {
      logger.error('Error creating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create inventory item',
        error: error.message
      });
    }
  }

  // Update inventory item
  async updateInventoryItem(req, res) {
    try {
      const { id } = req.params;
      const {
        item_code,
        item_name,
        description,
        category_id,
        unit_of_measurement,
        unit_cost,
        reorder_level,
        max_stock_level,
        abc_classification,
        status
      } = req.body;

      // Check if item exists
      const [existing] = await db.execute(
        'SELECT id FROM inventory_items WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found'
        });
      }

      // Check if item code already exists (excluding current item)
      if (item_code) {
        const [codeExists] = await db.execute(
          'SELECT id FROM inventory_items WHERE item_code = ? AND id != ?',
          [item_code, id]
        );

        if (codeExists.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Item code already exists'
          });
        }
      }

      await db.execute(`
        UPDATE inventory_items 
        SET item_code = ?, item_name = ?, description = ?, category_id = ?,
            unit_of_measurement = ?, unit_cost = ?, reorder_level = ?,
            max_stock_level = ?, abc_classification = ?, status = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [
        item_code,
        item_name,
        description || null,
        category_id,
        unit_of_measurement,
        unit_cost || null,
        reorder_level || null,
        max_stock_level || null,
        abc_classification || null,
        status || 'active',
        id
      ]);

      res.json({
        success: true,
        message: 'Inventory item updated successfully'
      });
    } catch (error) {
      logger.error('Error updating inventory item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update inventory item',
        error: error.message
      });
    }
  }

  // ====================
  // Stock Operations
  // ====================

  // Stock adjustment
  async adjustStock(req, res) {
    try {
      const {
        item_id,
        location_id,
        adjustment_type, // 'increase' or 'decrease'
        quantity,
        reason,
        unit_cost,
        notes
      } = req.body;

      if (!item_id || !location_id || !adjustment_type || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Item ID, location ID, adjustment type, and quantity are required'
        });
      }

      const adjustmentQuantity = adjustment_type === 'increase' ? quantity : -quantity;
      const transactionType = adjustment_type === 'increase' ? 'adjustment_in' : 'adjustment_out';

      // Get current stock
      const [currentStock] = await db.execute(
        'SELECT current_stock FROM inventory_warehouse_stock WHERE item_id = ? AND location_id = ?',
        [item_id, location_id]
      );

      if (currentStock.length === 0) {
        // Create new stock entry
        await db.execute(`
          INSERT INTO inventory_warehouse_stock 
          (item_id, location_id, current_stock, allocated_stock, available_stock,
           created_at, updated_at)
          VALUES (?, ?, ?, 0, ?, NOW(), NOW())
        `, [item_id, location_id, Math.max(0, adjustmentQuantity), Math.max(0, adjustmentQuantity)]);
      } else {
        // Update existing stock
        const newStock = Math.max(0, currentStock[0].current_stock + adjustmentQuantity);
        await db.execute(`
          UPDATE inventory_warehouse_stock 
          SET current_stock = ?, available_stock = current_stock - allocated_stock,
              updated_at = NOW()
          WHERE item_id = ? AND location_id = ?
        `, [newStock, item_id, location_id]);
      }

      // Create transaction record
      await db.execute(`
        INSERT INTO inventory_transactions 
        (item_id, location_id, transaction_type, quantity, unit_cost,
         reference_type, reference_number, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'adjustment', ?, ?, ?, NOW())
      `, [
        item_id, 
        location_id, 
        transactionType, 
        adjustmentQuantity, 
        unit_cost || null,
        reason || 'Stock Adjustment',
        notes || null,
        req.user?.id || 1
      ]);

      // Update item's last transaction date
      await db.execute(
        'UPDATE inventory_items SET last_transaction_date = NOW() WHERE id = ?',
        [item_id]
      );

      res.json({
        success: true,
        message: 'Stock adjustment completed successfully'
      });
    } catch (error) {
      logger.error('Error adjusting stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust stock',
        error: error.message
      });
    }
  }

  // Stock transfer
  async transferStock(req, res) {
    try {
      const {
        item_id,
        from_location_id,
        to_location_id,
        quantity,
        notes,
        transfer_reason
      } = req.body;

      if (!item_id || !from_location_id || !to_location_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'All transfer details are required'
        });
      }

      if (from_location_id === to_location_id) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination locations cannot be the same'
        });
      }

      // Check if sufficient stock is available
      const [fromStock] = await db.execute(
        'SELECT current_stock, available_stock FROM inventory_warehouse_stock WHERE item_id = ? AND location_id = ?',
        [item_id, from_location_id]
      );

      if (fromStock.length === 0 || fromStock[0].available_stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available for transfer'
        });
      }

      // Start transaction
      await db.execute('START TRANSACTION');

      try {
        // Reduce stock from source location
        await db.execute(`
          UPDATE inventory_warehouse_stock 
          SET current_stock = current_stock - ?,
              available_stock = current_stock - allocated_stock,
              updated_at = NOW()
          WHERE item_id = ? AND location_id = ?
        `, [quantity, item_id, from_location_id]);

        // Increase stock in destination location
        const [toStock] = await db.execute(
          'SELECT current_stock FROM inventory_warehouse_stock WHERE item_id = ? AND location_id = ?',
          [item_id, to_location_id]
        );

        if (toStock.length === 0) {
          // Create new stock entry
          await db.execute(`
            INSERT INTO inventory_warehouse_stock 
            (item_id, location_id, current_stock, allocated_stock, available_stock,
             created_at, updated_at)
            VALUES (?, ?, ?, 0, ?, NOW(), NOW())
          `, [item_id, to_location_id, quantity, quantity]);
        } else {
          // Update existing stock
          await db.execute(`
            UPDATE inventory_warehouse_stock 
            SET current_stock = current_stock + ?,
                available_stock = current_stock - allocated_stock,
                updated_at = NOW()
            WHERE item_id = ? AND location_id = ?
          `, [quantity, item_id, to_location_id]);
        }

        // Create transfer out transaction
        await db.execute(`
          INSERT INTO inventory_transactions 
          (item_id, location_id, transaction_type, quantity, reference_type,
           reference_number, notes, created_by, created_at)
          VALUES (?, ?, 'transfer_out', ?, 'transfer', ?, ?, ?, NOW())
        `, [item_id, from_location_id, -quantity, `TRANSFER-${Date.now()}`, notes || null, req.user?.id || 1]);

        // Create transfer in transaction
        await db.execute(`
          INSERT INTO inventory_transactions 
          (item_id, location_id, transaction_type, quantity, reference_type,
           reference_number, notes, created_by, created_at)
          VALUES (?, ?, 'transfer_in', ?, 'transfer', ?, ?, ?, NOW())
        `, [item_id, to_location_id, quantity, `TRANSFER-${Date.now()}`, notes || null, req.user?.id || 1]);

        // Update item's last transaction date
        await db.execute(
          'UPDATE inventory_items SET last_transaction_date = NOW() WHERE id = ?',
          [item_id]
        );

        await db.execute('COMMIT');

        res.json({
          success: true,
          message: 'Stock transfer completed successfully'
        });
      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error transferring stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer stock',
        error: error.message
      });
    }
  }

  // ====================
  // Automation & Alerts
  // ====================

  // Get reorder recommendations
  async getReorderRecommendations(req, res) {
    try {
      const [recommendations] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name,
          iws.current_stock, ii.reorder_level, ii.max_stock_level,
          COALESCE(
            (SELECT AVG(ABS(it.quantity)) 
             FROM inventory_transactions it 
             WHERE it.item_id = ii.id 
             AND it.transaction_type IN ('sale', 'consumption')
             AND it.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            ), 0
          ) as avg_consumption,
          CASE 
            WHEN iws.current_stock <= 0 THEN 'URGENT'
            WHEN iws.current_stock <= ii.reorder_level * 0.5 THEN 'HIGH'
            WHEN iws.current_stock <= ii.reorder_level THEN 'MEDIUM'
            ELSE 'LOW'
          END as priority,
          (ii.max_stock_level - iws.current_stock) as recommended_order_qty,
          GROUP_CONCAT(DISTINCT iv.vendor_name) as preferred_vendors
        FROM inventory_items ii
        LEFT JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        LEFT JOIN inventory_item_vendors iiv ON ii.id = iiv.item_id
        LEFT JOIN inventory_vendors iv ON iiv.vendor_id = iv.id
        WHERE ii.is_active = TRUE 
        AND iws.current_stock <= ii.reorder_level
        GROUP BY ii.id
        ORDER BY 
          CASE priority 
            WHEN 'URGENT' THEN 1 
            WHEN 'HIGH' THEN 2 
            WHEN 'MEDIUM' THEN 3 
            ELSE 4 
          END
      `);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('Error fetching reorder recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reorder recommendations',
        error: error.message
      });
    }
  }

  // Get stock alerts
  async getStockAlerts(req, res) {
    try {
      const [alerts] = await db.execute(`
        SELECT 
          'LOW_STOCK' as alert_type,
          ii.id as item_id, ii.item_code, ii.item_name,
          iws.current_stock, ii.reorder_level,
          'Item stock is below reorder level' as message,
          'warning' as severity,
          NOW() as created_at
        FROM inventory_items ii
        JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        WHERE ii.is_active = TRUE 
        AND iws.current_stock <= ii.reorder_level
        
        UNION ALL
        
        SELECT 
          'OUT_OF_STOCK' as alert_type,
          ii.id as item_id, ii.item_code, ii.item_name,
          iws.current_stock, ii.reorder_level,
          'Item is out of stock' as message,
          'error' as severity,
          NOW() as created_at
        FROM inventory_items ii
        JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        WHERE ii.is_active = TRUE 
        AND iws.current_stock <= 0
        
        UNION ALL
        
        SELECT 
          'OVERSTOCK' as alert_type,
          ii.id as item_id, ii.item_code, ii.item_name,
          iws.current_stock, ii.max_stock_level,
          'Item stock exceeds maximum level' as message,
          'info' as severity,
          NOW() as created_at
        FROM inventory_items ii
        JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        WHERE ii.is_active = TRUE 
        AND iws.current_stock > ii.max_stock_level
        
        ORDER BY 
          CASE severity 
            WHEN 'error' THEN 1 
            WHEN 'warning' THEN 2 
            ELSE 3 
          END
      `);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error fetching stock alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock alerts',
        error: error.message
      });
    }
  }

  // ====================
  // Barcode & Mobile Operations
  // ====================

  // Generate barcode for item
  async generateBarcode(req, res) {
    try {
      const { item_id } = req.params;
      
      const [item] = await db.execute(
        'SELECT item_code, item_name FROM inventory_items WHERE id = ?',
        [item_id]
      );

      if (item.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      // Generate barcode data (you can integrate with barcode libraries)
      const barcodeData = {
        itemId: item_id,
        itemCode: item[0].item_code,
        itemName: item[0].item_name,
        barcode: `${item[0].item_code}-${Date.now()}`,
        format: 'CODE128'
      };

      res.json({
        success: true,
        data: barcodeData
      });
    } catch (error) {
      logger.error('Error generating barcode:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate barcode',
        error: error.message
      });
    }
  }

  // Scan barcode and get item info
  async scanBarcode(req, res) {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({
          success: false,
          message: 'Barcode is required'
        });
      }

      // Extract item code from barcode (assuming format: ITEMCODE-TIMESTAMP)
      const itemCode = barcode.split('-')[0];

      const [item] = await db.execute(`
        SELECT 
          ii.id, ii.item_code, ii.item_name, ii.description,
          ii.unit_of_measurement, ii.unit_cost,
          SUM(iws.current_stock) as total_stock,
          COUNT(DISTINCT iws.location_id) as location_count
        FROM inventory_items ii
        LEFT JOIN inventory_warehouse_stock iws ON ii.id = iws.item_id
        WHERE ii.item_code = ? AND ii.status = 'active'
        GROUP BY ii.id
      `, [itemCode]);

      if (item.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found for this barcode'
        });
      }

      res.json({
        success: true,
        data: item[0]
      });
    } catch (error) {
      logger.error('Error scanning barcode:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to scan barcode',
        error: error.message
      });
    }
  }
}

module.exports = new EnterpriseInventoryController();