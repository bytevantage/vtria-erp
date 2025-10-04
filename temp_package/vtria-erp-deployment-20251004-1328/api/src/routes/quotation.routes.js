const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotation.controller');
const quotationEnhancedController = require('../controllers/quotationEnhanced.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateQuotation = [
    body('estimation_id').isInt().withMessage('Valid estimation ID is required'),
    body('terms_conditions').optional().isString(),
    body('delivery_terms').optional().isString(),
    body('payment_terms').optional().isString(),
    body('warranty_terms').optional().isString(),
    body('valid_days').optional().isInt({ min: 1 }).withMessage('Valid days must be at least 1')
];

const validateEnhancedQuotation = [
    body('estimation_id').isInt().withMessage('Valid estimation ID is required'),
    body('client_state').optional().isString(),
    body('notes').optional().isString(),
    body('lead_time_days').optional().isInt({ min: 1 }).withMessage('Lead time must be at least 1 day')
];

const validateQuotationUpdate = [
    body('notes').optional().isString(),
    body('lead_time_days').optional().isInt({ min: 1 }),
    body('terms_conditions').optional().isString(),
    body('delivery_terms').optional().isString(),
    body('payment_terms').optional().isString(),
    body('warranty_terms').optional().isString(),
    body('items').optional().isArray()
];

// Enhanced Routes (prioritized)
router.get('/enhanced/all', authMiddleware.verifyToken, quotationEnhancedController.getAllQuotations);
router.post('/enhanced/create', authMiddleware.verifyToken, validateEnhancedQuotation, quotationEnhancedController.createQuotationFromEstimation);
router.post('/enhanced/create-from-estimation', authMiddleware.verifyToken, quotationEnhancedController.createQuotationFromEstimation);
router.get('/enhanced/:id', authMiddleware.verifyToken, quotationEnhancedController.getQuotationById);
router.put('/enhanced/:id', authMiddleware.verifyToken, validateQuotationUpdate, quotationEnhancedController.updateQuotation);
router.put('/enhanced/:id/status', authMiddleware.verifyToken, quotationEnhancedController.updateQuotationStatus);
router.post('/enhanced/:id/approve', authMiddleware.verifyToken, quotationEnhancedController.approveQuotation);
router.get('/enhanced/:id/pdf', authMiddleware.verifyToken, (req, res) => quotationEnhancedController.generateQuotationPDF(req, res));
router.get('/enhanced/:id/bom', authMiddleware.verifyToken, (req, res) => quotationEnhancedController.generateBOMPDF(req, res));
router.post('/enhanced/:id/recalculate', authMiddleware.verifyToken, (req, res) => quotationEnhancedController.recalculateQuotationTotals(req, res));

// Basic Quotation routes

// Case-based Routes
router.get('/by-case/:caseNumber', authMiddleware.verifyToken, quotationEnhancedController.getQuotationByCaseNumber);

// Original Routes (for backward compatibility)
router.get('/', authMiddleware.verifyToken, quotationController.getAllQuotations);
router.post('/', authMiddleware.verifyToken, validateQuotation, quotationController.createQuotation);
router.get('/available-estimations', authMiddleware.verifyToken, quotationController.getAvailableEstimations);
router.get('/:id', authMiddleware.verifyToken, quotationController.getQuotation);
router.delete('/:id', authMiddleware.verifyToken, quotationController.deleteQuotation);
router.put('/:id/status', authMiddleware.verifyToken, quotationController.updateStatus);
router.post('/:id/submit', authMiddleware.verifyToken, quotationController.submitForApproval);
router.post('/:id/approve', authMiddleware.verifyToken, quotationController.approve);
router.get('/:id/pdf', authMiddleware.verifyToken, quotationController.generatePDF);

module.exports = router;
