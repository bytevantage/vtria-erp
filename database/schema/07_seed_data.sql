-- VTRIA ERP Database Schema - Seed Data
-- Initial data for locations, roles, users, and system settings

-- =============================================
-- SEED LOCATIONS
-- =============================================
INSERT INTO locations (id, name, code, address, city, state, country, postal_code, phone, email) VALUES
(uuid_generate_v4(), 'Mangalore Office', 'MNG', 'VTRIA Engineering Solutions, Mangalore', 'Mangalore', 'Karnataka', 'India', '575001', '+91-824-XXXXXXX', 'mangalore@vtria.com'),
(uuid_generate_v4(), 'Bangalore Office', 'BLR', 'VTRIA Engineering Solutions, Bangalore', 'Bangalore', 'Karnataka', 'India', '560001', '+91-80-XXXXXXXX', 'bangalore@vtria.com'),
(uuid_generate_v4(), 'Pune Office', 'PUN', 'VTRIA Engineering Solutions, Pune', 'Pune', 'Maharashtra', 'India', '411001', '+91-20-XXXXXXXX', 'pune@vtria.com');

-- =============================================
-- SEED ROLES
-- =============================================
INSERT INTO roles (id, name, display_name, description, level, permissions) VALUES
(uuid_generate_v4(), 'Director', 'Director', 'Company Director with full system access', 1, '{
    "users": {"create": true, "read": true, "update": true, "delete": true},
    "cases": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
    "tickets": {"create": true, "read": true, "update": true, "delete": true, "assign": true},
    "stock": {"create": true, "read": true, "update": true, "delete": true, "transfer": true},
    "products": {"create": true, "read": true, "update": true, "delete": true},
    "customers": {"create": true, "read": true, "update": true, "delete": true},
    "documents": {"create": true, "read": true, "update": true, "delete": true, "admin": true},
    "reports": {"create": true, "read": true, "financial": true},
    "settings": {"read": true, "update": true},
    "audit": {"read": true},
    "license": {"read": true, "manage": true}
}'),
(uuid_generate_v4(), 'Manager', 'Manager', 'Location Manager with administrative privileges', 2, '{
    "users": {"create": true, "read": true, "update": true, "delete": false},
    "cases": {"create": true, "read": true, "update": true, "delete": false, "assign": true},
    "tickets": {"create": true, "read": true, "update": true, "delete": false, "assign": true},
    "stock": {"create": true, "read": true, "update": true, "delete": false, "transfer": true},
    "products": {"create": true, "read": true, "update": true, "delete": false},
    "customers": {"create": true, "read": true, "update": true, "delete": false},
    "documents": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"create": true, "read": true, "financial": false},
    "settings": {"read": true, "update": false}
}'),
(uuid_generate_v4(), 'Sales Admin', 'Sales Administrator', 'Sales team administrator', 3, '{
    "users": {"create": false, "read": true, "update": false, "delete": false},
    "cases": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
    "tickets": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
    "stock": {"create": false, "read": true, "update": true, "delete": false, "transfer": false},
    "products": {"create": false, "read": true, "update": false, "delete": false},
    "customers": {"create": true, "read": true, "update": true, "delete": false},
    "documents": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"create": true, "read": true, "financial": false}
}'),
(uuid_generate_v4(), 'Engineer', 'Engineer', 'Technical engineer with field access', 4, '{
    "users": {"create": false, "read": true, "update": false, "delete": false},
    "cases": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
    "tickets": {"create": true, "read": true, "update": true, "delete": false, "assign": false},
    "stock": {"create": false, "read": true, "update": true, "delete": false, "transfer": false},
    "products": {"create": false, "read": true, "update": false, "delete": false},
    "customers": {"create": false, "read": true, "update": false, "delete": false},
    "documents": {"create": true, "read": true, "update": true, "delete": false},
    "reports": {"create": false, "read": true, "financial": false}
}'),
(uuid_generate_v4(), 'User', 'User', 'Basic user with limited access', 5, '{
    "users": {"create": false, "read": false, "update": false, "delete": false},
    "cases": {"create": true, "read": true, "update": false, "delete": false, "assign": false},
    "tickets": {"create": true, "read": true, "update": false, "delete": false, "assign": false},
    "stock": {"create": false, "read": true, "update": false, "delete": false, "transfer": false},
    "products": {"create": false, "read": true, "update": false, "delete": false},
    "customers": {"create": false, "read": true, "update": false, "delete": false},
    "documents": {"create": false, "read": true, "update": false, "delete": false},
    "reports": {"create": false, "read": false, "financial": false}
}');

