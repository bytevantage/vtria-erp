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

// Root route for production module
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Production module is active',
    data: {
      module: 'production',
      version: '1.0.0',
      endpoints: [
        'GET /items - Get production items',
        'GET /work-orders - Get work orders',
        'GET /dashboard - Production dashboard',
        'GET /cases - Manufacturing cases',
        'GET /master/categories - Production categories',
        'GET /master/operations - Production operations',
        'GET /master/manufacturing-units - Manufacturing units'
      ]
    }
  });
});

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
 *   post:
 *     summary: Create new manufacturing unit
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - unit_name
 *               - unit_code
 *             properties:
 *               unit_name:
 *                 type: string
 *               unit_code:
 *                 type: string
 *               location:
 *                 type: string
 *               capacity_per_day:
 *                 type: number
 *               unit_of_measurement:
 *                 type: string
 *               manager_employee_id:
 *                 type: integer
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manufacturing unit created successfully
 *       400:
 *         description: Validation error
 */
router.get('/master/manufacturing-units', authMiddleware.verifyToken, productionController.getManufacturingUnits);
router.post('/master/manufacturing-units', authMiddleware.verifyToken, productionController.createManufacturingUnit);

/**
 * @swagger
 * /api/production/master/manufacturing-units/{id}:
 *   put:
 *     summary: Update manufacturing unit
 *     tags: [Master Data]
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
 *             properties:
 *               unit_name:
 *                 type: string
 *               unit_code:
 *                 type: string
 *               location:
 *                 type: string
 *               capacity_per_day:
 *                 type: number
 *               unit_of_measurement:
 *                 type: string
 *               manager_employee_id:
 *                 type: integer
 *               contact_phone:
 *                 type: string
 *               contact_email:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *     responses:
 *       200:
 *         description: Manufacturing unit updated successfully
 *       404:
 *         description: Manufacturing unit not found
 *   delete:
 *     summary: Delete manufacturing unit
 *     tags: [Master Data]
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
 *         description: Manufacturing unit deleted successfully
 *       404:
 *         description: Manufacturing unit not found
 */
router.put('/master/manufacturing-units/:id', authMiddleware.verifyToken, productionController.updateManufacturingUnit);
router.delete('/master/manufacturing-units/:id', authMiddleware.verifyToken, productionController.deleteManufacturingUnit);

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
 *   post:
 *     summary: Create new production operation
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operation_code
 *               - operation_name
 *               - operation_type
 *             properties:
 *               operation_code:
 *                 type: string
 *               operation_name:
 *                 type: string
 *               description:
 *                 type: string
 *               operation_type:
 *                 type: string
 *                 enum: [setup, production, inspection, packaging, testing]
 *               work_center_code:
 *                 type: string
 *               setup_time_hours:
 *                 type: number
 *               run_time_per_unit_hours:
 *                 type: number
 *               teardown_time_hours:
 *                 type: number
 *               hourly_rate:
 *                 type: number
 *               setup_cost:
 *                 type: number
 *               requires_inspection:
 *                 type: boolean
 *               inspection_percentage:
 *                 type: number
 *     responses:
 *       201:
 *         description: Production operation created successfully
 *       400:
 *         description: Validation error
 */
router.get('/master/operations', authMiddleware.verifyToken, productionController.getProductionOperations);
router.post('/master/operations', authMiddleware.verifyToken, productionController.createProductionOperation);

/**
 * @swagger
 * /api/production/master/operations/{id}:
 *   put:
 *     summary: Update production operation
 *     tags: [Master Data]
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
 *         description: Production operation updated successfully
 *       404:
 *         description: Production operation not found
 *   delete:
 *     summary: Delete production operation
 *     tags: [Master Data]
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
 *         description: Production operation deleted successfully
 *       404:
 *         description: Production operation not found
 */
router.put('/master/operations/:id', authMiddleware.verifyToken, productionController.updateProductionOperation);
router.delete('/master/operations/:id', authMiddleware.verifyToken, productionController.deleteProductionOperation);

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
 *   post:
 *     summary: Create new production category
 *     tags: [Master Data]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_name
 *             properties:
 *               category_name:
 *                 type: string
 *               category_code:
 *                 type: string
 *               description:
 *                 type: string
 *               parent_category_id:
 *                 type: integer
 *               default_lead_time_days:
 *                 type: integer
 *               default_batch_size:
 *                 type: integer
 *               requires_quality_check:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Production category created successfully
 *       400:
 *         description: Validation error
 */
