-- Advanced Margin Analysis for Quotations
-- Comprehensive margin calculation with market intelligence and competitive analysis
-- Real-time profitability insights for quotation optimization

-- Enhanced quotation margin analysis
CREATE TABLE quotation_margin_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_id INT NOT NULL,
    quotation_line_id INT,
    product_id INT NOT NULL,
    analysis_type ENUM('preliminary', 'detailed', 'final', 'post_award') DEFAULT 'preliminary',
    
    -- Cost breakdown
    direct_material_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    landed_cost_per_unit DECIMAL(10,4) NOT NULL DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    overhead_cost DECIMAL(10,2) DEFAULT 0,
    freight_cost DECIMAL(10,2) DEFAULT 0,
    packaging_cost DECIMAL(10,2) DEFAULT 0,
    handling_cost DECIMAL(10,2) DEFAULT 0,
    warranty_cost DECIMAL(10,2) DEFAULT 0,
    compliance_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
        direct_material_cost + labor_cost + overhead_cost + 
        freight_cost + packaging_cost + handling_cost + 
        warranty_cost + compliance_cost
    ) STORED,
    
    -- Pricing and margins
    base_selling_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    final_selling_price DECIMAL(12,2) GENERATED ALWAYS AS (
        base_selling_price - discount_amount - (base_selling_price * discount_percentage / 100)
    ) STORED,
    
    -- Margin calculations
    gross_margin_amount DECIMAL(12,2) GENERATED ALWAYS AS (final_selling_price - total_cost) STORED,
    gross_margin_percentage DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN final_selling_price > 0 THEN 
            ((final_selling_price - total_cost) / final_selling_price * 100)
        ELSE 0 END
    ) STORED,
    
    -- Market intelligence
    market_price_min DECIMAL(12,2),
    market_price_max DECIMAL(12,2),
    market_price_average DECIMAL(12,2),
    competitive_position ENUM('premium', 'market', 'competitive', 'aggressive') GENERATED ALWAYS AS (
        CASE 
            WHEN market_price_average > 0 AND final_selling_price > market_price_average * 1.1 THEN 'premium'
            WHEN market_price_average > 0 AND final_selling_price > market_price_average * 0.95 THEN 'market'
            WHEN market_price_average > 0 AND final_selling_price > market_price_average * 0.85 THEN 'competitive'
            ELSE 'aggressive'
        END
    ) STORED,
    
    -- Risk assessment
    demand_volatility DECIMAL(5,2), -- Standard deviation of historical demand
    supplier_reliability_score DECIMAL(5,2),
    inventory_risk_score DECIMAL(5,2), -- Risk of obsolescence/expiry
    currency_risk_score DECIMAL(5,2),
    overall_risk_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (COALESCE(demand_volatility, 50) + COALESCE(supplier_reliability_score, 50) + 
         COALESCE(inventory_risk_score, 50) + COALESCE(currency_risk_score, 50)) / 4
    ) STORED,
    
    -- Profitability metrics
    contribution_margin DECIMAL(12,2), -- Revenue - Variable costs
    profit_per_unit DECIMAL(10,4),
    breakeven_quantity INT,
    target_margin_percentage DECIMAL(5,2),
    minimum_acceptable_margin DECIMAL(5,2),
    
    -- Analysis metadata
    cost_basis_date DATE NOT NULL,
    price_validity_date DATE,
    analysis_confidence ENUM('low', 'medium', 'high') DEFAULT 'medium',
    analysis_notes TEXT,
    analyzed_by INT,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (analyzed_by) REFERENCES users(id),
    INDEX idx_quotation_analysis (quotation_id, analysis_type),
    INDEX idx_product_margin (product_id, gross_margin_percentage),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_competitive_position (competitive_position)
);

