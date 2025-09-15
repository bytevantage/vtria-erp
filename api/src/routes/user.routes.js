const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { body } = require('express-validator');

// Validation middleware
const validateUser = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('user_role').isIn(['director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician'])
        .withMessage('Invalid user role')
];

// Get all users
router.get('/', userController.getUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user
router.put('/:id', validateUser, userController.updateUser);

// Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;