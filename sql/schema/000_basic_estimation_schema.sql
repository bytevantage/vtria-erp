-- Basic estimation schema for VTRIA ERP

-- Create estimations table
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

-- Create estimation sections table
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

-- Create estimation items table
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
