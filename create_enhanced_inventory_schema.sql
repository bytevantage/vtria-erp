-- Enhanced Inventory Management Schema
-- Comprehensive batch tracking, serial numbers, and transaction history

-- Create inventory batches table for traceability
CREATE TABLE IF NOT EXISTS inventory_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    product_id INT NOT NULL,
    supplier_id INT NULL,
    purchase_order_id INT NULL,
    grn_id INT NULL,
    
    -- Quantity tracking
    received_quantity DECIMAL(15,3) NOT NULL,
    current_quantity DECIMAL(15,3) NOT NULL,
    allocated_quantity DECIMAL(15,3) DEFAULT 0.00,
    available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (current_quantity - allocated_quantity) STORED,
    
    -- Cost tracking
    unit_cost DECIMAL(15,2) NOT NULL,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (current_quantity * unit_cost) STORED,
    
    -- Location and dates
    location_id INT NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE NULL,
    manufacturing_date DATE NULL,
    
    -- Warranty information
    warranty_start_date DATE NULL,
    warranty_end_date DATE NULL,
    warranty_months INT NULL,
    
    -- Status and notes
    status ENUM('active', 'consumed', 'expired', 'damaged', 'returned') DEFAULT 'active',
    quality_status ENUM('pending', 'passed', 'failed', 'quarantine') DEFAULT 'passed',
    notes TEXT NULL,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL DEFAULT 1,
    
    -- Foreign Keys
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (location_id) REFERENCES inventory_locations(id),
    
    -- Indexes
    INDEX idx_batch_product (product_id),
    INDEX idx_batch_location (location_id),
    INDEX idx_batch_status (status),
    INDEX idx_batch_received_date (received_date),
    INDEX idx_batch_expiry_date (expiry_date),
    INDEX idx_batch_grn (grn_id)
);

-- Create inventory serial numbers table
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    
    -- Location tracking
    location_id INT NOT NULL,
    allocated_to_order_id INT NULL,
    
    -- Reference tracking
    grn_id INT NULL,
    purchase_order_id INT NULL,
    sales_order_id INT NULL,
    delivery_challan_id INT NULL,
    
    -- Status and warranty
    status ENUM('in_stock', 'allocated', 'shipped', 'delivered', 'returned', 'damaged') DEFAULT 'in_stock',
    warranty_start_date DATE NULL,
    warranty_end_date DATE NULL,
    
    -- Customer information (when sold)
    customer_id INT NULL,
    sold_date DATE NULL,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (location_id) REFERENCES inventory_locations(id),
    
    -- Unique constraint
    UNIQUE KEY unique_serial_product (serial_number, product_id),
    
    -- Indexes
    INDEX idx_serial_product (product_id),
    INDEX idx_serial_batch (batch_id),
    INDEX idx_serial_location (location_id),
    INDEX idx_serial_status (status),
    INDEX idx_serial_number (serial_number)
);

