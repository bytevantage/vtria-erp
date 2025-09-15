-- ================================
-- VTRIA ERP: Proper Product Master & Inventory Architecture
-- Enterprise-grade separation of concerns
-- ================================

-- Drop existing tables to recreate with proper structure
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS stock;
DROP TABLE IF EXISTS products;

-- ================================
-- 1. PRODUCT MASTER DATA (Static/Reference)
-- ================================

-- Product Categories (Hierarchical)
CREATE TABLE product_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT,
    description TEXT,
    hsn_code VARCHAR(20),
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_hsn_code (hsn_code)
);

-- Units of Measurement
CREATE TABLE units_of_measurement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_name VARCHAR(50) NOT NULL UNIQUE, -- Kgs, Liters, Numbers, Meters, etc.
    unit_symbol VARCHAR(10) NOT NULL UNIQUE, -- kg, L, nos, m, etc.
    unit_type ENUM('weight', 'volume', 'length', 'area', 'count', 'time') NOT NULL,
    base_unit_conversion DECIMAL(10,4) DEFAULT 1.0000, -- For unit conversions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturers/Brands
CREATE TABLE manufacturers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code)
);

-- Product Master (Static Information Only)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic Product Information
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) NOT NULL UNIQUE, -- VTRIA's internal code
    manufacturer_part_code VARCHAR(100), -- Manufacturer's part number
    
    -- Classification
    category_id INT NOT NULL,
    subcategory_id INT,
    manufacturer_id INT,
    
    -- Physical Properties
    unit_id INT NOT NULL,
    weight DECIMAL(10,4),
    dimensions VARCHAR(100), -- L×W×H format
    
    -- Pricing Information
    mrp DECIMAL(12,2),
    last_purchase_price DECIMAL(12,2),
    last_purchase_date DATE,
    vendor_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Tax Information
    hsn_code VARCHAR(20),
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    
    -- Warranty Information (Template)
    has_warranty BOOLEAN DEFAULT FALSE,
    warranty_period_months INT DEFAULT 0,
    warranty_type ENUM('manufacturer', 'dealer', 'comprehensive', 'none') DEFAULT 'none',
    
    -- Additional Information
    description TEXT,
    specifications JSON, -- For flexible product specifications
    image_url VARCHAR(500),
    manual_url VARCHAR(500),
    
    -- Status and Tracking
    is_active BOOLEAN DEFAULT TRUE,
    is_serialized BOOLEAN DEFAULT FALSE, -- Whether this product requires serial number tracking
    min_stock_level INT DEFAULT 0,
    max_stock_level INT DEFAULT 0,
    reorder_point INT DEFAULT 0,
    
    -- Audit Fields
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES product_categories(id),
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
    FOREIGN KEY (unit_id) REFERENCES units_of_measurement(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_product_code (product_code),
    INDEX idx_manufacturer_part_code (manufacturer_part_code),
    INDEX idx_category (category_id),
    INDEX idx_hsn_code (hsn_code),
    INDEX idx_active (is_active),
    INDEX idx_serialized (is_serialized)
);

-- ================================
-- 2. INVENTORY/STOCK MANAGEMENT (Dynamic/Transactional)
-- ================================

-- Stock Summary per Location
CREATE TABLE inventory_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Quantity Information
    available_quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,4) NOT NULL DEFAULT 0, -- Reserved for orders
    damaged_quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
    total_quantity DECIMAL(10,4) GENERATED ALWAYS AS (available_quantity + reserved_quantity + damaged_quantity) STORED,
    
    -- Cost Information (Location-specific)
    average_cost DECIMAL(12,4) DEFAULT 0, -- Weighted average cost
    last_cost DECIMAL(12,4) DEFAULT 0, -- Last purchase cost at this location
    
    -- Stock Levels
    min_level DECIMAL(10,4) DEFAULT 0,
    max_level DECIMAL(10,4) DEFAULT 0,
    reorder_level DECIMAL(10,4) DEFAULT 0,
    
    -- Tracking
    last_movement_date TIMESTAMP,
    last_stocktake_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    
    UNIQUE KEY unique_product_location (product_id, location_id),
    INDEX idx_low_stock (product_id, location_id, available_quantity),
    INDEX idx_last_movement (last_movement_date)
);

