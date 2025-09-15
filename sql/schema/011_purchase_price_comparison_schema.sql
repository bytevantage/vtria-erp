-- Purchase price comparison system schema
-- VTRIA Engineering Solutions Pvt Ltd

-- Suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    gstin VARCHAR(20),
    pan VARCHAR(15),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    rating ENUM('excellent', 'good', 'average', 'poor') DEFAULT 'good',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name_active (name, is_active),
    INDEX idx_code (code)
);

-- Insert sample suppliers
INSERT INTO suppliers (name, code, contact_person, email, phone, address, city, state, is_active) VALUES
('ABC Electronics Pvt Ltd', 'ABC-001', 'Rajesh Kumar', 'rajesh@abcelectronics.com', '+91-9876543210', 'Industrial Area, Phase 1', 'Bangalore', 'Karnataka', TRUE),
('XYZ Components Ltd', 'XYZ-002', 'Priya Sharma', 'priya@xyzcomponents.com', '+91-9876543211', 'Electronic City', 'Bangalore', 'Karnataka', TRUE),
('Tech Solutions India', 'TSI-003', 'Amit Patel', 'amit@techsolutions.in', '+91-9876543212', 'MIDC Area', 'Pune', 'Maharashtra', TRUE),
('Industrial Parts Co', 'IPC-004', 'Sunita Reddy', 'sunita@industrialparts.com', '+91-9876543213', 'Whitefield', 'Bangalore', 'Karnataka', TRUE);

-- Supplier quote requests table
CREATE TABLE IF NOT EXISTS supplier_quote_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    estimation_id INT,
    supplier_id INT NOT NULL,
    status ENUM('draft', 'sent', 'received', 'expired', 'cancelled') DEFAULT 'draft',
    due_date DATE,
    notes TEXT,
    requested_by INT NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    INDEX idx_estimation_supplier (estimation_id, supplier_id),
    INDEX idx_status_date (status, due_date)
);

-- Supplier quote request items table
CREATE TABLE IF NOT EXISTS supplier_quote_request_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    estimated_price DECIMAL(10,2) NOT NULL,
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES supplier_quote_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_request_product (request_id, product_id)
);

-- Supplier quotes table
CREATE TABLE IF NOT EXISTS supplier_quotes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quote_number VARCHAR(50) NOT NULL,
    request_id INT,
    supplier_id INT NOT NULL,
    quote_date DATE NOT NULL,
    valid_until DATE,
    payment_terms VARCHAR(200),
    delivery_terms VARCHAR(200),
    total_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    grand_total DECIMAL(15,2) GENERATED ALWAYS AS (total_amount + tax_amount) STORED,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('received', 'under_review', 'approved', 'rejected', 'expired') DEFAULT 'received',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES supplier_quote_requests(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_supplier_date (supplier_id, quote_date),
    INDEX idx_status_valid (status, valid_until)
);

-- Supplier quote items table
CREATE TABLE IF NOT EXISTS supplier_quote_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quote_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    delivery_time VARCHAR(50),
    specifications TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES supplier_quotes(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_quote_product (quote_id, product_id),
    INDEX idx_product_price (product_id, unit_price)
);

-- Price comparison history table
CREATE TABLE IF NOT EXISTS price_comparison_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estimation_id INT NOT NULL,
    product_id INT NOT NULL,
    estimated_price DECIMAL(10,2) NOT NULL,
    best_quoted_price DECIMAL(10,2),
    best_supplier_id INT,
    price_variance DECIMAL(10,2),
    variance_percentage DECIMAL(5,2),
    potential_savings DECIMAL(15,2),
    comparison_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (best_supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_estimation_product (estimation_id, product_id),
    INDEX idx_comparison_date (comparison_date)
);