router.get('/master/categories', authMiddleware.verifyToken, productionController.getProductionCategories);
router.post('/master/categories', authMiddleware.verifyToken, productionController.createProductionCategory);

/**
 * @swagger
 * /api/production/master/categories/{id}:
 *   put:
 *     summary: Update production category
 *     tags: [Master Data]
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
 *         description: Production category updated successfully
 *       404:
 *         description: Production category not found
 *   delete:
 *     summary: Delete production category
 *     tags: [Master Data]
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
 *         description: Production category deleted successfully
 *       404:
 *         description: Production category not found
 */
router.put('/master/categories/:id', authMiddleware.verifyToken, productionController.updateProductionCategory);
router.delete('/master/categories/:id', authMiddleware.verifyToken, productionController.deleteProductionCategory);

/**
 * @swagger
 * /api/production/cases/ready:
 *   get:
 *     summary: Get cases ready for production
 *     tags: [Production Cases]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cases ready for production retrieved successfully
 */
router.get('/cases/ready', authMiddleware.verifyToken, productionController.getCasesReadyForProduction);

/**
 * @swagger
 * /api/production/cases/{case_id}/move-to-production:
 *   post:
 *     summary: Move case to production state and create manufacturing case
 *     tags: [Production Cases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: case_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planned_start_date:
 *                 type: string
 *                 format: date
 *               planned_end_date:
 *                 type: string
 *                 format: date
 *               manufacturing_unit_id:
 *                 type: integer
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manufacturing case created successfully
 */
router.post('/cases/:case_id/move-to-production', authMiddleware.verifyToken, productionController.moveToProduction);

/**
 * @swagger
 * /api/production/cases:
 *   get:
 *     summary: Get all manufacturing cases
 *     tags: [Production Cases]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manufacturing cases retrieved successfully
 */
router.get('/cases', authMiddleware.verifyToken, productionController.getManufacturingCases);

/**
 * @swagger
 * /api/production/cases/{case_id}/estimation-details:
 *   get:
 *     summary: Get estimation details for a case
 *     tags: [Production Cases]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: case_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estimation details retrieved successfully
 */
router.get('/cases/:case_id/estimation-details', authMiddleware.verifyToken, productionController.getEstimationDetailsForCase);

// Manufacturing case management endpoints
router.put('/manufacturing-cases/:id/status', authMiddleware.verifyToken, productionController.updateManufacturingCaseStatus);
router.get('/manufacturing-cases/:id/work-orders', authMiddleware.verifyToken, productionController.getManufacturingCaseWorkOrders);
router.post('/manufacturing-cases/:id/work-orders', authMiddleware.verifyToken, productionController.createManufacturingCaseWorkOrders);
router.put('/work-orders/:workOrderId', authMiddleware.verifyToken, productionController.updateWorkOrder);
router.delete('/work-orders/:workOrderId', authMiddleware.verifyToken, productionController.deleteWorkOrder);
router.put('/manufacturing-cases/:id/progress', authMiddleware.verifyToken, productionController.updateManufacturingCaseProgress);
router.get('/manufacturing-cases/:id/report', authMiddleware.verifyToken, productionController.generateManufacturingCaseReport);

// BOM management endpoints
router.get('/boms/active', authMiddleware.verifyToken, productionController.getActiveBOMs);
router.get('/boms/:id/components', authMiddleware.verifyToken, productionController.getBOMComponents);

// ============================================================================
// QUALITY CONTROL ROUTES
// ============================================================================
const qualityController = require('../controllers/quality.controller');

// Quality Checkpoints
router.get('/quality/checkpoints', authMiddleware.verifyToken, qualityController.getQualityCheckpoints);
router.post('/quality/checkpoints', authMiddleware.verifyToken, qualityController.createQualityCheckpoint);

// Defect Types
router.get('/quality/defect-types', authMiddleware.verifyToken, qualityController.getDefectTypes);
router.post('/quality/defect-types', authMiddleware.verifyToken, qualityController.createDefectType);

// Quality Inspections
router.get('/quality/inspections', authMiddleware.verifyToken, qualityController.getQualityInspections);
router.get('/quality/inspections/:id', authMiddleware.verifyToken, qualityController.getQualityInspection);
router.post('/quality/inspections', authMiddleware.verifyToken, qualityController.createQualityInspection);
router.put('/quality/inspections/:id/results', authMiddleware.verifyToken, qualityController.updateInspectionResults);
router.put('/quality/inspections/:id/submit', authMiddleware.verifyToken, qualityController.submitInspection);
router.put('/quality/inspections/:id/approve', authMiddleware.verifyToken, qualityController.approveInspection);

