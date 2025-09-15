-- Serial Number and Warranty Tracking Schema
-- This schema manages product serial numbers, warranty information, and warranty claims

-- Product Serial Numbers Table
CREATE TABLE IF NOT EXISTS product_serial_numbers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    batch_number VARCHAR(50),
    manufacturing_date DATE,
    warranty_expiry_date DATE,
    warranty_months INT DEFAULT 12,
    location_id INT,
    status ENUM('in_stock', 'sold', 'returned', 'defective', 'scrapped') DEFAULT 'in_stock',
    sales_order_id INT NULL,
    customer_id INT NULL,
    sold_date DATE NULL,
    notes TEXT,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_serial_number (serial_number),
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_warranty_expiry (warranty_expiry_date),
    INDEX idx_batch_number (batch_number),
    INDEX idx_location_id (location_id)
);

-- Serial Number History Table (for tracking status changes)
CREATE TABLE IF NOT EXISTS serial_number_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    serial_number_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by INT,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    FOREIGN KEY (serial_number_id) REFERENCES product_serial_numbers(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_serial_number_id (serial_number_id),
    INDEX idx_change_date (change_date)
);

-- Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    serial_number_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    issue_description TEXT NOT NULL,
    claim_type ENUM('repair', 'replacement', 'refund') DEFAULT 'repair',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('open', 'in_progress', 'resolved', 'closed', 'rejected') DEFAULT 'open',
    warranty_valid BOOLEAN DEFAULT TRUE,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP NULL,
    resolution_notes TEXT,
    replacement_serial_number VARCHAR(100),
    repair_cost DECIMAL(10,2),
    handled_by INT,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (serial_number_id) REFERENCES product_serial_numbers(id) ON DELETE CASCADE,
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_claim_number (claim_number),
    INDEX idx_serial_number_id (serial_number_id),
    INDEX idx_status (status),
    INDEX idx_claim_date (claim_date),
    INDEX idx_warranty_valid (warranty_valid)
);

-- Warranty Claim Attachments Table
CREATE TABLE IF NOT EXISTS warranty_claim_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    description TEXT,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES warranty_claims(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_claim_id (claim_id)
);

-- Product Warranty Templates Table (for different warranty periods by product category)
CREATE TABLE IF NOT EXISTS product_warranty_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_category_id INT,
    product_id INT,
    warranty_months INT NOT NULL DEFAULT 12,
    warranty_terms TEXT,
    coverage_details TEXT,
    exclusions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_category_id) REFERENCES product_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_product_category_id (product_category_id),
    INDEX idx_product_id (product_id),
    INDEX idx_is_active (is_active)
);

-- Batch Information Table (for tracking manufacturing batches)
CREATE TABLE IF NOT EXISTS product_batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_number VARCHAR(50) NOT NULL UNIQUE,
    product_id INT NOT NULL,
    manufacturing_date DATE NOT NULL,
    expiry_date DATE,
    quantity_produced INT NOT NULL,
    quality_grade ENUM('A', 'B', 'C') DEFAULT 'A',
    supplier_id INT,
    manufacturing_location VARCHAR(255),
    batch_notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_batch_number (batch_number),
    INDEX idx_product_id (product_id),
    INDEX idx_manufacturing_date (manufacturing_date)
);

-- Views for reporting and analytics

-- Warranty Status Summary View
CREATE OR REPLACE VIEW warranty_status_summary AS
SELECT 
    p.name as product_name,
    p.sku as product_sku,
    COUNT(psn.id) as total_units,
    COUNT(CASE WHEN psn.status = 'sold' THEN 1 END) as sold_units,
    COUNT(CASE WHEN psn.warranty_expiry_date < CURDATE() AND psn.status = 'sold' THEN 1 END) as expired_warranties,
    COUNT(CASE WHEN psn.warranty_expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND psn.status = 'sold' THEN 1 END) as expiring_soon,
    COUNT(CASE WHEN psn.warranty_expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND psn.status = 'sold' THEN 1 END) as active_warranties
FROM products p
LEFT JOIN product_serial_numbers psn ON p.id = psn.product_id
GROUP BY p.id, p.name, p.sku;

