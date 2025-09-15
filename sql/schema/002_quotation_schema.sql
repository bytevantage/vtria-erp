-- Quotations
CREATE TABLE quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id VARCHAR(50) NOT NULL UNIQUE, -- VESPL/Q/2526/XXX
    estimation_id INT NOT NULL,
    date DATE NOT NULL,
    valid_until DATE NOT NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'accepted', 'expired') DEFAULT 'draft',
    terms_conditions TEXT,
    delivery_terms TEXT,
    payment_terms TEXT,
    warranty_terms TEXT,
    total_amount DECIMAL(12,2) NOT NULL,
    total_tax DECIMAL(12,2) NOT NULL,
    grand_total DECIMAL(12,2) NOT NULL,
    profit_percentage DECIMAL(5,2),
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Quotation Items (consolidated from estimation sections)
CREATE TABLE quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_code VARCHAR(50),
    quantity INT NOT NULL,
    unit VARCHAR(50),
    rate DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2),
    tax_percentage DECIMAL(5,2),
    cgst_percentage DECIMAL(5,2),
    sgst_percentage DECIMAL(5,2),
    igst_percentage DECIMAL(5,2),
    amount DECIMAL(12,2) NOT NULL,
    lead_time VARCHAR(100),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id)
);

-- Bill of Materials (BOM)
CREATE TABLE bill_of_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id VARCHAR(50) NOT NULL UNIQUE, -- VESPL/BOM/2526/XXX
    quotation_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('draft', 'final') DEFAULT 'draft',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- BOM Items (detailed breakdown from estimation)
CREATE TABLE bom_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES bill_of_materials(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
