/**
 * Notification Service for VTRIA ERP
 * Handles email, in-app, and real-time WebSocket notifications for system events
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const Role = require('../models/Role');
const Case = require('../models/Case');
const Ticket = require('../models/Ticket');
const Location = require('../models/Location');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const websocketService = require('./websocketService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  /**
   * Send case-related notification
   */
  async sendCaseNotification(caseId, event, triggeredBy, data = {}) {
    try {
      const caseItem = await Case.findByPk(caseId, {
        include: [
          { model: User, as: 'assignedUser' },
          { model: User, as: 'createdUser' },
          { model: Location, as: 'location' }
        ]
      });

      if (!caseItem) return;

      const recipients = await this.getCaseNotificationRecipients(caseItem, event);
      const notificationData = this.buildCaseNotificationData(caseItem, event, data);

      // Send in-app notifications
      for (const recipient of recipients) {
        await this.createInAppNotification(recipient.id, notificationData);
      }

      // Send email notifications if configured
      if (this.emailTransporter) {
        for (const recipient of recipients) {
          if (recipient.email_notifications) {
            await this.sendEmailNotification(recipient, notificationData);
          }
        }
      }

    } catch (error) {
      console.error('Failed to send case notification:', error);
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(userId, notificationData) {
    // Create database notification
    const notification = await Notification.create({
      user_id: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data,
      channel: 'in_app'
    });
    
    // Send real-time notification via WebSocket if available
    if (websocketService.io) {
      websocketService.sendToUser(userId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        created_at: notification.created_at
      });
    }
    
    return notification;
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(recipient, notificationData) {
    if (!this.emailTransporter) return;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@vtria.com',
      to: recipient.email,
      subject: `VTRIA ERP - ${notificationData.title}`,
      html: this.buildEmailTemplate(recipient, notificationData)
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      
      // Log email notification
      await Notification.create({
        user_id: recipient.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        channel: 'email',
        sent_at: new Date()
      });

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Get notification recipients for case events
   */
  async getCaseNotificationRecipients(caseItem, event) {
    const recipients = new Set();

    // Always notify case creator
    if (caseItem.createdUser) {
      recipients.add(caseItem.createdUser);
    }

    // Notify assigned user
    if (caseItem.assignedUser) {
      recipients.add(caseItem.assignedUser);
    }

    // Event-specific recipients
    switch (event) {
      case 'created':
        // Notify managers in the location
        const managers = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Manager', 'Director'] } }
          }],
          where: { location_id: caseItem.location_id }
        });
        managers.forEach(manager => recipients.add(manager));
        break;

      case 'assigned':
        // Assignee already added above
        break;

      case 'status_changed':
        // Notify relevant stakeholders based on status
        if (['quotation', 'invoicing', 'closure'].includes(caseItem.status)) {
          const salesTeam = await User.findAll({
            include: [{
              model: Role,
              where: { name: 'Sales Admin' }
            }],
            where: { location_id: caseItem.location_id }
          });
          salesTeam.forEach(member => recipients.add(member));
        }
        break;

      case 'overdue':
        // Notify managers and directors
        const supervisors = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Manager', 'Director'] } }
          }],
          where: { location_id: caseItem.location_id }
        });
        supervisors.forEach(supervisor => recipients.add(supervisor));
        break;
    }

    return Array.from(recipients);
  }

  /**
   * Build notification data for case events
   */
  buildCaseNotificationData(caseItem, event, data = {}) {
    const baseData = {
      case_id: caseItem.id,
      case_number: caseItem.case_number,
      case_title: caseItem.title,
      event: event,
      ...data
    };

    switch (event) {
      case 'created':
        return {
          type: 'case_created',
          title: 'New Case Created',
          message: `Case ${caseItem.case_number} - ${caseItem.title} has been created`,
          data: baseData
        };

      case 'assigned':
        return {
          type: 'case_assigned',
          title: 'Case Assigned',
          message: `Case ${caseItem.case_number} has been assigned to you`,
          data: baseData
        };

      case 'status_changed':
        return {
          type: 'case_status_changed',
          title: 'Case Status Updated',
          message: `Case ${caseItem.case_number} status changed from ${data.from_status} to ${data.to_status}`,
          data: baseData
        };

      case 'overdue':
        return {
          type: 'case_overdue',
          title: 'Case Overdue',
          message: `Case ${caseItem.case_number} is overdue and requires attention`,
          data: baseData
        };

      default:
        return {
          type: 'case_update',
          title: 'Case Update',
          message: `Case ${caseItem.case_number} has been updated`,
          data: baseData
        };
    }
  }

  /**
   * Build email template
   */
  buildEmailTemplate(recipient, notificationData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>VTRIA ERP Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { 
            display: inline-block; 
            padding: 10px 20px; 
            background: #2196F3; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VTRIA ERP</h1>
            <h2>${notificationData.title}</h2>
          </div>
          <div class="content">
            <p>Hello ${recipient.first_name},</p>
            <p>${notificationData.message}</p>
            
            ${notificationData.data.case_number ? `
              <h3>Case Details:</h3>
              <ul>
                <li><strong>Case Number:</strong> ${notificationData.data.case_number}</li>
                <li><strong>Title:</strong> ${notificationData.data.case_title}</li>
                ${notificationData.data.from_status ? `<li><strong>Status Change:</strong> ${notificationData.data.from_status} → ${notificationData.data.to_status}</li>` : ''}
              </ul>
            ` : ''}
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost/vtria-erp'}/cases/${notificationData.data.case_id}" class="button">
              View Case
            </a>
          </div>
          <div class="footer">
            <p>This is an automated notification from VTRIA ERP System.</p>
            <p>VTRIA Engineering Solutions Pvt Ltd</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, options = {}) {
    const {
      unread_only = false,
      limit = 50,
      offset = 0
    } = options;

    const where = { user_id: userId };
    if (unread_only) {
      where.read_at = null;
    }

    return await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    return await Notification.update(
      { read_at: new Date() },
      {
        where: {
          id: notificationId,
          user_id: userId,
          read_at: null
        }
      }
    );
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId) {
    return await Notification.update(
      { read_at: new Date() },
      {
        where: {
          user_id: userId,
          read_at: null
        }
      }
    );
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    return await Notification.count({
      where: {
        user_id: userId,
        read_at: null
      }
    });
  }

  /**
   * Send bulk notifications for overdue cases
   */
  async sendOverdueNotifications() {
    const overdueCases = await Case.findAll({
      where: {
        aging_status: 'red',
        status: {
          [Op.ne]: 'closure'
        }
      },
      include: [
        { model: User, as: 'assignedUser' },
        { model: User, as: 'createdUser' },
        { model: Location, as: 'location' }
      ]
    });

    for (const caseItem of overdueCases) {
      await this.sendCaseNotification(caseItem.id, 'overdue', null);
    }
    
    // Send a broadcast to managers and directors about overdue cases
    if (websocketService.io && overdueCases.length > 0) {
      websocketService.sendToRole('Manager', {
        type: 'overdue_cases_summary',
        title: 'Overdue Cases Alert',
        message: `${overdueCases.length} cases are currently overdue and require attention`,
        data: {
          count: overdueCases.length,
          cases: overdueCases.map(c => ({
            id: c.id,
            case_number: c.case_number,
            title: c.title,
            status: c.status,
            location_id: c.location_id
          }))
        }
      });
      
      websocketService.sendToRole('Director', {
        type: 'overdue_cases_summary',
        title: 'Overdue Cases Alert',
        message: `${overdueCases.length} cases are currently overdue and require attention`,
        data: {
          count: overdueCases.length,
          cases: overdueCases.map(c => ({
            id: c.id,
            case_number: c.case_number,
            title: c.title,
            status: c.status,
            location_id: c.location_id
          }))
        }
      });
    }

    return overdueCases.length;
  }

  /**
   * Send ticket-related notification
   */
  async sendTicketNotification(ticketId, event, triggeredBy, data = {}) {
    try {
      const ticket = await Ticket.findByPk(ticketId, {
        include: [
          { model: User, as: 'assignedUser' },
          { model: User, as: 'createdUser' },
          { model: Location, as: 'location' }
        ]
      });

      if (!ticket) return;

      const recipients = await this.getTicketNotificationRecipients(ticket, event);
      const notificationData = this.buildTicketNotificationData(ticket, event, data);

      // Send in-app notifications
      for (const recipient of recipients) {
        await this.createInAppNotification(recipient.id, notificationData);
      }

      // Send email notifications if configured
      if (this.emailTransporter) {
        for (const recipient of recipients) {
          if (recipient.email_notifications) {
            await this.sendEmailNotification(recipient, notificationData);
          }
        }
      }

    } catch (error) {
      console.error('Failed to send ticket notification:', error);
    }
  }

  /**
   * Get notification recipients for ticket events
   */
  async getTicketNotificationRecipients(ticket, event) {
    const recipients = new Set();

    // Always notify ticket creator
    if (ticket.createdUser) {
      recipients.add(ticket.createdUser);
    }

    // Notify assigned user
    if (ticket.assignedUser) {
      recipients.add(ticket.assignedUser);
    }

    // Event-specific recipients
    switch (event) {
      case 'created':
        // Notify engineers and managers in the location
        const supportTeam = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Engineer', 'Manager', 'Director'] } }
          }],
          where: { location_id: ticket.location_id }
        });
        supportTeam.forEach(member => recipients.add(member));
        break;

      case 'assigned':
        // Assignee already added above
        break;

      case 'status_changed':
        // Notify relevant stakeholders based on status
        if (ticket.status === 'closure') {
          // Notify customer service team
          const customerService = await User.findAll({
            include: [{
              model: Role,
              where: { name: { [Op.in]: ['Sales Admin', 'Manager'] } }
            }],
            where: { location_id: ticket.location_id }
          });
          customerService.forEach(member => recipients.add(member));
        }
        break;

      case 'warranty_expiring':
        // Notify managers and engineers
        const warrantyTeam = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Engineer', 'Manager', 'Director'] } }
          }],
          where: { location_id: ticket.location_id }
        });
        warrantyTeam.forEach(member => recipients.add(member));
        break;
    }

    return Array.from(recipients);
  }

  /**
   * Build notification data for ticket events
   */
  buildTicketNotificationData(ticket, event, data = {}) {
    const baseData = {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      ticket_title: ticket.title,
      customer_name: ticket.customer_name,
      serial_number: ticket.serial_number,
      warranty_status: ticket.warranty_status,
      event: event,
      ...data
    };

    switch (event) {
      case 'created':
        return {
          type: 'ticket_created',
          title: 'New Support Ticket Created',
          message: `Support ticket ${ticket.ticket_number} - ${ticket.title} has been created for ${ticket.customer_name}`,
          data: baseData
        };

      case 'assigned':
        return {
          type: 'ticket_assigned',
          title: 'Support Ticket Assigned',
          message: `Support ticket ${ticket.ticket_number} has been assigned to you`,
          data: baseData
        };

      case 'status_changed':
        return {
          type: 'ticket_status_changed',
          title: 'Ticket Status Updated',
          message: `Ticket ${ticket.ticket_number} status changed from ${data.from_status} to ${data.to_status}`,
          data: baseData
        };

      case 'warranty_expiring':
        return {
          type: 'ticket_warranty_expiring',
          title: 'Warranty Expiring',
          message: `Warranty for ${ticket.product_name} (S/N: ${ticket.serial_number}) expires in ${data.days_remaining} days`,
          data: baseData
        };

      case 'resolution_completed':
        return {
          type: 'ticket_resolved',
          title: 'Ticket Resolved',
          message: `Support ticket ${ticket.ticket_number} has been resolved`,
          data: baseData
        };

      default:
        return {
          type: 'ticket_update',
          title: 'Ticket Update',
          message: `Support ticket ${ticket.ticket_number} has been updated`,
          data: baseData
        };
    }
  }

  /**
   * Send bulk notifications for warranty expiring tickets
   */
  async sendWarrantyExpiringNotifications(days = 30) {
    const expiringTickets = await Ticket.findAll({
      where: {
        warranty_status: 'in_warranty',
        warranty_remaining_days: {
          [Op.between]: [1, days]
        },
        status: {
          [Op.ne]: 'closure'
        }
      },
      include: [
        { model: User, as: 'assignedUser' },
        { model: User, as: 'createdUser' },
        { model: Location, as: 'location' }
      ]
    });

    for (const ticket of expiringTickets) {
      await this.sendTicketNotification(ticket.id, 'warranty_expiring', null, {
        days_remaining: ticket.warranty_remaining_days
      });
    }
    
    // Send a broadcast to engineers and managers about warranty expiring tickets
    if (websocketService.io && expiringTickets.length > 0) {
      const warrantySummary = {
        type: 'warranty_expiring_summary',
        title: 'Warranty Expiration Alert',
        message: `${expiringTickets.length} tickets have products with warranties expiring soon`,
        data: {
          count: expiringTickets.length,
          tickets: expiringTickets.map(t => ({
            id: t.id,
            ticket_number: t.ticket_number,
            title: t.title,
            customer_name: t.customer_name,
            serial_number: t.serial_number,
            warranty_remaining_days: t.warranty_remaining_days,
            location_id: t.location_id
          }))
        }
      };
      
      websocketService.sendToRole('Engineer', warrantySummary);
      websocketService.sendToRole('Manager', warrantySummary);
    }

    return expiringTickets.length;
  }
  
  /**
   * Send stock-related notification
   * @param {string} stockId - Stock ID
   * @param {string} event - Event type (low_stock, transfer, allocation)
   * @param {string} triggeredBy - User ID who triggered the event
   * @param {Object} data - Additional data
   */
  sendStockNotification = async (stockId, event, triggeredBy, data = {}) => {
    try {
      const stock = await sequelize.models.Stock.findByPk(stockId, {
        include: [
          { model: sequelize.models.Product, as: 'product' },
          { model: Location, as: 'location' }
        ]
      });

      if (!stock) return;

      const recipients = await this.getStockNotificationRecipients(stock, event, data);
      const notificationData = this.buildStockNotificationData(stock, event, data);

      // Send in-app notifications
      for (const recipient of recipients) {
        await this.createInAppNotification(recipient.id, notificationData);
      }

      // Send email notifications if configured
      if (this.emailTransporter) {
        for (const recipient of recipients) {
          if (recipient.email_notifications) {
            await this.sendEmailNotification(recipient, notificationData);
          }
        }
      }

    } catch (error) {
      logger.error('Failed to send stock notification:', error);
    }
  }

  /**
   * Get notification recipients for stock events
   */
  getStockNotificationRecipients = async (stock, event, data = {}) => {
    const recipients = new Set();

    // Event-specific recipients
    switch (event) {
      case 'low_stock':
        // Notify inventory managers and directors
        const inventoryTeam = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Manager', 'Director'] } }
          }],
          where: { location_id: stock.location_id }
        });
        inventoryTeam.forEach(member => recipients.add(member));
        break;

      case 'transfer':
        // Notify inventory managers at both locations
        const sourceLocationTeam = await User.findAll({
          include: [{
            model: Role,
            where: { name: { [Op.in]: ['Manager', 'Engineer'] } }
          }],
          where: { location_id: stock.location_id }
        });
        sourceLocationTeam.forEach(member => recipients.add(member));
        
        if (data.destination_location_id) {
          const destLocationTeam = await User.findAll({
            include: [{
              model: Role,
              where: { name: { [Op.in]: ['Manager', 'Engineer'] } }
            }],
            where: { location_id: data.destination_location_id }
          });
          destLocationTeam.forEach(member => recipients.add(member));
        }
        break;

      case 'allocation':
        // Notify case/ticket owner and engineers
        if (data.case_id) {
          const caseItem = await Case.findByPk(data.case_id, {
            include: [
              { model: User, as: 'assignedUser' },
              { model: User, as: 'createdUser' }
            ]
          });
          if (caseItem?.assignedUser) recipients.add(caseItem.assignedUser);
          if (caseItem?.createdUser) recipients.add(caseItem.createdUser);
        }
        
        if (data.ticket_id) {
          const ticket = await Ticket.findByPk(data.ticket_id, {
            include: [
              { model: User, as: 'assignedUser' },
              { model: User, as: 'createdUser' }
            ]
          });
          if (ticket?.assignedUser) recipients.add(ticket.assignedUser);
          if (ticket?.createdUser) recipients.add(ticket.createdUser);
        }
        break;
    }

    return Array.from(recipients);
  }

  /**
   * Build notification data for stock events
   */
  buildStockNotificationData = (stock, event, data = {}) => {
    const baseData = {
      stock_id: stock.id,
      product_id: stock.product_id,
      product_name: stock.product?.name || 'Unknown Product',
      location_id: stock.location_id,
      location_name: stock.location?.name || 'Unknown Location',
      quantity: stock.quantity,
      event: event,
      ...data
    };

    switch (event) {
      case 'low_stock':
        return {
          type: 'stock_low',
          title: 'Low Stock Alert',
          message: `${stock.product?.name || 'Product'} is running low at ${stock.location?.name || 'location'}. Current quantity: ${stock.quantity}`,
          data: baseData
        };

      case 'transfer':
        return {
          type: 'stock_transfer',
          title: 'Stock Transfer',
          message: `${data.quantity} units of ${stock.product?.name || 'Product'} transferred from ${stock.location?.name || 'source location'} to ${data.destination_location_name || 'destination'}`,
          data: baseData
        };

      case 'allocation':
        let entityType = data.case_id ? 'case' : 'ticket';
        let entityId = data.case_id || data.ticket_id;
        let entityNumber = data.case_number || data.ticket_number;
        
        return {
          type: 'stock_allocation',
          title: 'Stock Allocated',
          message: `${data.quantity} units of ${stock.product?.name || 'Product'} allocated to ${entityType} ${entityNumber}`,
          data: baseData
        };

      default:
        return {
          type: 'stock_update',
          title: 'Stock Update',
          message: `Stock update for ${stock.product?.name || 'Product'} at ${stock.location?.name || 'location'}`,
          data: baseData
        };
    }
  }

  /**
   * Send bulk notifications for low stock items
   */
  sendLowStockNotifications = async (threshold = 5) => {
    const lowStockItems = await sequelize.models.Stock.findAll({
      where: {
        quantity: {
          [Op.lte]: threshold
        },
        reorder_level: {
          [Op.gt]: sequelize.col('quantity')
        }
      },
      include: [
        { model: sequelize.models.Product, as: 'product' },
        { model: Location, as: 'location' }
      ]
    });

    for (const stock of lowStockItems) {
      await this.sendStockNotification(stock.id, 'low_stock', null, {
        threshold: threshold,
        reorder_level: stock.reorder_level
      });
    }
    
    // Send a broadcast to managers about low stock items
    if (websocketService.io && lowStockItems.length > 0) {
      websocketService.sendToRole('Manager', {
        type: 'low_stock_summary',
        title: 'Low Stock Summary',
        message: `${lowStockItems.length} items are below reorder level and require attention`,
        data: {
          count: lowStockItems.length,
          items: lowStockItems.map(s => ({
            id: s.id,
            product_id: s.product_id,
            product_name: s.product?.name,
            location_id: s.location_id,
            location_name: s.location?.name,
            quantity: s.quantity,
            reorder_level: s.reorder_level
          }))
        }
      });
    }

    return lowStockItems.length;
  }
}

module.exports = new NotificationService();
