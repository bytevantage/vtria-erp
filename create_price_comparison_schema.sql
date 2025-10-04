-- Price Comparison and Supplier Quote Management Schema
-- This creates the necessary tables for enterprise-grade price comparison functionality

-- Table 1: Supplier Quote Requests (RFQs sent to suppliers)
CREATE TABLE IF NOT EXISTS supplier_quote_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    estimation_id INT NOT NULL,
    supplier_id INT NOT NULL,
    requested_by INT NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    status ENUM('draft', 'sent', 'responded', 'expired', 'cancelled') DEFAULT 'draft',
    notes TEXT,
    terms_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_estimation (estimation_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES inventory_vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Table 2: Items in Quote Requests  
CREATE TABLE IF NOT EXISTS supplier_quote_request_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    estimation_item_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'NOS',
    specifications JSON,
    estimated_price DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_request (request_id),
    INDEX idx_estimation_item (estimation_item_id),
    
    FOREIGN KEY (request_id) REFERENCES supplier_quote_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (estimation_item_id) REFERENCES estimation_items(id) ON DELETE CASCADE
);

-- Table 3: Supplier Quotes (Responses from suppliers)
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quote_number VARCHAR(50) NOT NULL UNIQUE,
    request_id INT NOT NULL,
    supplier_id INT NOT NULL,
    quote_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired') DEFAULT 'draft',
    payment_terms VARCHAR(255),
    delivery_terms VARCHAR(255),
    warranty_terms VARCHAR(255),
    notes TEXT,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    review_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_request (request_id),
    INDEX idx_supplier (supplier_id),
    INDEX idx_status (status),
    INDEX idx_valid_until (valid_until),
    INDEX idx_quote_date (quote_date),
    
    FOREIGN KEY (request_id) REFERENCES supplier_quote_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES inventory_vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table 4: Individual Items in Supplier Quotes
CREATE TABLE IF NOT EXISTS supplier_quote_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quote_id INT NOT NULL,
    request_item_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'NOS',
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    final_price DECIMAL(15,2) NOT NULL,
    specifications JSON,
    brand VARCHAR(100),
    model_number VARCHAR(100),
    part_number VARCHAR(100),
    delivery_days INT,
    warranty_months INT DEFAULT 12,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_quote (quote_id),
    INDEX idx_request_item (request_item_id),
    INDEX idx_unit_price (unit_price),
    
    FOREIGN KEY (quote_id) REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (request_item_id) REFERENCES supplier_quote_request_items(id) ON DELETE CASCADE
);

-- Table 5: Price Comparison Analysis Results (Optional - for caching analysis)
CREATE TABLE IF NOT EXISTS price_comparison_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estimation_id INT NOT NULL,
    analysis_date DATE NOT NULL,
    total_estimated_cost DECIMAL(15,2) NOT NULL,
    total_best_quote_cost DECIMAL(15,2),
    total_potential_savings DECIMAL(15,2),
    average_savings_percent DECIMAL(5,2),
    items_with_quotes INT DEFAULT 0,
    total_items INT NOT NULL,
    quote_coverage_percent DECIMAL(5,2),
    best_supplier_id INT,
    analysis_data JSON,
    generated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_estimation (estimation_id),
    INDEX idx_analysis_date (analysis_date),
    UNIQUE KEY unique_estimation_date (estimation_id, analysis_date),
    
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE,
    FOREIGN KEY (best_supplier_id) REFERENCES inventory_vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create sequences/triggers for auto-generating request and quote numbers
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_supplier_quote_request_number
BEFORE INSERT ON supplier_quote_requests
FOR EACH ROW
BEGIN
    DECLARE next_sequence INT DEFAULT 1;
    DECLARE current_year CHAR(4) DEFAULT YEAR(CURDATE());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(request_number, '/', -1) AS UNSIGNED)), 0) + 1 
    INTO next_sequence
    FROM supplier_quote_requests 
    WHERE request_number LIKE CONCAT('RFQ/', current_year, '/%');
    
    SET NEW.request_number = CONCAT('RFQ/', current_year, '/', LPAD(next_sequence, 4, '0'));
END//

CREATE TRIGGER IF NOT EXISTS trg_supplier_quote_number
BEFORE INSERT ON supplier_quotes
FOR EACH ROW
BEGIN
    DECLARE next_sequence INT DEFAULT 1;
    DECLARE current_year CHAR(4) DEFAULT YEAR(CURDATE());
    
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(quote_number, '/', -1) AS UNSIGNED)), 0) + 1 
    INTO next_sequence
    FROM supplier_quotes 
    WHERE quote_number LIKE CONCAT('SQ/', current_year, '/%');
    
    SET NEW.quote_number = CONCAT('SQ/', current_year, '/', LPAD(next_sequence, 4, '0'));
END//

