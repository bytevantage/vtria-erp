/**
 * Case Status History Model for VTRIA ERP
 * Tracks all status changes in the case lifecycle
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CaseStatusHistory = sequelize.define('CaseStatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  case_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cases',
      key: 'id'
    }
  },
  from_status: {
    type: DataTypes.ENUM('enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing', 'closure', 'rejected', 'on_hold'),
    allowNull: true
  },
  to_status: {
    type: DataTypes.ENUM('enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing', 'closure', 'rejected', 'on_hold'),
    allowNull: false
  },
  from_queue_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'case_queues',
      key: 'id'
    }
  },
  to_queue_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'case_queues',
      key: 'id'
    }
  },
  from_assignee: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  to_assignee: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  change_reason: {
    type: DataTypes.TEXT
  },
  duration_hours: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Time spent in previous status'
  },
  changed_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  change_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data related to the status change'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'case_status_history',
  timestamps: false, // Only created_at
  indexes: [
    { fields: ['case_id'] },
    { fields: ['to_status'] },
    { fields: ['changed_by'] },
    { fields: ['created_at'] },
    { fields: ['to_queue_id'] }
  ]
});

module.exports = CaseStatusHistory;
