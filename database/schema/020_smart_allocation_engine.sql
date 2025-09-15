-- Smart Allocation Engine with Advanced Business Logic
-- Handles complex allocation scenarios based on business context and strategy

-- Create allocation strategy configurations table
CREATE TABLE allocation_strategies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    strategy_name VARCHAR(100) NOT NULL UNIQUE,
    strategy_code VARCHAR(20) NOT NULL UNIQUE,
    strategy_type ENUM('estimation', 'manufacturing', 'sales', 'transfer', 'adjustment') NOT NULL,
    description TEXT NULL,
    
    -- Primary allocation method
    primary_method ENUM('fifo', 'lifo', 'lowest_cost', 'highest_cost', 'expiry_based', 'performance_based', 'custom') NOT NULL,
    
    -- Business context considerations
    consider_warranty_expiry BOOLEAN DEFAULT TRUE,
    consider_cost_optimization BOOLEAN DEFAULT TRUE,
    consider_margin_protection BOOLEAN DEFAULT FALSE,
    consider_inventory_age BOOLEAN DEFAULT TRUE,
    consider_performance_rating BOOLEAN DEFAULT FALSE,
    consider_customer_tier BOOLEAN DEFAULT FALSE,
    consider_project_criticality BOOLEAN DEFAULT FALSE,
    
    -- Scoring weights (sum should be 100)
    cost_weight DECIMAL(5,2) DEFAULT 30.00 COMMENT 'Weight for cost considerations (0-100)',
    age_weight DECIMAL(5,2) DEFAULT 25.00 COMMENT 'Weight for inventory age (0-100)',
    warranty_weight DECIMAL(5,2) DEFAULT 20.00 COMMENT 'Weight for warranty remaining (0-100)',
    performance_weight DECIMAL(5,2) DEFAULT 15.00 COMMENT 'Weight for product performance (0-100)',
    expiry_weight DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Weight for expiry urgency (0-100)',
    
    -- Advanced rules
    allocation_rules JSON NULL COMMENT 'Complex allocation rules in JSON format',
    
    -- Risk management
    prevent_negative_margin BOOLEAN DEFAULT TRUE,
    minimum_margin_percentage DECIMAL(5,2) DEFAULT 10.00,
    maximum_age_days INT NULL COMMENT 'Max age of inventory to allocate',
    maximum_cost_variance_percentage DECIMAL(5,2) DEFAULT 20.00,
    
    -- Preferences
    prefer_single_batch BOOLEAN DEFAULT FALSE COMMENT 'Prefer single batch over multiple',
    allow_partial_allocation BOOLEAN DEFAULT TRUE,
    reserve_buffer_percentage DECIMAL(5,2) DEFAULT 5.00 COMMENT 'Reserve % for critical customers',
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    
    CHECK (cost_weight + age_weight + warranty_weight + performance_weight + expiry_weight = 100.00),
    KEY idx_strategy_type (strategy_type, is_active)
) COMMENT='Allocation strategy configurations for different business contexts';

-- Create allocation contexts table
CREATE TABLE allocation_contexts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    context_name VARCHAR(100) NOT NULL,
    context_type ENUM('customer_tier', 'project_type', 'order_priority', 'product_category', 'location_type') NOT NULL,
    context_value VARCHAR(100) NOT NULL,
    
    -- Strategy mappings
    estimation_strategy_id INT NULL,
    manufacturing_strategy_id INT NULL,
    sales_strategy_id INT NULL,
    
    -- Context-specific overrides
    margin_requirement_percentage DECIMAL(5,2) NULL COMMENT 'Required margin for this context',
    priority_multiplier DECIMAL(3,2) DEFAULT 1.00 COMMENT 'Priority multiplier for allocation',
    
    -- Special rules
    special_rules JSON NULL COMMENT 'Context-specific allocation rules',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (estimation_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (manufacturing_strategy_id) REFERENCES allocation_strategies(id),
    FOREIGN KEY (sales_strategy_id) REFERENCES allocation_strategies(id),
    
    UNIQUE KEY uk_context (context_type, context_value),
    KEY idx_context_type (context_type)
) COMMENT='Business contexts for allocation decisions';

