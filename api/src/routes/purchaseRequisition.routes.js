const express = require('express');
const router = express.Router();
const purchaseRequisitionController = require('../controllers/purchaseRequisition.controller');

// Purchase Requisition routes
router.get('/', purchaseRequisitionController.getAllPurchaseRequisitions);
router.get('/approved', purchaseRequisitionController.getApprovedRequisitions);
router.get('/open-quotations-grouped', purchaseRequisitionController.getOpenQuotationsWithGroupedParts);
router.get('/:id', purchaseRequisitionController.getPurchaseRequisitionById);
router.post('/', purchaseRequisitionController.createPurchaseRequisition);
router.post('/from-case', purchaseRequisitionController.createFromCase);
router.post('/from-quotation', purchaseRequisitionController.createFromQuotation);
router.post('/independent', purchaseRequisitionController.createIndependentPR);
router.put('/:id/status', purchaseRequisitionController.updateStatus);
router.put('/:id/items', purchaseRequisitionController.updateItems);
router.put('/:id', purchaseRequisitionController.updatePurchaseRequisition);
router.get('/:id/pdf', purchaseRequisitionController.generatePDF);
router.delete('/:id', purchaseRequisitionController.deletePurchaseRequisition);

module.exports = router;
