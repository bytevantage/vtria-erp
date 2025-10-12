# 🎯 Unified User & RBAC System Solution

**Date:** October 12, 2025  
**Issue:** Redundant users/employees tables + Missing RBAC admin UI  
**Solution:** Unified approach with proper admin pages

---

## 🎯 Your Concerns Are 100% Valid

You're absolutely right:

### ❌ Current Problems
1. **Two tables (users + employees)** = Double work
2. **No admin UI** to manage roles/groups
3. **Hardcoded permissions** in middleware files
4. **No way to map pages to roles** visually
5. **All employees need login anyway** = Why separate tables?

### ✅ Solution: ONE Unified Table

Use **ONLY the `users` table** with extended fields for HR data.

---

## 📋 Recommended Approach

### Option 1: Extend Users Table (RECOMMENDED) ⭐

Keep `users` as the single source of truth, add HR fields to it:

```sql
-- Add HR fields to users table
ALTER TABLE users
ADD COLUMN employee_id VARCHAR(20) UNIQUE,
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN last_name VARCHAR(100),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN hire_date DATE,
ADD COLUMN department_id INT,
ADD COLUMN position VARCHAR(100),
ADD COLUMN employee_type ENUM('full_time', 'part_time', 'contract', 'intern') DEFAULT 'full_time',
ADD COLUMN basic_salary DECIMAL(12,2),
ADD COLUMN work_location_id INT,
ADD COLUMN manager_id INT,
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN last_login DATETIME;

-- Update existing users with basic data
UPDATE users 
SET 
  employee_id = CONCAT('EMP', LPAD(id, 4, '0')),
  first_name = SUBSTRING_INDEX(full_name, ' ', 1),
  last_name = SUBSTRING_INDEX(full_name, ' ', -1),
  hire_date = created_at,
  employee_type = 'full_time',
  is_active = (status = 'active');
```

**Benefits:**
- ✅ Single table = No data duplication
- ✅ All users can login
- ✅ HR fields optional (for those who need them)
- ✅ Simpler codebase
- ✅ No syncing needed

### Option 2: Make Employees Reference Users

Keep both tables but employees MUST have a user:

```sql
-- Add foreign key to employees
ALTER TABLE employees
ADD COLUMN user_id INT UNIQUE,
ADD CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES users(id);

-- Every employee must have a user account
UPDATE employees e
SET user_id = (
  SELECT u.id FROM users u WHERE u.email = e.email LIMIT 1
);
```

**This is what you have now - NOT RECOMMENDED** ❌

---

## 🎨 Create RBAC Admin UI

You need an admin page to manage roles and permissions.

### Database Schema for Dynamic RBAC

