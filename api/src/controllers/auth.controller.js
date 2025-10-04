const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.register = async (req, res) => {
    try {
        const { email, password, full_name, user_role } = req.body;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user into database
        const [result] = await db.execute(
            'INSERT INTO users (email, password_hash, full_name, user_role) VALUES (?, ?, ?, ?)',
            [email, hashedPassword, full_name, user_role]
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { id: result.insertId, email, full_name, user_role }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error registering user',
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user from database
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ? AND status = "active"',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.user_role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    user_role: user.user_role
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
};

exports.me = async (req, res) => {
    try {
        // For development mode, return mock user data
        // In production, this would decode the JWT token and return user info
        res.json({
            success: true,
            data: {
                user: {
                    id: 1,
                    email: 'demo@vtria.com',
                    full_name: 'Demo User',
                    user_role: 'admin'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user profile',
            error: error.message
        });
    }
};