-- Supplier performance tracking table
CREATE TABLE IF NOT EXISTS supplier_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_id INT NOT NULL,
    metric_type ENUM('price_competitiveness', 'delivery_time', 'quality_rating', 'response_time') NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    reference_type ENUM('quote', 'purchase_order', 'delivery') NOT NULL,
    reference_id INT NOT NULL,
    measurement_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    INDEX idx_supplier_metric (supplier_id, metric_type),
    INDEX idx_measurement_date (measurement_date)
);

-- Quote comparison analysis table
CREATE TABLE IF NOT EXISTS quote_comparison_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    estimation_id INT NOT NULL,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_estimated_cost DECIMAL(15,2) NOT NULL,
    total_best_quoted_cost DECIMAL(15,2) NOT NULL,
    potential_savings DECIMAL(15,2) NOT NULL,
    savings_percentage DECIMAL(5,2) NOT NULL,
    items_with_quotes INT DEFAULT 0,
    total_items INT DEFAULT 0,
    coverage_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((items_with_quotes / total_items) * 100) STORED,
    recommended_suppliers JSON,
    analysis_notes TEXT,
    created_by INT NOT NULL,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_estimation_date (estimation_id, analysis_date)
);

-- Views for reporting and analysis
CREATE OR REPLACE VIEW supplier_quote_summary AS
SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    s.rating,
    COUNT(DISTINCT sq.id) as total_quotes,
    COUNT(DISTINCT CASE WHEN sq.status = 'approved' THEN sq.id END) as approved_quotes,
    AVG(sq.total_amount) as avg_quote_amount,
    MIN(sq.quote_date) as first_quote_date,
    MAX(sq.quote_date) as last_quote_date,
    AVG(DATEDIFF(sq.created_at, sqr.requested_at)) as avg_response_time_days
FROM suppliers s
LEFT JOIN supplier_quotes sq ON s.id = sq.supplier_id
LEFT JOIN supplier_quote_requests sqr ON sq.request_id = sqr.id
WHERE s.is_active = 1
GROUP BY s.id, s.name, s.rating;

CREATE OR REPLACE VIEW price_variance_analysis AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    COUNT(DISTINCT sqi.quote_id) as quote_count,
    AVG(sqi.unit_price) as avg_quoted_price,
    MIN(sqi.unit_price) as min_quoted_price,
    MAX(sqi.unit_price) as max_quoted_price,
    STDDEV(sqi.unit_price) as price_std_deviation,
    (MAX(sqi.unit_price) - MIN(sqi.unit_price)) as price_range,
    ROUND(((MAX(sqi.unit_price) - MIN(sqi.unit_price)) / AVG(sqi.unit_price)) * 100, 2) as price_variance_percent
FROM products p
INNER JOIN supplier_quote_items sqi ON p.id = sqi.product_id
INNER JOIN supplier_quotes sq ON sqi.quote_id = sq.id
WHERE sq.status IN ('received', 'under_review', 'approved')
AND (sq.valid_until IS NULL OR sq.valid_until >= CURDATE())
GROUP BY p.id, p.name, p.sku
HAVING quote_count >= 2;

CREATE OR REPLACE VIEW estimation_savings_potential AS
SELECT 
    e.id as estimation_id,
    e.estimation_number,
    c.name as client_name,
    SUM(ei.total_price) as total_estimated_cost,
    SUM(CASE WHEN best_quotes.min_price IS NOT NULL 
        THEN (ei.quantity * best_quotes.min_price) 
        ELSE ei.total_price END) as total_best_quoted_cost,
    SUM(CASE WHEN best_quotes.min_price IS NOT NULL 
        THEN (ei.total_price - (ei.quantity * best_quotes.min_price))
        ELSE 0 END) as potential_savings,
    COUNT(ei.id) as total_items,
    COUNT(best_quotes.product_id) as items_with_quotes,
    ROUND((COUNT(best_quotes.product_id) / COUNT(ei.id)) * 100, 2) as quote_coverage_percent
