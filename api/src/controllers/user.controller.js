const db = require('../config/database');
const bcrypt = require('bcryptjs');
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

exports.createUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { email, full_name, user_role, password } = req.body;

        // Check if email already exists
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password if provided, otherwise use default
        const defaultPassword = 'vtria123';
        const hashedPassword = await bcrypt.hash(password || defaultPassword, 10);

        // Insert new user
        const [result] = await db.execute(
            'INSERT INTO users (email, full_name, user_role, password_hash, status) VALUES (?, ?, ?, ?, ?)',
            [email, full_name, user_role, hashedPassword, 'active']
        );

        // Get the created user (without password)
        const [newUser] = await db.execute(
            'SELECT id, email, full_name, user_role, status, created_at, updated_at FROM users WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser[0]
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
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

// ============================================
// UNIFIED USER/EMPLOYEE MANAGEMENT (NEW)
// ============================================

exports.getAllUsersWithHR = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            department_id,
            user_role,
            employee_type,
            is_active,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        const params = [];

        if (department_id) {
            whereClause += ' AND u.department_id = ?';
            params.push(department_id);
        }

        if (user_role) {
            whereClause += ' AND u.user_role = ?';
            params.push(user_role);
        }

        if (employee_type) {
            whereClause += ' AND u.employee_type = ?';
            params.push(employee_type);
        }

        if (is_active !== undefined) {
            whereClause += ' AND u.is_active = ?';
            params.push((is_active === 'true' || is_active === '1' || is_active === true) ? 1 : 0);
        }

        if (search) {
            whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Count query
        const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total;

        // Data query with joins - create new params array with same values plus limit/offset
        const dataParams = [...params, parseInt(limit), offset];
        const dataQuery = `
            SELECT 
                u.id,
                u.employee_id,
                u.email,
                u.first_name,
                u.last_name,
                u.full_name,
                u.phone,
                u.user_role,
                u.status,
                u.hire_date,
                u.department_id,
                d.department_name,
                u.position,
                u.employee_type,
                u.basic_salary,
                u.work_location_id,
                u.manager_id,
                CONCAT(m.first_name, ' ', m.last_name) as manager_name,
                u.is_active,
                u.last_login,
                u.date_of_birth,
                u.address,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users m ON u.manager_id = m.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [users] = await db.execute(dataQuery, dataParams);

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
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

exports.createUserWithHR = async (req, res) => {
    try {
        const {
            email,
            password,
            first_name,
            last_name,
            phone,
            user_role,
            department_id,
            position,
            hire_date,
            employee_type,
            basic_salary,
            work_location_id,
            manager_id,
            date_of_birth,
            address
        } = req.body;

        // Validate required fields
        if (!email || !password || !first_name || !last_name || !user_role) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, last name, and role are required'
            });
        }

        // Check if email already exists
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate employee_id
        const [maxId] = await db.execute('SELECT MAX(id) as max_id FROM users');
        const nextId = (maxId[0].max_id || 0) + 1;
        const employee_id = `EMP${String(nextId).padStart(4, '0')}`;

        // Full name
        const full_name = `${first_name} ${last_name}`;

        // Insert user
        const query = `
            INSERT INTO users (
                employee_id, email, password_hash, first_name, last_name, full_name, phone,
                user_role, department_id, position, hire_date, employee_type,
                basic_salary, work_location_id, manager_id, date_of_birth, address,
                status, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', TRUE, NOW(), NOW())
        `;

        const [result] = await db.execute(query, [
            employee_id, email, hashedPassword, first_name, last_name, full_name, phone,
            user_role, department_id, position, hire_date, employee_type || 'full_time',
            basic_salary, work_location_id, manager_id, date_of_birth, address
        ]);

        res.status(201).json({
            success: true,
            message: 'Employee/User created successfully',
            user: {
                id: result.insertId,
                employee_id,
                email,
                first_name,
                last_name,
                full_name,
                user_role
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    }
};

exports.updateUserWithHR = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = { ...req.body };

        // Remove fields that shouldn't be updated directly
        delete updateFields.id;
        delete updateFields.password;
        delete updateFields.created_at;
        delete updateFields.employee_id;

        // Update full_name if first_name or last_name changed
        if (updateFields.first_name || updateFields.last_name) {
            const [currentUser] = await db.execute('SELECT first_name, last_name FROM users WHERE id = ?', [id]);
            if (currentUser.length > 0) {
                const firstName = updateFields.first_name || currentUser[0].first_name;
                const lastName = updateFields.last_name || currentUser[0].last_name;
                updateFields.full_name = `${firstName} ${lastName}`;
            }
        }

        updateFields.updated_at = new Date();

        // Build UPDATE query dynamically
        const fields = Object.keys(updateFields);
        const values = Object.values(updateFields);

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const query = `UPDATE users SET ${setClause} WHERE id = ?`;
        values.push(id);

        await db.execute(query, values);

        // Get updated user
        const [updatedUser] = await db.execute(`
            SELECT 
                u.id, u.employee_id, u.email, u.first_name, u.last_name, u.phone,
                u.user_role, u.department_id, d.department_name, u.position,
                u.hire_date, u.employee_type, u.is_active, u.last_login
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        `, [id]);

        res.json({
            success: true,
            message: 'User/Employee updated successfully',
            user: updatedUser[0]
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

exports.resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;

        if (!new_password || new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);

        await db.execute(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, id]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
};

exports.toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;

        const [user] = await db.execute('SELECT is_active, status FROM users WHERE id = ?', [id]);

        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const newActiveState = !user[0].is_active;
        const newStatus = newActiveState ? 'active' : 'inactive';

        await db.execute(
            'UPDATE users SET is_active = ?, status = ?, updated_at = NOW() WHERE id = ?',
            [newActiveState, newStatus, id]
        );

        res.json({
            success: true,
            message: `User ${newActiveState ? 'activated' : 'deactivated'} successfully`,
            is_active: newActiveState
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling user status',
            error: error.message
        });
    }
};