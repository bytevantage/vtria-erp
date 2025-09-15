const db = require('../config/database');
const { validationResult } = require('express-validator');

exports.getUsers = async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, email, full_name, user_role, status, created_at, updated_at FROM users ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [users] = await db.execute(
            'SELECT id, email, full_name, user_role, status, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { email, full_name, user_role, status } = req.body;

        // Check if user exists
        const [existingUser] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is already taken by another user
        const [emailCheck] = await db.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, id]
        );
        
        if (emailCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Update user
        await db.execute(
            'UPDATE users SET email = ?, full_name = ?, user_role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [email, full_name, user_role, status || 'active', id]
        );

        // Get updated user
        const [updatedUser] = await db.execute(
            'SELECT id, email, full_name, user_role, status, created_at, updated_at FROM users WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const [existingUser] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete by setting status to 'inactive'
        await db.execute(
            'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['inactive', id]
        );

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};