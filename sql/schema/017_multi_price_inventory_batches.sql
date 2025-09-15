-- ================================
-- VTRIA ERP: Multi-Price Inventory Batch Management
-- Handles same products received at different prices with proper costing
-- ================================

-- Inventory Batches (for tracking different price lots)
CREATE TABLE inventory_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic Information
    batch_number VARCHAR(100) NOT NULL, -- Auto-generated or manual
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Purchase Information
    supplier_id INT,
    grn_id INT,
    purchase_date DATE NOT NULL,
    purchase_price DECIMAL(12,4) NOT NULL, -- Price per unit for this batch
    
    -- Quantity Tracking
    received_quantity DECIMAL(10,4) NOT NULL,
    consumed_quantity DECIMAL(10,4) DEFAULT 0,
    damaged_quantity DECIMAL(10,4) DEFAULT 0,
    available_quantity DECIMAL(10,4) GENERATED ALWAYS AS (received_quantity - consumed_quantity - damaged_quantity) STORED,
    
    -- Batch Information
    manufacturing_date DATE,
    expiry_date DATE,
    lot_number VARCHAR(100), -- Supplier's lot number
    
    -- Status
    status ENUM('active', 'consumed', 'expired', 'damaged') DEFAULT 'active',
    
    -- Audit
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_product_location (product_id, location_id),
    INDEX idx_batch_number (batch_number),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_available_qty (available_quantity),
    INDEX idx_status (status)
);

-- Inventory Allocations (tracking which batch items are allocated to orders/estimations)
CREATE TABLE inventory_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Allocation Information
    allocation_type ENUM('estimation', 'sales_order', 'manufacturing_order', 'manual') NOT NULL,
    reference_id INT NOT NULL, -- ID of the estimation, sales order, etc.
    reference_line_id INT, -- Line item ID within the reference
    
    -- Product and Batch
    product_id INT NOT NULL,
    batch_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Quantity and Pricing
    allocated_quantity DECIMAL(10,4) NOT NULL,
    unit_price DECIMAL(12,4) NOT NULL, -- Price from the batch
    total_cost DECIMAL(15,4) GENERATED ALWAYS AS (allocated_quantity * unit_price) STORED,
    
    -- Serial Numbers (for serialized products)
    serial_numbers JSON, -- Array of allocated serial numbers
    
    -- Status
    status ENUM('reserved', 'consumed', 'released') DEFAULT 'reserved',
    
    -- Timestamps
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP NULL,
    released_at TIMESTAMP NULL,
    
    -- User Tracking
    allocated_by INT,
    consumed_by INT,
    released_by INT,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (allocated_by) REFERENCES users(id),
    FOREIGN KEY (consumed_by) REFERENCES users(id),
    FOREIGN KEY (released_by) REFERENCES users(id),
    
    INDEX idx_allocation_type_ref (allocation_type, reference_id),
    INDEX idx_product_batch (product_id, batch_id),
    INDEX idx_status (status),
    INDEX idx_allocated_at (allocated_at)
);

-- Inventory Reservations (temporary holds during estimation/quotation process)
CREATE TABLE inventory_reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Reservation Information
    reservation_type ENUM('estimation', 'quotation', 'sales_order') NOT NULL,
    reference_id INT NOT NULL,
    reference_line_id INT,
    
    -- Product Information
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Quantity
    reserved_quantity DECIMAL(10,4) NOT NULL,
    
    -- Pricing Strategy
    pricing_method ENUM('current_cost', 'average_cost', 'fifo', 'lifo', 'specific_batch') NOT NULL DEFAULT 'fifo',
    specific_batch_id INT, -- If pricing_method = 'specific_batch'
    estimated_unit_cost DECIMAL(12,4),
    
    -- Status and Timing
    status ENUM('active', 'allocated', 'expired', 'cancelled') DEFAULT 'active',
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Auto-expire reservations
    
    -- User Tracking
    reserved_by INT,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (specific_batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (reserved_by) REFERENCES users(id),
    
    INDEX idx_reservation_type_ref (reservation_type, reference_id),
    INDEX idx_product_location (product_id, location_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_status (status)
);

-- Costing Methods Configuration
CREATE TABLE inventory_costing_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    product_category_id INT,
    
    -- Costing Method
    default_costing_method ENUM('fifo', 'lifo', 'average', 'standard') NOT NULL DEFAULT 'fifo',
    
    -- Settings
    auto_allocate_on_estimation BOOLEAN DEFAULT FALSE,
    reserve_on_quotation BOOLEAN DEFAULT TRUE,
    reservation_expiry_hours INT DEFAULT 72, -- 3 days default
    
    -- Pricing Strategy
    estimation_pricing_method ENUM('current_cost', 'average_cost', 'last_cost', 'standard_cost') DEFAULT 'average_cost',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (product_category_id) REFERENCES product_categories(id),
    
    UNIQUE KEY unique_location_category (location_id, product_category_id),
    INDEX idx_location (location_id)
);

