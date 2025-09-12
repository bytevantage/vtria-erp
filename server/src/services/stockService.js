/**
 * Stock Management Service for VTRIA ERP
 * Handles CRUD operations, FIFO logic, stock transfers, and warranty tracking
 */

const { Op } = require('sequelize');
const { 
  StockItem, 
  StockMovement, 
  Product, 
  ProductBatch,
  ProductCategory,
  Manufacturer,
  Supplier,
  Customer,
  Location,
  Case,
  Ticket,
  User,
  sequelize
} = require('../models');
const notificationService = require('./notificationService');

/**
 * Stock Management Service
 */
class StockService {
  /**
   * Create a new stock item
   * @param {Object} stockItemData - Stock item data
   * @returns {Promise<Object>} Created stock item
   */
  async createStockItem(stockItemData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Create the stock item
      const stockItem = await StockItem.create(stockItemData, { transaction });
      
      // Create initial stock movement record for item creation
      await StockMovement.create({
        stock_item_id: stockItem.id,
        product_id: stockItem.product_id,
        movement_type: 'RECEIPT',
        movement_date: new Date(),
        source_location_id: null, // No source for initial receipt
        destination_location_id: stockItem.location_id,
        quantity: 1,
        status: 'COMPLETED',
        performed_by: stockItemData.created_by,
        notes: 'Initial stock receipt',
        metadata: {
          initial_receipt: true,
          serial_number: stockItem.serial_number,
          batch_number: stockItemData.batch_id ? (await ProductBatch.findByPk(stockItemData.batch_id))?.batch_number : null
        }
      }, { transaction });
      
      await transaction.commit();
      
      // Check if stock level is low after adding this item
      this.checkAndNotifyLowStock(stockItem.product_id, stockItem.location_id);
      
      return stockItem;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Get stock item by ID with associations
   * @param {string} id - Stock item ID
   * @returns {Promise<Object>} Stock item with associations
   */
  async getStockItemById(id) {
    return StockItem.findByPk(id, {
      include: [
        { model: Product, as: 'product' },
        { model: ProductBatch, as: 'batch' },
        { model: Location, as: 'location' },
        { model: Supplier, as: 'supplier' },
        { model: Customer, as: 'customer' },
        { model: Case, as: 'case' },
        { model: Ticket, as: 'ticket' },
        { model: User, as: 'createdBy' },
        { model: User, as: 'updatedBy' }
      ]
    });
  }
  
  /**
   * Update a stock item
   * @param {string} id - Stock item ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated stock item
   */
  async updateStockItem(id, updateData) {
    const stockItem = await StockItem.findByPk(id);
    
    if (!stockItem) {
      throw new Error('Stock item not found');
    }
    
    // Check if status is changing
    const statusChanged = updateData.status && updateData.status !== stockItem.status;
    const oldStatus = stockItem.status;
    
    // Update the stock item
    await stockItem.update(updateData);
    
    // If status changed, create a movement record
    if (statusChanged) {
      await StockMovement.create({
        stock_item_id: stockItem.id,
        product_id: stockItem.product_id,
        movement_type: 'STATUS_CHANGE',
        movement_date: new Date(),
        source_location_id: stockItem.location_id,
        destination_location_id: stockItem.location_id, // Same location, just status change
        quantity: 1,
        status: 'COMPLETED',
        performed_by: updateData.updated_by,
        notes: `Status changed from ${oldStatus} to ${updateData.status}`,
        metadata: {
          old_status: oldStatus,
          new_status: updateData.status
        }
      });
    }
    
    return this.getStockItemById(id);
  }
  
  /**
   * Delete a stock item (soft delete)
   * @param {string} id - Stock item ID
   * @param {string} userId - User performing the deletion
   * @returns {Promise<boolean>} Success status
   */
  async deleteStockItem(id, userId) {
    const stockItem = await StockItem.findByPk(id);
    
    if (!stockItem) {
      throw new Error('Stock item not found');
    }
    
    // Create a movement record for the deletion
    await StockMovement.create({
      stock_item_id: stockItem.id,
      product_id: stockItem.product_id,
      movement_type: 'REMOVAL',
      movement_date: new Date(),
      source_location_id: stockItem.location_id,
      destination_location_id: null, // No destination for removal
      quantity: 1,
      status: 'COMPLETED',
      performed_by: userId,
      notes: 'Stock item removed from inventory',
      metadata: {
        removal_reason: 'User initiated deletion',
        serial_number: stockItem.serial_number
      }
    });
    
    // Soft delete the stock item
    await stockItem.update({
      status: 'DELETED',
      updated_by: userId
    });
    
    return true;
  }
  
  /**
   * Search stock items with filters
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Matching stock items
   */
  async searchStockItems(filters) {
    const {
      productId,
      locationId,
      status,
      serialNumber,
      supplierId,
      customerId,
      caseId,
      ticketId,
      purchaseDateStart,
      purchaseDateEnd,
      warrantyExpiryStart,
      warrantyExpiryEnd,
      limit = 100,
      offset = 0
    } = filters;
    
    const whereClause = {};
    
    if (productId) whereClause.product_id = productId;
    if (locationId) whereClause.location_id = locationId;
    if (status) whereClause.status = status;
    if (serialNumber) whereClause.serial_number = { [Op.iLike]: `%${serialNumber}%` };
    if (supplierId) whereClause.supplier_id = supplierId;
    if (customerId) whereClause.customer_id = customerId;
    if (caseId) whereClause.case_id = caseId;
    if (ticketId) whereClause.ticket_id = ticketId;
    
    if (purchaseDateStart || purchaseDateEnd) {
      whereClause.purchase_date = {};
      if (purchaseDateStart) whereClause.purchase_date[Op.gte] = purchaseDateStart;
      if (purchaseDateEnd) whereClause.purchase_date[Op.lte] = purchaseDateEnd;
    }
    
    if (warrantyExpiryStart || warrantyExpiryEnd) {
      whereClause.warranty_expiry_date = {};
      if (warrantyExpiryStart) whereClause.warranty_expiry_date[Op.gte] = warrantyExpiryStart;
      if (warrantyExpiryEnd) whereClause.warranty_expiry_date[Op.lte] = warrantyExpiryEnd;
    }
    
    return StockItem.findAndCountAll({
      where: whereClause,
      include: [
        { model: Product, as: 'product' },
        { model: Location, as: 'location' }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
  }
  
  /**
   * Transfer stock item between locations
   * @param {string} stockItemId - Stock item ID
   * @param {string} sourceLocationId - Source location ID
   * @param {string} destinationLocationId - Destination location ID
   * @param {string} performedBy - User ID performing the transfer
   * @param {string} notes - Transfer notes
   * @param {string} caseId - Optional related case ID
   * @param {string} ticketId - Optional related ticket ID
   * @returns {Promise<Object>} Updated stock item
   */
  async transferStockItem(stockItemId, sourceLocationId, destinationLocationId, performedBy, notes, caseId, ticketId) {
    const transaction = await sequelize.transaction();
    
    try {
      const stockItem = await StockItem.findByPk(stockItemId, { transaction });
      
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      if (stockItem.location_id !== sourceLocationId) {
        throw new Error('Stock item is not at the specified source location');
      }
      
      // Create a movement record for the transfer
      await StockMovement.create({
        stock_item_id: stockItem.id,
        product_id: stockItem.product_id,
        movement_type: 'TRANSFER',
        movement_date: new Date(),
        source_location_id: sourceLocationId,
        destination_location_id: destinationLocationId,
        quantity: 1,
        status: 'COMPLETED',
        performed_by: performedBy,
        case_id: caseId || null,
        ticket_id: ticketId || null,
        notes: notes || 'Stock item transfer',
        metadata: {
          serial_number: stockItem.serial_number
        }
      }, { transaction });
      
      // Update the stock item location
      await stockItem.update({
        location_id: destinationLocationId,
        updated_by: performedBy
      }, { transaction });
      
      await transaction.commit();
      
      // Check stock levels at both locations after transfer
      this.checkAndNotifyLowStock(stockItem.product_id, sourceLocationId);
      this.checkAndNotifyLowStock(stockItem.product_id, destinationLocationId);
      
      return this.getStockItemById(stockItemId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Allocate stock item to a case or ticket
   * @param {string} stockItemId - Stock item ID
   * @param {string} allocationType - 'CASE' or 'TICKET'
   * @param {string} allocationId - Case ID or Ticket ID
   * @param {string} performedBy - User ID performing the allocation
   * @param {string} notes - Allocation notes
   * @returns {Promise<Object>} Updated stock item
   */
  async allocateStockItem(stockItemId, allocationType, allocationId, performedBy, notes) {
    const transaction = await sequelize.transaction();
    
    try {
      const stockItem = await StockItem.findByPk(stockItemId, { transaction });
      
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      if (stockItem.status !== 'AVAILABLE') {
        throw new Error('Stock item is not available for allocation');
      }
      
      const updateData = {
        status: 'ALLOCATED',
        updated_by: performedBy
      };
      
      // Set the appropriate allocation reference
      if (allocationType === 'CASE') {
        updateData.case_id = allocationId;
      } else if (allocationType === 'TICKET') {
        updateData.ticket_id = allocationId;
      } else {
        throw new Error('Invalid allocation type');
      }
      
      // Create a movement record for the allocation
      await StockMovement.create({
        stock_item_id: stockItem.id,
        product_id: stockItem.product_id,
        movement_type: 'ALLOCATION',
        movement_date: new Date(),
        source_location_id: stockItem.location_id,
        destination_location_id: stockItem.location_id, // Same location, just status change
        quantity: 1,
        status: 'COMPLETED',
        performed_by: performedBy,
        case_id: allocationType === 'CASE' ? allocationId : null,
        ticket_id: allocationType === 'TICKET' ? allocationId : null,
        notes: notes || `Stock item allocated to ${allocationType} #${allocationId}`,
        metadata: {
          allocation_type: allocationType,
          allocation_id: allocationId,
          serial_number: stockItem.serial_number
        }
      }, { transaction });
      
      // Update the stock item
      await stockItem.update(updateData, { transaction });
      
      await transaction.commit();
      
      // Check if stock level is low after allocation
      this.checkAndNotifyLowStock(stockItem.product_id, stockItem.location_id);
      
      return this.getStockItemById(stockItemId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Deallocate stock item from a case or ticket
   * @param {string} stockItemId - Stock item ID
   * @param {string} performedBy - User ID performing the deallocation
   * @param {string} notes - Deallocation notes
   * @returns {Promise<Object>} Updated stock item
   */
  async deallocateStockItem(stockItemId, performedBy, notes) {
    const transaction = await sequelize.transaction();
    
    try {
      const stockItem = await StockItem.findByPk(stockItemId, { transaction });
      
      if (!stockItem) {
        throw new Error('Stock item not found');
      }
      
      if (stockItem.status !== 'ALLOCATED') {
        throw new Error('Stock item is not currently allocated');
      }
      
      // Get allocation details for movement record
      const allocationType = stockItem.case_id ? 'CASE' : 'TICKET';
      const allocationId = stockItem.case_id || stockItem.ticket_id;
      
      // Create a movement record for the deallocation
      await StockMovement.create({
        stock_item_id: stockItem.id,
        product_id: stockItem.product_id,
        movement_type: 'DEALLOCATION',
        movement_date: new Date(),
        source_location_id: stockItem.location_id,
        destination_location_id: stockItem.location_id, // Same location, just status change
        quantity: 1,
        status: 'COMPLETED',
        performed_by: performedBy,
        case_id: stockItem.case_id,
        ticket_id: stockItem.ticket_id,
        notes: notes || `Stock item deallocated from ${allocationType} #${allocationId}`,
        metadata: {
          deallocation_type: allocationType,
          deallocation_id: allocationId,
          serial_number: stockItem.serial_number
        }
      }, { transaction });
      
      // Update the stock item
      await stockItem.update({
        status: 'AVAILABLE',
        case_id: null,
        ticket_id: null,
        updated_by: performedBy
      }, { transaction });
      
      await transaction.commit();
      
      return this.getStockItemById(stockItemId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  /**
   * Get stock items recommended for use based on FIFO logic
   * @param {string} productId - Product ID
   * @param {string} locationId - Location ID
   * @param {number} quantity - Quantity needed
   * @returns {Promise<Array>} Recommended stock items
   */
  async getRecommendedStockItems(productId, locationId, quantity = 1) {
    return StockItem.findAll({
      where: {
        product_id: productId,
        location_id: locationId,
        status: 'AVAILABLE'
      },
      order: [
        ['purchase_date', 'ASC'], // FIFO - oldest items first
        ['createdAt', 'ASC']
      ],
      limit: quantity
    });
  }
  
  /**
   * Check if stock level is low and send notification if needed
   * @param {string} productId - Product ID
   * @param {string} locationId - Location ID
   */
  async checkAndNotifyLowStock(productId, locationId) {
    try {
      const product = await Product.findByPk(productId);
      
      if (!product) {
        return;
      }
      
      // Count available stock items for this product at this location
      const availableCount = await StockItem.count({
        where: {
          product_id: productId,
          location_id: locationId,
          status: 'AVAILABLE'
        }
      });
      
      // Get minimum stock level from product metadata or default to 5
      const minStockLevel = product.metadata?.min_stock_level || 5;
      
      // If stock level is low, send notification
      if (availableCount <= minStockLevel) {
        const location = await Location.findByPk(locationId);
        
        await notificationService.createNotification({
          type: 'STOCK_ALERT',
          title: `Low Stock Alert: ${product.name}`,
          message: `Stock level for ${product.name} at ${location.name} is low (${availableCount} available). Minimum required: ${minStockLevel}.`,
          metadata: {
            product_id: productId,
            product_name: product.name,
            location_id: locationId,
            location_name: location.name,
            available_count: availableCount,
            min_stock_level: minStockLevel
          },
          priority: 'HIGH',
          roles: ['DIRECTOR', 'MANAGER', 'SALES_ADMIN'] // Notify management roles
        });
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }
  
  /**
   * Check for expiring warranties and send notifications
   * @param {number} daysThreshold - Days threshold for warranty expiry check
   */
  async checkExpiringWarranties(daysThreshold = 30) {
    try {
      const today = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(today.getDate() + daysThreshold);
      
      // Find stock items with warranties expiring within the threshold
      const expiringItems = await StockItem.findAll({
        where: {
          warranty_expiry_date: {
            [Op.lt]: thresholdDate,
            [Op.gt]: today
          },
          status: { [Op.ne]: 'DELETED' }
        },
        include: [
          { model: Product, as: 'product' },
          { model: Location, as: 'location' },
          { model: Customer, as: 'customer' }
        ]
      });
      
      // Send notifications for each expiring item
      for (const item of expiringItems) {
        const daysRemaining = Math.ceil((item.warranty_expiry_date - today) / (1000 * 60 * 60 * 24));
        
        await notificationService.createNotification({
          type: 'WARRANTY_ALERT',
          title: `Warranty Expiring: ${item.product.name}`,
          message: `Warranty for ${item.product.name} (SN: ${item.serial_number}) will expire in ${daysRemaining} days.`,
          metadata: {
            stock_item_id: item.id,
            product_id: item.product_id,
            product_name: item.product.name,
            serial_number: item.serial_number,
            warranty_expiry_date: item.warranty_expiry_date,
            days_remaining: daysRemaining,
            customer_id: item.customer_id,
            customer_name: item.customer?.name
          },
          priority: 'MEDIUM',
          roles: ['DIRECTOR', 'MANAGER', 'SALES_ADMIN', 'ENGINEER']
        });
      }
      
      return expiringItems.length;
    } catch (error) {
      console.error('Error checking expiring warranties:', error);
      throw error;
    }
  }
  
  /**
   * Get stock movement history for a stock item
   * @param {string} stockItemId - Stock item ID
   * @returns {Promise<Array>} Stock movement history
   */
  async getStockItemMovementHistory(stockItemId) {
    return StockMovement.findAll({
      where: { stock_item_id: stockItemId },
      include: [
        { model: User, as: 'performedBy' },
        { model: User, as: 'approvedBy' },
        { model: Location, as: 'sourceLocation' },
        { model: Location, as: 'destinationLocation' },
        { model: Case, as: 'case' },
        { model: Ticket, as: 'ticket' }
      ],
      order: [['movement_date', 'DESC']]
    });
  }
  
  /**
   * Get stock levels by product and location
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Stock levels
   */
  async getStockLevels(filters = {}) {
    const { productId, locationId, categoryId } = filters;
    
    const whereClause = {
      status: 'AVAILABLE'
    };
    
    if (productId) whereClause.product_id = productId;
    if (locationId) whereClause.location_id = locationId;
    
    const productWhereClause = {};
    if (categoryId) productWhereClause.category_id = categoryId;
    
    const stockItems = await StockItem.findAll({
      where: whereClause,
      include: [
        { 
          model: Product, 
          as: 'product',
          where: Object.keys(productWhereClause).length > 0 ? productWhereClause : undefined,
          include: [
            { model: ProductCategory, as: 'category' }
          ]
        },
        { model: Location, as: 'location' }
      ]
    });
    
    // Group and count by product and location
    const stockLevels = stockItems.reduce((acc, item) => {
      const key = `${item.product_id}-${item.location_id}`;
      
      if (!acc[key]) {
        acc[key] = {
          product_id: item.product_id,
          product_name: item.product.name,
          product_code: item.product.code,
          category_id: item.product.category_id,
          category_name: item.product.category?.name,
          location_id: item.location_id,
          location_name: item.location.name,
          count: 0
        };
      }
      
      acc[key].count++;
      return acc;
    }, {});
    
    return Object.values(stockLevels);
  }
}

module.exports = new StockService();
