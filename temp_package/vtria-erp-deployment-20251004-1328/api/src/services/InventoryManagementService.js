const db = require('../config/database');

/**
 * Enhanced Inventory Management Service
 * Comprehensive inventory updates with batch tracking, serial numbers, and transaction history
 */
class InventoryManagementService {

  /**
   * Process inventory updates from GRN approval
   */
  static async processGRNInventoryUpdates(grnId, grnItems, connection) {
    try {
      const inventoryUpdates = {
        successful_updates: [],
        failed_updates: [],
        batch_records: [],
        serial_records: [],
        stock_movements: []
      };

      // Get GRN details
      const [grnDetails] = await connection.execute(`
                SELECT grn_number, grn_date, supplier_id, purchase_order_id 
                FROM goods_received_notes 
                WHERE id = ?
            `, [grnId]);

      if (grnDetails.length === 0) {
        throw new Error('GRN not found');
      }

      const grn = grnDetails[0];

      for (const item of grnItems) {
        try {
          if (item.accepted_quantity > 0) {
            await this.updateItemInventory(
              item,
              grn,
              connection,
              inventoryUpdates
            );
          }

          // Handle rejected items (create quality control record)
          if (item.rejected_quantity > 0) {
            await this.recordRejectedItems(
              item,
              grn,
              connection
            );
          }

        } catch (itemError) {
          console.error(`Error updating inventory for item ${item.product_id}:`, itemError);
          inventoryUpdates.failed_updates.push({
            product_id: item.product_id,
            error: itemError.message
          });
        }
      }

      // Update inventory valuation
      await this.updateInventoryValuation(grnId, connection);

      return inventoryUpdates;

    } catch (error) {
      console.error('Error processing GRN inventory updates:', error);
      throw error;
    }
  }

  /**
   * Update inventory for individual item
   */
  static async updateItemInventory(item, grn, connection, inventoryUpdates) {
    const {
      product_id,
      accepted_quantity,
      unit_price,
      location_id,
      serial_numbers,
      warranty_start_date,
      warranty_end_date
    } = item;

    // 1. Update main stock table
    await connection.execute(`
            INSERT INTO stock (product_id, location_id, quantity, last_updated) 
            VALUES (?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
                quantity = quantity + VALUES(quantity),
                last_updated = NOW()
        `, [product_id, location_id, accepted_quantity]);

    // 2. Update inventory warehouse stock (enhanced inventory system)
    await connection.execute(`
            INSERT INTO inventory_warehouse_stock (item_id, location_id, current_stock, last_updated) 
            VALUES (?, ?, ?, NOW()) 
            ON DUPLICATE KEY UPDATE 
                current_stock = current_stock + VALUES(current_stock),
                last_updated = NOW()
        `, [product_id, location_id, accepted_quantity]);

    // 3. Create batch record for traceability
    const batchNumber = await this.generateBatchNumber(product_id, grn.grn_date);

    const [batchResult] = await connection.execute(`
            INSERT INTO inventory_batches (
                product_id, batch_number, supplier_id, purchase_order_id, grn_id,
                received_quantity, current_quantity, unit_cost, location_id,
                received_date, expiry_date, warranty_start_date, warranty_end_date,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [
      product_id, batchNumber, grn.supplier_id, grn.purchase_order_id, grn.grn_id,
      accepted_quantity, accepted_quantity, unit_price, location_id,
      grn.grn_date, null, warranty_start_date, warranty_end_date
    ]);

    inventoryUpdates.batch_records.push({
      batch_id: batchResult.insertId,
      batch_number: batchNumber,
      product_id,
      quantity: accepted_quantity
    });

    // 4. Handle serial numbers if provided
    if (serial_numbers && serial_numbers.trim()) {
      const serialArray = serial_numbers.split(',').map(s => s.trim()).filter(s => s);

      for (const serialNumber of serialArray) {
        await connection.execute(`
                    INSERT INTO inventory_serial_numbers (
                        product_id, batch_id, serial_number, location_id,
                        grn_id, purchase_order_id, status, warranty_start_date, warranty_end_date
                    ) VALUES (?, ?, ?, ?, ?, ?, 'in_stock', ?, ?)
                `, [
          product_id, batchResult.insertId, serialNumber, location_id,
          grn.grn_id, grn.purchase_order_id, warranty_start_date, warranty_end_date
        ]);
      }

      inventoryUpdates.serial_records.push({
        product_id,
        batch_id: batchResult.insertId,
        serial_count: serialArray.length,
        serials: serialArray
      });
    }

    // 5. Record comprehensive stock movement
    await connection.execute(`
            INSERT INTO stock_movements (
                product_id, batch_id, from_location_id, to_location_id, quantity,
                movement_type, reference_type, reference_id, reference_number,
                unit_cost, total_value, movement_date, created_by, notes
            ) VALUES (?, ?, NULL, ?, ?, 'receipt', 'GRN', ?, ?, ?, ?, ?, 1, ?)
        `, [
      product_id, batchResult.insertId, location_id, accepted_quantity,
      grn.grn_id, grn.grn_number, unit_price,
      (accepted_quantity * unit_price), grn.grn_date,
      `GRN Receipt - ${grn.grn_number}`
    ]);

    // 6. Update product cost (weighted average)
    await this.updateProductAverageCost(product_id, accepted_quantity, unit_price, connection);

    inventoryUpdates.successful_updates.push({
      product_id,
      quantity: accepted_quantity,
      location_id,
      batch_number: batchNumber,
      unit_cost: unit_price
    });

    inventoryUpdates.stock_movements.push({
      product_id,
      quantity: accepted_quantity,
      movement_type: 'receipt',
      reference: grn.grn_number,
      value: accepted_quantity * unit_price
    });
  }

  /**
   * Record rejected items for quality control
   */
  static async recordRejectedItems(item, grn, connection) {
    if (item.rejected_quantity <= 0) return;

    await connection.execute(`
            INSERT INTO quality_control_rejections (
                grn_id, product_id, rejected_quantity, rejection_reason,
                supplier_id, purchase_order_id, rejection_date, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
      grn.grn_id, item.product_id, item.rejected_quantity,
      item.notes || 'Quality rejection during GRN',
      grn.supplier_id, grn.purchase_order_id, grn.grn_date
    ]);

    // Record movement for rejected items (not added to stock)
    await connection.execute(`
            INSERT INTO stock_movements (
                product_id, quantity, movement_type, reference_type, reference_id,
                reference_number, notes, movement_date, created_by
            ) VALUES (?, ?, 'rejection', 'GRN', ?, ?, ?, ?, 1)
        `, [
      item.product_id, item.rejected_quantity, grn.grn_id,
      grn.grn_number, `Quality rejection - ${item.notes || 'Quality control failure'}`,
      grn.grn_date
    ]);
  }