-- =============================================
-- SEED ADMIN USER
-- =============================================
-- Get location and role IDs for admin user
DO $$
DECLARE
    mangalore_id UUID;
    director_role_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get Mangalore location ID
    SELECT id INTO mangalore_id FROM locations WHERE code = 'MNG';
    
    -- Get Director role ID
    SELECT id INTO director_role_id FROM roles WHERE name = 'Director';
    
    -- Create admin user
    INSERT INTO users (
        id, employee_id, email, password, first_name, last_name, 
        phone, department, designation, location_id, status
    ) VALUES (
        uuid_generate_v4(), 'EMP001', 'admin@vtria.com', 
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', -- VtriaAdmin@2024
        'System', 'Administrator', '+91-9999999999', 'IT', 'System Administrator', 
        mangalore_id, 'active'
    ) RETURNING id INTO admin_user_id;
    
    -- Assign Director role to admin user
    INSERT INTO user_roles (user_id, role_id, location_id, granted_by)
    VALUES (admin_user_id, director_role_id, mangalore_id, admin_user_id);
END $$;

-- =============================================
-- SEED PRODUCT CATEGORIES
-- =============================================
INSERT INTO product_categories (name, description) VALUES
('Electronics', 'Electronic components and devices'),
('Mechanical', 'Mechanical parts and components'),
('Software', 'Software products and licenses'),
('Services', 'Service-based products'),
('Consumables', 'Consumable items and supplies');

-- =============================================
-- SEED MANUFACTURERS
-- =============================================
INSERT INTO manufacturers (name, code, contact_person, email, phone, website) VALUES
('Siemens', 'SIE', 'Sales Team', 'sales@siemens.com', '+49-89-636-00', 'https://www.siemens.com'),
('ABB', 'ABB', 'Customer Service', 'info@abb.com', '+41-43-317-71-11', 'https://www.abb.com'),
('Schneider Electric', 'SCH', 'Support Team', 'support@schneider-electric.com', '+33-1-41-29-70-00', 'https://www.schneider-electric.com'),
('Allen-Bradley', 'AB', 'Technical Support', 'support@ab.rockwellautomation.com', '+1-440-646-3434', 'https://www.rockwellautomation.com'),
('Mitsubishi Electric', 'MIT', 'Sales Department', 'sales@mitsubishielectric.com', '+81-3-3218-2111', 'https://www.mitsubishielectric.com');

-- =============================================
-- SEED CASE QUEUES
-- =============================================
DO $$
DECLARE
    mangalore_id UUID;
    bangalore_id UUID;
    pune_id UUID;
BEGIN
    SELECT id INTO mangalore_id FROM locations WHERE code = 'MNG';
    SELECT id INTO bangalore_id FROM locations WHERE code = 'BLR';
    SELECT id INTO pune_id FROM locations WHERE code = 'PUN';
    
    INSERT INTO case_queues (name, description, location_id, sla_hours) VALUES
    ('General Enquiry', 'General customer enquiries', mangalore_id, 24),
    ('Technical Support', 'Technical support requests', mangalore_id, 8),
    ('Sales Enquiry', 'Sales and quotation requests', mangalore_id, 12),
    ('Bangalore Support', 'Bangalore location support queue', bangalore_id, 24),
    ('Pune Support', 'Pune location support queue', pune_id, 24);
END $$;

-- =============================================
-- SEED DOCUMENT CATEGORIES
-- =============================================
INSERT INTO document_categories (name, description, icon, color) VALUES
('Manuals', 'Product manuals and documentation', 'book', '#2196F3'),
('Certificates', 'Certificates and compliance documents', 'certificate', '#4CAF50'),
('Specifications', 'Technical specifications', 'engineering', '#FF9800'),
('Invoices', 'Invoice and billing documents', 'receipt', '#9C27B0'),
('Warranties', 'Warranty documents and certificates', 'security', '#F44336'),
('Reports', 'System and business reports', 'assessment', '#607D8B');

