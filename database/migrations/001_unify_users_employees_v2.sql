-- ============================================
-- MIGRATION: Unify Users and Employees Tables (MySQL 5.7+ Compatible)
-- Date: October 12, 2025
-- ============================================

-- STEP 1: Add HR fields to users table (one by one, skip if exists)
-- ============================================

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='employee_id') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE COMMENT "Employee ID"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='first_name') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN first_name VARCHAR(100)'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='last_name') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN last_name VARCHAR(100)'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='phone') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN phone VARCHAR(20)'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='hire_date') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN hire_date DATE'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='department_id') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN department_id INT'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='position') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN position VARCHAR(100)'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='employee_type') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN employee_type ENUM("full_time", "part_time", "contract", "intern", "consultant") DEFAULT "full_time"'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='basic_salary') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN basic_salary DECIMAL(12,2)'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='work_location_id') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN work_location_id INT'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='manager_id') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN manager_id INT'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='is_active') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='last_login') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN last_login DATETIME'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='date_of_birth') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN date_of_birth DATE'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE table_name='users' AND table_schema=DATABASE() AND column_name='address') > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN address TEXT'
));
PREPARE alterStatement FROM @preparedStatement;
EXECUTE alterStatement;
DEALLOCATE PREPARE alterStatement;

-- STEP 2: Update existing users with data
-- ============================================

-- Generate employee IDs
UPDATE users 
SET employee_id = CONCAT('EMP', LPAD(id, 4, '0'))
WHERE employee_id IS NULL;

-- Split full_name
UPDATE users
SET 
  first_name = TRIM(SUBSTRING_INDEX(full_name, ' ', 1)),
  last_name = TRIM(SUBSTRING_INDEX(full_name, ' ', -1))
WHERE first_name IS NULL AND full_name IS NOT NULL;

-- Set hire_date from created_at
UPDATE users
SET hire_date = DATE(created_at)
WHERE hire_date IS NULL;

-- Set is_active based on status
UPDATE users
SET is_active = (status = 'active')
WHERE is_active IS NULL;

-- STEP 3: Create RBAC tables
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_module_action (module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  group_type ENUM('department', 'team', 'project', 'custom') DEFAULT 'custom',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS page_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page_route VARCHAR(200) NOT NULL,
  page_name VARCHAR(100) NOT NULL,
  module_category VARCHAR(50),
  required_permission VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_route (page_route)
);

-- STEP 4: Insert default roles
-- ============================================

INSERT IGNORE INTO roles (role_name, display_name, description, is_system_role) VALUES
('director', 'Director', 'Full system access', TRUE),
('admin', 'Administrator', 'System administrator', TRUE),
('sales-admin', 'Sales Admin', 'Sales department admin', TRUE),
('designer', 'Designer', 'Product designer', TRUE),
('accounts', 'Accounts', 'Finance team', TRUE),
('technician', 'Technician', 'Production technician', TRUE);

-- STEP 5: Insert permissions
-- ============================================

INSERT IGNORE INTO permissions (permission_key, module, action, display_name, description) VALUES
('sales_enquiry:create', 'sales_enquiry', 'create', 'Create Sales Enquiry', 'Can create sales enquiries'),
('sales_enquiry:read', 'sales_enquiry', 'read', 'View Sales Enquiry', 'Can view sales enquiries'),
('sales_enquiry:update', 'sales_enquiry', 'update', 'Edit Sales Enquiry', 'Can edit sales enquiries'),
('sales_enquiry:delete', 'sales_enquiry', 'delete', 'Delete Sales Enquiry', 'Can delete sales enquiries'),
('sales_enquiry:approve', 'sales_enquiry', 'approve', 'Approve Sales Enquiry', 'Can approve sales enquiries'),
('quotation:create', 'quotation', 'create', 'Create Quotation', 'Can create quotations'),
('quotation:read', 'quotation', 'read', 'View Quotation', 'Can view quotations'),
('quotation:update', 'quotation', 'update', 'Edit Quotation', 'Can edit quotations'),
('quotation:delete', 'quotation', 'delete', 'Delete Quotation', 'Can delete quotations'),
('quotation:approve', 'quotation', 'approve', 'Approve Quotation', 'Can approve quotations'),
('users:create', 'users', 'create', 'Create User', 'Can create users'),
('users:read', 'users', 'read', 'View Users', 'Can view users'),
('users:update', 'users', 'update', 'Edit User', 'Can edit users'),
('users:delete', 'users', 'delete', 'Delete User', 'Can delete users'),
('manufacturing:create', 'manufacturing', 'create', 'Create Manufacturing', 'Can create manufacturing jobs'),
('manufacturing:read', 'manufacturing', 'read', 'View Manufacturing', 'Can view manufacturing'),
('manufacturing:update', 'manufacturing', 'update', 'Update Manufacturing', 'Can update manufacturing'),
('manufacturing:delete', 'manufacturing', 'delete', 'Delete Manufacturing', 'Can delete manufacturing'),
('inventory:create', 'inventory', 'create', 'Add Inventory', 'Can add inventory'),
('inventory:read', 'inventory', 'read', 'View Inventory', 'Can view inventory'),
('inventory:update', 'inventory', 'update', 'Update Inventory', 'Can update inventory'),
('inventory:delete', 'inventory', 'delete', 'Delete Inventory', 'Can delete inventory'),
('reports:read', 'reports', 'read', 'View Reports', 'Can view reports'),
('reports:export', 'reports', 'export', 'Export Reports', 'Can export reports');

-- STEP 6: Assign all permissions to director
-- ============================================

INSERT IGNORE INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
  (SELECT id FROM roles WHERE role_name = 'director'),
  p.id,
  1
FROM permissions p;

-- STEP 7: Insert page routes
-- ============================================

INSERT IGNORE INTO page_access (page_route, page_name, module_category, required_permission, display_order) VALUES
('/dashboard', 'Dashboard', 'general', NULL, 1),
('/sales-enquiry', 'Sales Enquiries', 'sales', 'sales_enquiry:read', 10),
('/quotations', 'Quotations', 'sales', 'quotation:read', 12),
('/employee-management', 'Employee Management', 'admin', 'users:read', 50),
('/manufacturing', 'Manufacturing', 'production', 'manufacturing:read', 30),
('/inventory', 'Inventory', 'inventory', 'inventory:read', 40),
('/reports', 'Reports', 'analytics', 'reports:read', 70);

-- STEP 8: Verification
-- ============================================

SELECT 'Migration Complete!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as users_with_employee_id FROM users WHERE employee_id IS NOT NULL;
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT COUNT(*) as director_permissions FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE role_name = 'director');
