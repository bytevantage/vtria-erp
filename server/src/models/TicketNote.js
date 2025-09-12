/**
 * Ticket Notes Model for VTRIA ERP
 * Append-only ticket notes with audit trail
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketNote = sequelize.define('TicketNote', {
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
  note_type: {
    type: DataTypes.ENUM('general', 'diagnosis', 'resolution', 'customer_communication', 'internal', 'system', 'warranty_check'),
    defaultValue: 'general'
  },
  note_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_internal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_customer_visible: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_resolution_note: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  time_spent_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Time spent on this activity in minutes'
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  diagnostic_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Diagnostic information, test results, measurements'
  },
  parts_used: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Parts or components used in resolution'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data like previous values for status changes'
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ticket_notes',
  timestamps: false, // Only created_at, no updates allowed
  indexes: [
    { fields: ['ticket_id'] },
    { fields: ['created_by'] },
    { fields: ['note_type'] },
    { fields: ['created_at'] },
    { fields: ['is_customer_visible'] },
    { fields: ['is_resolution_note'] }
  ]
});

module.exports = TicketNote;
