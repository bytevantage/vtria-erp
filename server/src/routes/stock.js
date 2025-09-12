/**
 * Stock Management Routes for VTRIA ERP
 * Comprehensive stock management with multi-location inventory tracking
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const stockController = require('../controllers/stockController');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all routes
// License middleware is applied globally in server.js
router.use(authenticate);

/**
 * @route   GET /api/stock/items
 * @desc    Get all stock items with pagination and filtering
 * @access  Private (All authenticated users)
 */
router.get('/items', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'REMOVED', 'DELETED']),
  query('location_id').optional().isUUID(),
  query('product_id').optional().isUUID(),
  query('sort_by').optional().isString(),
  query('sort_order').optional().isIn(['ASC', 'DESC'])
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getAllStockItems);

/**
 * @route   GET /api/stock/items/:id
 * @desc    Get a single stock item by ID
 * @access  Private (All authenticated users)
 */
router.get('/items/:id', [
  param('id').isUUID()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getStockItemById);

/**
 * @route   POST /api/stock/items
 * @desc    Create a new stock item
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.post('/items', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN']),
  body('product_id').isUUID().withMessage('Valid product ID is required'),
  body('location_id').isUUID().withMessage('Valid location ID is required'),
  body('serial_number').optional().isString().trim(),
  body('status').optional().isIn(['AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'REMOVED']),
  body('condition').optional().isIn(['NEW', 'USED', 'REFURBISHED', 'DAMAGED']),
  body('purchase_date').optional().isISO8601(),
  body('warranty_start_date').optional().isISO8601(),
  body('warranty_duration_months').optional().isInt({ min: 0 }),
  body('supplier_id').optional().isUUID(),
  body('purchase_price').optional().isFloat({ min: 0 }),
  body('metadata').optional().isObject()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.createStockItem);

/**
 * @route   PUT /api/stock/items/:id
 * @desc    Update an existing stock item
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.put('/items/:id', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN']),
  param('id').isUUID(),
  body('serial_number').optional().isString().trim(),
  body('status').optional().isIn(['AVAILABLE', 'ALLOCATED', 'IN_TRANSIT', 'REMOVED']),
  body('condition').optional().isIn(['NEW', 'USED', 'REFURBISHED', 'DAMAGED']),
  body('warranty_start_date').optional().isISO8601(),
  body('warranty_duration_months').optional().isInt({ min: 0 }),
  body('warranty_expiry_date').optional().isISO8601(),
  body('metadata').optional().isObject()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.updateStockItem);

/**
 * @route   DELETE /api/stock/items/:id
 * @desc    Delete a stock item (soft delete)
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.delete('/items/:id', [
  authorize(['DIRECTOR', 'MANAGER']),
  param('id').isUUID()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.deleteStockItem);

/**
 * @route   POST /api/stock/items/:id/transfer
 * @desc    Transfer stock item between locations
 * @access  Private (MANAGER, SALES_ADMIN, ENGINEER)
 */
router.post('/items/:id/transfer', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN', 'ENGINEER']),
  param('id').isUUID(),
  body('destination_location_id').isUUID().withMessage('Valid destination location ID is required'),
  body('notes').optional().isString()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.transferStockItem);

/**
 * @route   POST /api/stock/items/:id/allocate
 * @desc    Allocate stock item to a case or ticket
 * @access  Private (MANAGER, SALES_ADMIN, ENGINEER)
 */
router.post('/items/:id/allocate', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN', 'ENGINEER']),
  param('id').isUUID(),
  body('case_id').optional().isUUID(),
  body('ticket_id').optional().isUUID(),
  body('notes').optional().isString()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  // Check that either case_id or ticket_id is provided
  if (!req.body.case_id && !req.body.ticket_id) {
    return res.status(400).json({
      success: false,
      message: 'Either case_id or ticket_id must be provided'
    });
  }
  
  next();
}, stockController.allocateStockItem);

/**
 * @route   POST /api/stock/items/:id/deallocate
 * @desc    Deallocate stock item from a case or ticket
 * @access  Private (MANAGER, SALES_ADMIN, ENGINEER)
 */
router.post('/items/:id/deallocate', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN', 'ENGINEER']),
  param('id').isUUID(),
  body('notes').optional().isString()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.deallocateStockItem);

/**
 * @route   GET /api/stock/fifo-recommendations
 * @desc    Get FIFO stock recommendations for a product
 * @access  Private (All authenticated users)
 */
router.get('/fifo-recommendations', [
  query('product_id').isUUID().withMessage('Valid product ID is required'),
  query('location_id').optional().isUUID(),
  query('count').optional().isInt({ min: 1, max: 100 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getFifoRecommendations);

/**
 * @route   GET /api/stock/movements
 * @desc    Get stock movement history
 * @access  Private (All authenticated users)
 */
router.get('/movements', [
  query('stock_item_id').optional().isUUID(),
  query('product_id').optional().isUUID(),
  query('location_id').optional().isUUID(),
  query('movement_type').optional().isIn(['RECEIPT', 'TRANSFER', 'ALLOCATION', 'DEALLOCATION', 'REMOVAL']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort_by').optional().isString(),
  query('sort_order').optional().isIn(['ASC', 'DESC'])
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getStockMovementHistory);

/**
 * @route   GET /api/stock/levels/by-product
 * @desc    Get stock levels by product
 * @access  Private (All authenticated users)
 */
router.get('/levels/by-product', [
  query('location_id').optional().isUUID(),
  query('category_id').optional().isUUID()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getStockLevelsByProduct);

/**
 * @route   GET /api/stock/levels/by-location
 * @desc    Get stock levels by location
 * @access  Private (All authenticated users)
 */
router.get('/levels/by-location', [
  query('product_id').optional().isUUID()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getStockLevelsByLocation);

/**
 * @route   GET /api/stock/warranty/check
 * @desc    Check for expiring warranties
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.get('/warranty/check', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN']),
  query('short_term_days').optional().isInt({ min: 1, max: 90 }),
  query('medium_term_days').optional().isInt({ min: 1, max: 365 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.checkExpiringWarranties);

/**
 * @route   GET /api/stock/levels/check
 * @desc    Check stock levels
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.get('/levels/check', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN'])
], stockController.checkStockLevels);

/**
 * @route   GET /api/stock/dashboard
 * @desc    Generate stock dashboard data
 * @access  Private (All authenticated users)
 */
router.get('/dashboard', [
  query('period').optional().isIn(['daily', 'weekly', 'monthly']),
  query('limit').optional().isInt({ min: 1, max: 52 })
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
}, stockController.getStockDashboardData);

/**
 * @route   POST /api/stock/run-checks
 * @desc    Run manual stock checks
 * @access  Private (MANAGER, SALES_ADMIN)
 */
router.post('/run-checks', [
  authorize(['DIRECTOR', 'MANAGER', 'SALES_ADMIN'])
], stockController.runManualStockChecks);

module.exports = router;
