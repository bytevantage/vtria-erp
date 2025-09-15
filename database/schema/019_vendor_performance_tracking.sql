-- Vendor Performance and Price History Tracking
-- Comprehensive vendor management with reliability scoring and procurement optimization

-- Enhance existing suppliers table with performance metrics
ALTER TABLE suppliers ADD COLUMN (
    -- Performance scoring
    overall_rating DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Overall rating 0-5 stars',
    quality_rating DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Product quality rating 0-5',
    delivery_rating DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Delivery performance rating 0-5',
    communication_rating DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Communication effectiveness 0-5',
    price_competitiveness DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Price competitiveness 0-5',
    
    -- Delivery performance metrics
    average_delivery_days INT DEFAULT 0 COMMENT 'Average delivery time in days',
    on_time_delivery_percentage DECIMAL(5,2) DEFAULT 100.00 COMMENT 'Percentage of on-time deliveries',
    early_delivery_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of early deliveries',
    late_delivery_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage of late deliveries',
    
    -- Quality metrics
    defect_rate_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Product defect rate',
    return_rate_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Product return rate',
    warranty_claim_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Warranty claim rate',
    
    -- Financial metrics
    average_discount_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Average discount provided',
    payment_terms_days INT DEFAULT 30 COMMENT 'Standard payment terms',
    credit_limit DECIMAL(12,2) DEFAULT 0.00 COMMENT 'Credit limit with supplier',
    total_purchases_ytd DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Year-to-date purchases',
    total_purchases_lifetime DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Lifetime purchase value',
    
    -- Relationship metrics
    partnership_level ENUM('transactional', 'preferred', 'strategic', 'exclusive') DEFAULT 'transactional',
    relationship_start_date DATE NULL COMMENT 'When business relationship started',
    last_evaluation_date DATE NULL COMMENT 'Last performance evaluation date',
    contract_renewal_date DATE NULL COMMENT 'Contract renewal date',
    
    -- Risk assessment
    financial_stability_rating ENUM('excellent', 'good', 'fair', 'poor', 'unknown') DEFAULT 'unknown',
    supply_chain_risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    geographic_risk ENUM('low', 'medium', 'high') DEFAULT 'low' COMMENT 'Geographic/political risk',
    business_continuity_score DECIMAL(3,2) DEFAULT 3.00 COMMENT 'Business continuity capability',
    
    -- Capabilities
    technical_capabilities JSON NULL COMMENT 'Technical capabilities and certifications',
    quality_certifications JSON NULL COMMENT 'Quality certifications (ISO, etc.)',
    manufacturing_capacity JSON NULL COMMENT 'Manufacturing capacity information',
    supported_payment_methods JSON NULL COMMENT 'Supported payment methods',
    
    -- Performance tracking
    last_performance_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    performance_trend ENUM('improving', 'stable', 'declining') DEFAULT 'stable',
    next_review_due DATE NULL COMMENT 'Next performance review due date'
);

