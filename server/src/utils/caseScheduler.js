/**
 * Case Scheduler for VTRIA ERP
 * Handles periodic tasks for case aging and notifications
 */

const cron = require('node-cron');
const CaseService = require('../services/caseService');
const notificationService = require('../services/notificationService');

class CaseScheduler {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Initialize all scheduled jobs
   */
  init() {
    // Update case aging every hour
    this.scheduleAgingUpdate();
    
    // Send overdue notifications daily at 9 AM
    this.scheduleOverdueNotifications();
    
    console.log('Case scheduler initialized');
  }

  /**
   * Schedule case aging updates
   */
  scheduleAgingUpdate() {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running case aging update...');
        const updatedCount = await CaseService.updateCaseAging();
        console.log(`Updated aging status for ${updatedCount} cases`);
      } catch (error) {
        console.error('Case aging update failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('aging_update', job);
    job.start();
  }

  /**
   * Schedule overdue notifications
   */
  scheduleOverdueNotifications() {
    const job = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Sending overdue case notifications...');
        const notificationCount = await notificationService.sendOverdueNotifications();
        console.log(`Sent ${notificationCount} overdue notifications`);
      } catch (error) {
        console.error('Overdue notifications failed:', error);
      }
    }, {
      scheduled: false
    });

    this.jobs.set('overdue_notifications', job);
    job.start();
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped scheduler job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get job status
   */
  getStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return status;
  }
}

module.exports = new CaseScheduler();
