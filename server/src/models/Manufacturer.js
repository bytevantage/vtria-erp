/**
 * Manufacturer Model for VTRIA ERP
 * Manages product manufacturers information
 */

module.exports = (sequelize, DataTypes) => {
  const Manufacturer = sequelize.define('Manufacturer', {
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
    website: {
      type: DataTypes.STRING
    },
    contact_email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    contact_phone: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING
    },
    support_info: {
      type: DataTypes.TEXT
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    logo_url: {
      type: DataTypes.STRING
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
    tableName: 'manufacturers',
    indexes: [
      { fields: ['name'] },
      { fields: ['code'], unique: true },
      { fields: ['is_active'] }
    ]
  });

  return Manufacturer;
};
