/**
 * ProductCategory Model for VTRIA ERP
 * Manages hierarchical product categorization
 */

module.exports = (sequelize, DataTypes) => {
  const ProductCategory = sequelize.define('ProductCategory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    parent_id: {
      type: DataTypes.UUID,
      references: {
        model: 'product_categories',
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
    tableName: 'product_categories',
    indexes: [
      { fields: ['name'] },
      { fields: ['code'], unique: true },
      { fields: ['parent_id'] },
      { fields: ['is_active'] }
    ]
  });

  return ProductCategory;
};
