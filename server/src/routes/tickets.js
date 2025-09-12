/**
 * Ticket Routes for VTRIA ERP Support System
 * REST API endpoints with role-based access control and validation
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const TicketController = require('../controllers/ticketController');
const { authenticate } = require('../middleware/auth');
const rbac = require('../middleware/rbac');

const router = express.Router();

// Apply authentication middleware to all routes
// License middleware is applied globally in server.js
router.use(authenticate);

// Validation middleware
const createTicketValidation = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').notEmpty().withMessage('Description is required'),
  body('customer_name').notEmpty().withMessage('Customer name is required').isLength({ max: 100 }),
  body('customer_contact').optional().isLength({ max: 50 }),
  body('customer_email').optional().isEmail().withMessage('Invalid email format'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('ticket_type').optional().isIn(['warranty', 'support', 'maintenance', 'installation', 'training']),
  body('issue_category').optional().isLength({ max: 50 }),
  body('issue_severity').optional().isIn(['minor', 'major', 'critical', 'blocking']),
  body('serial_number').optional().isLength({ max: 100 }),
  body('location_id').isUUID().withMessage('Valid location ID is required')
];

const updateStatusValidation = [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  body('status').isIn(['support_ticket', 'diagnosis', 'resolution', 'closure', 'rejected', 'on_hold']),
  body('reason').optional().isLength({ max: 500 })
];

const assignTicketValidation = [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  body('assigned_to').isUUID().withMessage('Valid user ID is required'),
  body('reason').optional().isLength({ max: 500 })
];

const addNoteValidation = [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  body('note_text').notEmpty().withMessage('Note text is required'),
  body('note_type').optional().isIn(['general', 'diagnosis', 'resolution', 'customer_communication', 'internal', 'system', 'warranty_check']),
  body('is_internal').optional().isBoolean(),
  body('is_customer_visible').optional().isBoolean(),
  body('is_resolution_note').optional().isBoolean(),
  body('time_spent_minutes').optional().isInt({ min: 0 })
];

const addPartsValidation = [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  body('parts').isArray({ min: 1 }).withMessage('At least one part is required'),
  body('parts.*.part_name').notEmpty().withMessage('Part name is required'),
  body('parts.*.quantity_used').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
  body('parts.*.unit_cost').optional().isFloat({ min: 0 }),
  body('parts.*.part_type').optional().isIn(['replacement', 'consumable', 'tool', 'accessory'])
];

const updateTicketValidation = [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional().notEmpty(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('customer_contact').optional().isLength({ max: 50 }),
  body('customer_email').optional().isEmail(),
  body('issue_category').optional().isLength({ max: 50 }),
  body('issue_severity').optional().isIn(['minor', 'major', 'critical', 'blocking'])
];

// Routes

/**
 * @route   POST /api/tickets
 * @desc    Create new support ticket
 * @access  Private (All authenticated users)
 */
router.post('/', createTicketValidation, TicketController.createTicket);

/**
 * @route   GET /api/tickets
 * @desc    Get all tickets with filtering and pagination
 * @access  Private (Role-based filtering applied)
 */
router.get('/', TicketController.getTickets);

/**
 * @route   GET /api/tickets/stats
 * @desc    Get ticket statistics
 * @access  Private (Manager, Director, Sales Admin)
 */
router.get('/stats', rbac(['manager', 'director', 'sales_admin']), TicketController.getTicketStats);

/**
 * @route   GET /api/tickets/warranty-expiring
 * @desc    Get tickets with expiring warranties
 * @access  Private (Engineer, Manager, Director, Sales Admin)
 */
router.get('/warranty-expiring', rbac(['engineer', 'manager', 'director', 'sales_admin']), TicketController.getWarrantyExpiringTickets);

/**
 * @route   GET /api/tickets/warranty/:serial_number
 * @desc    Get warranty information for serial number
 * @access  Private (All authenticated users)
 */
router.get('/warranty/:serial_number', [
  param('serial_number').notEmpty().withMessage('Serial number is required')
], TicketController.getWarrantyInfo);

/**
 * @route   GET /api/tickets/:id
 * @desc    Get ticket by ID
 * @access  Private (Role-based access control)
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Valid ticket ID is required')
], TicketController.getTicketById);

/**
 * @route   PUT /api/tickets/:id
 * @desc    Update ticket details
 * @access  Private (Role-based access control)
 */
router.put('/:id', updateTicketValidation, TicketController.updateTicket);

/**
 * @route   PUT /api/tickets/:id/status
 * @desc    Update ticket status
 * @access  Private (Role-based access control)
 */
router.put('/:id/status', updateStatusValidation, TicketController.updateTicketStatus);

/**
 * @route   PUT /api/tickets/:id/assign
 * @desc    Assign ticket to user
 * @access  Private (Manager, Director, Sales Admin)
 */
router.put('/:id/assign', rbac(['manager', 'director', 'sales_admin']), assignTicketValidation, TicketController.assignTicket);

/**
 * @route   POST /api/tickets/:id/notes
 * @desc    Add note to ticket
 * @access  Private (Role-based access control)
 */
router.post('/:id/notes', addNoteValidation, TicketController.addTicketNote);

/**
 * @route   GET /api/tickets/:id/notes
 * @desc    Get ticket notes
 * @access  Private (Role-based access control)
 */
router.get('/:id/notes', [
  param('id').isUUID().withMessage('Valid ticket ID is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], TicketController.getTicketNotes);

/**
 * @route   GET /api/tickets/:id/history
 * @desc    Get ticket status history
 * @access  Private (Role-based access control)
 */
router.get('/:id/history', [
  param('id').isUUID().withMessage('Valid ticket ID is required')
], TicketController.getTicketHistory);

/**
 * @route   POST /api/tickets/:id/parts
 * @desc    Add parts used in ticket resolution
 * @access  Private (Engineer, Manager, Director, Sales Admin)
 */
router.post('/:id/parts', rbac(['engineer', 'manager', 'director', 'sales_admin']), addPartsValidation, TicketController.addTicketParts);

/**
 * @route   GET /api/tickets/:id/parts
 * @desc    Get parts used in ticket
 * @access  Private (Role-based access control)
 */
router.get('/:id/parts', [
  param('id').isUUID().withMessage('Valid ticket ID is required')
], TicketController.getTicketParts);

module.exports = router;
