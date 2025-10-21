-- Multi-role user system for VTRIA ERP
-- Allows users to belong to multiple groups/roles

CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_user_role (user_id, role_name),
    INDEX idx_user_roles_user_active (user_id, is_active)
);

-- Insert default roles for existing users based on their current user_role
INSERT IGNORE INTO user_roles (user_id, role_name, assigned_by, assigned_at)
SELECT id, user_role, 1, NOW()
FROM users
WHERE user_role IS NOT NULL AND user_role != '';

-- Available role options
CREATE TABLE IF NOT EXISTS role_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard role definitions
INSERT IGNORE INTO role_definitions (role_name, role_code, description, is_system_role) VALUES
('Director', 'DIRECTOR', 'Executive level access with full approval permissions', TRUE),
('Admin', 'ADMIN', 'Administrative access to most system modules', TRUE),
('Sales Admin', 'SALES_ADMIN', 'Sales department administration', TRUE),
('Designer', 'DESIGNER', 'Design and technical drawing access', TRUE),
('Accounts', 'ACCOUNTS', 'Financial and accounting access', TRUE),
('Technician', 'TECHNICIAN', 'Technical support and maintenance access', TRUE),
('Sales Representative', 'SALES_REP', 'Sales and customer interaction access', TRUE),
('Production Manager', 'PROD_MANAGER', 'Production planning and management', TRUE),
('Quality Inspector', 'QUALITY_INSPECTOR', 'Quality control and inspection access', TRUE),
('Warehouse Staff', 'WAREHOUSE', 'Inventory and warehouse management', TRUE);