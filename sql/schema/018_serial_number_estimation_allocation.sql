-- ================================
-- VTRIA ERP: Serial Number Allocation During Estimation
-- Handles specific serial number selection during design/estimation phase
-- ================================

-- Enhanced estimation items to track specific serial number allocations
ALTER TABLE estimation_items 
ADD COLUMN allocation_type ENUM('any_available', 'specific_serial', 'specific_batch', 'new_purchase') DEFAULT 'any_available' AFTER final_price,
ADD COLUMN specific_batch_id INT AFTER allocation_type,
ADD COLUMN preferred_serial_numbers JSON AFTER specific_batch_id, -- Array of specific serial numbers
ADD COLUMN estimated_unit_cost DECIMAL(12,4) AFTER preferred_serial_numbers,
ADD COLUMN cost_calculation_method ENUM('current_fifo', 'current_lifo', 'average', 'last_purchase', 'manual') DEFAULT 'current_fifo' AFTER estimated_unit_cost,
ADD COLUMN notes TEXT AFTER cost_calculation_method;

-- Add foreign key for batch reference
ALTER TABLE estimation_items 
ADD FOREIGN KEY (specific_batch_id) REFERENCES inventory_batches(id);

-- Serial Number Estimation Allocations (during design phase)
CREATE TABLE estimation_serial_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Estimation Reference
    estimation_id INT NOT NULL,
    estimation_item_id INT NOT NULL,
    
    -- Product Information
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Serial Number Allocation
    serial_number_id INT, -- Reference to existing serial number
    serial_number VARCHAR(255), -- Specific serial number (if exists)
    
    -- Batch Information
    batch_id INT, -- Which batch this serial comes from
    unit_cost DECIMAL(12,4), -- Cost of this specific serial number
    
    -- Allocation Details
    allocation_reason ENUM('performance_requirement', 'warranty_requirement', 'client_specification', 'technical_compatibility', 'cost_optimization') NOT NULL,
    technical_specification TEXT, -- Why this specific serial was chosen
    
    -- Warranty Information
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_terms TEXT,
    
    -- Status
    status ENUM('tentative', 'reserved', 'confirmed', 'released') DEFAULT 'tentative',
    
    -- User Tracking
    allocated_by INT NOT NULL, -- Designer who made the allocation
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (estimation_item_id) REFERENCES estimation_items(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id),
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    FOREIGN KEY (allocated_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_estimation (estimation_id),
    INDEX idx_estimation_item (estimation_item_id),
    INDEX idx_serial_number (serial_number_id),
    INDEX idx_status (status)
);

-- Product Serial Number Requirements (for products that need specific serial tracking)
CREATE TABLE product_serial_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    
    -- Requirement Details
    requires_specific_serial BOOLEAN DEFAULT FALSE,
    serial_selection_criteria JSON, -- Criteria for serial selection
    
    -- Performance Requirements
    performance_parameters JSON, -- Expected performance parameters
    compatibility_requirements TEXT,
    
    -- Warranty Requirements  
    minimum_warranty_months INT DEFAULT 0,
    preferred_warranty_type VARCHAR(100),
    
    -- Technical Requirements
    technical_specifications JSON,
    calibration_requirements TEXT,
    certification_requirements TEXT,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    UNIQUE KEY unique_product (product_id)
);

-- Serial Number Performance History (to track which serials perform better)
CREATE TABLE serial_number_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number_id INT NOT NULL,
    
    -- Performance Metrics
    installation_date DATE,
    last_service_date DATE,
    performance_rating ENUM('excellent', 'good', 'average', 'poor') DEFAULT 'good',
    failure_count INT DEFAULT 0,
    
    -- Technical Data
    performance_data JSON, -- Actual performance measurements
    service_history JSON, -- Service and maintenance records
    
    -- Customer Feedback
    customer_satisfaction ENUM('very_satisfied', 'satisfied', 'neutral', 'dissatisfied') DEFAULT 'satisfied',
    feedback_notes TEXT,
    
    recorded_by INT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (serial_number_id) REFERENCES inventory_serial_numbers(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    
    INDEX idx_serial_number (serial_number_id),
    INDEX idx_performance_rating (performance_rating)
);

-- ================================
-- STORED PROCEDURES FOR SERIAL ALLOCATION
-- ================================

DELIMITER //