-- Warranty Claims Summary View
CREATE OR REPLACE VIEW warranty_claims_summary AS
SELECT 
    p.name as product_name,
    p.sku as product_sku,
    COUNT(wc.id) as total_claims,
    COUNT(CASE WHEN wc.status = 'open' THEN 1 END) as open_claims,
    COUNT(CASE WHEN wc.status = 'in_progress' THEN 1 END) as in_progress_claims,
    COUNT(CASE WHEN wc.status = 'resolved' THEN 1 END) as resolved_claims,
    COUNT(CASE WHEN wc.warranty_valid = FALSE THEN 1 END) as out_of_warranty_claims,
    AVG(CASE WHEN wc.resolved_date IS NOT NULL THEN DATEDIFF(wc.resolved_date, wc.claim_date) END) as avg_resolution_days,
    SUM(wc.repair_cost) as total_repair_cost
FROM products p
LEFT JOIN product_serial_numbers psn ON p.id = psn.product_id
LEFT JOIN warranty_claims wc ON psn.id = wc.serial_number_id
GROUP BY p.id, p.name, p.sku;

-- Serial Number Tracking View
CREATE OR REPLACE VIEW serial_number_tracking AS
SELECT 
    psn.serial_number,
    p.name as product_name,
    p.sku as product_sku,
    psn.batch_number,
    psn.manufacturing_date,
    psn.warranty_expiry_date,
    psn.status,
    l.name as current_location,
    c.name as customer_name,
    so.order_number,
    psn.sold_date,
    CASE 
        WHEN psn.warranty_expiry_date < CURDATE() THEN 'Expired'
        WHEN psn.warranty_expiry_date < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Expiring Soon'
        ELSE 'Active'
    END as warranty_status,
    DATEDIFF(psn.warranty_expiry_date, CURDATE()) as warranty_days_remaining,
    COUNT(wc.id) as warranty_claims_count
FROM product_serial_numbers psn
LEFT JOIN products p ON psn.product_id = p.id
LEFT JOIN locations l ON psn.location_id = l.id
LEFT JOIN clients c ON psn.customer_id = c.id
LEFT JOIN sales_orders so ON psn.sales_order_id = so.id
LEFT JOIN warranty_claims wc ON psn.id = wc.serial_number_id
GROUP BY psn.id;

-- Triggers for automatic updates

-- Trigger to log serial number status changes
DELIMITER //
CREATE TRIGGER tr_serial_number_status_change
    AFTER UPDATE ON product_serial_numbers
    FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO serial_number_history (serial_number_id, status, changed_by, notes)
        VALUES (NEW.id, NEW.status, NEW.updated_by, CONCAT('Status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
END//
DELIMITER ;

-- Trigger to update warranty expiry when warranty months change
DELIMITER //
CREATE TRIGGER tr_update_warranty_expiry
    BEFORE UPDATE ON product_serial_numbers
    FOR EACH ROW
BEGIN
    IF OLD.warranty_months != NEW.warranty_months OR OLD.manufacturing_date != NEW.manufacturing_date THEN
        SET NEW.warranty_expiry_date = DATE_ADD(NEW.manufacturing_date, INTERVAL NEW.warranty_months MONTH);
    END IF;
END//
DELIMITER ;

-- Trigger to set warranty expiry on insert
DELIMITER //
CREATE TRIGGER tr_set_warranty_expiry_on_insert
    BEFORE INSERT ON product_serial_numbers
    FOR EACH ROW
BEGIN
    IF NEW.warranty_expiry_date IS NULL AND NEW.manufacturing_date IS NOT NULL THEN
        SET NEW.warranty_expiry_date = DATE_ADD(NEW.manufacturing_date, INTERVAL NEW.warranty_months MONTH);
    END IF;
END//
DELIMITER ;

-- Sample data for testing
INSERT INTO product_warranty_templates (product_category_id, warranty_months, warranty_terms, coverage_details, created_by) VALUES
(1, 24, 'Standard 2-year warranty', 'Covers manufacturing defects and component failures', 1),
(2, 12, 'Standard 1-year warranty', 'Covers electrical components and wiring defects', 1),
(3, 36, 'Extended 3-year warranty', 'Comprehensive coverage for HVAC systems', 1);

-- Add warranty permission to RBAC if not exists
INSERT IGNORE INTO role_permissions (role, module, action) VALUES
('director', 'warranty', 'create'),
('director', 'warranty', 'read'),
('director', 'warranty', 'update'),
('director', 'warranty', 'delete'),
('admin', 'warranty', 'create'),
('admin', 'warranty', 'read'),
('admin', 'warranty', 'update'),
('admin', 'warranty', 'delete'),
('sales_admin', 'warranty', 'create'),
('sales_admin', 'warranty', 'read'),
('sales_admin', 'warranty', 'update'),
('technician', 'warranty', 'read'),
('technician', 'warranty', 'update'),
('accounts', 'warranty', 'read');