-- Create vendor price history table
CREATE TABLE vendor_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    
    -- Price details
    quoted_price DECIMAL(12,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    price_per_unit DECIMAL(12,4) NOT NULL,
    minimum_order_quantity INT DEFAULT 1,
    maximum_order_quantity INT NULL,
    
    -- Quantity breaks
    quantity_break_tier VARCHAR(50) NULL COMMENT 'e.g., 1-10, 11-50, 51-100',
    volume_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    bulk_pricing_tiers JSON NULL COMMENT 'Structured bulk pricing information',
    
    -- Terms and conditions
    payment_terms VARCHAR(100) NULL COMMENT 'Payment terms for this quote',
    delivery_lead_time_days INT NOT NULL DEFAULT 7,
    delivery_terms VARCHAR(100) NULL COMMENT 'FOB, CIF, etc.',
    validity_period_days INT DEFAULT 30 COMMENT 'Quote validity period',
    quote_valid_until DATE NOT NULL,
    
    -- Additional costs
    shipping_cost DECIMAL(10,2) DEFAULT 0.00,
    handling_charges DECIMAL(10,2) DEFAULT 0.00,
    packaging_cost DECIMAL(10,2) DEFAULT 0.00,
    insurance_cost DECIMAL(10,2) DEFAULT 0.00,
    customs_charges DECIMAL(10,2) DEFAULT 0.00,
    total_landed_cost DECIMAL(12,4) GENERATED ALWAYS AS (
        quoted_price + shipping_cost + handling_charges + packaging_cost + insurance_cost + customs_charges
    ) STORED,
    
    -- Market intelligence
    market_price_position ENUM('below_market', 'at_market', 'above_market', 'premium') DEFAULT 'at_market',
    price_change_reason VARCHAR(255) NULL COMMENT 'Reason for price change',
    competitor_comparison JSON NULL COMMENT 'Comparison with competitor prices',
    negotiated_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Quote metadata
    quote_reference VARCHAR(100) NULL COMMENT 'Supplier quote reference',
    requested_by INT NULL COMMENT 'User who requested the quote',
    quote_request_date DATE NULL,
    quote_received_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    
    -- Price trend analysis
    price_trend_indicator ENUM('rising', 'stable', 'falling') DEFAULT 'stable',
    price_volatility_score DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Price volatility score 0-5',
    seasonal_pricing BOOLEAN DEFAULT FALSE,
    
    -- Status and approval
    quote_status ENUM('active', 'expired', 'superseded', 'accepted', 'rejected') DEFAULT 'active',
    approved_by INT NULL,
    approval_date DATE NULL,
    notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    KEY idx_product_supplier (product_id, supplier_id),
    KEY idx_quote_valid_until (quote_valid_until),
    KEY idx_price_trend (price_trend_indicator, quote_received_date),
    KEY idx_market_position (market_price_position)
) COMMENT='Vendor price history and quote tracking';

-- Create vendor performance evaluations table
CREATE TABLE vendor_performance_evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    
    -- Evaluation details
    evaluation_period_start DATE NOT NULL,
    evaluation_period_end DATE NOT NULL,
    evaluation_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    evaluated_by INT NOT NULL,
    evaluation_type ENUM('quarterly', 'annual', 'project_based', 'incident_based') DEFAULT 'quarterly',
    
    -- Performance scores (0-5 scale)
    quality_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    delivery_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    communication_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    pricing_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    service_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    innovation_score DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    
    -- Weighted overall score
    overall_score DECIMAL(3,2) GENERATED ALWAYS AS (
        (quality_score * 0.25 + delivery_score * 0.20 + communication_score * 0.15 + 
         pricing_score * 0.20 + service_score * 0.15 + innovation_score * 0.05)
    ) STORED,
    
    -- Detailed metrics
    orders_placed INT DEFAULT 0,
    orders_delivered_on_time INT DEFAULT 0,
    orders_delivered_early INT DEFAULT 0,
    orders_delivered_late INT DEFAULT 0,
    total_order_value DECIMAL(15,2) DEFAULT 0.00,
    
    -- Quality metrics
    defective_items_received INT DEFAULT 0,
    total_items_received INT DEFAULT 0,
    warranty_claims INT DEFAULT 0,
    customer_complaints INT DEFAULT 0,
    
    -- Communication and service
    response_time_hours DECIMAL(6,2) DEFAULT 24.00,
    issue_resolution_days DECIMAL(5,2) DEFAULT 3.00,
    proactive_communication_instances INT DEFAULT 0,
    
    -- Improvements and concerns
    improvements_noted TEXT NULL,
    areas_for_improvement TEXT NULL,
    critical_issues TEXT NULL,
    action_items JSON NULL,
    
    -- Recommendations
    recommended_actions ENUM('continue_partnership', 'improve_performance', 'reduce_volume', 'terminate') DEFAULT 'continue_partnership',
    partnership_level_recommendation ENUM('transactional', 'preferred', 'strategic', 'exclusive') DEFAULT 'transactional',
    
    -- Follow-up
    next_evaluation_due DATE NULL,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    KEY idx_evaluation_date (evaluation_date),
    KEY idx_overall_score (overall_score),
    KEY idx_supplier_period (supplier_id, evaluation_period_start, evaluation_period_end)
) COMMENT='Vendor performance evaluations and scoring';