  /**
   * Update product average cost using weighted average method
   */
  static async updateProductAverageCost(productId, newQuantity, newUnitPrice, connection) {
    // Get current stock and average cost
    const [currentStock] = await connection.execute(`
            SELECT 
                SUM(current_stock) as total_stock,
                AVG(average_cost) as current_avg_cost
            FROM inventory_warehouse_stock 
            WHERE item_id = ?
        `, [productId]);

    if (currentStock.length > 0 && currentStock[0].total_stock > 0) {
      const totalStock = parseFloat(currentStock[0].total_stock) || 0;
      const currentAvgCost = parseFloat(currentStock[0].current_avg_cost) || 0;

      // Calculate new weighted average cost
      const totalValue = (totalStock * currentAvgCost) + (newQuantity * newUnitPrice);
      const newTotalQuantity = totalStock + newQuantity;
      const newAvgCost = totalValue / newTotalQuantity;

      // Update product cost
      await connection.execute(`
                UPDATE products 
                SET average_cost = ?, last_purchase_price = ?, updated_at = NOW()
                WHERE id = ?
            `, [newAvgCost, newUnitPrice, productId]);

      // Update warehouse stock average cost
      await connection.execute(`
                UPDATE inventory_warehouse_stock 
                SET average_cost = ?
                WHERE item_id = ?
            `, [newAvgCost, productId]);
    }
  }

  /**
   * Generate batch number for traceability
   */
  static async generateBatchNumber(productId, receivedDate) {
    const date = new Date(receivedDate);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get next sequence number for this product and date
    const [existing] = await db.execute(`
            SELECT COUNT(*) as count 
            FROM inventory_batches 
            WHERE product_id = ? AND DATE(received_date) = ?
        `, [productId, receivedDate]);

    const sequence = (existing[0].count + 1).toString().padStart(3, '0');
    return `P${productId}-${dateStr}-${sequence}`;
  }