-- Market price intelligence tracking
CREATE TABLE market_price_intelligence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    supplier_id INT,
    competitor_name VARCHAR(100),
    price_per_unit DECIMAL(12,4) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'INR',
    quantity_bracket_min INT,
    quantity_bracket_max INT,
    lead_time_days INT,
    payment_terms VARCHAR(50),
    price_validity_start DATE NOT NULL,
    price_validity_end DATE,
    price_source ENUM('quotation', 'catalog', 'market_survey', 'customer_feedback', 'tender') NOT NULL,
    confidence_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    geographical_region VARCHAR(100),
    special_conditions TEXT,
    collected_by INT,
    collection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (collected_by) REFERENCES users(id),
    INDEX idx_product_price_date (product_id, price_validity_start, price_validity_end),
    INDEX idx_supplier_price (supplier_id, price_per_unit),
    INDEX idx_collection_date (collection_date)
);

-- Margin optimization recommendations
CREATE TABLE margin_optimization_recommendations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_id INT NOT NULL,
    product_id INT NOT NULL,
    recommendation_type ENUM('cost_reduction', 'price_increase', 'volume_discount', 'alternative_product', 'supplier_change') NOT NULL,
    current_margin_percentage DECIMAL(8,4),
    target_margin_percentage DECIMAL(8,4),
    potential_improvement_amount DECIMAL(12,2),
    potential_improvement_percentage DECIMAL(8,4),
    
    -- Recommendation details
    recommendation_title VARCHAR(200) NOT NULL,
    recommendation_description TEXT NOT NULL,
    implementation_effort ENUM('low', 'medium', 'high') DEFAULT 'medium',
    implementation_timeline VARCHAR(50),
    risk_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- Impact analysis
    cost_impact DECIMAL(12,2),
    revenue_impact DECIMAL(12,2),
    customer_satisfaction_impact ENUM('positive', 'neutral', 'negative') DEFAULT 'neutral',
    competitive_impact ENUM('positive', 'neutral', 'negative') DEFAULT 'neutral',
    
    -- Approval workflow
    status ENUM('generated', 'under_review', 'approved', 'rejected', 'implemented') DEFAULT 'generated',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    assigned_to INT,
    reviewed_by INT,
    approved_by INT,
    implementation_date DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_quotation_recommendations (quotation_id, status),
    INDEX idx_product_recommendations (product_id, recommendation_type),
    INDEX idx_priority_status (priority, status)
);

-- Customer-specific margin analysis
CREATE TABLE customer_margin_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    
    -- Volume metrics
    total_orders INT DEFAULT 0,
    total_quantity DECIMAL(15,3) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    
    -- Margin metrics
    overall_gross_margin DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_cost) STORED,
    overall_margin_percentage DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN total_revenue > 0 THEN 
            ((total_revenue - total_cost) / total_revenue * 100)
        ELSE 0 END
    ) STORED,
    
    -- Performance metrics
    average_order_value DECIMAL(12,2),
    margin_consistency_score DECIMAL(5,2), -- Low variance = high score
    price_sensitivity_score DECIMAL(5,2), -- Response to price changes
    payment_reliability_score DECIMAL(5,2),
    
    -- Strategic classification
    customer_value_tier ENUM('high_value', 'medium_value', 'low_value', 'strategic') GENERATED ALWAYS AS (
        CASE 
            WHEN overall_margin_percentage >= 25 AND total_revenue >= 100000 THEN 'high_value'
            WHEN overall_margin_percentage >= 15 AND total_revenue >= 50000 THEN 'medium_value'
            WHEN overall_margin_percentage >= 10 OR total_revenue >= 25000 THEN 'low_value'
            ELSE 'strategic'
        END
    ) STORED,
    
    -- Recommendations
    pricing_strategy_recommendation TEXT,
    relationship_management_notes TEXT,
    
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE KEY unique_customer_period (customer_id, analysis_period_start, analysis_period_end),
    INDEX idx_customer_value_tier (customer_value_tier),
    INDEX idx_margin_percentage (overall_margin_percentage),
    INDEX idx_analysis_period (analysis_period_start, analysis_period_end)
);

