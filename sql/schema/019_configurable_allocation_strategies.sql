-- ================================
-- VTRIA ERP: Configurable Inventory Allocation Strategies
-- Intelligent allocation based on multiple business criteria
-- ================================

-- Allocation Strategy Templates
CREATE TABLE allocation_strategies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Strategy Information
    strategy_name VARCHAR(100) NOT NULL,
    strategy_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    
    -- Strategy Type
    strategy_type ENUM('cost_optimization', 'warranty_optimization', 'inventory_rotation', 'custom') NOT NULL,
    
    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Usage Context
    applicable_to ENUM('all_products', 'specific_categories', 'specific_products') DEFAULT 'all_products',
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_strategy_code (strategy_code),
    INDEX idx_strategy_type (strategy_type)
);

-- Allocation Strategy Rules (Criteria and Weights)
CREATE TABLE allocation_strategy_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    strategy_id INT NOT NULL,
    
    -- Rule Criteria
    criteria_type ENUM(
        'purchase_price', 'warranty_remaining', 'purchase_date', 'batch_age',
        'performance_rating', 'failure_count', 'expiry_date', 'supplier_preference',
        'location_preference', 'customer_priority', 'project_margin'
    ) NOT NULL,
    
    -- Rule Configuration
    sort_order ENUM('asc', 'desc') NOT NULL, -- asc = lowest first, desc = highest first
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.00, -- Importance weight (0.1 to 10.0)
    rule_priority INT NOT NULL DEFAULT 1, -- Order of rule application (1 = highest)
    
    -- Conditional Rules
    apply_condition JSON, -- Conditions when this rule applies
    min_threshold DECIMAL(12,4), -- Minimum value threshold
    max_threshold DECIMAL(12,4), -- Maximum value threshold
    
    -- Rule Status
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (strategy_id) REFERENCES allocation_strategies(id) ON DELETE CASCADE,
    INDEX idx_strategy_rules (strategy_id, rule_priority),
    INDEX idx_criteria_type (criteria_type)
);