  /**
   * Update inventory valuation after GRN
   */
  static async updateInventoryValuation(grnId, connection) {
    try {
      // Calculate total inventory value for this GRN
      const [grnValue] = await connection.execute(`
                SELECT 
                    SUM(gi.accepted_quantity * gi.unit_price) as total_value,
                    COUNT(DISTINCT gi.product_id) as product_count
                FROM grn_items gi
                WHERE gi.grn_id = ?
            `, [grnId]);

      // Update GRN total inventory value
      if (grnValue[0] && grnValue[0].total_value > 0) {
        await connection.execute(`
                    UPDATE goods_received_notes 
                    SET inventory_value = ?, items_count = ?
                    WHERE id = ?
                `, [grnValue[0].total_value, grnValue[0].product_count, grnId]);
      }

      // Update overall inventory valuation (optional - for reporting)
      await this.updateOverallInventoryValuation(connection);

    } catch (error) {
      console.error('Error updating inventory valuation:', error);
      // Don't throw error as this is not critical for GRN processing
    }
  }

  /**
   * Update overall inventory valuation
   */
  static async updateOverallInventoryValuation(connection) {
    try {
      const [totalValuation] = await connection.execute(`
                SELECT 
                    SUM(iws.current_stock * COALESCE(iws.average_cost, p.average_cost, 0)) as total_inventory_value,
                    SUM(iws.current_stock) as total_quantity,
                    COUNT(DISTINCT iws.item_id) as total_products
                FROM inventory_warehouse_stock iws
                LEFT JOIN products p ON iws.item_id = p.id
                WHERE iws.current_stock > 0
            `);

      // Update or insert inventory valuation summary
      const valuationData = totalValuation[0];
      await connection.execute(`
                INSERT INTO inventory_valuation_summary (
                    valuation_date, total_inventory_value, total_quantity, total_products, updated_at
                ) VALUES (CURDATE(), ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    total_inventory_value = VALUES(total_inventory_value),
                    total_quantity = VALUES(total_quantity),
                    total_products = VALUES(total_products),
                    updated_at = NOW()
            `, [
        valuationData.total_inventory_value || 0,
        valuationData.total_quantity || 0,
        valuationData.total_products || 0
      ]);

    } catch (error) {
      console.error('Error updating overall inventory valuation:', error);
    }
  }

  /**
   * Get inventory movement history for a product
   */
  static async getInventoryMovementHistory(productId, options = {}) {
    const { limit = 50, fromDate, toDate, movementType } = options;

    let whereClause = 'sm.product_id = ?';
    const queryParams = [productId];

    if (fromDate && toDate) {
      whereClause += ' AND sm.movement_date BETWEEN ? AND ?';
      queryParams.push(fromDate, toDate);
    }

    if (movementType) {
      whereClause += ' AND sm.movement_type = ?';
      queryParams.push(movementType);
    }

    const [movements] = await db.execute(`
            SELECT 
                sm.*,
                p.name as product_name,
                ib.batch_number,
                fl.name as from_location,
                tl.name as to_location
            FROM stock_movements sm
            LEFT JOIN products p ON sm.product_id = p.id
            LEFT JOIN inventory_batches ib ON sm.batch_id = ib.id
            LEFT JOIN inventory_locations fl ON sm.from_location_id = fl.id
            LEFT JOIN inventory_locations tl ON sm.to_location_id = tl.id
            WHERE ${whereClause}
            ORDER BY sm.movement_date DESC, sm.created_at DESC
            LIMIT ?
        `, [...queryParams, limit]);

    return movements;
  }

  /**
   * Get current stock levels with batch details
   */
  static async getCurrentStockLevels(locationId = null, productId = null) {
    let whereClause = '1=1';
    const queryParams = [];

    if (locationId) {
      whereClause += ' AND iws.location_id = ?';
      queryParams.push(locationId);
    }

    if (productId) {
      whereClause += ' AND iws.item_id = ?';
      queryParams.push(productId);
    }

    const [stockLevels] = await db.execute(`
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.category,
                p.unit,
                il.name as location_name,
                iws.current_stock,
                iws.average_cost,
                (iws.current_stock * iws.average_cost) as stock_value,
                COUNT(ib.id) as batch_count,
                MIN(ib.received_date) as oldest_batch_date,
                MAX(ib.received_date) as newest_batch_date
            FROM inventory_warehouse_stock iws
            JOIN products p ON iws.item_id = p.id
            JOIN inventory_locations il ON iws.location_id = il.id
            LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND ib.current_quantity > 0
            WHERE ${whereClause} AND iws.current_stock > 0
            GROUP BY p.id, il.id
            ORDER BY p.name, il.name
        `, queryParams);

    return stockLevels;
  }
}

module.exports = InventoryManagementService;