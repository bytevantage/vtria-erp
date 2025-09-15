const express = require('express');
const router = express.Router();
const aiInsightsController = require('../controllers/aiInsights.controller');

// AI Dashboard and Analytics
router.get('/dashboard/:clientId', aiInsightsController.getAIDashboard);
router.get('/model-performance', aiInsightsController.getModelPerformance);

// AI Insights Management
router.get('/cases/:caseId/insights', aiInsightsController.getCaseInsights);
router.post('/generate-insights', aiInsightsController.generateInsights);

// AI Recommendations
router.get('/cases/:caseId/recommendations', aiInsightsController.getRecommendations);
router.put('/recommendations/:recommendationId/status', aiInsightsController.updateRecommendationStatus);

// AI Alerts
router.get('/alerts/:clientId', aiInsightsController.getAlerts);
router.put('/alerts/:alertId/acknowledge', aiInsightsController.acknowledgeAlert);

module.exports = router;