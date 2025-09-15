const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateStockAdd = [
    body('product_id').isInt().withMessage('Valid product ID is required'),
    body('location_id').isInt().withMessage('Valid location ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('reference_type').notEmpty().withMessage('Reference type is required'),
    body('reference_id').notEmpty().withMessage('Reference ID is required')
];

const validateStockTransfer = [
    body('product_id').isInt().withMessage('Valid product ID is required'),
    body('from_location_id').isInt().withMessage('Valid source location ID is required'),
    body('to_location_id').isInt().withMessage('Valid destination location ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

// Routes
router.post('/add', verifyToken, validateStockAdd, stockController.addStock);
router.post('/transfer', verifyToken, validateStockTransfer, stockController.transferStock);
router.get('/levels', verifyToken, stockController.getStockLevels);
router.get('/movements', verifyToken, stockController.getStockMovements);

module.exports = router;