-- Create delivery performance tracking table
CREATE TABLE vendor_delivery_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    purchase_order_number VARCHAR(50) NOT NULL,
    supplier_id INT NOT NULL,
    product_id INT NOT NULL,
    
    -- Order details
    order_date DATE NOT NULL,
    promised_delivery_date DATE NOT NULL,
    actual_delivery_date DATE NULL,
    requested_quantity INT NOT NULL,
    delivered_quantity INT DEFAULT 0,
    
    -- Delivery performance
    delivery_status ENUM('pending', 'partial', 'complete', 'overdue', 'cancelled') DEFAULT 'pending',
    days_early INT DEFAULT 0 COMMENT 'Positive if delivered early',
    days_late INT DEFAULT 0 COMMENT 'Positive if delivered late',
    delivery_accuracy_percentage DECIMAL(5,2) DEFAULT 100.00,
    
    -- Quality assessment
    quality_on_receipt ENUM('excellent', 'good', 'acceptable', 'poor', 'rejected') DEFAULT 'good',
    defects_found INT DEFAULT 0,
    inspection_notes TEXT NULL,
    
    -- Documentation and compliance
    documentation_complete BOOLEAN DEFAULT TRUE,
    certifications_provided BOOLEAN DEFAULT TRUE,
    packaging_condition ENUM('excellent', 'good', 'damaged', 'poor') DEFAULT 'good',
    
    -- Cost impact
    rush_charges_incurred DECIMAL(10,2) DEFAULT 0.00,
    penalty_charges DECIMAL(10,2) DEFAULT 0.00,
    bonus_earned DECIMAL(10,2) DEFAULT 0.00,
    
    -- Communication
    delivery_notifications_sent INT DEFAULT 0,
    proactive_updates_received BOOLEAN DEFAULT FALSE,
    communication_quality ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    
    -- Follow-up actions
    issues_reported TEXT NULL,
    corrective_actions_taken TEXT NULL,
    feedback_provided_to_supplier TEXT NULL,
    
    recorded_by INT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    KEY idx_delivery_date (actual_delivery_date),
    KEY idx_supplier_performance (supplier_id, delivery_status),
    KEY idx_po_number (purchase_order_number)
) COMMENT='Detailed delivery performance tracking';

-- Create vendor comparison view for procurement decisions
CREATE VIEW vendor_comparison_view AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.product_code,
    
    -- Supplier information
    s.id as supplier_id,
    s.company_name,
    s.overall_rating,
    s.quality_rating,
    s.delivery_rating,
    s.price_competitiveness,
    s.partnership_level,
    
    -- Latest pricing
    vph.quoted_price,
    vph.total_landed_cost,
    vph.delivery_lead_time_days,
    vph.minimum_order_quantity,
    vph.quote_valid_until,
    vph.market_price_position,
    
    -- Performance metrics
    s.on_time_delivery_percentage,
    s.defect_rate_percentage,
    s.average_delivery_days,
    s.average_discount_percentage,
    
    -- Cost analysis
    RANK() OVER (PARTITION BY p.id ORDER BY vph.total_landed_cost ASC) as cost_rank,
    RANK() OVER (PARTITION BY p.id ORDER BY s.overall_rating DESC) as quality_rank,
    RANK() OVER (PARTITION BY p.id ORDER BY vph.delivery_lead_time_days ASC) as speed_rank,
    
    -- Composite scoring
    (s.overall_rating * 0.3 + 
     (6 - LEAST(5, vph.delivery_lead_time_days / 2)) * 0.2 +
     s.price_competitiveness * 0.3 +
     (s.on_time_delivery_percentage / 20) * 0.2) as composite_score,
    
    -- Risk indicators
    s.supply_chain_risk_level,
    s.financial_stability_rating,
    CASE 
        WHEN vph.quote_valid_until < CURDATE() THEN 'EXPIRED'
        WHEN vph.quote_valid_until < DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'EXPIRING_SOON'
        ELSE 'VALID'
    END as quote_validity_status

FROM products p
INNER JOIN vendor_price_history vph ON p.id = vph.product_id
INNER JOIN suppliers s ON vph.supplier_id = s.id
WHERE vph.quote_status = 'active'
AND vph.quote_valid_until >= CURDATE()
ORDER BY p.id, composite_score DESC;

