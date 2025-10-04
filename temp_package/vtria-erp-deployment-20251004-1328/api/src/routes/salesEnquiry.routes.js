const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const salesEnquiryController = require('../controllers/salesEnquiry.controller');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation.middleware');
const authMiddleware = require('../middleware/auth.middleware');

// Apply sanitization to all routes
router.use(sanitizeInput);

// Validation rules for sales enquiry
const validateEnquiry = [
  body('client_id').isInt({ min: 1 }).withMessage('Valid client ID is required'),
  body('project_name').trim().isLength({ min: 1, max: 255 }).withMessage('Project name is required and must not exceed 255 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('enquiry_by').isInt({ min: 1 }).withMessage('Valid enquiry_by user ID is required'),
  body('date').isISO8601().withMessage('Invalid date format')
];

const validateId = param('id').isInt({ min: 1 }).withMessage('Invalid ID');

const validateAssignment = [
  body('assigned_to').isInt({ min: 1 }).withMessage('Valid assigned_to user ID is required'),
  body('status').optional().isIn(['new', 'assigned', 'estimation', 'quotation', 'approved', 'rejected', 'completed']).withMessage('Invalid status')
];

// Sales Enquiry routes with authentication and validation
router.get('/', authMiddleware.verifyToken, salesEnquiryController.getAllEnquiries);
router.get('/stats', authMiddleware.verifyToken, salesEnquiryController.getDashboardStats);
router.get('/:id', authMiddleware.verifyToken, validateId, handleValidationErrors, salesEnquiryController.getEnquiryById);
router.post('/', authMiddleware.verifyToken, validateEnquiry, handleValidationErrors, salesEnquiryController.createEnquiry);
router.put('/:id', authMiddleware.verifyToken, validateId, validateEnquiry, handleValidationErrors, salesEnquiryController.updateEnquiry);
router.put('/:id/assign', authMiddleware.verifyToken, validateId, validateAssignment, handleValidationErrors, salesEnquiryController.assignEnquiry);
router.delete('/:id', authMiddleware.verifyToken, validateId, handleValidationErrors, salesEnquiryController.deleteEnquiry);

module.exports = router;
