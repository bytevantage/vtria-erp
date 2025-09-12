/**
 * Test Notification Workflow Utility
 * Tests the real-time notification system with WebSockets
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { io } = require('socket.io-client');
const { User } = require('../src/models');
const notificationService = require('../src/services/notificationService');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'vtria-erp-secret-key';

// Test users
let testUsers = {
  director: null,
  manager: null,
  engineer: null,
  salesAdmin: null
};

// Socket connections
let sockets = {};

// Helper to create JWT token
const createToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      roles: user.roles,
      location_id: user.location_id
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Helper to create socket connection
const createSocketConnection = (user) => {
  const token = createToken(user);
  const socket = io(API_URL, {
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  socket.on('connect', () => {
    console.log(`Socket connected for ${user.first_name} (${user.roles.join(', ')})`);
  });

  socket.on('notification', (data) => {
    console.log(`\n[${user.first_name} received notification]:`);
    console.log(`Type: ${data.type}`);
    console.log(`Title: ${data.title}`);
    console.log(`Message: ${data.message}`);
    console.log(`Data:`, data.data);
    console.log('-------------------');
  });

  socket.on('connect_error', (err) => {
    console.error(`Connection error for ${user.first_name}:`, err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected for ${user.first_name}: ${reason}`);
  });

  return socket;
};

// Initialize test environment
const init = async () => {
  try {
    // Get test users
    testUsers.director = await User.findOne({ where: { roles: { $contains: ['Director'] } } });
    testUsers.manager = await User.findOne({ where: { roles: { $contains: ['Manager'] } } });
    testUsers.engineer = await User.findOne({ where: { roles: { $contains: ['Engineer'] } } });
    testUsers.salesAdmin = await User.findOne({ where: { roles: { $contains: ['Sales Admin'] } } });

    if (!testUsers.director || !testUsers.manager || !testUsers.engineer || !testUsers.salesAdmin) {
      console.error('Could not find all required test users');
      process.exit(1);
    }

    console.log('Test users loaded successfully');

    // Create socket connections for each user
    for (const [role, user] of Object.entries(testUsers)) {
      if (user) {
        sockets[role] = createSocketConnection(user);
      }
    }

    console.log('Socket connections established');
    console.log('Waiting for notifications...');

  } catch (error) {
    console.error('Initialization error:', error);
    process.exit(1);
  }
};

// Test individual notification
const testIndividualNotification = async () => {
  try {
    console.log('\n--- Testing Individual Notification ---');
    
    // Create notification for engineer
    await notificationService.createInAppNotification(
      testUsers.engineer.id,
      {
        type: 'test',
        title: 'Test Individual Notification',
        message: 'This is a test individual notification',
        data: { test: true, timestamp: new Date() }
      }
    );
    
    console.log('Individual notification sent to engineer');
  } catch (error) {
    console.error('Individual notification test error:', error);
  }
};

// Test role-based notification
const testRoleNotification = async () => {
  try {
    console.log('\n--- Testing Role-Based Notification ---');
    
    // Send to all managers
    await notificationService.sendRoleNotification(
      'Manager',
      {
        type: 'test',
        title: 'Test Manager Role Notification',
        message: 'This notification should be received by all managers',
        data: { test: true, timestamp: new Date() }
      }
    );
    
    console.log('Role notification sent to all Managers');
  } catch (error) {
    console.error('Role notification test error:', error);
  }
};

// Test location-based notification
const testLocationNotification = async () => {
  try {
    console.log('\n--- Testing Location-Based Notification ---');
    
    // Send to Mangalore location
    const mangaloreLocationId = testUsers.engineer.location_id;
    
    await notificationService.sendLocationNotification(
      mangaloreLocationId,
      {
        type: 'test',
        title: 'Test Location Notification',
        message: 'This notification should be received by all users in this location',
        data: { test: true, timestamp: new Date() }
      }
    );
    
    console.log(`Location notification sent to location ID: ${mangaloreLocationId}`);
  } catch (error) {
    console.error('Location notification test error:', error);
  }
};

// Test broadcast notification
const testBroadcastNotification = async () => {
  try {
    console.log('\n--- Testing Broadcast Notification ---');
    
    await notificationService.broadcastNotification({
      type: 'test',
      title: 'Test Broadcast Notification',
      message: 'This is a system-wide broadcast notification',
      data: { test: true, timestamp: new Date() }
    });
    
    console.log('Broadcast notification sent to all users');
  } catch (error) {
    console.error('Broadcast notification test error:', error);
  }
};

// Test case notification
const testCaseNotification = async () => {
  try {
    console.log('\n--- Testing Case Notification ---');
    
    await notificationService.sendCaseStatusChangeNotification(
      'test-case-id',
      'Estimation',
      'Quotation',
      testUsers.director.id,
      {
        case_number: 'CASE-2025-001',
        customer_name: 'Test Customer',
        priority: 'High'
      }
    );
    
    console.log('Case status change notification sent');
  } catch (error) {
    console.error('Case notification test error:', error);
  }
};

// Test ticket notification
const testTicketNotification = async () => {
  try {
    console.log('\n--- Testing Ticket Notification ---');
    
    await notificationService.sendTicketStatusChangeNotification(
      'test-ticket-id',
      'Open',
      'In Progress',
      testUsers.engineer.id,
      {
        ticket_number: 'TICKET-2025-001',
        customer_name: 'Test Customer',
        priority: 'High'
      }
    );
    
    console.log('Ticket status change notification sent');
  } catch (error) {
    console.error('Ticket notification test error:', error);
  }
};

// Test stock notification
const testStockNotification = async () => {
  try {
    console.log('\n--- Testing Stock Notification ---');
    
    await notificationService.sendLowStockNotification(
      'test-stock-item-id',
      'Test Product',
      5,
      10,
      'Mangalore'
    );
    
    console.log('Low stock notification sent');
  } catch (error) {
    console.error('Stock notification test error:', error);
  }
};

// Run all tests
const runAllTests = async () => {
  await init();
  
  // Wait for socket connections to establish
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testIndividualNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testRoleNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testLocationNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testBroadcastNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testCaseNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testTicketNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testStockNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\nAll tests completed');
  
  // Close all socket connections
  for (const socket of Object.values(sockets)) {
    socket.disconnect();
  }
  
  process.exit(0);
};

// If this script is run directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  init,
  testIndividualNotification,
  testRoleNotification,
  testLocationNotification,
  testBroadcastNotification,
  testCaseNotification,
  testTicketNotification,
  testStockNotification,
  runAllTests
};
