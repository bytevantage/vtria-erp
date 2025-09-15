-- Multi-location inventory management schema
-- VTRIA Engineering Solutions Pvt Ltd

-- Locations table (warehouses, stores, offices)
CREATE TABLE IF NOT EXISTS locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    type ENUM('warehouse', 'store', 'office', 'factory') DEFAULT 'warehouse',
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Insert default locations for VTRIA
INSERT INTO locations (name, code, type, address, city, state, pincode, is_active) VALUES
('Mangalore Main Warehouse', 'MNG-WH-01', 'warehouse', 'Industrial Area, Mangalore', 'Mangalore', 'Karnataka', '575001', TRUE),
('Mangalore Store 2', 'MNG-ST-02', 'store', 'Commercial Complex, Mangalore', 'Mangalore', 'Karnataka', '575002', TRUE),
('Bangalore Office', 'BLR-OF-01', 'office', 'Electronic City, Bangalore', 'Bangalore', 'Karnataka', '560100', TRUE),
('Pune Branch', 'PUN-BR-01', 'warehouse', 'Pimpri-Chinchwad, Pune', 'Pune', 'Maharashtra', '411018', TRUE);

-- Inter-store transfers table
CREATE TABLE IF NOT EXISTS inter_store_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    from_location_id INT NOT NULL,
    to_location_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'shipped', 'received', 'cancelled') DEFAULT 'pending',
    reason TEXT,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    requested_by INT NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    approved_by_notes TEXT,
    shipped_by INT NULL,
    shipped_at TIMESTAMP NULL,
    received_by INT NULL,
    received_at TIMESTAMP NULL,
    total_items INT DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (shipped_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Inter-store transfer items table
CREATE TABLE IF NOT EXISTS inter_store_transfer_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_id INT NOT NULL,
    product_id INT NOT NULL,
    requested_quantity DECIMAL(10,2) NOT NULL,
    approved_quantity DECIMAL(10,2) NULL,
    shipped_quantity DECIMAL(10,2) NULL,
    received_quantity DECIMAL(10,2) NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (shipped_quantity * unit_cost) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES inter_store_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Stock movements table for tracking all stock changes
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'transfer_in', 'transfer_out', 'adjustment', 'return') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    reference_type ENUM('purchase', 'sale', 'transfer', 'adjustment', 'return', 'manufacturing') NULL,
    reference_id INT NULL,
    reference_number VARCHAR(50) NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    balance_quantity DECIMAL(10,2) NOT NULL,
    notes TEXT,
    user_id INT NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_product_location (product_id, location_id),
    INDEX idx_movement_date (movement_date),
    INDEX idx_reference (reference_type, reference_id)
);

-- Update stock table to include location_id if not exists
ALTER TABLE stock ADD COLUMN IF NOT EXISTS location_id INT DEFAULT 1;
ALTER TABLE stock ADD FOREIGN KEY IF NOT EXISTS (location_id) REFERENCES locations(id);

-- Create unique constraint on product_id and location_id in stock table
ALTER TABLE stock ADD UNIQUE KEY IF NOT EXISTS unique_product_location (product_id, location_id);

-- Location stock alerts table
CREATE TABLE IF NOT EXISTS location_stock_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_id INT NOT NULL,
    product_id INT NOT NULL,
    alert_type ENUM('low_stock', 'out_of_stock', 'overstock') NOT NULL,
    threshold_quantity DECIMAL(10,2) NOT NULL,
    current_quantity DECIMAL(10,2) NOT NULL,
    alert_status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_by INT NULL,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id),
    INDEX idx_location_product (location_id, product_id),
    INDEX idx_alert_status (alert_status)
);

-- Stock reservation table for pending transfers
CREATE TABLE IF NOT EXISTS stock_reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    reserved_quantity DECIMAL(10,2) NOT NULL,
    reservation_type ENUM('transfer', 'sale', 'manufacturing') NOT NULL,
    reference_id INT NOT NULL,
    reference_number VARCHAR(50),
    reserved_by INT NOT NULL,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    status ENUM('active', 'fulfilled', 'cancelled', 'expired') DEFAULT 'active',
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (reserved_by) REFERENCES users(id),
    INDEX idx_product_location_status (product_id, location_id, status)
);

-- Triggers to update stock movements when stock changes
DELIMITER //

CREATE TRIGGER IF NOT EXISTS stock_movement_insert 
AFTER INSERT ON stock
FOR EACH ROW
BEGIN
    INSERT INTO stock_movements (
        product_id, location_id, movement_type, quantity, 
        balance_quantity, user_id, notes
    ) VALUES (
        NEW.product_id, NEW.location_id, 'in', NEW.quantity,
        NEW.quantity, 1, 'Initial stock entry'
    );
END//

CREATE TRIGGER IF NOT EXISTS stock_movement_update 
AFTER UPDATE ON stock
FOR EACH ROW
BEGIN
    DECLARE movement_qty DECIMAL(10,2);
    DECLARE movement_type_val VARCHAR(20);
    
    SET movement_qty = NEW.quantity - OLD.quantity;
    
    IF movement_qty > 0 THEN
        SET movement_type_val = 'in';
    ELSE
        SET movement_type_val = 'out';
        SET movement_qty = ABS(movement_qty);
    END IF;
    
    INSERT INTO stock_movements (
        product_id, location_id, movement_type, quantity,
        balance_quantity, user_id, notes
    ) VALUES (
        NEW.product_id, NEW.location_id, movement_type_val, movement_qty,
        NEW.quantity, 1, 'Stock adjustment'
    );
END//

DELIMITER ;

-- Views for reporting
CREATE OR REPLACE VIEW location_stock_summary AS
SELECT 
    l.id as location_id,
    l.name as location_name,
    l.code as location_code,
    l.type as location_type,
    COUNT(DISTINCT s.product_id) as total_products,
    SUM(s.quantity) as total_quantity,
    SUM(s.quantity * COALESCE(p.cost_price, 0)) as total_value,
    SUM(CASE WHEN s.quantity <= s.reorder_level THEN 1 ELSE 0 END) as low_stock_items,
    SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_items
FROM locations l
LEFT JOIN stock s ON l.id = s.location_id
LEFT JOIN products p ON s.product_id = p.id
WHERE l.is_active = 1
GROUP BY l.id, l.name, l.code, l.type;

CREATE OR REPLACE VIEW product_location_stock AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku as product_sku,
    l.id as location_id,
    l.name as location_name,
    l.code as location_code,
    COALESCE(s.quantity, 0) as quantity,
    COALESCE(s.reorder_level, 0) as reorder_level,
    CASE 
        WHEN COALESCE(s.quantity, 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(s.quantity, 0) <= COALESCE(s.reorder_level, 0) THEN 'low_stock'
        ELSE 'in_stock'
    END as stock_status
FROM products p
CROSS JOIN locations l
LEFT JOIN stock s ON p.id = s.product_id AND l.id = s.location_id
WHERE l.is_active = 1 AND p.is_active = 1;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_location_product ON stock(location_id, product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status_date ON inter_store_transfers(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_movements_product_date ON stock_movements(product_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_reservations_active ON stock_reservations(status, expires_at);
