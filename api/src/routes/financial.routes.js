const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// ================================
// INVOICE MANAGEMENT ROUTES
// ================================

// Create new invoice
router.post('/invoices', verifyToken, (req, res) => financialController.createInvoice(req, res));

// Get all invoices with filters
router.get('/invoices', verifyToken, (req, res) => financialController.getInvoices(req, res));

// Get invoice by ID
router.get('/invoices/:id', verifyToken, (req, res) => financialController.getInvoiceById(req, res));

// Update invoice status
router.patch('/invoices/:id/status', verifyToken, (req, res) => financialController.updateInvoiceStatus(req, res));

// ================================
// PAYMENT MANAGEMENT ROUTES
// ================================

// Record payment
router.post('/payments', verifyToken, (req, res) => financialController.recordPayment(req, res));

// Get all payments with filters
router.get('/payments', verifyToken, (req, res) => financialController.getPayments(req, res));

// ================================
// FINANCIAL REPORTS ROUTES
// ================================

// Customer outstanding report
router.get('/reports/outstanding', verifyToken, (req, res) => financialController.getCustomerOutstandingReport(req, res));

// Monthly sales summary
router.get('/reports/sales-summary', verifyToken, (req, res) => financialController.getMonthlySalesSummary(req, res));

// GST summary report
router.get('/reports/gst-summary', verifyToken, (req, res) => financialController.getGSTSummary(req, res));

module.exports = router;