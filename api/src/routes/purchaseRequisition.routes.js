const express = require('express');
const router = express.Router();
const purchaseRequisitionController = require('../controllers/purchaseRequisition.controller');

// Purchase Requisition routes
router.get('/', purchaseRequisitionController.getAllPurchaseRequisitions);
router.get('/:id', purchaseRequisitionController.getPurchaseRequisitionById);
router.post('/', purchaseRequisitionController.createPurchaseRequisition);
router.put('/:id/status', purchaseRequisitionController.updatePurchaseRequisitionStatus);

module.exports = router;
