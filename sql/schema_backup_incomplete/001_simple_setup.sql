-- Simple VTRIA ERP Database Setup
-- This creates the essential tables needed for the system to work

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_role ENUM('director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician') NOT NULL,
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

-- Sales enquiries table
CREATE TABLE IF NOT EXISTS sales_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id VARCHAR(50) NOT NULL UNIQUE,
    client_id INT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    enquiry_by INT NOT NULL,
    status ENUM('new', 'assigned', 'estimation', 'quotation', 'approved', 'rejected', 'completed') DEFAULT 'new',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (enquiry_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    category VARCHAR(100),
    unit VARCHAR(20) DEFAULT 'nos',
    mrp DECIMAL(10,2) DEFAULT 0.00,
    cost_price DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Estimations table
CREATE TABLE IF NOT EXISTS estimations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id VARCHAR(50) NOT NULL UNIQUE,
    enquiry_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    total_mrp DECIMAL(15,2) DEFAULT 0.00,
    total_discount DECIMAL(15,2) DEFAULT 0.00,
    total_final_price DECIMAL(15,2) DEFAULT 0.00,
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Estimation sections table
CREATE TABLE IF NOT EXISTS estimation_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    heading VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES estimation_sections(id) ON DELETE CASCADE
);

-- Estimation items table
CREATE TABLE IF NOT EXISTS estimation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    section_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    mrp DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discounted_price DECIMAL(10,2) NOT NULL,
    final_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Document sequences table
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    last_sequence INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doc_year (document_type, financial_year)
);

-- Insert initial data
INSERT INTO users (email, password_hash, full_name, user_role) VALUES
('admin@vtria.com', '$2b$10$dummy.hash.for.dev', 'Admin User', 'admin'),
('rajesh@vtria.com', '$2b$10$dummy.hash.for.dev', 'Rajesh Kumar', 'sales-admin'),
('priya@vtria.com', '$2b$10$dummy.hash.for.dev', 'Priya Sharma', 'sales-admin'),
('designer@vtria.com', '$2b$10$dummy.hash.for.dev', 'Design Team Lead', 'designer');

INSERT INTO clients (company_name, contact_person, email, phone, address, city, state, pincode, gstin) VALUES
('Mangalore Steel Company', 'Mr. Suresh Rao', 'suresh.rao@mansteel.com', '+91-824-2234567', 'Industrial Area, Bajpe', 'Mangalore', 'Karnataka', '574142', '29ABCDE1234F1Z5'),
('Bangalore Manufacturing Ltd', 'Ms. Priya Sharma', 'priya@banmfg.com', '+91-80-25567890', 'Electronics City, Phase 2', 'Bangalore', 'Karnataka', '560100', '29FGHIJ5678K2L6'),
('Pune Auto Components', 'Mr. Suresh Patil', 'suresh.patil@puneauto.com', '+91-20-26789012', 'Pimpri Industrial Area', 'Pune', 'Maharashtra', '411018', '27KLMNO9012P3Q7');

INSERT INTO products (name, sku, description, category, mrp, cost_price) VALUES
('Control Panel MCB 32A', 'CP-MCB-32A', '32 Amp MCB for control panels', 'Electrical', 450.00, 380.00),
('PLC Module Siemens S7-200', 'PLC-S7-200', 'Siemens S7-200 PLC module', 'Automation', 15000.00, 12500.00),
('Industrial Fan 48 inch', 'FAN-IND-48', 'Heavy duty industrial ceiling fan', 'HVAC', 8500.00, 7200.00);

INSERT INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('EQ', '2526', 0),
('ES', '2526', 0),
('Q', '2526', 0),
('SO', '2526', 0);

INSERT INTO sales_enquiries (enquiry_id, client_id, project_name, description, date, enquiry_by, status) VALUES
('VESPL/EQ/2526/001', 1, 'Control Panel for Rolling Mill', 'Industrial automation system for steel rolling mill with PLC control', CURDATE(), 2, 'new'),
('VESPL/EQ/2526/002', 2, 'HVAC System for Warehouse', 'Industrial air conditioning system for 50,000 sq ft warehouse', CURDATE(), 3, 'assigned'),
('VESPL/EQ/2526/003', 3, 'Ceiling Fans for Assembly Hall', '12 nos very large ceiling fans for automobile assembly hall', CURDATE(), 2, 'new');
