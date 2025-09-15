const express = require('express');
const router = express.Router();
const manufacturingController = require('../controllers/manufacturing.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware for work order creation
const validateWorkOrder = (req, res, next) => {
    const { sales_order_id, title } = req.body;
    
    if (!sales_order_id || !title) {
        return res.status(400).json({
            success: false,
            message: 'Sales Order ID and title are required'
        });
    }
    
    next();
};

// Work Orders Routes
router.get('/work-orders', authMiddleware.verifyToken, manufacturingController.getAllWorkOrders);
router.post('/work-orders', authMiddleware.verifyToken, validateWorkOrder, manufacturingController.createWorkOrder);
router.get('/work-orders/:id', authMiddleware.verifyToken, manufacturingController.getWorkOrderDetails);
router.put('/work-orders/:id/status', authMiddleware.verifyToken, manufacturingController.updateWorkOrderStatus);
router.put('/work-orders/:id/assign', authMiddleware.verifyToken, manufacturingController.assignTechnician);

// Dashboard
router.get('/dashboard', authMiddleware.verifyToken, manufacturingController.getProductionDashboard);

module.exports = router;
