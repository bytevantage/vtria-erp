const express = require('express');
const router = express.Router();
const vendorPerformanceController = require('../controllers/vendorPerformance.controller');

// Vendor comparison and procurement support
router.get('/vendor-comparison', vendorPerformanceController.getVendorComparison);
router.get('/supplier-dashboard', vendorPerformanceController.getSupplierDashboard);

// Price quote management
router.post('/price-quote', vendorPerformanceController.recordPriceQuote);
router.get('/price-history', vendorPerformanceController.getPriceHistory);

// Delivery performance tracking
router.post('/delivery-performance', vendorPerformanceController.recordDeliveryPerformance);

// Performance evaluation
router.post('/supplier/:supplier_id/evaluation', vendorPerformanceController.conductPerformanceEvaluation);
router.put('/supplier/:supplier_id/update-metrics', vendorPerformanceController.updateSupplierMetrics);

module.exports = router;