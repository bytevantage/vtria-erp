const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware.verifyToken);

// ==================== TICKET CRUD ====================

// Create new ticket
router.post('/', ticketController.createTicket);

// Get all tickets with filters
router.get('/', ticketController.getAllTickets);

// Get single ticket by ID or ticket number
router.get('/:id', ticketController.getTicketById);

// Update ticket status
router.put('/:id/status', ticketController.updateTicketStatus);

// Close ticket (with mandatory notes)
router.post('/:id/close', ticketController.closeTicket);

// ==================== TICKET NOTES ====================

// Add note to ticket (append-only)
router.post('/:id/notes', ticketController.addTicketNote);

// ==================== TICKET ASSIGNMENT ====================

// Assign ticket to user
router.put('/:id/assign', ticketController.assignTicket);

// ==================== TICKET QUEUE MANAGEMENT ====================

// Get all ticket queues
router.get('/queues/all', ticketController.getTicketQueues);

// Move ticket to different queue
router.put('/:id/queue', ticketController.moveTicketToQueue);

// Reject ticket (move back to previous queue)
router.post('/:id/reject', ticketController.rejectTicket);

module.exports = router;
