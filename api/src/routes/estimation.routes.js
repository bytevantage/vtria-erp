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
router.get('/', authMiddleware.verifyToken, estimationController.getAllEstimations);
router.post('/', authMiddleware.verifyToken, validateEstimation, estimationController.createEstimation);

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

// Section management routes
router.post('/:id/sections', authMiddleware.verifyToken, estimationController.addSection);
router.put('/sections/:id', authMiddleware.verifyToken, estimationController.updateSection);
router.delete('/sections/:id', authMiddleware.verifyToken, estimationController.deleteSection);

// Subsection management routes  
router.post('/sections/:id/subsections', authMiddleware.verifyToken, estimationController.addSubsection);
router.put('/subsections/:id', authMiddleware.verifyToken, estimationController.updateSubsection);
router.delete('/subsections/:id', authMiddleware.verifyToken, estimationController.deleteSubsection);

// Item management routes
router.post('/subsections/:id/items', authMiddleware.verifyToken, estimationController.addItem);
router.put('/items/:id/discount', authMiddleware.verifyToken, estimationController.updateItemDiscount);
router.delete('/items/:id', authMiddleware.verifyToken, estimationController.deleteItem);

module.exports = router;