-- Product profitability trends
CREATE TABLE product_profitability_trends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    trend_period ENUM('daily', 'weekly', 'monthly', 'quarterly') NOT NULL,
    period_start_date DATE NOT NULL,
    period_end_date DATE NOT NULL,
    
    -- Volume and revenue
    units_sold DECIMAL(15,3) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    average_selling_price DECIMAL(12,4) DEFAULT 0,
    
    -- Cost analysis
    total_cost DECIMAL(15,2) DEFAULT 0,
    average_cost_per_unit DECIMAL(12,4) DEFAULT 0,
    material_cost_percentage DECIMAL(5,2) DEFAULT 0,
    overhead_cost_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Margin trends
    gross_margin DECIMAL(15,2) DEFAULT 0,
    margin_percentage DECIMAL(8,4) DEFAULT 0,
    margin_variance DECIMAL(8,4), -- Variance from target margin
    
    -- Market position
    market_share_percentage DECIMAL(5,2),
    price_position_vs_market DECIMAL(8,4), -- % above/below market average
    
    -- Trend indicators
    revenue_trend ENUM('increasing', 'stable', 'decreasing'),
    margin_trend ENUM('improving', 'stable', 'declining'),
    volume_trend ENUM('growing', 'stable', 'shrinking'),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE KEY unique_product_period (product_id, trend_period, period_start_date),
    INDEX idx_trend_period (trend_period, period_start_date),
    INDEX idx_margin_trend (margin_trend, margin_percentage),
    INDEX idx_revenue_trend (revenue_trend, total_revenue)
);

-- Advanced margin calculation procedures

DELIMITER //

-- Calculate comprehensive margin analysis for quotation
CREATE PROCEDURE CalculateQuotationMarginAnalysis(
    IN p_quotation_id INT,
    IN p_analysis_type ENUM('preliminary', 'detailed', 'final', 'post_award')
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12,3);
    DECLARE v_unit_price DECIMAL(12,4);
    DECLARE v_landed_cost DECIMAL(10,4);
    DECLARE v_market_avg_price DECIMAL(12,2);
    
    DECLARE quotation_cursor CURSOR FOR
        SELECT ql.product_id, ql.quantity, ql.unit_price
        FROM quotation_lines ql
        WHERE ql.quotation_id = p_quotation_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN quotation_cursor;
    
    calculation_loop: LOOP
        FETCH quotation_cursor INTO v_product_id, v_quantity, v_unit_price;
        
        IF done THEN
            LEAVE calculation_loop;
        END IF;
        
        -- Get latest landed cost for the product
        SELECT COALESCE(AVG(landed_cost_per_unit), 0)
        INTO v_landed_cost
        FROM inventory_batches ib
        WHERE ib.product_id = v_product_id
          AND ib.current_quantity > 0
          AND ib.purchase_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        ORDER BY ib.purchase_date DESC
        LIMIT 10;
        
        -- Get market average price
        SELECT AVG(price_per_unit)
        INTO v_market_avg_price
        FROM market_price_intelligence mpi
        WHERE mpi.product_id = v_product_id
          AND mpi.price_validity_end >= CURDATE()
          AND mpi.confidence_level IN ('medium', 'high');
        
        -- Insert or update margin analysis
        INSERT INTO quotation_margin_analysis (
            quotation_id, product_id, analysis_type,
            direct_material_cost, landed_cost_per_unit, base_selling_price,
            market_price_average, cost_basis_date, analyzed_by
        ) VALUES (
            p_quotation_id, v_product_id, p_analysis_type,
            v_landed_cost * v_quantity, v_landed_cost, v_unit_price * v_quantity,
            v_market_avg_price, CURDATE(), 1
        ) ON DUPLICATE KEY UPDATE
            direct_material_cost = VALUES(direct_material_cost),
            landed_cost_per_unit = VALUES(landed_cost_per_unit),
            base_selling_price = VALUES(base_selling_price),
            market_price_average = VALUES(market_price_average),
            cost_basis_date = VALUES(cost_basis_date),
            last_updated = CURRENT_TIMESTAMP;
        
    END LOOP;
    
    CLOSE quotation_cursor;
    
