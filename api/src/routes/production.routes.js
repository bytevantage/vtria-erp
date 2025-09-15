/**
 * @swagger
 * components:
 *   schemas:
 *     ProductionItem:
 *       type: object
 *       required:
 *         - item_code
 *         - item_name
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
 *           description: Production category ID
 *         unit_of_measurement:
 *           type: string
 *           description: Unit of measurement
 *         standard_cost:
 *           type: number
 *           description: Standard manufacturing cost
 *         standard_time_hours:
 *           type: number
 *           description: Standard manufacturing time in hours
 *         has_bom:
 *           type: boolean
 *           description: Whether item has BOM
 *     
 *     BOMHeader:
 *       type: object
 *       required:
 *         - production_item_id
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         bom_number:
 *           type: string
 *           description: BOM number
 *         production_item_id:
 *           type: integer
 *           description: Production item ID
 *         version:
 *           type: string
 *           description: BOM version
 *         description:
 *           type: string
 *           description: BOM description
 *         quantity_per_unit:
 *           type: number
 *           description: Quantity produced per BOM
 *         material_cost:
 *           type: number
 *           description: Total material cost
 *         labor_cost:
 *           type: number
 *           description: Total labor cost
 *         overhead_cost:
 *           type: number
 *           description: Total overhead cost
 *         status:
 *           type: string
 *           enum: [draft, active, inactive, superseded]
 *     
 *     WorkOrder:
 *       type: object
 *       required:
 *         - production_item_id
 *         - quantity_ordered
 *         - planned_start_date
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         work_order_number:
 *           type: string
 *           description: Work order number
 *         production_item_id:
 *           type: integer
 *           description: Production item ID
 *         bom_header_id:
 *           type: integer
 *           description: BOM header ID
 *         quantity_ordered:
 *           type: number
 *           description: Quantity to produce
 *         quantity_produced:
 *           type: number
 *           description: Quantity produced
 *         planned_start_date:
 *           type: string
 *           format: date
 *           description: Planned start date
 *         planned_end_date:
 *           type: string
 *           format: date
 *           description: Planned end date
 *         status:
 *           type: string
 *           enum: [draft, released, in_progress, completed, cancelled, on_hold]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 */

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const productionController = require('../controllers/production.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const validateProductionItem = [
  body('item_code').notEmpty().withMessage('Item code is required'),
  body('item_name').notEmpty().withMessage('Item name is required'),
  body('category_id').optional().isInt().withMessage('Category ID must be a number'),
  body('standard_cost').optional().isFloat({ min: 0 }).withMessage('Standard cost must be positive'),
  body('batch_size').optional().isInt({ min: 1 }).withMessage('Batch size must be at least 1')
];

const validateBOM = [
  body('production_item_id').isInt().withMessage('Production item ID is required'),
  body('version').optional().isString().withMessage('Version must be a string'),
  body('quantity_per_unit').optional().isFloat({ min: 0 }).withMessage('Quantity per unit must be positive'),
  body('components').optional().isArray().withMessage('Components must be an array'),
  body('operations').optional().isArray().withMessage('Operations must be an array')
];

