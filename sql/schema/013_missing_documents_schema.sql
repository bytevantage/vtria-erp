-- Additional schema for missing document types

-- Purchase Requisitions (PR)
CREATE TABLE purchase_requisitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pr_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT,
    supplier_id INT,
    pr_date DATE NOT NULL,
    status ENUM('draft', 'sent', 'responded', 'cancelled') DEFAULT 'draft',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Purchase Requisition Items
CREATE TABLE purchase_requisition_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pr_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    estimated_price DECIMAL(12,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Proforma Invoices (PI)
CREATE TABLE proforma_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pi_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id INT,
    supplier_id INT,
    pi_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status ENUM('sent', 'acknowledged', 'paid', 'cancelled') DEFAULT 'sent',
    payment_terms TEXT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Goods Received Notes (GRN)
CREATE TABLE goods_received_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    purchase_order_id INT NOT NULL,
    supplier_id INT NOT NULL,
    grn_date DATE NOT NULL,
    lr_number VARCHAR(100),
    supplier_invoice_number VARCHAR(100),
    supplier_invoice_date DATE,
    total_amount DECIMAL(12,2),
    status ENUM('draft', 'verified', 'approved', 'rejected') DEFAULT 'draft',
    notes TEXT,
    received_by INT,
    verified_by INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- GRN Items with serial numbers and warranty
CREATE TABLE grn_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_id INT NOT NULL,
    product_id INT NOT NULL,
    ordered_quantity INT NOT NULL,
    received_quantity INT NOT NULL,
    accepted_quantity INT NOT NULL,
    rejected_quantity INT DEFAULT 0,
    unit_price DECIMAL(12,2),
    serial_numbers TEXT,
    warranty_start_date DATE,
    warranty_end_date DATE,
    location_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Bill of Materials (BOM)
CREATE TABLE bill_of_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id INT,
    bom_date DATE NOT NULL,
    total_estimated_cost DECIMAL(12,2),
    status ENUM('draft', 'approved', 'locked') DEFAULT 'draft',
    notes TEXT,
    created_by INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- BOM Items
CREATE TABLE bom_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    estimated_cost DECIMAL(12,2),
    section_name VARCHAR(255),
    subsection_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Delivery Challans (DC)
CREATE TABLE delivery_challans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dc_number VARCHAR(50) NOT NULL UNIQUE,
    sales_order_id INT,
    invoice_id INT,
    client_id INT NOT NULL,
    dc_date DATE NOT NULL,
    delivery_address TEXT,
    transport_mode VARCHAR(100),
    vehicle_number VARCHAR(50),
    lr_number VARCHAR(100),
    total_items INT,
    status ENUM('prepared', 'dispatched', 'delivered', 'returned') DEFAULT 'prepared',
    notes TEXT,
    prepared_by INT,
    dispatched_by INT,
    delivered_date DATE,
    received_by_client VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (prepared_by) REFERENCES users(id),
    FOREIGN KEY (dispatched_by) REFERENCES users(id)
);

-- Delivery Challan Items
CREATE TABLE delivery_challan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dc_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    serial_numbers TEXT,
    from_location_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dc_id) REFERENCES delivery_challans(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_location_id) REFERENCES locations(id)
);

-- Suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    account_number VARCHAR(100),
    bank_name VARCHAR(255),
    ifsc_code VARCHAR(20),
    payment_terms TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Company Configuration
CREATE TABLE company_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'VTRIA ENGINEERING SOLUTIONS PVT LTD',
    motto VARCHAR(255) DEFAULT 'Engineering for a Better Tomorrow',
    logo_url VARCHAR(255) DEFAULT 'vtria_logo.jpg',
    address TEXT,
    city VARCHAR(255) DEFAULT 'Mangalore',
    state VARCHAR(255) DEFAULT 'Karnataka',
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(20),
    download_folder_path VARCHAR(500) DEFAULT '/downloads',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company configuration
INSERT INTO company_config (company_name, motto, logo_url, address, city, state) VALUES 
('VTRIA ENGINEERING SOLUTIONS PVT LTD', 'Engineering for a Better Tomorrow', 'vtria_logo.jpg', 'Mangalore Office Address', 'Mangalore', 'Karnataka');

-- Tax Configuration
CREATE TABLE tax_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_code VARCHAR(10) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    is_home_state BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default tax configuration
INSERT INTO tax_config (state_code, state_name, cgst_rate, sgst_rate, igst_rate, is_home_state) VALUES 
('KA', 'Karnataka', 9.00, 9.00, 18.00, TRUE),
('MH', 'Maharashtra', 9.00, 9.00, 18.00, FALSE),
('TN', 'Tamil Nadu', 9.00, 9.00, 18.00, FALSE),
('AP', 'Andhra Pradesh', 9.00, 9.00, 18.00, FALSE),
('TG', 'Telangana', 9.00, 9.00, 18.00, FALSE);
