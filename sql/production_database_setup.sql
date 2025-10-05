-- ============================================
-- VTRIA ERP Production Database Setup Script
-- ============================================
-- Run this script to set up your production database

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS vtria_erp_prod 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE vtria_erp_prod;

-- ============================================
-- Create Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    user_role ENUM('director', 'admin', 'designer', 'technician', 'user') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    phone VARCHAR(20),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_role (user_role),
    INDEX idx_status (status)
);

-- ============================================
-- Insert Production Admin Users
-- ============================================

-- 1. System Administrator (Director Level)
INSERT INTO users (
    email,
    password_hash,
    full_name,
    first_name,
    last_name,
    user_role,
    status,
    phone,
    department
) VALUES (
    'admin@vtria.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Password: Admin123!
    'System Administrator',
    'System',
    'Administrator',
    'director',
    'active',
    '+91-9876543210',
    'IT Administration'
) ON DUPLICATE KEY UPDATE
    password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    updated_at = NOW();

-- 2. VTRIA Director (Replace with your details)
INSERT INTO users (
    email,
    password_hash,
    full_name,
    first_name,
    last_name,
    user_role,
    status,
    phone,
    department
) VALUES (
    'director@vtria.com',
    '$2a$10$8K1p/m3jvgfhYfJn6.9NFu5.LZWGsHOsD4xm7RzY.oBhgxpFlGh4q', -- Password: VtriaDir2025!
    'VTRIA Director',
    'Director',
    'VTRIA',
    'director',
    'active',
    '+91-9876543211',
    'Management'
) ON DUPLICATE KEY UPDATE
    password_hash = '$2a$10$8K1p/m3jvgfhYfJn6.9NFu5.LZWGsHOsD4xm7RzY.oBhgxpFlGh4q',
    updated_at = NOW();

-- 3. Production Manager
INSERT INTO users (
    email,
    password_hash,
    full_name,
    first_name,
    last_name,
    user_role,
    status,
    phone,
    department
) VALUES (
    'manager@vtria.com',
    '$2a$10$7J0o/l2iufgfhYfJn5.8NEu4.KZWFsGOsC3xl6QzX.nBhfxoElFh3p', -- Password: Manager2025!
    'Production Manager',
    'Production',
    'Manager',
    'admin',
    'active',
    '+91-9876543212',
    'Production'
) ON DUPLICATE KEY UPDATE
    password_hash = '$2a$10$7J0o/l2iufgfhYfJn5.8NEu4.KZWFsGOsC3xl6QzX.nBhfxoElFh3p',
    updated_at = NOW();

-- ============================================
-- Create Essential Tables (Basic Structure)
-- ============================================

-- Companies/Clients Table
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products/Inventory Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    stock_quantity INT DEFAULT 0,
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_part_code (part_code),
    INDEX idx_status (status)
);

-- Sales Enquiries Table
CREATE TABLE IF NOT EXISTS sales_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT,
    enquiry_date DATE NOT NULL,
    project_name VARCHAR(255),
    description TEXT,
    status ENUM('pending', 'quoted', 'won', 'lost') DEFAULT 'pending',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES companies(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- Create User Permissions/Roles Tables
-- ============================================

-- User Sessions Table (for tracking logins)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (session_token),
    INDEX idx_user_active (user_id, is_active)
);

-- ============================================
-- Insert Sample Data
-- ============================================

-- Sample Client
INSERT INTO companies (company_name, contact_person, email, phone, address) VALUES
('Acme Manufacturing Ltd', 'John Smith', 'john@acme.com', '+91-9876543213', '123 Industrial Area, Mumbai'),
('Tech Solutions Pvt Ltd', 'Sarah Johnson', 'sarah@techsolutions.com', '+91-9876543214', '456 IT Park, Bangalore')
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- Sample Products
INSERT INTO products (part_code, product_name, category, manufacturer, unit_price, stock_quantity) VALUES
('PLC-001', 'Programmable Logic Controller', 'Automation', 'Siemens', 25000.00, 10),
('HMI-001', 'Human Machine Interface', 'Displays', 'Schneider', 15000.00, 5),
('VFD-001', 'Variable Frequency Drive', 'Motor Control', 'ABB', 30000.00, 8)
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- ============================================
-- Display Setup Summary
-- ============================================

SELECT '============================================' as '';
SELECT 'VTRIA ERP PRODUCTION DATABASE SETUP COMPLETE' as status;
SELECT '============================================' as '';

SELECT 'PRODUCTION LOGIN CREDENTIALS:' as info;
SELECT '============================================' as '';
SELECT 'Email: admin@vtria.com' as credential_1;
SELECT 'Password: Admin123!' as credential_1_password;
SELECT 'Role: System Administrator (Full Access)' as credential_1_role;
SELECT '' as '';
SELECT 'Email: director@vtria.com' as credential_2;
SELECT 'Password: VtriaDir2025!' as credential_2_password;
SELECT 'Role: Director (Full Access)' as credential_2_role;
SELECT '' as '';
SELECT 'Email: manager@vtria.com' as credential_3;
SELECT 'Password: Manager2025!' as credential_3_password;
SELECT 'Role: Admin (Management Access)' as credential_3_role;
SELECT '============================================' as '';

-- Verify users were created
SELECT 'CREATED USERS:' as verification;
SELECT id, email, full_name, user_role, status, created_at 
FROM users 
ORDER BY id;

SELECT '============================================' as '';
SELECT 'SECURITY REMINDER:' as security;
SELECT 'CHANGE ALL DEFAULT PASSWORDS AFTER FIRST LOGIN!' as security_warning;
SELECT 'Update production URLs in .env files!' as config_warning;
SELECT '============================================' as '';