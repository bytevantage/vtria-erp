/**
 * Ticket Scheduler for VTRIA ERP Support System
 * Handles periodic tasks like warranty expiry notifications and ticket aging
 */

const cron = require('node-cron');
const TicketService = require('../services/ticketService');
const notificationService = require('../services/notificationService');
const WarrantyHelper = require('./warrantyHelper');
const logger = require('./logger');

class TicketScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Ticket scheduler is already running');
      return;
    }

    try {
      // Update warranty status every 6 hours
      this.jobs.set('warranty-update', cron.schedule('0 */6 * * *', async () => {
        await this.updateWarrantyStatus();
      }, { scheduled: false }));

      // Send warranty expiry notifications daily at 9 AM
      this.jobs.set('warranty-notifications', cron.schedule('0 9 * * *', async () => {
        await this.sendWarrantyExpiryNotifications();
      }, { scheduled: false }));

      // Update ticket aging status every hour
      this.jobs.set('ticket-aging', cron.schedule('0 * * * *', async () => {
        await this.updateTicketAging();
      }, { scheduled: false }));

      // Send overdue ticket notifications daily at 10 AM
      this.jobs.set('overdue-notifications', cron.schedule('0 10 * * *', async () => {
        await this.sendOverdueTicketNotifications();
      }, { scheduled: false }));

      // Start all jobs
      this.jobs.forEach(job => job.start());
      this.isRunning = true;

      logger.info('Ticket scheduler started successfully');
    } catch (error) {
      logger.error('Failed to start ticket scheduler:', error);
    }
  }

  /**
   * Alias for start() for compatibility
   */
  initialize() {
    return this.start();
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Ticket scheduler is not running');
      return;
    }

    try {
      this.jobs.forEach(job => job.stop());
      this.jobs.clear();
      this.isRunning = false;

      logger.info('Ticket scheduler stopped successfully');
    } catch (error) {
      logger.error('Failed to stop ticket scheduler:', error);
    }
  }

  /**
   * Update warranty status for all tickets with serial numbers
   */
  async updateWarrantyStatus() {
    try {
      logger.info('Starting warranty status update...');

      const { sequelize } = require('../config/database');
      
      // Get all tickets with serial numbers that need warranty updates
      const [tickets] = await sequelize.query(`
        SELECT id, serial_number, warranty_expiry_date
        FROM tickets 
        WHERE serial_number IS NOT NULL 
        AND status != 'closure'
        AND warranty_status IN ('in_warranty', 'not_applicable')
      `);

      let updatedCount = 0;

      for (const ticket of tickets) {
        try {
          const warrantyInfo = await TicketService.getWarrantyInfo(ticket.serial_number);
          
          if (warrantyInfo.warranty_status !== 'not_applicable') {
            await sequelize.query(`
              UPDATE tickets 
              SET 
                warranty_status = :warrantyStatus,
                warranty_expiry_date = :warrantyExpiry,
                vendor_warranty_expiry = :vendorExpiry,
                customer_warranty_expiry = :customerExpiry,
                warranty_remaining_days = :remainingDays,
                warranty_details = :warrantyDetails
              WHERE id = :ticketId
            `, {
              replacements: {
                ticketId: ticket.id,
                warrantyStatus: warrantyInfo.warranty_status,
                warrantyExpiry: warrantyInfo.warranty_expiry_date,
                vendorExpiry: warrantyInfo.vendor_warranty_expiry,
                customerExpiry: warrantyInfo.customer_warranty_expiry,
                remainingDays: warrantyInfo.warranty_remaining_days,
                warrantyDetails: JSON.stringify(warrantyInfo.warranty_details)
              }
            });

            updatedCount++;
          }
        } catch (error) {
          logger.error(`Failed to update warranty for ticket ${ticket.id}:`, error);
        }
      }

      logger.info(`Warranty status update completed. Updated ${updatedCount} tickets.`);
    } catch (error) {
      logger.error('Failed to update warranty status:', error);
    }
  }

  /**
   * Send warranty expiry notifications
   */
  async sendWarrantyExpiryNotifications() {
    try {
      logger.info('Sending warranty expiry notifications...');

      // Send notifications for warranties expiring in 30, 15, 7, and 1 days
      const notificationDays = [30, 15, 7, 1];
      let totalNotifications = 0;

      for (const days of notificationDays) {
        const count = await notificationService.sendWarrantyExpiringNotifications(days);
        totalNotifications += count;
        logger.info(`Sent ${count} notifications for warranties expiring in ${days} days`);
      }

      logger.info(`Warranty expiry notifications completed. Sent ${totalNotifications} notifications.`);
    } catch (error) {
      logger.error('Failed to send warranty expiry notifications:', error);
    }
  }

  /**
   * Update ticket aging status based on creation date and priority
   */
  async updateTicketAging() {
    try {
      logger.info('Starting ticket aging update...');

      const { sequelize } = require('../config/database');
      
      // Update aging status based on ticket priority and time elapsed
      await sequelize.query(`
        UPDATE tickets 
        SET sla_breach = CASE
          WHEN priority = 'critical' AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 4 THEN true
          WHEN priority = 'high' AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 24 THEN true
          WHEN priority = 'medium' AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 72 THEN true
          WHEN priority = 'low' AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 168 THEN true
          ELSE false
        END
        WHERE status NOT IN ('closure', 'rejected')
      `);

      // Count updated tickets
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as breach_count
        FROM tickets 
        WHERE sla_breach = true 
        AND status NOT IN ('closure', 'rejected')
      `);

      const breachCount = result[0].breach_count;
      logger.info(`Ticket aging update completed. ${breachCount} tickets have SLA breaches.`);
    } catch (error) {
      logger.error('Failed to update ticket aging:', error);
    }
  }

  /**
   * Send notifications for overdue tickets
   */
  async sendOverdueTicketNotifications() {
    try {
      logger.info('Sending overdue ticket notifications...');

      const { sequelize } = require('../config/database');
      
      // Get overdue tickets
      const [overdueTickets] = await sequelize.query(`
        SELECT id, ticket_number, title, assigned_to, created_by, location_id
        FROM tickets 
        WHERE sla_breach = true 
        AND status NOT IN ('closure', 'rejected')
      `);

      let notificationCount = 0;

      for (const ticket of overdueTickets) {
        try {
          await notificationService.sendTicketNotification(
            ticket.id, 
            'overdue', 
            null,
            { sla_breach: true }
          );
          notificationCount++;
        } catch (error) {
          logger.error(`Failed to send overdue notification for ticket ${ticket.id}:`, error);
        }
      }

      logger.info(`Overdue ticket notifications completed. Sent ${notificationCount} notifications.`);
    } catch (error) {
      logger.error('Failed to send overdue ticket notifications:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Run a specific job manually (for testing)
   */
  async runJob(jobName) {
    switch (jobName) {
      case 'warranty-update':
        await this.updateWarrantyStatus();
        break;
      case 'warranty-notifications':
        await this.sendWarrantyExpiryNotifications();
        break;
      case 'ticket-aging':
        await this.updateTicketAging();
        break;
      case 'overdue-notifications':
        await this.sendOverdueTicketNotifications();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

module.exports = new TicketScheduler();
