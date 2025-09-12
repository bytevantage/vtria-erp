/**
 * Authentication Routes for VTRIA ERP
 * Handles login, registration, and token management
 * WAMP Server Compatible with License Validation
 */

const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// License middleware is applied globally in server.js

/**
 * POST /api/auth/login
 * User login with email and password
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], authController.login);

/**
 * POST /api/auth/register
 * User registration (admin only)
 */
router.post('/register', [
  authenticate,
  authorize(['Director', 'Manager']),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').trim().isLength({ min: 2 }),
  body('last_name').trim().isLength({ min: 2 }),
  body('employee_id').optional().trim()
], authController.register);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticate, authController.refreshToken);

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', authenticate, authController.logout);

/**
 * GET /api/auth/license-status
 * Get license status (Director only)
 */
router.get('/license-status', [
  authenticate,
  authorize(['Director'])
], authController.getLicenseStatus);

module.exports = router;
