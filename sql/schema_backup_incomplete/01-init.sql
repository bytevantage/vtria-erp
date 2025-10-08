-- VTRIA ERP Database Schema Initialization
-- This file initializes the basic database structure for VTRIA ERP

USE vtria_erp;

-- Create basic tables for production
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role ENUM('admin', 'director', 'manager', 'designer', 'technician') DEFAULT 'technician',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT IGNORE INTO users (email, password_hash, name, role) VALUES 
('admin@vtria.com', '$2b$10$1234567890abcdefghijklmnopqrstuvwxyz', 'System Administrator', 'admin'),
('director@vtria.com', '$2b$10$1234567890abcdefghijklmnopqrstuvwxyz', 'Director', 'director'),
('manager@vtria.com', '$2b$10$1234567890abcdefghijklmnopqrstuvwxyz', 'Manager', 'manager');

-- Create basic system tables
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert basic system configuration
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES 
('system_name', 'VTRIA ERP', 'System Name'),
('system_version', '1.1.0', 'System Version'),
('database_initialized', 'true', 'Database Initialization Status');