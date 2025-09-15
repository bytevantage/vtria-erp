-- Initial schema for VTRIA ERP system

-- Users and Authentication
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    user_role ENUM('director', 'admin', 'sales-admin', 'designer', 'accounts', 'technician') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Locations/Offices
CREATE TABLE locations (
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

-- Clients
CREATE TABLE clients (
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

-- Categories for products/materials
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Products/Materials master
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    make VARCHAR(255),
    model VARCHAR(255),
    part_code VARCHAR(255),
    category_id INT,
    sub_category_id INT,
    description TEXT,
    mrp DECIMAL(12,2),
    last_price DECIMAL(12,2),
    last_price_date DATE,
    hsn_code VARCHAR(50),
    unit VARCHAR(50),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (sub_category_id) REFERENCES categories(id)
);

-- Stock management
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Stock movements
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    from_location_id INT,
    to_location_id INT,
    quantity INT NOT NULL,
    movement_type ENUM('in', 'out', 'transfer') NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(50),
    movement_date TIMESTAMP NOT NULL,
    created_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Document sequence tracking
CREATE TABLE document_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type VARCHAR(10) NOT NULL, -- EQ, ET, Q, SO, GRN, I, PO, PI, DC
    financial_year VARCHAR(4) NOT NULL,
    last_sequence INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_doc_fy (document_type, financial_year)
);

-- Sales enquiries
CREATE TABLE sales_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id VARCHAR(50) NOT NULL UNIQUE, -- VESPL/EQ/2526/XXX
    date DATE NOT NULL,
    client_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    enquiry_by INT NOT NULL,
    status ENUM('new', 'assigned', 'estimated', 'quoted', 'approved', 'rejected') DEFAULT 'new',
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (enquiry_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Estimations
CREATE TABLE estimations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id VARCHAR(50) NOT NULL UNIQUE, -- VESPL/ES/2526/XXX
    enquiry_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    total_mrp DECIMAL(12,2),
    total_discount DECIMAL(12,2),
    total_final_price DECIMAL(12,2),
    created_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Estimation sections
CREATE TABLE estimation_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    heading VARCHAR(255) NOT NULL,
    parent_id INT,
    sort_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (parent_id) REFERENCES estimation_sections(id)
);

-- Estimation items
CREATE TABLE estimation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    section_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    mrp DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2),
    discounted_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Case history tracking
CREATE TABLE case_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_type VARCHAR(50) NOT NULL,
    reference_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
