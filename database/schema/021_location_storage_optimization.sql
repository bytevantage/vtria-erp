-- Location Storage Optimization with Zone Management
-- Handles multi-location, multi-city, multi-state inventory management
-- Implements zone-based storage optimization and cross-location transfers

-- Enhanced location hierarchy with zones
CREATE TABLE location_zones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_id INT NOT NULL,
    zone_code VARCHAR(10) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    zone_type ENUM('receiving', 'storage', 'picking', 'dispatch', 'quarantine', 'damaged') NOT NULL,
    capacity_cubic_meters DECIMAL(10,2),
    max_weight_kg DECIMAL(10,2),
    temperature_controlled BOOLEAN DEFAULT FALSE,
    humidity_controlled BOOLEAN DEFAULT FALSE,
    security_level ENUM('low', 'medium', 'high', 'restricted') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE KEY unique_zone_per_location (location_id, zone_code),
    INDEX idx_zone_type (zone_type),
    INDEX idx_zone_active (is_active)
);

-- Zone storage positions (bins, shelves, racks)
CREATE TABLE storage_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    zone_id INT NOT NULL,
    position_code VARCHAR(20) NOT NULL,
    position_type ENUM('bin', 'shelf', 'rack', 'floor', 'pallet') NOT NULL,
    row_number INT,
    column_number INT,
    level_number INT,
    capacity_units INT DEFAULT 100,
    current_utilization INT DEFAULT 0,
    reserved_units INT DEFAULT 0,
    dimensions_length_cm DECIMAL(8,2),
    dimensions_width_cm DECIMAL(8,2),
    dimensions_height_cm DECIMAL(8,2),
    weight_capacity_kg DECIMAL(10,2),
    barcode VARCHAR(50),
    rfid_tag VARCHAR(50),
    accessibility ENUM('easy', 'medium', 'difficult') DEFAULT 'medium',
    picking_sequence INT,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason VARCHAR(255),
    last_inventory_check TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES location_zones(id),
    UNIQUE KEY unique_position_per_zone (zone_id, position_code),
    INDEX idx_position_utilization (current_utilization),
    INDEX idx_position_accessibility (accessibility),
    INDEX idx_position_blocked (is_blocked)
);

-- Enhanced inventory batches with storage positions
ALTER TABLE inventory_batches 
ADD COLUMN storage_position_id INT AFTER location_id,
ADD COLUMN storage_strategy ENUM('fifo', 'lifo', 'fefo', 'random', 'abc_analysis') DEFAULT 'fifo',
ADD COLUMN pick_priority INT DEFAULT 100,
ADD COLUMN storage_cost_per_day DECIMAL(8,4) DEFAULT 0,
ADD COLUMN handling_difficulty ENUM('easy', 'medium', 'difficult', 'special') DEFAULT 'medium',
ADD COLUMN environmental_requirements JSON,
ADD FOREIGN KEY (storage_position_id) REFERENCES storage_positions(id),
ADD INDEX idx_storage_position (storage_position_id),
ADD INDEX idx_pick_priority (pick_priority);

