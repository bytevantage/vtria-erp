-- ============================================
-- MIGRATION: Unify Users and Employees Tables
-- Date: October 12, 2025
-- Purpose: Extend users table with HR fields, consolidate data
-- ============================================

-- STEP 1: Add HR fields to users table
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) UNIQUE COMMENT 'Employee identifier (e.g., EMP0001)',
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) COMMENT 'Employee first name',
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) COMMENT 'Employee last name', 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) COMMENT 'Contact phone number',
ADD COLUMN IF NOT EXISTS hire_date DATE COMMENT 'Date of joining',
ADD COLUMN IF NOT EXISTS department_id INT COMMENT 'Department FK',
ADD COLUMN IF NOT EXISTS position VARCHAR(100) COMMENT 'Job title/position',
ADD COLUMN IF NOT EXISTS employee_type ENUM('full_time', 'part_time', 'contract', 'intern', 'consultant') DEFAULT 'full_time' COMMENT 'Employment type',
ADD COLUMN IF NOT EXISTS basic_salary DECIMAL(12,2) COMMENT 'Basic salary (optional)',
ADD COLUMN IF NOT EXISTS work_location_id INT COMMENT 'Primary work location',
ADD COLUMN IF NOT EXISTS manager_id INT COMMENT 'Reporting manager user ID',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE COMMENT 'Active/Inactive flag',
ADD COLUMN IF NOT EXISTS last_login DATETIME COMMENT 'Last login timestamp',
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100) COMMENT 'Emergency contact name',
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20) COMMENT 'Emergency contact phone',
ADD COLUMN IF NOT EXISTS date_of_birth DATE COMMENT 'Date of birth',
ADD COLUMN IF NOT EXISTS address TEXT COMMENT 'Current address',
ADD COLUMN IF NOT EXISTS city VARCHAR(100) COMMENT 'City',
ADD COLUMN IF NOT EXISTS state VARCHAR(100) COMMENT 'State/Province',
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India' COMMENT 'Country',
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) COMMENT 'Postal/ZIP code',
ADD COLUMN IF NOT EXISTS notes TEXT COMMENT 'Internal notes about employee';

-- Add foreign key constraints
ALTER TABLE users
ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users(hire_date);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- STEP 2: Update existing users with employee data
-- ============================================

-- Generate employee IDs for existing users
UPDATE users 
SET employee_id = CONCAT('EMP', LPAD(id, 4, '0'))
WHERE employee_id IS NULL;

-- Split full_name into first_name and last_name
UPDATE users
SET 
  first_name = TRIM(SUBSTRING_INDEX(full_name, ' ', 1)),
  last_name = TRIM(SUBSTRING_INDEX(full_name, ' ', -1))
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- Set hire_date from created_at if not set
UPDATE users
SET hire_date = DATE(created_at)
WHERE hire_date IS NULL;

-- Set is_active based on status
UPDATE users
SET is_active = (status = 'active')
WHERE is_active IS NULL;

-- Set default employee_type
UPDATE users
SET employee_type = 'full_time'
WHERE employee_type IS NULL;

-- STEP 3: Migrate data from employees table (if it exists and has data)
-- ============================================

-- Check if employees table exists and has data
-- If yes, migrate to users table

UPDATE users u
INNER JOIN employees e ON u.email = e.email
SET 
  u.employee_id = COALESCE(u.employee_id, e.employee_id),
  u.first_name = COALESCE(u.first_name, e.first_name),
  u.last_name = COALESCE(u.last_name, e.last_name),
  u.phone = COALESCE(u.phone, e.phone),
  u.hire_date = COALESCE(u.hire_date, e.hire_date),
  u.department_id = COALESCE(u.department_id, e.department_id),
  u.position = COALESCE(u.position, e.position),
  u.employee_type = COALESCE(u.employee_type, e.employee_type),
  u.basic_salary = COALESCE(u.basic_salary, e.basic_salary),
  u.work_location_id = COALESCE(u.work_location_id, e.work_location_id),
  u.manager_id = COALESCE(u.manager_id, e.manager_id),
  u.emergency_contact_name = COALESCE(u.emergency_contact_name, e.emergency_contact_name),
  u.emergency_contact_phone = COALESCE(u.emergency_contact_phone, e.emergency_contact_phone),
  u.date_of_birth = COALESCE(u.date_of_birth, e.date_of_birth),
  u.address = COALESCE(u.address, e.address)
WHERE e.email IS NOT NULL;

-- STEP 4: Create RBAC tables for flexible permission management
-- ============================================

-- Roles table (replaces hardcoded roles)
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL COMMENT 'Role identifier (e.g., director, admin)',
  display_name VARCHAR(100) NOT NULL COMMENT 'Human-readable role name',
  description TEXT COMMENT 'Role description',
  is_system_role BOOLEAN DEFAULT FALSE COMMENT 'System roles cannot be deleted',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Active/Inactive flag',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT COMMENT 'User who created this role',
  INDEX idx_role_name (role_name),
  INDEX idx_is_active (is_active)
) COMMENT='User roles for RBAC';

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'Permission identifier (e.g., sales_enquiry:create)',
  module VARCHAR(50) NOT NULL COMMENT 'Module name (e.g., sales_enquiry)',
  action VARCHAR(50) NOT NULL COMMENT 'Action (create, read, update, delete, approve)',
  display_name VARCHAR(100) NOT NULL COMMENT 'Human-readable permission name',
  description TEXT COMMENT 'Permission description',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_module (module),
  INDEX idx_permission_key (permission_key),
  UNIQUE KEY unique_module_action (module, action)
) COMMENT='System permissions';

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT COMMENT 'User who granted this permission',
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_role_permission (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id)
) COMMENT='Maps permissions to roles';

