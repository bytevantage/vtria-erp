-- ===================================================================
-- RBAC Extension Schema for Existing Employee System
-- ===================================================================
-- This extends the existing employee system with enterprise RBAC
-- ===================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ===================================================================
-- 1. SYSTEM MODULES AND PERMISSIONS
-- ===================================================================

-- System modules/features
CREATE TABLE IF NOT EXISTS system_modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_code VARCHAR(50) NOT NULL UNIQUE,
    module_name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_module_id INT,
    module_order INT DEFAULT 0,
    icon VARCHAR(100),
    route_path VARCHAR(255),
    is_menu_item BOOLEAN DEFAULT TRUE,
    status ENUM('active', 'inactive', 'deprecated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_module_id) REFERENCES system_modules(id),
    INDEX idx_module_parent (parent_module_id),
    INDEX idx_module_order (module_order)
);

-- System permissions
CREATE TABLE IF NOT EXISTS system_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(255) NOT NULL,
    description TEXT,
    module_id INT NOT NULL,
    action_type ENUM('create', 'read', 'update', 'delete', 'execute', 'approve', 'export', 'import') NOT NULL,
    resource_type VARCHAR(100), -- e.g., 'sales_order', 'employee', 'report'
    scope_level ENUM('global', 'department', 'team', 'own') DEFAULT 'global',
    is_critical BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (module_id) REFERENCES system_modules(id),
    INDEX idx_perm_module (module_id),
    INDEX idx_perm_action (action_type),
    INDEX idx_perm_resource (resource_type)
);

-- ===================================================================
-- 2. ROLES AND GROUPS
-- ===================================================================

-- User roles
CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(255) NOT NULL,
    description TEXT,
    role_type ENUM('system', 'functional', 'positional', 'project') DEFAULT 'functional',
    hierarchy_level INT DEFAULT 1,
    is_assignable BOOLEAN DEFAULT TRUE,
    max_users INT DEFAULT NULL, -- NULL means unlimited
    approval_required BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive', 'deprecated') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_type (role_type),
    INDEX idx_role_level (hierarchy_level)
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revokable BOOLEAN DEFAULT TRUE,
    conditions JSON, -- Additional conditions for permission
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES system_permissions(id) ON DELETE CASCADE
);

-- User groups (teams, projects, etc.)
CREATE TABLE IF NOT EXISTS user_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_code VARCHAR(50) NOT NULL UNIQUE,
    group_name VARCHAR(255) NOT NULL,
    description TEXT,
    group_type ENUM('department', 'project_team', 'functional_team', 'committee', 'temporary') DEFAULT 'functional_team',
    parent_group_id INT,
    owner_user_id INT,
    department_id INT,
    max_members INT DEFAULT NULL,
    auto_approval BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    effective_from DATE,
    effective_to DATE,
    status ENUM('active', 'inactive', 'dissolved') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_group_id) REFERENCES user_groups(id),
    INDEX idx_group_type (group_type),
    INDEX idx_group_dept (department_id),
    INDEX idx_group_owner (owner_user_id)
);

-- Group roles mapping
CREATE TABLE IF NOT EXISTS group_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_inherited BOOLEAN DEFAULT FALSE, -- Inherited from parent group
    UNIQUE KEY unique_group_role (group_id, role_id),
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE
);

-- ===================================================================
-- 3. EMPLOYEE ROLE AND GROUP ASSIGNMENTS
-- ===================================================================

-- Employee group memberships
CREATE TABLE IF NOT EXISTS employee_group_memberships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    group_id INT NOT NULL,
    membership_type ENUM('member', 'lead', 'admin', 'owner') DEFAULT 'member',
    joined_date DATE DEFAULT (CURRENT_DATE),
    left_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_active_membership (employee_id, group_id, is_active),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    
    INDEX idx_emp_group_active (employee_id, is_active),
    INDEX idx_group_members (group_id, is_active),
    INDEX idx_membership_type (membership_type)
);

