-- Advanced Role-Based Access Control (RBAC) System
-- This schema supports multiple roles per user, groups, page-level permissions, and advanced access control

-- ============================================================================
-- 1. ROLE MANAGEMENT SYSTEM
-- ============================================================================

-- Roles with hierarchy support
CREATE TABLE IF NOT EXISTS rbac_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_role_id INT NULL, -- For role hierarchy
    priority_level INT DEFAULT 0, -- Higher number = higher priority
    is_system_role BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (parent_role_id) REFERENCES rbac_roles(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- Groups for organizing users
CREATE TABLE IF NOT EXISTS rbac_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL UNIQUE,
    group_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    group_type ENUM('department', 'project', 'custom', 'location') DEFAULT 'custom',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- ============================================================================
-- 2. PERMISSION SYSTEM
-- ============================================================================

-- System pages and resources
CREATE TABLE IF NOT EXISTS rbac_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    resource_path VARCHAR(255) NOT NULL UNIQUE,
    resource_type ENUM('page', 'api', 'component', 'feature') DEFAULT 'page',
    parent_resource_id INT NULL,
    description TEXT,
    is_system_resource BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_resource_id) REFERENCES rbac_resources(id) ON DELETE SET NULL
);

-- Permissions for actions on resources
CREATE TABLE IF NOT EXISTS rbac_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL,
    permission_code VARCHAR(50) NOT NULL UNIQUE,
    resource_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- view, create, edit, delete, approve, etc.
    description TEXT,
    is_system_permission BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES rbac_resources(id) ON DELETE CASCADE,
    UNIQUE KEY unique_resource_action (resource_id, action)
);

-- ============================================================================
-- 3. USER ASSIGNMENTS
-- ============================================================================

-- User-Role assignments (many-to-many)
CREATE TABLE IF NOT EXISTS rbac_user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- For temporary role assignments
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES rbac_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES employees(id),
    UNIQUE KEY unique_user_role (user_id, role_id)
);

-- User-Group assignments (many-to-many)
CREATE TABLE IF NOT EXISTS rbac_user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES rbac_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES employees(id),
    UNIQUE KEY unique_user_group (user_id, group_id)
);

-- ============================================================================
-- 4. ROLE-PERMISSION MAPPINGS
-- ============================================================================

-- Role-Permission assignments
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (role_id) REFERENCES rbac_roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES rbac_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES employees(id),
    UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Group-Permission assignments
CREATE TABLE IF NOT EXISTS rbac_group_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (group_id) REFERENCES rbac_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES rbac_permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES employees(id),
    UNIQUE KEY unique_group_permission (group_id, permission_id)
);

-- ============================================================================
-- 5. ADVANCED ACCESS CONTROL FEATURES
-- ============================================================================

-- Time-based access restrictions
CREATE TABLE IF NOT EXISTS rbac_access_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    time_restrictions JSON, -- {"days": ["monday", "tuesday"], "hours": {"start": "09:00", "end": "18:00"}}
    ip_restrictions JSON, -- {"allowed_ips": ["192.168.1.0/24"], "blocked_ips": ["10.0.0.1"]}
    location_restrictions JSON, -- {"allowed_locations": [1, 2], "require_geofence": true}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES employees(id)
);

-- Apply schedules to roles or users
CREATE TABLE IF NOT EXISTS rbac_schedule_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    assignment_type ENUM('user', 'role', 'group') NOT NULL,
    assignment_id INT NOT NULL, -- user_id, role_id, or group_id
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (schedule_id) REFERENCES rbac_access_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES employees(id)
);

-- Access audit log
CREATE TABLE IF NOT EXISTS rbac_access_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_path VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    access_granted BOOLEAN NOT NULL,
    denial_reason VARCHAR(255) NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_data JSON,
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES employees(id),
    INDEX idx_user_timestamp (user_id, access_timestamp),
    INDEX idx_resource_timestamp (resource_path, access_timestamp)
);

-- Session-based access tracking
CREATE TABLE IF NOT EXISTS rbac_user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    permissions_cache JSON, -- Cached user permissions for performance
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. POPULATE DEFAULT DATA
-- ============================================================================

-- Insert system roles
INSERT IGNORE INTO rbac_roles (role_name, role_code, description, priority_level, is_system_role) VALUES
('Super Admin', 'SUPER_ADMIN', 'Full system access with all permissions', 1000, TRUE),
('System Admin', 'SYS_ADMIN', 'System administration with limited restrictions', 900, TRUE),
('Director', 'DIRECTOR', 'Director level access with approval permissions', 800, FALSE),
('Admin', 'ADMIN', 'Administrative access to most modules', 700, FALSE),
('Manager', 'MANAGER', 'Management level access with team oversight', 600, FALSE),
('Senior Employee', 'SENIOR_EMP', 'Senior employee with extended permissions', 500, FALSE),
('Employee', 'EMPLOYEE', 'Standard employee access', 400, FALSE),
('Guest', 'GUEST', 'Limited read-only access', 100, FALSE);

