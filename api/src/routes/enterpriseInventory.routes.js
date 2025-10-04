const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const enterpriseInventoryController = require('../controllers/enterpriseInventory.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const validateInventoryItem = [
  body('item_code').notEmpty().withMessage('Item code is required'),
  body('item_name').notEmpty().withMessage('Item name is required'),
  body('category_id').isInt().withMessage('Category ID must be a number'),
  body('unit_of_measurement').notEmpty().withMessage('Unit of measurement is required'),
  body('unit_cost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be positive'),
  body('reorder_level').optional().isInt({ min: 0 }).withMessage('Reorder level must be positive'),
  body('max_stock_level').optional().isInt({ min: 0 }).withMessage('Max stock level must be positive')
];

const validateStockAdjustment = [
  body('item_id').isInt().withMessage('Item ID is required'),
  body('location_id').isInt().withMessage('Location ID is required'),
  body('adjustment_type').isIn(['increase', 'decrease']).withMessage('Invalid adjustment type'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive'),
  body('reason').notEmpty().withMessage('Reason is required')
];

const validateStockTransfer = [
  body('item_id').isInt().withMessage('Item ID is required'),
  body('from_location_id').isInt().withMessage('From location ID is required'),
  body('to_location_id').isInt().withMessage('To location ID is required'),
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be positive')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     EnterpriseInventoryItem:
 *       type: object
 *       required:
 *         - item_code
 *         - item_name
 *         - category_id
 *         - unit_of_measurement
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         item_code:
 *           type: string
 *           description: Unique item code
 *         item_name:
 *           type: string
 *           description: Item name
 *         description:
 *           type: string
 *           description: Item description
 *         category_id:
 *           type: integer
 *           description: Category ID
 *         unit_of_measurement:
 *           type: string
 *           description: Unit of measurement
 *         unit_cost:
 *           type: number
 *           description: Unit cost
 *         reorder_level:
 *           type: number
 *           description: Reorder level
 *         max_stock_level:
 *           type: number
 *           description: Maximum stock level
 *         abc_classification:
 *           type: string
 *           enum: [A, B, C]
 *           description: ABC classification
 *         status:
 *           type: string
 *           enum: [active, inactive, discontinued]
 *           description: Item status
 */

// ====================
// Dashboard & Analytics Routes
// ====================

/**
 * @swagger
 * /api/enterprise-inventory/dashboard:
 *   get:
 *     summary: Get enterprise inventory dashboard
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authMiddleware.verifyToken, enterpriseInventoryController.getDashboard);

/**
 * @swagger
 * /api/enterprise-inventory/analytics:
 *   get:
 *     summary: Get advanced inventory analytics
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: integer
 *         description: Location ID for filtering
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 */
router.get('/analytics', authMiddleware.verifyToken, enterpriseInventoryController.getAnalytics);

// ====================
// Inventory Items Routes
// ====================

/**
 * @swagger
 * /api/enterprise-inventory/items:
 *   get:
 *     summary: Get inventory items with advanced filtering
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Category ID filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: integer
 *         description: Location ID filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, low_stock, overstock, out_of_stock]
 *         description: Status filter
 *       - in: query
 *         name: abcClass
 *         schema:
 *           type: string
 *           enum: [A, B, C]
 *         description: ABC classification filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Inventory items retrieved successfully
 *   post:
 *     summary: Create new inventory item
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnterpriseInventoryItem'
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         description: Validation error
 */
router.get('/items', authMiddleware.verifyToken, enterpriseInventoryController.getInventoryItems);
router.post('/items', authMiddleware.verifyToken, validateInventoryItem, enterpriseInventoryController.createInventoryItem);

/**
 * @swagger
 * /api/enterprise-inventory/items/{id}:
 *   put:
 *     summary: Update inventory item
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnterpriseInventoryItem'
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       404:
 *         description: Item not found
 */
router.put('/items/:id', authMiddleware.verifyToken, validateInventoryItem, enterpriseInventoryController.updateInventoryItem);

// ====================
// Stock Operations Routes
// ====================

/**
 * @swagger
 * /api/enterprise-inventory/stock/adjust:
 *   post:
 *     summary: Adjust stock levels
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_id
 *               - location_id
 *               - adjustment_type
 *               - quantity
 *               - reason
 *             properties:
 *               item_id:
 *                 type: integer
 *               location_id:
 *                 type: integer
 *               adjustment_type:
 *                 type: string
 *                 enum: [increase, decrease]
 *               quantity:
 *                 type: number
 *               reason:
 *                 type: string
 *               unit_cost:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock adjustment completed successfully
 *       400:
 *         description: Validation error
 */
router.post('/stock/adjust', authMiddleware.verifyToken, validateStockAdjustment, enterpriseInventoryController.adjustStock);

/**
 * @swagger
 * /api/enterprise-inventory/stock/transfer:
 *   post:
 *     summary: Transfer stock between locations
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_id
 *               - from_location_id
 *               - to_location_id
 *               - quantity
 *             properties:
 *               item_id:
 *                 type: integer
 *               from_location_id:
 *                 type: integer
 *               to_location_id:
 *                 type: integer
 *               quantity:
 *                 type: number
 *               notes:
 *                 type: string
 *               transfer_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Stock transfer completed successfully
 *       400:
 *         description: Validation error or insufficient stock
 */
router.post('/stock/transfer', authMiddleware.verifyToken, validateStockTransfer, enterpriseInventoryController.transferStock);

// ====================
// Automation & Alerts Routes
// ====================

/**
 * @swagger
 * /api/enterprise-inventory/reorder-recommendations:
 *   get:
 *     summary: Get automated reorder recommendations
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reorder recommendations retrieved successfully
 */
router.get('/reorder-recommendations', authMiddleware.verifyToken, enterpriseInventoryController.getReorderRecommendations);

/**
 * @swagger
 * /api/enterprise-inventory/alerts:
 *   get:
 *     summary: Get stock alerts and notifications
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stock alerts retrieved successfully
 */
router.get('/alerts', authMiddleware.verifyToken, enterpriseInventoryController.getStockAlerts);

// ====================
// Barcode & Mobile Operations Routes
// ====================

/**
 * @swagger
 * /api/enterprise-inventory/barcode/generate/{item_id}:
 *   get:
 *     summary: Generate barcode for inventory item
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: item_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Barcode generated successfully
 *       404:
 *         description: Item not found
 */
router.get('/barcode/generate/:item_id', authMiddleware.verifyToken, enterpriseInventoryController.generateBarcode);

/**
 * @swagger
 * /api/enterprise-inventory/barcode/scan:
 *   post:
 *     summary: Scan barcode and get item information
 *     tags: [Enterprise Inventory]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcode
 *             properties:
 *               barcode:
 *                 type: string
 *                 description: Scanned barcode value
 *     responses:
 *       200:
 *         description: Item information retrieved successfully
 *       404:
 *         description: Item not found for barcode
 */
router.post('/barcode/scan', authMiddleware.verifyToken, enterpriseInventoryController.scanBarcode);

module.exports = router;