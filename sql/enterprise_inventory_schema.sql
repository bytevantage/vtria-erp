-- =============================================
-- VTRIA ERP - Enterprise Industrial Automation Inventory System
-- Comprehensive inventory management for industrial automation products
-- =============================================

-- Enhanced inventory categories for industrial automation
CREATE TABLE IF NOT EXISTS inventory_main_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_serial_tracking BOOLEAN DEFAULT FALSE,
    requires_calibration BOOLEAN DEFAULT FALSE,
    default_warranty_months INT DEFAULT 12,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sub-categories for detailed classification
CREATE TABLE IF NOT EXISTS inventory_sub_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    main_category_id INT NOT NULL,
    subcategory_code VARCHAR(20) NOT NULL,
    subcategory_name VARCHAR(100) NOT NULL,
    description TEXT,
    technical_specifications JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (main_category_id) REFERENCES inventory_main_categories(id),
    UNIQUE KEY unique_subcategory (main_category_id, subcategory_code)
);

-- Enhanced inventory items with industrial automation specifics
CREATE TABLE IF NOT EXISTS inventory_items_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    main_category_id INT NOT NULL,
    sub_category_id INT,
    brand VARCHAR(100),
    model_number VARCHAR(100),
    part_number VARCHAR(100),
    manufacturer VARCHAR(100),
    
    -- Technical specifications
    specifications JSON, -- Stores technical specs like voltage, current, power, etc.
    datasheet_url VARCHAR(500),
    manual_url VARCHAR(500),
    
    -- Inventory tracking
    requires_serial_tracking BOOLEAN DEFAULT FALSE,
    requires_batch_tracking BOOLEAN DEFAULT FALSE,
    shelf_life_days INT,
    
    -- Stock information
    current_stock DECIMAL(15,3) DEFAULT 0.000,
    reserved_stock DECIMAL(15,3) DEFAULT 0.000,
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    minimum_stock DECIMAL(15,3) DEFAULT 0.000,
    maximum_stock DECIMAL(15,3),
    reorder_point DECIMAL(15,3) DEFAULT 0.000,
    reorder_quantity DECIMAL(15,3) DEFAULT 0.000,
    
    -- Pricing
    standard_cost DECIMAL(12,2) DEFAULT 0.00,
    average_cost DECIMAL(12,2) DEFAULT 0.00,
    last_purchase_cost DECIMAL(12,2) DEFAULT 0.00,
    selling_price DECIMAL(12,2) DEFAULT 0.00,
    
    -- Units
    primary_unit VARCHAR(20) DEFAULT 'NOS',
    secondary_unit VARCHAR(20),
    conversion_factor DECIMAL(10,4) DEFAULT 1.0000,
    
    -- Status and tracking
    item_status ENUM('active', 'inactive', 'discontinued', 'obsolete') DEFAULT 'active',
    location_code VARCHAR(50),
    bin_location VARCHAR(50),
    
    -- Audit fields
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (main_category_id) REFERENCES inventory_main_categories(id),
    FOREIGN KEY (sub_category_id) REFERENCES inventory_sub_categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_item_code (item_code),
    INDEX idx_category (main_category_id, sub_category_id),
    INDEX idx_brand_model (brand, model_number),
    INDEX idx_stock_levels (current_stock, minimum_stock),
    INDEX idx_status (item_status)
);

-- Serial number tracking for high-value items
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    batch_number VARCHAR(50),
    manufacturing_date DATE,
    expiry_date DATE,
    purchase_date DATE,
    purchase_cost DECIMAL(12,2),
    vendor_id INT,
    grn_id INT,
    
    -- Current status and location
    status ENUM('in_stock', 'reserved', 'issued', 'in_service', 'under_repair', 'scrapped') DEFAULT 'in_stock',
    current_location VARCHAR(100),
    assigned_to VARCHAR(100),
    issue_date DATE,
    return_date DATE,
    
    -- Warranty and service
    warranty_start_date DATE,
    warranty_end_date DATE,
    last_service_date DATE,
    next_service_date DATE,
    calibration_due_date DATE,
    
    -- Notes and references
    notes TEXT,
    purchase_order_id INT,
    sales_order_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items_enhanced(id),
    UNIQUE KEY unique_serial_item (item_id, serial_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status),
    INDEX idx_warranty (warranty_end_date),
    INDEX idx_service (next_service_date)
);

-- Purchase price history for tracking different purchase costs
CREATE TABLE IF NOT EXISTS inventory_purchase_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    vendor_id INT,
    purchase_order_id INT,
    grn_id INT,
    
    purchase_date DATE NOT NULL,
    quantity_purchased DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_percentage DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    total_cost DECIMAL(12,2) NOT NULL,
    
    -- Additional details
    batch_number VARCHAR(50),
    expiry_date DATE,
    delivery_date DATE,
    quality_status ENUM('accepted', 'rejected', 'partially_accepted', 'pending') DEFAULT 'pending',
    
    currency VARCHAR(3) DEFAULT 'INR',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items_enhanced(id),
    INDEX idx_item_date (item_id, purchase_date),
    INDEX idx_vendor (vendor_id),
    INDEX idx_unit_cost (unit_cost)
);

