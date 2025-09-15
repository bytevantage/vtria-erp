const express = require('express');
const router = express.Router();
const grnController = require('../controllers/grn.controller');

// GRN routes
router.get('/', grnController.getAllGRNs);
router.get('/:id', grnController.getGRNById);
router.post('/', grnController.createGRN);
router.put('/:id/verify', grnController.verifyGRN);
router.put('/:id/approve', grnController.approveGRN);

module.exports = router;
