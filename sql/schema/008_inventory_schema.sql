-- VTRIA ERP - Inventory Management Schema
-- Date: 2025-09-09

-- Categories for inventory items
CREATE TABLE IF NOT EXISTS inventory_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES inventory_categories(id)
);

-- Units of measurement
CREATE TABLE IF NOT EXISTS inventory_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    unit_code VARCHAR(10) UNIQUE NOT NULL,
    unit_name VARCHAR(50) NOT NULL,
    unit_type ENUM('weight', 'length', 'volume', 'quantity', 'area', 'time') NOT NULL,
    base_unit_conversion DECIMAL(15,6) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main inventory items/products
CREATE TABLE IF NOT EXISTS inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    unit_id INT,
    item_type ENUM('raw_material', 'component', 'finished_product', 'consumable', 'tool') NOT NULL,
    
    -- Stock information
    current_stock DECIMAL(15,3) DEFAULT 0.000,
    reserved_stock DECIMAL(15,3) DEFAULT 0.000,
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    
    -- Reorder management
    minimum_stock DECIMAL(15,3) DEFAULT 0.000,
    maximum_stock DECIMAL(15,3),
    reorder_point DECIMAL(15,3) DEFAULT 0.000,
    reorder_quantity DECIMAL(15,3) DEFAULT 0.000,
    
    -- Costing
    standard_cost DECIMAL(12,2) DEFAULT 0.00,
    average_cost DECIMAL(12,2) DEFAULT 0.00,
    last_purchase_cost DECIMAL(12,2) DEFAULT 0.00,
    
    -- Physical properties
    weight_per_unit DECIMAL(10,3),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2),
    dimensions_height DECIMAL(10,2),
    
    -- Tracking settings
    track_serial_numbers BOOLEAN DEFAULT FALSE,
    track_batch_numbers BOOLEAN DEFAULT FALSE,
    track_expiry_dates BOOLEAN DEFAULT FALSE,
    
    -- Storage information
    storage_location VARCHAR(100),
    storage_conditions TEXT,
    shelf_life_days INT,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_discontinued BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES inventory_categories(id),
    FOREIGN KEY (unit_id) REFERENCES inventory_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_item_code (item_code),
    INDEX idx_item_type (item_type),
    INDEX idx_category (category_id),
    INDEX idx_reorder (reorder_point, current_stock)
);

-- Stock movements/transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE NOT NULL,
    item_id INT NOT NULL,
    transaction_type ENUM(
        'purchase_receipt', 'sales_issue', 'production_issue', 'production_receipt',
        'stock_transfer', 'stock_adjustment', 'return_receipt', 'return_issue',
        'opening_stock', 'physical_count'
    ) NOT NULL,
    
    -- Reference information
    reference_type ENUM('purchase_order', 'sales_order', 'work_order', 'stock_transfer', 'adjustment', 'manual') NOT NULL,
    reference_id INT,
    reference_number VARCHAR(100),
    
    -- Transaction details
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(12,2) DEFAULT 0.00,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    
    -- Stock levels before/after
    stock_before DECIMAL(15,3) NOT NULL,
    stock_after DECIMAL(15,3) NOT NULL,
    
    -- Batch/Serial tracking
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    expiry_date DATE,
    
    -- Location and user information
    from_location VARCHAR(100),
    to_location VARCHAR(100),
    warehouse_location VARCHAR(100),
    
    -- Approval and tracking
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    -- Metadata
    remarks TEXT,
    created_by INT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_transaction_code (transaction_code),
    INDEX idx_item_date (item_id, transaction_date),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_batch_serial (batch_number, serial_number)
);

-- Warehouses/Storage locations
CREATE TABLE IF NOT EXISTS inventory_warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_code VARCHAR(20) UNIQUE NOT NULL,
    warehouse_name VARCHAR(100) NOT NULL,
    address TEXT,
    manager_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Stock levels by warehouse
CREATE TABLE IF NOT EXISTS inventory_warehouse_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    current_stock DECIMAL(15,3) DEFAULT 0.000,
    reserved_stock DECIMAL(15,3) DEFAULT 0.000,
    available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    last_counted_date DATE,
    last_counted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (warehouse_id) REFERENCES inventory_warehouses(id),
    FOREIGN KEY (last_counted_by) REFERENCES users(id),
    
    UNIQUE KEY unique_item_warehouse (item_id, warehouse_id),
    INDEX idx_item_warehouse (item_id, warehouse_id)
);

