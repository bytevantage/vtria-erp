/**
 * Stock Model for VTRIA ERP
 * Multi-location inventory management
 */

module.exports = (sequelize, DataTypes) => {
  const Stock = sequelize.define('Stock', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    item_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    item_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    category: {
      type: DataTypes.STRING
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: 'PCS'
    },
    quantity: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0
    },
    min_stock_level: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0
    },
    max_stock_level: {
      type: DataTypes.DECIMAL(15, 3)
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    supplier: {
      type: DataTypes.STRING
    },
    location_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    last_updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'stock',
    indexes: [
      { fields: ['item_code', 'location_id'], unique: true },
      { fields: ['location_id'] },
      { fields: ['category'] },
      { fields: ['quantity'] }
    ]
  });

  return Stock;
};
