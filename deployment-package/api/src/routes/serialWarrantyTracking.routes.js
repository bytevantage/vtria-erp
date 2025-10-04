const express = require('express');
const router = express.Router();
const serialWarrantyTrackingController = require('../controllers/serialWarrantyTracking.controller');
const { checkPermission } = require('../middleware/rbac.middleware');

// Serial number management routes
router.post('/serial-numbers/generate', 
    checkPermission('inventory', 'create'),
    serialWarrantyTrackingController.generateSerialNumbers
);

router.get('/serial-numbers/product/:productId',
    checkPermission('inventory', 'read'),
    serialWarrantyTrackingController.getProductSerialNumbers
);

router.put('/serial-numbers/:serialId/status',
    checkPermission('inventory', 'update'),
    serialWarrantyTrackingController.updateSerialNumberStatus
);

// Warranty information routes
router.get('/warranty/:serialNumber',
    checkPermission('warranty', 'read'),
    serialWarrantyTrackingController.getWarrantyInfo
);

router.get('/warranty-expiry-report',
    checkPermission('warranty', 'read'),
    serialWarrantyTrackingController.getWarrantyExpiryReport
);

// Warranty claims routes
router.post('/warranty-claims',
    checkPermission('warranty', 'create'),
    serialWarrantyTrackingController.createWarrantyClaim
);

router.get('/warranty-claims',
    checkPermission('warranty', 'read'),
    serialWarrantyTrackingController.getWarrantyClaims
);

router.put('/warranty-claims/:claimId',
    checkPermission('warranty', 'update'),
    serialWarrantyTrackingController.updateWarrantyClaim
);

module.exports = router;
