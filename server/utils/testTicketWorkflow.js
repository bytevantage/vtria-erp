/**
 * Ticket Workflow Test Suite for VTRIA ERP Support System
 * Comprehensive testing of ticket lifecycle, warranty tracking, and role-based permissions
 */

const TicketService = require('../src/services/ticketService');
const TicketController = require('../src/controllers/ticketController');
const WarrantyHelper = require('../src/utils/warrantyHelper');
const TicketDashboardHelper = require('../src/utils/ticketDashboardHelper');
const { sequelize } = require('../src/config/database');

class TicketWorkflowTester {
  constructor() {
    this.testResults = [];
    this.testTickets = [];
    this.testUsers = {
      director: { id: '550e8400-e29b-41d4-a716-446655440001', role: 'director' },
      manager: { id: '550e8400-e29b-41d4-a716-446655440002', role: 'manager' },
      engineer: { id: '550e8400-e29b-41d4-a716-446655440003', role: 'engineer' },
      user: { id: '550e8400-e29b-41d4-a716-446655440004', role: 'user' }
    };
    this.testLocation = '550e8400-e29b-41d4-a716-446655440010';
  }

  /**
   * Run all ticket workflow tests
   */
  async runAllTests() {
    console.log('🎫 Starting Ticket Workflow Test Suite...\n');

    try {
      await this.testTicketCreation();
      await this.testWorkflowTransitions();
      await this.testWarrantyTracking();
      await this.testTicketNotes();
      await this.testTicketParts();
      await this.testRoleBasedPermissions();
      await this.testDashboardData();
      await this.testNotifications();

      this.printTestSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test ticket creation
   */
  async testTicketCreation() {
    console.log('📝 Testing Ticket Creation...');

    try {
      const ticketData = {
        title: 'Test Support Ticket',
        description: 'This is a test ticket for workflow validation',
        customer_name: 'Test Customer Ltd',
        customer_contact: '+91-9876543210',
        customer_email: 'test@customer.com',
        priority: 'high',
        ticket_type: 'support',
        issue_category: 'hardware',
        issue_severity: 'major',
        serial_number: 'TEST-SN-001',
        location_id: this.testLocation
      };

      const ticket = await TicketService.createTicket(ticketData, this.testUsers.engineer.id);
      this.testTickets.push(ticket);

      this.addTestResult('Ticket Creation', true, `Created ticket ${ticket.ticket_number}`);
      console.log(`✅ Created ticket: ${ticket.ticket_number}`);

      // Test warranty ticket creation
      const warrantyTicketData = {
        ...ticketData,
        title: 'Warranty Support Ticket',
        ticket_type: 'warranty',
        serial_number: 'WARRANTY-SN-001'
      };

      const warrantyTicket = await TicketService.createTicket(warrantyTicketData, this.testUsers.engineer.id);
      this.testTickets.push(warrantyTicket);

      this.addTestResult('Warranty Ticket Creation', true, `Created warranty ticket ${warrantyTicket.ticket_number}`);
      console.log(`✅ Created warranty ticket: ${warrantyTicket.ticket_number}`);

    } catch (error) {
      this.addTestResult('Ticket Creation', false, error.message);
      console.log('❌ Ticket creation failed:', error.message);
    }
  }

  /**
   * Test workflow status transitions
   */
  async testWorkflowTransitions() {
    console.log('\n🔄 Testing Workflow Transitions...');

    if (this.testTickets.length === 0) {
      console.log('❌ No test tickets available for workflow testing');
      return;
    }

    const ticket = this.testTickets[0];
    const workflowSteps = [
      { from: 'support_ticket', to: 'diagnosis', reason: 'Starting diagnosis' },
      { from: 'diagnosis', to: 'resolution', reason: 'Issue identified, implementing fix' },
      { from: 'resolution', to: 'closure', reason: 'Issue resolved successfully' }
    ];

    try {
      for (const step of workflowSteps) {
        const updatedTicket = await TicketService.updateTicketStatus(
          ticket.id,
          step.to,
          this.testUsers.engineer.id,
          step.reason
        );

        this.addTestResult(
          `Status Transition: ${step.from} → ${step.to}`,
          updatedTicket.status === step.to,
          `Ticket status: ${updatedTicket.status}`
        );

        console.log(`✅ Transitioned ${ticket.ticket_number}: ${step.from} → ${step.to}`);
      }

      // Test invalid transition
      try {
        await TicketService.updateTicketStatus(
          ticket.id,
          'support_ticket',
          this.testUsers.engineer.id,
          'Invalid transition test'
        );
        this.addTestResult('Invalid Transition Prevention', false, 'Should have prevented invalid transition');
      } catch (error) {
        this.addTestResult('Invalid Transition Prevention', true, 'Correctly prevented invalid transition');
        console.log('✅ Invalid transition correctly prevented');
      }

    } catch (error) {
      this.addTestResult('Workflow Transitions', false, error.message);
      console.log('❌ Workflow transition failed:', error.message);
    }
  }

  /**
   * Test warranty tracking functionality
   */
  async testWarrantyTracking() {
    console.log('\n🛡️ Testing Warranty Tracking...');

    try {
      // Test warranty info retrieval
      const warrantyInfo = await WarrantyHelper.getWarrantyDetails('TEST-SN-001');
      
      this.addTestResult(
        'Warranty Info Retrieval',
        warrantyInfo !== null,
        `Warranty status: ${warrantyInfo.found ? 'Found' : 'Not Found'}`
      );

      // Test warranty summary
      const warrantySummary = await WarrantyHelper.getWarrantySummary(this.testLocation);
      
      this.addTestResult(
        'Warranty Summary',
        warrantySummary.total_items >= 0,
        `Total items: ${warrantySummary.total_items}`
      );

      // Test expiring warranties
      const expiringWarranties = await WarrantyHelper.getExpiringWarranties(30, this.testLocation);
      
      this.addTestResult(
        'Expiring Warranties',
        Array.isArray(expiringWarranties),
        `Found ${expiringWarranties.length} expiring warranties`
      );

      console.log('✅ Warranty tracking tests completed');

    } catch (error) {
      this.addTestResult('Warranty Tracking', false, error.message);
      console.log('❌ Warranty tracking failed:', error.message);
    }
  }

  /**
   * Test ticket notes functionality
   */
  async testTicketNotes() {
    console.log('\n📝 Testing Ticket Notes...');

    if (this.testTickets.length === 0) {
      console.log('❌ No test tickets available for notes testing');
      return;
    }

    const ticket = this.testTickets[0];

    try {
      const noteTypes = [
        { type: 'diagnosis', text: 'Initial diagnosis: Hardware failure detected', internal: true },
        { type: 'customer_communication', text: 'Contacted customer for additional information', customer_visible: true },
        { type: 'resolution', text: 'Replaced faulty component', time_spent: 120 }
      ];

      for (const noteData of noteTypes) {
        const note = await TicketService.addTicketNote(ticket.id, {
          note_type: noteData.type,
          note_text: noteData.text,
          is_internal: noteData.internal || false,
          is_customer_visible: noteData.customer_visible || false,
          time_spent_minutes: noteData.time_spent || 0
        }, this.testUsers.engineer.id);

        this.addTestResult(
          `Note Creation: ${noteData.type}`,
          note.id !== null,
          `Created ${noteData.type} note`
        );

        console.log(`✅ Added ${noteData.type} note to ${ticket.ticket_number}`);
      }

    } catch (error) {
      this.addTestResult('Ticket Notes', false, error.message);
      console.log('❌ Ticket notes failed:', error.message);
    }
  }

  /**
   * Test ticket parts functionality
   */
  async testTicketParts() {
    console.log('\n🔧 Testing Ticket Parts...');

    if (this.testTickets.length === 0) {
      console.log('❌ No test tickets available for parts testing');
      return;
    }

    const ticket = this.testTickets[0];

    try {
      const partsData = [
        {
          part_name: 'Power Supply Unit',
          part_number: 'PSU-500W-001',
          quantity_used: 1,
          unit_cost: 2500.00,
          part_type: 'replacement',
          warranty_applicable: true,
          warranty_period_months: 12
        },
        {
          part_name: 'Thermal Paste',
          part_number: 'TP-ARCTIC-001',
          quantity_used: 1,
          unit_cost: 150.00,
          part_type: 'consumable'
        }
      ];

      const addedParts = await TicketService.addTicketParts(ticket.id, partsData, this.testUsers.engineer.id);

      this.addTestResult(
        'Ticket Parts Addition',
        addedParts.length === partsData.length,
        `Added ${addedParts.length} parts`
      );

      console.log(`✅ Added ${addedParts.length} parts to ${ticket.ticket_number}`);

    } catch (error) {
      this.addTestResult('Ticket Parts', false, error.message);
      console.log('❌ Ticket parts failed:', error.message);
    }
  }

  /**
   * Test role-based permissions
   */
  async testRoleBasedPermissions() {
    console.log('\n🔐 Testing Role-Based Permissions...');

    if (this.testTickets.length === 0) {
      console.log('❌ No test tickets available for permission testing');
      return;
    }

    const ticket = this.testTickets[0];

    try {
      // Test director access (should have full access)
      const directorAccess = TicketController.canAccessTicket(this.testUsers.director, ticket);
      this.addTestResult('Director Access', directorAccess, 'Director can access all tickets');

      // Test manager access (should have full access)
      const managerAccess = TicketController.canAccessTicket(this.testUsers.manager, ticket);
      this.addTestResult('Manager Access', managerAccess, 'Manager can access all tickets');

      // Test engineer access (location-based)
      const engineerTicket = { ...ticket, location_id: this.testLocation };
      const engineerUser = { ...this.testUsers.engineer, location_id: this.testLocation };
      const engineerAccess = TicketController.canAccessTicket(engineerUser, engineerTicket);
      this.addTestResult('Engineer Location Access', engineerAccess, 'Engineer can access location tickets');

      // Test user access (assigned only)
      const userTicket = { ...ticket, assigned_to: this.testUsers.user.id };
      const userAccess = TicketController.canAccessTicket(this.testUsers.user, userTicket);
      this.addTestResult('User Assigned Access', userAccess, 'User can access assigned tickets');

      // Test user no access (not assigned)
      const userNoAccess = TicketController.canAccessTicket(this.testUsers.user, ticket);
      this.addTestResult('User No Access', !userNoAccess, 'User cannot access unassigned tickets');

      console.log('✅ Role-based permission tests completed');

    } catch (error) {
      this.addTestResult('Role-Based Permissions', false, error.message);
      console.log('❌ Permission testing failed:', error.message);
    }
  }

  /**
   * Test dashboard data generation
   */
  async testDashboardData() {
    console.log('\n📊 Testing Dashboard Data Generation...');

    try {
      // Test dashboard overview
      const overview = await TicketDashboardHelper.getDashboardOverview(this.testLocation);
      this.addTestResult(
        'Dashboard Overview',
        overview.overview && overview.distributions,
        `Total tickets: ${overview.overview?.total_tickets || 0}`
      );

      // Test workflow chart data
      const workflowChart = await TicketDashboardHelper.getWorkflowChartData(this.testLocation);
      this.addTestResult(
        'Workflow Chart Data',
        workflowChart.type === 'horizontalBar',
        `Chart type: ${workflowChart.type}`
      );

      // Test priority chart data
      const priorityChart = await TicketDashboardHelper.getPriorityChartData(this.testLocation);
      this.addTestResult(
        'Priority Chart Data',
        priorityChart.type === 'doughnut',
        `Chart type: ${priorityChart.type}`
      );

      // Test timeline chart data
      const timelineChart = await TicketDashboardHelper.getTimelineChartData(this.testLocation, 7);
      this.addTestResult(
        'Timeline Chart Data',
        timelineChart.type === 'line',
        `Chart type: ${timelineChart.type}`
      );

      // Test performance metrics
      const metrics = await TicketDashboardHelper.getPerformanceMetrics(this.testLocation);
      this.addTestResult(
        'Performance Metrics',
        metrics.resolution_metrics && metrics.quality_metrics,
        'Generated performance metrics'
      );

      console.log('✅ Dashboard data generation tests completed');

    } catch (error) {
      this.addTestResult('Dashboard Data', false, error.message);
      console.log('❌ Dashboard data generation failed:', error.message);
    }
  }

  /**
   * Test notification system
   */
  async testNotifications() {
    console.log('\n🔔 Testing Notification System...');

    try {
      const notificationService = require('../src/services/notificationService');

      if (this.testTickets.length > 0) {
        const ticket = this.testTickets[0];

        // Test ticket creation notification
        await notificationService.sendTicketNotification(
          ticket.id,
          'created',
          this.testUsers.engineer.id
        );

        this.addTestResult('Ticket Creation Notification', true, 'Sent creation notification');

        // Test status change notification
        await notificationService.sendTicketNotification(
          ticket.id,
          'status_changed',
          this.testUsers.engineer.id,
          { from_status: 'support_ticket', to_status: 'diagnosis' }
        );

        this.addTestResult('Status Change Notification', true, 'Sent status change notification');
      }

      console.log('✅ Notification system tests completed');

    } catch (error) {
      this.addTestResult('Notification System', false, error.message);
      console.log('❌ Notification system failed:', error.message);
    }
  }

  /**
   * Add test result
   */
  addTestResult(testName, passed, details) {
    this.testResults.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n📋 Test Summary');
    console.log('================');

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    console.log('\nDetailed Results:');
    console.log('-----------------');

    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.details}`);
    });

    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please review the implementation.');
    } else {
      console.log('\n🎉 All tests passed! Ticket system is working correctly.');
    }
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
      for (const ticket of this.testTickets) {
        // Delete related records first
        await sequelize.query('DELETE FROM ticket_notes WHERE ticket_id = ?', {
          replacements: [ticket.id]
        });
        await sequelize.query('DELETE FROM ticket_status_history WHERE ticket_id = ?', {
          replacements: [ticket.id]
        });
        await sequelize.query('DELETE FROM ticket_parts WHERE ticket_id = ?', {
          replacements: [ticket.id]
        });
        await sequelize.query('DELETE FROM tickets WHERE id = ?', {
          replacements: [ticket.id]
        });
      }

      console.log(`✅ Cleaned up ${this.testTickets.length} test tickets`);
    } catch (error) {
      console.log('❌ Cleanup failed:', error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new TicketWorkflowTester();
  
  tester.runAllTests()
    .then(() => tester.cleanup())
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = TicketWorkflowTester;