-- Create supplier performance dashboard view
CREATE VIEW supplier_performance_dashboard AS
SELECT 
    s.id as supplier_id,
    s.company_name,
    s.contact_person,
    s.overall_rating,
    s.partnership_level,
    
    -- Performance metrics
    s.on_time_delivery_percentage,
    s.defect_rate_percentage,
    s.average_delivery_days,
    
    -- Financial metrics
    s.total_purchases_ytd,
    s.average_discount_percentage,
    COUNT(DISTINCT vph.product_id) as products_supplied,
    
    -- Recent activity
    MAX(vdp.order_date) as last_order_date,
    COUNT(CASE WHEN vdp.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as orders_last_30_days,
    
    -- Risk assessment
    s.supply_chain_risk_level,
    s.financial_stability_rating,
    s.next_review_due,
    
    -- Performance trend
    s.performance_trend,
    CASE 
        WHEN s.next_review_due < CURDATE() THEN 'OVERDUE'
        WHEN s.next_review_due < DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'DUE_SOON'
        ELSE 'SCHEDULED'
    END as review_status,
    
    -- Quality indicators
    CASE 
        WHEN s.overall_rating >= 4.5 THEN 'EXCELLENT'
        WHEN s.overall_rating >= 4.0 THEN 'GOOD'
        WHEN s.overall_rating >= 3.0 THEN 'ACCEPTABLE'
        ELSE 'NEEDS_IMPROVEMENT'
    END as performance_category

FROM suppliers s
LEFT JOIN vendor_price_history vph ON s.id = vph.supplier_id AND vph.quote_status = 'active'
LEFT JOIN vendor_delivery_performance vdp ON s.id = vdp.supplier_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.company_name, s.contact_person, s.overall_rating, s.partnership_level,
         s.on_time_delivery_percentage, s.defect_rate_percentage, s.average_delivery_days,
         s.total_purchases_ytd, s.average_discount_percentage, s.supply_chain_risk_level,
         s.financial_stability_rating, s.next_review_due, s.performance_trend
ORDER BY s.overall_rating DESC, s.total_purchases_ytd DESC;

-- Create stored procedure for automatic performance calculation
DELIMITER //

CREATE PROCEDURE UpdateSupplierPerformanceMetrics(
    IN p_supplier_id INT,
    IN p_evaluation_period_days INT DEFAULT 90
)
BEGIN
    DECLARE v_total_orders INT DEFAULT 0;
    DECLARE v_on_time_orders INT DEFAULT 0;
    DECLARE v_early_orders INT DEFAULT 0;
    DECLARE v_late_orders INT DEFAULT 0;
    DECLARE v_total_items INT DEFAULT 0;
    DECLARE v_defective_items INT DEFAULT 0;
    DECLARE v_avg_delivery_days DECIMAL(5,2) DEFAULT 0;
    DECLARE v_on_time_percentage DECIMAL(5,2);
    DECLARE v_defect_percentage DECIMAL(5,2);
    
    -- Calculate delivery performance
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN days_late = 0 AND days_early = 0 THEN 1 END),
        COUNT(CASE WHEN days_early > 0 THEN 1 END),
        COUNT(CASE WHEN days_late > 0 THEN 1 END),
        AVG(DATEDIFF(actual_delivery_date, order_date))
    INTO 
        v_total_orders, v_on_time_orders, v_early_orders, v_late_orders, v_avg_delivery_days
    FROM vendor_delivery_performance 
    WHERE supplier_id = p_supplier_id 
    AND order_date >= DATE_SUB(CURDATE(), INTERVAL p_evaluation_period_days DAY)
    AND actual_delivery_date IS NOT NULL;
    
    -- Calculate quality metrics
    SELECT 
        SUM(delivered_quantity),
        SUM(defects_found)
    INTO v_total_items, v_defective_items
    FROM vendor_delivery_performance
    WHERE supplier_id = p_supplier_id
    AND order_date >= DATE_SUB(CURDATE(), INTERVAL p_evaluation_period_days DAY);
    
    -- Calculate percentages
    SET v_on_time_percentage = CASE WHEN v_total_orders > 0 THEN (v_on_time_orders / v_total_orders * 100) ELSE 100 END;
    SET v_defect_percentage = CASE WHEN v_total_items > 0 THEN (v_defective_items / v_total_items * 100) ELSE 0 END;
    
    -- Update supplier metrics
    UPDATE suppliers SET
        on_time_delivery_percentage = v_on_time_percentage,
        early_delivery_percentage = CASE WHEN v_total_orders > 0 THEN (v_early_orders / v_total_orders * 100) ELSE 0 END,
        late_delivery_percentage = CASE WHEN v_total_orders > 0 THEN (v_late_orders / v_total_orders * 100) ELSE 0 END,
        average_delivery_days = COALESCE(v_avg_delivery_days, average_delivery_days),
        defect_rate_percentage = v_defect_percentage,
        
        -- Update ratings based on performance
        delivery_rating = CASE 
            WHEN v_on_time_percentage >= 95 THEN 5.0
            WHEN v_on_time_percentage >= 90 THEN 4.5
            WHEN v_on_time_percentage >= 85 THEN 4.0
            WHEN v_on_time_percentage >= 80 THEN 3.5
            WHEN v_on_time_percentage >= 70 THEN 3.0
            ELSE 2.0
        END,
        
        quality_rating = CASE 
            WHEN v_defect_percentage <= 0.5 THEN 5.0
            WHEN v_defect_percentage <= 1.0 THEN 4.5
            WHEN v_defect_percentage <= 2.0 THEN 4.0
            WHEN v_defect_percentage <= 3.0 THEN 3.5
            WHEN v_defect_percentage <= 5.0 THEN 3.0
            ELSE 2.0
        END,
        
        last_performance_update = NOW()
    WHERE id = p_supplier_id;
    
    -- Update overall rating as weighted average
    UPDATE suppliers SET
        overall_rating = (quality_rating * 0.3 + delivery_rating * 0.3 + 
                         communication_rating * 0.2 + price_competitiveness * 0.2)
    WHERE id = p_supplier_id;
    