FROM estimations e
LEFT JOIN clients c ON e.client_id = c.id
LEFT JOIN estimation_items ei ON e.id = ei.estimation_id
LEFT JOIN (
    SELECT 
        sqi.product_id,
        MIN(sqi.unit_price) as min_price
    FROM supplier_quote_items sqi
    INNER JOIN supplier_quotes sq ON sqi.quote_id = sq.id
    WHERE sq.status IN ('received', 'under_review', 'approved')
    AND (sq.valid_until IS NULL OR sq.valid_until >= CURDATE())
    GROUP BY sqi.product_id
) best_quotes ON ei.product_id = best_quotes.product_id
GROUP BY e.id, e.estimation_number, c.name;

-- Triggers for automatic updates
DELIMITER //

-- Update quote request status when quote is received
CREATE TRIGGER IF NOT EXISTS update_request_status_on_quote 
AFTER INSERT ON supplier_quotes
FOR EACH ROW
BEGIN
    UPDATE supplier_quote_requests 
    SET status = 'received', received_at = NOW()
    WHERE id = NEW.request_id;
END//

-- Update supplier performance metrics when quote is created
CREATE TRIGGER IF NOT EXISTS track_supplier_response_time 
AFTER INSERT ON supplier_quotes
FOR EACH ROW
BEGIN
    DECLARE response_time_days INT;
    
    SELECT DATEDIFF(NEW.created_at, sqr.requested_at) INTO response_time_days
    FROM supplier_quote_requests sqr 
    WHERE sqr.id = NEW.request_id;
    
    INSERT INTO supplier_performance 
    (supplier_id, metric_type, metric_value, reference_type, reference_id, measurement_date)
    VALUES 
    (NEW.supplier_id, 'response_time', response_time_days, 'quote', NEW.id, CURDATE());
END//

-- Create price comparison history entry when analysis is done
CREATE TRIGGER IF NOT EXISTS create_price_comparison_history 
AFTER INSERT ON quote_comparison_analysis
FOR EACH ROW
BEGIN
    INSERT INTO price_comparison_history 
    (estimation_id, product_id, estimated_price, best_quoted_price, 
     best_supplier_id, price_variance, variance_percentage, 
     potential_savings, created_by)
    SELECT 
        ei.estimation_id,
        ei.product_id,
        ei.unit_price,
        best_quotes.min_price,
        best_quotes.supplier_id,
        (ei.unit_price - best_quotes.min_price),
        ROUND(((ei.unit_price - best_quotes.min_price) / ei.unit_price) * 100, 2),
        ((ei.unit_price - best_quotes.min_price) * ei.quantity),
        NEW.created_by
    FROM estimation_items ei
    LEFT JOIN (
        SELECT 
            sqi.product_id,
            MIN(sqi.unit_price) as min_price,
            sq.supplier_id
        FROM supplier_quote_items sqi
        INNER JOIN supplier_quotes sq ON sqi.quote_id = sq.id
        WHERE sq.status IN ('received', 'under_review', 'approved')
        AND (sq.valid_until IS NULL OR sq.valid_until >= CURDATE())
        GROUP BY sqi.product_id
    ) best_quotes ON ei.product_id = best_quotes.product_id
    WHERE ei.estimation_id = NEW.estimation_id
    AND best_quotes.min_price IS NOT NULL;
END//

DELIMITER ;

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_quotes_supplier_date ON supplier_quotes(supplier_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_product_price ON supplier_quote_items(product_id, unit_price ASC);
CREATE INDEX IF NOT EXISTS idx_requests_estimation_status ON supplier_quote_requests(estimation_id, status);
CREATE INDEX IF NOT EXISTS idx_performance_supplier_metric_date ON supplier_performance(supplier_id, metric_type, measurement_date DESC);
CREATE INDEX IF NOT EXISTS idx_comparison_estimation_date ON price_comparison_history(estimation_id, comparison_date DESC);