-- Serial Number Tracking (For Serialized Products)
CREATE TABLE inventory_serial_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Serial Information
    serial_number VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    
    -- Warranty Information (Instance-specific)
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_status ENUM('active', 'expired', 'void') DEFAULT 'active',
    
    -- Status Tracking
    status ENUM('available', 'reserved', 'sold', 'damaged', 'returned', 'under_repair') DEFAULT 'available',
    condition_status ENUM('new', 'used', 'refurbished', 'damaged') DEFAULT 'new',
    
    -- Purchase Information
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    supplier_id INT,
    grn_id INT,
    
    -- Sales Information
    sale_date DATE,
    sales_order_id INT,
    customer_id INT,
    
    -- Service Information
    last_service_date DATE,
    next_service_due DATE,
    service_notes TEXT,
    
    -- Reference Information
    reference_type VARCHAR(50), -- 'purchase', 'sale', 'transfer', 'return'
    reference_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (customer_id) REFERENCES clients(id),
    
    UNIQUE KEY unique_serial_number (serial_number, product_id),
    INDEX idx_product_location (product_id, location_id),
    INDEX idx_status (status),
    INDEX idx_warranty (warranty_end_date, warranty_status),
    INDEX idx_reference (reference_type, reference_id)
);

-- Stock Movements (All Transactions)
CREATE TABLE inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic Information
    movement_date TIMESTAMP NOT NULL,
    movement_type ENUM('inward', 'outward', 'transfer', 'adjustment', 'damage', 'return') NOT NULL,
    
    -- Product and Location
    product_id INT NOT NULL,
    from_location_id INT, -- NULL for inward movements
    to_location_id INT,   -- NULL for outward movements
    
    -- Quantity and Cost
    quantity DECIMAL(10,4) NOT NULL,
    unit_cost DECIMAL(12,4),
    total_cost DECIMAL(15,4),
    
    -- Reference Information
    reference_type VARCHAR(50), -- 'purchase', 'sale', 'manufacturing', 'adjustment', 'transfer'
    reference_id INT,
    reference_number VARCHAR(100),
    
    -- Serial Number (for serialized items)
    serial_number VARCHAR(255),
    
    -- Additional Information
    reason VARCHAR(255),
    notes TEXT,
    
    -- User Information
    created_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_movement_date (movement_date),
    INDEX idx_product (product_id),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_locations (from_location_id, to_location_id)
);

-- ================================
-- 3. STOCK VALUATION & COSTING
-- ================================

-- Stock Valuation Methods
CREATE TABLE inventory_valuation_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL UNIQUE, -- 'FIFO', 'LIFO', 'Weighted Average', 'Standard Cost'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Product Costing (Per Location)
CREATE TABLE inventory_product_costing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    valuation_method_id INT NOT NULL,
    
    -- Costing Information
    standard_cost DECIMAL(12,4),
    average_cost DECIMAL(12,4),
    last_cost DECIMAL(12,4),
    fifo_cost DECIMAL(12,4),
    
    -- Calculation Date
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_from DATE,
    valid_to DATE,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (valuation_method_id) REFERENCES inventory_valuation_methods(id),
    
    INDEX idx_product_location_date (product_id, location_id, valid_from)
);

-- ================================
-- 4. TRIGGERS FOR STOCK UPDATES
-- ================================

DELIMITER //

-- Update stock when movement occurs
CREATE TRIGGER update_stock_on_movement 
    AFTER INSERT ON inventory_movements 
    FOR EACH ROW
BEGIN
    CASE NEW.movement_type
        WHEN 'inward' THEN
            INSERT INTO inventory_stock (product_id, location_id, available_quantity, last_movement_date)
            VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity, NEW.movement_date)
            ON DUPLICATE KEY UPDATE 
                available_quantity = available_quantity + NEW.quantity,
                last_movement_date = NEW.movement_date;
                
        WHEN 'outward' THEN
            UPDATE inventory_stock 
            SET available_quantity = available_quantity - NEW.quantity,
                last_movement_date = NEW.movement_date
            WHERE product_id = NEW.product_id AND location_id = NEW.from_location_id;
            
        WHEN 'transfer' THEN
            -- Decrease from source
            UPDATE inventory_stock 
            SET available_quantity = available_quantity - NEW.quantity,
                last_movement_date = NEW.movement_date
            WHERE product_id = NEW.product_id AND location_id = NEW.from_location_id;
            
            -- Increase to destination
            INSERT INTO inventory_stock (product_id, location_id, available_quantity, last_movement_date)
            VALUES (NEW.product_id, NEW.to_location_id, NEW.quantity, NEW.movement_date)
            ON DUPLICATE KEY UPDATE 
                available_quantity = available_quantity + NEW.quantity,
                last_movement_date = NEW.movement_date;
                
        WHEN 'adjustment' THEN
            UPDATE inventory_stock 
            SET available_quantity = available_quantity + NEW.quantity,
                last_movement_date = NEW.movement_date
            WHERE product_id = NEW.product_id AND location_id = NEW.to_location_id;
    END CASE;