-- Enhanced allocation scoring view with business logic
CREATE VIEW smart_allocation_view AS
SELECT 
    ib.id as batch_id,
    ib.product_id,
    p.name as product_name,
    ib.location_id,
    l.name as location_name,
    ib.available_quantity,
    
    -- Cost information
    ib.purchase_price,
    ib.landed_cost_per_unit,
    ib.purchase_date,
    ib.expiry_date,
    
    -- Age calculations
    DATEDIFF(CURDATE(), ib.purchase_date) as inventory_age_days,
    CASE 
        WHEN ib.expiry_date IS NOT NULL THEN DATEDIFF(ib.expiry_date, CURDATE())
        ELSE NULL
    END as days_to_expiry,
    
    -- Warranty calculations
    CASE 
        WHEN p.warranty_period_months IS NOT NULL THEN 
            GREATEST(0, DATEDIFF(
                DATE_ADD(ib.purchase_date, INTERVAL p.warranty_period_months MONTH), 
                CURDATE()
            ))
        ELSE NULL
    END as warranty_days_remaining,
    
    -- Cost position analysis
    ib.landed_cost_per_unit / (
        SELECT AVG(ib2.landed_cost_per_unit) 
        FROM inventory_batches ib2 
        WHERE ib2.product_id = ib.product_id 
        AND ib2.available_quantity > 0
    ) as cost_position_ratio,
    
    -- Performance metrics (if available)
    COALESCE((
        SELECT AVG(
            CASE isn.performance_test_result
                WHEN 'excellent' THEN 100
                WHEN 'good' THEN 80
                WHEN 'acceptable' THEN 60
                ELSE 40
            END
        )
        FROM inventory_serial_numbers isn 
        WHERE isn.product_id = ib.product_id
        AND isn.purchase_date BETWEEN DATE_SUB(ib.purchase_date, INTERVAL 7 DAY) 
                                 AND DATE_ADD(ib.purchase_date, INTERVAL 7 DAY)
    ), 75) as batch_performance_score,
    
    -- Allocation scores for different contexts
    
    -- ESTIMATION SCORING (Margin Protection)
    (
        -- Use higher cost items for estimation to protect margins
        (ib.landed_cost_per_unit / (SELECT MAX(ib3.landed_cost_per_unit) 
                                   FROM inventory_batches ib3 
                                   WHERE ib3.product_id = ib.product_id 
                                   AND ib3.available_quantity > 0) * 40) +
        
        -- Prefer items with longer warranty remaining
        (CASE 
            WHEN p.warranty_period_months IS NOT NULL AND 
                 DATEDIFF(DATE_ADD(ib.purchase_date, INTERVAL p.warranty_period_months MONTH), CURDATE()) > 0
            THEN LEAST(30, DATEDIFF(DATE_ADD(ib.purchase_date, INTERVAL p.warranty_period_months MONTH), CURDATE()) / 10)
            ELSE 20
        END) +
        
        -- Penalize very old inventory
        (CASE 
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 180 THEN 10
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 90 THEN 20
            ELSE 30
        END)
    ) as estimation_score,
    
    -- MANUFACTURING SCORING (Cost Optimization)
    (
        -- Use lowest cost items for manufacturing
        ((SELECT MAX(ib4.landed_cost_per_unit) FROM inventory_batches ib4 
          WHERE ib4.product_id = ib.product_id AND ib4.available_quantity > 0) - 
         ib.landed_cost_per_unit) / 
        (SELECT MAX(ib4.landed_cost_per_unit) FROM inventory_batches ib4 
         WHERE ib4.product_id = ib.product_id AND ib4.available_quantity > 0) * 50 +
        
        -- FIFO for inventory management
        (CASE 
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 90 THEN 35
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 60 THEN 25
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 30 THEN 15
            ELSE 10
        END) +
        
        -- Expiry urgency
        (CASE 
            WHEN ib.expiry_date IS NOT NULL AND DATEDIFF(ib.expiry_date, CURDATE()) < 30 THEN 15
            WHEN ib.expiry_date IS NOT NULL AND DATEDIFF(ib.expiry_date, CURDATE()) < 90 THEN 10
            ELSE 5
        END)
    ) as manufacturing_score,
    
    -- SALES SCORING (Balanced Approach)
    (
        -- Balanced cost consideration
        (25 - ABS(25 - (ib.landed_cost_per_unit / 
                        (SELECT AVG(ib5.landed_cost_per_unit) 
                         FROM inventory_batches ib5 
                         WHERE ib5.product_id = ib.product_id 
                         AND ib5.available_quantity > 0) * 25))) +
        
        -- Age-based FIFO
        (CASE 
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 120 THEN 30
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 60 THEN 25
            WHEN DATEDIFF(CURDATE(), ib.purchase_date) > 30 THEN 20
            ELSE 15
        END) +
        
        -- Warranty consideration
        (CASE 
            WHEN p.warranty_period_months IS NOT NULL THEN
                LEAST(25, GREATEST(0, DATEDIFF(
                    DATE_ADD(ib.purchase_date, INTERVAL p.warranty_period_months MONTH), 
                    CURDATE()
                ) / 15))
            ELSE 15
        END) +
        
        -- Performance consideration
        (batch_performance_score / 100 * 20)
    ) as sales_score

