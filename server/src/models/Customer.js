/**
 * Customer Model for VTRIA ERP
 * Manages customer information for warranty tracking and sales
 */

module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define('Customer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    customer_code: {
      type: DataTypes.STRING,
      unique: true
    },
    contact_person: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    state: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING,
      defaultValue: 'India'
    },
    postal_code: {
      type: DataTypes.STRING
    },
    industry: {
      type: DataTypes.STRING
    },
    tax_id: {
      type: DataTypes.STRING
    },
    credit_limit: {
      type: DataTypes.DECIMAL(15, 2)
    },
    payment_terms: {
      type: DataTypes.STRING
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    },
    updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'customers',
    indexes: [
      { fields: ['name'] },
      { fields: ['customer_code'], unique: true },
      { fields: ['email'] },
      { fields: ['phone'] },
      { fields: ['is_active'] }
    ]
  });

  return Customer;
};
