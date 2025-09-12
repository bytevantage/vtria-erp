/**
 * Ticket Status History Model for VTRIA ERP
 * Tracks all status changes in the ticket lifecycle
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketStatusHistory = sequelize.define('TicketStatusHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticket_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id'
    }
  },
  from_status: {
    type: DataTypes.ENUM('support_ticket', 'diagnosis', 'resolution', 'closure', 'rejected', 'on_hold'),
    allowNull: true
  },
  to_status: {
    type: DataTypes.ENUM('support_ticket', 'diagnosis', 'resolution', 'closure', 'rejected', 'on_hold'),
    allowNull: false
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
  resolution_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Resolution details when moving to resolution status'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ticket_status_history',
  timestamps: false, // Only created_at
  indexes: [
    { fields: ['ticket_id'] },
    { fields: ['to_status'] },
    { fields: ['changed_by'] },
    { fields: ['created_at'] }
  ]
});

module.exports = TicketStatusHistory;
