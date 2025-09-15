-- Enhanced Batch Costing with Landed Costs
-- This implements true cost calculation including freight, insurance, duties, and other charges

-- Add landed cost columns to inventory_batches table
ALTER TABLE inventory_batches ADD COLUMN (
    -- Additional cost components
    freight_cost DECIMAL(10,2) DEFAULT 0 COMMENT 'Freight/shipping cost for this batch',
    insurance_cost DECIMAL(10,2) DEFAULT 0 COMMENT 'Insurance cost for this batch',
    customs_duty DECIMAL(10,2) DEFAULT 0 COMMENT 'Customs duty and clearance charges',
    handling_charges DECIMAL(10,2) DEFAULT 0 COMMENT 'Handling and loading/unloading charges',
    other_charges DECIMAL(10,2) DEFAULT 0 COMMENT 'Other miscellaneous charges',
    
    -- Currency and exchange rates
    purchase_currency VARCHAR(3) DEFAULT 'INR' COMMENT 'Currency of purchase (USD, EUR, INR, etc.)',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT 'Exchange rate at time of purchase',
    
    -- Calculated costs (stored for performance)
    total_additional_costs DECIMAL(10,2) GENERATED ALWAYS AS (
        freight_cost + insurance_cost + customs_duty + handling_charges + other_charges
    ) STORED COMMENT 'Sum of all additional costs',
    
    additional_cost_per_unit DECIMAL(10,4) GENERATED ALWAYS AS (
        CASE 
            WHEN received_quantity > 0 THEN 
                (freight_cost + insurance_cost + customs_duty + handling_charges + other_charges) / received_quantity
            ELSE 0
        END
    ) STORED COMMENT 'Additional cost per unit',
    
    landed_cost_per_unit DECIMAL(10,4) GENERATED ALWAYS AS (
        purchase_price + CASE 
            WHEN received_quantity > 0 THEN 
                (freight_cost + insurance_cost + customs_duty + handling_charges + other_charges) / received_quantity
            ELSE 0
        END
    ) STORED COMMENT 'Total landed cost per unit including all charges',
    
    -- Cost breakdown percentages for analysis
    freight_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN purchase_price > 0 THEN (freight_cost / received_quantity) / purchase_price * 100
            ELSE 0
        END
    ) STORED COMMENT 'Freight cost as percentage of unit price',
    
    duty_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN purchase_price > 0 THEN (customs_duty / received_quantity) / purchase_price * 100
            ELSE 0
        END
    ) STORED COMMENT 'Duty cost as percentage of unit price',
    
    -- Costing method used for this batch
    costing_method ENUM('standard', 'actual', 'average') DEFAULT 'actual' COMMENT 'Costing method applied',
    cost_allocated_date TIMESTAMP NULL COMMENT 'When costs were fully allocated',
    cost_allocation_status ENUM('pending', 'partial', 'complete') DEFAULT 'pending' COMMENT 'Status of cost allocation'
);

-- Create table for purchase order cost allocation
CREATE TABLE purchase_order_costs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    purchase_order_number VARCHAR(50),
    
    -- Total PO level costs
    total_freight_cost DECIMAL(12,2) DEFAULT 0,
    total_insurance_cost DECIMAL(12,2) DEFAULT 0,
    total_customs_duty DECIMAL(12,2) DEFAULT 0,
    total_handling_charges DECIMAL(12,2) DEFAULT 0,
    total_other_charges DECIMAL(12,2) DEFAULT 0,
    
    -- Allocation method
    allocation_method ENUM('by_value', 'by_weight', 'by_quantity', 'manual') DEFAULT 'by_value',
    total_po_value DECIMAL(12,2) DEFAULT 0,
    total_po_weight DECIMAL(10,3) DEFAULT 0,
    total_po_quantity DECIMAL(10,2) DEFAULT 0,
    
    -- Currency information
    po_currency VARCHAR(3) DEFAULT 'INR',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    exchange_rate_date DATE,
    
    -- Status
    allocation_status ENUM('pending', 'allocated', 'closed') DEFAULT 'pending',
    allocated_at TIMESTAMP NULL,
    allocated_by INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY idx_po_id (purchase_order_id),
    KEY idx_po_number (purchase_order_number)
) COMMENT='Purchase order level cost allocation';