-- ================================
-- STORED PROCEDURES FOR COMPLEX OPERATIONS
-- ================================

DELIMITER //

-- Procedure to allocate inventory using FIFO method
CREATE PROCEDURE AllocateInventoryFIFO(
    IN p_product_id INT,
    IN p_location_id INT,
    IN p_quantity DECIMAL(10,4),
    IN p_allocation_type VARCHAR(20),
    IN p_reference_id INT,
    IN p_reference_line_id INT,
    IN p_allocated_by INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_batch_id INT;
    DECLARE v_batch_quantity DECIMAL(10,4);
    DECLARE v_batch_price DECIMAL(12,4);
    DECLARE v_allocate_qty DECIMAL(10,4);
    DECLARE v_remaining_qty DECIMAL(10,4) DEFAULT p_quantity;
    
    -- Cursor to get batches in FIFO order (oldest first)
    DECLARE batch_cursor CURSOR FOR
        SELECT id, available_quantity, purchase_price
        FROM inventory_batches
        WHERE product_id = p_product_id 
        AND location_id = p_location_id 
        AND available_quantity > 0
        AND status = 'active'
        ORDER BY purchase_date ASC, id ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN batch_cursor;
    
    allocation_loop: LOOP
        FETCH batch_cursor INTO v_batch_id, v_batch_quantity, v_batch_price;
        
        IF done OR v_remaining_qty <= 0 THEN
            LEAVE allocation_loop;
        END IF;
        
        -- Calculate quantity to allocate from this batch
        SET v_allocate_qty = LEAST(v_batch_quantity, v_remaining_qty);
        
        -- Create allocation record
        INSERT INTO inventory_allocations (
            allocation_type, reference_id, reference_line_id,
            product_id, batch_id, location_id,
            allocated_quantity, unit_price,
            allocated_by
        ) VALUES (
            p_allocation_type, p_reference_id, p_reference_line_id,
            p_product_id, v_batch_id, p_location_id,
            v_allocate_qty, v_batch_price,
            p_allocated_by
        );
        
        -- Update batch consumed quantity
        UPDATE inventory_batches 
        SET consumed_quantity = consumed_quantity + v_allocate_qty
        WHERE id = v_batch_id;
        
        -- Reduce remaining quantity
        SET v_remaining_qty = v_remaining_qty - v_allocate_qty;
        
    END LOOP;
    
    CLOSE batch_cursor;
    
    -- Return allocation summary
    SELECT 
        p_quantity - v_remaining_qty as allocated_quantity,
        v_remaining_qty as shortage_quantity,
        CASE WHEN v_remaining_qty > 0 THEN 'PARTIAL' ELSE 'COMPLETE' END as allocation_status;
        
END//

-- Function to calculate current inventory cost using specified method
CREATE FUNCTION CalculateInventoryCost(
    p_product_id INT,
    p_location_id INT,
    p_method ENUM('fifo', 'lifo', 'average', 'last')
) RETURNS DECIMAL(12,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_cost DECIMAL(12,4) DEFAULT 0;
    
    CASE p_method
        WHEN 'fifo' THEN
            SELECT purchase_price INTO v_cost
            FROM inventory_batches
            WHERE product_id = p_product_id 
            AND location_id = p_location_id 
            AND available_quantity > 0
            AND status = 'active'
            ORDER BY purchase_date ASC, id ASC
            LIMIT 1;
            
        WHEN 'lifo' THEN
            SELECT purchase_price INTO v_cost
            FROM inventory_batches
            WHERE product_id = p_product_id 
            AND location_id = p_location_id 
            AND available_quantity > 0
            AND status = 'active'
            ORDER BY purchase_date DESC, id DESC
            LIMIT 1;
            
        WHEN 'average' THEN
            SELECT 
                SUM(available_quantity * purchase_price) / SUM(available_quantity) INTO v_cost
            FROM inventory_batches
            WHERE product_id = p_product_id 
            AND location_id = p_location_id 
            AND available_quantity > 0
            AND status = 'active';
            
        WHEN 'last' THEN
            SELECT purchase_price INTO v_cost
            FROM inventory_batches
            WHERE product_id = p_product_id 
            AND location_id = p_location_id
            ORDER BY purchase_date DESC, id DESC
            LIMIT 1;
    END CASE;
    
    RETURN IFNULL(v_cost, 0);
END//

DELIMITER ;

-- ================================
-- TRIGGERS FOR AUTOMATIC PROCESSING
-- ================================

DELIMITER //

-- Auto-expire reservations
CREATE EVENT expire_inventory_reservations
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE inventory_reservations
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at < NOW();
END//

-- Update inventory stock when batch quantities change
CREATE TRIGGER update_stock_on_batch_change
    AFTER UPDATE ON inventory_batches
    FOR EACH ROW
BEGIN
    -- Recalculate total stock for the product at this location
    INSERT INTO inventory_stock (product_id, location_id, available_quantity, average_cost, last_movement_date)
    SELECT 
        NEW.product_id,
        NEW.location_id,
        SUM(available_quantity),
        SUM(available_quantity * purchase_price) / SUM(available_quantity),
        NOW()
    FROM inventory_batches
    WHERE product_id = NEW.product_id 
    AND location_id = NEW.location_id
    AND status = 'active'
    GROUP BY product_id, location_id
    ON DUPLICATE KEY UPDATE
        available_quantity = VALUES(available_quantity),
        average_cost = VALUES(average_cost),
        last_movement_date = VALUES(last_movement_date);
END//

DELIMITER ;

-- ================================
-- VIEWS FOR COMMON QUERIES
-- ================================

-- Batch-wise inventory summary
CREATE VIEW v_inventory_batches_summary AS
SELECT 
    b.id as batch_id,
    b.batch_number,
    p.name as product_name,
    p.product_code,
    l.name as location_name,
    s.company_name as supplier_name,
    b.purchase_date,
    b.purchase_price,
    b.received_quantity,
    b.available_quantity,
    (b.available_quantity * b.purchase_price) as batch_value,
    b.expiry_date,
    b.status,
    DATEDIFF(b.expiry_date, CURDATE()) as days_to_expiry
FROM inventory_batches b
LEFT JOIN products p ON b.product_id = p.id
LEFT JOIN locations l ON b.location_id = l.id
LEFT JOIN suppliers s ON b.supplier_id = s.id
WHERE b.status = 'active';

-- Product costing summary by method
CREATE VIEW v_product_costing_methods AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.product_code,
    l.id as location_id,
    l.name as location_name,
    CalculateInventoryCost(p.id, l.id, 'fifo') as fifo_cost,
    CalculateInventoryCost(p.id, l.id, 'lifo') as lifo_cost,
    CalculateInventoryCost(p.id, l.id, 'average') as average_cost,
    CalculateInventoryCost(p.id, l.id, 'last') as last_cost,
    SUM(ib.available_quantity) as total_quantity
FROM products p
CROSS JOIN locations l
LEFT JOIN inventory_batches ib ON p.id = ib.product_id AND l.id = ib.location_id AND ib.status = 'active'
WHERE p.is_active = TRUE
GROUP BY p.id, l.id;

-- Allocation summary view
CREATE VIEW v_inventory_allocations_summary AS
SELECT 
    ia.allocation_type,
    ia.reference_id,
    p.name as product_name,
    p.product_code,
    l.name as location_name,
    ib.batch_number,
    ib.purchase_price as batch_unit_price,
    ia.allocated_quantity,
    ia.total_cost,
    ia.status,
    ia.allocated_at,
    u.full_name as allocated_by_name
FROM inventory_allocations ia
LEFT JOIN products p ON ia.product_id = p.id
LEFT JOIN locations l ON ia.location_id = l.id
LEFT JOIN inventory_batches ib ON ia.batch_id = ib.id
LEFT JOIN users u ON ia.allocated_by = u.id;

-- ================================
-- SAMPLE CONFIGURATION DATA
-- ================================

-- Default costing configuration for each location
INSERT INTO inventory_costing_config (location_id, default_costing_method, auto_allocate_on_estimation, reserve_on_quotation)
SELECT 
    id, 'fifo', FALSE, TRUE
FROM locations 
WHERE status = 'active';

-- Example: Different costing method for specific categories
INSERT INTO inventory_costing_config (location_id, product_category_id, default_costing_method, estimation_pricing_method)
SELECT 
    l.id, 
    pc.id, 
    'average', 
    'average_cost'
FROM locations l
CROSS JOIN product_categories pc
WHERE l.id = 1 AND pc.name IN ('Control Panels', 'Motors');