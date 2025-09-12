/**
 * Model Associations for VTRIA ERP System
 * Defines relationships between case, ticket, and stock management models
 */

const Case = require('./Case');
const CaseNote = require('./CaseNote');
const CaseStatusHistory = require('./CaseStatusHistory');
const CaseQueue = require('./CaseQueue');
const Ticket = require('./Ticket');
const TicketNote = require('./TicketNote');
const TicketStatusHistory = require('./TicketStatusHistory');
const TicketParts = require('./TicketParts');
const User = require('./User');
const Location = require('./Location');
const Document = require('./Document');
const DocumentVersion = require('./DocumentVersion');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');

// Stock Management Models
const Stock = require('./Stock');
const StockItem = require('./StockItem');
const StockMovement = require('./StockMovement');
const Product = require('./Product');
const ProductBatch = require('./ProductBatch');
const ProductCategory = require('./ProductCategory');
const Manufacturer = require('./Manufacturer');
const Supplier = require('./Supplier');
const Customer = require('./Customer');

// Case associations
Case.belongsTo(User, { 
  foreignKey: 'assigned_to', 
  as: 'assignedUser',
  allowNull: true 
});

Case.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'createdUser' 
});

Case.belongsTo(Location, { 
  foreignKey: 'location_id', 
  as: 'location' 
});

Case.belongsTo(CaseQueue, { 
  foreignKey: 'current_queue_id', 
  as: 'currentQueue',
  allowNull: true 
});

// Case Notes associations
CaseNote.belongsTo(Case, { 
  foreignKey: 'case_id', 
  as: 'case' 
});

CaseNote.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Case.hasMany(CaseNote, { 
  foreignKey: 'case_id', 
  as: 'notes' 
});

// Case Status History associations
CaseStatusHistory.belongsTo(Case, { 
  foreignKey: 'case_id', 
  as: 'case' 
});

CaseStatusHistory.belongsTo(User, { 
  foreignKey: 'changed_by', 
  as: 'changedBy' 
});

CaseStatusHistory.belongsTo(User, { 
  foreignKey: 'from_assignee', 
  as: 'fromAssignee',
  allowNull: true 
});

CaseStatusHistory.belongsTo(User, { 
  foreignKey: 'to_assignee', 
  as: 'toAssignee',
  allowNull: true 
});

CaseStatusHistory.belongsTo(CaseQueue, { 
  foreignKey: 'from_queue_id', 
  as: 'fromQueue',
  allowNull: true 
});

CaseStatusHistory.belongsTo(CaseQueue, { 
  foreignKey: 'to_queue_id', 
  as: 'toQueue',
  allowNull: true 
});

Case.hasMany(CaseStatusHistory, { 
  foreignKey: 'case_id', 
  as: 'statusHistory' 
});

// Case Queue associations
CaseQueue.belongsTo(Location, { 
  foreignKey: 'location_id', 
  as: 'location' 
});

CaseQueue.hasMany(Case, { 
  foreignKey: 'current_queue_id', 
  as: 'cases' 
});

Location.hasMany(CaseQueue, { 
  foreignKey: 'location_id', 
  as: 'queues' 
});

// User associations with cases
User.hasMany(Case, { 
  foreignKey: 'assigned_to', 
  as: 'assignedCases' 
});

User.hasMany(Case, { 
  foreignKey: 'created_by', 
  as: 'createdCases' 
});

User.hasMany(CaseNote, { 
  foreignKey: 'created_by', 
  as: 'caseNotes' 
});

User.hasMany(CaseStatusHistory, { 
  foreignKey: 'changed_by', 
  as: 'statusChanges' 
});

// Ticket associations
Ticket.belongsTo(User, { 
  foreignKey: 'assigned_to', 
  as: 'assignedUser',
  allowNull: true 
});

Ticket.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'createdUser' 
});

Ticket.belongsTo(Location, { 
  foreignKey: 'location_id', 
  as: 'location' 
});

Ticket.belongsTo(Case, { 
  foreignKey: 'related_case_id', 
  as: 'relatedCase',
  allowNull: true 
});

// Ticket Notes associations
TicketNote.belongsTo(Ticket, { 
  foreignKey: 'ticket_id', 
  as: 'ticket' 
});

