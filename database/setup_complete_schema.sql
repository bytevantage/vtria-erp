-- VTRIA ERP Complete Database Setup Script
-- This script creates the complete database schema with case management system

-- Create database
CREATE DATABASE IF NOT EXISTS vtria_erp;
USE vtria_erp;

-- Create user and grant permissions
CREATE USER IF NOT EXISTS 'vtria_user'@'localhost' IDENTIFIED BY 'dev_password';
GRANT ALL PRIVILEGES ON vtria_erp.* TO 'vtria_user'@'localhost';
FLUSH PRIVILEGES;

-- Import all schema files
SOURCE /Users/srbhandary/Documents/Projects/vtria-erp/database/schema/023_case_management_system.sql;
SOURCE /Users/srbhandary/Documents/Projects/vtria-erp/database/schema/024_integrate_existing_tables_with_cases.sql;
SOURCE /Users/srbhandary/Documents/Projects/vtria-erp/database/schema/026_enhanced_product_tracking.sql;

-- Display setup complete message
SELECT 'VTRIA ERP Database Setup Complete!' as STATUS;