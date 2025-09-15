-- VTRIA ERP Database Schema for Sales Enquiry System
-- File: 005_sales_enquiry_schema.sql

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sales Enquiries table
CREATE TABLE IF NOT EXISTS sales_enquiries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enquiry_id VARCHAR(50) UNIQUE NOT NULL, -- VESPL/EQ/2526/XXX format
    client_id INT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    enquiry_person VARCHAR(255) NOT NULL, -- VTRIA employee who got the enquiry
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    estimated_value DECIMAL(15,2),
    status ENUM('new', 'assigned', 'estimation', 'quotation', 'approved', 'rejected', 'completed') DEFAULT 'new',
    assigned_to INT, -- User ID of assigned designer/team
    assigned_date TIMESTAMP NULL,
    expected_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Enquiry Attachments table for documents/files
CREATE TABLE IF NOT EXISTS enquiry_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enquiry_id INT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    uploaded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Enquiry Status History for tracking workflow
CREATE TABLE IF NOT EXISTS enquiry_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enquiry_id INT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INT,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Document Sequence table for generating VESPL numbers
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_type VARCHAR(10) NOT NULL, -- EQ, ES, Q, SO, PO, etc.
    financial_year VARCHAR(10) NOT NULL, -- 2526, 2627, etc.
    last_sequence INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doc_year (document_type, financial_year)
);

-- Insert initial data for clients
INSERT INTO clients (company_name, contact_person, email, phone, address, city, state, pincode, gstin) VALUES
('Mangalore Steel Company', 'Mr. Suresh Rao', 'suresh.rao@mansteel.com', '+91-824-2234567', 'Industrial Area, Bajpe', 'Mangalore', 'Karnataka', '574142', '29ABCDE1234F1Z5'),
('Bangalore Manufacturing Ltd', 'Ms. Priya Sharma', 'priya@banmfg.com', '+91-80-25567890', 'Electronics City, Phase 2', 'Bangalore', 'Karnataka', '560100', '29FGHIJ5678K2L6'),
('Pune Auto Components', 'Mr. Suresh Patil', 'suresh.patil@puneauto.com', '+91-20-26789012', 'Pimpri Industrial Area', 'Pune', 'Maharashtra', '411018', '27KLMNO9012P3Q7'),
('Chennai Industries', 'Mr. Ravi Kumar', 'ravi@chennaiind.com', '+91-44-26345678', 'Ambattur Industrial Estate', 'Chennai', 'Tamil Nadu', '600058', '33PQRST3456U4V8');

-- Insert initial document sequences (only if not exists)
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('EQ', '2526', 0),
('ES', '2526', 0),
('Q', '2526', 0),
('SO', '2526', 0),
('PO', '2526', 0),
('PI', '2526', 0),
('GRN', '2526', 0),
('I', '2526', 0),
('DC', '2526', 0),
('BOM', '2526', 0);

-- Insert initial users
INSERT INTO users (email, password_hash, full_name, user_role) VALUES
('admin@vtria.com', '$2b$10$dummy.hash.for.dev', 'Admin User', 'admin'),
('rajesh@vtria.com', '$2b$10$dummy.hash.for.dev', 'Rajesh Kumar', 'sales-admin'),
('priya@vtria.com', '$2b$10$dummy.hash.for.dev', 'Priya Sharma', 'sales-admin'),
('designer@vtria.com', '$2b$10$dummy.hash.for.dev', 'Design Team Lead', 'designer');

-- Insert sample enquiries
INSERT INTO sales_enquiries (enquiry_id, client_id, project_name, description, status, date, enquiry_by) VALUES
('VESPL/EQ/2526/001', 1, 'Control Panel for Rolling Mill', 'Industrial automation system for steel rolling mill with PLC control', 'new', CURDATE(), 2),
('VESPL/EQ/2526/002', 2, 'HVAC System for Warehouse', 'Industrial air conditioning system for 50,000 sq ft warehouse', 'assigned', CURDATE(), 3),
('VESPL/EQ/2526/003', 3, 'Ceiling Fans for Assembly Hall', '12 nos very large ceiling fans for automobile assembly hall', 'new', CURDATE(), 2);