TicketNote.belongsTo(User, { 
  foreignKey: 'created_by', 
  as: 'creator' 
});

Ticket.hasMany(TicketNote, { 
  foreignKey: 'ticket_id', 
  as: 'notes' 
});

// Ticket Status History associations
TicketStatusHistory.belongsTo(Ticket, { 
  foreignKey: 'ticket_id', 
  as: 'ticket' 
});

TicketStatusHistory.belongsTo(User, { 
  foreignKey: 'changed_by', 
  as: 'changedByUser' 
});

TicketStatusHistory.belongsTo(User, { 
  foreignKey: 'from_assignee', 
  as: 'fromAssigneeUser',
  allowNull: true 
});

TicketStatusHistory.belongsTo(User, { 
  foreignKey: 'to_assignee', 
  as: 'toAssigneeUser',
  allowNull: true 
});

Ticket.hasMany(TicketStatusHistory, { 
  foreignKey: 'ticket_id', 
  as: 'statusHistory' 
});

// Ticket Parts associations
TicketParts.belongsTo(Ticket, { 
  foreignKey: 'ticket_id', 
  as: 'ticket' 
});

TicketParts.belongsTo(User, { 
  foreignKey: 'added_by', 
  as: 'addedByUser' 
});

Ticket.hasMany(TicketParts, { 
  foreignKey: 'ticket_id', 
  as: 'parts' 
});

// User associations with tickets
User.hasMany(Ticket, { 
  foreignKey: 'assigned_to', 
  as: 'assignedTickets' 
});

User.hasMany(Ticket, { 
  foreignKey: 'created_by', 
  as: 'createdTickets' 
});

User.hasMany(TicketNote, { 
  foreignKey: 'created_by', 
  as: 'ticketNotes' 
});

User.hasMany(TicketStatusHistory, { 
  foreignKey: 'changed_by', 
  as: 'ticketStatusChanges' 
});

User.hasMany(TicketParts, { 
  foreignKey: 'added_by', 
  as: 'addedParts' 
});

// Location associations with tickets
Location.hasMany(Ticket, { 
  foreignKey: 'location_id', 
  as: 'tickets' 
});

// Case-Ticket relationship
Case.hasMany(Ticket, { 
  foreignKey: 'related_case_id', 
  as: 'relatedTickets' 
});

// Stock Management Associations

// Product Category associations
ProductCategory.belongsTo(ProductCategory, {
  foreignKey: 'parent_id',
  as: 'parentCategory'
});

ProductCategory.hasMany(ProductCategory, {
  foreignKey: 'parent_id',
  as: 'childCategories'
});

ProductCategory.hasMany(Product, {
  foreignKey: 'category_id',
  as: 'products'
});

// Product associations
Product.belongsTo(ProductCategory, {
  foreignKey: 'category_id',
  as: 'category'
});

Product.belongsTo(Manufacturer, {
  foreignKey: 'manufacturer_id',
  as: 'manufacturer'
});

Product.hasMany(ProductBatch, {
  foreignKey: 'product_id',
  as: 'batches'
});

Product.hasMany(StockItem, {
  foreignKey: 'product_id',
  as: 'stockItems'
});

Manufacturer.hasMany(Product, {
  foreignKey: 'manufacturer_id',
  as: 'products'
});

// Product Batch associations
ProductBatch.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

ProductBatch.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

ProductBatch.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'createdBy'
});

ProductBatch.hasMany(StockItem, {
  foreignKey: 'batch_id',
  as: 'stockItems'
});

// Stock Item associations
StockItem.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

StockItem.belongsTo(ProductBatch, {
  foreignKey: 'batch_id',
  as: 'batch'
});

StockItem.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location'
});

StockItem.belongsTo(Supplier, {
  foreignKey: 'supplier_id',
  as: 'supplier'
});

StockItem.belongsTo(Customer, {
  foreignKey: 'customer_id',
  as: 'customer'
});

StockItem.belongsTo(Case, {
  foreignKey: 'case_id',
  as: 'case'
});

StockItem.belongsTo(Ticket, {
  foreignKey: 'ticket_id',
  as: 'ticket'
});

StockItem.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'createdBy'
});

StockItem.belongsTo(User, {
  foreignKey: 'updated_by',
  as: 'updatedBy'
});

