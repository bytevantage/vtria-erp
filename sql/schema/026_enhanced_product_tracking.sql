-- Enhanced Product Tracking Schema for VTRIA ERP
-- File: 026_enhanced_product_tracking.sql
-- This schema enhances the product table for complete tracking as per requirements

-- Drop and recreate products table with enhanced fields
DROP TABLE IF EXISTS product_stock_movements;
DROP TABLE IF EXISTS product_warranty_tracking;  
DROP TABLE IF EXISTS products;

-- Enhanced Products table for complete tracking
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    make VARCHAR(255) NULL,
    model VARCHAR(255) NULL,
    part_code VARCHAR(255) NULL UNIQUE,
    category_id INT NULL,
    sub_category_id INT NULL,
    unit ENUM('kgs', 'liters', 'numbers', 'meters', 'pieces', 'sets') DEFAULT 'numbers',
    mrp DECIMAL(12,4) NULL,
    vendor_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    hsn_code VARCHAR(20) NULL,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    last_purchase_price DECIMAL(12,4) NULL,
    last_price_revision_date DATE NULL,
    warranty_period INT NULL COMMENT 'Warranty period in months',
    warranty_type ENUM('months', 'years') DEFAULT 'months',
    is_serialized BOOLEAN DEFAULT FALSE COMMENT 'True if product has serial numbers',
    minimum_stock_level INT DEFAULT 0,
    maximum_stock_level INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500) NULL,
    description TEXT NULL,
    specifications TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (sub_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_products_part_code (part_code),
    INDEX idx_products_category (category_id, sub_category_id),
    INDEX idx_products_active (is_active),
    INDEX idx_products_serialized (is_serialized),
    INDEX idx_products_name (name)
) COMMENT='Enhanced products table with serial number and warranty tracking';

-- Product Serial Numbers tracking table
CREATE TABLE product_serial_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    serial_number VARCHAR(255) NOT NULL,
    purchase_date DATE NULL,
    warranty_start_date DATE NULL,
    warranty_end_date DATE NULL,
    supplier_id INT NULL,
    purchase_price DECIMAL(12,4) NULL,
    current_location_id INT NULL,
    status ENUM('in_stock', 'allocated', 'dispatched', 'returned', 'defective') DEFAULT 'in_stock',
    allocated_to_case_id INT NULL,
    allocated_date DATE NULL,
    dispatch_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (current_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (allocated_to_case_id) REFERENCES cases(id) ON DELETE SET NULL,
    
    -- Unique constraint on serial number per product
    UNIQUE KEY unique_serial_per_product (product_id, serial_number),
    
    -- Indexes
    INDEX idx_serial_product (product_id, status),
    INDEX idx_serial_location (current_location_id, status),
    INDEX idx_serial_case_allocation (allocated_to_case_id),
    INDEX idx_serial_warranty (warranty_end_date, status)
) COMMENT='Serial number tracking for products with warranty management';

-- Enhanced stock table with better tracking
DROP TABLE IF EXISTS stock;
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    quantity_allocated INT NOT NULL DEFAULT 0,
    quantity_in_transit INT NOT NULL DEFAULT 0,
    last_movement_date TIMESTAMP NULL,
    minimum_level INT DEFAULT 0,
    maximum_level INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Unique constraint - one record per product per location
    UNIQUE KEY unique_product_location (product_id, location_id),
    
    -- Indexes
    INDEX idx_stock_location (location_id),
    INDEX idx_stock_low_stock (product_id, quantity_available, reorder_level)
) COMMENT='Enhanced stock tracking with allocation management';

-- Product price history for tracking vendor prices
CREATE TABLE product_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NULL,
    purchase_price DECIMAL(12,4) NOT NULL,
    vendor_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    effective_date DATE NOT NULL,
    quantity_ordered INT NULL,
    purchase_order_id INT NULL,
    is_current_price BOOLEAN DEFAULT FALSE,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_price_history_product (product_id, effective_date DESC),
    INDEX idx_price_history_supplier (supplier_id, effective_date DESC),
    INDEX idx_price_history_current (is_current_price, effective_date DESC)
) COMMENT='Product purchase price history from different vendors';