-- Trigger to update quote totals when items are added/updated
CREATE TRIGGER IF NOT EXISTS trg_update_quote_totals_insert
AFTER INSERT ON supplier_quote_items
FOR EACH ROW
BEGIN
    UPDATE supplier_quotes 
    SET 
        subtotal = (SELECT SUM(total_price) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        tax_amount = (SELECT SUM(tax_amount) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        total_amount = (SELECT SUM(final_price) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.quote_id;
END//

CREATE TRIGGER IF NOT EXISTS trg_update_quote_totals_update
AFTER UPDATE ON supplier_quote_items
FOR EACH ROW
BEGIN
    UPDATE supplier_quotes 
    SET 
        subtotal = (SELECT SUM(total_price) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        tax_amount = (SELECT SUM(tax_amount) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        total_amount = (SELECT SUM(final_price) FROM supplier_quote_items WHERE quote_id = NEW.quote_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.quote_id;
END//

CREATE TRIGGER IF NOT EXISTS trg_update_quote_totals_delete
AFTER DELETE ON supplier_quote_items
FOR EACH ROW
BEGIN
    UPDATE supplier_quotes 
    SET 
        subtotal = COALESCE((SELECT SUM(total_price) FROM supplier_quote_items WHERE quote_id = OLD.quote_id), 0),
        tax_amount = COALESCE((SELECT SUM(tax_amount) FROM supplier_quote_items WHERE quote_id = OLD.quote_id), 0),
        total_amount = COALESCE((SELECT SUM(final_price) FROM supplier_quote_items WHERE quote_id = OLD.quote_id), 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.quote_id;
END//

DELIMITER ;

-- Insert some sample data for testing
-- Note: This assumes estimations and estimation_items tables exist with some data
-- and inventory_vendors table exists (which we know it does)

-- Insert sample quote requests
INSERT IGNORE INTO supplier_quote_requests (estimation_id, supplier_id, requested_by, due_date, status, notes)
VALUES 
(1, 1, 1, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'sent', 'Please provide competitive pricing for automation equipment'),
(1, 2, 1, DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'sent', 'Quote requested for VFD and related components'),
(1, 3, 1, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'sent', 'Alternative supplier quote for industrial automation');

-- Insert sample quote request items (if estimation_items exist)
INSERT IGNORE INTO supplier_quote_request_items (request_id, estimation_item_id, item_name, quantity, unit, estimated_price)
SELECT 
    1, 1, 'Siemens PLC S7-1200', 2, 'NOS', 25000
WHERE EXISTS (SELECT 1 FROM estimation_items WHERE id = 1)
UNION ALL
SELECT 
    1, 2, 'ABB VFD 5.5kW', 1, 'NOS', 55000
WHERE EXISTS (SELECT 1 FROM estimation_items WHERE id = 2)
UNION ALL
SELECT 
    2, 2, 'ABB VFD 5.5kW', 1, 'NOS', 55000
WHERE EXISTS (SELECT 1 FROM estimation_items WHERE id = 2)
UNION ALL
SELECT 
    3, 1, 'Siemens PLC S7-1200', 2, 'NOS', 25000
WHERE EXISTS (SELECT 1 FROM estimation_items WHERE id = 1)
UNION ALL
SELECT 
    3, 2, 'ABB VFD 5.5kW', 1, 'NOS', 55000
WHERE EXISTS (SELECT 1 FROM estimation_items WHERE id = 2);

-- Insert sample supplier quotes
INSERT IGNORE INTO supplier_quotes (request_id, supplier_id, quote_date, valid_until, status, payment_terms, delivery_terms)
VALUES 
(1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'submitted', 'Net 30 days', '15-20 working days'),
(2, 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'submitted', 'Net 45 days', '10-15 working days'),
(3, 3, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'submitted', 'Net 30 days', '20-25 working days');

-- Insert sample quote items
INSERT IGNORE INTO supplier_quote_items (quote_id, request_item_id, item_name, quantity, unit, unit_price, total_price, final_price, brand, warranty_months)
SELECT 
    1, 1, 'Siemens PLC S7-1200', 2, 'NOS', 24000, 48000, 48000, 'Siemens', 24
WHERE EXISTS (SELECT 1 FROM supplier_quote_request_items WHERE id = 1)
UNION ALL
SELECT 
    1, 2, 'ABB VFD 5.5kW', 1, 'NOS', 54000, 54000, 54000, 'ABB', 18
WHERE EXISTS (SELECT 1 FROM supplier_quote_request_items WHERE id = 2)
UNION ALL
SELECT 
    2, 3, 'ABB VFD 5.5kW', 1, 'NOS', 53000, 53000, 53000, 'ABB', 18
WHERE EXISTS (SELECT 1 FROM supplier_quote_request_items WHERE id = 3)
UNION ALL
SELECT 
    3, 4, 'Siemens PLC S7-1200', 2, 'NOS', 26000, 52000, 52000, 'Siemens', 24
WHERE EXISTS (SELECT 1 FROM supplier_quote_request_items WHERE id = 4)
UNION ALL
SELECT 
    3, 5, 'ABB VFD 5.5kW', 1, 'NOS', 56000, 56000, 56000, 'ABB', 18
WHERE EXISTS (SELECT 1 FROM supplier_quote_request_items WHERE id = 5);