const validateWorkOrder = [
  body('production_item_id').isInt().withMessage('Production item ID is required'),
  body('quantity_ordered').isFloat({ min: 0 }).withMessage('Quantity ordered must be positive'),
  body('planned_start_date').isDate().withMessage('Valid planned start date is required'),
  body('planned_end_date').optional().isDate().withMessage('Valid planned end date required if provided'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
];

/**
 * @swagger
 * /api/production/items:
 *   get:
 *     summary: Get all production items
 *     tags: [Production Items]
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
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, discontinued, all]
 *         description: Filter by status
 *       - in: query
 *         name: has_bom
 *         schema:
 *           type: boolean
 *         description: Filter by BOM existence
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, code, or description
 *     responses:
 *       200:
 *         description: Production items retrieved successfully
 *   post:
 *     summary: Create new production item
 *     tags: [Production Items]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductionItem'
 *     responses:
 *       201:
 *         description: Production item created successfully
 *       400:
 *         description: Validation error
 */

// Production Items Routes
router.get('/items', authMiddleware.verifyToken, productionController.getProductionItems);
router.post('/items', authMiddleware.verifyToken, validateProductionItem, productionController.createProductionItem);

/**
 * @swagger
 * /api/production/items/{production_item_id}/bom:
 *   get:
 *     summary: Get BOM for production item
 *     tags: [BOM Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: production_item_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *         description: BOM version (default: current version)
 *     responses:
 *       200:
 *         description: BOM retrieved successfully
 *       404:
 *         description: BOM not found
 *   post:
 *     summary: Create BOM for production item
 *     tags: [BOM Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: production_item_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - production_item_id
 *             properties:
 *               production_item_id:
 *                 type: integer
 *               version:
 *                 type: string
 *               description:
 *                 type: string
 *               quantity_per_unit:
 *                 type: number
 *               material_cost:
 *                 type: number
 *               labor_cost:
 *                 type: number
 *               overhead_cost:
 *                 type: number
 *               effective_from:
 *                 type: string
 *                 format: date
 *               components:
 *                 type: array
 *                 items:
 *                   type: object
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: BOM created successfully
 *       400:
 *         description: Validation error
 */

// BOM Management Routes
router.get('/items/:production_item_id/bom', authMiddleware.verifyToken, productionController.getBOM);
router.post('/bom', authMiddleware.verifyToken, validateBOM, productionController.createBOM);

/**
 * @swagger
 * /api/production/work-orders:
 *   get:
 *     summary: Get all work orders
 *     tags: [Work Orders]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, released, in_progress, completed, cancelled, on_hold, all]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: manufacturing_unit_id
 *         schema:
 *           type: integer
 *         description: Filter by manufacturing unit
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Work orders retrieved successfully
 *   post:
 *     summary: Create new work order
 *     tags: [Work Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkOrder'
 *     responses:
 *       201:
 *         description: Work order created successfully
 *       400:
 *         description: Validation error
 */

// Work Order Routes
router.get('/work-orders', authMiddleware.verifyToken, productionController.getWorkOrders);
router.post('/work-orders', authMiddleware.verifyToken, validateWorkOrder, productionController.createWorkOrder);

/**
 * @swagger
 * /api/production/work-orders/{id}:
 *   get:
 *     summary: Get work order details
 *     tags: [Work Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Work order details retrieved successfully
 *       404:
 *         description: Work order not found
 */
router.get('/work-orders/:id', authMiddleware.verifyToken, productionController.getWorkOrderDetails);

/**
 * @swagger
 * /api/production/work-orders/{id}/status:
 *   put:
 *     summary: Update work order status
 *     tags: [Work Orders]
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
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, released, in_progress, completed, cancelled, on_hold]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Work order status updated successfully
 *       404:
 *         description: Work order not found
 */
router.put('/work-orders/:id/status', authMiddleware.verifyToken, productionController.updateWorkOrderStatus);

/**
 * @swagger
 * /api/production/dashboard:
 *   get:
 *     summary: Get production dashboard data
 *     tags: [Production Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authMiddleware.verifyToken, productionController.getProductionDashboard);

/**
 * @swagger
 * /api/production/master/manufacturing-units:
 *   get:
 *     summary: Get all manufacturing units
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manufacturing units retrieved successfully
 */
router.get('/master/manufacturing-units', authMiddleware.verifyToken, productionController.getManufacturingUnits);

/**
 * @swagger
 * /api/production/master/operations:
 *   get:
 *     summary: Get all production operations
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Production operations retrieved successfully
 */
router.get('/master/operations', authMiddleware.verifyToken, productionController.getProductionOperations);

/**
 * @swagger
 * /api/production/master/categories:
 *   get:
 *     summary: Get all production categories
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Production categories retrieved successfully
 */
router.get('/master/categories', authMiddleware.verifyToken, productionController.getProductionCategories);

module.exports = router;