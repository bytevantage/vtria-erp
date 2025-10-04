const express = require('express');
const router = express.Router();
const locationAccessController = require('../controllers/locationBasedAccess.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// ============================================================================
// OFFICE LOCATIONS ROUTES
// ============================================================================

// Get all office locations
router.get('/locations', locationAccessController.getOfficeLocations);

// Create office location
router.post('/locations', locationAccessController.createOfficeLocation);

// Update office location
router.put('/locations/:id', locationAccessController.updateOfficeLocation);

// ============================================================================
// EMPLOYEE LOCATION PERMISSIONS ROUTES
// ============================================================================

// Get employee location permissions
router.get('/permissions', locationAccessController.getEmployeeLocationPermissions);

// Grant location permission to employee
router.post('/permissions', locationAccessController.grantLocationPermission);

// Validate location access
router.post('/validate/location', locationAccessController.validateLocationAccess);

// ============================================================================
// IP ACCESS CONTROLS ROUTES
// ============================================================================

// Get IP access controls
router.get('/ip-controls', locationAccessController.getIPAccessControls);

// Create IP access control rule
router.post('/ip-controls', locationAccessController.createIPAccessControl);

// Validate IP access
router.post('/validate/ip', locationAccessController.validateIPAccess);

// ============================================================================
// LOGIN ATTEMPT LOGGING ROUTES
// ============================================================================

// Log login attempt
router.post('/login-attempts', locationAccessController.logLoginAttempt);

// Get login attempt logs
router.get('/login-attempts', locationAccessController.getLoginAttemptLogs);

module.exports = router;