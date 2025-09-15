const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');
const rateLimiter = require('../middleware/rateLimiter.middleware');
const cache = require('../middleware/cache.middleware');

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
    validationMiddleware.validatePurchaseOrder,
    purchaseOrderController.createPurchaseOrder
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
    cache.route({ ttl: 300 }), // Cache for 5 minutes
    purchaseOrderController.getPurchaseOrder
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
    validationMiddleware.validateApproval,
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
    validationMiddleware.validatePDFGeneration,
    purchaseOrderController.generatePDF
);

// Error handling middleware
router.use(validationMiddleware.handleErrors);

module.exports = router;
