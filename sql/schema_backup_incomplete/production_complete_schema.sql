-- =============================================
-- VTRIA ERP Production-Ready Complete Database Schema
-- Version: 2.0 - Enterprise Production Ready
-- =============================================

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- CORE PRODUCTION TABLES
-- =============================================

-- Production Categories Table
CREATE TABLE IF NOT EXISTS production_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Production Operations Table
CREATE TABLE IF NOT EXISTS production_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_code VARCHAR(20) UNIQUE NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id INT,
    standard_time_minutes DECIMAL(8,2),
    labor_cost_per_hour DECIMAL(10,2),
    machine_cost_per_hour DECIMAL(10,2),
    overhead_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES production_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Manufacturing Units Table
CREATE TABLE IF NOT EXISTS manufacturing_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_code VARCHAR(20) UNIQUE NOT NULL,
    unit_name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    capacity_per_day INT DEFAULT 0,
    supervisor_id INT,
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supervisor_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bill of Materials (BOM) Table
CREATE TABLE IF NOT EXISTS bill_of_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_number VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_code VARCHAR(50),
    version VARCHAR(10) DEFAULT '1.0',
    description TEXT,
    total_cost DECIMAL(12,2) DEFAULT 0,
    labor_hours DECIMAL(8,2) DEFAULT 0,
    overhead_cost DECIMAL(10,2) DEFAULT 0,
    status ENUM('draft', 'active', 'inactive', 'archived') DEFAULT 'draft',
    effective_date DATE,
    expiry_date DATE,
    created_by INT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- BOM Items (Materials/Components)
CREATE TABLE IF NOT EXISTS bom_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    wastage_percentage DECIMAL(5,2) DEFAULT 0,
    supplier_id INT,
    lead_time_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES clients(id)
);

-- Production Work Orders
CREATE TABLE IF NOT EXISTS production_work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT,
    bom_id INT,
    product_name VARCHAR(200) NOT NULL,
    quantity_to_produce INT NOT NULL,
    quantity_produced INT DEFAULT 0,
    quantity_remaining INT GENERATED ALWAYS AS (quantity_to_produce - quantity_produced) STORED,
    unit VARCHAR(20) NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    scheduled_start_date DATE,
    scheduled_end_date DATE,
    actual_start_date DATE NULL,
    actual_end_date DATE NULL,
    status ENUM('planned', 'released', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'planned',
    manufacturing_unit_id INT,
    assigned_to INT,
    notes TEXT,
    total_estimated_cost DECIMAL(12,2) DEFAULT 0,
    total_actual_cost DECIMAL(12,2) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id),
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Production Work Order Operations
CREATE TABLE IF NOT EXISTS work_order_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    operation_id INT NOT NULL,
    sequence_number INT NOT NULL,
    estimated_time_minutes DECIMAL(8,2),
    actual_time_minutes DECIMAL(8,2) DEFAULT 0,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    operator_id INT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES production_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
);

-- =============================================
-- INVENTORY MANAGEMENT
-- =============================================

-- Enhanced Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    unit_of_measurement VARCHAR(20) NOT NULL,
    minimum_stock_level DECIMAL(10,4) DEFAULT 0,
    maximum_stock_level DECIMAL(10,4) DEFAULT 0,
    reorder_point DECIMAL(10,4) DEFAULT 0,
    reorder_quantity DECIMAL(10,4) DEFAULT 0,
    current_stock DECIMAL(10,4) DEFAULT 0,
    reserved_stock DECIMAL(10,4) DEFAULT 0,
    available_stock DECIMAL(10,4) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    standard_cost DECIMAL(10,2) DEFAULT 0,
    last_purchase_cost DECIMAL(10,2) DEFAULT 0,
    average_cost DECIMAL(10,2) DEFAULT 0,
    is_serialized BOOLEAN DEFAULT FALSE,
    is_batch_tracked BOOLEAN DEFAULT FALSE,
    shelf_life_days INT DEFAULT 0,
    storage_location VARCHAR(100),
    supplier_id INT,
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    item_id INT NOT NULL,
    transaction_type ENUM('receipt', 'issue', 'transfer', 'adjustment', 'return') NOT NULL,
    reference_type ENUM('purchase_order', 'work_order', 'sales_order', 'adjustment', 'transfer') NOT NULL,
    reference_id INT,
    quantity DECIMAL(10,4) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    batch_number VARCHAR(50),
    serial_number VARCHAR(50),
    expiry_date DATE,
    transaction_date DATETIME NOT NULL,
    notes TEXT,
    created_by INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- =============================================
-- QUALITY CONTROL
-- =============================================

-- Quality Control Templates
CREATE TABLE IF NOT EXISTS quality_control_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quality Control Parameters
CREATE TABLE IF NOT EXISTS quality_control_parameters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    parameter_type ENUM('numeric', 'text', 'pass_fail', 'selection') NOT NULL,
    min_value DECIMAL(10,4),
    max_value DECIMAL(10,4),
    target_value DECIMAL(10,4),
    unit VARCHAR(20),
    is_critical BOOLEAN DEFAULT FALSE,
    sequence_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES quality_control_templates(id) ON DELETE CASCADE
);

