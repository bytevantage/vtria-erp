# 🚀 Implementation Guide: Unified Employee & User Management

**Date:** October 12, 2025  
**Goal:** Single `/employee-management` page for both login credentials AND HR data  
**Status:** Ready to implement

---

## 📋 What Gets Implemented

### ✅ Database Changes
- Extend `users` table with 20+ HR fields
- Create RBAC tables (roles, permissions, groups)
- Migrate data from `employees` table (if exists)
- Insert default roles and permissions

### ✅ Backend API
- Update `/api/users` endpoints to handle HR fields
- Create `/api/rbac` endpoints for role management
- Update authentication to use unified table

### ✅ Frontend Component
- Enhanced `/employee-management` page
- Combined login + HR management
- Role assignment interface
- Group management

---

## 🔧 Step-by-Step Implementation

### **STEP 1: Run Database Migration** ⏱️ 2 minutes

```bash
# Navigate to project
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Connect to MySQL
docker exec -it vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp

# Run the migration
source /var/lib/mysql-files/001_unify_users_employees.sql

# OR copy-paste from the file
```

**Alternative (if docker volume mapping doesn't work):**

```bash
# Copy SQL file into container
docker cp database/migrations/001_unify_users_employees.sql vtria-erp-db-1:/tmp/

# Connect and run
docker exec -it vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp < /tmp/001_unify_users_employees.sql
```

**Verify migration:**

```sql
-- Check users table has new columns
DESCRIBE users;

-- Check data
SELECT id, employee_id, first_name, last_name, email, user_role, department_id, hire_date FROM users;

-- Check RBAC tables
SELECT * FROM roles;
SELECT * FROM permissions LIMIT 10;
SELECT COUNT(*) FROM role_permissions;
```

---

### **STEP 2: Update Backend - User Controller** ⏱️ 10 minutes

File: `/api/src/controllers/user.controller.js`

Add new methods for unified management:

```javascript
// Get all users with HR details
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
            params.push(is_active === 'true' || is_active === '1');
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

        // Data query with joins
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
                l.location_name,
                u.manager_id,
                CONCAT(m.first_name, ' ', m.last_name) as manager_name,
                u.is_active,
                u.last_login,
                u.emergency_contact_name,
                u.emergency_contact_phone,
                u.date_of_birth,
                u.address,
                u.city,
                u.state,
                u.country,
                u.postal_code,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN work_locations l ON u.work_location_id = l.id
            LEFT JOIN users m ON u.manager_id = m.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), offset);
        const [users] = await db.execute(dataQuery, params);

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

// Create user with HR details
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
            emergency_contact_name,
            emergency_contact_phone,
            date_of_birth,
            address,
            city,
            state,
            country,
            postal_code
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
                employee_id, email, password, first_name, last_name, full_name, phone,
                user_role, department_id, position, hire_date, employee_type,
                basic_salary, work_location_id, manager_id, emergency_contact_name,
                emergency_contact_phone, date_of_birth, address, city, state, country,
                postal_code, status, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', TRUE, NOW(), NOW())
        `;

        const [result] = await db.execute(query, [
            employee_id, email, hashedPassword, first_name, last_name, full_name, phone,
            user_role, department_id, position, hire_date, employee_type || 'full_time',
            basic_salary, work_location_id, manager_id, emergency_contact_name,
            emergency_contact_phone, date_of_birth, address, city, state, country || 'India',
            postal_code
        ]);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
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

// Update user with HR details
exports.updateUserWithHR = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = { ...req.body };

        // Remove fields that shouldn't be updated directly
        delete updateFields.id;
        delete updateFields.password; // Password updated separately
        delete updateFields.created_at;
        delete updateFields.employee_id; // Don't allow changing employee ID

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
            message: 'User updated successfully',
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
```

---

### **STEP 3: Update Routes** ⏱️ 2 minutes

File: `/api/src/routes/user.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Apply auth middleware
router.use(verifyToken);

// Unified user/employee management
router.get('/with-hr', userController.getAllUsersWithHR);
router.post('/with-hr', userController.createUserWithHR);
router.put('/:id/with-hr', userController.updateUserWithHR);

// Keep existing routes for backward compatibility
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
```

---

### **STEP 4: Restart Backend** ⏱️ 1 minute

```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp

# Restart API
docker-compose restart api

# Check logs
docker-compose logs -f api
```

---

### **STEP 5: Test Backend API** ⏱️ 3 minutes

```bash
# Get auth token
TOKEN="your_jwt_token_here"

# Test new endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/users/with-hr

# Should return users with all HR fields
```

---

### **STEP 6: Next Steps** (I'll create these files next)

- ✅ Update frontend `/employee-management` component
- ✅ Create RBAC admin component
- ✅ Update authentication flow
- ✅ Create admin page routing

---

## ✅ What You'll Get

After full implementation:

### Single Employee Management Page:
```
/employee-management
├── Login Credentials (Email, Password, Role, Status)
├── Personal Info (Name, Phone, DOB, Address)
├── Employment Details (Department, Position, Hire Date, Salary)
├── Manager Assignment
└── Group Membership
```

### Features:
- ✅ Add new employee (creates login + HR record)
- ✅ Edit employee (updates both login and HR data)
- ✅ Reset password
- ✅ Assign roles
- ✅ Add to groups/teams
- ✅ Activate/Deactivate users
- ✅ View login history
- ✅ Export to Excel/PDF

---

## 📊 Migration Status

| Step | Status | Time | Description |
|------|--------|------|-------------|
| 1. Database Migration | ✅ Ready | 2 min | SQL file created |
| 2. Backend Controller | ✅ Ready | 10 min | New methods added |
| 3. Backend Routes | ✅ Ready | 2 min | Routes updated |
| 4. Frontend Component | ⏳ Next | 20 min | Enhanced UI |
| 5. RBAC Admin | ⏳ Next | 15 min | Role management |
| 6. Testing | ⏳ Next | 10 min | E2E testing |

**Total Time:** ~60 minutes

---

## 🚀 Ready to Proceed?

1. Run the database migration (STEP 1)
2. I'll update the remaining backend and create the frontend component
3. Test the system end-to-end

**Shall I proceed with STEP 1 or do you want to review the SQL first?**
