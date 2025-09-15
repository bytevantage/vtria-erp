const express = require('express');
const router = express.Router();
const companyConfigController = require('../controllers/companyConfig.controller');

// Company configuration routes
router.get('/', companyConfigController.getCompanyConfig);
router.put('/', companyConfigController.updateCompanyConfig);

// Locations routes
router.get('/locations', companyConfigController.getLocations);
router.post('/locations', companyConfigController.addLocation);

// Tax configuration routes
router.get('/tax-config', companyConfigController.getTaxConfig);
router.put('/tax-config/:id', companyConfigController.updateTaxConfig);

module.exports = router;