StockItem.hasMany(StockMovement, {
  foreignKey: 'stock_item_id',
  as: 'movements'
});

// Stock Movement associations
StockMovement.belongsTo(StockItem, {
  foreignKey: 'stock_item_id',
  as: 'stockItem'
});

StockMovement.belongsTo(Product, {
  foreignKey: 'product_id',
  as: 'product'
});

StockMovement.belongsTo(Location, {
  foreignKey: 'source_location_id',
  as: 'sourceLocation'
});

StockMovement.belongsTo(Location, {
  foreignKey: 'destination_location_id',
  as: 'destinationLocation'
});

StockMovement.belongsTo(Case, {
  foreignKey: 'case_id',
  as: 'case'
});

StockMovement.belongsTo(Ticket, {
  foreignKey: 'ticket_id',
  as: 'ticket'
});

StockMovement.belongsTo(User, {
  foreignKey: 'performed_by',
  as: 'performedBy'
});

StockMovement.belongsTo(User, {
  foreignKey: 'approved_by',
  as: 'approvedBy'
});

// Supplier and Customer associations
Supplier.hasMany(ProductBatch, {
  foreignKey: 'supplier_id',
  as: 'productBatches'
});

Supplier.hasMany(StockItem, {
  foreignKey: 'supplier_id',
  as: 'stockItems'
});

Customer.hasMany(StockItem, {
  foreignKey: 'customer_id',
  as: 'stockItems'
});

// Case and Ticket associations with Stock Items
Case.hasMany(StockItem, {
  foreignKey: 'case_id',
  as: 'stockItems'
});

Ticket.hasMany(StockItem, {
  foreignKey: 'ticket_id',
  as: 'stockItems'
});

Case.hasMany(StockMovement, {
  foreignKey: 'case_id',
  as: 'stockMovements'
});

Ticket.hasMany(StockMovement, {
  foreignKey: 'ticket_id',
  as: 'stockMovements'
});

// Location associations with Stock Items
Location.hasMany(StockItem, {
  foreignKey: 'location_id',
  as: 'stockItems'
});

// Document associations
Document.belongsTo(User, {
  foreignKey: 'uploaded_by',
  as: 'uploadedBy'
});

Document.belongsTo(Case, {
  foreignKey: 'case_id',
  as: 'case',
  allowNull: true
});

Document.belongsTo(Ticket, {
  foreignKey: 'ticket_id',
  as: 'ticket',
  allowNull: true
});

Document.hasMany(DocumentVersion, {
  foreignKey: 'document_id',
  as: 'versions'
});

// Document Version associations
DocumentVersion.belongsTo(Document, {
  foreignKey: 'document_id',
  as: 'document'
});

DocumentVersion.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'createdBy'
});

// User associations with documents
User.hasMany(Document, {
  foreignKey: 'uploaded_by',
  as: 'uploadedDocuments'
});

User.hasMany(DocumentVersion, {
  foreignKey: 'created_by',
  as: 'documentVersions'
});

// Case associations with documents
Case.hasMany(Document, {
  foreignKey: 'case_id',
  as: 'documents'
});

// Ticket associations with documents
Ticket.hasMany(Document, {
  foreignKey: 'ticket_id',
  as: 'documents'
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Notification.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender',
  allowNull: true
});

User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications'
});

User.hasMany(Notification, {
  foreignKey: 'sender_id',
  as: 'sentNotifications'
});

// AuditLog associations
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  allowNull: true
});

AuditLog.belongsTo(Location, {
  foreignKey: 'location_id',
  as: 'location',
  allowNull: true
});

User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'auditLogs'
});

Location.hasMany(AuditLog, {
  foreignKey: 'location_id',
  as: 'auditLogs'
});

module.exports = {
  Case,
  CaseNote,
  CaseStatusHistory,
  CaseQueue,
  Ticket,
  TicketNote,
  TicketStatusHistory,
  TicketParts,
  User,
  Location,
  Stock,
  StockItem,
  StockMovement,
  Product,
  ProductBatch,
  ProductCategory,
  Manufacturer,
  Supplier,
  Customer,
  Document,
  DocumentVersion,
  Notification,
  AuditLog
};
