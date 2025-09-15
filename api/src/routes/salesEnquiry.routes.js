const express = require('express');
const router = express.Router();
const salesEnquiryController = require('../controllers/salesEnquiry.controller');

// Sales Enquiry routes
router.get('/', salesEnquiryController.getAllEnquiries);
router.get('/stats', salesEnquiryController.getDashboardStats);
router.get('/:id', salesEnquiryController.getEnquiryById);
router.post('/', salesEnquiryController.createEnquiry);
router.put('/:id', salesEnquiryController.updateEnquiry);
router.put('/:id/assign', salesEnquiryController.assignEnquiry);
router.delete('/:id', salesEnquiryController.deleteEnquiry);

module.exports = router;