-- Procedure to find best available serial numbers for a product
CREATE PROCEDURE FindBestSerialNumbers(
    IN p_product_id INT,
    IN p_location_id INT,
    IN p_quantity INT,
    IN p_requirements JSON
)
BEGIN
    DECLARE v_requires_specific BOOLEAN DEFAULT FALSE;
    
    -- Check if product requires specific serial selection
    SELECT requires_specific_serial INTO v_requires_specific
    FROM product_serial_requirements
    WHERE product_id = p_product_id;
    
    IF v_requires_specific THEN
        -- Return best performing serials with full details
        SELECT 
            sn.id as serial_number_id,
            sn.serial_number,
            sn.warranty_end_date,
            sn.condition_status,
            ib.purchase_price as unit_cost,
            ib.batch_number,
            ib.purchase_date,
            snp.performance_rating,
            snp.failure_count,
            psr.serial_selection_criteria,
            -- Calculate compatibility score
            CASE 
                WHEN snp.performance_rating = 'excellent' THEN 100
                WHEN snp.performance_rating = 'good' THEN 80
                WHEN snp.performance_rating = 'average' THEN 60
                ELSE 40
            END as compatibility_score
        FROM inventory_serial_numbers sn
        LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
            AND sn.purchase_date = ib.purchase_date
            AND sn.location_id = ib.location_id
        LEFT JOIN serial_number_performance snp ON sn.id = snp.serial_number_id
        LEFT JOIN product_serial_requirements psr ON sn.product_id = psr.product_id
        WHERE sn.product_id = p_product_id
        AND sn.location_id = p_location_id
        AND sn.status = 'available'
        AND sn.warranty_status = 'active'
        ORDER BY 
            snp.performance_rating DESC,
            snp.failure_count ASC,
            sn.warranty_end_date DESC
        LIMIT p_quantity;
    ELSE
        -- Return any available serials with cost information
        SELECT 
            sn.id as serial_number_id,
            sn.serial_number,
            sn.warranty_end_date,
            sn.condition_status,
            ib.purchase_price as unit_cost,
            ib.batch_number,
            ib.purchase_date,
            'N/A' as performance_rating,
            0 as failure_count,
            NULL as serial_selection_criteria,
            50 as compatibility_score -- Default score
        FROM inventory_serial_numbers sn
        LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
            AND sn.purchase_date = ib.purchase_date
            AND sn.location_id = ib.location_id
        WHERE sn.product_id = p_product_id
        AND sn.location_id = p_location_id
        AND sn.status = 'available'
        ORDER BY ib.purchase_date ASC -- FIFO
        LIMIT p_quantity;
    END IF;
END//

-- Procedure to allocate specific serial numbers to estimation
CREATE PROCEDURE AllocateSerialToEstimation(
    IN p_estimation_id INT,
    IN p_estimation_item_id INT,
    IN p_serial_number_ids JSON,
    IN p_allocation_reason VARCHAR(100),
    IN p_allocated_by INT
)
BEGIN
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_serial_id INT;
    DECLARE v_serial_count INT;
    DECLARE v_product_id INT;
    DECLARE v_location_id INT;
    
    -- Get product and location from estimation item
    SELECT ei.product_id, e.location_id INTO v_product_id, v_location_id
    FROM estimation_items ei
    JOIN estimations e ON ei.estimation_id = e.id
    WHERE ei.id = p_estimation_item_id;
    
    -- Get array length
    SET v_serial_count = JSON_LENGTH(p_serial_number_ids);
    
    -- Loop through serial number IDs
    WHILE v_index < v_serial_count DO
        SET v_serial_id = JSON_UNQUOTE(JSON_EXTRACT(p_serial_number_ids, CONCAT('$[', v_index, ']')));
        
        -- Create allocation record
        INSERT INTO estimation_serial_allocations (
            estimation_id, estimation_item_id, product_id, location_id,
            serial_number_id, allocation_reason, allocated_by
        )
        SELECT 
            p_estimation_id, p_estimation_item_id, v_product_id, v_location_id,
            v_serial_id, p_allocation_reason, p_allocated_by
        FROM inventory_serial_numbers sn
        WHERE sn.id = v_serial_id
        AND sn.status = 'available';
        
        -- Update serial number status to reserved
        UPDATE inventory_serial_numbers 
        SET status = 'reserved'
        WHERE id = v_serial_id;
        
        SET v_index = v_index + 1;
    END WHILE;
    
    -- Update estimation item with specific allocation type
    UPDATE estimation_items 
    SET allocation_type = 'specific_serial'
    WHERE id = p_estimation_item_id;
    
END//

