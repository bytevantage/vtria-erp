const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CaseQueue = sequelize.define('CaseQueue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  queue_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  queue_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  allowed_roles: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  sla_hours: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  auto_assign: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  max_cases_per_user: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'case_queues',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['location_id']
    },
    {
      fields: ['department']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = CaseQueue;
