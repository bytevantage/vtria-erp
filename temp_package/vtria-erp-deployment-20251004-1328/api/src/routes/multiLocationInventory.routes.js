const express = require('express');
const router = express.Router();
const multiLocationInventoryController = require('../controllers/multiLocationInventory.controller');
// const { checkPermission } = require('../middleware/rbac.middleware');

// Get stock levels by location for a product
router.get('/stock/:productId/locations', 
    // checkPermission('inventory', 'read'),
    multiLocationInventoryController.getStockByLocation
);

// Get location stock summary
router.get('/locations/summary', 
    // checkPermission('inventory', 'read'),
    multiLocationInventoryController.getLocationStockSummary
);

// Create inter-store transfer request
router.post('/transfers', 
    // checkPermission('inventory', 'create'),
    multiLocationInventoryController.createTransferRequest
);

// Get transfer requests
router.get('/transfers', 
    // checkPermission('inventory', 'read'),
    multiLocationInventoryController.getTransferRequests
);

// Get transfer request details
router.get('/transfers/:transferId', 
    // checkPermission('inventory', 'read'),
    multiLocationInventoryController.getTransferRequestDetails
);

// Approve transfer request
router.put('/transfers/:transferId/approve', 
    // checkPermission('inventory', 'update'),
    multiLocationInventoryController.approveTransfer
);

// Execute transfer (ship items)
router.put('/transfers/:transferId/execute', 
    // checkPermission('inventory', 'update'),
    multiLocationInventoryController.executeTransfer
);

// Get stock movement history
router.get('/movements', 
    // checkPermission('inventory', 'read'),
    multiLocationInventoryController.getStockMovementHistory
);

module.exports = router;