-- User groups for team/department organization
CREATE TABLE IF NOT EXISTS user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL COMMENT 'Group name',
  group_type ENUM('department', 'team', 'project', 'custom') DEFAULT 'custom' COMMENT 'Group type',
  description TEXT COMMENT 'Group description',
  parent_group_id INT COMMENT 'Parent group for hierarchy',
  department_id INT COMMENT 'Associated department',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  FOREIGN KEY (parent_group_id) REFERENCES user_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_group_type (group_type),
  INDEX idx_is_active (is_active)
) COMMENT='User groups for organization';

-- User-Group membership
CREATE TABLE IF NOT EXISTS user_group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  group_id INT NOT NULL,
  role_in_group ENUM('member', 'leader', 'admin') DEFAULT 'member' COMMENT 'Role within the group',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  added_by INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_group (user_id, group_id),
  INDEX idx_user_id (user_id),
  INDEX idx_group_id (group_id)
) COMMENT='Maps users to groups';

-- Page access control
CREATE TABLE IF NOT EXISTS page_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_route VARCHAR(200) NOT NULL COMMENT 'Frontend route path',
  page_name VARCHAR(100) NOT NULL COMMENT 'Human-readable page name',
  module_category VARCHAR(50) COMMENT 'Module category',
  required_permission VARCHAR(100) COMMENT 'Permission key required to access',
  is_public BOOLEAN DEFAULT FALSE COMMENT 'Public pages dont require login',
  display_order INT DEFAULT 0 COMMENT 'Order for menu display',
  icon_name VARCHAR(50) COMMENT 'Icon identifier',
  parent_route VARCHAR(200) COMMENT 'Parent menu item',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_route (page_route),
  INDEX idx_module_category (module_category),
  INDEX idx_required_permission (required_permission)
) COMMENT='Maps frontend routes to required permissions';

-- STEP 5: Insert default roles
-- ============================================

INSERT IGNORE INTO roles (role_name, display_name, description, is_system_role) VALUES
('director', 'Director', 'Full system access - highest authority', TRUE),
('admin', 'Administrator', 'System administrator with broad access', TRUE),
('sales-admin', 'Sales Administrator', 'Sales department administrator', TRUE),
('designer', 'Designer/Estimator', 'Product designer and cost estimator', TRUE),
('accounts', 'Accounts Manager', 'Finance and accounts team member', TRUE),
('technician', 'Technician', 'Production floor technician', TRUE),
('manager', 'Manager', 'Department or team manager', FALSE),
('supervisor', 'Supervisor', 'Team supervisor with limited approval rights', FALSE);

-- STEP 6: Insert common permissions
-- ============================================

INSERT IGNORE INTO permissions (permission_key, module, action, display_name, description) VALUES
-- Sales module
('sales_enquiry:create', 'sales_enquiry', 'create', 'Create Sales Enquiry', 'Can create new sales enquiries'),
('sales_enquiry:read', 'sales_enquiry', 'read', 'View Sales Enquiry', 'Can view sales enquiries'),
('sales_enquiry:update', 'sales_enquiry', 'update', 'Edit Sales Enquiry', 'Can edit sales enquiries'),
('sales_enquiry:delete', 'sales_enquiry', 'delete', 'Delete Sales Enquiry', 'Can delete sales enquiries'),
('sales_enquiry:approve', 'sales_enquiry', 'approve', 'Approve Sales Enquiry', 'Can approve sales enquiries'),

-- Quotation module
('quotation:create', 'quotation', 'create', 'Create Quotation', 'Can create quotations'),
('quotation:read', 'quotation', 'read', 'View Quotation', 'Can view quotations'),
('quotation:update', 'quotation', 'update', 'Edit Quotation', 'Can edit quotations'),
('quotation:delete', 'quotation', 'delete', 'Delete Quotation', 'Can delete quotations'),
('quotation:approve', 'quotation', 'approve', 'Approve Quotation', 'Can approve quotations'),

-- Estimation module
('estimation:create', 'estimation', 'create', 'Create Estimation', 'Can create cost estimations'),
('estimation:read', 'estimation', 'read', 'View Estimation', 'Can view estimations'),
('estimation:update', 'estimation', 'update', 'Edit Estimation', 'Can edit estimations'),
('estimation:delete', 'estimation', 'delete', 'Delete Estimation', 'Can delete estimations'),
('estimation:approve', 'estimation', 'approve', 'Approve Estimation', 'Can approve estimations'),