-- Cross-location transfer requests
CREATE TABLE location_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transfer_number VARCHAR(20) NOT NULL UNIQUE,
    from_location_id INT NOT NULL,
    to_location_id INT NOT NULL,
    from_position_id INT,
    to_position_id INT,
    product_id INT NOT NULL,
    from_batch_id INT,
    to_batch_id INT,
    quantity_requested DECIMAL(12,3) NOT NULL,
    quantity_shipped DECIMAL(12,3) DEFAULT 0,
    quantity_received DECIMAL(12,3) DEFAULT 0,
    transfer_reason ENUM('restock', 'optimization', 'customer_request', 'maintenance', 'emergency') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'approved', 'shipped', 'in_transit', 'received', 'cancelled') DEFAULT 'draft',
    requested_by INT NOT NULL,
    approved_by INT,
    shipped_by INT,
    received_by INT,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(100),
    estimated_arrival DATETIME,
    actual_arrival DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_location_id) REFERENCES locations(id),
    FOREIGN KEY (to_location_id) REFERENCES locations(id),
    FOREIGN KEY (from_position_id) REFERENCES storage_positions(id),
    FOREIGN KEY (to_position_id) REFERENCES storage_positions(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (to_batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (shipped_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    INDEX idx_transfer_status (status),
    INDEX idx_transfer_priority (priority),
    INDEX idx_transfer_from_location (from_location_id),
    INDEX idx_transfer_to_location (to_location_id)
);

-- Storage optimization rules and policies
CREATE TABLE storage_optimization_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    rule_type ENUM('placement', 'movement', 'replenishment', 'consolidation') NOT NULL,
    location_id INT,
    product_category_id INT,
    conditions JSON, -- Storage conditions like temperature, humidity, security
    actions JSON, -- Actions to take when conditions are met
    priority INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (product_category_id) REFERENCES product_categories(id),
    INDEX idx_rule_type (rule_type),
    INDEX idx_rule_active (is_active)
);

-- ABC Analysis for inventory classification
CREATE TABLE inventory_abc_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_id INT NOT NULL,
    product_id INT NOT NULL,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    total_value_consumed DECIMAL(15,2) NOT NULL,
    total_quantity_consumed DECIMAL(12,3) NOT NULL,
    consumption_frequency INT NOT NULL,
    abc_classification ENUM('A', 'B', 'C') NOT NULL,
    xyz_classification ENUM('X', 'Y', 'Z'), -- For demand variability
    storage_recommendation TEXT,
    picking_priority INT,
    reorder_frequency_days INT,
    safety_stock_days INT,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY unique_location_product_period (location_id, product_id, analysis_period_start, analysis_period_end),
    INDEX idx_abc_classification (abc_classification),
    INDEX idx_xyz_classification (xyz_classification),
    INDEX idx_analysis_date (analysis_date)
);

-- Storage space utilization tracking
CREATE TABLE storage_utilization_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    location_id INT NOT NULL,
    zone_id INT NOT NULL,
    position_id INT NOT NULL,
    utilization_date DATE NOT NULL,
    utilization_percentage DECIMAL(5,2) NOT NULL,
    occupied_units INT NOT NULL,
    total_capacity_units INT NOT NULL,
    weight_utilization_kg DECIMAL(10,2),
    volume_utilization_cubic_meters DECIMAL(10,2),
    turnover_rate DECIMAL(8,4), -- Units moved per day
    picking_efficiency_score DECIMAL(5,2), -- Based on picking time and errors
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (zone_id) REFERENCES location_zones(id),
    FOREIGN KEY (position_id) REFERENCES storage_positions(id),
    UNIQUE KEY unique_position_date (position_id, utilization_date),
    INDEX idx_utilization_date (utilization_date),
    INDEX idx_utilization_percentage (utilization_percentage)
);

-- Automated storage optimization procedures

DELIMITER //

