const express = require('express');
const router = express.Router();
const companyConfigController = require('../controllers/companyConfig.controller');

// Company configuration routes
router.get('/', companyConfigController.getCompanyConfig);
router.put('/', companyConfigController.updateCompanyConfig);

// Locations routes
router.get('/locations', companyConfigController.getLocations);
router.post('/locations', companyConfigController.addLocation);
router.put('/locations/:id', companyConfigController.updateLocation);
router.delete('/locations/:id', companyConfigController.deleteLocation);

// Tax configuration routes
router.get('/tax-config', companyConfigController.getTaxConfig);
router.put('/tax-config', companyConfigController.updateTaxConfig);
router.post('/tax-config', companyConfigController.addTaxConfig);
router.put('/tax-config/reset-home-state', companyConfigController.resetHomeState);
router.put('/tax-config/:id', companyConfigController.updateTaxConfig);
router.delete('/tax-config/:id', companyConfigController.deleteTaxConfig);

module.exports = router;
