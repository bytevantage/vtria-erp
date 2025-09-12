/**
 * Ticket Model for VTRIA ERP Support System
 * Manages support tickets with queue-based workflow: Support Ticket → Diagnosis → Resolution → Closure
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticket_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('support_ticket', 'diagnosis', 'resolution', 'closure', 'rejected', 'on_hold'),
    defaultValue: 'support_ticket'
  },
  ticket_type: {
    type: DataTypes.ENUM('warranty', 'support', 'maintenance', 'installation', 'training'),
    defaultValue: 'support'
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  customer_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  customer_contact: {
    type: DataTypes.STRING(50)
  },
  customer_email: {
    type: DataTypes.STRING(100)
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  product_name: {
    type: DataTypes.STRING(100)
  },
  serial_number: {
    type: DataTypes.STRING(100)
  },
  stock_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'stock_items',
      key: 'id'
    }
  },
  warranty_status: {
    type: DataTypes.ENUM('in_warranty', 'expired', 'extended', 'not_applicable'),
    defaultValue: 'not_applicable'
  },
  warranty_expiry_date: {
    type: DataTypes.DATE
  },
  vendor_warranty_expiry: {
    type: DataTypes.DATE
  },
  customer_warranty_expiry: {
    type: DataTypes.DATE
  },
  warranty_remaining_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  issue_category: {
    type: DataTypes.STRING(50)
  },
  issue_severity: {
    type: DataTypes.ENUM('minor', 'major', 'critical', 'blocking'),
    defaultValue: 'minor'
  },
  resolution_time_hours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  estimated_resolution_date: {
    type: DataTypes.DATE
  },
  actual_resolution_date: {
    type: DataTypes.DATE
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  location_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'locations',
      key: 'id'
    }
  },
  related_case_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'cases',
      key: 'id'
    }
  },
  sla_breach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  customer_satisfaction: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  },
  resolution_summary: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  ticket_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Flexible storage for ticket-specific data like diagnostic results, parts used, etc.'
  },
  warranty_details: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Detailed warranty information including coverage, terms, and conditions'
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
  tableName: 'tickets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['ticket_number'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['assigned_to'] },
    { fields: ['location_id'] },
    { fields: ['customer_id'] },
    { fields: ['product_id'] },
    { fields: ['serial_number'] },
    { fields: ['warranty_status'] },
    { fields: ['created_at'] },
    { fields: ['ticket_type'] },
    { fields: ['issue_category'] }
  ],
  hooks: {
    beforeUpdate: async (instance) => {
      // Update warranty remaining days
      if (instance.warranty_expiry_date) {
        const now = new Date();
        const expiryDate = new Date(instance.warranty_expiry_date);
        const diffTime = expiryDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        instance.warranty_remaining_days = Math.max(0, diffDays);
        
        // Update warranty status
        if (diffDays <= 0) {
          instance.warranty_status = 'expired';
        } else if (diffDays <= 30) {
          instance.warranty_status = 'in_warranty'; // Expiring soon
        } else {
          instance.warranty_status = 'in_warranty';
        }
      }
    }
  }
});

module.exports = Ticket;
