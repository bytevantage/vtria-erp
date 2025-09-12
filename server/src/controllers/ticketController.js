/**
 * Ticket Controller for VTRIA ERP Support System
 * Handles REST API operations for ticket management
 */

const { validationResult } = require('express-validator');
const TicketService = require('../services/ticketService');
const TicketNote = require('../models/TicketNote');
const TicketStatusHistory = require('../models/TicketStatusHistory');
const TicketParts = require('../models/TicketParts');
const User = require('../models/User');

class TicketController {
  /**
   * Create new support ticket
   */
  static async createTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const ticket = await TicketService.createTicket(req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create support ticket'
      });
    }
  }

  /**
   * Get all tickets with filtering and pagination
   */
  static async getTickets(req, res) {
    try {
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        assigned_to: req.query.assigned_to,
        location_id: req.query.location_id,
        ticket_type: req.query.ticket_type,
        warranty_status: req.query.warranty_status,
        customer_name: req.query.customer_name,
        serial_number: req.query.serial_number,
        search: req.query.search
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      // Apply role-based filtering
      if (req.user.role === 'user') {
        filters.assigned_to = req.user.id;
      } else if (req.user.role === 'engineer') {
        // Engineers can see tickets in their location
        filters.location_id = req.user.location_id;
      }

      const result = await TicketService.getTickets(filters, pagination);
      
      res.json({
        success: true,
        data: result.tickets,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tickets'
      });
    }
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await TicketService.getTicketById(id);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      // Check permissions
      if (!this.canAccessTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: ticket
      });
    } catch (error) {
      console.error('Error fetching ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket'
      });
    }
  }

  /**
   * Update ticket status
   */
  static async updateTicketStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { status, reason, ...additionalData } = req.body;

      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canModifyTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedTicket = await TicketService.updateTicketStatus(
        id, 
        status, 
        req.user.id, 
        reason, 
        additionalData
      );
      
      res.json({
        success: true,
        message: 'Ticket status updated successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update ticket status'
      });
    }
  }

  /**
   * Assign ticket to user
   */
  static async assignTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { assigned_to, reason } = req.body;

      // Check permissions - only managers and above can assign
      if (!['manager', 'director', 'sales_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to assign tickets'
        });
      }

      const updatedTicket = await TicketService.assignTicket(
        id, 
        assigned_to, 
        req.user.id, 
        reason
      );
      
      res.json({
        success: true,
        message: 'Ticket assigned successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to assign ticket'
      });
    }
  }

  /**
   * Add note to ticket
   */
  static async addTicketNote(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      
      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canAccessTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const note = await TicketService.addTicketNote(id, req.body, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Note added successfully',
        data: note
      });
    } catch (error) {
      console.error('Error adding ticket note:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add note'
      });
    }
  }

  /**
   * Get ticket notes
   */
  static async getTicketNotes(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canAccessTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const offset = (page - 1) * limit;
      
      // Filter notes based on user role
      const where = { ticket_id: id };
      if (req.user.role === 'user') {
        where.is_customer_visible = true;
      }

      const { rows: notes, count: total } = await TicketNote.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching ticket notes:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notes'
      });
    }
  }

  /**
   * Get ticket status history
   */
  static async getTicketHistory(req, res) {
    try {
      const { id } = req.params;

      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canAccessTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const history = await TicketStatusHistory.findAll({
        where: { ticket_id: id },
        include: [
          {
            model: User,
            as: 'changedByUser',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'fromAssigneeUser',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'toAssigneeUser',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Error fetching ticket history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ticket history'
      });
    }
  }

  /**
   * Add parts to ticket
   */
  static async addTicketParts(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { parts } = req.body;

      // Check permissions - only engineers and above
      if (!['engineer', 'manager', 'director', 'sales_admin'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to add parts'
        });
      }

      const addedParts = await TicketService.addTicketParts(id, parts, req.user.id);
      
      res.status(201).json({
        success: true,
        message: 'Parts added successfully',
        data: addedParts
      });
    } catch (error) {
      console.error('Error adding ticket parts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add parts'
      });
    }
  }

  /**
   * Get ticket parts
   */
  static async getTicketParts(req, res) {
    try {
      const { id } = req.params;

      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canAccessTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const parts = await TicketParts.findAll({
        where: { ticket_id: id },
        include: [{
          model: User,
          as: 'addedByUser',
          attributes: ['id', 'first_name', 'last_name']
        }],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: parts
      });
    } catch (error) {
      console.error('Error fetching ticket parts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch parts'
      });
    }
  }

  /**
   * Get warranty information for serial number
   */
  static async getWarrantyInfo(req, res) {
    try {
      const { serial_number } = req.params;
      
      const warrantyInfo = await TicketService.getWarrantyInfo(serial_number);
      
      res.json({
        success: true,
        data: warrantyInfo
      });
    } catch (error) {
      console.error('Error fetching warranty info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch warranty information'
      });
    }
  }

  /**
   * Get warranty expiring tickets
   */
  static async getWarrantyExpiringTickets(req, res) {
    try {
      const { days = 30 } = req.query;
      
      const tickets = await TicketService.getWarrantyExpiringTickets(parseInt(days));
      
      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching warranty expiring tickets:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch warranty expiring tickets'
      });
    }
  }

  /**
   * Get ticket statistics
   */
  static async getTicketStats(req, res) {
    try {
      const { location_id } = req.query;
      
      // Apply role-based filtering
      let locationFilter = location_id;
      if (req.user.role === 'engineer') {
        locationFilter = req.user.location_id;
      }
      
      const stats = await TicketService.getTicketStats(locationFilter);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }

  /**
   * Update ticket details
   */
  static async updateTicket(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      
      // Check permissions
      const ticket = await TicketService.getTicketById(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Ticket not found'
        });
      }

      if (!this.canModifyTicket(req.user, ticket)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update ticket
      await ticket.update(req.body);
      
      const updatedTicket = await TicketService.getTicketById(id);
      
      res.json({
        success: true,
        message: 'Ticket updated successfully',
        data: updatedTicket
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update ticket'
      });
    }
  }

  // Helper methods for permission checks

  static canAccessTicket(user, ticket) {
    // Directors and managers can access all tickets
    if (['director', 'manager', 'sales_admin'].includes(user.role)) {
      return true;
    }
    
    // Engineers can access tickets in their location
    if (user.role === 'engineer') {
      return ticket.location_id === user.location_id;
    }
    
    // Users can only access their assigned tickets
    if (user.role === 'user') {
      return ticket.assigned_to === user.id;
    }
    
    return false;
  }

  static canModifyTicket(user, ticket) {
    // Directors and managers can modify all tickets
    if (['director', 'manager', 'sales_admin'].includes(user.role)) {
      return true;
    }
    
    // Engineers can modify tickets in their location
    if (user.role === 'engineer') {
      return ticket.location_id === user.location_id;
    }
    
    // Users can only modify their assigned tickets and only certain fields
    if (user.role === 'user') {
      return ticket.assigned_to === user.id;
    }
    
    return false;
  }
}

module.exports = TicketController;
