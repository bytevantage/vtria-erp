/**
 * Case Notes Model for VTRIA ERP
 * Append-only case notes with audit trail
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CaseNote = sequelize.define('CaseNote', {
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
  note_type: {
    type: DataTypes.ENUM('general', 'status_change', 'assignment', 'customer_communication', 'internal', 'system'),
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
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
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
  tableName: 'case_notes',
  timestamps: false, // Only created_at, no updates allowed
  indexes: [
    { fields: ['case_id'] },
    { fields: ['created_by'] },
    { fields: ['note_type'] },
    { fields: ['created_at'] },
    { fields: ['is_customer_visible'] }
  ]
});

module.exports = CaseNote;