FROM inventory_batches ib
LEFT JOIN products p ON ib.product_id = p.id
LEFT JOIN locations l ON ib.location_id = l.id
WHERE ib.status = 'active' 
AND ib.available_quantity > 0;

-- Create allocation execution log
CREATE TABLE allocation_executions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_reference VARCHAR(100) NOT NULL COMMENT 'Reference to estimation, order, etc.',
    allocation_type ENUM('estimation', 'manufacturing', 'sales', 'transfer', 'adjustment') NOT NULL,
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    
    -- Request details
    requested_quantity DECIMAL(10,2) NOT NULL,
    allocated_quantity DECIMAL(10,2) NOT NULL,
    remaining_quantity DECIMAL(10,2) GENERATED ALWAYS AS (requested_quantity - allocated_quantity) STORED,
    
    -- Strategy used
    strategy_id INT NULL,
    strategy_name VARCHAR(100) NULL,
    allocation_context JSON NULL COMMENT 'Context parameters used for allocation',
    
    -- Business context
    customer_tier ENUM('platinum', 'gold', 'silver', 'bronze', 'standard') NULL,
    project_priority ENUM('critical', 'high', 'normal', 'low') NULL,
    order_value DECIMAL(15,2) NULL,
    margin_requirement DECIMAL(5,2) NULL,
    
    -- Results
    average_allocated_cost DECIMAL(10,4) NOT NULL,
    total_allocated_value DECIMAL(15,2) NOT NULL,
    margin_achieved_percentage DECIMAL(5,2) NULL,
    allocation_efficiency_score DECIMAL(5,2) NULL COMMENT 'How efficient was the allocation',
    
    -- Metadata
    allocated_by INT NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (strategy_id) REFERENCES allocation_strategies(id),
    KEY idx_allocation_type (allocation_type, allocated_at),
    KEY idx_product_location (product_id, location_id),
    KEY idx_allocation_ref (allocation_reference)
) COMMENT='Log of all allocation executions for analysis';

-- Create allocation batch details (which batches were allocated)
CREATE TABLE allocation_batch_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_execution_id INT NOT NULL,
    batch_id INT NOT NULL,
    allocated_quantity DECIMAL(10,2) NOT NULL,
    batch_cost_per_unit DECIMAL(10,4) NOT NULL,
    allocation_score DECIMAL(10,2) NULL COMMENT 'Score that led to this batch selection',
    sequence_order INT NOT NULL COMMENT 'Order in which this batch was allocated',
    
    -- Batch metadata at time of allocation
    batch_age_days INT NULL,
    warranty_days_remaining INT NULL,
    batch_performance_score DECIMAL(5,2) NULL,
    
    FOREIGN KEY (allocation_execution_id) REFERENCES allocation_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
    KEY idx_allocation_batch (allocation_execution_id, sequence_order)
) COMMENT='Detailed breakdown of batch allocations';

