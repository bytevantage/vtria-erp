const express = require('express');
const router = express.Router();
const purchasePriceComparisonController = require('../controllers/purchasePriceComparison.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Get price comparison for estimation
router.get('/estimation/:estimationId/comparison', 
    checkPermission('estimations', 'read'),
    purchasePriceComparisonController.getEstimationPriceComparison
);

// Create quote request to suppliers
router.post('/quote-requests', 
    checkPermission('purchase_orders', 'create'),
    purchasePriceComparisonController.createQuoteRequest
);

// Record supplier quote response
router.post('/supplier-quotes', 
    checkPermission('purchase_orders', 'create'),
    purchasePriceComparisonController.recordSupplierQuote
);

// Get quote requests
router.get('/quote-requests', 
    checkPermission('purchase_orders', 'read'),
    purchasePriceComparisonController.getQuoteRequests
);

// Get supplier quotes
router.get('/supplier-quotes', 
    checkPermission('purchase_orders', 'read'),
    purchasePriceComparisonController.getSupplierQuotes
);

// Get price analysis report
router.get('/estimation/:estimationId/analysis', 
    checkPermission('estimations', 'read'),
    purchasePriceComparisonController.getPriceAnalysisReport
);

module.exports = router;
