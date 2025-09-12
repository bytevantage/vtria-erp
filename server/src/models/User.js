/**
 * User Model for VTRIA ERP
 * Supports multi-role users and location-based access control
 */

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // phone field removed as it doesn't exist in the database table
    // If you need to add this field, run a migration to add it to the users table first
    // phone: {
    //   type: DataTypes.STRING,
    //   validate: {
    //     is: /^[+]?[\d\s()-]+$/
    //   }
    // },
    employee_id: {
      type: DataTypes.STRING,
      unique: true
    },
    department: {
      type: DataTypes.STRING
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE
    },
    locations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['employee_id'] },
      { fields: ['is_active'] }
    ]
  });

  return User;
};
