/**
 * AuditLog Model for VTRIA ERP
 * Tracks all user actions and system events for compliance and security
 */

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      // Nullable for system-generated events
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN)'
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of entity affected (e.g., Case, Ticket, Document)'
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID of the affected entity'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human-readable description of the action'
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    previous_state: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Previous state of the entity (for updates and deletes)'
    },
    new_state: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'New state of the entity (for creates and updates)'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional contextual information'
    },
    location_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'locations',
        key: 'id'
      },
      comment: 'Location where the action was performed'
    },
    severity: {
      type: DataTypes.ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL'),
      defaultValue: 'INFO',
      comment: 'Severity level of the audit event'
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true,
    // Don't allow updates to audit logs
    updatedAt: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['action'] },
      { fields: ['created_at'] },
      { fields: ['severity'] },
      { fields: ['location_id'] }
    ]
  });

  return AuditLog;
};