-- Create enhanced stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    batch_id INT NULL,
    
    -- Location tracking
    from_location_id INT NULL,
    to_location_id INT NULL,
    
    -- Quantity and value
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,2) DEFAULT 0.00,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    
    -- Movement classification
    movement_type ENUM('receipt', 'issue', 'transfer', 'adjustment', 'return', 'rejection', 'consumption') NOT NULL,
    movement_category ENUM('purchase', 'sales', 'production', 'quality', 'adjustment', 'internal') DEFAULT 'purchase',
    
    -- Reference tracking
    reference_type ENUM('GRN', 'sales_order', 'delivery_challan', 'production_order', 'adjustment', 'transfer', 'return') NULL,
    reference_id INT NULL,
    reference_number VARCHAR(100) NULL,
    
    -- Additional information
    movement_date DATE NOT NULL,
    reason_code VARCHAR(50) NULL,
    notes TEXT NULL,
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (from_location_id) REFERENCES inventory_locations(id),
    FOREIGN KEY (to_location_id) REFERENCES inventory_locations(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_movement_product (product_id),
    INDEX idx_movement_batch (batch_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_movement_date (movement_date),
    INDEX idx_movement_reference (reference_type, reference_id),
    INDEX idx_movement_from_location (from_location_id),
    INDEX idx_movement_to_location (to_location_id)
);

-- Create quality control rejections table
CREATE TABLE IF NOT EXISTS quality_control_rejections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_id INT NOT NULL,
    product_id INT NOT NULL,
    rejected_quantity DECIMAL(15,3) NOT NULL,
    
    -- Rejection details
    rejection_reason TEXT NOT NULL,
    quality_issue_type ENUM('damaged', 'defective', 'expired', 'wrong_specification', 'other') DEFAULT 'other',
    severity ENUM('minor', 'major', 'critical') DEFAULT 'major',
    
    -- Supplier and order information
    supplier_id INT NOT NULL,
    purchase_order_id INT NULL,
    
    -- Resolution tracking
    resolution_status ENUM('pending', 'return_to_supplier', 'rework', 'scrap', 'accept_with_concession') DEFAULT 'pending',
    resolution_notes TEXT NULL,
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    
    -- Financial impact
    unit_cost DECIMAL(15,2) DEFAULT 0.00,
    total_loss DECIMAL(15,2) GENERATED ALWAYS AS (rejected_quantity * unit_cost) STORED,
    supplier_debit_note_raised BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    rejection_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_qc_grn (grn_id),
    INDEX idx_qc_product (product_id),
    INDEX idx_qc_supplier (supplier_id),
    INDEX idx_qc_status (resolution_status),
    INDEX idx_qc_date (rejection_date)
);

