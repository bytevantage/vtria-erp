const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grn.controller');

// GRN routes
router.get('/', grnController.getAllGRNs);
router.get('/:id', grnController.getGRNById);
router.post('/', grnController.createGRN);
router.put('/:id/verify', grnController.verifyGRN);
router.put('/:id/approve', grnController.approveGRN);

// PO-GRN Validation and Reporting Routes
router.post('/validate-before-creation', grnController.validateGRNBeforeCreation);
router.get('/po-completion/:po_id', grnController.getPOCompletionStatus);
router.get('/discrepancy-report/:grn_id', grnController.getGRNDiscrepancyReport);

// Enhanced Inventory Management Routes
router.get('/inventory/movement-history/:product_id', grnController.getInventoryMovementHistory);
router.get('/inventory/current-stock', grnController.getCurrentStockLevels);
router.get('/inventory/batch-details/:product_id', grnController.getProductBatchDetails);

module.exports = router;
