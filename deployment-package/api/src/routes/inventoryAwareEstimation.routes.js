const express = require('express');
const router = express.Router();
const inventoryAwareEstimationController = require('../controllers/inventoryAwareEstimation.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication to all routes (bypass in development)
router.use(authMiddleware.verifyToken);

// Intelligent product search for estimation with inventory awareness
// GET /api/inventory-aware-estimation/search-products
// Query params: q (search term), location_id, project_location, min_quantity
router.get('/search-products', 
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator']),
    inventoryAwareEstimationController.searchProductsForEstimation
);

// Get alternative products based on specifications and availability
// GET /api/inventory-aware-estimation/alternatives
// Query params: product_id, category_id, specifications, location_id
router.get('/alternatives',
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator']),
    inventoryAwareEstimationController.getAlternativeProducts
);

// Get vendor price comparison for estimation
// GET /api/inventory-aware-estimation/vendor-comparison
// Query params: product_id, quantity
router.get('/vendor-comparison',
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator', 'purchase_manager']),
    inventoryAwareEstimationController.getVendorPriceComparison
);

// Get stock availability across all locations for estimation
// GET /api/inventory-aware-estimation/multi-location-stock
// Query params: product_ids (comma-separated), project_location
router.get('/multi-location-stock',
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator', 'inventory_manager']),
    inventoryAwareEstimationController.getMultiLocationStock
);

// Get warranty and serial number information for estimation
// GET /api/inventory-aware-estimation/warranty-info/:product_id
router.get('/warranty-info/:product_id',
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator']),
    inventoryAwareEstimationController.getWarrantyInformation
);

// Get estimation cost optimization suggestions
// GET /api/inventory-aware-estimation/cost-optimization/:estimation_id
router.get('/cost-optimization/:estimation_id',
    authMiddleware.hasRole(['admin', 'manager', 'sales_executive', 'estimator']),
    inventoryAwareEstimationController.getCostOptimizationSuggestions
);

module.exports = router;
