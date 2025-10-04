-- ===============================================
-- PRODUCTION TAX CONFIGURATION SETUP
-- Enterprise GST Management for VTRIA ERP
-- ===============================================

-- Create tax_config table for state-based GST rates
CREATE TABLE IF NOT EXISTS tax_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    state_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    is_home_state BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_state_code (state_code),
    INDEX idx_state_name (state_name),
    INDEX idx_home_state (is_home_state)
);

-- Insert all Indian states and union territories with GST configuration
INSERT INTO tax_config (state_name, state_code, gst_rate, cgst_rate, sgst_rate, igst_rate, is_home_state) VALUES
-- States
('Andhra Pradesh', 'AP', 18.00, 9.00, 9.00, 18.00, FALSE),
('Arunachal Pradesh', 'AR', 18.00, 9.00, 9.00, 18.00, FALSE),
('Assam', 'AS', 18.00, 9.00, 9.00, 18.00, FALSE),
('Bihar', 'BR', 18.00, 9.00, 9.00, 18.00, FALSE),
('Chhattisgarh', 'CG', 18.00, 9.00, 9.00, 18.00, FALSE),
('Goa', 'GA', 18.00, 9.00, 9.00, 18.00, FALSE),
('Gujarat', 'GJ', 18.00, 9.00, 9.00, 18.00, FALSE),
('Haryana', 'HR', 18.00, 9.00, 9.00, 18.00, FALSE),
('Himachal Pradesh', 'HP', 18.00, 9.00, 9.00, 18.00, FALSE),
('Jharkhand', 'JH', 18.00, 9.00, 9.00, 18.00, FALSE),
('Karnataka', 'KA', 18.00, 9.00, 9.00, 18.00, TRUE), -- Default home state
('Kerala', 'KL', 18.00, 9.00, 9.00, 18.00, FALSE),
('Madhya Pradesh', 'MP', 18.00, 9.00, 9.00, 18.00, FALSE),
('Maharashtra', 'MH', 18.00, 9.00, 9.00, 18.00, FALSE),
('Manipur', 'MN', 18.00, 9.00, 9.00, 18.00, FALSE),
('Meghalaya', 'ML', 18.00, 9.00, 9.00, 18.00, FALSE),
('Mizoram', 'MZ', 18.00, 9.00, 9.00, 18.00, FALSE),
('Nagaland', 'NL', 18.00, 9.00, 9.00, 18.00, FALSE),
('Odisha', 'OR', 18.00, 9.00, 9.00, 18.00, FALSE),
('Punjab', 'PB', 18.00, 9.00, 9.00, 18.00, FALSE),
('Rajasthan', 'RJ', 18.00, 9.00, 9.00, 18.00, FALSE),
('Sikkim', 'SK', 18.00, 9.00, 9.00, 18.00, FALSE),
('Tamil Nadu', 'TN', 18.00, 9.00, 9.00, 18.00, FALSE),
('Telangana', 'TS', 18.00, 9.00, 9.00, 18.00, FALSE),
('Tripura', 'TR', 18.00, 9.00, 9.00, 18.00, FALSE),
('Uttar Pradesh', 'UP', 18.00, 9.00, 9.00, 18.00, FALSE),
('Uttarakhand', 'UK', 18.00, 9.00, 9.00, 18.00, FALSE),
('West Bengal', 'WB', 18.00, 9.00, 9.00, 18.00, FALSE),

-- Union Territories
('Andaman and Nicobar Islands', 'AN', 18.00, 9.00, 9.00, 18.00, FALSE),
('Chandigarh', 'CH', 18.00, 9.00, 9.00, 18.00, FALSE),
('Dadra and Nagar Haveli and Daman and Diu', 'DN', 18.00, 9.00, 9.00, 18.00, FALSE),
('Delhi', 'DL', 18.00, 9.00, 9.00, 18.00, FALSE),
('Jammu and Kashmir', 'JK', 18.00, 9.00, 9.00, 18.00, FALSE),
('Ladakh', 'LA', 18.00, 9.00, 9.00, 18.00, FALSE),
('Lakshadweep', 'LD', 18.00, 9.00, 9.00, 18.00, FALSE),
('Puducherry', 'PY', 18.00, 9.00, 9.00, 18.00, FALSE);

