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
router.post('/', authMiddleware.verifyToken, validateSalesOrder, salesOrderController.createSalesOrder);
router.get('/:id', authMiddleware.verifyToken, salesOrderController.getSalesOrder);
router.put('/:id', authMiddleware.verifyToken, salesOrderController.updateSalesOrder);
router.post('/:id/confirm', authMiddleware.verifyToken, salesOrderController.confirmSalesOrder);
router.put('/:id/status', authMiddleware.verifyToken, salesOrderController.updateProductionStatus);

module.exports = router;