-- Quality Control Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id INT,
    template_id INT NOT NULL,
    inspection_type ENUM('incoming', 'in_process', 'final', 'outgoing') NOT NULL,
    lot_number VARCHAR(50),
    quantity_inspected DECIMAL(10,4),
    quantity_passed DECIMAL(10,4) DEFAULT 0,
    quantity_failed DECIMAL(10,4) DEFAULT 0,
    overall_result ENUM('pass', 'fail', 'conditional_pass') DEFAULT 'pass',
    inspector_id INT,
    inspection_date DATETIME NOT NULL,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES production_work_orders(id),
    FOREIGN KEY (template_id) REFERENCES quality_control_templates(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quality Control Results
CREATE TABLE IF NOT EXISTS quality_inspection_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    parameter_id INT NOT NULL,
    measured_value DECIMAL(10,4),
    text_value TEXT,
    pass_fail_result ENUM('pass', 'fail'),
    selection_value VARCHAR(100),
    is_within_limits BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES quality_inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES quality_control_parameters(id)
);

-- =============================================
-- EMPLOYEE & ATTENDANCE MANAGEMENT
-- =============================================

-- Employee Departments
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(20) UNIQUE NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INT,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Employee Designations
CREATE TABLE IF NOT EXISTS designations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    designation_code VARCHAR(20) UNIQUE NOT NULL,
    designation_name VARCHAR(100) NOT NULL,
    description TEXT,
    department_id INT,
    grade_level VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Enhanced Employee Profiles
CREATE TABLE IF NOT EXISTS employee_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    employee_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    date_of_joining DATE NOT NULL,
    department_id INT,
    designation_id INT,
    manager_id INT,
    employment_type ENUM('permanent', 'contract', 'temporary', 'intern') DEFAULT 'permanent',
    shift_pattern VARCHAR(50) DEFAULT 'regular',
    salary_amount DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (designation_id) REFERENCES designations(id),
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status ENUM('present', 'absent', 'half_day', 'late', 'on_leave') DEFAULT 'present',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_employee_date (employee_id, attendance_date),
    FOREIGN KEY (employee_id) REFERENCES employee_profiles(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================
-- FINANCIAL MANAGEMENT
-- =============================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('asset', 'liability', 'equity', 'revenue', 'expense') NOT NULL,
    parent_account_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id)
);

-- Financial Transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_date DATE NOT NULL,
    reference_type ENUM('sales_order', 'purchase_order', 'journal_entry', 'payment', 'receipt') NOT NULL,
    reference_id INT,
    description TEXT,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft',
    created_by INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Financial Transaction Details
CREATE TABLE IF NOT EXISTS financial_transaction_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);

-- =============================================
-- SYSTEM ADMINISTRATION
-- =============================================

-- User Roles Enhancement
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- NOTIFICATIONS & ALERTS
-- =============================================

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject_template VARCHAR(200),
    body_template TEXT,
    notification_type ENUM('email', 'sms', 'system', 'push') DEFAULT 'system',
    trigger_event VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    notification_type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- REPORTING & ANALYTICS
-- =============================================

-- Report Definitions
CREATE TABLE IF NOT EXISTS report_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(100) NOT NULL,
    report_type ENUM('tabular', 'chart', 'dashboard') DEFAULT 'tabular',
    query_template TEXT,
    parameters JSON,
    access_roles JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('company_name', 'VTRIA Engineering Solutions', 'string', 'Company name for the ERP system'),
('currency', 'INR', 'string', 'Default currency'),
('date_format', 'DD/MM/YYYY', 'string', 'Default date format'),
('timezone', 'Asia/Kolkata', 'string', 'Default timezone'),
('fiscal_year_start', '04-01', 'string', 'Fiscal year start date (MM-DD)'),
('backup_retention_days', '90', 'number', 'Number of days to retain backups'),
('session_timeout_minutes', '30', 'number', 'User session timeout in minutes'),
('max_file_upload_size_mb', '10', 'number', 'Maximum file upload size in MB'),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications'),
('enable_audit_trail', 'true', 'boolean', 'Enable audit trail logging');

-- Insert default user roles
INSERT IGNORE INTO user_roles (role_name, description, permissions) VALUES
('super_admin', 'Super Administrator with full system access', '{"all": true}'),
('admin', 'Administrator with most privileges', '{"users": ["read", "create", "update"], "inventory": ["read", "create", "update"], "production": ["read", "create", "update"], "financial": ["read", "create", "update"]}'),
('manager', 'Manager with departmental access', '{"inventory": ["read", "create", "update"], "production": ["read", "create", "update"], "reports": ["read"]}'),
('supervisor', 'Supervisor with operational access', '{"production": ["read", "update"], "inventory": ["read"], "quality": ["read", "create", "update"]}'),
('operator', 'Operator with limited access', '{"production": ["read", "update"], "quality": ["read"]}'),
('viewer', 'Read-only access to most modules', '{"all": ["read"]}');

