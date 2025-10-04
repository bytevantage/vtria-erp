const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// Validation middleware
const validateEnquiry = [
    body('client_id').isInt().withMessage('Valid client ID is required'),
    body('project_name').notEmpty().withMessage('Project name is required'),
    body('description').notEmpty().withMessage('Description is required')
];

const validateAssignment = [
    body('assigned_to').isInt().withMessage('Valid user ID is required for assignment')
];

// Routes
router.post('/', authMiddleware.verifyToken, validateEnquiry, salesController.createEnquiry);
router.get('/', authMiddleware.verifyToken, salesController.listEnquiries);
router.get('/:id', authMiddleware.verifyToken, salesController.getEnquiry);
router.post('/:id/assign', authMiddleware.verifyToken, validateAssignment, salesController.assignEnquiry);

module.exports = router;
