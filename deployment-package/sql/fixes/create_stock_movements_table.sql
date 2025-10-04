-- Create missing stock_movements table
-- This table tracks all inventory movements (in, out, transfers)

CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    from_location_id INT NULL,
    to_location_id INT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    movement_type ENUM('in', 'out', 'transfer', 'adjustment') NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100) NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    unit_cost DECIMAL(10,2) NULL,
    total_value DECIMAL(12,2) GENERATED ALWAYS AS (quantity * IFNULL(unit_cost, 0)) STORED,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_product_date (product_id, movement_date),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_created_date (created_at)
);

-- Add some sample data for testing
INSERT INTO stock_movements (product_id, to_location_id, quantity, movement_type, reference_type, reference_id, notes, unit_cost) VALUES
(1, 1, 25.000, 'in', 'initial_stock', 'INIT001', 'Initial stock entry', 100.00),
(2, 1, 50.000, 'in', 'purchase_order', 'PO001', 'Purchase order receipt', 75.50),
(3, 1, 10.000, 'in', 'production', 'PROD001', 'Production output', 200.00);