-- Insert default allocation strategies
INSERT INTO allocation_strategies (
    strategy_name, strategy_code, strategy_type, description,
    primary_method, consider_warranty_expiry, consider_cost_optimization, consider_margin_protection,
    cost_weight, age_weight, warranty_weight, performance_weight, expiry_weight,
    prevent_negative_margin, minimum_margin_percentage, is_default
) VALUES 

-- ESTIMATION STRATEGIES (Margin Protection)
(
    'Estimation - Margin Protection', 'EST_MARGIN', 'estimation', 
    'Use higher cost items for estimation to protect margins and ensure profitability',
    'highest_cost', TRUE, FALSE, TRUE,
    40.00, 20.00, 25.00, 10.00, 5.00,
    TRUE, 15.00, TRUE
),

-- MANUFACTURING STRATEGIES (Cost Optimization)
(
    'Manufacturing - Cost Optimization', 'MFG_COST', 'manufacturing',
    'Use lowest cost items for manufacturing to maximize profitability',
    'lowest_cost', TRUE, TRUE, FALSE,
    50.00, 30.00, 15.00, 5.00, 0.00,
    FALSE, 0.00, TRUE
),

-- SALES STRATEGIES (Balanced)
(
    'Sales - Balanced FIFO', 'SALES_FIFO', 'sales',
    'Balanced approach considering cost, age, and warranty for customer orders',
    'fifo', TRUE, TRUE, FALSE,
    25.00, 35.00, 20.00, 15.00, 5.00,
    FALSE, 5.00, TRUE
),

-- PREMIUM CUSTOMER STRATEGY
(
    'Premium Customer - Best Quality', 'PREMIUM_QUAL', 'sales',
    'Allocate best quality items with longest warranty for premium customers',
    'performance_based', TRUE, FALSE, FALSE,
    15.00, 10.00, 35.00, 35.00, 5.00,
    FALSE, 0.00, FALSE
),

-- CRITICAL PROJECT STRATEGY
(
    'Critical Project - Reliability First', 'CRITICAL_REL', 'sales',
    'Prioritize reliability and performance for critical projects',
    'performance_based', TRUE, FALSE, FALSE,
    20.00, 15.00, 30.00, 30.00, 5.00,
    TRUE, 10.00, FALSE
);

-- Insert default allocation contexts
INSERT INTO allocation_contexts (
    context_name, context_type, context_value,
    estimation_strategy_id, manufacturing_strategy_id, sales_strategy_id,
    margin_requirement_percentage, priority_multiplier
) VALUES

-- Customer tier contexts
('Platinum Customer', 'customer_tier', 'platinum', 1, 2, 4, 20.00, 1.50),
('Gold Customer', 'customer_tier', 'gold', 1, 2, 4, 15.00, 1.25),
('Standard Customer', 'customer_tier', 'standard', 1, 2, 3, 10.00, 1.00),

-- Project type contexts  
('Critical Project', 'project_type', 'critical', 1, 2, 5, 15.00, 2.00),
('Standard Project', 'project_type', 'standard', 1, 2, 3, 10.00, 1.00),

-- Product category contexts
('High Value Equipment', 'product_category', 'high_value', 1, 2, 4, 20.00, 1.30),
('Standard Components', 'product_category', 'standard', 1, 2, 3, 12.00, 1.00);

-- Create stored procedure for smart allocation
DELIMITER //