-- =============================================
-- SEED SYSTEM SETTINGS
-- =============================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('company_name', 'VTRIA Engineering Solutions Pvt Ltd', 'string', 'general', 'Company name'),
('company_email', 'info@vtria.com', 'string', 'general', 'Company primary email'),
('company_phone', '+91-824-XXXXXXX', 'string', 'general', 'Company primary phone'),
('company_address', 'VTRIA Engineering Solutions, Mangalore, Karnataka, India', 'string', 'general', 'Company primary address'),
('default_currency', 'INR', 'string', 'financial', 'Default currency code'),
('tax_rate', '18', 'number', 'financial', 'Default tax rate percentage'),
('case_auto_assign', 'true', 'boolean', 'cases', 'Enable automatic case assignment'),
('ticket_auto_assign', 'true', 'boolean', 'tickets', 'Enable automatic ticket assignment'),
('email_notifications', 'true', 'boolean', 'notifications', 'Enable email notifications'),
('sms_notifications', 'false', 'boolean', 'notifications', 'Enable SMS notifications'),
('session_timeout', '8', 'number', 'security', 'Session timeout in hours'),
('password_min_length', '8', 'number', 'security', 'Minimum password length'),
('backup_retention_days', '90', 'number', 'system', 'Database backup retention period in days'),
('log_retention_days', '365', 'number', 'system', 'System log retention period in days'),
('file_upload_max_size', '10', 'number', 'system', 'Maximum file upload size in MB'),
('warranty_alert_days', '30', 'number', 'stock', 'Days before warranty expiry to send alerts');

-- =============================================
-- CREATE INDEXES ON UUID COLUMNS FOR FOREIGN KEYS
-- =============================================
-- These indexes will improve performance for foreign key lookups

-- Add manager foreign key constraint to locations (now that users table exists)
DO $$
DECLARE
    admin_user_id UUID;
    mangalore_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@vtria.com';
    SELECT id INTO mangalore_id FROM locations WHERE code = 'MNG';
    
    -- Set admin as manager of Mangalore office
    UPDATE locations SET manager_id = admin_user_id WHERE id = mangalore_id;
END $$;

-- Add the foreign key constraint
ALTER TABLE locations ADD CONSTRAINT fk_locations_manager 
    FOREIGN KEY (manager_id) REFERENCES users(id);

-- =============================================
-- SAMPLE CUSTOMERS (Optional)
-- =============================================
DO $$
DECLARE
    mangalore_id UUID;
    bangalore_id UUID;
    admin_user_id UUID;
BEGIN
    SELECT id INTO mangalore_id FROM locations WHERE code = 'MNG';
    SELECT id INTO bangalore_id FROM locations WHERE code = 'BLR';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@vtria.com';
    
    INSERT INTO customers (
        customer_code, company_name, contact_person, email, phone, 
        address, city, state, tax_id, customer_type, assigned_location_id, assigned_user_id
    ) VALUES
    ('CUST001', 'ABC Manufacturing Ltd', 'John Doe', 'john@abcmfg.com', '+91-9876543210', 
     'ABC Complex, Industrial Area', 'Mangalore', 'Karnataka', '29ABCDE1234F1Z5', 'corporate', mangalore_id, admin_user_id),
    ('CUST002', 'XYZ Industries', 'Jane Smith', 'jane@xyzind.com', '+91-9876543211', 
     'XYZ Building, Tech Park', 'Bangalore', 'Karnataka', '29XYZAB5678G2W6', 'corporate', bangalore_id, admin_user_id);
END $$;

-- =============================================
-- SAMPLE SUPPLIERS (Optional)
-- =============================================
INSERT INTO suppliers (
    name, code, contact_person, email, phone, address, city, state, 
    tax_id, supplier_type, rating
) VALUES
('TechnoElectric Distributors', 'TED', 'Raj Kumar', 'raj@technoelectric.com', '+91-80-12345678', 
 'Electronic City, Bangalore', 'Bangalore', 'Karnataka', '29TECHN1234E1Z5', 'distributor', 4),
('Industrial Components Inc', 'ICI', 'Priya Sharma', 'priya@indcomp.com', '+91-22-87654321', 
 'Industrial Estate, Mumbai', 'Mumbai', 'Maharashtra', '27INDCOM5678F2W6', 'manufacturer', 5);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- These queries can be used to verify the seed data was inserted correctly

-- SELECT 'Locations' as table_name, COUNT(*) as record_count FROM locations
-- UNION ALL
-- SELECT 'Roles', COUNT(*) FROM roles
-- UNION ALL  
-- SELECT 'Users', COUNT(*) FROM users
-- UNION ALL
-- SELECT 'User Roles', COUNT(*) FROM user_roles
-- UNION ALL
-- SELECT 'Product Categories', COUNT(*) FROM product_categories
-- UNION ALL
-- SELECT 'Manufacturers', COUNT(*) FROM manufacturers
-- UNION ALL
-- SELECT 'Case Queues', COUNT(*) FROM case_queues
-- UNION ALL
-- SELECT 'Document Categories', COUNT(*) FROM document_categories
-- UNION ALL
-- SELECT 'System Settings', COUNT(*) FROM system_settings
-- UNION ALL
-- SELECT 'Customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'Suppliers', COUNT(*) FROM suppliers;