-- Product-Specific Allocation Preferences
CREATE TABLE product_allocation_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Product Information
    product_id INT,
    product_category_id INT,
    
    -- Default Strategy
    default_strategy_id INT NOT NULL,
    
    -- Override Rules for Specific Scenarios
    high_value_strategy_id INT, -- For projects above certain value
    high_value_threshold DECIMAL(12,2),
    
    critical_project_strategy_id INT, -- For critical/priority projects
    standard_project_strategy_id INT, -- For regular projects
    
    -- Customer-Specific Strategies
    premium_customer_strategy_id INT,
    regular_customer_strategy_id INT,
    
    -- Seasonal/Contextual
    seasonal_strategy_id INT,
    seasonal_start_date DATE,
    seasonal_end_date DATE,
    
    -- Audit
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (product_category_id) REFERENCES product_categories(id),
    FOREIGN KEY (default_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (high_value_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (critical_project_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (standard_project_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (premium_customer_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (regular_customer_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (seasonal_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    UNIQUE KEY unique_product (product_id),
    UNIQUE KEY unique_category (product_category_id),
    INDEX idx_product_strategy (product_id, default_strategy_id)
);

-- Project-Level Allocation Overrides
CREATE TABLE project_allocation_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Project Reference
    reference_type ENUM('estimation', 'quotation', 'sales_order') NOT NULL,
    reference_id INT NOT NULL,
    
    -- Override Configuration
    override_strategy_id INT NOT NULL,
    override_reason ENUM(
        'customer_requirement', 'margin_optimization', 'warranty_requirement',
        'performance_requirement', 'cost_constraint', 'inventory_clearance', 'other'
    ) NOT NULL,
    override_notes TEXT,
    
    -- Specific Product Overrides (optional)
    product_id INT, -- NULL means applies to all products in this project
    
    -- Approval
    requested_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (override_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_approval_status (approval_status)
);

-- ================================
-- STORED PROCEDURES FOR INTELLIGENT ALLOCATION
-- ================================

DELIMITER //

-- Function to calculate allocation score for a serial/batch
CREATE FUNCTION CalculateAllocationScore(
    p_strategy_id INT,
    p_serial_id INT,
    p_batch_id INT,
    p_project_context JSON
) RETURNS DECIMAL(10,4)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_criteria VARCHAR(50);
    DECLARE v_sort_order VARCHAR(4);
    DECLARE v_weight DECIMAL(5,2);
    DECLARE v_rule_priority INT;
    DECLARE v_score DECIMAL(10,4) DEFAULT 0;
    DECLARE v_criteria_value DECIMAL(12,4);
    DECLARE v_normalized_value DECIMAL(10,4);
    
    -- Cursor to get strategy rules
    DECLARE rule_cursor CURSOR FOR
        SELECT criteria_type, sort_order, weight, rule_priority
        FROM allocation_strategy_rules
        WHERE strategy_id = p_strategy_id 
        AND is_active = TRUE
        ORDER BY rule_priority ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN rule_cursor;
    
    rule_loop: LOOP
        FETCH rule_cursor INTO v_criteria, v_sort_order, v_weight, v_rule_priority;
        
        IF done THEN
            LEAVE rule_loop;
        END IF;
        
        -- Calculate criteria-specific value
        CASE v_criteria
            WHEN 'purchase_price' THEN
                SELECT ib.purchase_price INTO v_criteria_value
                FROM inventory_batches ib
                WHERE ib.id = p_batch_id;
                
            WHEN 'warranty_remaining' THEN
                SELECT DATEDIFF(sn.warranty_end_date, CURDATE()) INTO v_criteria_value
                FROM inventory_serial_numbers sn
                WHERE sn.id = p_serial_id;
                
            WHEN 'purchase_date' THEN
                SELECT DATEDIFF(CURDATE(), ib.purchase_date) INTO v_criteria_value
                FROM inventory_batches ib
                WHERE ib.id = p_batch_id;
                
            WHEN 'performance_rating' THEN
                SELECT 
                    CASE snp.performance_rating
                        WHEN 'excellent' THEN 100
                        WHEN 'good' THEN 80
                        WHEN 'average' THEN 60
                        WHEN 'poor' THEN 30
                        ELSE 50
                    END INTO v_criteria_value
                FROM serial_number_performance snp
                WHERE snp.serial_number_id = p_serial_id
                ORDER BY snp.recorded_at DESC
                LIMIT 1;
                
            WHEN 'failure_count' THEN
                SELECT COALESCE(snp.failure_count, 0) INTO v_criteria_value
                FROM serial_number_performance snp
                WHERE snp.serial_number_id = p_serial_id
                ORDER BY snp.recorded_at DESC
                LIMIT 1;
                
            ELSE
                SET v_criteria_value = 0;
        END CASE;
        
        -- Normalize value (0-100 scale)
        -- For ASC sorting: lower values get higher scores
        -- For DESC sorting: higher values get higher scores
        IF v_sort_order = 'asc' THEN
            SET v_normalized_value = 100 - (v_criteria_value / 100); -- Adjust based on typical ranges
        ELSE
            SET v_normalized_value = v_criteria_value / 100; -- Adjust based on typical ranges
        END IF;
        
        -- Add weighted score
        SET v_score = v_score + (v_normalized_value * v_weight);
        
    END LOOP;
    
    CLOSE rule_cursor;
    
    RETURN v_score;
END//

-- Procedure to get recommended allocation based on strategy
CREATE PROCEDURE GetRecommendedAllocation(
    IN p_product_id INT,
    IN p_location_id INT,
    IN p_quantity INT,
    IN p_strategy_id INT,
    IN p_project_context JSON
)
BEGIN
    SELECT 
        sn.id as serial_number_id,
        sn.serial_number,
        ib.id as batch_id,
        ib.batch_number,
        ib.purchase_price as unit_cost,
        sn.warranty_end_date,
        sn.condition_status,
        sn.status,
        CalculateAllocationScore(p_strategy_id, sn.id, ib.id, p_project_context) as allocation_score,
        
        -- Strategy breakdown for transparency
        JSON_OBJECT(
            'purchase_price', ib.purchase_price,
            'warranty_days', DATEDIFF(sn.warranty_end_date, CURDATE()),
            'batch_age_days', DATEDIFF(CURDATE(), ib.purchase_date),
            'performance_rating', COALESCE(snp.performance_rating, 'unrated'),
            'failure_count', COALESCE(snp.failure_count, 0)
        ) as criteria_details
        
    FROM inventory_serial_numbers sn
    LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
        AND sn.purchase_date = ib.purchase_date
        AND sn.location_id = ib.location_id
    LEFT JOIN serial_number_performance snp ON sn.id = snp.serial_number_id
    WHERE sn.product_id = p_product_id
    AND sn.location_id = p_location_id
    AND sn.status = 'available'
    ORDER BY allocation_score DESC
    LIMIT p_quantity;
END//

-- Function to determine best strategy for a project
CREATE FUNCTION DetermineBestStrategy(
    p_product_id INT,
    p_project_value DECIMAL(12,2),
    p_customer_type ENUM('premium', 'regular'),
    p_project_priority ENUM('critical', 'standard')
) RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_strategy_id INT DEFAULT 1;
    
    -- Get product-specific preferences
    SELECT 
        CASE 
            WHEN p_project_priority = 'critical' THEN COALESCE(critical_project_strategy_id, default_strategy_id)
            WHEN p_customer_type = 'premium' THEN COALESCE(premium_customer_strategy_id, default_strategy_id)
            WHEN p_project_value >= COALESCE(high_value_threshold, 999999) THEN COALESCE(high_value_strategy_id, default_strategy_id)
            ELSE default_strategy_id
        END INTO v_strategy_id
    FROM product_allocation_preferences
    WHERE product_id = p_product_id;
    
    RETURN COALESCE(v_strategy_id, 1);
END//

DELIMITER ;

-- ================================
-- PREDEFINED ALLOCATION STRATEGIES
-- ================================

-- 1. Cost Optimization Strategy (Lowest Price First)
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description, is_default) VALUES
('Cost Optimization', 'COST_OPT', 'cost_optimization', 'Prioritize lowest cost inventory to maximize project margins', TRUE);

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(1, 'purchase_price', 'asc', 5.0, 1),  -- Lowest price first (highest priority)
(1, 'warranty_remaining', 'desc', 2.0, 2), -- Prefer longer warranty (secondary)
(1, 'performance_rating', 'desc', 1.0, 3); -- Prefer better performance (tertiary)

-- 2. Warranty Maximization Strategy (Longest Warranty First)
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description) VALUES
('Warranty Maximization', 'WARRANTY_MAX', 'warranty_optimization', 'Prioritize inventory with longest remaining warranty');

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(2, 'warranty_remaining', 'desc', 5.0, 1), -- Longest warranty first
(2, 'performance_rating', 'desc', 3.0, 2), -- Prefer better performance
(2, 'purchase_price', 'asc', 1.0, 3);      -- Consider price last

-- 3. FIFO Inventory Rotation (Oldest First)
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description) VALUES
('FIFO Rotation', 'FIFO_ROTATION', 'inventory_rotation', 'First In, First Out - clear older inventory first');

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(3, 'purchase_date', 'desc', 5.0, 1),      -- Oldest first (purchase_date desc means older dates = higher values)
(3, 'expiry_date', 'asc', 3.0, 2),         -- Shortest expiry first
(3, 'warranty_remaining', 'desc', 2.0, 3); -- Prefer longer warranty

-- 4. Performance Priority Strategy
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description) VALUES
('Performance Priority', 'PERF_PRIORITY', 'custom', 'Prioritize highest performing inventory with lowest failure rates');

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(4, 'performance_rating', 'desc', 5.0, 1), -- Best performance first
(4, 'failure_count', 'asc', 4.0, 2),       -- Lowest failures first
(4, 'warranty_remaining', 'desc', 3.0, 3), -- Longer warranty preferred
(4, 'purchase_price', 'asc', 1.0, 4);      -- Cost considered last

-- 5. Balanced Strategy (Mixed Criteria)
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description) VALUES
('Balanced Approach', 'BALANCED', 'custom', 'Balanced consideration of cost, warranty, and performance');

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(5, 'purchase_price', 'asc', 3.0, 1),      -- Cost important
(5, 'warranty_remaining', 'desc', 3.0, 2), -- Warranty important  
(5, 'performance_rating', 'desc', 3.0, 3), -- Performance important
(5, 'failure_count', 'asc', 2.0, 4);       -- Avoid failures

-- 6. Premium Customer Strategy
INSERT INTO allocation_strategies (strategy_name, strategy_code, strategy_type, description) VALUES
('Premium Customer', 'PREMIUM_CUST', 'custom', 'Best quality inventory for premium customers');

INSERT INTO allocation_strategy_rules (strategy_id, criteria_type, sort_order, weight, rule_priority) VALUES
(6, 'performance_rating', 'desc', 5.0, 1), -- Best performance
(6, 'failure_count', 'asc', 4.0, 2),       -- Zero/low failures
(6, 'warranty_remaining', 'desc', 4.0, 3), -- Maximum warranty
(6, 'purchase_price', 'desc', 1.0, 4);     -- Premium pricing acceptable

-- ================================
-- DEFAULT PRODUCT PREFERENCES
-- ================================

-- Set default strategies for different product categories
INSERT INTO product_allocation_preferences (product_category_id, default_strategy_id, high_value_strategy_id, high_value_threshold, critical_project_strategy_id, premium_customer_strategy_id)
SELECT 
    pc.id,
    1,  -- Cost optimization for regular projects
    4,  -- Performance priority for high-value projects  
    100000, -- Above 1 lakh
    4,  -- Performance priority for critical projects
    6   -- Premium customer strategy
FROM product_categories pc
WHERE pc.name IN ('Motors', 'Control Panels', 'Drives');

-- Different strategy for consumables
INSERT INTO product_allocation_preferences (product_category_id, default_strategy_id, high_value_strategy_id, critical_project_strategy_id, premium_customer_strategy_id)
SELECT 
    pc.id,
    3,  -- FIFO rotation for consumables
    3,  -- Still FIFO for high value
    3,  -- FIFO even for critical (consumables don't vary much)
    3   -- FIFO for premium customers too
FROM product_categories pc  
WHERE pc.name IN ('Cables and Wires', 'Electrical Components');

-- ================================
-- VIEWS FOR STRATEGY ANALYSIS
-- ================================

-- View showing allocation recommendations
CREATE VIEW v_allocation_recommendations AS
SELECT 
    sn.id as serial_number_id,
    sn.serial_number,
    p.name as product_name,
    p.product_code,
    l.name as location_name,
    ib.purchase_price,
    ib.purchase_date,
    DATEDIFF(sn.warranty_end_date, CURDATE()) as warranty_days_remaining,
    COALESCE(snp.performance_rating, 'unrated') as performance_rating,
    COALESCE(snp.failure_count, 0) as failure_count,
    sn.condition_status,
    
    -- Strategy scores for different approaches
    CalculateAllocationScore(1, sn.id, ib.id, '{}') as cost_opt_score,
    CalculateAllocationScore(2, sn.id, ib.id, '{}') as warranty_max_score,
    CalculateAllocationScore(3, sn.id, ib.id, '{}') as fifo_score,
    CalculateAllocationScore(4, sn.id, ib.id, '{}') as performance_score,
    CalculateAllocationScore(5, sn.id, ib.id, '{}') as balanced_score
    
FROM inventory_serial_numbers sn
LEFT JOIN products p ON sn.product_id = p.id
LEFT JOIN locations l ON sn.location_id = l.id
LEFT JOIN inventory_batches ib ON sn.product_id = ib.product_id 
    AND sn.purchase_date = ib.purchase_date
    AND sn.location_id = ib.location_id
LEFT JOIN serial_number_performance snp ON sn.id = snp.serial_number_id
WHERE sn.status = 'available';