CREATE PROCEDURE ExecuteSmartAllocation(
    IN p_allocation_reference VARCHAR(100),
    IN p_allocation_type ENUM('estimation', 'manufacturing', 'sales', 'transfer', 'adjustment'),
    IN p_product_id INT,
    IN p_location_id INT,
    IN p_requested_quantity DECIMAL(10,2),
    IN p_customer_tier ENUM('platinum', 'gold', 'silver', 'bronze', 'standard') DEFAULT 'standard',
    IN p_project_priority ENUM('critical', 'high', 'normal', 'low') DEFAULT 'normal',
    IN p_order_value DECIMAL(15,2) DEFAULT NULL,
    IN p_margin_requirement DECIMAL(5,2) DEFAULT NULL,
    IN p_allocated_by INT DEFAULT 1
)
BEGIN
    DECLARE v_strategy_id INT;
    DECLARE v_strategy_name VARCHAR(100);
    DECLARE v_remaining_quantity DECIMAL(10,2);
    DECLARE v_total_allocated_value DECIMAL(15,2) DEFAULT 0;
    DECLARE v_total_allocated_quantity DECIMAL(10,2) DEFAULT 0;
    DECLARE v_allocation_execution_id INT;
    DECLARE v_sequence_order INT DEFAULT 1;
    
    -- Batch allocation variables
    DECLARE v_batch_id INT;
    DECLARE v_batch_quantity DECIMAL(10,2);
    DECLARE v_batch_cost DECIMAL(10,4);
    DECLARE v_allocation_score DECIMAL(10,2);
    DECLARE v_allocate_qty DECIMAL(10,2);
    
    DECLARE done INT DEFAULT FALSE;
    DECLARE batch_cursor CURSOR FOR
        SELECT 
            batch_id,
            available_quantity,
            landed_cost_per_unit,
            CASE p_allocation_type
                WHEN 'estimation' THEN estimation_score
                WHEN 'manufacturing' THEN manufacturing_score
                WHEN 'sales' THEN sales_score
                ELSE sales_score
            END as score
        FROM smart_allocation_view
        WHERE product_id = p_product_id 
        AND location_id = p_location_id
        AND available_quantity > 0
        ORDER BY 
            CASE p_allocation_type
                WHEN 'estimation' THEN estimation_score
                WHEN 'manufacturing' THEN manufacturing_score
                WHEN 'sales' THEN sales_score
                ELSE sales_score
            END DESC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Determine allocation strategy based on context
    SELECT 
        CASE p_allocation_type
            WHEN 'estimation' THEN COALESCE(ac.estimation_strategy_id, 1)
            WHEN 'manufacturing' THEN COALESCE(ac.manufacturing_strategy_id, 2)
            WHEN 'sales' THEN COALESCE(ac.sales_strategy_id, 3)
            ELSE 3
        END,
        CASE p_allocation_type
            WHEN 'estimation' THEN COALESCE(ase.strategy_name, 'Estimation - Margin Protection')
            WHEN 'manufacturing' THEN COALESCE(asm.strategy_name, 'Manufacturing - Cost Optimization')
            WHEN 'sales' THEN COALESCE(ass.strategy_name, 'Sales - Balanced FIFO')
            ELSE 'Sales - Balanced FIFO'
        END
    INTO v_strategy_id, v_strategy_name
    FROM allocation_contexts ac
    LEFT JOIN allocation_strategies ase ON ac.estimation_strategy_id = ase.id
    LEFT JOIN allocation_strategies asm ON ac.manufacturing_strategy_id = asm.id
    LEFT JOIN allocation_strategies ass ON ac.sales_strategy_id = ass.id
    WHERE ac.context_type = 'customer_tier' 
    AND ac.context_value = p_customer_tier
    LIMIT 1;
    
    -- If no specific context found, use defaults
    IF v_strategy_id IS NULL THEN
        SELECT id, strategy_name INTO v_strategy_id, v_strategy_name
        FROM allocation_strategies 
        WHERE strategy_type = p_allocation_type AND is_default = TRUE
        LIMIT 1;
    END IF;
    
    -- Create allocation execution record
    INSERT INTO allocation_executions (
        allocation_reference, allocation_type, product_id, location_id,
        requested_quantity, allocated_quantity, strategy_id, strategy_name,
        customer_tier, project_priority, order_value, margin_requirement,
        average_allocated_cost, total_allocated_value, allocated_by
    ) VALUES (
        p_allocation_reference, p_allocation_type, p_product_id, p_location_id,
        p_requested_quantity, 0, v_strategy_id, v_strategy_name,
        p_customer_tier, p_project_priority, p_order_value, p_margin_requirement,
        0, 0, p_allocated_by
    );
    
    SET v_allocation_execution_id = LAST_INSERT_ID();
    SET v_remaining_quantity = p_requested_quantity;
    
    -- Execute allocation using cursor
    OPEN batch_cursor;
    
    allocation_loop: LOOP
        FETCH batch_cursor INTO v_batch_id, v_batch_quantity, v_batch_cost, v_allocation_score;
        
        IF done OR v_remaining_quantity <= 0 THEN
            LEAVE allocation_loop;
        END IF;
        
        -- Determine quantity to allocate from this batch
        SET v_allocate_qty = LEAST(v_remaining_quantity, v_batch_quantity);
        
        -- Record batch allocation
        INSERT INTO allocation_batch_details (
            allocation_execution_id, batch_id, allocated_quantity,
            batch_cost_per_unit, allocation_score, sequence_order
        ) VALUES (
            v_allocation_execution_id, v_batch_id, v_allocate_qty,
            v_batch_cost, v_allocation_score, v_sequence_order
        );
        
        -- Update running totals
        SET v_total_allocated_quantity = v_total_allocated_quantity + v_allocate_qty;
        SET v_total_allocated_value = v_total_allocated_value + (v_allocate_qty * v_batch_cost);
        SET v_remaining_quantity = v_remaining_quantity - v_allocate_qty;
        SET v_sequence_order = v_sequence_order + 1;
        
        -- Reserve the inventory (don't actually reduce, just reserve)
        UPDATE inventory_batches 
        SET reserved_quantity = reserved_quantity + v_allocate_qty,
            available_quantity = available_quantity - v_allocate_qty
        WHERE id = v_batch_id;
        
    END LOOP;
    
    CLOSE batch_cursor;
    
    -- Update allocation execution with results
    UPDATE allocation_executions SET
        allocated_quantity = v_total_allocated_quantity,
        average_allocated_cost = CASE 
            WHEN v_total_allocated_quantity > 0 THEN v_total_allocated_value / v_total_allocated_quantity 
            ELSE 0 
        END,
        total_allocated_value = v_total_allocated_value,
        allocation_efficiency_score = (v_total_allocated_quantity / p_requested_quantity * 100)
    WHERE id = v_allocation_execution_id;
    
    -- Return results
    SELECT 
        v_allocation_execution_id as allocation_id,
        v_total_allocated_quantity as allocated_quantity,
        (v_total_allocated_value / v_total_allocated_quantity) as average_cost,
        v_total_allocated_value as total_value,
        v_strategy_name as strategy_used,
        (v_total_allocated_quantity / p_requested_quantity * 100) as fulfillment_percentage;
    
END //

DELIMITER ;

-- Create performance tracking for allocation strategies
CREATE TABLE allocation_strategy_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    strategy_id INT NOT NULL,
    
    -- Performance metrics
    total_executions INT DEFAULT 0,
    total_quantity_allocated DECIMAL(15,2) DEFAULT 0,
    total_value_allocated DECIMAL(20,2) DEFAULT 0,
    average_cost_achieved DECIMAL(10,4) DEFAULT 0,
    average_fulfillment_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Efficiency metrics
    average_batches_used DECIMAL(5,2) DEFAULT 0,
    average_allocation_score DECIMAL(5,2) DEFAULT 0,
    
    -- Business impact
    margin_protection_score DECIMAL(5,2) DEFAULT 0 COMMENT 'How well it protects margins',
    inventory_turnover_impact DECIMAL(5,2) DEFAULT 0 COMMENT 'Impact on inventory turnover',
    
    -- Period tracking
    measurement_period_start DATE NOT NULL,
    measurement_period_end DATE NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (strategy_id) REFERENCES allocation_strategies(id),
    UNIQUE KEY uk_strategy_period (strategy_id, measurement_period_start, measurement_period_end)
) COMMENT='Performance tracking for allocation strategies';

-- Create indexes for optimal performance
CREATE INDEX idx_smart_allocation_product ON smart_allocation_view(product_id, location_id);
CREATE INDEX idx_allocation_scoring ON inventory_batches(product_id, location_id, available_quantity) WHERE status = 'active';
CREATE INDEX idx_allocation_executions_ref ON allocation_executions(allocation_reference, allocation_type);

COMMENT ON TABLE allocation_strategies IS 'Configurable allocation strategies for different business contexts';
COMMENT ON VIEW smart_allocation_view IS 'Intelligent allocation scoring for estimation, manufacturing, and sales contexts';
COMMENT ON PROCEDURE ExecuteSmartAllocation IS 'Execute smart allocation based on business context and strategy';