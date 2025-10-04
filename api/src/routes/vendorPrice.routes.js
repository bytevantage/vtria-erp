const express = require('express');
const router = express.Router();
const vendorPriceController = require('../controllers/vendorPrice.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Get best prices for a product
router.get('/product/:product_id/best-prices', authMiddleware.verifyToken, vendorPriceController.getBestPrices);

// Get price history for a product-vendor combination
router.get('/product/:product_id/supplier/:supplier_id/history', authMiddleware.verifyToken, vendorPriceController.getPriceHistory);

// Add new vendor price
router.post('/', authMiddleware.verifyToken, vendorPriceController.addVendorPrice);

// Get smart pricing suggestions for multiple products
router.post('/smart-pricing', authMiddleware.verifyToken, vendorPriceController.getSmartPricing);

// Bulk update prices from supplier quote
router.post('/bulk-update-from-quote', authMiddleware.verifyToken, vendorPriceController.bulkUpdateFromQuote);

module.exports = router;