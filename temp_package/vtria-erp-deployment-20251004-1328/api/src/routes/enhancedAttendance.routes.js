const express = require('express');
const router = express.Router();
const enhancedAttendanceController = require('../controllers/enhancedAttendance.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// ============================================================================
// ATTENDANCE VALIDATION RULES ROUTES
// ============================================================================

// Get attendance validation rules
router.get('/validation-rules', enhancedAttendanceController.getValidationRules);

// Create attendance validation rule
router.post('/validation-rules', enhancedAttendanceController.createValidationRule);

// ============================================================================
// ENHANCED ATTENDANCE RECORDING ROUTES
// ============================================================================

// Record attendance with enhanced validation
router.post('/record', enhancedAttendanceController.recordAttendance);

// Get enhanced attendance records
router.get('/records', enhancedAttendanceController.getEnhancedAttendanceRecords);

// ============================================================================
// ATTENDANCE EXCEPTIONS AND APPROVALS ROUTES
// ============================================================================

// Request attendance exception
router.post('/exceptions', enhancedAttendanceController.requestAttendanceException);

// Process attendance exception
router.put('/exceptions/:id/process', enhancedAttendanceController.processAttendanceException);

// ============================================================================
// ATTENDANCE ANALYTICS ROUTES
// ============================================================================

// Get attendance analytics
router.get('/analytics', enhancedAttendanceController.getAttendanceAnalytics);

module.exports = router;