-- Employee role assignments
CREATE TABLE IF NOT EXISTS employee_role_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    role_id INT NOT NULL,
    assignment_type ENUM('direct', 'inherited_group', 'inherited_position') DEFAULT 'direct',
    source_group_id INT, -- If inherited from group
    assigned_by INT,
    assigned_date DATE DEFAULT (CURRENT_DATE),
    effective_from DATE DEFAULT (CURRENT_DATE),
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    assignment_reason TEXT,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_active_assignment (employee_id, role_id, is_active),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (source_group_id) REFERENCES user_groups(id),
    
    INDEX idx_emp_role_active (employee_id, is_active),
    INDEX idx_role_assignments (role_id, is_active),
    INDEX idx_assignment_type (assignment_type)
);

-- ===================================================================
-- 4. AUDIT AND COMPLIANCE
-- ===================================================================

-- Access audit logs
CREATE TABLE IF NOT EXISTS access_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT,
    user_id INT,
    action_type ENUM('login', 'logout', 'access_granted', 'access_denied', 'permission_check') NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    permission_code VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    result ENUM('success', 'failure', 'partial') NOT NULL,
    failure_reason TEXT,
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    
    INDEX idx_audit_employee (employee_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_result (result),
    INDEX idx_audit_created (created_at)
);

-- Role change history
CREATE TABLE IF NOT EXISTS role_change_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    change_type ENUM('role_assigned', 'role_revoked', 'group_joined', 'group_left', 'permission_granted', 'permission_revoked', 'employee_updated') NOT NULL,
    old_value JSON,
    new_value JSON,
    changed_by INT,
    change_reason TEXT,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    
    INDEX idx_history_employee (employee_id),
    INDEX idx_history_type (change_type),
    INDEX idx_history_date (created_at)
);

-- ===================================================================
-- 5. ENHANCED DEPARTMENT STRUCTURE
-- ===================================================================

-- Enhanced departments table (if departments table doesn't exist)
CREATE TABLE IF NOT EXISTS departments_enhanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_code VARCHAR(20) NOT NULL UNIQUE,
    department_name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_department_id INT,
    head_of_department_id INT,
    cost_center_code VARCHAR(50),
    budget_allocated DECIMAL(15,2) DEFAULT 0,
    location VARCHAR(255),
    status ENUM('active', 'inactive', 'merged') DEFAULT 'active',
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dept_parent (parent_department_id),
    INDEX idx_dept_head (head_of_department_id),
    INDEX idx_dept_status (status)
);

-- Work locations
CREATE TABLE IF NOT EXISTS work_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_code VARCHAR(20) NOT NULL UNIQUE,
    location_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    is_headquarters BOOLEAN DEFAULT FALSE,
    max_capacity INT DEFAULT 100,
    facilities TEXT, -- JSON array of facilities
    status ENUM('active', 'inactive', 'under_construction') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_location_city (city),
    INDEX idx_location_status (status)
);

-- ===================================================================
-- 6. VIEWS FOR EASY ACCESS
-- ===================================================================

-- Employee permissions view
CREATE OR REPLACE VIEW v_employee_permissions AS
SELECT DISTINCT
    e.id AS employee_id,
    e.employee_id AS emp_id,
    e.email,
    p.permission_code,
    p.permission_name,
    p.action_type,
    p.resource_type,
    p.scope_level,
    r.role_code,
    r.role_name,
    era.assignment_type,
    CASE 
        WHEN era.assignment_type = 'direct' THEN 'Direct Role Assignment'
        WHEN era.assignment_type = 'inherited_group' THEN CONCAT('Group: ', g.group_name)
        WHEN era.assignment_type = 'inherited_position' THEN 'Position Assignment'
        ELSE 'Unknown'
    END AS permission_source,
    era.effective_from,
    era.effective_to,
    era.is_active