-- Enhanced inventory transactions
CREATE TABLE IF NOT EXISTS inventory_transactions_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    transaction_type ENUM('receipt', 'issue', 'transfer', 'adjustment', 'return', 'scrap') NOT NULL,
    reference_type ENUM('purchase_order', 'sales_order', 'production_order', 'transfer_order', 'adjustment', 'grn', 'return') NOT NULL,
    reference_id INT,
    reference_number VARCHAR(100),
    
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(12,2),
    total_value DECIMAL(15,2),
    
    -- Location details
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    from_bin VARCHAR(50),
    to_bin VARCHAR(50),
    
    -- Serial/Batch tracking
    serial_numbers JSON, -- Array of serial numbers for this transaction
    batch_number VARCHAR(50),
    
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    approved_by INT,
    
    notes TEXT,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items_enhanced(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_item_type (item_id, transaction_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_date (transaction_date)
);

-- Vendor-specific item details
CREATE TABLE IF NOT EXISTS inventory_vendor_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    vendor_id INT NOT NULL,
    vendor_item_code VARCHAR(100),
    vendor_item_name VARCHAR(255),
    vendor_part_number VARCHAR(100),
    
    -- Pricing
    last_purchase_price DECIMAL(12,2),
    quoted_price DECIMAL(12,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Lead time and availability
    lead_time_days INT DEFAULT 0,
    minimum_order_quantity DECIMAL(15,3) DEFAULT 1,
    
    -- Quality and ratings
    quality_rating DECIMAL(3,2) DEFAULT 5.00, -- Out of 5
    delivery_rating DECIMAL(3,2) DEFAULT 5.00,
    price_rating DECIMAL(3,2) DEFAULT 5.00,
    
    -- Status
    is_preferred_vendor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    last_purchase_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items_enhanced(id),
    UNIQUE KEY unique_vendor_item (item_id, vendor_id),
    INDEX idx_vendor_code (vendor_id, vendor_item_code)
);

-- Substitute items mapping
CREATE TABLE IF NOT EXISTS inventory_substitute_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    primary_item_id INT NOT NULL,
    substitute_item_id INT NOT NULL,
    substitution_ratio DECIMAL(8,4) DEFAULT 1.0000,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (primary_item_id) REFERENCES inventory_items_enhanced(id),
    FOREIGN KEY (substitute_item_id) REFERENCES inventory_items_enhanced(id),
    UNIQUE KEY unique_substitution (primary_item_id, substitute_item_id)
);

-- Insert industrial automation categories
INSERT IGNORE INTO inventory_main_categories (category_code, category_name, description, requires_serial_tracking, requires_calibration, default_warranty_months) VALUES
('CTRL', 'Control Systems', 'PLCs, Control Panels, and Controllers', TRUE, FALSE, 24),
('DRIVE', 'Motor Drives', 'VFDs, Servo Drives, and Motor Controllers', TRUE, TRUE, 18),
('SENSOR', 'Sensors & Instrumentation', 'Proximity, Pressure, Temperature Sensors', FALSE, TRUE, 12),
('HMI', 'Human Machine Interface', 'Touch Panels, Displays, and Operator Interfaces', TRUE, FALSE, 24),
('POWER', 'Power Distribution', 'MCBs, Contactors, Relays, Power Supplies', FALSE, FALSE, 12),
('CABLE', 'Cables & Wiring', 'Control Cables, Power Cables, Communication Cables', FALSE, FALSE, 6),
('PNEUM', 'Pneumatic Components', 'Valves, Cylinders, Air Preparation Units', FALSE, FALSE, 12),
('SAFETY', 'Safety Systems', 'Emergency Stops, Safety Relays, Light Curtains', TRUE, TRUE, 36),
('COMM', 'Communication', 'Ethernet Switches, Serial Converters, Gateways', TRUE, FALSE, 24),
('ENCL', 'Enclosures & Hardware', 'Panels, DIN Rails, Terminal Blocks', FALSE, FALSE, 12);

-- Insert sub-categories for Control Systems
INSERT IGNORE INTO inventory_sub_categories (main_category_id, subcategory_code, subcategory_name, description) VALUES
(1, 'PLC', 'Programmable Logic Controllers', 'Compact and Modular PLCs'),
(1, 'RTU', 'Remote Terminal Units', 'SCADA RTUs and Data Loggers'),
(1, 'PANEL', 'Control Panels', 'Pre-assembled Control Panels'),
(1, 'CPU', 'CPU Modules', 'PLC CPU and Processing Units'),
(1, 'IO', 'I/O Modules', 'Digital and Analog I/O Modules');