-- View for current product stock levels across all locations
CREATE VIEW v_product_stock_summary AS
SELECT 
    p.id as product_id,
    p.name,
    p.part_code,
    p.make,
    p.model,
    p.unit,
    SUM(s.quantity_available) as total_available,
    SUM(s.quantity_allocated) as total_allocated,
    SUM(s.quantity_in_transit) as total_in_transit,
    MIN(s.quantity_available) as min_location_stock,
    p.minimum_stock_level,
    p.reorder_level,
    CASE 
        WHEN SUM(s.quantity_available) <= p.reorder_level THEN 'REORDER'
        WHEN SUM(s.quantity_available) <= p.minimum_stock_level THEN 'LOW_STOCK'
        ELSE 'NORMAL'
    END as stock_status,
    COUNT(DISTINCT s.location_id) as locations_count
FROM products p
LEFT JOIN stock s ON p.id = s.product_id
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.part_code, p.make, p.model, p.unit, p.minimum_stock_level, p.reorder_level;

-- View for product pricing information
CREATE VIEW v_product_pricing AS
SELECT 
    p.id as product_id,
    p.name,
    p.part_code,
    p.mrp,
    p.last_purchase_price,
    p.last_price_revision_date,
    p.vendor_discount_percentage,
    (p.last_purchase_price * (1 - p.vendor_discount_percentage/100)) as effective_purchase_price,
    -- Latest price from any supplier
    (SELECT ph.purchase_price 
     FROM product_price_history ph 
     WHERE ph.product_id = p.id 
     ORDER BY ph.effective_date DESC LIMIT 1) as latest_supplier_price,
    -- Best price from any supplier in last 90 days
    (SELECT MIN(ph.purchase_price) 
     FROM product_price_history ph 
     WHERE ph.product_id = p.id 
     AND ph.effective_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as best_recent_price,
    -- Average price in last 90 days
    (SELECT AVG(ph.purchase_price) 
     FROM product_price_history ph 
     WHERE ph.product_id = p.id 
     AND ph.effective_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) as avg_recent_price
FROM products p
WHERE p.is_active = TRUE;

-- Function to get best available price for estimation
DELIMITER //
CREATE FUNCTION GetBestProductPrice(p_product_id INT, p_quantity INT)
RETURNS DECIMAL(12,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE best_price DECIMAL(12,4) DEFAULT 0.00;
    DECLARE current_price DECIMAL(12,4) DEFAULT 0.00;
    DECLARE recent_best_price DECIMAL(12,4) DEFAULT 0.00;
    
    -- Get current product price
    SELECT last_purchase_price INTO current_price
    FROM products 
    WHERE id = p_product_id AND is_active = TRUE;
    
    -- Get best price from recent history (last 90 days)
    SELECT MIN(purchase_price) INTO recent_best_price
    FROM product_price_history 
    WHERE product_id = p_product_id 
    AND effective_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY);
    
    -- Return the better of current price or recent best price
    SET best_price = COALESCE(
        CASE 
            WHEN recent_best_price IS NOT NULL AND recent_best_price < current_price THEN recent_best_price
            ELSE current_price
        END,
        current_price,
        0.00
    );
    
    RETURN best_price;
END//
DELIMITER ;

-- Trigger to update last_price_revision_date when purchase price changes
DELIMITER //
CREATE TRIGGER tr_product_price_update
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
    IF OLD.last_purchase_price != NEW.last_purchase_price THEN
        UPDATE products 
        SET last_price_revision_date = CURDATE()
        WHERE id = NEW.id;
        
        -- Insert into price history
        INSERT INTO product_price_history (
            product_id, 
            purchase_price, 
            vendor_discount_percentage,
            effective_date,
            is_current_price,
            notes
        ) VALUES (
            NEW.id,
            NEW.last_purchase_price,
            NEW.vendor_discount_percentage,
            CURDATE(),
            TRUE,
            'Price updated in products table'
        );
    END IF;
END//
DELIMITER ;

-- Enhanced user roles as per requirements
ALTER TABLE users MODIFY COLUMN user_role ENUM(
    'director', 
    'admin', 
    'sales-admin', 
    'designer', 
    'accounts', 
    'technician',
    'production-manager',
    'store-keeper'
) NOT NULL;

-- Add document prefixes for case management
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('C', '2526', 0),    -- Cases
('PR', '2526', 0),   -- Purchase Requisitions  
('PI', '2526', 0),   -- Proforma Invoices
('BOM', '2526', 0);  -- Bill of Materials

COMMENT ON TABLE products IS 'Enhanced products table with serial tracking and warranty management';
COMMENT ON TABLE product_serial_numbers IS 'Individual serial number tracking with warranty dates';
COMMENT ON TABLE product_price_history IS 'Historical pricing from different vendors for better estimation';
COMMENT ON VIEW v_product_stock_summary IS 'Current stock levels across all locations with alerts';
COMMENT ON VIEW v_product_pricing IS 'Comprehensive pricing information for products';