FROM employees e
JOIN employee_role_assignments era ON e.id = era.employee_id AND era.is_active = TRUE
JOIN user_roles r ON era.role_id = r.id AND r.status = 'active'
JOIN role_permissions rp ON r.id = rp.role_id
JOIN system_permissions p ON rp.permission_id = p.id AND p.status = 'active'
LEFT JOIN user_groups g ON era.source_group_id = g.id
WHERE e.status = 'active'
  AND (era.effective_to IS NULL OR era.effective_to >= CURDATE());

-- Employee groups view
CREATE OR REPLACE VIEW v_employee_groups AS
SELECT 
    e.id AS employee_id,
    e.employee_id AS emp_id,
    CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
    g.id AS group_id,
    g.group_code,
    g.group_name,
    g.group_type,
    egm.membership_type,
    egm.joined_date,
    egm.is_active,
    
    -- Group roles
    GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.role_name SEPARATOR ', ') AS group_roles
FROM employees e
JOIN employee_group_memberships egm ON e.id = egm.employee_id
JOIN user_groups g ON egm.group_id = g.id
LEFT JOIN group_roles gr ON g.id = gr.group_id
LEFT JOIN user_roles r ON gr.role_id = r.id AND r.status = 'active'
WHERE egm.is_active = TRUE
  AND g.status = 'active'
GROUP BY e.id, g.id, egm.membership_type, egm.joined_date, egm.is_active;

-- ===================================================================
-- 7. SAMPLE DATA INSERTION
-- ===================================================================

-- Insert sample system modules
INSERT IGNORE INTO system_modules (module_code, module_name, description, route_path) VALUES
('EMPLOYEE_MGMT', 'Employee Management', 'Comprehensive employee management system', '/employees'),
('USER_MGMT', 'User Management', 'User accounts and authentication', '/users'),
('ROLE_MGMT', 'Role Management', 'Role and permission management', '/roles'),
('GROUP_MGMT', 'Group Management', 'User groups and team management', '/groups'),
('SALES', 'Sales Management', 'Sales orders, quotations, enquiries', '/sales'),
('INVENTORY', 'Inventory Management', 'Stock and inventory tracking', '/inventory'),
('PRODUCTION', 'Production Management', 'Manufacturing and production', '/production'),
('FINANCE', 'Financial Management', 'Accounting and financial operations', '/finance'),
('REPORTS', 'Reports & Analytics', 'Business reports and analytics', '/reports'),
('SETTINGS', 'System Settings', 'System configuration and settings', '/settings');

-- Insert sample permissions
INSERT IGNORE INTO system_permissions (permission_code, permission_name, module_id, action_type, resource_type, scope_level) 
SELECT * FROM (
    SELECT 'EMPLOYEE_CREATE', 'Create Employee', m.id, 'create', 'employee', 'department' FROM system_modules m WHERE m.module_code = 'EMPLOYEE_MGMT'
    UNION ALL
    SELECT 'EMPLOYEE_READ', 'View Employee', m.id, 'read', 'employee', 'department' FROM system_modules m WHERE m.module_code = 'EMPLOYEE_MGMT'
    UNION ALL
    SELECT 'EMPLOYEE_UPDATE', 'Update Employee', m.id, 'update', 'employee', 'department' FROM system_modules m WHERE m.module_code = 'EMPLOYEE_MGMT'
    UNION ALL
    SELECT 'EMPLOYEE_DELETE', 'Delete Employee', m.id, 'delete', 'employee', 'department' FROM system_modules m WHERE m.module_code = 'EMPLOYEE_MGMT'
    UNION ALL
    SELECT 'EMPLOYEE_READ_ALL', 'View All Employees', m.id, 'read', 'employee', 'global' FROM system_modules m WHERE m.module_code = 'EMPLOYEE_MGMT'
    UNION ALL
    SELECT 'ROLE_ASSIGN', 'Assign Roles', m.id, 'update', 'role_assignment', 'department' FROM system_modules m WHERE m.module_code = 'ROLE_MGMT'
    UNION ALL
    SELECT 'GROUP_CREATE', 'Create Groups', m.id, 'create', 'user_group', 'department' FROM system_modules m WHERE m.module_code = 'GROUP_MGMT'
    UNION ALL
    SELECT 'GROUP_MANAGE', 'Manage Groups', m.id, 'update', 'user_group', 'own' FROM system_modules m WHERE m.module_code = 'GROUP_MGMT'
    UNION ALL
    SELECT 'GROUP_READ', 'View Groups', m.id, 'read', 'user_group', 'department' FROM system_modules m WHERE m.module_code = 'GROUP_MGMT'
    UNION ALL
    SELECT 'SALES_ORDER_CREATE', 'Create Sales Order', m.id, 'create', 'sales_order', 'department' FROM system_modules m WHERE m.module_code = 'SALES'
    UNION ALL
    SELECT 'SALES_ORDER_APPROVE', 'Approve Sales Order', m.id, 'approve', 'sales_order', 'department' FROM system_modules m WHERE m.module_code = 'SALES'
) AS temp;

