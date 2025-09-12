-- VTRIA ERP MySQL Database Creation Script
-- Run this script to create the MySQL database for VTRIA ERP

-- Create database
CREATE DATABASE IF NOT EXISTS vtria_erp_dev;

-- Use the database
USE vtria_erp_dev;

-- Create basic tables for initial setup

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  level INT NOT NULL,
  permissions JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  assigned_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Insert initial data

-- Insert roles
INSERT INTO roles (id, name, description, level, permissions) VALUES
(UUID(), 'Director', 'Full system access and administration', 5, '["user.create", "user.read", "user.update", "user.delete", "case.create", "case.read", "case.update", "case.delete", "stock.create", "stock.read", "stock.update", "stock.delete", "document.create", "document.read", "document.update", "document.delete", "report.generate", "system.admin"]'),
(UUID(), 'Manager', 'Management level access with reporting', 4, '["user.read", "case.create", "case.read", "case.update", "stock.read", "stock.update", "document.read", "document.create", "report.generate"]'),
(UUID(), 'Sales Admin', 'Sales and customer management', 3, '["case.create", "case.read", "case.update", "document.read", "document.create"]'),
(UUID(), 'Engineer', 'Technical case handling and stock management', 2, '["case.read", "case.update", "stock.read", "stock.update", "document.read", "document.create"]'),
(UUID(), 'User', 'Basic user access', 1, '["case.read", "document.read"]');

-- Insert locations
INSERT INTO locations (id, name, code, address, city, state, country, postal_code) VALUES
(UUID(), 'Mangalore Office', 'MNG', 'VTRIA Engineering Solutions Pvt Ltd, Mangalore', 'Mangalore', 'Karnataka', 'India', '575001'),
(UUID(), 'Bangalore Office', 'BLR', 'VTRIA Engineering Solutions Pvt Ltd, Bangalore', 'Bangalore', 'Karnataka', 'India', '560001'),
(UUID(), 'Pune Office', 'PUN', 'VTRIA Engineering Solutions Pvt Ltd, Pune', 'Pune', 'Maharashtra', 'India', '411001');

-- Create admin user with hashed password (VtriaAdmin@2024)
INSERT INTO users (id, email, password, first_name, last_name, employee_id, department) VALUES
(UUID(), 'admin@vtria.com', '$2a$12$1oE8Fz5Qx7ZG3RxJV8xY5.XtZ5vZU5UEgL7S5q5HvWW5JZjZ5ZJZ5', 'System', 'Administrator', 'VTRIA001', 'IT');

-- Assign Director role to admin user
INSERT INTO user_roles (id, user_id, role_id, assigned_by)
SELECT UUID(), u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'admin@vtria.com' AND r.name = 'Director';

-- Assign all locations to admin user
INSERT INTO user_locations (id, user_id, location_id)
SELECT UUID(), u.id, l.id
FROM users u, locations l
WHERE u.email = 'admin@vtria.com';

-- Show created tables
SHOW TABLES;