-- Insert sub-categories for Motor Drives
INSERT IGNORE INTO inventory_sub_categories (main_category_id, subcategory_code, subcategory_name, description) VALUES
(2, 'VFD', 'Variable Frequency Drives', 'AC Motor Speed Controllers'),
(2, 'SERVO', 'Servo Drives', 'Precision Motion Control Drives'),
(2, 'SOFT', 'Soft Starters', 'Motor Soft Starting Systems'),
(2, 'DC', 'DC Drives', 'DC Motor Controllers'),
(2, 'BRAKE', 'Dynamic Braking', 'Braking Resistors and Choppers');

-- Insert sub-categories for Sensors
INSERT IGNORE INTO inventory_sub_categories (main_category_id, subcategory_code, subcategory_name, description) VALUES
(3, 'PROX', 'Proximity Sensors', 'Inductive, Capacitive, Photoelectric'),
(3, 'PRESS', 'Pressure Sensors', 'Pressure Transmitters and Switches'),
(3, 'TEMP', 'Temperature Sensors', 'RTD, Thermocouple, Temperature Transmitters'),
(3, 'FLOW', 'Flow Sensors', 'Flow Meters and Flow Switches'),
(3, 'LEVEL', 'Level Sensors', 'Level Transmitters and Switches');

-- Insert sample items
INSERT IGNORE INTO inventory_items_enhanced (
    item_code, item_name, description, main_category_id, sub_category_id,
    brand, model_number, part_number, manufacturer,
    specifications, requires_serial_tracking, minimum_stock, reorder_point,
    standard_cost, selling_price, primary_unit
) VALUES
('PLC001', 'Siemens S7-1200 CPU 1214C', 'Compact PLC with 14 DI/10 DO', 1, 1,
 'Siemens', 'CPU 1214C', '6ES7214-1AG40-0XB0', 'Siemens AG',
 '{"voltage": "24VDC", "inputs": 14, "outputs": 10, "memory": "100KB", "communication": "PROFINET"}',
 TRUE, 5, 10, 25000.00, 30000.00, 'NOS'),

('VFD001', 'ABB ACS580 5.5kW VFD', '5.5kW Variable Frequency Drive', 2, 1,
 'ABB', 'ACS580-01-012A-4', 'ACS580-01-012A-4', 'ABB Ltd',
 '{"power": "5.5kW", "voltage": "415V", "current": "12A", "frequency": "0-100Hz", "protection": "IP21"}',
 TRUE, 3, 5, 35000.00, 42000.00, 'NOS'),

('PROX001', 'Omron Proximity Sensor M18', 'M18 Inductive Proximity Sensor DC 3-wire', 3, 1,
 'Omron', 'E2E-X10ME1', 'E2E-X10ME1', 'Omron Corporation',
 '{"sensing_distance": "10mm", "voltage": "12-24VDC", "current": "200mA", "connection": "M12 connector"}',
 FALSE, 20, 30, 1500.00, 1800.00, 'NOS'),

('HMI001', 'Schneider HMI 7 inch', '7 inch Color Touch Panel HMI', 4, NULL,
 'Schneider', 'HMIGTO2310', 'HMIGTO2310', 'Schneider Electric',
 '{"screen_size": "7 inch", "resolution": "800x480", "communication": "Ethernet, RS485", "memory": "128MB"}',
 TRUE, 2, 3, 28000.00, 33600.00, 'NOS'),

('MCB001', 'L&T 32A MCB', '32A C-Curve MCB 415V', 5, NULL,
 'L&T', 'BH163032', 'BH163032', 'L&T Electrical & Automation',
 '{"current": "32A", "voltage": "415V", "curve": "C", "breaking_capacity": "10kA", "poles": 3}',
 FALSE, 50, 75, 850.00, 1020.00, 'NOS'),

('CABLE001', 'Polycab Control Cable 12C', '12 Core Control Cable 1.5sqmm', 6, NULL,
 'Polycab', '12Cx1.5SQMM', '12Cx1.5SQMM', 'Polycab Wires Pvt Ltd',
 '{"cores": 12, "cross_section": "1.5sqmm", "voltage": "1100V", "insulation": "PVC", "sheath": "PVC"}',
 FALSE, 500, 1000, 45.00, 54.00, 'MTR');

-- Create indexes for better performance
CREATE INDEX idx_items_category_brand ON inventory_items_enhanced(main_category_id, brand);
CREATE INDEX idx_items_model ON inventory_items_enhanced(model_number);
CREATE INDEX idx_items_part_number ON inventory_items_enhanced(part_number);
CREATE INDEX idx_serial_warranty ON inventory_serial_numbers(warranty_end_date);
CREATE INDEX idx_purchase_history_date ON inventory_purchase_history(purchase_date DESC);