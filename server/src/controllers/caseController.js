/**
 * Case Controller for VTRIA ERP
 * Handles HTTP requests for case lifecycle management
 */

const CaseService = require('../services/caseService');
const CaseNote = require('../models/CaseNote');
const CaseStatusHistory = require('../models/CaseStatusHistory');
const auditService = require('../services/auditService');

class CaseController {
  /**
   * Create new case
   * POST /api/cases
   */
  static async createCase(req, res) {
    try {
      const { title, description, priority, customer_name, customer_contact, customer_email, estimated_value, tags, case_data } = req.body;
      
      // Validation
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Title and description are required'
        });
      }

      const caseData = {
        title,
        description,
        priority: priority || 'medium',
        customer_name,
        customer_contact,
        customer_email,
        estimated_value: estimated_value || 0,
        location_id: req.user.location_id,
        tags: tags || [],
        case_data: case_data || {}
      };

      const newCase = await CaseService.createCase(caseData, req.user.id);

      // Audit log
      await auditService.log('case_created', req.user.id, {
        case_id: newCase.id,
        case_number: newCase.case_number
      }, req.ip);

      res.status(201).json({
        success: true,
        data: newCase,
        message: 'Case created successfully'
      });

    } catch (error) {
      console.error('Create case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create case'
      });
    }
  }

  /**
   * Get cases with filtering and pagination
   * GET /api/cases
   */
  static async getCases(req, res) {
    try {
      const {
        status,
        priority,
        assigned_to,
        location_id,
        aging_status,
        queue_id,
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'DESC'
      } = req.query;

      // Role-based filtering
      const filters = {
        status,
        priority,
        assigned_to,
        aging_status,
        queue_id,
        search
      };

      // Location filtering based on user role
      if (req.user.roles.some(role => ['Director'].includes(role.name))) {
        // Directors can see all locations
        if (location_id) filters.location_id = location_id;
      } else {
        // Others can only see their location
        filters.location_id = req.user.location_id;
      }

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: sort_by,
        sortOrder: sort_order.toUpperCase()
      };

      const result = await CaseService.getCases(filters, pagination);

      res.json({
        success: true,
        data: result.cases,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Get cases error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch cases'
      });
    }
  }

  /**
   * Get case by ID
   * GET /api/cases/:id
   */
  static async getCaseById(req, res) {
    try {
      const { id } = req.params;
      const caseItem = await CaseService.getCaseById(id);

      if (!caseItem) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      // Check access permissions
      if (!req.user.roles.some(role => ['Director'].includes(role.name))) {
        if (caseItem.location_id !== req.user.location_id) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      res.json({
        success: true,
        data: caseItem
      });

    } catch (error) {
      console.error('Get case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch case'
      });
    }
  }

  /**
   * Update case status
   * PUT /api/cases/:id/status
   */
  static async updateCaseStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason, case_data } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      // Check if user can update status
      const caseItem = await CaseService.getCaseById(id);
      if (!caseItem) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      // Role-based status update permissions
      const canUpdate = await this.canUpdateCaseStatus(req.user, caseItem, status);
      if (!canUpdate.allowed) {
        return res.status(403).json({
          success: false,
          error: canUpdate.reason
        });
      }

      const additionalData = {};
      if (case_data) additionalData.case_data = { ...caseItem.case_data, ...case_data };

      const updatedCase = await CaseService.updateCaseStatus(id, status, req.user.id, reason, additionalData);

      // Audit log
      await auditService.log('case_status_changed', req.user.id, {
        case_id: id,
        from_status: caseItem.status,
        to_status: status
      }, req.ip);

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case status updated successfully'
      });

    } catch (error) {
      console.error('Update case status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update case status'
      });
    }
  }

  /**
   * Assign case to user
   * PUT /api/cases/:id/assign
   */
  static async assignCase(req, res) {
    try {
      const { id } = req.params;
      const { assignee_id, reason } = req.body;

      if (!assignee_id) {
        return res.status(400).json({
          success: false,
          error: 'Assignee ID is required'
        });
      }

      // Check assignment permissions
      const canAssign = await this.canAssignCase(req.user);
      if (!canAssign) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to assign cases'
        });
      }

      const updatedCase = await CaseService.assignCase(id, assignee_id, req.user.id, reason);

      // Audit log
      await auditService.log('case_assigned', req.user.id, {
        case_id: id,
        assignee_id: assignee_id
      }, req.ip);

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case assigned successfully'
      });

    } catch (error) {
      console.error('Assign case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assign case'
      });
    }
  }

  /**
   * Pick case from queue
   * PUT /api/cases/:id/pick
   */
  static async pickCase(req, res) {
    try {
      const { id } = req.params;
      
      const updatedCase = await CaseService.assignCase(id, req.user.id, req.user.id, 'Picked from queue');

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case picked successfully'
      });

    } catch (error) {
      console.error('Pick case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to pick case'
      });
    }
  }

  /**
   * Reject case
   * PUT /api/cases/:id/reject
   */
  static async rejectCase(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      const updatedCase = await CaseService.updateCaseStatus(
        id, 
        'rejected', 
        req.user.id, 
        reason,
        { rejection_reason: reason }
      );

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case rejected successfully'
      });

    } catch (error) {
      console.error('Reject case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reject case'
      });
    }
  }

  /**
   * Close case
   * PUT /api/cases/:id/close
   */
  static async closeCase(req, res) {
    try {
      const { id } = req.params;
      const { reason, final_value, actual_hours } = req.body;

      const additionalData = {};
      if (final_value !== undefined) additionalData.final_value = final_value;
      if (actual_hours !== undefined) additionalData.actual_hours = actual_hours;

      const updatedCase = await CaseService.updateCaseStatus(
        id, 
        'closure', 
        req.user.id, 
        reason || 'Case completed',
        additionalData
      );

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case closed successfully'
      });

    } catch (error) {
      console.error('Close case error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to close case'
      });
    }
  }

  /**
   * Add note to case
   * POST /api/cases/:id/notes
   */
  static async addCaseNote(req, res) {
    try {
      const { id } = req.params;
      const { note_text, note_type = 'general', is_internal = false, is_customer_visible = false, attachments } = req.body;

      if (!note_text) {
        return res.status(400).json({
          success: false,
          error: 'Note text is required'
        });
      }

      const noteData = {
        note_text,
        note_type,
        is_internal,
        is_customer_visible,
        attachments: attachments || []
      };

      const note = await CaseService.addCaseNote(id, noteData, req.user.id);

      res.status(201).json({
        success: true,
        data: note,
        message: 'Note added successfully'
      });

    } catch (error) {
      console.error('Add case note error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add note'
      });
    }
  }

  /**
   * Get case notes
   * GET /api/cases/:id/notes
   */
  static async getCaseNotes(req, res) {
    try {
      const { id } = req.params;
      const { include_internal = false } = req.query;

      const where = { case_id: id };
      
      // Filter internal notes based on user role
      if (!include_internal || !req.user.roles.some(role => ['Manager', 'Director'].includes(role.name))) {
        where.is_internal = false;
      }

      const notes = await CaseNote.findAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name']
        }],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: notes
      });

    } catch (error) {
      console.error('Get case notes error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch notes'
      });
    }
  }

  /**
   * Get case status history
   * GET /api/cases/:id/history
   */
  static async getCaseHistory(req, res) {
    try {
      const { id } = req.params;

      const history = await CaseStatusHistory.findAll({
        where: { case_id: id },
        include: [
          {
            model: User,
            as: 'changedBy',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'fromAssignee',
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: User,
            as: 'toAssignee',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Get case history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch case history'
      });
    }
  }

  /**
   * Get queue cases
   * GET /api/cases/queue/:queueId?
   */
  static async getQueueCases(req, res) {
    try {
      const { queueId } = req.params;
      
      const cases = await CaseService.getQueueCases(req.user.id, queueId || null);

      res.json({
        success: true,
        data: cases
      });

    } catch (error) {
      console.error('Get queue cases error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch queue cases'
      });
    }
  }

  /**
   * Get case aging summary
   * GET /api/cases/aging/summary
   */
  static async getCaseAgingSummary(req, res) {
    try {
      const { location_id } = req.query;
      
      // Directors can see all locations, others only their location
      const locationFilter = req.user.roles.some(role => ['Director'].includes(role.name))
        ? location_id
        : req.user.location_id;

      const summary = await CaseService.getCaseAgingSummary(locationFilter);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('Get case aging summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch aging summary'
      });
    }
  }

  /**
   * Get case workflow data for Chart.js
   * GET /api/cases/:id/workflow
   */
  static async getCaseWorkflow(req, res) {
    try {
      const { id } = req.params;
      
      const caseItem = await CaseService.getCaseById(id);
      if (!caseItem) {
        return res.status(404).json({
          success: false,
          error: 'Case not found'
        });
      }

      // Generate Chart.js compatible data
      const workflowData = this.generateChartJsWorkflowData(caseItem);

      res.json({
        success: true,
        data: workflowData
      });

    } catch (error) {
      console.error('Get case workflow error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch workflow data'
      });
    }
  }

  // Helper methods

  /**
   * Check if user can update case status
   */
  static async canUpdateCaseStatus(user, caseItem, newStatus) {
    const userRoles = user.roles.map(role => role.name);

    // Directors and Managers can update any status
    if (userRoles.some(role => ['Director', 'Manager'].includes(role))) {
      return { allowed: true };
    }

    // Sales Admin can handle enquiry, quotation, invoicing
    if (userRoles.includes('Sales Admin')) {
      const allowedStatuses = ['enquiry', 'quotation', 'invoicing', 'closure'];
      if (allowedStatuses.includes(newStatus)) {
        return { allowed: true };
      }
    }

    // Engineers can handle technical statuses
    if (userRoles.includes('Engineer')) {
      const allowedStatuses = ['estimation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing'];
      if (allowedStatuses.includes(newStatus)) {
        return { allowed: true };
      }
    }

    // Assigned user can update their case
    if (caseItem.assigned_to === user.id) {
      return { allowed: true };
    }

    return { 
      allowed: false, 
      reason: 'You do not have permission to update this case status' 
    };
  }

  /**
   * Check if user can assign cases
   */
  static async canAssignCase(user) {
    const userRoles = user.roles.map(role => role.name);
    return userRoles.some(role => ['Director', 'Manager'].includes(role));
  }

  /**
   * Generate Chart.js workflow data
   */
  static generateChartJsWorkflowData(caseItem) {
    const statuses = [
      { key: 'enquiry', label: 'Enquiry', color: '#2196F3' },
      { key: 'estimation', label: 'Estimation', color: '#FF9800' },
      { key: 'quotation', label: 'Quotation', color: '#9C27B0' },
      { key: 'purchase_enquiry', label: 'Purchase Enquiry', color: '#607D8B' },
      { key: 'po_pi', label: 'PO/PI', color: '#795548' },
      { key: 'grn', label: 'GRN', color: '#009688' },
      { key: 'manufacturing', label: 'Manufacturing', color: '#FF5722' },
      { key: 'invoicing', label: 'Invoicing', color: '#8BC34A' },
      { key: 'closure', label: 'Closure', color: '#4CAF50' }
    ];

    const currentStatusIndex = statuses.findIndex(s => s.key === caseItem.status);
    
    return {
      type: 'bar',
      data: {
        labels: statuses.map(s => s.label),
        datasets: [{
          label: 'Case Progress',
          data: statuses.map((status, index) => {
            if (index < currentStatusIndex) return 100; // Completed
            if (index === currentStatusIndex) return 50; // Current
            return 0; // Pending
          }),
          backgroundColor: statuses.map((status, index) => {
            if (index < currentStatusIndex) return '#4CAF50'; // Green for completed
            if (index === currentStatusIndex) return '#FF9800'; // Orange for current
            return '#E0E0E0'; // Gray for pending
          }),
          borderColor: statuses.map(s => s.color),
          borderWidth: 2
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Case ${caseItem.case_number} - Workflow Progress`
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    };
  }
}

module.exports = CaseController;
