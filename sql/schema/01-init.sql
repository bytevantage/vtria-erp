-- Minimal initialization-- VTRIA ERP Database Schema Initialization

-- This will be replaced by the backup restore-- This file initializes the basic database structure for VTRIA ERP

SELECT 'Database initialized - ready for backup restore' as status;
USE vtria_erp;

-- Create basic tables for production
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    user_role ENUM('admin', 'director', 'manager', 'designer', 'technician') DEFAULT 'technician',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin users with proper password hashes
INSERT IGNORE INTO users (email, password_hash, full_name, user_role, status) VALUES 
('admin@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'System Administrator', 'admin', 'active'),
('director@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'Director', 'director', 'active'),
('manager@vtria.com', '$2b$10$l..EPh9jnNKogEkGds6V5eqwWwq6ZjcDWC35yB9WBqrqzTwR2ysce', 'Manager', 'manager', 'active');

-- Create basic system tables
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INT,
    position VARCHAR(255),
    salary DECIMAL(10,2),
    hire_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    gst_number VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id)
);

-- Create document_sequences table for ticketing system
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(10) UNIQUE NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    last_sequence INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create cases table for ticketing system
CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('open', 'closed', 'pending') DEFAULT 'open',
    current_state ENUM('enquiry', 'quotation', 'order', 'production', 'delivery', 'closed') DEFAULT 'enquiry',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_by INT NOT NULL,
    assigned_to INT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Create case_notes table for ticketing system
CREATE TABLE IF NOT EXISTS case_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    note_type ENUM('internal', 'client', 'system') DEFAULT 'internal',
    is_internal BOOLEAN DEFAULT TRUE,
    is_system_generated BOOLEAN DEFAULT FALSE,
    is_editable BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL,
    edited_by INT NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert basic departments
INSERT IGNORE INTO departments (id, name, description) VALUES 
(1, 'Management', 'Senior Management and Administration'),
(2, 'Sales', 'Sales and Business Development'),
(3, 'Engineering', 'Technical and Engineering Team'),
(4, 'Production', 'Manufacturing and Production'),
(5, 'Accounts', 'Finance and Accounting');

-- Insert basic expense categories
INSERT IGNORE INTO expense_categories (id, name, description) VALUES 
(1, 'Travel', 'Business travel expenses'),
(2, 'Office Supplies', 'Stationery and office supplies'),
(3, 'Utilities', 'Electricity, water, internet'),
(4, 'Maintenance', 'Equipment and facility maintenance'),
(5, 'Professional Services', 'Consultants and professional fees');

-- Insert basic suppliers
INSERT IGNORE INTO suppliers (id, name, email, phone, gst_number) VALUES 
(1, 'Tech Supplies Inc', 'info@techsupplies.com', '+1234567890', 'GST123456'),
(2, 'Office Depot', 'sales@officedepot.com', '+1234567891', 'GST789012'),
(3, 'Engineering Solutions', 'contact@engsolutions.com', '+1234567892', 'GST345678');

-- Insert sample employees
INSERT IGNORE INTO employees (employee_id, first_name, last_name, email, department_id, position, salary, hire_date) VALUES 
('EMP001', 'John', 'Smith', 'john.smith@vtria.com', 1, 'CEO', 150000.00, '2020-01-01'),
('EMP002', 'Jane', 'Doe', 'jane.doe@vtria.com', 2, 'Sales Manager', 120000.00, '2020-02-01'),
('EMP003', 'Mike', 'Johnson', 'mike.johnson@vtria.com', 3, 'Lead Engineer', 130000.00, '2020-03-01');

-- Insert basic system configuration
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
('system_name', 'VTRIA ERP', 'System Name'),
('system_version', '1.1.0', 'System Version'),
('database_initialized', 'true', 'Database Initialization Status'),
('company_name', 'VTRIA Engineering Solutions Pvt Ltd', 'Company Legal Name'),
('financial_year', '2025-2026', 'Current Financial Year');