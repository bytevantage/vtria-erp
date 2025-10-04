const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validatePurchaseRequest = [
    body('quotation_id').isInt().withMessage('Valid quotation ID is required'),
    body('required_by').isDate().withMessage('Valid required by date is required'),
    body('notes').optional().isString()
];

const validateSupplierResponse = [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.id').isInt().withMessage('Valid item ID is required'),
    body('items.*.supplier_id').isInt().withMessage('Valid supplier ID is required'),
    body('items.*.quoted_price').isFloat({ min: 0 }).withMessage('Valid quoted price is required'),
    body('items.*.quoted_delivery_time').isString().withMessage('Valid delivery time is required'),
    body('items.*.response_notes').optional().isString()
];

// Routes
router.post('/requests', verifyToken, validatePurchaseRequest, purchaseController.createPurchaseRequest);
router.get('/requests/:id', verifyToken, purchaseController.getPurchaseRequest);
router.post('/requests/:id/supplier-response', verifyToken, validateSupplierResponse, purchaseController.updateSupplierResponse);
router.get('/requests/:id/pdf', verifyToken, purchaseController.generatePDF);

module.exports = router;