-- Insert default departments
INSERT IGNORE INTO departments (department_code, department_name, description) VALUES
('PROD', 'Production', 'Manufacturing and production operations'),
('QC', 'Quality Control', 'Quality assurance and control'),
('MAINT', 'Maintenance', 'Equipment and facility maintenance'),
('STORES', 'Stores & Inventory', 'Inventory and warehouse management'),
('SALES', 'Sales & Marketing', 'Sales and customer relations'),
('FINANCE', 'Finance & Accounts', 'Financial management and accounting'),
('HR', 'Human Resources', 'Human resource management'),
('IT', 'Information Technology', 'IT support and systems'),
('ADMIN', 'Administration', 'General administration');

-- Insert default production categories
INSERT IGNORE INTO production_categories (category_code, category_name, description) VALUES
('MACH', 'Machining', 'Machining operations'),
('WELD', 'Welding', 'Welding and fabrication'),
('ASSM', 'Assembly', 'Assembly operations'),
('PACK', 'Packaging', 'Packaging and finishing'),
('TEST', 'Testing', 'Testing and inspection'),
('PAINT', 'Painting', 'Painting and coating');

-- Insert default chart of accounts
INSERT IGNORE INTO chart_of_accounts (account_code, account_name, account_type) VALUES
('1000', 'Assets', 'asset'),
('1100', 'Current Assets', 'asset'),
('1110', 'Cash and Bank', 'asset'),
('1120', 'Accounts Receivable', 'asset'),
('1130', 'Inventory', 'asset'),
('1200', 'Fixed Assets', 'asset'),
('1210', 'Plant and Machinery', 'asset'),
('2000', 'Liabilities', 'liability'),
('2100', 'Current Liabilities', 'liability'),
('2110', 'Accounts Payable', 'liability'),
('2120', 'Accrued Expenses', 'liability'),
('3000', 'Equity', 'equity'),
('3100', 'Share Capital', 'equity'),
('3200', 'Retained Earnings', 'equity'),
('4000', 'Revenue', 'revenue'),
('4100', 'Sales Revenue', 'revenue'),
('4200', 'Other Income', 'revenue'),
('5000', 'Expenses', 'expense'),
('5100', 'Cost of Goods Sold', 'expense'),
('5200', 'Operating Expenses', 'expense'),
('5210', 'Salaries and Wages', 'expense'),
('5220', 'Utilities', 'expense'),
('5230', 'Rent', 'expense');

-- Insert notification templates
INSERT IGNORE INTO notification_templates (template_name, subject_template, body_template, notification_type, trigger_event) VALUES
('work_order_assigned', 'Work Order Assigned: {{work_order_number}}', 'A new work order {{work_order_number}} has been assigned to you. Please check the production module for details.', 'system', 'work_order_assigned'),
('inventory_low_stock', 'Low Stock Alert: {{item_name}}', 'Item {{item_name}} ({{item_code}}) has reached low stock level. Current stock: {{current_stock}}, Minimum level: {{minimum_level}}.', 'system', 'inventory_low_stock'),
('quality_inspection_failed', 'Quality Inspection Failed: {{inspection_number}}', 'Quality inspection {{inspection_number}} has failed. Immediate attention required.', 'system', 'quality_inspection_failed'),
('work_order_completed', 'Work Order Completed: {{work_order_number}}', 'Work order {{work_order_number}} has been completed successfully.', 'system', 'work_order_completed');

COMMIT;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Production indexes
CREATE INDEX idx_production_work_orders_status ON production_work_orders(status);
CREATE INDEX idx_production_work_orders_dates ON production_work_orders(scheduled_start_date, scheduled_end_date);
CREATE INDEX idx_work_order_operations_status ON work_order_operations(status);

-- Inventory indexes
CREATE INDEX idx_inventory_items_category ON inventory_items(category, subcategory);
CREATE INDEX idx_inventory_items_stock ON inventory_items(current_stock, minimum_stock_level);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(transaction_date);
CREATE INDEX idx_inventory_transactions_item ON inventory_transactions(item_id, transaction_date);

-- Quality indexes
CREATE INDEX idx_quality_inspections_date ON quality_inspections(inspection_date);
CREATE INDEX idx_quality_inspections_result ON quality_inspections(overall_result);

-- Employee indexes
CREATE INDEX idx_employee_profiles_department ON employee_profiles(department_id);
CREATE INDEX idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_employee_date ON attendance_records(employee_id, attendance_date);

-- Financial indexes
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id);

-- Audit indexes
CREATE INDEX idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id, created_at);
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at);

-- Notification indexes
CREATE INDEX idx_user_notifications_user_read ON user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Production-ready database schema created successfully!' AS Status;