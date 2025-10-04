const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth.middleware');

// Document Generation Routes
router.post('/quotation/:quotationId/generate-pdf', authMiddleware.verifyToken, documentController.generateQuotationPDF);
router.post('/invoice/:invoiceId/generate-pdf', authMiddleware.verifyToken, documentController.generateInvoicePDF);
router.post('/delivery-challan/:dcId/generate-pdf', authMiddleware.verifyToken, documentController.generateDeliveryChallanPDF);
router.post('/purchase-order/:poId/generate-pdf', authMiddleware.verifyToken, documentController.generatePurchaseOrderPDF);
router.post('/estimation/:estimationId/generate-pdf', authMiddleware.verifyToken, documentController.generateEstimationPDF);
router.post('/bom/:bomId/generate-pdf', authMiddleware.verifyToken, documentController.generateBomPDF);

// Document Download Routes
router.get('/download/:category/:fileName', authMiddleware.verifyToken, documentController.downloadDocument);

module.exports = router;