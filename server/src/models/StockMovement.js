/**
 * StockMovement Model for VTRIA ERP
 * Tracks all stock transfers, allocations, and movements
 */

module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define('StockMovement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    movement_type: {
      type: DataTypes.ENUM(
        'purchase', 'sale', 'transfer', 'return', 
        'adjustment', 'allocation', 'deallocation', 'write_off'
      ),
      allowNull: false
    },
    stock_item_id: {
      type: DataTypes.UUID,
      references: {
        model: 'stock_items',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.UUID,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    quantity: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 1
    },
    source_location_id: {
      type: DataTypes.UUID,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    destination_location_id: {
      type: DataTypes.UUID,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    case_id: {
      type: DataTypes.UUID,
      references: {
        model: 'cases',
        key: 'id'
      }
    },
    ticket_id: {
      type: DataTypes.UUID,
      references: {
        model: 'tickets',
        key: 'id'
      }
    },
    reference_number: {
      type: DataTypes.STRING
    },
    reference_type: {
      type: DataTypes.STRING
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2)
    },
    total_price: {
      type: DataTypes.DECIMAL(15, 2)
    },
    notes: {
      type: DataTypes.TEXT
    },
    performed_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'rejected'),
      defaultValue: 'completed'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'stock_movements',
    indexes: [
      { fields: ['movement_type'] },
      { fields: ['stock_item_id'] },
      { fields: ['product_id'] },
      { fields: ['source_location_id'] },
      { fields: ['destination_location_id'] },
      { fields: ['case_id'] },
      { fields: ['ticket_id'] },
      { fields: ['reference_number'] },
      { fields: ['performed_by'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  return StockMovement;
};