-- Create table for cost allocation rules
CREATE TABLE cost_allocation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Allocation criteria
    allocation_basis ENUM('product_value', 'product_weight', 'product_quantity', 'product_volume', 'custom_formula') DEFAULT 'product_value',
    
    -- Product category specific rules
    product_category_id INT NULL,
    supplier_id INT NULL,
    
    -- Percentage allocations
    freight_allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    insurance_allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    duty_allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    
    -- Custom formula for complex allocations
    custom_allocation_formula TEXT NULL COMMENT 'SQL expression for custom allocation',
    
    -- Rule priority and status
    rule_priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    KEY idx_category (product_category_id),
    KEY idx_supplier (supplier_id)
) COMMENT='Rules for automatic cost allocation';

-- Insert default cost allocation rules
INSERT INTO cost_allocation_rules (rule_name, rule_code, allocation_basis, is_default) VALUES
('Value Based Allocation', 'VALUE_BASED', 'product_value', TRUE),
('Weight Based Allocation', 'WEIGHT_BASED', 'product_weight', FALSE),
('Quantity Based Allocation', 'QTY_BASED', 'product_quantity', FALSE);

-- Create enhanced costing view for better performance
CREATE VIEW enhanced_batch_costing_view AS
SELECT 
    ib.id,
    ib.batch_number,
    ib.product_id,
    p.name as product_name,
    p.product_code,
    ib.supplier_id,
    s.company_name as supplier_name,
    ib.location_id,
    l.name as location_name,
    
    -- Quantities
    ib.received_quantity,
    ib.available_quantity,
    ib.consumed_quantity,
    
    -- Basic costs
    ib.purchase_price,
    ib.purchase_currency,
    ib.exchange_rate,
    
    -- Additional costs
    ib.freight_cost,
    ib.insurance_cost,
    ib.customs_duty,
    ib.handling_charges,
    ib.other_charges,
    ib.total_additional_costs,
    
    -- Calculated costs
    ib.additional_cost_per_unit,
    ib.landed_cost_per_unit,
    
    -- Cost percentages
    ib.freight_percentage,
    ib.duty_percentage,
    
    -- Batch values
    (ib.available_quantity * ib.purchase_price) as basic_inventory_value,
    (ib.available_quantity * ib.landed_cost_per_unit) as total_inventory_value,
    
    -- Cost efficiency metrics
    (ib.landed_cost_per_unit - ib.purchase_price) as cost_overhead_per_unit,
    CASE 
        WHEN ib.purchase_price > 0 THEN 
            ((ib.landed_cost_per_unit - ib.purchase_price) / ib.purchase_price * 100)
        ELSE 0
    END as cost_overhead_percentage,
    
    -- Date information
    ib.purchase_date,
    ib.expiry_date,
    DATEDIFF(ib.expiry_date, CURDATE()) as days_to_expiry,
    ib.status,
    
    -- Costing metadata
    ib.costing_method,
    ib.cost_allocation_status,
    ib.cost_allocated_date

FROM inventory_batches ib
LEFT JOIN products p ON ib.product_id = p.id
LEFT JOIN suppliers s ON ib.supplier_id = s.id
LEFT JOIN locations l ON ib.location_id = l.id
WHERE ib.status = 'active';