-- Insert system groups
INSERT IGNORE INTO rbac_groups (group_name, group_code, description, group_type) VALUES
('IT Department', 'IT_DEPT', 'Information Technology Department', 'department'),
('Sales Department', 'SALES_DEPT', 'Sales and Marketing Department', 'department'),
('Accounts Department', 'ACC_DEPT', 'Accounts and Finance Department', 'department'),
('HR Department', 'HR_DEPT', 'Human Resources Department', 'department'),
('Production Department', 'PROD_DEPT', 'Production and Manufacturing Department', 'department'),
('Management Team', 'MGMT_TEAM', 'Senior Management Team', 'custom'),
('Remote Workers', 'REMOTE_WORK', 'Employees working remotely', 'location'),
('Project Alpha', 'PROJ_ALPHA', 'Project Alpha team members', 'project');

-- Insert system resources (pages/modules)
INSERT IGNORE INTO rbac_resources (resource_name, resource_path, resource_type, description, is_system_resource) VALUES
-- Dashboard and Analytics
('Dashboard', '/dashboard', 'page', 'Main dashboard page', TRUE),
('Case Dashboard', '/case-dashboard', 'page', 'Case management dashboard', TRUE),
('Enterprise Case Dashboard', '/enterprise-case-dashboard', 'page', 'Advanced case analytics dashboard', TRUE),

-- Sales & CRM
('Sales Enquiry', '/sales-enquiry', 'page', 'Sales enquiry management', TRUE),
('Estimation', '/estimation', 'page', 'Project estimation module', TRUE),
('Quotations', '/quotations', 'page', 'Quotation management', TRUE),
('Sales Orders', '/sales-orders', 'page', 'Sales order processing', TRUE),

-- Purchase Management
('Purchase Requisition', '/purchase-requisition', 'page', 'Purchase requisition system', TRUE),
('Purchase Orders', '/purchase-orders', 'page', 'Purchase order management', TRUE),
('Supplier Quotes', '/supplier-quotes', 'page', 'Supplier quote management', TRUE),
('GRN', '/grn', 'page', 'Goods Received Note', TRUE),

-- Manufacturing
('Production Management', '/production', 'page', 'Production planning and management', TRUE),
('Manufacturing Workflow', '/manufacturing', 'page', 'Manufacturing workflow management', TRUE),

-- Inventory & Products
('Inventory Management', '/inventory', 'page', 'Inventory and product management', TRUE),

-- Financial Management
('Financial Dashboard', '/financial-dashboard', 'page', 'Financial overview and analytics', TRUE),
('Invoice Management', '/invoice-management', 'page', 'Invoice processing and management', TRUE),
('Payment Management', '/payment-management', 'page', 'Payment tracking and processing', TRUE),
('Profit Calculator', '/profit-calculator', 'page', 'Profit analysis and calculation', TRUE),

-- Human Resources
('Employee Management', '/employee-management', 'page', 'Employee information management', TRUE),
('Employee Dashboard', '/employee-dashboard', 'page', 'Employee self-service dashboard', TRUE),
('Attendance Management', '/attendance-management', 'page', 'Attendance tracking and management', TRUE),
('Leave Management', '/leave-management', 'page', 'Leave application and approval system', TRUE),
('Mobile Attendance', '/mobile-attendance', 'page', 'Mobile attendance application', TRUE),

-- Reporting & Analytics
('Price Comparison Analytics', '/price-comparison', 'page', 'Price comparison and analysis', TRUE),
('Technician Dashboard', '/technician-dashboard', 'page', 'Technician performance dashboard', TRUE),
('Assignee Report', '/assignee-report', 'page', 'Work assignment and workload reports', TRUE),

-- Administration
('Clients Management', '/clients', 'page', 'Client information management', TRUE),
('Vendors Management', '/vendors', 'page', 'Vendor information management', TRUE),
('User Management', '/users', 'page', 'User account management', TRUE),
('Settings', '/settings', 'page', 'System configuration and settings', TRUE),
('About', '/about', 'page', 'System information and about page', TRUE),

-- RBAC Management (New)
('Role Management', '/admin/roles', 'page', 'Role and permission management', TRUE),
('User Role Assignment', '/admin/user-roles', 'page', 'Assign roles and groups to users', TRUE),
('Access Control Setup', '/admin/access-control', 'page', 'Configure page and feature access', TRUE),
('Permission Audit', '/admin/permission-audit', 'page', 'Access control audit and logs', TRUE);

-- Insert system permissions
INSERT IGNORE INTO rbac_permissions (permission_name, permission_code, resource_id, action, description, is_system_permission) 
SELECT 
    CONCAT(r.resource_name, ' - ', a.action_name) as permission_name,
    CONCAT(UPPER(REPLACE(r.resource_name, ' ', '_')), '_', UPPER(a.action_name)) as permission_code,
    r.id as resource_id,
    a.action_name as action,
    CONCAT(a.action_desc, ' access to ', r.resource_name) as description,
    TRUE as is_system_permission