-- Vendors/Suppliers
CREATE TABLE IF NOT EXISTS inventory_vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_code VARCHAR(20) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    rating ENUM('A', 'B', 'C', 'D') DEFAULT 'B',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Item-Vendor relationships (which vendors supply which items)
CREATE TABLE IF NOT EXISTS inventory_item_vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    vendor_id INT NOT NULL,
    vendor_item_code VARCHAR(100),
    vendor_item_name VARCHAR(200),
    lead_time_days INT DEFAULT 0,
    minimum_order_quantity DECIMAL(15,3) DEFAULT 0.000,
    unit_cost DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'INR',
    is_preferred BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (vendor_id) REFERENCES inventory_vendors(id),
    
    UNIQUE KEY unique_item_vendor (item_id, vendor_id),
    INDEX idx_vendor_items (vendor_id, is_active),
    INDEX idx_preferred_vendor (item_id, is_preferred)
);

-- Insert default categories
INSERT INTO inventory_categories (category_code, category_name, description) VALUES
('RAW', 'Raw Materials', 'Basic materials used in manufacturing'),
('COMP', 'Components', 'Manufactured or purchased components'),
('ELEC', 'Electronics', 'Electronic components and devices'),
('MECH', 'Mechanical', 'Mechanical parts and assemblies'),
('TOOL', 'Tools & Equipment', 'Manufacturing tools and equipment'),
('CONS', 'Consumables', 'Consumable items like welding rods, lubricants'),
('PACK', 'Packaging', 'Packaging materials'),
('FINI', 'Finished Products', 'Completed products ready for sale');

-- Insert default units
INSERT INTO inventory_units (unit_code, unit_name, unit_type) VALUES
('PCS', 'Pieces', 'quantity'),
('KG', 'Kilograms', 'weight'),
('LTR', 'Liters', 'volume'),
('MTR', 'Meters', 'length'),
('SQM', 'Square Meters', 'area'),
('SET', 'Set', 'quantity'),
('BOX', 'Box', 'quantity'),
('ROLL', 'Roll', 'quantity'),
('SHEET', 'Sheet', 'quantity'),
('PAIR', 'Pair', 'quantity');

-- Insert default warehouse
INSERT INTO inventory_warehouses (warehouse_code, warehouse_name, address, manager_name) VALUES
('WH001', 'Main Warehouse', 'VTRIA Industrial Complex, Bangalore', 'Warehouse Manager');

-- Create views for easy reporting
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
    i.id,
    i.item_code,
    i.item_name,
    i.item_type,
    c.category_name,
    u.unit_name,
    i.current_stock,
    i.reserved_stock,
    i.available_stock,
    i.minimum_stock,
    i.reorder_point,
    CASE 
        WHEN i.current_stock <= i.reorder_point THEN 'Reorder Required'
        WHEN i.current_stock <= i.minimum_stock THEN 'Low Stock'
        ELSE 'Normal'
    END as stock_status,
    i.standard_cost,
    i.average_cost,
    (i.current_stock * i.average_cost) as stock_value,
    i.is_active
FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN inventory_units u ON i.unit_id = u.id;

CREATE OR REPLACE VIEW v_reorder_report AS
SELECT 
    i.id,
    i.item_code,
    i.item_name,
    c.category_name,
    i.current_stock,
    i.reorder_point,
    i.reorder_quantity,
    (i.reorder_point - i.current_stock) as shortage_quantity,
    v.vendor_name as preferred_vendor,
    iv.lead_time_days,
    iv.unit_cost as vendor_cost
FROM inventory_items i
LEFT JOIN inventory_categories c ON i.category_id = c.id
LEFT JOIN inventory_item_vendors iv ON i.id = iv.item_id AND iv.is_preferred = TRUE
LEFT JOIN inventory_vendors v ON iv.vendor_id = v.id
WHERE i.current_stock <= i.reorder_point
  AND i.is_active = TRUE
ORDER BY (i.reorder_point - i.current_stock) DESC;
