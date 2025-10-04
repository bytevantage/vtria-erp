const express = require('express');
const router = express.Router();
const enhancedCostingController = require('../controllers/enhancedCosting.controller');

// Enhanced batch costing routes
router.get('/batch/:batch_id/costing-details', enhancedCostingController.getBatchCostingDetails);
router.get('/optimal-allocation', enhancedCostingController.getOptimalAllocation);

// Purchase order cost allocation routes
router.post('/purchase-order-costs', enhancedCostingController.createPurchaseOrderCosts);
router.post('/purchase-order/:purchase_order_id/allocate-costs', enhancedCostingController.allocatePurchaseOrderCosts);

// Cost analysis and reporting
router.get('/cost-analysis-report', enhancedCostingController.getCostAnalysisReport);

module.exports = router;