FROM rbac_resources r
CROSS JOIN (
    SELECT 'view' as action_name, 'View and read' as action_desc
    UNION ALL SELECT 'create', 'Create new records'
    UNION ALL SELECT 'edit', 'Edit existing records'
    UNION ALL SELECT 'delete', 'Delete records'
    UNION ALL SELECT 'approve', 'Approve requests'
    UNION ALL SELECT 'export', 'Export data'
    UNION ALL SELECT 'admin', 'Administrative access'
) a
WHERE r.is_system_resource = TRUE;

-- Assign all permissions to Super Admin role
INSERT IGNORE INTO rbac_role_permissions (role_id, permission_id, granted_by)
SELECT 
    (SELECT id FROM rbac_roles WHERE role_code = 'SUPER_ADMIN'),
    p.id,
    1 -- Assuming user ID 1 is system admin
FROM rbac_permissions p;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user ON rbac_user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_user_groups_user ON rbac_user_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_role_permissions_role ON rbac_role_permissions(role_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_group_permissions_group ON rbac_group_permissions(group_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_access_log_user_time ON rbac_access_log(user_id, access_timestamp);
CREATE INDEX IF NOT EXISTS idx_rbac_sessions_user_active ON rbac_user_sessions(user_id, is_active);

-- ============================================================================
-- 7. USEFUL VIEWS FOR RBAC OPERATIONS
-- ============================================================================

-- User permissions view (combines role and group permissions)
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
    e.id as user_id,
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as user_name,
    p.id as permission_id,
    p.permission_code,
    p.permission_name,
    r.resource_path,
    r.resource_name,
    p.action,
    'role' as permission_source,
    ro.role_name as source_name
FROM employees e
JOIN rbac_user_roles ur ON e.id = ur.user_id AND ur.is_active = TRUE
JOIN rbac_roles ro ON ur.role_id = ro.id AND ro.is_active = TRUE
JOIN rbac_role_permissions rp ON ro.id = rp.role_id AND rp.is_active = TRUE
JOIN rbac_permissions p ON rp.permission_id = p.id AND p.is_active = TRUE
JOIN rbac_resources r ON p.resource_id = r.id AND r.is_active = TRUE

UNION

SELECT DISTINCT
    e.id as user_id,
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as user_name,
    p.id as permission_id,
    p.permission_code,
    p.permission_name,
    r.resource_path,
    r.resource_name,
    p.action,
    'group' as permission_source,
    g.group_name as source_name
FROM employees e
JOIN rbac_user_groups ug ON e.id = ug.user_id AND ug.is_active = TRUE
JOIN rbac_groups g ON ug.group_id = g.id AND g.is_active = TRUE
JOIN rbac_group_permissions gp ON g.id = gp.group_id AND gp.is_active = TRUE
JOIN rbac_permissions p ON gp.permission_id = p.id AND p.is_active = TRUE
JOIN rbac_resources r ON p.resource_id = r.id AND r.is_active = TRUE;

-- Role hierarchy view
CREATE OR REPLACE VIEW role_hierarchy_view AS
WITH RECURSIVE role_tree AS (
    -- Base case: roles without parents
    SELECT id, role_name, role_code, parent_role_id, priority_level, 0 as level, role_name as path
    FROM rbac_roles 
    WHERE parent_role_id IS NULL AND is_active = TRUE
    
    UNION ALL
    
    -- Recursive case: roles with parents
    SELECT r.id, r.role_name, r.role_code, r.parent_role_id, r.priority_level, 
           rt.level + 1, CONCAT(rt.path, ' > ', r.role_name)
    FROM rbac_roles r
    JOIN role_tree rt ON r.parent_role_id = rt.id
    WHERE r.is_active = TRUE
)
SELECT * FROM role_tree ORDER BY level, priority_level DESC;

-- User access summary view
CREATE OR REPLACE VIEW user_access_summary AS
SELECT 
    e.id as user_id,
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as user_name,
    e.status as user_status,
    COUNT(DISTINCT ur.role_id) as total_roles,
    COUNT(DISTINCT ug.group_id) as total_groups,
    COUNT(DISTINCT p.id) as total_permissions,
    COUNT(DISTINCT r.id) as accessible_pages,
    GROUP_CONCAT(DISTINCT ro.role_name SEPARATOR ', ') as assigned_roles,
    GROUP_CONCAT(DISTINCT g.group_name SEPARATOR ', ') as assigned_groups
FROM employees e
LEFT JOIN rbac_user_roles ur ON e.id = ur.user_id AND ur.is_active = TRUE
LEFT JOIN rbac_user_groups ug ON e.id = ug.user_id AND ug.is_active = TRUE
LEFT JOIN rbac_roles ro ON ur.role_id = ro.id AND ro.is_active = TRUE
LEFT JOIN rbac_groups g ON ug.group_id = g.id AND g.is_active = TRUE
LEFT JOIN user_permissions_view p ON e.id = p.user_id
LEFT JOIN rbac_resources r ON p.resource_path = r.resource_path AND r.is_active = TRUE
WHERE e.status = 'active'
GROUP BY e.id, e.employee_id, e.first_name, e.last_name, e.status;

COMMIT;