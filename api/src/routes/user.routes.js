const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { check } = require('express-validator');

// Define validation rules
const createUserValidation = [
    check('email').isEmail().withMessage('Valid email is required'),
    check('full_name').notEmpty().withMessage('Full name is required'),
    check('user_role').isIn(['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician']).withMessage('Invalid user role')
];

const updateUserValidation = [
    check('email').isEmail().withMessage('Valid email is required'),
    check('full_name').notEmpty().withMessage('Full name is required'),
    check('user_role').isIn(['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician']).withMessage('Invalid user role')
];

// Apply authentication middleware to all routes
router.use(verifyToken);

// ============================================
// UNIFIED USER/EMPLOYEE MANAGEMENT (NEW)
// ============================================

// Get all users with HR details
router.get('/with-hr', userController.getAllUsersWithHR);

// Create user with HR details
router.post('/with-hr', userController.createUserWithHR);

// Update user with HR details
router.put('/:id/with-hr', userController.updateUserWithHR);

// Reset user password
router.post('/:id/reset-password', userController.resetUserPassword);

// Toggle user active/inactive
router.post('/:id/toggle-active', userController.toggleUserActive);

// ============================================
// LEGACY ROUTES (Backward compatible)
// ============================================

// User routes
router.get('/', userController.getUsers);
router.post('/', createUserValidation, userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', updateUserValidation, userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;