// Defect Records
router.post('/quality/inspections/:inspection_id/defects', authMiddleware.verifyToken, qualityController.addDefectRecord);
router.get('/quality/inspections/:inspection_id/defects', authMiddleware.verifyToken, qualityController.getInspectionDefects);
router.put('/quality/defects/:id/resolve', authMiddleware.verifyToken, qualityController.resolveDefect);

// Quality Analytics
router.get('/quality/metrics/dashboard', authMiddleware.verifyToken, qualityController.getQualityMetricsDashboard);
router.get('/quality/defect-analysis', authMiddleware.verifyToken, qualityController.getDefectAnalysis);
router.get('/quality/summary-report', authMiddleware.verifyToken, qualityController.getQualitySummaryReport);

// ============================================================================
// SHOP FLOOR CONTROL ROUTES
// ============================================================================
const shopFloorController = require('../controllers/shopfloor.controller');

// Production Machines
router.get('/shopfloor/machines', authMiddleware.verifyToken, shopFloorController.getProductionMachines);
router.post('/shopfloor/machines', authMiddleware.verifyToken, shopFloorController.createProductionMachine);
router.put('/shopfloor/machines/:id/status', authMiddleware.verifyToken, shopFloorController.updateMachineStatus);
router.post('/shopfloor/machines/:id/maintenance', authMiddleware.verifyToken, shopFloorController.recordMaintenance);

// Work Order Operation Tracking
router.get('/shopfloor/operation-tracking', authMiddleware.verifyToken, shopFloorController.getOperationTracking);
router.post('/shopfloor/operation-tracking/start', authMiddleware.verifyToken, shopFloorController.startOperation);
router.put('/shopfloor/operation-tracking/:id/pause', authMiddleware.verifyToken, shopFloorController.pauseOperation);
router.put('/shopfloor/operation-tracking/:id/resume', authMiddleware.verifyToken, shopFloorController.resumeOperation);
router.put('/shopfloor/operation-tracking/:id/complete', authMiddleware.verifyToken, shopFloorController.completeOperation);

// Machine Utilization
router.get('/shopfloor/machine-utilization', authMiddleware.verifyToken, shopFloorController.getMachineUtilizationLog);
router.post('/shopfloor/machine-utilization', authMiddleware.verifyToken, shopFloorController.logMachineUtilization);
router.put('/shopfloor/machine-utilization/:id/end', authMiddleware.verifyToken, shopFloorController.endMachineUtilization);

// Shop Floor Dashboard
router.get('/shopfloor/dashboard', authMiddleware.verifyToken, shopFloorController.getShopFloorDashboard);
router.get('/shopfloor/machine-utilization/summary', authMiddleware.verifyToken, shopFloorController.getMachineUtilizationSummary);

// ============================================================================
// PRODUCTION PLANNING & ANALYTICS ROUTES
// ============================================================================
const planningController = require('../controllers/planning.controller');

// Production Schedule
router.get('/planning/schedules', authMiddleware.verifyToken, planningController.getProductionSchedules);
router.get('/planning/schedules/:id', authMiddleware.verifyToken, planningController.getProductionSchedule);
router.post('/planning/schedules', authMiddleware.verifyToken, planningController.createProductionSchedule);
router.post('/planning/schedules/:schedule_id/items', authMiddleware.verifyToken, planningController.addWorkOrderToSchedule);
router.put('/planning/schedule-items/:id/status', authMiddleware.verifyToken, planningController.updateScheduleItemStatus);
router.put('/planning/schedules/:id/approve', authMiddleware.verifyToken, planningController.approveProductionSchedule);

// Waste Tracking
router.get('/planning/waste/categories', authMiddleware.verifyToken, planningController.getWasteCategories);
router.get('/planning/waste/records', authMiddleware.verifyToken, planningController.getWasteRecords);
router.post('/planning/waste/records', authMiddleware.verifyToken, planningController.recordWaste);
router.get('/planning/waste/analytics', authMiddleware.verifyToken, planningController.getWasteAnalytics);

// OEE Analytics
router.get('/planning/oee/records', authMiddleware.verifyToken, planningController.getOEERecords);
router.post('/planning/oee/calculate', authMiddleware.verifyToken, planningController.calculateOEE);
router.get('/planning/oee/summary', authMiddleware.verifyToken, planningController.getOEESummary);

module.exports = router;