-- Create view for optimal allocation with enhanced costing
CREATE VIEW optimal_allocation_enhanced AS
SELECT 
    ebc.id as batch_id,
    ebc.product_id,
    ebc.product_name,
    ebc.location_id,
    ebc.location_name,
    ebc.available_quantity,
    
    -- Cost information
    ebc.purchase_price,
    ebc.landed_cost_per_unit,
    ebc.total_inventory_value,
    
    -- Allocation scoring factors
    ebc.days_to_expiry,
    
    -- FIFO Score (older stock first)
    CASE 
        WHEN ebc.days_to_expiry IS NOT NULL THEN
            (DATEDIFF(CURDATE(), ebc.purchase_date) / 365 * 100)
        ELSE
            (DATEDIFF(CURDATE(), ebc.purchase_date) / 365 * 100)
    END as fifo_score,
    
    -- Cost efficiency score (lower cost gets higher score)
    CASE 
        WHEN @max_cost > 0 THEN
            (100 - (ebc.landed_cost_per_unit / @max_cost * 100))
        ELSE 50
    END as cost_efficiency_score,
    
    -- Expiry urgency score
    CASE 
        WHEN ebc.days_to_expiry IS NULL THEN 50
        WHEN ebc.days_to_expiry < 0 THEN 0
        WHEN ebc.days_to_expiry < 30 THEN 20
        WHEN ebc.days_to_expiry < 90 THEN 40
        WHEN ebc.days_to_expiry < 180 THEN 60
        ELSE 80
    END as expiry_score,
    
    -- Combined allocation score (weighted)
    (
        (DATEDIFF(CURDATE(), ebc.purchase_date) / 365 * 100) * 0.4 +  -- FIFO weight
        CASE 
            WHEN @max_cost > 0 THEN
                (100 - (ebc.landed_cost_per_unit / @max_cost * 100)) * 0.4  -- Cost weight
            ELSE 50 * 0.4
        END +
        CASE 
            WHEN ebc.days_to_expiry IS NULL THEN 50 * 0.2
            WHEN ebc.days_to_expiry < 0 THEN 0
            WHEN ebc.days_to_expiry < 30 THEN 20 * 0.2
            WHEN ebc.days_to_expiry < 90 THEN 40 * 0.2
            WHEN ebc.days_to_expiry < 180 THEN 60 * 0.2
            ELSE 80 * 0.2
        END
    ) as composite_allocation_score

FROM enhanced_batch_costing_view ebc
WHERE ebc.available_quantity > 0
ORDER BY composite_allocation_score DESC;

-- Create stored procedure for automatic cost allocation
DELIMITER //

CREATE PROCEDURE AllocatePurchaseOrderCosts(
    IN p_purchase_order_id INT,
    IN p_allocation_method ENUM('by_value', 'by_weight', 'by_quantity', 'manual')
)
BEGIN
    DECLARE v_total_freight DECIMAL(12,2);
    DECLARE v_total_insurance DECIMAL(12,2);
    DECLARE v_total_duty DECIMAL(12,2);
    DECLARE v_total_handling DECIMAL(12,2);
    DECLARE v_total_other DECIMAL(12,2);
    DECLARE v_total_po_value DECIMAL(12,2);
    DECLARE v_total_po_weight DECIMAL(12,2);
    DECLARE v_total_po_quantity DECIMAL(12,2);
    DECLARE v_allocation_base DECIMAL(12,2);
    
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_batch_id INT;
    DECLARE v_batch_value DECIMAL(12,2);
    DECLARE v_batch_weight DECIMAL(10,3);
    DECLARE v_batch_quantity DECIMAL(10,2);
    DECLARE v_allocation_factor DECIMAL(10,6);
    
    -- Cursor for batch allocation
    DECLARE batch_cursor CURSOR FOR
        SELECT 
            ib.id,
            (ib.received_quantity * ib.purchase_price) as batch_value,
            (ib.received_quantity * COALESCE(p.weight_per_unit, 0)) as batch_weight,
            ib.received_quantity as batch_quantity
        FROM inventory_batches ib
        LEFT JOIN products p ON ib.product_id = p.id
        WHERE ib.purchase_order_id = p_purchase_order_id
        AND ib.cost_allocation_status = 'pending';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Get PO level costs
    SELECT 
        total_freight_cost, total_insurance_cost, total_customs_duty,
        total_handling_charges, total_other_charges,
        total_po_value, total_po_weight, total_po_quantity
    INTO 
        v_total_freight, v_total_insurance, v_total_duty,
        v_total_handling, v_total_other,
        v_total_po_value, v_total_po_weight, v_total_po_quantity
    FROM purchase_order_costs
    WHERE purchase_order_id = p_purchase_order_id;
    
    -- Determine allocation base
    CASE p_allocation_method
        WHEN 'by_value' THEN SET v_allocation_base = v_total_po_value;
        WHEN 'by_weight' THEN SET v_allocation_base = v_total_po_weight;
        WHEN 'by_quantity' THEN SET v_allocation_base = v_total_po_quantity;
        ELSE SET v_allocation_base = v_total_po_value;
    END CASE;
    
    -- Allocate costs to each batch
    OPEN batch_cursor;
    
    cost_allocation_loop: LOOP
        FETCH batch_cursor INTO v_batch_id, v_batch_value, v_batch_weight, v_batch_quantity;
        
        IF done THEN
            LEAVE cost_allocation_loop;
        END IF;
        
        -- Calculate allocation factor based on method
        CASE p_allocation_method
            WHEN 'by_value' THEN 
                SET v_allocation_factor = CASE WHEN v_allocation_base > 0 THEN v_batch_value / v_allocation_base ELSE 0 END;
            WHEN 'by_weight' THEN 
                SET v_allocation_factor = CASE WHEN v_allocation_base > 0 THEN v_batch_weight / v_allocation_base ELSE 0 END;
            WHEN 'by_quantity' THEN 
                SET v_allocation_factor = CASE WHEN v_allocation_base > 0 THEN v_batch_quantity / v_allocation_base ELSE 0 END;
            ELSE 
                SET v_allocation_factor = CASE WHEN v_allocation_base > 0 THEN v_batch_value / v_allocation_base ELSE 0 END;
        END CASE;
        
        -- Update batch with allocated costs
        UPDATE inventory_batches SET
            freight_cost = v_total_freight * v_allocation_factor,
            insurance_cost = v_total_insurance * v_allocation_factor,
            customs_duty = v_total_duty * v_allocation_factor,
            handling_charges = v_total_handling * v_allocation_factor,
            other_charges = v_total_other * v_allocation_factor,
            cost_allocation_status = 'complete',
            cost_allocated_date = NOW()
        WHERE id = v_batch_id;
        
    END LOOP;
    
    CLOSE batch_cursor;
    
    -- Update PO cost allocation status
    UPDATE purchase_order_costs SET
        allocation_status = 'allocated',
        allocated_at = NOW()
    WHERE purchase_order_id = p_purchase_order_id;
    
    COMMIT;
    