-- Create inventory valuation summary table
CREATE TABLE IF NOT EXISTS inventory_valuation_summary (
    valuation_date DATE PRIMARY KEY,
    total_inventory_value DECIMAL(20,2) DEFAULT 0.00,
    total_quantity DECIMAL(20,3) DEFAULT 0.00,
    total_products INT DEFAULT 0,
    total_batches INT DEFAULT 0,
    total_locations INT DEFAULT 0,
    average_cost_per_unit DECIMAL(15,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_quantity > 0 THEN total_inventory_value / total_quantity
            ELSE 0
        END
    ) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add enhanced columns to existing tables
ALTER TABLE goods_received_notes 
ADD COLUMN IF NOT EXISTS inventory_value DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Total inventory value of accepted items',
ADD COLUMN IF NOT EXISTS items_count INT DEFAULT 0 COMMENT 'Number of different products received',
ADD COLUMN IF NOT EXISTS batch_processed BOOLEAN DEFAULT FALSE COMMENT 'Whether batch records have been created',
ADD COLUMN IF NOT EXISTS quality_checked BOOLEAN DEFAULT FALSE COMMENT 'Whether quality check is completed';

ALTER TABLE inventory_warehouse_stock 
ADD COLUMN IF NOT EXISTS average_cost DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Weighted average cost',
ADD COLUMN IF NOT EXISTS last_movement_date DATE NULL COMMENT 'Date of last stock movement',
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS average_cost DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Current average cost',
ADD COLUMN IF NOT EXISTS last_purchase_price DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Latest purchase price',
ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(15,3) DEFAULT 0.00 COMMENT 'Minimum stock level',
ADD COLUMN IF NOT EXISTS max_stock_level DECIMAL(15,3) DEFAULT 0.00 COMMENT 'Maximum stock level',
ADD COLUMN IF NOT EXISTS abc_category ENUM('A', 'B', 'C') NULL COMMENT 'ABC analysis category',
ADD COLUMN IF NOT EXISTS track_serial_numbers BOOLEAN DEFAULT FALSE COMMENT 'Whether to track serial numbers',
ADD COLUMN IF NOT EXISTS track_batches BOOLEAN DEFAULT TRUE COMMENT 'Whether to track batches',
ADD COLUMN IF NOT EXISTS shelf_life_days INT NULL COMMENT 'Shelf life in days';

-- Add indexes for better performance
ALTER TABLE goods_received_notes 
ADD INDEX IF NOT EXISTS idx_grn_inventory_value (inventory_value),
ADD INDEX IF NOT EXISTS idx_grn_batch_processed (batch_processed);

ALTER TABLE inventory_warehouse_stock 
ADD INDEX IF NOT EXISTS idx_stock_last_movement (last_movement_date),
ADD INDEX IF NOT EXISTS idx_stock_avg_cost (average_cost);

ALTER TABLE products 
ADD INDEX IF NOT EXISTS idx_product_avg_cost (average_cost),
ADD INDEX IF NOT EXISTS idx_product_reorder_level (reorder_level),
ADD INDEX IF NOT EXISTS idx_product_abc_category (abc_category);

-- Create triggers for automatic updates

DELIMITER $$

-- Trigger to update batch quantities when stock movements occur
DROP TRIGGER IF EXISTS update_batch_quantities_after_movement$$
CREATE TRIGGER update_batch_quantities_after_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW
BEGIN
    IF NEW.batch_id IS NOT NULL THEN
        -- Update batch current quantity based on movement type
        CASE NEW.movement_type
            WHEN 'receipt' THEN
                UPDATE inventory_batches 
                SET current_quantity = current_quantity + NEW.quantity
                WHERE id = NEW.batch_id;
            WHEN 'issue' THEN
                UPDATE inventory_batches 
                SET current_quantity = GREATEST(0, current_quantity - NEW.quantity)
                WHERE id = NEW.batch_id;
            WHEN 'transfer' THEN
                -- For transfers, handle based on location change
                IF NEW.from_location_id IS NOT NULL THEN
                    UPDATE inventory_batches 
                    SET current_quantity = GREATEST(0, current_quantity - NEW.quantity)
                    WHERE id = NEW.batch_id;
                END IF;
        END CASE;
    END IF;
END$$

-- Trigger to update inventory valuation when stock changes
DROP TRIGGER IF EXISTS update_inventory_valuation_after_stock_change$$
CREATE TRIGGER update_inventory_valuation_after_stock_change
    AFTER INSERT ON stock_movements
    FOR EACH ROW
BEGIN
    -- Update last movement date
    UPDATE inventory_warehouse_stock 
    SET last_movement_date = NEW.movement_date
    WHERE item_id = NEW.product_id 
    AND (location_id = NEW.to_location_id OR location_id = NEW.from_location_id);
END$$

DELIMITER ;

-- Insert sample inventory locations if not exist
INSERT IGNORE INTO inventory_locations (id, name, address, type, status) VALUES
(1, 'Main Warehouse', 'Factory Premises, Bangalore', 'warehouse', 'active'),
(2, 'Quality Check Area', 'QC Department, Bangalore', 'quality', 'active'),
(3, 'Raw Materials Store', 'RM Section, Bangalore', 'warehouse', 'active'),
(4, 'Finished Goods Store', 'FG Section, Bangalore', 'warehouse', 'active'),
(5, 'Quarantine Area', 'Isolation Area, Bangalore', 'quarantine', 'active');

-- Create initial inventory valuation summary
INSERT IGNORE INTO inventory_valuation_summary (valuation_date) VALUES (CURDATE());

-- Sample data for testing
/*
-- Test batch creation
INSERT INTO inventory_batches (
    batch_number, product_id, supplier_id, received_quantity, current_quantity,
    unit_cost, location_id, received_date, created_by
) VALUES 
('P1-20250109-001', 1, 1, 100.00, 100.00, 1000.00, 1, CURDATE(), 1),
('P2-20250109-001', 2, 1, 50.00, 50.00, 500.00, 1, CURDATE(), 1);

-- Test serial numbers
INSERT INTO inventory_serial_numbers (
    product_id, batch_id, serial_number, location_id, grn_id
) VALUES 
(1, 1, 'MCB001', 1, 1),
(1, 1, 'MCB002', 1, 1),
(2, 2, 'CNT001', 1, 1);
*/