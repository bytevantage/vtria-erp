const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrder.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware for sales order creation
const validateSalesOrder = (req, res, next) => {
    const { quotation_id } = req.body;

    if (!quotation_id) {
        return res.status(400).json({
            success: false,
            message: 'Quotation ID is required'
        });
    }

    next();
};

// Routes
router.get('/', authMiddleware.verifyToken, salesOrderController.getAllSalesOrders);
router.get('/approved', authMiddleware.verifyToken, salesOrderController.getApprovedSalesOrders);
router.post('/', authMiddleware.verifyToken, validateSalesOrder, salesOrderController.createSalesOrder);

// This route must come before /:id to avoid conflicts
router.get('/by-case/:caseNumber', authMiddleware.verifyToken, salesOrderController.getSalesOrderByCase);

// Standard CRUD routes
router.route('/:id')
    .get(authMiddleware.verifyToken, salesOrderController.getSalesOrder)
    .put(authMiddleware.verifyToken, salesOrderController.updateSalesOrder)
    .delete(authMiddleware.verifyToken, salesOrderController.deleteSalesOrder);

// Additional endpoints
router.post('/:id/submit', authMiddleware.verifyToken, salesOrderController.submitForApproval);
router.post('/:id/confirm', authMiddleware.verifyToken, salesOrderController.confirmSalesOrder);
router.post('/:id/reject', authMiddleware.verifyToken, salesOrderController.rejectSalesOrder);
router.put('/:id/status', authMiddleware.verifyToken, salesOrderController.updateProductionStatus);

module.exports = router;
