/**
 * Stock Dashboard Helper for VTRIA ERP
 * Generates Chart.js compatible data for stock management visualizations
 */

const { Op } = require('sequelize');
const { 
  StockItem, 
  StockMovement, 
  Product, 
  ProductCategory,
  Location,
  sequelize
} = require('../models');

/**
 * Stock Dashboard Helper Class
 */
class StockDashboardHelper {
  /**
   * Generate stock level data by location
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getStockLevelsByLocation() {
    try {
      // Get all locations
      const locations = await Location.findAll();
      
      // Get stock counts for each location
      const stockData = await Promise.all(locations.map(async (location) => {
        const availableCount = await StockItem.count({
          where: {
            location_id: location.id,
            status: 'AVAILABLE'
          }
        });
        
        const allocatedCount = await StockItem.count({
          where: {
            location_id: location.id,
            status: 'ALLOCATED'
          }
        });
        
        const inTransitCount = await StockItem.count({
          where: {
            location_id: location.id,
            status: 'IN_TRANSIT'
          }
        });
        
        return {
          location_name: location.name,
          available: availableCount,
          allocated: allocatedCount,
          in_transit: inTransitCount
        };
      }));
      
      // Format data for Chart.js
      const labels = stockData.map(item => item.location_name);
      
      return {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Available',
              data: stockData.map(item => item.available),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Allocated',
              data: stockData.map(item => item.allocated),
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            },
            {
              label: 'In Transit',
              data: stockData.map(item => item.in_transit),
              backgroundColor: 'rgba(255, 159, 64, 0.6)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Stock Levels by Location'
            }
          },
          scales: {
            x: {
              stacked: false,
              title: {
                display: true,
                text: 'Location'
              }
            },
            y: {
              stacked: false,
              title: {
                display: true,
                text: 'Stock Count'
              }
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating stock levels by location chart:', error);
      throw error;
    }
  }
  
  /**
   * Generate stock level data by product category
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getStockLevelsByCategory() {
    try {
      // Get all product categories
      const categories = await ProductCategory.findAll();
      
      // Get stock counts for each category
      const stockData = await Promise.all(categories.map(async (category) => {
        // Get all products in this category
        const products = await Product.findAll({
          where: { category_id: category.id }
        });
        
        const productIds = products.map(product => product.id);
        
        // Skip if no products in this category
        if (productIds.length === 0) {
          return {
            category_name: category.name,
            available: 0,
            allocated: 0,
            in_transit: 0
          };
        }
        
        const availableCount = await StockItem.count({
          where: {
            product_id: { [Op.in]: productIds },
            status: 'AVAILABLE'
          }
        });
        
        const allocatedCount = await StockItem.count({
          where: {
            product_id: { [Op.in]: productIds },
            status: 'ALLOCATED'
          }
        });
        
        const inTransitCount = await StockItem.count({
          where: {
            product_id: { [Op.in]: productIds },
            status: 'IN_TRANSIT'
          }
        });
        
        return {
          category_name: category.name,
          available: availableCount,
          allocated: allocatedCount,
          in_transit: inTransitCount
        };
      }));
      
      // Filter out categories with no stock
      const filteredData = stockData.filter(item => 
        item.available > 0 || item.allocated > 0 || item.in_transit > 0
      );
      
      // Format data for Chart.js
      const labels = filteredData.map(item => item.category_name);
      
      return {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Available',
              data: filteredData.map(item => item.available),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Allocated',
              data: filteredData.map(item => item.allocated),
              backgroundColor: 'rgba(153, 102, 255, 0.6)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 1
            },
            {
              label: 'In Transit',
              data: filteredData.map(item => item.in_transit),
              backgroundColor: 'rgba(255, 159, 64, 0.6)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Stock Levels by Product Category'
            }
          },
          scales: {
            x: {
              stacked: false,
              title: {
                display: true,
                text: 'Category'
              }
            },
            y: {
              stacked: false,
              title: {
                display: true,
                text: 'Stock Count'
              }
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating stock levels by category chart:', error);
      throw error;
    }
  }
  
  /**
   * Generate stock movement trends over time
   * @param {string} period - 'daily', 'weekly', or 'monthly'
   * @param {number} limit - Number of periods to include
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getStockMovementTrends(period = 'weekly', limit = 12) {
    try {
      const today = new Date();
      let dateFormat, intervalString;
      
      // Set date format and interval based on period
      switch (period) {
        case 'daily':
          dateFormat = 'YYYY-MM-DD';
          intervalString = '1 day';
          break;
        case 'weekly':
          dateFormat = 'YYYY-WW';
          intervalString = '1 week';
          break;
        case 'monthly':
        default:
          dateFormat = 'YYYY-MM';
          intervalString = '1 month';
          break;
      }
      
      // Generate date series for the query
      const intervals = [];
      for (let i = 0; i < limit; i++) {
        const date = new Date(today);
        
        if (period === 'daily') {
          date.setDate(date.getDate() - i);
        } else if (period === 'weekly') {
          date.setDate(date.getDate() - (i * 7));
        } else {
          date.setMonth(date.getMonth() - i);
        }
        
        intervals.unshift(date);
      }
      
      // Get movement counts by type for each period
      const movementData = await Promise.all(intervals.map(async (date) => {
        let startDate, endDate;
        
        if (period === 'daily') {
          startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          
          endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
        } else if (period === 'weekly') {
          startDate = new Date(date);
          startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
          startDate.setHours(0, 0, 0, 0);
          
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6); // End of week (Saturday)
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(date.getFullYear(), date.getMonth(), 1);
          endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        
        const receiptCount = await StockMovement.count({
          where: {
            movement_type: 'RECEIPT',
            movement_date: {
              [Op.between]: [startDate, endDate]
            }
          }
        });
        
        const transferCount = await StockMovement.count({
          where: {
            movement_type: 'TRANSFER',
            movement_date: {
              [Op.between]: [startDate, endDate]
            }
          }
        });
        
        const allocationCount = await StockMovement.count({
          where: {
            movement_type: 'ALLOCATION',
            movement_date: {
              [Op.between]: [startDate, endDate]
            }
          }
        });
        
        const removalCount = await StockMovement.count({
          where: {
            movement_type: 'REMOVAL',
            movement_date: {
              [Op.between]: [startDate, endDate]
            }
          }
        });
        
        // Format period label
        let periodLabel;
        if (period === 'daily') {
          periodLabel = startDate.toLocaleDateString();
        } else if (period === 'weekly') {
          periodLabel = `W${Math.ceil((startDate.getDate() + startDate.getDay()) / 7)} ${startDate.toLocaleDateString('en-US', { month: 'short' })}`;
        } else {
          periodLabel = startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        
        return {
          period: periodLabel,
          receipt: receiptCount,
          transfer: transferCount,
          allocation: allocationCount,
          removal: removalCount
        };
      }));
      
      // Format data for Chart.js
      const labels = movementData.map(item => item.period);
      
      return {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Receipts',
              data: movementData.map(item => item.receipt),
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2,
              tension: 0.1
            },
            {
              label: 'Transfers',
              data: movementData.map(item => item.transfer),
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 2,
              tension: 0.1
            },
            {
              label: 'Allocations',
              data: movementData.map(item => item.allocation),
              backgroundColor: 'rgba(255, 159, 64, 0.2)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 2,
              tension: 0.1
            },
            {
              label: 'Removals',
              data: movementData.map(item => item.removal),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              tension: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `Stock Movement Trends (${period.charAt(0).toUpperCase() + period.slice(1)})`
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Period'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Movement Count'
              }
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating stock movement trends chart:', error);
      throw error;
    }
  }
  
  /**
   * Generate warranty expiry data
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getWarrantyExpiryData() {
    try {
      const today = new Date();
      
      // Define time periods for warranty expiry
      const periods = [
        { label: 'Expired', start: null, end: today },
        { label: '< 30 Days', start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
        { label: '30-90 Days', start: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) },
        { label: '90-180 Days', start: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000) },
        { label: '180-365 Days', start: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000), end: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000) },
        { label: '> 365 Days', start: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000), end: null }
      ];
      
      // Get warranty counts for each period
      const warrantyData = await Promise.all(periods.map(async (period) => {
        const whereClause = {
          warranty_expiry_date: {},
          status: { [Op.ne]: 'DELETED' }
        };
        
        if (period.start) {
          whereClause.warranty_expiry_date[Op.gte] = period.start;
        }
        
        if (period.end) {
          whereClause.warranty_expiry_date[Op.lt] = period.end;
        }
        
        const count = await StockItem.count({ where: whereClause });
        
        return {
          period: period.label,
          count
        };
      }));
      
      // Format data for Chart.js
      const labels = warrantyData.map(item => item.period);
      const data = warrantyData.map(item => item.count);
      
      // Define colors based on urgency
      const backgroundColors = [
        'rgba(255, 99, 132, 0.6)',  // Expired - Red
        'rgba(255, 159, 64, 0.6)',  // < 30 Days - Orange
        'rgba(255, 205, 86, 0.6)',  // 30-90 Days - Yellow
        'rgba(75, 192, 192, 0.6)',  // 90-180 Days - Green
        'rgba(54, 162, 235, 0.6)',  // 180-365 Days - Blue
        'rgba(153, 102, 255, 0.6)'  // > 365 Days - Purple
      ];
      
      const borderColors = [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)'
      ];
      
      return {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Warranty Expiry Distribution'
            },
            legend: {
              position: 'right'
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating warranty expiry chart:', error);
      throw error;
    }
  }
  
  /**
   * Generate low stock items data
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getLowStockItemsData() {
    try {
      // Get all active products
      const products = await Product.findAll({
        where: { is_active: true },
        include: [
          { model: ProductCategory, as: 'category' }
        ]
      });
      
      // Get all locations
      const locations = await Location.findAll();
      
      // Collect low stock data
      const lowStockData = [];
      
      for (const product of products) {
        // Get minimum stock level from product metadata or default to 5
        const minStockLevel = product.metadata?.min_stock_level || 5;
        
        for (const location of locations) {
          // Count available stock items for this product at this location
          const availableCount = await StockItem.count({
            where: {
              product_id: product.id,
              location_id: location.id,
              status: 'AVAILABLE'
            }
          });
          
          // If stock level is low, add to list
          if (availableCount <= minStockLevel) {
            lowStockData.push({
              product_name: product.name,
              product_code: product.code,
              category_name: product.category?.name || 'Uncategorized',
              location_name: location.name,
              available_count: availableCount,
              min_stock_level: minStockLevel,
              shortage: minStockLevel - availableCount
            });
          }
        }
      }
      
      // Sort by shortage (descending)
      lowStockData.sort((a, b) => b.shortage - a.shortage);
      
      // Take top 10 items with highest shortage
      const topShortages = lowStockData.slice(0, 10);
      
      // Format data for Chart.js
      const labels = topShortages.map(item => `${item.product_name} (${item.location_name})`);
      
      return {
        type: 'horizontalBar',
        data: {
          labels,
          datasets: [
            {
              label: 'Available',
              data: topShortages.map(item => item.available_count),
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            },
            {
              label: 'Minimum Required',
              data: topShortages.map(item => item.min_stock_level),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 1,
              type: 'line'
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Top 10 Low Stock Items'
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Stock Count'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Product (Location)'
              }
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating low stock items chart:', error);
      throw error;
    }
  }
  
  /**
   * Generate stock allocation by case/ticket data
   * @returns {Promise<Object>} Chart.js compatible data
   */
  async getStockAllocationData() {
    try {
      // Get stock items allocated to cases
      const caseAllocations = await StockItem.findAll({
        where: {
          case_id: { [Op.ne]: null },
          status: 'ALLOCATED'
        },
        include: [
          { model: Product, as: 'product' },
          { model: Case, as: 'case' }
        ]
      });
      
      // Get stock items allocated to tickets
      const ticketAllocations = await StockItem.findAll({
        where: {
          ticket_id: { [Op.ne]: null },
          status: 'ALLOCATED'
        },
        include: [
          { model: Product, as: 'product' },
          { model: Ticket, as: 'ticket' }
        ]
      });
      
      // Group case allocations by case status
      const caseStatusData = caseAllocations.reduce((acc, item) => {
        const status = item.case?.status || 'Unknown';
        
        if (!acc[status]) {
          acc[status] = 0;
        }
        
        acc[status]++;
        return acc;
      }, {});
      
      // Group ticket allocations by ticket status
      const ticketStatusData = ticketAllocations.reduce((acc, item) => {
        const status = item.ticket?.status || 'Unknown';
        
        if (!acc[status]) {
          acc[status] = 0;
        }
        
        acc[status]++;
        return acc;
      }, {});
      
      // Format data for Chart.js - Case allocations
      const caseLabels = Object.keys(caseStatusData);
      const caseData = caseLabels.map(label => caseStatusData[label]);
      
      // Format data for Chart.js - Ticket allocations
      const ticketLabels = Object.keys(ticketStatusData);
      const ticketData = ticketLabels.map(label => ticketStatusData[label]);
      
      return {
        case_allocation_chart: {
          type: 'pie',
          data: {
            labels: caseLabels,
            datasets: [{
              data: caseData,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(199, 199, 199, 0.6)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Stock Allocation by Case Status'
              },
              legend: {
                position: 'right'
              }
            }
          }
        },
        ticket_allocation_chart: {
          type: 'pie',
          data: {
            labels: ticketLabels,
            datasets: [{
              data: ticketData,
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',
                'rgba(54, 162, 235, 0.6)',
                'rgba(255, 206, 86, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(199, 199, 199, 0.6)'
              ],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Stock Allocation by Ticket Status'
              },
              legend: {
                position: 'right'
              }
            }
          }
        }
      };
    } catch (error) {
      console.error('Error generating stock allocation charts:', error);
      throw error;
    }
  }
}

module.exports = new StockDashboardHelper();
