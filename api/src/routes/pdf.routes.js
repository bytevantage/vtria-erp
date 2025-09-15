const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdf.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Generate quotation PDF
router.post('/quotation/:quotationId', 
    checkPermission('quotations', 'read'),
    pdfController.generateQuotationPDF
);

// Generate purchase order PDF
router.post('/purchase-order/:poId', 
    checkPermission('purchase_orders', 'read'),
    pdfController.generatePurchaseOrderPDF
);

// Generate GRN PDF
router.post('/grn/:grnId', 
    checkPermission('inventory', 'read'),
    pdfController.generateGRNPDF
);

// Download PDF file
router.get('/download/:fileName', pdfController.downloadPDF);

// View PDF in browser
router.get('/view/:fileName', pdfController.viewPDF);

module.exports = router;
