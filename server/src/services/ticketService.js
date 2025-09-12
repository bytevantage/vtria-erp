/**
 * Ticket Service for VTRIA ERP Support System
 * Business logic for ticket lifecycle management with warranty tracking
 */

const Ticket = require('../models/Ticket');
const TicketNote = require('../models/TicketNote');
const TicketStatusHistory = require('../models/TicketStatusHistory');
const TicketParts = require('../models/TicketParts');
const User = require('../models/User');
const Location = require('../models/Location');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

class TicketService {
  /**
   * Generate next ticket number
   */
  static async generateTicketNumber(locationCode = 'MNG') {
    const year = new Date().getFullYear();
    const prefix = `TKT-${locationCode}-${year}`;
    
    const lastTicket = await Ticket.findOne({
      where: {
        ticket_number: {
          [Op.like]: `${prefix}-%`
        }
      },
      order: [['ticket_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastTicket) {
      const lastNumber = parseInt(lastTicket.ticket_number.split('-').pop());
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create new support ticket
   */
  static async createTicket(ticketData, createdBy) {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate ticket number
      const location = await Location.findByPk(ticketData.location_id);
      const ticketNumber = await this.generateTicketNumber(location?.code || 'MNG');

      // Get warranty information if serial number provided
      let warrantyInfo = {};
      if (ticketData.serial_number) {
        warrantyInfo = await this.getWarrantyInfo(ticketData.serial_number);
      }

      // Calculate estimated resolution date based on priority
      const estimatedHours = this.getPriorityResolutionHours(ticketData.priority || 'medium');
      const estimatedResolutionDate = new Date();
      estimatedResolutionDate.setHours(estimatedResolutionDate.getHours() + estimatedHours);

      // Create ticket
      const newTicket = await Ticket.create({
        ...ticketData,
        ticket_number: ticketNumber,
        status: 'support_ticket',
        estimated_resolution_date: estimatedResolutionDate,
        created_by: createdBy,
        ...warrantyInfo
      }, { transaction });

      // Create initial status history
      await TicketStatusHistory.create({
        ticket_id: newTicket.id,
        from_status: null,
        to_status: 'support_ticket',
        changed_by: createdBy,
        change_reason: 'Ticket created'
      }, { transaction });

      // Create initial note
      await TicketNote.create({
        ticket_id: newTicket.id,
        note_type: 'system',
        note_text: `Support ticket ${ticketNumber} created`,
        created_by: createdBy
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendTicketNotifications(newTicket.id, 'created', createdBy);

      // Audit log
      await auditService.log('ticket_created', createdBy, {
        ticket_id: newTicket.id,
        ticket_number: ticketNumber
      });

      return await this.getTicketById(newTicket.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update ticket status and move through workflow
   */
  static async updateTicketStatus(ticketId, newStatus, updatedBy, reason = null, additionalData = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      const currentTicket = await Ticket.findByPk(ticketId);
      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      const oldStatus = currentTicket.status;
      const oldAssignee = currentTicket.assigned_to;

      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }

      // Calculate duration in previous status
      const lastStatusChange = await TicketStatusHistory.findOne({
        where: { ticket_id: ticketId },
        order: [['created_at', 'DESC']]
      });

      const durationHours = lastStatusChange 
        ? (new Date() - new Date(lastStatusChange.created_at)) / (1000 * 60 * 60)
        : (new Date() - new Date(currentTicket.created_at)) / (1000 * 60 * 60);

      // Update ticket
      const updateData = {
        status: newStatus,
        ...additionalData
      };

      // Set resolution date if closing
      if (newStatus === 'closure') {
        updateData.actual_resolution_date = new Date();
        updateData.resolution_time_hours = (new Date() - new Date(currentTicket.created_at)) / (1000 * 60 * 60);
      }

      await currentTicket.update(updateData, { transaction });

      // Create status history
      await TicketStatusHistory.create({
        ticket_id: ticketId,
        from_status: oldStatus,
        to_status: newStatus,
        from_assignee: oldAssignee,
        to_assignee: updateData.assigned_to || currentTicket.assigned_to,
        change_reason: reason,
        duration_hours: durationHours,
        changed_by: updatedBy,
        change_data: additionalData
      }, { transaction });

      // Create note for status change
      await TicketNote.create({
        ticket_id: ticketId,
        note_type: newStatus === 'diagnosis' ? 'diagnosis' : newStatus === 'resolution' ? 'resolution' : 'general',
        note_text: `Status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
        created_by: updatedBy,
        metadata: {
          from_status: oldStatus,
          to_status: newStatus,
          duration_hours: durationHours
        }
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendTicketNotifications(ticketId, 'status_changed', updatedBy, {
        from_status: oldStatus,
        to_status: newStatus
      });

      // Audit log
      await auditService.log('ticket_status_changed', updatedBy, {
        ticket_id: ticketId,
        from_status: oldStatus,
        to_status: newStatus
      });

      return await this.getTicketById(ticketId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Assign ticket to user
   */
  static async assignTicket(ticketId, assigneeId, assignedBy, reason = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const currentTicket = await Ticket.findByPk(ticketId);
      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      const oldAssignee = currentTicket.assigned_to;
      
      // Update ticket assignment
      await currentTicket.update({
        assigned_to: assigneeId
      }, { transaction });

      // Create status history for assignment
      await TicketStatusHistory.create({
        ticket_id: ticketId,
        from_status: currentTicket.status,
        to_status: currentTicket.status,
        from_assignee: oldAssignee,
        to_assignee: assigneeId,
        change_reason: reason || 'Ticket assigned',
        changed_by: assignedBy
      }, { transaction });

      // Create note
      const assignee = await User.findByPk(assigneeId);
      await TicketNote.create({
        ticket_id: ticketId,
        note_type: 'general',
        note_text: `Ticket assigned to ${assignee?.first_name} ${assignee?.last_name}${reason ? `: ${reason}` : ''}`,
        created_by: assignedBy
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendTicketNotifications(ticketId, 'assigned', assignedBy, {
        assignee_id: assigneeId
      });

      return await this.getTicketById(ticketId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add note to ticket
   */
  static async addTicketNote(ticketId, noteData, createdBy) {
    const note = await TicketNote.create({
      ticket_id: ticketId,
      ...noteData,
      created_by: createdBy
    });

    // Update resolution time if time spent is provided
    if (noteData.time_spent_minutes > 0) {
      await Ticket.increment('resolution_time_hours', {
        by: noteData.time_spent_minutes / 60,
        where: { id: ticketId }
      });
    }

    // Audit log
    await auditService.log('ticket_note_added', createdBy, {
      ticket_id: ticketId,
      note_id: note.id
    });

    return note;
  }

  /**
   * Add parts used in ticket resolution
   */
  static async addTicketParts(ticketId, partsData, addedBy) {
    const transaction = await sequelize.transaction();
    
    try {
      const parts = [];
      
      for (const partData of partsData) {
        const part = await TicketParts.create({
          ticket_id: ticketId,
          ...partData,
          added_by: addedBy
        }, { transaction });
        
        parts.push(part);
      }

      // Create note about parts usage
      const partsList = parts.map(p => `${p.part_name} (Qty: ${p.quantity_used})`).join(', ');
      await TicketNote.create({
        ticket_id: ticketId,
        note_type: 'resolution',
        note_text: `Parts used in resolution: ${partsList}`,
        parts_used: parts.map(p => ({
          part_name: p.part_name,
          quantity: p.quantity_used,
          cost: p.total_cost
        })),
        created_by: addedBy
      }, { transaction });

      await transaction.commit();
      return parts;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get warranty information for serial number
   */
  static async getWarrantyInfo(serialNumber) {
    try {
      // Query stock items for warranty information
      const [results] = await sequelize.query(`
        SELECT 
          si.id as stock_item_id,
          si.vendor_warranty_expiry,
          si.customer_warranty_expiry,
          si.warranty_status,
          p.id as product_id,
          p.name as product_name
        FROM stock_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.serial_number = :serialNumber
      `, {
        replacements: { serialNumber }
      });

      if (results.length === 0) {
        return {
          warranty_status: 'not_applicable',
          warranty_remaining_days: 0
        };
      }

      const item = results[0];
      const now = new Date();
      
      // Determine which warranty applies (customer warranty takes precedence)
      let warrantyExpiryDate = item.customer_warranty_expiry || item.vendor_warranty_expiry;
      let warrantyStatus = 'not_applicable';
      let remainingDays = 0;

      if (warrantyExpiryDate) {
        const expiryDate = new Date(warrantyExpiryDate);
        const diffTime = expiryDate - now;
        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (remainingDays <= 0) {
          warrantyStatus = 'expired';
        } else {
          warrantyStatus = 'in_warranty';
        }
      }

      return {
        stock_item_id: item.stock_item_id,
        product_id: item.product_id,
        product_name: item.product_name,
        warranty_status: warrantyStatus,
        warranty_expiry_date: warrantyExpiryDate,
        vendor_warranty_expiry: item.vendor_warranty_expiry,
        customer_warranty_expiry: item.customer_warranty_expiry,
        warranty_remaining_days: Math.max(0, remainingDays),
        warranty_details: {
          vendor_warranty_expiry: item.vendor_warranty_expiry,
          customer_warranty_expiry: item.customer_warranty_expiry,
          warranty_status: warrantyStatus,
          remaining_days: Math.max(0, remainingDays)
        }
      };
    } catch (error) {
      console.error('Error getting warranty info:', error);
      return {
        warranty_status: 'not_applicable',
        warranty_remaining_days: 0
      };
    }
  }

  /**
   * Get ticket by ID with all related data
   */
  static async getTicketById(ticketId) {
    return await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'createdUser',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'code']
        }
      ]
    });
  }

  /**
   * Get tickets with filtering and pagination
   */
  static async getTickets(filters = {}, pagination = {}) {
    const {
      status,
      priority,
      assigned_to,
      location_id,
      ticket_type,
      warranty_status,
      customer_name,
      serial_number,
      search
    } = filters;

    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = pagination;

    const where = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_to) where.assigned_to = assigned_to;
    if (location_id) where.location_id = location_id;
    if (ticket_type) where.ticket_type = ticket_type;
    if (warranty_status) where.warranty_status = warranty_status;
    if (customer_name) where.customer_name = { [Op.iLike]: `%${customer_name}%` };
    if (serial_number) where.serial_number = { [Op.iLike]: `%${serial_number}%` };
    
    if (search) {
      where[Op.or] = [
        { ticket_number: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } },
        { serial_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: tickets, count: total } = await Ticket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get warranty expiring tickets
   */
  static async getWarrantyExpiringTickets(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await Ticket.findAll({
      where: {
        warranty_status: 'in_warranty',
        warranty_expiry_date: {
          [Op.between]: [new Date(), futureDate]
        },
        status: {
          [Op.ne]: 'closure'
        }
      },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'first_name', 'last_name']
        },
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['warranty_expiry_date', 'ASC']]
    });
  }

  /**
   * Get ticket statistics
   */
  static async getTicketStats(locationId = null) {
    const where = {};
    if (locationId) where.location_id = locationId;

    const stats = await Ticket.findAll({
      attributes: [
        'status',
        'priority',
        'warranty_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['status', 'priority', 'warranty_status'],
      raw: true
    });

    // Process stats into organized structure
    const organized = {
      by_status: {},
      by_priority: {},
      by_warranty: {},
      total: 0
    };

    stats.forEach(stat => {
      const count = parseInt(stat.count);
      organized.total += count;
      
      if (!organized.by_status[stat.status]) organized.by_status[stat.status] = 0;
      if (!organized.by_priority[stat.priority]) organized.by_priority[stat.priority] = 0;
      if (!organized.by_warranty[stat.warranty_status]) organized.by_warranty[stat.warranty_status] = 0;
      
      organized.by_status[stat.status] += count;
      organized.by_priority[stat.priority] += count;
      organized.by_warranty[stat.warranty_status] += count;
    });

    return organized;
  }

  // Helper methods

  static getPriorityResolutionHours(priority) {
    const hours = {
      'critical': 4,
      'high': 24,
      'medium': 72,
      'low': 168
    };
    return hours[priority] || 72;
  }

  static isValidStatusTransition(fromStatus, toStatus) {
    const validTransitions = {
      'support_ticket': ['diagnosis', 'rejected'],
      'diagnosis': ['resolution', 'support_ticket', 'rejected'],
      'resolution': ['closure', 'diagnosis'],
      'rejected': ['support_ticket'],
      'on_hold': ['support_ticket', 'diagnosis', 'resolution']
    };

    return validTransitions[fromStatus]?.includes(toStatus) || toStatus === 'on_hold';
  }

  static async sendTicketNotifications(ticketId, event, userId, data = {}) {
    try {
      await notificationService.sendTicketNotification(ticketId, event, userId, data);
    } catch (error) {
      console.error('Failed to send ticket notifications:', error);
    }
  }
}

module.exports = TicketService;