END //

-- Generate margin optimization recommendations
CREATE PROCEDURE GenerateMarginOptimizationRecommendations(
    IN p_quotation_id INT,
    IN p_minimum_margin_threshold DECIMAL(5,2)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_id INT;
    DECLARE v_current_margin DECIMAL(8,4);
    DECLARE v_market_price DECIMAL(12,2);
    DECLARE v_current_price DECIMAL(12,2);
    DECLARE v_cost DECIMAL(12,2);
    
    DECLARE margin_cursor CURSOR FOR
        SELECT qma.product_id, qma.gross_margin_percentage, 
               qma.market_price_average, qma.final_selling_price, qma.total_cost
        FROM quotation_margin_analysis qma
        WHERE qma.quotation_id = p_quotation_id
          AND (qma.gross_margin_percentage < p_minimum_margin_threshold OR qma.gross_margin_percentage IS NULL);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Clear existing recommendations for this quotation
    DELETE FROM margin_optimization_recommendations WHERE quotation_id = p_quotation_id;
    
    OPEN margin_cursor;
    
    recommendation_loop: LOOP
        FETCH margin_cursor INTO v_product_id, v_current_margin, v_market_price, v_current_price, v_cost;
        
        IF done THEN
            LEAVE recommendation_loop;
        END IF;
        
        -- Recommendation 1: Price increase if below market
        IF v_market_price > v_current_price * 1.05 THEN
            INSERT INTO margin_optimization_recommendations (
                quotation_id, product_id, recommendation_type,
                current_margin_percentage, target_margin_percentage,
                potential_improvement_amount, recommendation_title, recommendation_description,
                implementation_effort, risk_level, priority
            ) VALUES (
                p_quotation_id, v_product_id, 'price_increase',
                v_current_margin, ((v_market_price * 0.95 - v_cost) / (v_market_price * 0.95) * 100),
                (v_market_price * 0.95 - v_current_price),
                'Increase price to market level',
                CONCAT('Current price ₹', v_current_price, ' is below market average ₹', v_market_price, '. Consider increasing to ₹', v_market_price * 0.95),
                'low', 'low', 'medium'
            );
        END IF;
        
        -- Recommendation 2: Alternative supplier for cost reduction
        IF EXISTS (
            SELECT 1 FROM vendor_price_quotes vpq 
            WHERE vpq.product_id = v_product_id 
              AND vpq.quoted_price < v_cost * 0.9
              AND vpq.quote_validity_end >= CURDATE()
        ) THEN
            INSERT INTO margin_optimization_recommendations (
                quotation_id, product_id, recommendation_type,
                current_margin_percentage, target_margin_percentage,
                recommendation_title, recommendation_description,
                implementation_effort, risk_level, priority
            ) VALUES (
                p_quotation_id, v_product_id, 'supplier_change',
                v_current_margin, v_current_margin + 5,
                'Consider alternative supplier',
                'Alternative suppliers available with lower cost. Evaluate quality and reliability.',
                'medium', 'medium', 'high'
            );
        END IF;
        
        -- Recommendation 3: Volume discount negotiation
        INSERT INTO margin_optimization_recommendations (
            quotation_id, product_id, recommendation_type,
            current_margin_percentage, target_margin_percentage,
            recommendation_title, recommendation_description,
            implementation_effort, risk_level, priority
        ) VALUES (
            p_quotation_id, v_product_id, 'volume_discount',
            v_current_margin, v_current_margin + 3,
            'Negotiate volume-based pricing',
            'Consider offering volume discounts for larger quantities to improve overall margin.',
            'low', 'low', 'medium'
        );
        
    END LOOP;
    
    CLOSE margin_cursor;
    
END //

-- Update customer margin analysis
CREATE PROCEDURE UpdateCustomerMarginAnalysis(
    IN p_customer_id INT,
    IN p_analysis_period_months INT DEFAULT 12
)
BEGIN
    DECLARE v_period_start DATE;
    DECLARE v_total_orders INT DEFAULT 0;
    DECLARE v_total_quantity DECIMAL(15,3) DEFAULT 0;
    DECLARE v_total_revenue DECIMAL(15,2) DEFAULT 0;
    DECLARE v_total_cost DECIMAL(15,2) DEFAULT 0;
    DECLARE v_avg_order_value DECIMAL(12,2) DEFAULT 0;
    
    SET v_period_start = DATE_SUB(CURDATE(), INTERVAL p_analysis_period_months MONTH);
    
    -- Calculate aggregated metrics
    SELECT 
        COUNT(DISTINCT q.id),
        SUM(ql.quantity),
        SUM(ql.quantity * ql.unit_price),
        SUM(ql.quantity * COALESCE(ib.landed_cost_per_unit, p.standard_cost, 0)),
        AVG(q.total_amount)
    INTO v_total_orders, v_total_quantity, v_total_revenue, v_total_cost, v_avg_order_value
    FROM quotations q
    JOIN quotation_lines ql ON q.id = ql.quotation_id
    JOIN products p ON ql.product_id = p.id
    LEFT JOIN inventory_batches ib ON p.id = ib.product_id
    WHERE q.customer_id = p_customer_id
      AND q.quotation_date >= v_period_start
      AND q.status IN ('accepted', 'completed');
    
    -- Insert or update customer margin analysis
    INSERT INTO customer_margin_analysis (
        customer_id, analysis_period_start, analysis_period_end,
        total_orders, total_quantity, total_revenue, total_cost,
        average_order_value
    ) VALUES (
        p_customer_id, v_period_start, CURDATE(),
        v_total_orders, v_total_quantity, v_total_revenue, v_total_cost,
        v_avg_order_value
    ) ON DUPLICATE KEY UPDATE
        total_orders = VALUES(total_orders),
        total_quantity = VALUES(total_quantity),
        total_revenue = VALUES(total_revenue),
        total_cost = VALUES(total_cost),
        average_order_value = VALUES(average_order_value),
        analysis_date = CURRENT_TIMESTAMP;
        
END //

DELIMITER ;

-- Sample market intelligence data
INSERT INTO market_price_intelligence (product_id, competitor_name, price_per_unit, price_source, price_validity_start, price_validity_end, confidence_level) VALUES
(1, 'Competitor A', 850.00, 'quotation', '2024-01-01', '2024-12-31', 'high'),
(1, 'Competitor B', 820.00, 'catalog', '2024-01-01', '2024-12-31', 'medium'),
(2, 'Competitor A', 1250.00, 'market_survey', '2024-01-01', '2024-12-31', 'high'),
(3, 'Competitor C', 2100.00, 'tender', '2024-01-01', '2024-06-30', 'high');

-- Views for margin analysis reporting

-- Quotation margin summary
CREATE VIEW v_quotation_margin_summary AS
SELECT 
    q.id as quotation_id,
    q.quotation_number,
    c.customer_name,
    q.quotation_date,
    q.total_amount,
    SUM(qma.total_cost) as total_cost,
    SUM(qma.gross_margin_amount) as total_margin,
    ROUND(AVG(qma.gross_margin_percentage), 2) as average_margin_percentage,
    MIN(qma.gross_margin_percentage) as min_margin_percentage,
    MAX(qma.gross_margin_percentage) as max_margin_percentage,
    COUNT(qma.id) as analyzed_items,
    CASE 
        WHEN AVG(qma.gross_margin_percentage) >= 25 THEN 'Excellent'
        WHEN AVG(qma.gross_margin_percentage) >= 15 THEN 'Good'
        WHEN AVG(qma.gross_margin_percentage) >= 10 THEN 'Acceptable'
        ELSE 'Low'
    END as margin_rating
FROM quotations q
JOIN customers c ON q.customer_id = c.id
LEFT JOIN quotation_margin_analysis qma ON q.id = qma.quotation_id
GROUP BY q.id, q.quotation_number, c.customer_name, q.quotation_date, q.total_amount;

-- Product margin performance
CREATE VIEW v_product_margin_performance AS
SELECT 
    p.id as product_id,
    p.product_name,
    pc.category_name,
    COUNT(qma.id) as quotation_count,
    AVG(qma.gross_margin_percentage) as avg_margin_percentage,
    MIN(qma.gross_margin_percentage) as min_margin_percentage,
    MAX(qma.gross_margin_percentage) as max_margin_percentage,
    SUM(qma.gross_margin_amount) as total_margin_amount,
    AVG(qma.final_selling_price / NULLIF(qma.market_price_average, 0)) as price_competitiveness_ratio,
    CASE 
        WHEN AVG(qma.gross_margin_percentage) >= 20 THEN 'High Margin'
        WHEN AVG(qma.gross_margin_percentage) >= 15 THEN 'Medium Margin'
        WHEN AVG(qma.gross_margin_percentage) >= 10 THEN 'Low Margin'
        ELSE 'Very Low Margin'
    END as margin_category
FROM products p
JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN quotation_margin_analysis qma ON p.id = qma.product_id
WHERE qma.analysis_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
GROUP BY p.id, p.product_name, pc.category_name;

-- Top margin improvement opportunities
CREATE VIEW v_top_margin_opportunities AS
SELECT 
    mor.quotation_id,
    q.quotation_number,
    c.customer_name,
    p.product_name,
    mor.recommendation_type,
    mor.current_margin_percentage,
    mor.target_margin_percentage,
    mor.potential_improvement_amount,
    mor.potential_improvement_percentage,
    mor.priority,
    mor.status,
    mor.recommendation_title
FROM margin_optimization_recommendations mor
JOIN quotations q ON mor.quotation_id = q.id
JOIN customers c ON q.customer_id = c.id
JOIN products p ON mor.product_id = p.id
WHERE mor.status IN ('generated', 'under_review', 'approved')
ORDER BY mor.potential_improvement_amount DESC, mor.priority DESC;

-- Performance indexes
CREATE INDEX idx_quotation_margin_analysis_composite ON quotation_margin_analysis(quotation_id, analysis_type, gross_margin_percentage);
CREATE INDEX idx_market_price_intelligence_composite ON market_price_intelligence(product_id, price_validity_start, price_validity_end, confidence_level);
CREATE INDEX idx_margin_recommendations_composite ON margin_optimization_recommendations(quotation_id, status, priority, potential_improvement_amount);

-- Triggers for automated analysis

DELIMITER //

-- Trigger to automatically create margin analysis when quotation is created
CREATE TRIGGER tr_auto_margin_analysis 
AFTER INSERT ON quotation_lines
FOR EACH ROW
BEGIN
    -- Create preliminary margin analysis
    CALL CalculateQuotationMarginAnalysis(NEW.quotation_id, 'preliminary');
    
    -- Generate recommendations if margin is below threshold
    CALL GenerateMarginOptimizationRecommendations(NEW.quotation_id, 15.0);
END //

-- Trigger to update customer margin analysis when quotation status changes
CREATE TRIGGER tr_update_customer_margin 
AFTER UPDATE ON quotations
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status AND NEW.status IN ('accepted', 'completed') THEN
        CALL UpdateCustomerMarginAnalysis(NEW.customer_id, 12);
    END IF;
END //

DELIMITER ;