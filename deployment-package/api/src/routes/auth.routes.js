const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { body } = require('express-validator');

// Validation middleware
const validateRegistration = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('user_role').isIn(['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician'])
        .withMessage('Invalid user role')
];

const validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authController.me);

module.exports = router;