-- Calculate optimal storage position for a product batch
CREATE PROCEDURE CalculateOptimalStoragePosition(
    IN p_product_id INT,
    IN p_batch_id INT,
    IN p_location_id INT,
    IN p_quantity DECIMAL(12,3),
    OUT p_recommended_position_id INT,
    OUT p_optimization_score DECIMAL(5,2)
)
BEGIN
    DECLARE v_product_category INT;
    DECLARE v_product_weight DECIMAL(10,2);
    DECLARE v_product_volume DECIMAL(10,2);
    DECLARE v_abc_class CHAR(1);
    DECLARE v_picking_frequency INT;
    
    -- Get product characteristics
    SELECT category_id, weight_kg, volume_cubic_meters 
    INTO v_product_category, v_product_weight, v_product_volume
    FROM products WHERE id = p_product_id;
    
    -- Get ABC classification if available
    SELECT abc_classification, consumption_frequency
    INTO v_abc_class, v_picking_frequency
    FROM inventory_abc_analysis 
    WHERE product_id = p_product_id AND location_id = p_location_id
    ORDER BY analysis_date DESC LIMIT 1;
    
    -- Find optimal position based on multiple criteria
    SELECT sp.id, (
        -- Capacity match score (30%)
        (CASE 
            WHEN sp.capacity_units >= p_quantity THEN 30
            ELSE 0
        END) +
        
        -- Accessibility score based on ABC class (25%)
        (CASE 
            WHEN v_abc_class = 'A' AND sp.accessibility = 'easy' THEN 25
            WHEN v_abc_class = 'B' AND sp.accessibility IN ('easy', 'medium') THEN 20
            WHEN v_abc_class = 'C' AND sp.accessibility = 'difficult' THEN 15
            ELSE 10
        END) +
        
        -- Utilization efficiency score (20%)
        (20 - (sp.current_utilization / sp.capacity_units * 20)) +
        
        -- Zone appropriateness score (15%)
        (CASE 
            WHEN lz.zone_type = 'storage' THEN 15
            WHEN lz.zone_type = 'picking' AND v_abc_class = 'A' THEN 15
            ELSE 5
        END) +
        
        -- Picking sequence score (10%)
        (CASE 
            WHEN sp.picking_sequence IS NOT NULL THEN 
                10 - (sp.picking_sequence / 100 * 10)
            ELSE 5
        END)
    ) as optimization_score
    INTO p_recommended_position_id, p_optimization_score
    FROM storage_positions sp
    JOIN location_zones lz ON sp.zone_id = lz.id
    WHERE lz.location_id = p_location_id 
      AND sp.is_blocked = FALSE
      AND sp.capacity_units >= p_quantity
      AND (sp.weight_capacity_kg IS NULL OR sp.weight_capacity_kg >= v_product_weight * p_quantity)
    ORDER BY optimization_score DESC
    LIMIT 1;
    
END //