END //

DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_supplier_performance ON suppliers(overall_rating, partnership_level, is_active);
CREATE INDEX idx_price_history_product ON vendor_price_history(product_id, quote_valid_until, quote_status);
CREATE INDEX idx_price_history_trend ON vendor_price_history(supplier_id, quote_received_date, price_trend_indicator);
CREATE INDEX idx_delivery_performance ON vendor_delivery_performance(supplier_id, order_date, delivery_status);

-- Insert sample data for testing
INSERT INTO vendor_price_history (
    product_id, supplier_id, quoted_price, price_per_unit,
    delivery_lead_time_days, quote_valid_until, market_price_position,
    quote_reference, quote_received_date
) VALUES (
    1, 1, 2000.00, 2000.00,
    7, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'at_market',
    'Q2024-001', CURDATE()
);

-- Create triggers for automatic performance updates
DELIMITER //

CREATE TRIGGER update_supplier_performance_on_delivery
    AFTER INSERT ON vendor_delivery_performance
    FOR EACH ROW
BEGIN
    -- Update supplier performance metrics
    CALL UpdateSupplierPerformanceMetrics(NEW.supplier_id, 90);
END //

CREATE TRIGGER update_supplier_performance_on_delivery_update
    AFTER UPDATE ON vendor_delivery_performance
    FOR EACH ROW
BEGIN
    -- Update supplier performance metrics if delivery status changed
    IF NEW.delivery_status != OLD.delivery_status OR NEW.actual_delivery_date != OLD.actual_delivery_date THEN
        CALL UpdateSupplierPerformanceMetrics(NEW.supplier_id, 90);
    END IF;
END //

DELIMITER ;

COMMENT ON TABLE vendor_price_history IS 'Comprehensive price history and quote tracking for vendors';
COMMENT ON TABLE vendor_performance_evaluations IS 'Formal vendor performance evaluations and scoring';
COMMENT ON TABLE vendor_delivery_performance IS 'Detailed tracking of vendor delivery performance';
COMMENT ON VIEW vendor_comparison_view IS 'Multi-criteria vendor comparison for procurement decisions';
COMMENT ON VIEW supplier_performance_dashboard IS 'Supplier performance dashboard with key metrics';