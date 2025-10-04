const express = require('express');
const router = express.Router();
const leavePolicyController = require('../controllers/leavePolicyManagement.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// ============================================================================
// LEAVE POLICIES ROUTES
// ============================================================================

// Get all leave policies
router.get('/policies', leavePolicyController.getLeavePolicies);

// Create new leave policy
router.post('/policies', leavePolicyController.createLeavePolicy);

// ============================================================================
// ENHANCED LEAVE TYPES ROUTES
// ============================================================================

// Get all enhanced leave types
router.get('/types', leavePolicyController.getEnhancedLeaveTypes);

// Create enhanced leave type
router.post('/types', leavePolicyController.createEnhancedLeaveType);

// Update enhanced leave type
router.put('/types/:id', leavePolicyController.updateEnhancedLeaveType);

// ============================================================================
// EMPLOYEE LEAVE ENTITLEMENTS ROUTES
// ============================================================================

// Get employee leave entitlements
router.get('/entitlements', leavePolicyController.getEmployeeLeaveEntitlements);

// Initialize leave entitlements for employee
router.post('/entitlements/initialize', leavePolicyController.initializeEmployeeEntitlements);

// Update employee leave entitlement
router.put('/entitlements/:id', leavePolicyController.updateEmployeeEntitlement);

// ============================================================================
// ENHANCED LEAVE APPLICATIONS ROUTES
// ============================================================================

// Submit enhanced leave application
router.post('/applications', leavePolicyController.submitEnhancedLeaveApplication);

// Get enhanced leave applications
router.get('/applications', leavePolicyController.getEnhancedLeaveApplications);

// Approve/Reject leave application
router.put('/applications/:id/process', leavePolicyController.processLeaveApplication);

// Get employee leave balance summary
router.get('/balance/:employee_id', leavePolicyController.getEmployeeLeaveBalance);

module.exports = router;