```sql
-- Create roles table (instead of hardcoded)
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE, -- director, admin cannot be deleted
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'sales_enquiry:create'
  module VARCHAR(50) NOT NULL, -- e.g., 'sales_enquiry'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT, -- user_id who granted
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Create user_groups table (for team/department grouping)
CREATE TABLE IF NOT EXISTS user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  group_type ENUM('department', 'team', 'project', 'custom') DEFAULT 'custom',
  description TEXT,
  parent_group_id INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_group_id) REFERENCES user_groups(id)
);

-- Create user_group_members mapping
CREATE TABLE IF NOT EXISTS user_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  group_id INT NOT NULL,
  role_in_group ENUM('member', 'leader', 'admin') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_group (user_id, group_id)
);

-- Create page_access table (map routes to roles)
CREATE TABLE IF NOT EXISTS page_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_route VARCHAR(200) NOT NULL, -- e.g., '/dashboard', '/sales-enquiry'
  page_name VARCHAR(100) NOT NULL,
  module_category VARCHAR(50), -- e.g., 'sales', 'procurement', 'manufacturing'
  required_permission VARCHAR(100), -- e.g., 'sales_enquiry:read'
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_route (page_route)
);

-- Insert system roles
INSERT INTO roles (role_name, display_name, description, is_system_role) VALUES
('director', 'Director', 'Full system access', TRUE),
('admin', 'Administrator', 'System administrator with broad access', TRUE),
('sales-admin', 'Sales Admin', 'Sales department administrator', TRUE),
('designer', 'Designer', 'Product designer and estimator', TRUE),
('accounts', 'Accounts', 'Finance and accounts team', TRUE),
('technician', 'Technician', 'Production technician', TRUE);

-- Insert common permissions
INSERT INTO permissions (permission_key, module, action, display_name, description) VALUES
-- Sales permissions
('sales_enquiry:create', 'sales_enquiry', 'create', 'Create Sales Enquiry', 'Can create new sales enquiries'),
('sales_enquiry:read', 'sales_enquiry', 'read', 'View Sales Enquiry', 'Can view sales enquiries'),
('sales_enquiry:update', 'sales_enquiry', 'update', 'Edit Sales Enquiry', 'Can edit sales enquiries'),
('sales_enquiry:delete', 'sales_enquiry', 'delete', 'Delete Sales Enquiry', 'Can delete sales enquiries'),
('sales_enquiry:approve', 'sales_enquiry', 'approve', 'Approve Sales Enquiry', 'Can approve sales enquiries'),

-- Quotation permissions
('quotation:create', 'quotation', 'create', 'Create Quotation', 'Can create quotations'),
('quotation:read', 'quotation', 'read', 'View Quotation', 'Can view quotations'),
('quotation:update', 'quotation', 'update', 'Edit Quotation', 'Can edit quotations'),
('quotation:delete', 'quotation', 'delete', 'Delete Quotation', 'Can delete quotations'),
('quotation:approve', 'quotation', 'approve', 'Approve Quotation', 'Can approve quotations'),

-- User management permissions
('users:create', 'users', 'create', 'Create User', 'Can create new users'),
('users:read', 'users', 'read', 'View Users', 'Can view user list'),
('users:update', 'users', 'update', 'Edit User', 'Can edit user details'),
('users:delete', 'users', 'delete', 'Delete User', 'Can delete users'),

-- Manufacturing permissions
('manufacturing:create', 'manufacturing', 'create', 'Create Manufacturing Job', 'Can create manufacturing jobs'),
('manufacturing:read', 'manufacturing', 'read', 'View Manufacturing', 'Can view manufacturing data'),
('manufacturing:update', 'manufacturing', 'update', 'Update Manufacturing', 'Can update manufacturing jobs'),
('manufacturing:delete', 'manufacturing', 'delete', 'Delete Manufacturing', 'Can delete manufacturing jobs'),

-- Inventory permissions
('inventory:create', 'inventory', 'create', 'Add Inventory', 'Can add inventory items'),
('inventory:read', 'inventory', 'read', 'View Inventory', 'Can view inventory'),
('inventory:update', 'inventory', 'update', 'Update Inventory', 'Can update inventory'),
('inventory:delete', 'inventory', 'delete', 'Delete Inventory', 'Can delete inventory items');

-- Map permissions to roles (example for director role)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM roles WHERE role_name = 'director'),
  p.id,
  1 -- Granted by user ID 1
FROM permissions p;

-- Insert page routes
INSERT INTO page_access (page_route, page_name, module_category, required_permission) VALUES
('/dashboard', 'Dashboard', 'general', NULL),
('/sales-enquiry', 'Sales Enquiries', 'sales', 'sales_enquiry:read'),
('/quotations', 'Quotations', 'sales', 'quotation:read'),
('/users', 'User Management', 'admin', 'users:read'),
('/manufacturing', 'Manufacturing', 'production', 'manufacturing:read'),
('/inventory', 'Inventory', 'inventory', 'inventory:read'),
('/purchase-orders', 'Purchase Orders', 'procurement', 'purchase_order:read'),
('/reports', 'Reports', 'analytics', 'reports:read');
```

---

## 🎨 Frontend RBAC Admin Component

Create `/client/src/components/admin/RBACManagement.jsx`:

```jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent,
  Button, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Chip, IconButton, Switch, Grid
} from '@mui/material';
import {
  Add, Edit, Delete, Security, Group, Pages, Settings
} from '@mui/icons-material';
import axios from 'axios';

const RBACManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pages, setPages] = useState([]);
  const [users, setUsers] = useState([]);

  // Dialogs
  const [roleDialog, setRoleDialog] = useState(false);
  const [permissionDialog, setPermissionDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [pageAccessDialog, setPageAccessDialog] = useState(false);

  // Forms
  const [roleForm, setRoleForm] = useState({
    role_name: '',
    display_name: '',
    description: '',
    permissions: []
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [rolesRes, permsRes, groupsRes, pagesRes, usersRes] = await Promise.all([
        axios.get('/api/rbac/roles'),
        axios.get('/api/rbac/permissions'),
        axios.get('/api/rbac/groups'),
        axios.get('/api/rbac/pages'),
        axios.get('/api/users')
      ]);

      setRoles(rolesRes.data.data || []);
      setPermissions(permsRes.data.data || []);
      setGroups(groupsRes.data.data || []);
      setPages(pagesRes.data.data || []);
      setUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error loading RBAC data:', error);
    }
  };

  const renderRolesTab = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Roles Management</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setRoleDialog(true)}
          >
            Create Role
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Display Name</TableCell>
              <TableCell>Users Count</TableCell>
              <TableCell>Permissions</TableCell>
              <TableCell>System Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map(role => (
              <TableRow key={role.id}>
                <TableCell>{role.role_name}</TableCell>
                <TableCell>{role.display_name}</TableCell>
                <TableCell>{role.users_count || 0}</TableCell>
                <TableCell>{role.permissions_count || 0}</TableCell>
                <TableCell>
                  {role.is_system_role ? (
                    <Chip label="System" color="primary" size="small" />
                  ) : (
                    <Chip label="Custom" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditRole(role)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  {!role.is_system_role && (
                    <IconButton size="small" onClick={() => handleDeleteRole(role.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderPermissionsTab = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Permissions Matrix</Typography>
        </Box>

        {/* Group permissions by module */}
        {Object.entries(
          permissions.reduce((acc, perm) => {
            if (!acc[perm.module]) acc[perm.module] = [];
            acc[perm.module].push(perm);
            return acc;
          }, {})
        ).map(([module, perms]) => (
          <Box key={module} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
              {module.toUpperCase()}
            </Typography>
            <Grid container spacing={1}>
              {perms.map(perm => (
                <Grid item xs={12} sm={6} md={4} key={perm.id}>
                  <Chip
                    label={`${perm.action}`}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  {perm.display_name}
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  const renderGroupsTab = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">User Groups</Typography>
          <Button
            variant="contained"
            startIcon={<Group />}
            onClick={() => setGroupDialog(true)}
          >
            Create Group
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(group => (
              <TableRow key={group.id}>
                <TableCell>{group.group_name}</TableCell>
                <TableCell>
                  <Chip label={group.group_type} size="small" />
                </TableCell>
                <TableCell>{group.members_count || 0}</TableCell>
                <TableCell>
                  <Switch checked={group.is_active} />
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small">
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderPageAccessTab = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Page Access Control</Typography>
          <Button
            variant="contained"
            startIcon={<Pages />}
            onClick={() => setPageAccessDialog(true)}
          >
            Add Page Route
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Page Route</TableCell>
              <TableCell>Page Name</TableCell>
              <TableCell>Module</TableCell>
              <TableCell>Required Permission</TableCell>
              <TableCell>Public</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pages.map(page => (
              <TableRow key={page.id}>
                <TableCell><code>{page.page_route}</code></TableCell>
                <TableCell>{page.page_name}</TableCell>
                <TableCell>
                  <Chip label={page.module_category || 'N/A'} size="small" />
                </TableCell>
                <TableCell>
                  <code>{page.required_permission || 'None'}</code>
                </TableCell>
                <TableCell>
                  {page.is_public ? (
                    <Chip label="Public" color="success" size="small" />
                  ) : (
                    <Chip label="Protected" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
        Role-Based Access Control
      </Typography>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Roles" icon={<Security />} iconPosition="start" />
        <Tab label="Permissions" icon={<Settings />} iconPosition="start" />
        <Tab label="Groups" icon={<Group />} iconPosition="start" />
        <Tab label="Page Access" icon={<Pages />} iconPosition="start" />
      </Tabs>

      {activeTab === 0 && renderRolesTab()}
      {activeTab === 1 && renderPermissionsTab()}
      {activeTab === 2 && renderGroupsTab()}
      {activeTab === 3 && renderPageAccessTab()}

      {/* Add dialogs for create/edit operations */}
    </Box>
  );
};

export default RBACManagement;
```

---

## 🚀 Implementation Steps

### Step 1: Extend Users Table ✅

```bash
# Connect to database
docker exec -it vtria-erp-db-1 mysql -u vtria_user -pdev_password vtria_erp

# Run the ALTER TABLE command from Option 1 above
# Then run all the CREATE TABLE commands for RBAC
# Then INSERT the system roles and permissions
```

### Step 2: Create Backend API Routes

Create `/api/src/controllers/rbac.controller.js`:
- GET /api/rbac/roles
- POST /api/rbac/roles
- PUT /api/rbac/roles/:id
- DELETE /api/rbac/roles/:id
- GET /api/rbac/permissions
- POST /api/rbac/role-permissions (assign permissions to role)
- GET /api/rbac/groups
- POST /api/rbac/groups
- POST /api/rbac/group-members (add user to group)
- GET /api/rbac/pages
- POST /api/rbac/pages

### Step 3: Add Frontend Route

In `client/src/App.js`:
```javascript
import RBACManagement from './components/admin/RBACManagement';

// Add route
<Route path="/admin/rbac" element={
  <ProtectedRoute>
    <RBACManagement />
  </ProtectedRoute>
} />
```

### Step 4: Update Middleware

Modify `/api/src/middleware/rbac.middleware.js` to check database instead of hardcoded permissions.

### Step 5: Remove Employees Table (Optional)

Once users table is extended, you can drop or archive the employees table.

---

## ✅ Benefits After Implementation

### Before (Current):
```
users (login) + employees (HR data) = Double work
Hardcoded permissions = No flexibility
No admin UI = Edit code to change roles
```

### After (Fixed):
```
users table (all data) = Single source of truth
Database permissions = Flexible, customizable
Admin UI = Point-and-click role management
Groups = Organize users into teams
Page mapping = Visual access control
```

---

## 📝 Summary

**What You Need:**
1. ✅ Extend `users` table with HR fields
2. ✅ Create RBAC tables (roles, permissions, groups)
3. ✅ Build admin UI for RBAC management
4. ✅ Update middleware to use database permissions
5. ✅ Remove or archive `employees` table

**Result:**
- One unified user table
- Point-and-click permission management
- Visual page access control
- No more double data entry
- Flexible, scalable RBAC system

---

**Want me to implement this? I can:**
1. Create the SQL migration scripts
2. Build the RBAC controller and routes
3. Create the frontend admin component
4. Update the middleware
5. Provide step-by-step migration guide

Let me know which parts you want me to build!