END //

DELIMITER ;

-- Create index for performance optimization
CREATE INDEX idx_batches_landed_cost ON inventory_batches(product_id, location_id, landed_cost_per_unit);
CREATE INDEX idx_batches_allocation_score ON inventory_batches(product_id, location_id, purchase_date, cost_allocation_status);
CREATE INDEX idx_batches_expiry_cost ON inventory_batches(expiry_date, landed_cost_per_unit) WHERE status = 'active';

-- Add sample data for testing
INSERT INTO purchase_order_costs (
    purchase_order_id, purchase_order_number, 
    total_freight_cost, total_insurance_cost, total_customs_duty,
    total_handling_charges, total_other_charges,
    allocation_method, total_po_value, po_currency, exchange_rate
) VALUES (
    1, 'PO-2024-001', 
    15000.00, 2500.00, 8000.00,
    1500.00, 1000.00,
    'by_value', 250000.00, 'USD', 83.25
);

-- Create triggers to maintain cost allocation consistency
DELIMITER //

CREATE TRIGGER update_batch_costing_on_quantity_change
    AFTER UPDATE ON inventory_batches
    FOR EACH ROW
BEGIN
    -- Recalculate per-unit costs when quantity changes
    IF NEW.received_quantity != OLD.received_quantity AND NEW.received_quantity > 0 THEN
        UPDATE inventory_batches SET 
            cost_allocation_status = CASE 
                WHEN cost_allocation_status = 'complete' THEN 'partial'
                ELSE cost_allocation_status
            END
        WHERE id = NEW.id;
    END IF;
END //

DELIMITER ;

COMMENT ON TABLE inventory_batches IS 'Enhanced with landed cost calculation and allocation tracking';
COMMENT ON VIEW enhanced_batch_costing_view IS 'Comprehensive view for inventory costing with all cost components';
COMMENT ON VIEW optimal_allocation_enhanced IS 'Enhanced allocation scoring with true landed costs';