-- Add company configuration for home state
INSERT INTO company_config (config_key, config_value, config_description, config_category) VALUES
('company_home_state', 'Karnataka', 'Company home state for GST calculation', 'general'),
('company_state_code', 'KA', 'Company state code for GST calculation', 'general'),
('default_gst_rate', '18.00', 'Default GST rate when product GST not specified', 'general'),
('gst_calculation_enabled', 'true', 'Enable automatic GST calculation', 'general')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP;

-- Create function to get tax rates for a state
DELIMITER //
CREATE FUNCTION GetTaxRates(client_state VARCHAR(100))
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE tax_data JSON;
    DECLARE home_state VARCHAR(100);
    DECLARE is_interstate BOOLEAN DEFAULT FALSE;
    
    -- Get home state
    SELECT state_name INTO home_state 
    FROM tax_config 
    WHERE is_home_state = TRUE 
    LIMIT 1;
    
    -- Determine if interstate
    SET is_interstate = (client_state != home_state);
    
    -- Get tax configuration
    SELECT JSON_OBJECT(
        'cgst_rate', cgst_rate,
        'sgst_rate', sgst_rate,
        'igst_rate', igst_rate,
        'is_interstate', is_interstate,
        'home_state', home_state,
        'client_state', client_state
    ) INTO tax_data
    FROM tax_config 
    WHERE state_name = client_state AND is_active = TRUE
    LIMIT 1;
    
    -- Return default if state not found
    IF tax_data IS NULL THEN
        SET tax_data = JSON_OBJECT(
            'cgst_rate', 9.00,
            'sgst_rate', 9.00,
            'igst_rate', 18.00,
            'is_interstate', is_interstate,
            'home_state', home_state,
            'client_state', client_state
        );
    END IF;
    
    RETURN tax_data;
END//
DELIMITER ;

-- Create view for easy tax calculation
CREATE OR REPLACE VIEW v_tax_calculation AS
SELECT 
    tc.state_name,
    tc.state_code,
    tc.cgst_rate,
    tc.sgst_rate,
    tc.igst_rate,
    tc.is_home_state,
    home.state_name as home_state_name,
    (tc.state_name != home.state_name) as is_interstate
FROM tax_config tc
CROSS JOIN (
    SELECT state_name 
    FROM tax_config 
    WHERE is_home_state = TRUE 
    LIMIT 1
) home
WHERE tc.is_active = TRUE;

-- Add indexes for performance
CREATE INDEX idx_tax_config_active ON tax_config(is_active);
CREATE INDEX idx_tax_config_home_active ON tax_config(is_home_state, is_active);

-- Update products table to ensure gst_rate column exists with proper constraints
ALTER TABLE products 
MODIFY COLUMN gst_rate DECIMAL(5,2) DEFAULT 18.00 COMMENT 'Product-specific GST rate percentage';

-- Update inventory_items_enhanced to ensure gst_rate column exists
ALTER TABLE inventory_items_enhanced 
MODIFY COLUMN gst_rate DECIMAL(5,2) DEFAULT 18.00 COMMENT 'Product-specific GST rate percentage';

-- Create audit table for tax rate changes
CREATE TABLE IF NOT EXISTS tax_rate_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type ENUM('product', 'tax_config', 'quotation', 'sales_order') NOT NULL,
    entity_id INT NOT NULL,
    old_rate DECIMAL(5,2),
    new_rate DECIMAL(5,2),
    changed_by INT,
    change_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_change_date (created_at)
);

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Verify tax configuration
SELECT 'Tax Configuration Status' as check_type, COUNT(*) as total_states, 
       SUM(is_home_state) as home_states, SUM(is_active) as active_states
FROM tax_config;

-- Verify home state configuration
SELECT 'Home State Configuration' as check_type, state_name, state_code, is_home_state
FROM tax_config WHERE is_home_state = TRUE;

-- Verify company configuration
SELECT 'Company Configuration' as check_type, config_key, config_value
FROM company_config 
WHERE config_key IN ('company_home_state', 'company_state_code', 'default_gst_rate', 'gst_calculation_enabled');

-- Sample tax calculation test
SELECT 'Sample Tax Calculation' as test_type,
       state_name,
       CASE 
           WHEN is_interstate THEN CONCAT('IGST: ', igst_rate, '%')
           ELSE CONCAT('CGST: ', cgst_rate, '% + SGST: ', sgst_rate, '%')
       END as applicable_tax
FROM v_tax_calculation 
WHERE state_name IN ('Karnataka', 'Maharashtra', 'Tamil Nadu')
LIMIT 3;