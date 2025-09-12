/**
 * Product Model for VTRIA ERP
 * Manages product catalog with categories and specifications
 */

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    category_id: {
      type: DataTypes.UUID,
      references: {
        model: 'product_categories',
        key: 'id'
      }
    },
    manufacturer_id: {
      type: DataTypes.UUID,
      references: {
        model: 'manufacturers',
        key: 'id'
      }
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: 'PCS'
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    cost_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    min_stock_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    max_stock_level: {
      type: DataTypes.INTEGER
    },
    is_serialized: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    has_warranty: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    default_vendor_warranty_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    default_customer_warranty_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    specifications: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'products',
    indexes: [
      { fields: ['product_code'], unique: true },
      { fields: ['name'] },
      { fields: ['category_id'] },
      { fields: ['manufacturer_id'] },
      { fields: ['is_active'] }
    ]
  });

  return Product;
};
