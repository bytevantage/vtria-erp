/**
 * Ticket Parts Model for VTRIA ERP
 * Tracks parts/components used in ticket resolution
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketParts = sequelize.define('TicketParts', {
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
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  stock_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'stock_items',
      key: 'id'
    }
  },
  part_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  part_number: {
    type: DataTypes.STRING(50)
  },
  serial_number: {
    type: DataTypes.STRING(100)
  },
  quantity_used: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 1.00
  },
  unit_cost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  total_cost: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  part_type: {
    type: DataTypes.ENUM('replacement', 'consumable', 'tool', 'accessory'),
    defaultValue: 'replacement'
  },
  warranty_applicable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  warranty_period_months: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  supplier_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'suppliers',
      key: 'id'
    }
  },
  installation_date: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  },
  part_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional part specifications and metadata'
  },
  added_by: {
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
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ticket_parts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['ticket_id'] },
    { fields: ['product_id'] },
    { fields: ['stock_item_id'] },
    { fields: ['part_number'] },
    { fields: ['serial_number'] },
    { fields: ['added_by'] }
  ],
  hooks: {
    beforeSave: (instance) => {
      // Calculate total cost
      if (instance.quantity_used && instance.unit_cost) {
        instance.total_cost = instance.quantity_used * instance.unit_cost;
      }
    }
  }
});

module.exports = TicketParts;
