const express = require('express');
const router = express.Router();
const rfqController = require('../controllers/rfq.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// RFQ Campaign routes
router.post('/create', rfqController.createRFQCampaign);
router.get('/', rfqController.getRFQCampaigns);
router.get('/:rfq_id/bids', rfqController.getRFQBids);
router.post('/:rfq_id/select-winner', rfqController.selectWinningBid);

// Purchase Requisition from RFQ
router.post('/from-rfq-winner', rfqController.createPRFromRFQWinner);

// Supplier bid submission
router.post('/submit-bid', rfqController.submitSupplierBid);

module.exports = router;