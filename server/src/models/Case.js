/**
 * Case Model for VTRIA ERP Queue-based Workflow
 * Manages case lifecycle: Enquiry → Estimation → Quotation → Purchase Enquiry → PO/PI → GRN → Manufacturing → Invoicing → Closure
 */

module.exports = (sequelize, DataTypes) => {
  const Case = sequelize.define('Case', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  case_number: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing', 'closure', 'rejected', 'on_hold'),
    defaultValue: 'enquiry'
  },
  current_queue_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'case_queues',
      key: 'id'
    }
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
    type: DataTypes.STRING(100)
  },
  customer_contact: {
    type: DataTypes.STRING(50)
  },
  customer_email: {
    type: DataTypes.STRING(100)
  },
  estimated_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  quoted_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  final_value: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  estimated_hours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  actual_hours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  due_date: {
    type: DataTypes.DATE
  },
  completion_date: {
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
  aging_status: {
    type: DataTypes.ENUM('green', 'yellow', 'red'),
    defaultValue: 'green'
  },
  sla_breach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rejection_reason: {
    type: DataTypes.TEXT
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  case_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Flexible storage for case-specific data like quotation details, PO numbers, etc.'
  },
  workflow_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Stores workflow progress and Chart.js flowchart data'
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
  tableName: 'cases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['case_number'] },
    { fields: ['status'] },
    { fields: ['priority'] },
    { fields: ['assigned_to'] },
    { fields: ['location_id'] },
    { fields: ['current_queue_id'] },
    { fields: ['customer_id'] },
    { fields: ['due_date'] },
    { fields: ['aging_status'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    beforeUpdate: async (instance) => {
      // Update aging status based on due date
      if (instance.due_date && instance.status !== 'closure') {
        const now = new Date();
        const dueDate = new Date(instance.due_date);
        const diffHours = (dueDate - now) / (1000 * 60 * 60);
        
        if (diffHours < 0) {
          instance.aging_status = 'red';
          instance.sla_breach = true;
        } else if (diffHours < 24) {
          instance.aging_status = 'yellow';
        } else {
          instance.aging_status = 'green';
        }
      }
    }
  }
});

  return Case;
};
