const db = require('../config/database');
const logger = require('../utils/logger');

class EnhancedInventoryController {

  // ====================
  // Categories Management
  // ====================

  // Get all main categories with subcategories
  async getMainCategories(req, res) {
    try {
      const [categories] = await db.execute(`
        SELECT 
          imc.*,
          COUNT(DISTINCT isc.id) as subcategory_count,
          COUNT(DISTINCT iie.id) as item_count
        FROM inventory_main_categories imc
        LEFT JOIN inventory_sub_categories isc ON imc.id = isc.main_category_id AND isc.is_active = 1
        LEFT JOIN inventory_items_enhanced iie ON imc.id = iie.main_category_id AND iie.item_status = 'active'
        WHERE imc.is_active = 1
        GROUP BY imc.id
        ORDER BY imc.category_name
      `);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching main categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

  // Get subcategories for a main category
  async getSubCategories(req, res) {
    try {
      const { mainCategoryId } = req.params;

      const [subcategories] = await db.execute(`
        SELECT 
          isc.*,
          imc.category_name as main_category_name,
          COUNT(iie.id) as item_count
        FROM inventory_sub_categories isc
        LEFT JOIN inventory_main_categories imc ON isc.main_category_id = imc.id
        LEFT JOIN inventory_items_enhanced iie ON isc.id = iie.sub_category_id AND iie.item_status = 'active'
        WHERE isc.main_category_id = ? AND isc.is_active = 1
        GROUP BY isc.id
        ORDER BY isc.subcategory_name
      `, [mainCategoryId]);

      res.json({
        success: true,
        data: subcategories
      });
    } catch (error) {
      logger.error('Error fetching subcategories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subcategories',
        error: error.message
      });
    }
  }

  // ====================
  // Enhanced Items Management
  // ====================

  // Get all enhanced inventory items with filters
  async getEnhancedItems(req, res) {
    try {
      const {
        category,
        subcategory,
        brand,
        status = 'active',
        requiresSerial,
        lowStock,
        page = 1,
        limit = 50,
        search
      } = req.query;

      // Build status condition
      let statusCondition = "iie.item_status = 'active'"; // default to active
      if (status === 'inactive') {
        statusCondition = "iie.item_status = 'inactive'";
      } else if (status === 'all') {
        statusCondition = "1=1"; // show all statuses
      }

      // Build simple query with filters
      let conditions = [statusCondition];
      let queryParams = [];

      if (category) {
        conditions.push('iie.main_category_id = ?');
        queryParams.push(parseInt(category));
      }

      if (subcategory) {
        conditions.push('iie.sub_category_id = ?');
        queryParams.push(parseInt(subcategory));
      }

      if (brand) {
        conditions.push('iie.brand = ?');
        queryParams.push(brand);
      }

      if (requiresSerial) {
        conditions.push('iie.requires_serial_tracking = ?');
        queryParams.push(requiresSerial === 'true' ? 1 : 0);
      }

      if (lowStock === 'true') {
        conditions.push('iie.current_stock <= iie.minimum_stock');
      }

      if (search) {
        conditions.push('(iie.item_code LIKE ? OR iie.item_name LIKE ? OR iie.model_number LIKE ? OR iie.part_number LIKE ?)');
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = 'WHERE ' + conditions.join(' AND ');
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [items] = await db.execute(`
        SELECT 
          iie.*,
          imc.category_name as main_category_name,
          isc.subcategory_name as sub_category_name,
          CASE 
            WHEN iie.current_stock <= iie.minimum_stock THEN 'low'
            WHEN iie.current_stock <= (iie.minimum_stock * 1.5) THEN 'warning'
            ELSE 'normal'
          END as stock_status,
          0 as available_serials
        FROM inventory_items_enhanced iie
        LEFT JOIN inventory_main_categories imc ON iie.main_category_id = imc.id
        LEFT JOIN inventory_sub_categories isc ON iie.sub_category_id = isc.id
        ${whereClause}
        ORDER BY iie.item_name
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `, queryParams);

      // Get total count
      const [countResult] = await db.execute(`
        SELECT COUNT(*) as total
        FROM inventory_items_enhanced iie
        ${whereClause}
      `, queryParams);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching enhanced inventory items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory items',
        error: error.message
      });
    }
  }