-- Function to calculate estimated cost with serial number allocation
CREATE FUNCTION CalculateEstimatedCostWithSerials(
    p_estimation_item_id INT
) RETURNS DECIMAL(12,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_total_cost DECIMAL(12,4) DEFAULT 0;
    DECLARE v_quantity INT DEFAULT 0;
    DECLARE v_unit_cost DECIMAL(12,4);
    
    -- Get quantity from estimation item
    SELECT quantity INTO v_quantity
    FROM estimation_items
    WHERE id = p_estimation_item_id;
    
    -- Check if specific serials are allocated
    SELECT SUM(esa.unit_cost) INTO v_total_cost
    FROM estimation_serial_allocations esa
    WHERE esa.estimation_item_id = p_estimation_item_id
    AND esa.status IN ('tentative', 'reserved', 'confirmed');
    
    IF v_total_cost IS NOT NULL THEN
        RETURN v_total_cost / v_quantity; -- Average unit cost
    ELSE
        -- Fall back to standard costing method
        SELECT 
            CASE ei.cost_calculation_method
                WHEN 'current_fifo' THEN CalculateInventoryCost(ei.product_id, l.id, 'fifo')
                WHEN 'current_lifo' THEN CalculateInventoryCost(ei.product_id, l.id, 'lifo')
                WHEN 'average' THEN CalculateInventoryCost(ei.product_id, l.id, 'average')
                WHEN 'last_purchase' THEN CalculateInventoryCost(ei.product_id, l.id, 'last')
                ELSE ei.estimated_unit_cost
            END INTO v_unit_cost
        FROM estimation_items ei
        JOIN estimations e ON ei.estimation_id = e.id
        JOIN locations l ON e.location_id = l.id
        WHERE ei.id = p_estimation_item_id;
        
        RETURN IFNULL(v_unit_cost, 0);
    END IF;
END//

DELIMITER ;

-- ================================
-- VIEWS FOR ESTIMATION SERIAL MANAGEMENT
-- ================================

-- View for estimation items with serial allocation details
CREATE VIEW v_estimation_items_with_serials AS
SELECT 
    ei.id as estimation_item_id,
    ei.estimation_id,
    e.estimation_id as estimation_number,
    p.name as product_name,
    p.product_code,
    ei.quantity,
    ei.allocation_type,
    
    -- Cost Information
    ei.estimated_unit_cost,
    CalculateEstimatedCostWithSerials(ei.id) as calculated_unit_cost,
    ei.cost_calculation_method,
    
    -- Serial Allocation Summary
    COUNT(esa.id) as allocated_serials_count,
    GROUP_CONCAT(DISTINCT sn.serial_number) as allocated_serial_numbers,
    AVG(ib.purchase_price) as avg_serial_cost,
    
    -- Status
    CASE 
        WHEN ei.allocation_type = 'specific_serial' AND COUNT(esa.id) = ei.quantity THEN 'FULLY_ALLOCATED'
        WHEN ei.allocation_type = 'specific_serial' AND COUNT(esa.id) > 0 THEN 'PARTIALLY_ALLOCATED'
        WHEN ei.allocation_type = 'specific_serial' THEN 'PENDING_ALLOCATION'
        ELSE 'NO_SPECIFIC_ALLOCATION'
    END as allocation_status

FROM estimation_items ei
LEFT JOIN estimations e ON ei.estimation_id = e.id
LEFT JOIN products p ON ei.product_id = p.id
LEFT JOIN estimation_serial_allocations esa ON ei.id = esa.estimation_item_id
LEFT JOIN inventory_serial_numbers sn ON esa.serial_number_id = sn.id
LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
    AND sn.purchase_date = ib.purchase_date
    AND sn.location_id = ib.location_id
GROUP BY ei.id;

-- View for serial number availability with performance data
CREATE VIEW v_serial_numbers_with_performance AS
SELECT 
    sn.id,
    sn.serial_number,
    p.name as product_name,
    p.product_code,
    l.name as location_name,
    sn.warranty_end_date,
    sn.condition_status,
    sn.status,
    
    -- Cost Information
    ib.purchase_price as unit_cost,
    ib.batch_number,
    ib.purchase_date,
    
    -- Performance Data
    COALESCE(snp.performance_rating, 'unrated') as performance_rating,
    COALESCE(snp.failure_count, 0) as failure_count,
    snp.customer_satisfaction,
    
    -- Availability Status
    CASE 
        WHEN sn.status != 'available' THEN 'NOT_AVAILABLE'
        WHEN sn.warranty_status = 'expired' THEN 'WARRANTY_EXPIRED'
        WHEN DATEDIFF(sn.warranty_end_date, CURDATE()) < 30 THEN 'WARRANTY_EXPIRING'
        ELSE 'AVAILABLE'
    END as availability_status,
    
    -- Requirements Compliance
    psr.requires_specific_serial,
    psr.serial_selection_criteria

FROM inventory_serial_numbers sn
LEFT JOIN products p ON sn.product_id = p.id
LEFT JOIN locations l ON sn.location_id = l.id
LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
    AND sn.purchase_date = ib.purchase_date
    AND sn.location_id = ib.location_id
LEFT JOIN serial_number_performance snp ON sn.id = snp.serial_number_id
LEFT JOIN product_serial_requirements psr ON sn.product_id = psr.product_id;