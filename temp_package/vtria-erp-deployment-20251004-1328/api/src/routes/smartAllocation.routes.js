const express = require('express');
const router = express.Router();
const smartAllocationController = require('../controllers/smartAllocation.controller');

// Smart allocation preview and execution
router.post('/allocation/preview', smartAllocationController.getAllocationPreview);
router.post('/allocation/execute', smartAllocationController.executeAllocation);

// Allocation strategy management
router.get('/allocation/strategies', smartAllocationController.getAllocationStrategies);
router.post('/allocation/strategies', smartAllocationController.createAllocationStrategy);
router.put('/allocation/strategies/:strategy_id', smartAllocationController.updateAllocationStrategy);

// Allocation analytics and reporting
router.get('/allocation/analytics', smartAllocationController.getAllocationAnalytics);
router.get('/allocation/recommendations', smartAllocationController.getRecommendations);

// Business context configuration
router.get('/allocation/contexts', smartAllocationController.getBusinessContexts);
router.post('/allocation/contexts', smartAllocationController.createBusinessContext);

// Allocation history and audit
router.get('/allocation/history', smartAllocationController.getAllocationHistory);
router.get('/allocation/performance', smartAllocationController.getAllocationPerformance);

module.exports = router;