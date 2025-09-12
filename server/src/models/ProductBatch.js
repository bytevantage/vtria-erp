/**
 * ProductBatch Model for VTRIA ERP
 * Tracks batches of products with common properties
 */

module.exports = (sequelize, DataTypes) => {
  const ProductBatch = sequelize.define('ProductBatch', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    batch_number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    supplier_id: {
      type: DataTypes.UUID,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    purchase_date: {
      type: DataTypes.DATE
    },
    expiry_date: {
      type: DataTypes.DATE
    },
    manufacture_date: {
      type: DataTypes.DATE
    },
    cost_price: {
      type: DataTypes.DECIMAL(15, 2)
    },
    quantity_received: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    quantity_remaining: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    vendor_warranty_days: {
      type: DataTypes.INTEGER
    },
    customer_warranty_days: {
      type: DataTypes.INTEGER
    },
    po_number: {
      type: DataTypes.STRING
    },
    invoice_number: {
      type: DataTypes.STRING
    },
    grn_number: {
      type: DataTypes.STRING
    },
    notes: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'product_batches',
    indexes: [
      { fields: ['product_id'] },
      { fields: ['batch_number'] },
      { fields: ['supplier_id'] },
      { fields: ['purchase_date'] },
      { fields: ['expiry_date'] },
      { fields: ['po_number'] },
      { fields: ['invoice_number'] }
    ]
  });

  return ProductBatch;
};
