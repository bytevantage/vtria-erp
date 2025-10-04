const express = require('express');
const router = express.Router();
const closedCasesController = require('../controllers/closedCases.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Routes
router.get('/', authMiddleware.verifyToken, closedCasesController.getAllClosedCases);
router.get('/:id/history', authMiddleware.verifyToken, closedCasesController.getCaseHistory);
router.post('/close-case', authMiddleware.verifyToken, closedCasesController.closeCase);

module.exports = router;