  // Create new enhanced inventory item
  async createEnhancedItem(req, res) {
    try {
      const {
        item_code,
        item_name,
        description,
        main_category_id,
        sub_category_id,
        brand,
        model_number,
        part_number,
        manufacturer,
        specifications,
        requires_serial_tracking = false,
        requires_batch_tracking = false,
        shelf_life_days,
        minimum_stock = 0,
        maximum_stock,
        reorder_point = 0,
        reorder_quantity = 0,
        standard_cost = 0,
        selling_price = 0,
        gst_rate = 18.00,
        vendor_discount = 0,
        primary_unit = 'NOS',
        secondary_unit,
        conversion_factor = 1,
        location_code,
        bin_location
      } = req.body;

      // Validate required fields
      if (!item_code || !item_name || !main_category_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: item_code, item_name, and main_category_id are required'
        });
      }

      // Check if item_code already exists
      const [existingItem] = await db.execute(
        'SELECT id FROM inventory_items_enhanced WHERE item_code = ?',
        [item_code]
      );

      if (existingItem.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Item with code '${item_code}' already exists`
        });
      }

      // Validate that main_category exists
      const [categoryExists] = await db.execute(
        'SELECT id FROM inventory_main_categories WHERE id = ? AND is_active = 1',
        [main_category_id]
      );

      if (categoryExists.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid main_category_id: Category does not exist or is inactive'
        });
      }

      const [result] = await db.execute(`
        INSERT INTO inventory_items_enhanced (
          item_code, item_name, description, main_category_id, sub_category_id,
          brand, model_number, part_number, manufacturer, specifications,
          requires_serial_tracking, requires_batch_tracking, shelf_life_days,
          minimum_stock, maximum_stock, reorder_point, reorder_quantity,
          standard_cost, selling_price, gst_rate, vendor_discount, primary_unit, secondary_unit, conversion_factor,
          location_code, bin_location, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item_code, item_name, description || null, main_category_id, sub_category_id || null,
        brand || null, model_number || null, part_number || null, manufacturer || null,
        specifications ? JSON.stringify(specifications) : null,
        requires_serial_tracking ? 1 : 0, requires_batch_tracking ? 1 : 0, shelf_life_days || null,
        minimum_stock || 0, maximum_stock || null, reorder_point || 0, reorder_quantity || 0,
        standard_cost || 0, selling_price || 0, gst_rate || 18.00, vendor_discount || 0, primary_unit || 'NOS', secondary_unit || null, conversion_factor || 1,
        location_code || null, bin_location || null, req.user?.id || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Inventory item created successfully',
        data: { id: result.insertId }
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

  // ====================
  // Serial Number Management
  // ====================

  // Get serial numbers for an item
  async getSerialNumbers(req, res) {
    try {
      const { itemId } = req.params;
      const { status } = req.query;

      let whereCondition = 'item_id = ?';
      let queryParams = [itemId];

      if (status) {
        whereCondition += ' AND status = ?';
        queryParams.push(status);
      }

      const [serials] = await db.execute(`
        SELECT 
          isn.*,
          iie.item_name,
          iie.brand,
          iie.model_number,
          DATEDIFF(warranty_end_date, CURDATE()) as warranty_days_remaining,
          DATEDIFF(next_service_date, CURDATE()) as service_days_remaining
        FROM inventory_serial_numbers isn
        LEFT JOIN inventory_items_enhanced iie ON isn.item_id = iie.id
        WHERE ${whereCondition}
        ORDER BY isn.serial_number
      `, queryParams);

      res.json({
        success: true,
        data: serials
      });
    } catch (error) {
      logger.error('Error fetching serial numbers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch serial numbers',
        error: error.message
      });
    }
  }

  // Add serial number for an item
  async addSerialNumber(req, res) {
    try {
      const { itemId } = req.params;
      const {
        serial_number,
        batch_number,
        manufacturing_date,
        expiry_date,
        purchase_date,
        purchase_cost,
        vendor_id,
        grn_id,
        warranty_start_date,
        warranty_end_date,
        notes
      } = req.body;

      const [result] = await db.execute(`
        INSERT INTO inventory_serial_numbers (
          item_id, serial_number, batch_number, manufacturing_date, expiry_date,
          purchase_date, purchase_cost, vendor_id, grn_id,
          warranty_start_date, warranty_end_date, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock')
      `, [
        itemId, serial_number, batch_number, manufacturing_date, expiry_date,
        purchase_date, purchase_cost, vendor_id, grn_id,
        warranty_start_date, warranty_end_date, notes
      ]);

      res.status(201).json({
        success: true,
        message: 'Serial number added successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error adding serial number:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add serial number',
        error: error.message
      });
    }
  }

  // ====================
  // Purchase History Management
  // ====================

  // Get purchase history for an item
  async getPurchaseHistory(req, res) {
    try {
      const { itemId } = req.params;

      const [history] = await db.execute(`
        SELECT 
          iph.*,
          iv.vendor_name,
          po.po_number,
          grn.grn_number
        FROM inventory_purchase_history iph
        LEFT JOIN inventory_vendors iv ON iph.vendor_id = iv.id
        LEFT JOIN purchase_orders po ON iph.purchase_order_id = po.id
        LEFT JOIN goods_received_notes grn ON iph.grn_id = grn.id
        WHERE iph.item_id = ?
        ORDER BY iph.purchase_date DESC
      `, [itemId]);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase history',
        error: error.message
      });
    }
  }

  // Add purchase history record
  async addPurchaseHistory(req, res) {
    try {
      const { itemId } = req.params;
      const {
        vendor_id,
        purchase_order_id,
        grn_id,
        purchase_date,
        quantity_purchased,
        unit_cost,
        discount_percentage = 0,
        discount_amount = 0,
        tax_percentage = 0,
        tax_amount = 0,
        total_cost,
        batch_number,
        expiry_date,
        delivery_date,
        quality_status = 'pending',
        notes
      } = req.body;

      const [result] = await db.execute(`
        INSERT INTO inventory_purchase_history (
          item_id, vendor_id, purchase_order_id, grn_id, purchase_date,
          quantity_purchased, unit_cost, discount_percentage, discount_amount,
          tax_percentage, tax_amount, total_cost, batch_number, expiry_date,
          delivery_date, quality_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        itemId, vendor_id, purchase_order_id, grn_id, purchase_date,
        quantity_purchased, unit_cost, discount_percentage, discount_amount,
        tax_percentage, tax_amount, total_cost, batch_number, expiry_date,
        delivery_date, quality_status, notes
      ]);

      // Update item's last purchase cost and average cost
      await db.execute(`
        UPDATE inventory_items_enhanced 
        SET 
          last_purchase_cost = ?,
          average_cost = (
            SELECT AVG(unit_cost) 
            FROM inventory_purchase_history 
            WHERE item_id = ? AND quality_status = 'accepted'
          )
        WHERE id = ?
      `, [unit_cost, itemId, itemId]);

      res.status(201).json({
        success: true,
        message: 'Purchase history record added successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      logger.error('Error adding purchase history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add purchase history',
        error: error.message
      });
    }
  }

  // ====================
  // Dashboard and Analytics
  // ====================

  // Get inventory dashboard data
  async getInventoryDashboard(req, res) {
    try {
      // Get summary statistics
      const [summary] = await db.execute(`
        SELECT 
          COUNT(*) as total_items,
          SUM(CASE WHEN current_stock <= minimum_stock THEN 1 ELSE 0 END) as low_stock_items,
          SUM(CASE WHEN requires_serial_tracking = 1 THEN 1 ELSE 0 END) as serialized_items,
          SUM(current_stock * standard_cost) as total_inventory_value,
          COUNT(CASE WHEN item_status = 'active' THEN 1 END) as active_items
        FROM inventory_items_enhanced
      `);

      // Get category-wise distribution
      const [categoryDistribution] = await db.execute(`
        SELECT 
          imc.category_name,
          COUNT(iie.id) as item_count,
          SUM(iie.current_stock * iie.standard_cost) as category_value
        FROM inventory_main_categories imc
        LEFT JOIN inventory_items_enhanced iie ON imc.id = iie.main_category_id AND iie.item_status = 'active'
        WHERE imc.is_active = 1
        GROUP BY imc.id, imc.category_name
        ORDER BY category_value DESC
      `);

      // Get top brands
      const [topBrands] = await db.execute(`
        SELECT 
          brand,
          COUNT(*) as item_count,
          SUM(current_stock * standard_cost) as brand_value
        FROM inventory_items_enhanced
        WHERE item_status = 'active' AND brand IS NOT NULL
        GROUP BY brand
        ORDER BY brand_value DESC
        LIMIT 10
      `);

      // Get items requiring attention
      const [attentionItems] = await db.execute(`
        SELECT 
          item_code,
          item_name,
          brand,
          current_stock,
          minimum_stock,
          'low_stock' as attention_type
        FROM inventory_items_enhanced
        WHERE current_stock <= minimum_stock AND item_status = 'active'
        
        UNION ALL
        
        SELECT 
          iie.item_code,
          iie.item_name,
          iie.brand,
          NULL as current_stock,
          NULL as minimum_stock,
          'warranty_expiring' as attention_type
        FROM inventory_items_enhanced iie
        JOIN inventory_serial_numbers isn ON iie.id = isn.item_id
        WHERE isn.warranty_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND isn.status = 'in_stock'
        
        ORDER BY attention_type, item_name
        LIMIT 20
      `);

      res.json({
        success: true,
        data: {
          summary: summary[0],
          categoryDistribution,
          topBrands,
          attentionItems
        }
      });
    } catch (error) {
      logger.error('Error fetching inventory dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard data',
        error: error.message
      });
    }
  }

  // ====================
  // Bulk Operations
  // ====================

  // Bulk update stock levels
  async bulkUpdateStock(req, res) {
    try {
      const { updates } = req.body; // Array of {item_id, new_stock, notes}

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates array is required'
        });
      }

      await db.execute('START TRANSACTION');

      for (const update of updates) {
        const { item_id, new_stock, notes } = update;

        // Update stock
        await db.execute(`
          UPDATE inventory_items_enhanced 
          SET current_stock = ?
          WHERE id = ?
        `, [new_stock, item_id]);

        // Log transaction
        await db.execute(`
          INSERT INTO inventory_transactions_enhanced (
            item_id, transaction_type, reference_type, quantity,
            transaction_date, created_by, notes
          ) VALUES (?, 'adjustment', 'adjustment', ?, NOW(), ?, ?)
        `, [item_id, new_stock, req.user?.id || 1, notes || 'Bulk stock adjustment']);
      }

      await db.execute('COMMIT');

      res.json({
        success: true,
        message: `Successfully updated ${updates.length} items`
      });
    } catch (error) {
      await db.execute('ROLLBACK');
      logger.error('Error in bulk stock update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock levels',
        error: error.message
      });
    }
  }
  // ====================
  // Category CRUD Operations
  // ====================

  // Create new category
  async createCategory(req, res) {
    try {
      const { category_name, description, requires_serial_tracking } = req.body;

      if (!category_name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Generate a unique category_code from category_name
      const category_code = category_name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20);

      const [result] = await db.execute(`
        INSERT INTO inventory_main_categories (category_code, category_name, description, requires_serial_tracking, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [category_code, category_name, description || null, requires_serial_tracking || false]);

      res.json({
        success: true,
        message: 'Category created successfully',
        data: { id: result.insertId, category_code, category_name, description, requires_serial_tracking }
      });
    } catch (error) {
      logger.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create category',
        error: error.message
      });
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { category_name, description, requires_serial_tracking } = req.body;

      if (!category_name) {
        return res.status(400).json({
          success: false,
          message: 'Category name is required'
        });
      }

      // Generate a unique category_code from category_name
      const category_code = category_name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20);

      const [result] = await db.execute(`
        UPDATE inventory_main_categories 
        SET category_code = ?, category_name = ?, description = ?, requires_serial_tracking = ?
        WHERE id = ? AND is_active = 1
      `, [category_code, category_name, description || null, requires_serial_tracking || false, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category updated successfully'
      });
    } catch (error) {
      logger.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update category',
        error: error.message
      });
    }
  }

  // Delete category
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Check if category has items
      const [itemsCheck] = await db.execute(`
        SELECT COUNT(*) as item_count 
        FROM inventory_items_enhanced 
        WHERE main_category_id = ? AND item_status = 'active'
      `, [id]);

      if (itemsCheck[0].item_count > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete category with active items'
        });
      }

      const [result] = await db.execute(`
        UPDATE inventory_main_categories 
        SET is_active = 0 
        WHERE id = ?
      `, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete category',
        error: error.message
      });
    }
  }

  // ====================
  // Item Update Operations
  // ====================

  // Update inventory item
  async updateEnhancedItem(req, res) {
    try {
      const { id } = req.params;
      const itemData = req.body;

      // Validate required fields
      if (!itemData.item_code || !itemData.item_name) {
        return res.status(400).json({
          success: false,
          message: 'Item code and name are required'
        });
      }

      // Check if item exists
      const [existingItem] = await db.execute(`
        SELECT id FROM inventory_items_enhanced WHERE id = ?
      `, [id]);

      if (existingItem.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      // Update the item
      const [result] = await db.execute(`
        UPDATE inventory_items_enhanced 
        SET 
          item_code = ?,
          item_name = ?,
          description = ?,
          main_category_id = ?,
          sub_category_id = ?,
          brand = ?,
          model_number = ?,
          part_number = ?,
          manufacturer = ?,
          primary_unit = ?,
          standard_cost = ?,
          selling_price = ?,
          gst_rate = ?,
          vendor_discount = ?,
          minimum_stock = ?,
          reorder_point = ?,
          current_stock = ?,
          requires_serial_tracking = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        itemData.item_code,
        itemData.item_name,
        itemData.description || null,
        itemData.main_category_id || null,
        itemData.sub_category_id || null,
        itemData.brand || null,
        itemData.model_number || null,
        itemData.part_number || null,
        itemData.manufacturer || null,
        itemData.primary_unit || 'NOS',
        itemData.standard_cost || 0,
        itemData.selling_price || 0,
        itemData.gst_rate || 18.00,
        itemData.vendor_discount || 0,
        itemData.minimum_stock || 0,
        itemData.reorder_point || 0,
        itemData.current_stock || 0,
        itemData.requires_serial_tracking || false,
        id
      ]);

      res.json({
        success: true,
        message: 'Item updated successfully',
        data: { id, ...itemData }
      });
    } catch (error) {
      logger.error('Error updating item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item',
        error: error.message
      });
    }
  }

  // Delete inventory item
  async deleteEnhancedItem(req, res) {
    try {
      const { id } = req.params;
      logger.info(`DELETE REQUEST for item ID: ${id}`);

      // Validate ID parameter
      if (!id || isNaN(id)) {
        logger.error(`Invalid item ID: ${id}`);
        return res.status(400).json({
          success: false,
          message: 'Invalid item ID'
        });
      }

      // First check if item exists and its current status
      const [items] = await db.execute(`
        SELECT id, item_name, item_status FROM inventory_items_enhanced WHERE id = ?
      `, [id]);

      if (items.length === 0) {
        logger.error(`Item not found with ID: ${id}`);
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }

      const item = items[0];
      logger.info(`Item found: ID=${item.id}, Name=${item.item_name}, Status=${item.item_status}`);

      // If item is already inactive, permanently delete it
      if (item.item_status === 'inactive') {
        logger.info(`Item ${id} is inactive, attempting permanent deletion`);
        // Check for related records that might prevent deletion
        const [serialNumbers] = await db.execute(`
          SELECT COUNT(*) as count FROM inventory_serial_numbers WHERE item_id = ?
        `, [id]);

        const [transactions] = await db.execute(`
          SELECT COUNT(*) as count FROM inventory_transactions_enhanced WHERE item_id = ?
        `, [id]);

        if (serialNumbers[0].count > 0 || transactions[0].count > 0) {
          logger.warn(`Cannot delete item ${id}: has ${serialNumbers[0].count} serial numbers and ${transactions[0].count} transactions`);
          return res.status(400).json({
            success: false,
            message: 'Cannot permanently delete item with existing serial numbers or transaction history. Please archive instead.'
          });
        }

        // Perform permanent deletion
        logger.info(`Performing permanent deletion for item ${id}`);
        const [deleteResult] = await db.execute(`
          DELETE FROM inventory_items_enhanced WHERE id = ?
        `, [id]);

        logger.info(`Item ${id} permanently deleted, affected rows: ${deleteResult.affectedRows}`);
        res.json({
          success: true,
          message: 'Item permanently deleted successfully'
        });
      } else {
        // Item is active, perform soft delete (set to inactive)
        logger.info(`Item ${id} is active, performing soft delete`);
        const [updateResult] = await db.execute(`
          UPDATE inventory_items_enhanced 
          SET item_status = 'inactive', updated_at = NOW()
          WHERE id = ?
        `, [id]);

        logger.info(`Item ${id} deactivated, affected rows: ${updateResult.affectedRows}`);
        res.json({
          success: true,
          message: 'Item deactivated successfully'
        });
      }
    } catch (error) {
      logger.error('Error deleting item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete item',
        error: error.message
      });
    }
  }

}

module.exports = new EnhancedInventoryController();