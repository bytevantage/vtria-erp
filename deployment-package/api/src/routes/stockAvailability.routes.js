const express = require('express');
const router = express.Router();
const stockAvailabilityController = require('../controllers/stockAvailability.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Check stock availability for single product
router.get('/stock-availability', 
    checkPermission('inventory', 'read'),
    stockAvailabilityController.checkStockAvailability
);

// Bulk stock check for multiple products
router.post('/bulk-stock-check', 
    checkPermission('inventory', 'read'),
    stockAvailabilityController.bulkStockCheck
);

// Get low stock items
router.get('/low-stock', 
    checkPermission('inventory', 'read'),
    stockAvailabilityController.getLowStockItems
);

// Reserve stock for estimation/quotation
router.post('/reserve-stock', 
    checkPermission('inventory', 'update'),
    stockAvailabilityController.reserveStock
);

// Release reserved stock
router.delete('/release-reserved', 
    checkPermission('inventory', 'update'),
    stockAvailabilityController.releaseReservedStock
);

module.exports = router;
