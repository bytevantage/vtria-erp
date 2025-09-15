-- VTRIA ERP Database Initialization Script for Docker
-- This script runs automatically when MySQL container starts

-- Ensure we're using the correct database
USE vtria_erp;

-- Create basic required tables first

-- Locations/Offices
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_person VARCHAR(255),
    contact_number VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_role ENUM('director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician', 'production-manager', 'store-keeper') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories for products
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    payment_terms VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Document sequence tracking
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL, -- EQ, ET, Q, SO, GRN, I, PO, PI, DC, C, PR, BOM
    financial_year VARCHAR(4) NOT NULL,
    last_sequence INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doc_fy (document_type, financial_year)
);

-- Insert initial data

-- Insert sample locations
INSERT IGNORE INTO locations (id, name, city, state, address) VALUES
(1, 'Main Office', 'Mangalore', 'Karnataka', 'Main Office Address, Mangalore'),
(2, 'Warehouse 1', 'Mangalore', 'Karnataka', 'Warehouse Address, Mangalore');

-- Insert initial users
INSERT IGNORE INTO users (id, email, password_hash, full_name, user_role) VALUES
(1, 'admin@vtria.com', '$2b$10$dummy.hash.for.dev', 'System Admin', 'admin'),
(2, 'director@vtria.com', '$2b$10$dummy.hash.for.dev', 'Director', 'director'),
(3, 'sales@vtria.com', '$2b$10$dummy.hash.for.dev', 'Sales Admin', 'sales-admin'),
(4, 'designer@vtria.com', '$2b$10$dummy.hash.for.dev', 'Designer', 'designer'),
(5, 'accounts@vtria.com', '$2b$10$dummy.hash.for.dev', 'Accounts', 'accounts'),
(6, 'tech@vtria.com', '$2b$10$dummy.hash.for.dev', 'Technician', 'technician');

-- Insert sample clients
INSERT IGNORE INTO clients (id, company_name, contact_person, email, phone, city, state) VALUES
(1, 'Test Manufacturing Ltd', 'John Doe', 'john@testmfg.com', '9876543210', 'Mumbai', 'Maharashtra'),
(2, 'ABC Industries', 'Jane Smith', 'jane@abc.com', '9876543211', 'Bangalore', 'Karnataka'),
(3, 'XYZ Corporation', 'Mike Johnson', 'mike@xyz.com', '9876543212', 'Chennai', 'Tamil Nadu');

-- Insert sample categories
INSERT IGNORE INTO categories (id, name, description) VALUES
(1, 'Electrical', 'Electrical components and equipment'),
(2, 'Mechanical', 'Mechanical parts and machinery'),
(3, 'Control Systems', 'Control panels and automation');

-- Insert sample suppliers
INSERT IGNORE INTO suppliers (id, company_name, contact_person, email, phone, city, state) VALUES
(1, 'Supplier A Ltd', 'Supplier Contact A', 'suppliera@email.com', '9876543220', 'Delhi', 'Delhi'),
(2, 'Supplier B Corp', 'Supplier Contact B', 'supplierb@email.com', '9876543221', 'Pune', 'Maharashtra');

-- Insert document sequences for all document types
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('EQ', '2526', 0),    -- Enquiries
('ET', '2526', 0),    -- Estimations  
('Q', '2526', 0),     -- Quotations
('SO', '2526', 0),    -- Sales Orders
('PO', '2526', 0),    -- Purchase Orders
('GRN', '2526', 0),   -- Goods Received Notes
('I', '2526', 0),     -- Invoices
('DC', '2526', 0),    -- Delivery Challans
('C', '2526', 0),     -- Cases
('PR', '2526', 0),    -- Purchase Requisitions
('PI', '2526', 0),    -- Proforma Invoices
('BOM', '2526', 0);   -- Bill of Materials

-- Success message
SELECT 'VTRIA ERP Base Tables Initialized Successfully!' as status;