-- User management
('users:create', 'users', 'create', 'Create User', 'Can create new users'),
('users:read', 'users', 'read', 'View Users', 'Can view user list'),
('users:update', 'users', 'update', 'Edit User', 'Can edit user details'),
('users:delete', 'users', 'delete', 'Delete User', 'Can delete users'),

-- Manufacturing
('manufacturing:create', 'manufacturing', 'create', 'Create Manufacturing Job', 'Can create manufacturing jobs'),
('manufacturing:read', 'manufacturing', 'read', 'View Manufacturing', 'Can view manufacturing data'),
('manufacturing:update', 'manufacturing', 'update', 'Update Manufacturing', 'Can update manufacturing jobs'),
('manufacturing:delete', 'manufacturing', 'delete', 'Delete Manufacturing', 'Can delete manufacturing jobs'),
('manufacturing:approve', 'manufacturing', 'approve', 'Approve Manufacturing', 'Can approve manufacturing jobs'),

-- Inventory
('inventory:create', 'inventory', 'create', 'Add Inventory', 'Can add inventory items'),
('inventory:read', 'inventory', 'read', 'View Inventory', 'Can view inventory'),
('inventory:update', 'inventory', 'update', 'Update Inventory', 'Can update inventory'),
('inventory:delete', 'inventory', 'delete', 'Delete Inventory', 'Can delete inventory items'),

-- Purchase Orders
('purchase_order:create', 'purchase_order', 'create', 'Create Purchase Order', 'Can create purchase orders'),
('purchase_order:read', 'purchase_order', 'read', 'View Purchase Order', 'Can view purchase orders'),
('purchase_order:update', 'purchase_order', 'update', 'Edit Purchase Order', 'Can edit purchase orders'),
('purchase_order:delete', 'purchase_order', 'delete', 'Delete Purchase Order', 'Can delete purchase orders'),
('purchase_order:approve', 'purchase_order', 'approve', 'Approve Purchase Order', 'Can approve purchase orders'),

-- Reports
('reports:read', 'reports', 'read', 'View Reports', 'Can view analytics and reports'),
('reports:export', 'reports', 'export', 'Export Reports', 'Can export reports to PDF/Excel'),

-- Clients
('clients:create', 'clients', 'create', 'Create Client', 'Can add new clients'),
('clients:read', 'clients', 'read', 'View Clients', 'Can view client list'),
('clients:update', 'clients', 'update', 'Edit Client', 'Can edit client details'),
('clients:delete', 'clients', 'delete', 'Delete Client', 'Can delete clients');

-- STEP 7: Assign permissions to director role (full access)
-- ============================================

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM roles WHERE role_name = 'director'),
  p.id,
  1 -- Granted by user ID 1 (assumed system admin)
FROM permissions p;

-- STEP 8: Insert common page routes
-- ============================================

INSERT IGNORE INTO page_access (page_route, page_name, module_category, required_permission, display_order, icon_name) VALUES
('/dashboard', 'Dashboard', 'general', NULL, 1, 'Dashboard'),
('/sales-enquiry', 'Sales Enquiries', 'sales', 'sales_enquiry:read', 10, 'Assignment'),
('/estimations', 'Estimations', 'sales', 'estimation:read', 11, 'Calculate'),
('/quotations', 'Quotations', 'sales', 'quotation:read', 12, 'Description'),
('/purchase-requisition', 'Purchase Requisitions', 'procurement', 'purchase_order:read', 20, 'ShoppingCart'),
('/purchase-orders', 'Purchase Orders', 'procurement', 'purchase_order:read', 21, 'Receipt'),
('/manufacturing', 'Manufacturing', 'production', 'manufacturing:read', 30, 'Precision Manufacturing'),
('/inventory', 'Inventory', 'inventory', 'inventory:read', 40, 'Inventory'),
('/employee-management', 'Employee Management', 'admin', 'users:read', 50, 'People'),
('/clients', 'Clients', 'sales', 'clients:read', 60, 'Business'),
('/reports', 'Reports & Analytics', 'analytics', 'reports:read', 70, 'Assessment');

-- STEP 9: Verification queries
-- ============================================

-- Check users table structure
SELECT 
  'Users table extended successfully' as status,
  COUNT(*) as total_users,
  SUM(CASE WHEN employee_id IS NOT NULL THEN 1 ELSE 0 END) as users_with_employee_id,
  SUM(CASE WHEN first_name IS NOT NULL THEN 1 ELSE 0 END) as users_with_names
FROM users;

-- Check RBAC setup
SELECT 
  'RBAC setup complete' as status,
  (SELECT COUNT(*) FROM roles) as total_roles,
  (SELECT COUNT(*) FROM permissions) as total_permissions,
  (SELECT COUNT(*) FROM role_permissions) as role_permission_mappings,
  (SELECT COUNT(*) FROM page_access) as page_routes_configured;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Notes:
-- 1. Users table now contains both login and HR data
-- 2. RBAC tables created for flexible permission management
-- 3. Old employees table data migrated (if exists)
-- 4. You can now drop the employees table if no longer needed:
--    -- DROP TABLE IF EXISTS employees;
-- 5. Update your backend API to query unified users table
-- 6. Update frontend to use /employee-management for all user/employee operations
