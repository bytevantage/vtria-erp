const express = require('express');
const router = express.Router();
const caseHistoryController = require('../controllers/caseHistory.controller');

// Get case history for a specific case
router.get('/:caseType/:caseId', caseHistoryController.getCaseHistory);

// Add new case history entry
router.post('/:caseType/:caseId', caseHistoryController.addCaseHistory);

// Get workflow status for a specific case
router.get('/:caseType/:caseId/status', caseHistoryController.getWorkflowStatus);

// Update case status and add history entry
router.put('/:caseType/:caseId/status', caseHistoryController.updateCaseStatus);

module.exports = router;
