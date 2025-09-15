const express = require('express');
const router = express.Router();
const deliveryChallanController = require('../controllers/deliveryChallan.controller');

// Delivery Challan routes
router.get('/', deliveryChallanController.getAllDeliveryChallans);
router.get('/:id', deliveryChallanController.getDeliveryChallanById);
router.post('/', deliveryChallanController.createDeliveryChallan);
router.put('/:id/status', deliveryChallanController.updateDeliveryChallanStatus);

module.exports = router;
