/**
 * Case Service for VTRIA ERP
 * Business logic for case lifecycle management
 */

const Case = require('../models/Case');
const CaseNote = require('../models/CaseNote');
const CaseStatusHistory = require('../models/CaseStatusHistory');
const CaseQueue = require('../models/CaseQueue');
const User = require('../models/User');
const Location = require('../models/Location');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const notificationService = require('./notificationService');
const auditService = require('./auditService');

class CaseService {
  /**
   * Generate next case number
   */
  static async generateCaseNumber(locationCode = 'MNG') {
    const year = new Date().getFullYear();
    const prefix = `${locationCode}-${year}`;
    
    const lastCase = await Case.findOne({
      where: {
        case_number: {
          [Op.like]: `${prefix}-%`
        }
      },
      order: [['case_number', 'DESC']]
    });

    let nextNumber = 1;
    if (lastCase) {
      const lastNumber = parseInt(lastCase.case_number.split('-').pop());
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create new case
   */
  static async createCase(caseData, createdBy) {
    const transaction = await sequelize.transaction();
    
    try {
      // Generate case number
      const location = await Location.findByPk(caseData.location_id);
      const caseNumber = await this.generateCaseNumber(location?.code || 'MNG');

      // Find appropriate queue for enquiry status
      const enquiryQueue = await CaseQueue.findOne({
        where: {
          queue_code: 'ENQ',
          location_id: caseData.location_id,
          is_active: true
        }
      });

      // Calculate due date based on priority
      const dueDateHours = this.getPriorityHours(caseData.priority || 'medium');
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + dueDateHours);

      // Create case
      const newCase = await Case.create({
        ...caseData,
        case_number: caseNumber,
        status: 'enquiry',
        current_queue_id: enquiryQueue?.id,
        due_date: dueDate,
        created_by: createdBy,
        workflow_data: this.initializeWorkflowData()
      }, { transaction });

      // Create initial status history
      await CaseStatusHistory.create({
        case_id: newCase.id,
        from_status: null,
        to_status: 'enquiry',
        to_queue_id: enquiryQueue?.id,
        changed_by: createdBy,
        change_reason: 'Case created'
      }, { transaction });

      // Create initial note
      await CaseNote.create({
        case_id: newCase.id,
        note_type: 'system',
        note_text: `Case ${caseNumber} created`,
        created_by: createdBy
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendCaseNotifications(newCase.id, 'created', createdBy);

      // Audit log
      await auditService.log('case_created', createdBy, {
        case_id: newCase.id,
        case_number: caseNumber
      });

      return await this.getCaseById(newCase.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update case status and move through workflow
   */
  static async updateCaseStatus(caseId, newStatus, updatedBy, reason = null, additionalData = {}) {
    const transaction = await sequelize.transaction();
    
    try {
      const currentCase = await Case.findByPk(caseId);
      if (!currentCase) {
        throw new Error('Case not found');
      }

      const oldStatus = currentCase.status;
      const oldQueueId = currentCase.current_queue_id;
      const oldAssignee = currentCase.assigned_to;

      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }

      // Find new queue
      const newQueue = await this.findQueueForStatus(newStatus, currentCase.location_id);
      
      // Calculate duration in previous status
      const lastStatusChange = await CaseStatusHistory.findOne({
        where: { case_id: caseId },
        order: [['created_at', 'DESC']]
      });

      const durationHours = lastStatusChange 
        ? (new Date() - new Date(lastStatusChange.created_at)) / (1000 * 60 * 60)
        : (new Date() - new Date(currentCase.created_at)) / (1000 * 60 * 60);

      // Update case
      const updateData = {
        status: newStatus,
        current_queue_id: newQueue?.id,
        ...additionalData
      };

      // Set completion date if closing
      if (newStatus === 'closure') {
        updateData.completion_date = new Date();
        updateData.assigned_to = null; // Clear assignment
      }

      // Clear assignment if moving to queue
      if (newQueue && !additionalData.assigned_to) {
        updateData.assigned_to = null;
      }

      await currentCase.update(updateData, { transaction });

      // Create status history
      await CaseStatusHistory.create({
        case_id: caseId,
        from_status: oldStatus,
        to_status: newStatus,
        from_queue_id: oldQueueId,
        to_queue_id: newQueue?.id,
        from_assignee: oldAssignee,
        to_assignee: updateData.assigned_to || null,
        change_reason: reason,
        duration_hours: durationHours,
        changed_by: updatedBy,
        change_data: additionalData
      }, { transaction });

      // Create note for status change
      await CaseNote.create({
        case_id: caseId,
        note_type: 'status_change',
        note_text: `Status changed from ${oldStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
        created_by: updatedBy,
        metadata: {
          from_status: oldStatus,
          to_status: newStatus,
          duration_hours: durationHours
        }
      }, { transaction });

      // Update workflow data
      const workflowData = this.updateWorkflowData(currentCase.workflow_data, newStatus);
      await currentCase.update({ workflow_data: workflowData }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendCaseNotifications(caseId, 'status_changed', updatedBy, {
        from_status: oldStatus,
        to_status: newStatus
      });

      // Audit log
      await auditService.log('case_status_changed', updatedBy, {
        case_id: caseId,
        from_status: oldStatus,
        to_status: newStatus
      });

      return await this.getCaseById(caseId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Assign case to user
   */
  static async assignCase(caseId, assigneeId, assignedBy, reason = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const currentCase = await Case.findByPk(caseId);
      if (!currentCase) {
        throw new Error('Case not found');
      }

      const oldAssignee = currentCase.assigned_to;
      
      // Update case assignment
      await currentCase.update({
        assigned_to: assigneeId,
        current_queue_id: null // Remove from queue when assigned
      }, { transaction });

      // Create status history for assignment
      await CaseStatusHistory.create({
        case_id: caseId,
        from_status: currentCase.status,
        to_status: currentCase.status,
        from_assignee: oldAssignee,
        to_assignee: assigneeId,
        change_reason: reason || 'Case assigned',
        changed_by: assignedBy
      }, { transaction });

      // Create note
      const assignee = await User.findByPk(assigneeId);
      await CaseNote.create({
        case_id: caseId,
        note_type: 'assignment',
        note_text: `Case assigned to ${assignee?.first_name} ${assignee?.last_name}${reason ? `: ${reason}` : ''}`,
        created_by: assignedBy
      }, { transaction });

      await transaction.commit();

      // Send notifications
      await this.sendCaseNotifications(caseId, 'assigned', assignedBy, {
        assignee_id: assigneeId
      });

      return await this.getCaseById(caseId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add note to case
   */
  static async addCaseNote(caseId, noteData, createdBy) {
    const note = await CaseNote.create({
      case_id: caseId,
      ...noteData,
      created_by: createdBy
    });

    // Audit log
    await auditService.log('case_note_added', createdBy, {
      case_id: caseId,
      note_id: note.id
    });

    return note;
  }

  /**
   * Get case by ID with all related data
   */
  static async getCaseById(caseId) {
    return await Case.findByPk(caseId, {
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
        },
        {
          model: CaseQueue,
          as: 'currentQueue',
          attributes: ['id', 'queue_name', 'queue_code']
        }
      ]
    });
  }

  /**
   * Get cases with filtering and pagination
   */
  static async getCases(filters = {}, pagination = {}) {
    const {
      status,
      priority,
      assigned_to,
      location_id,
      aging_status,
      queue_id,
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
    if (aging_status) where.aging_status = aging_status;
    if (queue_id) where.current_queue_id = queue_id;
    
    if (search) {
      where[Op.or] = [
        { case_number: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { customer_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: cases, count: total } = await Case.findAndCountAll({
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
        },
        {
          model: CaseQueue,
          as: 'currentQueue',
          attributes: ['id', 'queue_name', 'queue_code']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      cases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get queue cases for user
   */
  static async getQueueCases(userId, queueId = null) {
    // Get user's allowed queues
    const user = await User.findByPk(userId, {
      include: ['roles']
    });

    const userRoles = user.roles.map(role => role.name);
    
    let queueWhere = {
      is_active: true,
      allowed_roles: {
        [Op.overlap]: userRoles
      }
    };

    if (queueId) {
      queueWhere.id = queueId;
    }

    const queues = await CaseQueue.findAll({
      where: queueWhere
    });

    const queueIds = queues.map(q => q.id);

    return await Case.findAll({
      where: {
        current_queue_id: {
          [Op.in]: queueIds
        },
        assigned_to: null // Only unassigned cases
      },
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'code']
        },
        {
          model: CaseQueue,
          as: 'currentQueue',
          attributes: ['id', 'queue_name', 'queue_code']
        }
      ],
      order: [['priority', 'DESC'], ['created_at', 'ASC']]
    });
  }

  /**
   * Get case aging summary
   */
  static async getCaseAgingSummary(locationId = null) {
    const where = {};
    if (locationId) where.location_id = locationId;

    const summary = await Case.findAll({
      attributes: [
        'aging_status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        ...where,
        status: {
          [Op.ne]: 'closure'
        }
      },
      group: ['aging_status'],
      raw: true
    });

    return {
      green: summary.find(s => s.aging_status === 'green')?.count || 0,
      yellow: summary.find(s => s.aging_status === 'yellow')?.count || 0,
      red: summary.find(s => s.aging_status === 'red')?.count || 0
    };
  }

  /**
   * Update case aging status for all active cases
   */
  static async updateCaseAging() {
    const activeCases = await Case.findAll({
      where: {
        status: {
          [Op.ne]: 'closure'
        },
        due_date: {
          [Op.ne]: null
        }
      }
    });

    const now = new Date();
    const updates = [];

    for (const caseItem of activeCases) {
      const diffHours = (new Date(caseItem.due_date) - now) / (1000 * 60 * 60);
      let newStatus = 'green';
      let slaBreach = false;

      if (diffHours < 0) {
        newStatus = 'red';
        slaBreach = true;
      } else if (diffHours < 24) {
        newStatus = 'yellow';
      }

      if (caseItem.aging_status !== newStatus || caseItem.sla_breach !== slaBreach) {
        updates.push({
          id: caseItem.id,
          aging_status: newStatus,
          sla_breach: slaBreach
        });
      }
    }

    if (updates.length > 0) {
      await Promise.all(
        updates.map(update => 
          Case.update(
            { aging_status: update.aging_status, sla_breach: update.sla_breach },
            { where: { id: update.id } }
          )
        )
      );
    }

    return updates.length;
  }

  // Helper methods

  static getPriorityHours(priority) {
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
      'enquiry': ['estimation', 'rejected'],
      'estimation': ['quotation', 'enquiry', 'rejected'],
      'quotation': ['purchase_enquiry', 'estimation', 'rejected'],
      'purchase_enquiry': ['po_pi', 'quotation', 'rejected'],
      'po_pi': ['grn', 'purchase_enquiry', 'rejected'],
      'grn': ['manufacturing', 'po_pi'],
      'manufacturing': ['invoicing', 'grn'],
      'invoicing': ['closure', 'manufacturing'],
      'rejected': ['enquiry'], // Can restart from enquiry
      'on_hold': ['enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing']
    };

    return validTransitions[fromStatus]?.includes(toStatus) || toStatus === 'on_hold';
  }

  static async findQueueForStatus(status, locationId) {
    const queueMap = {
      'enquiry': 'ENQ',
      'estimation': 'EST',
      'quotation': 'QUO',
      'purchase_enquiry': 'PEN',
      'po_pi': 'POP',
      'grn': 'GRN',
      'manufacturing': 'MFG',
      'invoicing': 'INV'
    };

    const queueCode = queueMap[status];
    if (!queueCode) return null;

    return await CaseQueue.findOne({
      where: {
        queue_code: queueCode,
        location_id: locationId,
        is_active: true
      }
    });
  }

  static initializeWorkflowData() {
    const statuses = ['enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing', 'closure'];
    
    return {
      flowchart: {
        nodes: statuses.map((status, index) => ({
          id: status,
          label: status.replace('_', ' ').toUpperCase(),
          status: index === 0 ? 'current' : 'pending',
          completedAt: index === 0 ? new Date().toISOString() : null
        })),
        edges: statuses.slice(0, -1).map((status, index) => ({
          from: status,
          to: statuses[index + 1],
          status: 'pending'
        }))
      }
    };
  }

  static updateWorkflowData(currentData, newStatus) {
    const updated = { ...currentData };
    
    if (updated.flowchart && updated.flowchart.nodes) {
      updated.flowchart.nodes = updated.flowchart.nodes.map(node => {
        if (node.id === newStatus) {
          return {
            ...node,
            status: 'current',
            completedAt: new Date().toISOString()
          };
        } else if (node.status === 'current') {
          return {
            ...node,
            status: 'completed'
          };
        }
        return node;
      });
    }

    return updated;
  }

  static async sendCaseNotifications(caseId, event, userId, data = {}) {
    try {
      await notificationService.sendCaseNotification(caseId, event, userId, data);
    } catch (error) {
      console.error('Failed to send case notifications:', error);
    }
  }
}

module.exports = CaseService;
