/**
 * Role Model for VTRIA ERP RBAC System
 * Defines user roles with hierarchical permissions
 */

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: 'Higher level = more authority (Director=5, Manager=4, Admin=3, Engineer=2, User=1)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'roles',
    indexes: [
      { fields: ['name'] },
      { fields: ['level'] }
    ]
  });

  return Role;
};