END//

DELIMITER ;

-- ================================
-- 5. INITIAL DATA
-- ================================

-- Insert basic units
INSERT INTO units_of_measurement (unit_name, unit_symbol, unit_type) VALUES
('Numbers', 'nos', 'count'),
('Kilograms', 'kg', 'weight'),
('Grams', 'g', 'weight'),
('Liters', 'L', 'volume'),
('Meters', 'm', 'length'),
('Millimeters', 'mm', 'length'),
('Square Meters', 'sqm', 'area'),
('Pieces', 'pcs', 'count'),
('Sets', 'set', 'count'),
('Pairs', 'pair', 'count');

-- Insert valuation methods
INSERT INTO inventory_valuation_methods (method_name, description) VALUES
('Weighted Average', 'Weighted average cost method'),
('FIFO', 'First In, First Out method'),
('Standard Cost', 'Predetermined standard cost method');

-- Insert basic categories
INSERT INTO product_categories (name, description, hsn_code, gst_rate) VALUES
('Electrical Components', 'Electrical and electronic components', '8536', 18.00),
('Mechanical Components', 'Mechanical parts and assemblies', '8481', 18.00),
('Control Panels', 'Electrical control panels and enclosures', '8537', 18.00),
('Motors', 'Electric motors and drives', '8501', 18.00),
('Cables and Wires', 'Electrical cables and wiring', '8544', 18.00),
('Instruments', 'Measuring and control instruments', '9026', 18.00),
('HVAC Components', 'Heating, ventilation, and air conditioning', '8415', 18.00),
('Refrigeration', 'Refrigeration equipment and parts', '8418', 18.00);

-- Insert sample manufacturers
INSERT INTO manufacturers (name, code, description) VALUES
('Schneider Electric', 'SE', 'Global specialist in energy management'),
('ABB', 'ABB', 'Technology leader in electrification and automation'),
('Siemens', 'SIE', 'Global technology company focusing on industry'),
('Allen-Bradley', 'AB', 'Rockwell Automation brand for industrial automation'),
('Phoenix Contact', 'PC', 'German company for electrical connection technology'),
('Rittal', 'RIT', 'Global provider of enclosures and climate control'),
('General', 'GEN', 'General/Generic manufacturer for common items');

-- ================================
-- 6. VIEWS FOR COMMON QUERIES
-- ================================

-- Stock Summary View
CREATE VIEW v_stock_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.product_code,
    pc.name as category_name,
    m.name as manufacturer_name,
    l.name as location_name,
    ist.available_quantity,
    ist.reserved_quantity,
    ist.damaged_quantity,
    ist.total_quantity,
    ist.average_cost,
    (ist.available_quantity * ist.average_cost) as stock_value,
    uom.unit_symbol,
    p.min_stock_level,
    p.reorder_point,
    CASE 
        WHEN ist.available_quantity <= p.reorder_point THEN 'REORDER'
        WHEN ist.available_quantity <= p.min_stock_level THEN 'LOW_STOCK'
        ELSE 'OK'
    END as stock_status
FROM products p
LEFT JOIN inventory_stock ist ON p.id = ist.product_id
LEFT JOIN locations l ON ist.location_id = l.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN units_of_measurement uom ON p.unit_id = uom.id
WHERE p.is_active = TRUE;

-- Product Master View
CREATE VIEW v_product_master AS
SELECT 
    p.id,
    p.name,
    p.product_code,
    p.manufacturer_part_code,
    pc.name as category_name,
    sc.name as subcategory_name,
    m.name as manufacturer_name,
    uom.unit_name,
    uom.unit_symbol,
    p.mrp,
    p.last_purchase_price,
    p.vendor_discount_percentage,
    p.hsn_code,
    p.gst_rate,
    p.has_warranty,
    p.warranty_period_months,
    p.warranty_type,
    p.is_serialized,
    p.specifications,
    p.is_active
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_categories sc ON p.subcategory_id = sc.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN units_of_measurement uom ON p.unit_id = uom.id;