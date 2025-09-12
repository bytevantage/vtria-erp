/**
 * Stock Controller for VTRIA ERP
 * Handles REST API endpoints for stock management
 */

const stockService = require('../services/stockService');
const productService = require('../services/productService');
const supplierCustomerService = require('../services/supplierCustomerService');
const stockDashboardHelper = require('../utils/stockDashboardHelper');
const stockScheduler = require('../utils/stockScheduler');
const { validateUUID } = require('../utils/validators');

/**
 * Stock Controller Class
 */
class StockController {
  /**
   * Get all stock items with pagination and filtering
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getAllStockItems(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        location_id,
        product_id,
        serial_number,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status,
        location_id,
        product_id,
        serial_number,
        sort_by,
        sort_order
      };

      const result = await stockService.getAllStockItems(options);
      
      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error getting stock items:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock items',
        error: error.message
      });
    }
  }

  /**
   * Get a single stock item by ID
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getStockItemById(req, res) {
    try {
      const { id } = req.params;
      
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock item ID format'
        });
      }
      
      const stockItem = await stockService.getStockItemById(id);
      
      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: stockItem
      });
    } catch (error) {
      console.error('Error getting stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve stock item',
        error: error.message
      });
    }
  }

  /**
   * Create a new stock item
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async createStockItem(req, res) {
    try {
      const {
        product_id,
        location_id,
        serial_number,
        status,
        condition,
        purchase_date,
        warranty_start_date,
        warranty_duration_months,
        supplier_id,
        purchase_price,
        metadata
      } = req.body;
      
      // Validate required fields
      if (!product_id || !location_id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and Location ID are required'
        });
      }
      
      // Check if product exists
      const product = await productService.getProductById(product_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      // Create stock item
      const stockItem = await stockService.createStockItem({
        product_id,
        location_id,
        serial_number,
        status: status || 'AVAILABLE',
        condition: condition || 'NEW',
        purchase_date,
        warranty_start_date,
        warranty_duration_months,
        supplier_id,
        purchase_price,
        metadata,
        created_by: req.user.id
      });
      
      return res.status(201).json({
        success: true,
        message: 'Stock item created successfully',
        data: stockItem
      });
    } catch (error) {
      console.error('Error creating stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create stock item',
        error: error.message
      });
    }
  }

  /**
   * Update an existing stock item
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async updateStockItem(req, res) {
    try {
      const { id } = req.params;
      
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock item ID format'
        });
      }
      
      // Check if stock item exists
      const existingItem = await stockService.getStockItemById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      const {
        serial_number,
        status,
        condition,
        warranty_start_date,
        warranty_duration_months,
        warranty_expiry_date,
        metadata
      } = req.body;
      
      // Update stock item
      const updatedItem = await stockService.updateStockItem(id, {
        serial_number,
        status,
        condition,
        warranty_start_date,
        warranty_duration_months,
        warranty_expiry_date,
        metadata,
        updated_by: req.user.id
      });
      
      return res.status(200).json({
        success: true,
        message: 'Stock item updated successfully',
        data: updatedItem
      });
    } catch (error) {
      console.error('Error updating stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update stock item',
        error: error.message
      });
    }
  }

  /**
   * Delete a stock item (soft delete)
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async deleteStockItem(req, res) {
    try {
      const { id } = req.params;
      
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock item ID format'
        });
      }
      
      // Check if stock item exists
      const existingItem = await stockService.getStockItemById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      // Delete stock item
      await stockService.deleteStockItem(id, req.user.id);
      
      return res.status(200).json({
        success: true,
        message: 'Stock item deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete stock item',
        error: error.message
      });
    }
  }

  /**
   * Transfer stock item between locations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async transferStockItem(req, res) {
    try {
      const { id } = req.params;
      const { destination_location_id, notes } = req.body;
      
      if (!validateUUID(id) || !validateUUID(destination_location_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID format'
        });
      }
      
      // Check if stock item exists
      const stockItem = await stockService.getStockItemById(id);
      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      // Prevent transfer to same location
      if (stockItem.location_id === destination_location_id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot transfer to the same location'
        });
      }
      
      // Transfer stock item
      const result = await stockService.transferStockItem(
        id,
        destination_location_id,
        req.user.id,
        notes
      );
      
      return res.status(200).json({
        success: true,
        message: 'Stock item transferred successfully',
        data: result
      });
    } catch (error) {
      console.error('Error transferring stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to transfer stock item',
        error: error.message
      });
    }
  }

  /**
   * Allocate stock item to a case or ticket
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async allocateStockItem(req, res) {
    try {
      const { id } = req.params;
      const { case_id, ticket_id, notes } = req.body;
      
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock item ID format'
        });
      }
      
      // Either case_id or ticket_id must be provided
      if (!case_id && !ticket_id) {
        return res.status(400).json({
          success: false,
          message: 'Either case_id or ticket_id must be provided'
        });
      }
      
      // Check if stock item exists
      const stockItem = await stockService.getStockItemById(id);
      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      // Check if stock item is available
      if (stockItem.status !== 'AVAILABLE') {
        return res.status(400).json({
          success: false,
          message: 'Stock item is not available for allocation'
        });
      }
      
      // Allocate stock item
      const result = await stockService.allocateStockItem(
        id,
        case_id,
        ticket_id,
        req.user.id,
        notes
      );
      
      return res.status(200).json({
        success: true,
        message: 'Stock item allocated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error allocating stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to allocate stock item',
        error: error.message
      });
    }
  }

  /**
   * Deallocate stock item from a case or ticket
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async deallocateStockItem(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      if (!validateUUID(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock item ID format'
        });
      }
      
      // Check if stock item exists
      const stockItem = await stockService.getStockItemById(id);
      if (!stockItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      // Check if stock item is allocated
      if (stockItem.status !== 'ALLOCATED') {
        return res.status(400).json({
          success: false,
          message: 'Stock item is not currently allocated'
        });
      }
      
      // Deallocate stock item
      const result = await stockService.deallocateStockItem(
        id,
        req.user.id,
        notes
      );
      
      return res.status(200).json({
        success: true,
        message: 'Stock item deallocated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error deallocating stock item:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to deallocate stock item',
        error: error.message
      });
    }
  }

  /**
   * Get FIFO stock recommendations for a product
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getFifoRecommendations(req, res) {
    try {
      const { product_id, location_id, count = 1 } = req.query;
      
      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }
      
      // Get FIFO recommendations
      const recommendations = await stockService.getFifoStockRecommendations(
        product_id,
        location_id,
        parseInt(count, 10)
      );
      
      return res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Error getting FIFO recommendations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get FIFO recommendations',
        error: error.message
      });
    }
  }

  /**
   * Get stock movement history
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getStockMovementHistory(req, res) {
    try {
      const {
        stock_item_id,
        product_id,
        location_id,
        movement_type,
        start_date,
        end_date,
        page = 1,
        limit = 20,
        sort_by = 'movement_date',
        sort_order = 'DESC'
      } = req.query;
      
      const options = {
        stock_item_id,
        product_id,
        location_id,
        movement_type,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort_by,
        sort_order
      };
      
      const result = await stockService.getStockMovementHistory(options);
      
      return res.status(200).json({
        success: true,
        data: result.movements,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error getting stock movement history:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get stock movement history',
        error: error.message
      });
    }
  }

  /**
   * Get stock levels by product
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getStockLevelsByProduct(req, res) {
    try {
      const { location_id, category_id } = req.query;
      
      const stockLevels = await stockService.getStockLevelsByProduct(location_id, category_id);
      
      return res.status(200).json({
        success: true,
        data: stockLevels
      });
    } catch (error) {
      console.error('Error getting stock levels by product:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get stock levels by product',
        error: error.message
      });
    }
  }

  /**
   * Get stock levels by location
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getStockLevelsByLocation(req, res) {
    try {
      const { product_id } = req.query;
      
      const stockLevels = await stockService.getStockLevelsByLocation(product_id);
      
      return res.status(200).json({
        success: true,
        data: stockLevels
      });
    } catch (error) {
      console.error('Error getting stock levels by location:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get stock levels by location',
        error: error.message
      });
    }
  }

  /**
   * Check for expiring warranties
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkExpiringWarranties(req, res) {
    try {
      const { short_term_days, medium_term_days } = req.query;
      
      const result = await stockScheduler.checkExpiringWarranties(
        short_term_days ? parseInt(short_term_days, 10) : undefined,
        medium_term_days ? parseInt(medium_term_days, 10) : undefined
      );
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking expiring warranties:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check expiring warranties',
        error: error.message
      });
    }
  }

  /**
   * Check stock levels
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async checkStockLevels(req, res) {
    try {
      const result = await stockScheduler.checkStockLevels();
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking stock levels:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check stock levels',
        error: error.message
      });
    }
  }

  /**
   * Generate stock dashboard data
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async getStockDashboardData(req, res) {
    try {
      // Get all dashboard charts in parallel
      const [
        stockLevelsByLocation,
        stockLevelsByCategory,
        stockMovementTrends,
        warrantyExpiryData,
        lowStockItemsData,
        stockAllocationData
      ] = await Promise.all([
        stockDashboardHelper.getStockLevelsByLocation(),
        stockDashboardHelper.getStockLevelsByCategory(),
        stockDashboardHelper.getStockMovementTrends(req.query.period, req.query.limit),
        stockDashboardHelper.getWarrantyExpiryData(),
        stockDashboardHelper.getLowStockItemsData(),
        stockDashboardHelper.getStockAllocationData()
      ]);
      
      return res.status(200).json({
        success: true,
        data: {
          stockLevelsByLocation,
          stockLevelsByCategory,
          stockMovementTrends,
          warrantyExpiryData,
          lowStockItemsData,
          stockAllocationData
        }
      });
    } catch (error) {
      console.error('Error generating stock dashboard data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate stock dashboard data',
        error: error.message
      });
    }
  }

  /**
   * Run manual stock checks
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  async runManualStockChecks(req, res) {
    try {
      const result = await stockScheduler.runManualCheck();
      
      return res.status(200).json({
        success: true,
        message: 'Manual stock checks completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error running manual stock checks:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to run manual stock checks',
        error: error.message
      });
    }
  }
}

module.exports = new StockController();
