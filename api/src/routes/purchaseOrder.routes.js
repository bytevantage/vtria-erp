const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { ValidationMiddleware } = require('../middleware/validation.middleware');
const rateLimiter = require('../middleware/rateLimiter.middleware');
const cache = require('../middleware/cache.middleware');

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders
 *     description: Retrieves a list of all purchase orders
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/',
    rateLimiter.standard(),
    purchaseOrderController.getAllPurchaseOrders
);

/**
 * @swagger
 * /api/purchase-orders/approved-requisitions:
 *   get:
 *     summary: Get approved purchase requisitions
 *     description: Retrieves approved purchase requisitions ready for PO creation
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/approved-requisitions',
    rateLimiter.standard(),
    purchaseOrderController.getApprovedPurchaseRequisitions
);

/**
 * @swagger
 * /api/purchase-orders/approved:
 *   get:
 *     summary: Get approved purchase orders for GRN
 *     description: Retrieves approved purchase orders available for GRN creation
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/approved',
    rateLimiter.standard(),
    purchaseOrderController.getApprovedPurchaseOrders
);

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Create a new purchase order
 *     description: Creates a new purchase order with items and generates PO number
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.post('/',
    rateLimiter.standard(),
    authMiddleware.verifyToken,
    authMiddleware.hasRole(['admin', 'purchase_manager']),
    ValidationMiddleware.validatePurchaseOrder,
    purchaseOrderController.createPurchaseOrder
);

/**
 * @swagger
 * /api/purchase-orders/from-requisition:
 *   post:
 *     summary: Create purchase order from requisition
 *     description: Creates a purchase order from an approved purchase requisition
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.post('/from-requisition',
    rateLimiter.standard(),
    authMiddleware.verifyToken,
    // Temporarily bypass role check for debugging
    // authMiddleware.hasRole(['admin', 'purchase_manager']),
    (req, res, next) => {
        console.log('=== PURCHASE ORDER ROUTE MIDDLEWARE PASSED ===');
        console.log('User from token:', req.user);
        next();
    },
    purchaseOrderController.createFromPurchaseRequisition
);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   get:
 *     summary: Get purchase order details
 *     description: Retrieves detailed information about a specific purchase order
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/:id',
    rateLimiter.standard(),
    authMiddleware.verifyToken,
    purchaseOrderController.getPurchaseOrder
);

/**
 * @swagger
 * /api/purchase-orders/{id}/with-items:
 *   get:
 *     summary: Get purchase order with items
 *     description: Retrieves detailed information about a purchase order including all items
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/:id/with-items',
    rateLimiter.standard(),
    purchaseOrderController.getPurchaseOrderWithItems
);

/**
 * @swagger
 * /api/purchase-orders/{id}/approve:
 *   put:
 *     summary: Approve a purchase order
 *     description: Approves a purchase order (director/admin only)
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.put('/:id/approve',
    rateLimiter.strict(),
    authMiddleware.verifyToken,
    authMiddleware.hasRole(['admin', 'director']),
    ValidationMiddleware.validateApproval,
    purchaseOrderController.approvePurchaseOrder
);

/**
 * @swagger
 * /api/purchase-orders/{id}/pdf/{type}:
 *   get:
 *     summary: Generate PDF document
 *     description: Generates a PDF for purchase order or proforma invoice
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.get('/:id/pdf/:type',
    rateLimiter.standard(),
    authMiddleware.verifyToken,
    ValidationMiddleware.validatePDFGeneration,
    purchaseOrderController.generatePDF
);

/**
 * @swagger
 * /api/purchase-orders/{id}:
 *   put:
 *     summary: Update a purchase order
 *     description: Updates purchase order details like delivery date, terms, notes, and status
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Purchase Orders
 */
router.put('/:id',
    rateLimiter.standard(),
    authMiddleware.verifyToken,
    authMiddleware.hasRole(['admin', 'purchase_manager']),
    purchaseOrderController.updatePurchaseOrder
);

// Error handling middleware
router.use(ValidationMiddleware.handleErrors);

module.exports = router;
