/**
 * Test Stock Workflow Utility
 * 
 * This utility helps test the stock management workflow including:
 * - Creating stock items
 * - Transferring stock between locations
 * - Allocating stock to cases/tickets
 * - Testing FIFO recommendations
 * - Testing warranty checks
 * - Testing stock level monitoring
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { sequelize, Stock, StockItem, StockMovement, Product, Location, Case, Ticket } = require('../src/models');
const stockService = require('../src/services/stockService');
const stockScheduler = require('../src/utils/stockScheduler');

// Test data
const testData = {
  locations: [
    { id: 'loc_mangalore', name: 'Mangalore' },
    { id: 'loc_bangalore', name: 'Bangalore' },
    { id: 'loc_pune', name: 'Pune' }
  ],
  products: [
    { id: 'prod_1', name: 'Pressure Sensor', category: 'Sensors', min_stock_level: 5 },
    { id: 'prod_2', name: 'Temperature Controller', category: 'Controllers', min_stock_level: 3 },
    { id: 'prod_3', name: 'Flow Meter', category: 'Meters', min_stock_level: 2 }
  ],
  stockItems: [
    {
      serial_number: 'PS-2024-001',
      condition: 'new',
      purchase_date: new Date('2024-01-15'),
      vendor_warranty_expiry: new Date('2026-01-15'),
      customer_warranty_expiry: new Date('2025-01-15'),
      product_id: 'prod_1',
      location_id: 'loc_mangalore'
    },
    {
      serial_number: 'TC-2024-001',
      condition: 'new',
      purchase_date: new Date('2024-01-20'),
      vendor_warranty_expiry: new Date('2026-01-20'),
      customer_warranty_expiry: new Date('2025-01-20'),
      product_id: 'prod_2',
      location_id: 'loc_bangalore'
    },
    {
      serial_number: 'FM-2024-001',
      condition: 'new',
      purchase_date: new Date('2024-01-25'),
      vendor_warranty_expiry: new Date('2026-01-25'),
      customer_warranty_expiry: new Date('2025-01-25'),
      product_id: 'prod_3',
      location_id: 'loc_pune'
    }
  ]
};

// Test functions
const testStockWorkflow = {
  /**
   * Initialize test data
   */
  async initTestData() {
    console.log('Initializing test data...');
    
    try {
      // Create test locations if they don't exist
      for (const location of testData.locations) {
        const [loc] = await Location.findOrCreate({
          where: { id: location.id },
          defaults: location
        });
        console.log(`Location: ${loc.name}`);
      }
      
      // Create test products if they don't exist
      for (const product of testData.products) {
        const [prod] = await Product.findOrCreate({
          where: { id: product.id },
          defaults: product
        });
        console.log(`Product: ${prod.name}`);
      }
      
      // Create test stock items
      for (const item of testData.stockItems) {
        const stockItem = await StockItem.findOne({
          where: { serial_number: item.serial_number }
        });
        
        if (!stockItem) {
          const newItem = await StockItem.create({
            id: uuidv4(),
            ...item,
            status: 'available',
            metadata: { test_item: true }
          });
          console.log(`Created stock item: ${newItem.serial_number}`);
          
          // Create stock movement record
          await StockMovement.create({
            id: uuidv4(),
            stock_item_id: newItem.id,
            movement_type: 'receipt',
            from_location_id: null,
            to_location_id: item.location_id,
            movement_date: new Date(),
            movement_reason: 'Initial test stock',
            created_by: 'test-system'
          });
          
          // Update stock level
          await stockService.updateStockLevel(item.product_id, item.location_id);
        } else {
          console.log(`Stock item already exists: ${stockItem.serial_number}`);
        }
      }
      
      console.log('Test data initialization complete.');
    } catch (error) {
      console.error('Error initializing test data:', error);
    }
  },
  
  /**
   * Test stock transfer between locations
   */
  async testStockTransfer() {
    console.log('\nTesting stock transfer...');
    
    try {
      // Get a stock item to transfer
      const stockItem = await StockItem.findOne({
        where: { serial_number: 'PS-2024-001' }
      });
      
      if (!stockItem) {
        console.error('Stock item not found for transfer test');
        return;
      }
      
      const sourceLocationId = stockItem.location_id;
      const targetLocationId = sourceLocationId === 'loc_mangalore' ? 'loc_bangalore' : 'loc_mangalore';
      
      console.log(`Transferring ${stockItem.serial_number} from ${sourceLocationId} to ${targetLocationId}`);
      
      // Perform transfer
      const transfer = await stockService.transferStockItem(
        stockItem.id,
        targetLocationId,
        'Test transfer',
        'test-system'
      );
      
      console.log(`Transfer completed: ${transfer.id}`);
      
      // Verify transfer
      const updatedItem = await StockItem.findByPk(stockItem.id);
      console.log(`Item now at location: ${updatedItem.location_id}`);
      
      // Check stock levels were updated
      await stockService.updateStockLevel(stockItem.product_id, sourceLocationId);
      await stockService.updateStockLevel(stockItem.product_id, targetLocationId);
      
      console.log('Stock transfer test complete.');
    } catch (error) {
      console.error('Error in stock transfer test:', error);
    }
  },
  
  /**
   * Test FIFO recommendations
   */
  async testFifoRecommendations() {
    console.log('\nTesting FIFO recommendations...');
    
    try {
      // Get FIFO recommendations for a product
      const productId = 'prod_1';
      const locationId = 'loc_mangalore';
      
      const fifoItems = await stockService.getFifoRecommendations(productId, locationId);
      
      console.log(`FIFO recommendations for ${productId} at ${locationId}:`);
      fifoItems.forEach(item => {
        console.log(`- ${item.serial_number} (Purchase date: ${item.purchase_date})`);
      });
      
      console.log('FIFO recommendations test complete.');
    } catch (error) {
      console.error('Error in FIFO recommendations test:', error);
    }
  },
  
  /**
   * Test stock allocation to a case
   */
  async testStockAllocation() {
    console.log('\nTesting stock allocation...');
    
    try {
      // Find an available stock item
      const stockItem = await StockItem.findOne({
        where: { 
          status: 'available',
          serial_number: 'TC-2024-001'
        }
      });
      
      if (!stockItem) {
        console.error('No available stock item found for allocation test');
        return;
      }
      
      // Create a test case if needed
      let testCase = await Case.findOne({
        where: { title: 'Test Stock Allocation Case' }
      });
      
      if (!testCase) {
        testCase = await Case.create({
          id: uuidv4(),
          title: 'Test Stock Allocation Case',
          description: 'Case created for stock allocation testing',
          status: 'open',
          priority: 'medium',
          created_by: 'test-system'
        });
        console.log(`Created test case: ${testCase.id}`);
      }
      
      // Allocate stock to case
      console.log(`Allocating ${stockItem.serial_number} to case ${testCase.id}`);
      
      const allocation = await stockService.allocateStockItem(
        stockItem.id,
        { case_id: testCase.id },
        'Test allocation',
        'test-system'
      );
      
      console.log(`Allocation completed: ${allocation.id}`);
      
      // Verify allocation
      const updatedItem = await StockItem.findByPk(stockItem.id);
      console.log(`Item status now: ${updatedItem.status}`);
      console.log(`Item allocated to case: ${updatedItem.case_id}`);
      
      console.log('Stock allocation test complete.');
    } catch (error) {
      console.error('Error in stock allocation test:', error);
    }
  },
  
  /**
   * Test warranty checks
   */
  async testWarrantyChecks() {
    console.log('\nTesting warranty checks...');
    
    try {
      // Create a stock item with expiring warranty
      const expiringItem = await StockItem.findOne({
        where: { serial_number: 'FM-2024-001' }
      });
      
      if (expiringItem) {
        // Set warranty to expire soon
        const nearExpiryDate = new Date();
        nearExpiryDate.setDate(nearExpiryDate.getDate() + 5); // 5 days from now
        
        await expiringItem.update({
          customer_warranty_expiry: nearExpiryDate
        });
        
        console.log(`Set ${expiringItem.serial_number} warranty to expire in 5 days`);
      }
      
      // Run warranty checks
      console.log('Running warranty checks...');
      await stockScheduler.checkWarrantyExpiry();
      
      console.log('Warranty checks test complete.');
    } catch (error) {
      console.error('Error in warranty checks test:', error);
    }
  },
  
  /**
   * Test stock level monitoring
   */
  async testStockLevelMonitoring() {
    console.log('\nTesting stock level monitoring...');
    
    try {
      // Set up a low stock situation
      const product = await Product.findOne({
        where: { id: 'prod_3' }
      });
      
      if (product) {
        // Set minimum stock level
        await product.update({
          min_stock_level: 5
        });
        
        console.log(`Set ${product.name} minimum stock level to 5`);
      }
      
      // Run stock level check
      console.log('Running stock level checks...');
      await stockScheduler.checkStockLevels();
      
      console.log('Stock level monitoring test complete.');
    } catch (error) {
      console.error('Error in stock level monitoring test:', error);
    }
  },
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('=== STOCK MANAGEMENT WORKFLOW TEST ===');
    
    try {
      await this.initTestData();
      await this.testStockTransfer();
      await this.testFifoRecommendations();
      await this.testStockAllocation();
      await this.testWarrantyChecks();
      await this.testStockLevelMonitoring();
      
      console.log('\n=== ALL TESTS COMPLETED ===');
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      // Close database connection
      await sequelize.close();
    }
  }
};

// Run tests if executed directly
if (require.main === module) {
  testStockWorkflow.runAllTests()
    .then(() => {
      console.log('Test workflow completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test workflow failed:', error);
      process.exit(1);
    });
}

module.exports = testStockWorkflow;