-- Insert sample roles
INSERT IGNORE INTO user_roles (role_code, role_name, description, role_type, hierarchy_level) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full system access with all permissions', 'system', 1),
('HR_MANAGER', 'HR Manager', 'Human resources management role', 'functional', 2),
('HR_ADMIN', 'HR Administrator', 'HR administrative tasks', 'functional', 3),
('DEPT_MANAGER', 'Department Manager', 'Department level management', 'positional', 2),
('TEAM_LEAD', 'Team Lead', 'Team leadership and coordination', 'positional', 3),
('EMPLOYEE', 'Employee', 'Basic employee access', 'functional', 4),
('SALES_MANAGER', 'Sales Manager', 'Sales team management', 'functional', 2),
('SALES_EXEC', 'Sales Executive', 'Sales operations', 'functional', 4),
('PRODUCTION_MANAGER', 'Production Manager', 'Production oversight', 'functional', 2),
('TECHNICIAN', 'Technician', 'Technical operations', 'functional', 4);

-- Assign some permissions to roles
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM user_roles r, system_permissions p
WHERE (r.role_code = 'SUPER_ADMIN')
   OR (r.role_code = 'HR_MANAGER' AND p.permission_code LIKE 'EMPLOYEE_%')
   OR (r.role_code = 'HR_ADMIN' AND p.permission_code IN ('EMPLOYEE_READ', 'EMPLOYEE_UPDATE'))
   OR (r.role_code = 'SALES_MANAGER' AND p.permission_code LIKE 'SALES_%');

-- Insert sample work locations
INSERT IGNORE INTO work_locations (location_code, location_name, city, state, is_headquarters) VALUES
('HQ_BLR', 'Headquarters - Bangalore', 'Bangalore', 'Karnataka', TRUE),
('BR_MUM', 'Mumbai Branch', 'Mumbai', 'Maharashtra', FALSE),
('BR_DEL', 'Delhi Branch', 'New Delhi', 'Delhi', FALSE),
('FAC_CHN', 'Chennai Factory', 'Chennai', 'Tamil Nadu', FALSE);

-- Insert sample departments (if not using existing departments table)
INSERT IGNORE INTO departments_enhanced (department_code, department_name, description) VALUES
('HR', 'Human Resources', 'Employee management and development'),
('SALES', 'Sales & Marketing', 'Sales operations and marketing'),
('PROD', 'Production', 'Manufacturing and production operations'),
('ENG', 'Engineering', 'Product development and engineering'),
('FIN', 'Finance & Accounts', 'Financial operations and accounting'),
('IT', 'Information Technology', 'IT infrastructure and development'),
('ADMIN', 'Administration', 'General administration and support');

SET FOREIGN_KEY_CHECKS = 1;

-- ===================================================================
-- END OF SCHEMA
-- ===================================================================