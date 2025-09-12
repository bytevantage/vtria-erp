/**
 * Stock Scheduler for VTRIA ERP
 * Handles scheduled tasks for stock management:
 * - Warranty expiry checks
 * - Stock level monitoring
 * - Periodic stock reports
 */

const cron = require('node-cron');
const stockService = require('../services/stockService');
const notificationService = require('../services/notificationService');
const { Product, StockItem, Location, StockMovement, Customer } = require('../models');
const { Op } = require('sequelize');

/**
 * Stock Scheduler Class
 */
class StockScheduler {
  /**
   * Initialize the scheduler with all stock-related scheduled tasks
   */
  initialize() {
    // Check expiring warranties daily at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('Running scheduled warranty expiry check...');
        await this.checkExpiringWarranties();
      } catch (error) {
        console.error('Error in warranty expiry check scheduler:', error);
      }
    });
    
    // Check stock levels daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running scheduled stock level check...');
        await this.checkStockLevels();
      } catch (error) {
        console.error('Error in stock level check scheduler:', error);
      }
    });
    
    // Generate weekly stock report on Mondays at 5:00 AM
    cron.schedule('0 5 * * 1', async () => {
      try {
        console.log('Generating weekly stock report...');
        await this.generateWeeklyStockReport();
      } catch (error) {
        console.error('Error in weekly stock report scheduler:', error);
      }
    });
    
    console.log('Stock scheduler initialized successfully');
  }
  
  /**
   * Check for warranties expiring soon and send notifications
   * @param {number} shortTermDays - Days threshold for short-term expiry (default: 7)
   * @param {number} mediumTermDays - Days threshold for medium-term expiry (default: 30)
   */
  async checkExpiringWarranties(shortTermDays = 7, mediumTermDays = 30) {
    try {
      const today = new Date();
      
      // Short-term expiring warranties (within 7 days)
      const shortTermDate = new Date();
      shortTermDate.setDate(today.getDate() + shortTermDays);
      
      const shortTermExpiring = await StockItem.findAll({
        where: {
          warranty_expiry_date: {
            [Op.lt]: shortTermDate,
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
      
      // Medium-term expiring warranties (within 30 days)
      const mediumTermDate = new Date();
      mediumTermDate.setDate(today.getDate() + mediumTermDays);
      
      const mediumTermExpiring = await StockItem.findAll({
        where: {
          warranty_expiry_date: {
            [Op.lt]: mediumTermDate,
            [Op.gte]: shortTermDate
          },
          status: { [Op.ne]: 'DELETED' }
        },
        include: [
          { model: Product, as: 'product' },
          { model: Location, as: 'location' },
          { model: Customer, as: 'customer' }
        ]
      });
      
      // Already expired warranties (for reporting)
      const expiredWarranties = await StockItem.findAll({
        where: {
          warranty_expiry_date: {
            [Op.lt]: today
          },
          status: { [Op.ne]: 'DELETED' }
        },
        include: [
          { model: Product, as: 'product' },
          { model: Location, as: 'location' },
          { model: Customer, as: 'customer' }
        ]
      });
      
      // Send notifications for short-term expiring warranties (high priority)
      for (const item of shortTermExpiring) {
        const daysRemaining = Math.ceil((item.warranty_expiry_date - today) / (1000 * 60 * 60 * 24));
        
        await notificationService.createNotification({
          type: 'WARRANTY_ALERT',
          title: `URGENT: Warranty Expiring in ${daysRemaining} Days`,
          message: `Warranty for ${item.product.name} (SN: ${item.serial_number}) will expire in ${daysRemaining} days. Customer: ${item.customer?.name || 'N/A'}.`,
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
          priority: 'HIGH',
          roles: ['DIRECTOR', 'MANAGER', 'SALES_ADMIN']
        });
      }
      
      // Send notifications for medium-term expiring warranties (medium priority)
      for (const item of mediumTermExpiring) {
        const daysRemaining = Math.ceil((item.warranty_expiry_date - today) / (1000 * 60 * 60 * 24));
        
        await notificationService.createNotification({
          type: 'WARRANTY_ALERT',
          title: `Warranty Expiring in ${daysRemaining} Days`,
          message: `Warranty for ${item.product.name} (SN: ${item.serial_number}) will expire in ${daysRemaining} days. Customer: ${item.customer?.name || 'N/A'}.`,
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
          roles: ['MANAGER', 'SALES_ADMIN', 'ENGINEER']
        });
      }
      
      // Generate summary report
      const summaryReport = {
        date: today,
        short_term_expiring: shortTermExpiring.length,
        medium_term_expiring: mediumTermExpiring.length,
        expired: expiredWarranties.length,
        total_checked: shortTermExpiring.length + mediumTermExpiring.length + expiredWarranties.length
      };
      
      console.log('Warranty check completed:', summaryReport);
      
      return summaryReport;
    } catch (error) {
      console.error('Error checking warranties:', error);
      throw error;
    }
  }
  
  /**
   * Check stock levels across all locations and send alerts for low stock
   */
  async checkStockLevels() {
    try {
      // Get all active products
      const products = await Product.findAll({
        where: { is_active: true }
      });
      
      // Get all locations
      const locations = await Location.findAll();
      
      const lowStockItems = [];
      
      // Check each product at each location
      for (const product of products) {
        for (const location of locations) {
          // Get minimum stock level from product metadata or default to 5
          const minStockLevel = product.metadata?.min_stock_level || 5;
          
          // Count available stock items for this product at this location
          const availableCount = await StockItem.count({
            where: {
              product_id: product.id,
              location_id: location.id,
              status: 'AVAILABLE'
            }
          });
          
          // If stock level is low, add to list and send notification
          if (availableCount <= minStockLevel) {
            lowStockItems.push({
              product_id: product.id,
              product_name: product.name,
              product_code: product.code,
              location_id: location.id,
              location_name: location.name,
              available_count: availableCount,
              min_stock_level: minStockLevel
            });
            
            // Send notification for low stock
            await notificationService.createNotification({
              type: 'STOCK_ALERT',
              title: `Low Stock Alert: ${product.name}`,
              message: `Stock level for ${product.name} at ${location.name} is low (${availableCount} available). Minimum required: ${minStockLevel}.`,
              metadata: {
                product_id: product.id,
                product_name: product.name,
                location_id: location.id,
                location_name: location.name,
                available_count: availableCount,
                min_stock_level: minStockLevel
              },
              priority: availableCount === 0 ? 'HIGH' : 'MEDIUM',
              roles: ['DIRECTOR', 'MANAGER', 'SALES_ADMIN']
            });
          }
        }
      }
      
      // Generate summary report
      const summaryReport = {
        date: new Date(),
        low_stock_items: lowStockItems.length,
        items_by_location: lowStockItems.reduce((acc, item) => {
          if (!acc[item.location_name]) {
            acc[item.location_name] = 0;
          }
          acc[item.location_name]++;
          return acc;
        }, {}),
        zero_stock_items: lowStockItems.filter(item => item.available_count === 0).length
      };
      
      console.log('Stock level check completed:', summaryReport);
      
      return {
        summary: summaryReport,
        low_stock_items: lowStockItems
      };
    } catch (error) {
      console.error('Error checking stock levels:', error);
      throw error;
    }
  }
  
  /**
   * Generate weekly stock report
   */
  async generateWeeklyStockReport() {
    try {
      // Get current date range for the report
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Get all locations
      const locations = await Location.findAll();
      
      // Collect stock statistics for each location
      const locationStats = [];
      
      for (const location of locations) {
        // Count total stock items at this location
        const totalItems = await StockItem.count({
          where: {
            location_id: location.id,
            status: { [Op.ne]: 'DELETED' }
          }
        });
        
        // Count available stock items
        const availableItems = await StockItem.count({
          where: {
            location_id: location.id,
            status: 'AVAILABLE'
          }
        });
        
        // Count allocated stock items
        const allocatedItems = await StockItem.count({
          where: {
            location_id: location.id,
            status: 'ALLOCATED'
          }
        });
        
        // Count stock movements in the current week
        const weeklyMovements = await StockMovement.count({
          where: {
            [Op.or]: [
              { source_location_id: location.id },
              { destination_location_id: location.id }
            ],
            movement_date: {
              [Op.between]: [startOfWeek, endOfWeek]
            }
          }
        });
        
        // Get low stock items
        const products = await Product.findAll({
          where: { is_active: true }
        });
        
        const lowStockCount = await Promise.all(products.map(async (product) => {
          const minStockLevel = product.metadata?.min_stock_level || 5;
          const availableCount = await StockItem.count({
            where: {
              product_id: product.id,
              location_id: location.id,
              status: 'AVAILABLE'
            }
          });
          
          return availableCount <= minStockLevel ? 1 : 0;
        })).then(results => results.reduce((sum, val) => sum + val, 0));
        
        locationStats.push({
          location_id: location.id,
          location_name: location.name,
          total_items: totalItems,
          available_items: availableItems,
          allocated_items: allocatedItems,
          weekly_movements: weeklyMovements,
          low_stock_products: lowStockCount
        });
      }
      
      // Get overall statistics
      const totalItems = await StockItem.count({
        where: {
          status: { [Op.ne]: 'DELETED' }
        }
      });
      
      const totalAvailable = await StockItem.count({
        where: {
          status: 'AVAILABLE'
        }
      });
      
      const totalAllocated = await StockItem.count({
        where: {
          status: 'ALLOCATED'
        }
      });
      
      const weeklyMovements = await StockMovement.count({
        where: {
          movement_date: {
            [Op.between]: [startOfWeek, endOfWeek]
          }
        }
      });
      
      // Get expiring warranties in the next 30 days
      const expiryDate = new Date();
      expiryDate.setDate(today.getDate() + 30);
      
      const expiringWarranties = await StockItem.count({
        where: {
          warranty_expiry_date: {
            [Op.lt]: expiryDate,
            [Op.gt]: today
          },
          status: { [Op.ne]: 'DELETED' }
        }
      });
      
      // Compile the report
      const report = {
        report_date: today,
        report_period: {
          start: startOfWeek,
          end: endOfWeek
        },
        overall_statistics: {
          total_items: totalItems,
          available_items: totalAvailable,
          allocated_items: totalAllocated,
          weekly_movements: weeklyMovements,
          expiring_warranties_30d: expiringWarranties
        },
        location_statistics: locationStats
      };
      
      // Send report notification to management
      await notificationService.createNotification({
        type: 'STOCK_REPORT',
        title: 'Weekly Stock Report',
        message: `Weekly stock report for period ${startOfWeek.toLocaleDateString()} to ${endOfWeek.toLocaleDateString()} is now available.`,
        metadata: report,
        priority: 'MEDIUM',
        roles: ['DIRECTOR', 'MANAGER']
      });
      
      console.log('Weekly stock report generated successfully');
      
      return report;
    } catch (error) {
      console.error('Error generating weekly stock report:', error);
      throw error;
    }
  }
  
  /**
   * Run a manual check of all scheduled tasks
   */
  async runManualCheck() {
    console.log('Running manual stock checks...');
    
    const warrantyReport = await this.checkExpiringWarranties();
    const stockLevelReport = await this.checkStockLevels();
    const weeklyReport = await this.generateWeeklyStockReport();
    
    return {
      warranty_report: warrantyReport,
      stock_level_report: stockLevelReport,
      weekly_report: weeklyReport
    };
  }

  /**
   * Start the scheduler - alias for initialize() for compatibility
   */
  start() {
    return this.initialize();
  }

  /**
   * Stop the scheduler and clean up resources
   */
  stop() {
    console.log('Stopping stock scheduler...');
    // No active tasks to stop since node-cron handles this automatically
    return true;
  }
}

module.exports = new StockScheduler();