-- Suggest cross-location transfer to optimize inventory distribution
CREATE PROCEDURE SuggestInventoryTransfer(
    IN p_product_id INT,
    IN p_required_quantity DECIMAL(12,3),
    IN p_target_location_id INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_source_location_id INT;
    DECLARE v_available_quantity DECIMAL(12,3);
    DECLARE v_transfer_cost DECIMAL(10,2);
    DECLARE v_distance_km INT;
    
    DECLARE transfer_cursor CURSOR FOR
        SELECT 
            ib.location_id,
            SUM(ib.current_quantity) as available_quantity,
            -- Calculate transfer cost based on distance and quantity
            (l1.transport_cost_per_km * 
             SQRT(POW(l1.latitude - l2.latitude, 2) + POW(l1.longitude - l2.longitude, 2)) * 111) + 
            (p_required_quantity * 0.5) as estimated_cost,
            SQRT(POW(l1.latitude - l2.latitude, 2) + POW(l1.longitude - l2.longitude, 2)) * 111 as distance_km
        FROM inventory_batches ib
        JOIN locations l1 ON ib.location_id = l1.id
        JOIN locations l2 ON l2.id = p_target_location_id
        WHERE ib.product_id = p_product_id
          AND ib.current_quantity > 0
          AND ib.location_id != p_target_location_id
          AND ib.expiry_date > DATE_ADD(CURDATE(), INTERVAL 30 DAY) -- At least 30 days before expiry
        GROUP BY ib.location_id, l1.latitude, l1.longitude, l2.latitude, l2.longitude, l1.transport_cost_per_km
        HAVING available_quantity >= p_required_quantity
        ORDER BY estimated_cost ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for transfer suggestions
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_transfer_suggestions (
        source_location_id INT,
        available_quantity DECIMAL(12,3),
        transfer_cost DECIMAL(10,2),
        distance_km INT,
        priority_score DECIMAL(8,2)
    );
    
    TRUNCATE temp_transfer_suggestions;
    
    OPEN transfer_cursor;
    
    read_loop: LOOP
        FETCH transfer_cursor INTO v_source_location_id, v_available_quantity, v_transfer_cost, v_distance_km;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Calculate priority score (lower is better)
        INSERT INTO temp_transfer_suggestions VALUES (
            v_source_location_id,
            v_available_quantity,
            v_transfer_cost,
            v_distance_km,
            -- Priority score: cost weight (50%) + distance weight (30%) + excess inventory weight (20%)
            (v_transfer_cost / 1000 * 50) + 
            (v_distance_km / 100 * 30) + 
            ((v_available_quantity - p_required_quantity) / p_required_quantity * 20)
        );
        
    END LOOP;
    
    CLOSE transfer_cursor;
    
    -- Return top 5 transfer suggestions
    SELECT 
        tts.source_location_id,
        l.location_name as source_location_name,
        tts.available_quantity,
        tts.transfer_cost,
        tts.distance_km,
        tts.priority_score,
        CASE 
            WHEN tts.priority_score < 50 THEN 'Highly Recommended'
            WHEN tts.priority_score < 100 THEN 'Recommended'
            ELSE 'Consider if Necessary'
        END as recommendation
    FROM temp_transfer_suggestions tts
    JOIN locations l ON tts.source_location_id = l.id
    ORDER BY tts.priority_score ASC
    LIMIT 5;
    
END //

-- Update storage utilization metrics
CREATE PROCEDURE UpdateStorageUtilization()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_position_id INT;
    DECLARE v_location_id INT;
    DECLARE v_zone_id INT;
    DECLARE v_capacity INT;
    DECLARE v_current_utilization INT;
    
    DECLARE position_cursor CURSOR FOR
        SELECT sp.id, lz.location_id, sp.zone_id, sp.capacity_units,
               COALESCE(SUM(ib.current_quantity), 0) as current_utilization
        FROM storage_positions sp
        JOIN location_zones lz ON sp.zone_id = lz.id
        LEFT JOIN inventory_batches ib ON sp.id = ib.storage_position_id
        WHERE sp.is_blocked = FALSE
        GROUP BY sp.id, lz.location_id, sp.zone_id, sp.capacity_units;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN position_cursor;
    
    update_loop: LOOP
        FETCH position_cursor INTO v_position_id, v_location_id, v_zone_id, v_capacity, v_current_utilization;
        
        IF done THEN
            LEAVE update_loop;
        END IF;
        
        -- Update current utilization in storage_positions
        UPDATE storage_positions 
        SET current_utilization = v_current_utilization,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_position_id;
        
        -- Log utilization data
        INSERT INTO storage_utilization_log (
            location_id, zone_id, position_id, utilization_date,
            utilization_percentage, occupied_units, total_capacity_units
        ) VALUES (
            v_location_id, v_zone_id, v_position_id, CURDATE(),
            (v_current_utilization / v_capacity * 100),
            v_current_utilization, v_capacity
        ) ON DUPLICATE KEY UPDATE
            utilization_percentage = VALUES(utilization_percentage),
            occupied_units = VALUES(occupied_units),
            recorded_at = CURRENT_TIMESTAMP;
        
    END LOOP;
    
    CLOSE position_cursor;
    
END //

DELIMITER ;

-- Sample data for demonstration
INSERT INTO location_zones (location_id, zone_code, zone_name, zone_type, capacity_cubic_meters, max_weight_kg) VALUES
(1, 'RCV01', 'Receiving Bay 1', 'receiving', 500.00, 10000.00),
(1, 'STG01', 'Main Storage A1', 'storage', 2000.00, 50000.00),
(1, 'STG02', 'Main Storage A2', 'storage', 2000.00, 50000.00),
(1, 'PCK01', 'Picking Zone 1', 'picking', 300.00, 5000.00),
(1, 'DSP01', 'Dispatch Bay 1', 'dispatch', 200.00, 3000.00);

INSERT INTO storage_positions (zone_id, position_code, position_type, capacity_units, accessibility, picking_sequence) VALUES
(1, 'R01-A1', 'bin', 100, 'easy', 1),
(2, 'S01-A1-L1', 'shelf', 500, 'medium', 10),
(2, 'S01-A1-L2', 'shelf', 500, 'difficult', 20),
(3, 'S02-B1-L1', 'rack', 1000, 'medium', 15),
(4, 'P01-F1', 'bin', 200, 'easy', 5);

INSERT INTO storage_optimization_rules (rule_name, rule_type, conditions, actions, priority) VALUES
('High-Value Items Security', 'placement', '{"min_value": 10000, "security_required": "high"}', '{"zone_types": ["storage"], "security_level": "high"}', 100),
('Fast-Moving Items Accessibility', 'placement', '{"abc_class": "A"}', '{"zone_types": ["picking"], "accessibility": "easy"}', 90),
('Temperature Sensitive Storage', 'placement', '{"temperature_sensitive": true}', '{"temperature_controlled": true}', 95);

-- Create indexes for performance optimization
CREATE INDEX idx_storage_positions_utilization ON storage_positions(current_utilization, capacity_units);
CREATE INDEX idx_inventory_batches_storage_position ON inventory_batches(storage_position_id, current_quantity);
CREATE INDEX idx_location_transfers_composite ON location_transfers(status, priority, from_location_id, to_location_id);

-- Views for common queries

-- Storage efficiency by location
CREATE VIEW v_location_storage_efficiency AS
SELECT 
    l.id as location_id,
    l.location_name,
    COUNT(sp.id) as total_positions,
    SUM(sp.capacity_units) as total_capacity,
    SUM(sp.current_utilization) as total_utilization,
    ROUND(SUM(sp.current_utilization) / SUM(sp.capacity_units) * 100, 2) as utilization_percentage,
    COUNT(CASE WHEN sp.current_utilization = 0 THEN 1 END) as empty_positions,
    COUNT(CASE WHEN sp.current_utilization >= sp.capacity_units * 0.9 THEN 1 END) as near_full_positions
FROM locations l
JOIN location_zones lz ON l.id = lz.location_id
JOIN storage_positions sp ON lz.id = sp.zone_id
WHERE sp.is_blocked = FALSE
GROUP BY l.id, l.location_name;

-- Cross-location inventory availability
CREATE VIEW v_cross_location_inventory AS
SELECT 
    p.id as product_id,
    p.product_name,
    l.id as location_id,
    l.location_name,
    l.city,
    l.state,
    SUM(ib.current_quantity) as available_quantity,
    AVG(ib.landed_cost_per_unit) as average_cost,
    COUNT(ib.id) as batch_count,
    MIN(ib.expiry_date) as earliest_expiry,
    MAX(ib.expiry_date) as latest_expiry
FROM products p
JOIN inventory_batches ib ON p.id = ib.product_id
JOIN locations l ON ib.location_id = l.id
WHERE ib.current_quantity > 0
GROUP BY p.id, p.product_name, l.id, l.location_name, l.city, l.state;

-- Storage position performance metrics
CREATE VIEW v_storage_position_performance AS
SELECT 
    sp.id as position_id,
    sp.position_code,
    lz.zone_name,
    l.location_name,
    sp.capacity_units,
    sp.current_utilization,
    ROUND(sp.current_utilization / sp.capacity_units * 100, 2) as utilization_percentage,
    sp.accessibility,
    sp.picking_sequence,
    COALESCE(sul.turnover_rate, 0) as daily_turnover_rate,
    COALESCE(sul.picking_efficiency_score, 0) as picking_efficiency
FROM storage_positions sp
JOIN location_zones lz ON sp.zone_id = lz.id
JOIN locations l ON lz.location_id = l.id
LEFT JOIN storage_utilization_log sul ON sp.id = sul.position_id 
    AND sul.utilization_date = CURDATE()
WHERE sp.is_blocked = FALSE;