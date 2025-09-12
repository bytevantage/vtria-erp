/**
 * Database Models Index for VTRIA ERP
 * Centralizes all Sequelize models and their associations
 * Supports multi-location operations, RBAC, and stock management
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import all models - all models are function exports
const User = require('./User')(sequelize, DataTypes);
const Role = require('./Role')(sequelize, DataTypes);
const UserRole = require('./UserRole')(sequelize, DataTypes);
const Case = require('./Case')(sequelize, DataTypes);
const Stock = require('./Stock')(sequelize, DataTypes);
const Location = require('./Location')(sequelize, DataTypes);
const Document = require('./Document')(sequelize, DataTypes);
const Notification = require('./Notification')(sequelize, DataTypes);

// Import stock management models
const StockItem = require('./StockItem')(sequelize, DataTypes);
const StockMovement = require('./StockMovement')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const ProductBatch = require('./ProductBatch')(sequelize, DataTypes);
const ProductCategory = require('./ProductCategory')(sequelize, DataTypes);
const Manufacturer = require('./Manufacturer')(sequelize, DataTypes);
const Supplier = require('./Supplier')(sequelize, DataTypes);
const Customer = require('./Customer')(sequelize, DataTypes);

// Define associations
const defineAssociations = () => {
  // User-Role many-to-many relationship
  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id'
  });
  
  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id'
  });

  // User-Location many-to-many relationship
  User.belongsToMany(Location, {
    through: 'UserLocation',
    foreignKey: 'user_id',
    otherKey: 'location_id'
  });
  
  Location.belongsToMany(User, {
    through: 'UserLocation',
    foreignKey: 'location_id',
    otherKey: 'user_id'
  });

  // Case relationships
  Case.belongsTo(User, { as: 'assignedTo', foreignKey: 'assigned_to' });
  Case.belongsTo(User, { as: 'createdBy', foreignKey: 'created_by' });
  Case.belongsTo(Location, { foreignKey: 'location_id' });
  
  User.hasMany(Case, { as: 'assignedCases', foreignKey: 'assigned_to' });
  User.hasMany(Case, { as: 'createdCases', foreignKey: 'created_by' });
  Location.hasMany(Case, { foreignKey: 'location_id' });

  // Stock relationships
  Stock.belongsTo(Location, { foreignKey: 'location_id' });
  Stock.belongsTo(User, { as: 'lastUpdatedBy', foreignKey: 'last_updated_by' });
  
  Location.hasMany(Stock, { foreignKey: 'location_id' });
  User.hasMany(Stock, { as: 'updatedStock', foreignKey: 'last_updated_by' });

  // Document relationships
  Document.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploaded_by' });
  Document.belongsTo(Case, { foreignKey: 'case_id' });
  
  User.hasMany(Document, { as: 'uploadedDocuments', foreignKey: 'uploaded_by' });
  Case.hasMany(Document, { foreignKey: 'case_id' });

  // Notification relationships
  Notification.belongsTo(User, { as: 'recipient', foreignKey: 'user_id' });
  Notification.belongsTo(User, { as: 'sender', foreignKey: 'sender_id' });
  
  User.hasMany(Notification, { as: 'receivedNotifications', foreignKey: 'user_id' });
  User.hasMany(Notification, { as: 'sentNotifications', foreignKey: 'sender_id' });
};

// Initialize associations
defineAssociations();

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  Case,
  Stock,
  Location,
  Document,
  Notification,
  StockItem,
  StockMovement,
  Product,
  ProductBatch,
  ProductCategory,
  Manufacturer,
  Supplier,
  Customer
};
