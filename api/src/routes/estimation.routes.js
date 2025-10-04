/**
 * @swagger
 * components:
 *   schemas:
 *     Estimation:
 *       type: object
 *       required:
 *         - enquiry_id
 *         - date
 *         - created_by
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         estimation_id:
 *           type: string
 *           description: Formatted ID (VESPL/ES/YYYY/XXX)
 *         enquiry_id:
 *           type: integer
 *           description: Related sales enquiry ID
 *         date:
 *           type: string
 *           format: date
 *           description: Estimation date
 *         status:
 *           type: string
 *           enum: [draft, submitted, approved, rejected]
 *           description: Current status
 *         total_mrp:
 *           type: number
 *           description: Total MRP amount
 *         total_discount:
 *           type: number
 *           description: Total discount amount
 *         total_final_price:
 *           type: number
 *           description: Final price after discount
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const estimationController = require('../controllers/estimation.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Validation middleware
const validateEstimation = [
    body('enquiry_id').isInt().withMessage('Valid enquiry ID is required')
];

const validateSection = [
    body('heading').notEmpty().withMessage('Section heading is required')
];

const validateItems = [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.product_id').isInt().withMessage('Valid product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.discount_percentage')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount percentage must be between 0 and 100')
];

const validateSingleItem = [
    body('product_id').isInt().withMessage('Valid product ID is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('discount_percentage')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount percentage must be between 0 and 100')
];

/**
 * @swagger
 * /api/estimation:
 *   get:
 *     summary: Get all estimations
 *     tags: [Estimations]
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
 *           enum: [draft, submitted, approved, rejected]
 *     responses:
 *       200:
 *         description: List of estimations retrieved successfully
 *   post:
 *     summary: Create new estimation
 *     tags: [Estimations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Estimation'
 *     responses:
 *       201:
 *         description: Estimation created successfully
 *       400:
 *         description: Validation error
 */

// Routes
// Test route without database
router.get('/test', authMiddleware.verifyToken, (req, res) => {
    res.json({
        success: true,
        message: 'Estimation API is working',
        user: req.user
    });
});

router.get('/', authMiddleware.verifyToken, estimationController.getAllEstimations);
router.post('/', authMiddleware.verifyToken, validateEstimation, estimationController.createEstimation);

// This route must come before /:id to avoid conflicts
router.get('/by-case/:caseNumber', authMiddleware.verifyToken, estimationController.getEstimationByCase);

// Handle estimation IDs with forward slashes (URL-encoded format like VESPL/ES/2526/001)
router.get('/:part1/:part2/:part3/:part4/details', authMiddleware.verifyToken, (req, res, next) => {
    // Reconstruct the full estimation ID from URL segments
    const fullId = `${req.params.part1}/${req.params.part2}/${req.params.part3}/${req.params.part4}`;
    req.params.id = fullId;
    estimationController.getEstimationDetails(req, res, next);
});

// Handle deletion for estimation IDs with forward slashes
router.delete('/:part1/:part2/:part3/:part4', authMiddleware.verifyToken, (req, res, next) => {
    // Reconstruct the full estimation ID from URL segments
    const fullId = `${req.params.part1}/${req.params.part2}/${req.params.part3}/${req.params.part4}`;
    req.params.id = fullId;
    estimationController.deleteEstimation(req, res, next);
});

/**
 * @swagger
 * /api/estimation/{id}:
 *   get:
 *     summary: Get estimation by ID
 *     tags: [Estimations]
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
 *         description: Estimation retrieved successfully
 *       404:
 *         description: Estimation not found
 */
router.get('/:id', authMiddleware.verifyToken, estimationController.getEstimation);
router.get('/:id/details', authMiddleware.verifyToken, estimationController.getEstimationDetails);
router.put('/:id', authMiddleware.verifyToken, validateEstimation, estimationController.updateEstimation);
router.delete('/:id', authMiddleware.verifyToken, estimationController.deleteEstimation);

/**
 * @swagger
 * /api/estimation/{id}/submit:
 *   post:
 *     summary: Submit estimation for approval
 *     tags: [Estimations]
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
 *         description: Estimation submitted successfully
 */
router.post('/:id/submit', authMiddleware.verifyToken, estimationController.submitForApproval);

/**
 * @swagger
 * /api/estimation/{id}/approve:
 *   post:
 *     summary: Approve estimation
 *     tags: [Estimations]
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
 *         description: Estimation approved successfully
 */
router.post('/:id/approve', authMiddleware.verifyToken, estimationController.approve);

/**
 * @swagger
 * /api/estimation/{id}/reject:
 *   post:
 *     summary: Reject estimation
 *     tags: [Estimations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rejection
 *     responses:
 *       200:
 *         description: Estimation rejected successfully
 */
router.post('/:id/reject', authMiddleware.verifyToken, estimationController.reject);

/**
 * @swagger
 * /api/estimation/{id}/return-to-draft:
 *   post:
 *     summary: Return rejected estimation to draft status
 *     tags: [Estimations]
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
 *         description: Estimation returned to draft successfully
 */
router.post('/:id/return-to-draft', authMiddleware.verifyToken, estimationController.returnToDraft);

// Section management routes
router.post('/:id/sections', authMiddleware.verifyToken, estimationController.addSection);
router.put('/sections/:id', authMiddleware.verifyToken, estimationController.updateSection);
router.delete('/sections/:id', authMiddleware.verifyToken, estimationController.deleteSection);

// Subsection management routes  
router.post('/sections/:id/subsections', authMiddleware.verifyToken, estimationController.addSubsection);
router.put('/subsections/:id', authMiddleware.verifyToken, estimationController.updateSubsection);
router.delete('/subsections/:id', authMiddleware.verifyToken, estimationController.deleteSubsection);

// Item management routes
router.post('/subsections/:id/items', authMiddleware.verifyToken, validateSingleItem, estimationController.addItem);
router.put('/items/:id/discount', authMiddleware.verifyToken, estimationController.updateItemDiscount);
router.delete('/items/:id', authMiddleware.verifyToken, estimationController.deleteItem);

// PDF Generation
router.get('/:id/pdf', authMiddleware.verifyToken, estimationController.generatePDF);

// Smart Pricing Routes
router.get('/:id/smart-pricing', authMiddleware.verifyToken, estimationController.getSmartPricingSuggestions);
router.post('/vendor-price-comparison', authMiddleware.verifyToken, estimationController.getVendorPriceComparison);

// Utility routes
router.post('/recalculate-totals', authMiddleware.verifyToken, estimationController.recalculateAllTotals);

module.exports = router;
