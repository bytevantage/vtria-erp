-- Vendor Price History System
-- Tracks price changes and vendor discounts over time for smart procurement decisions

CREATE TABLE vendor_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    effective_date DATE NOT NULL,
    valid_until DATE NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    minimum_quantity DECIMAL(10,2) DEFAULT 1.00,
    lead_time_days INT DEFAULT 7,
    payment_terms VARCHAR(255),
    delivery_terms VARCHAR(255),
    warranty_terms VARCHAR(255),
    notes TEXT,
    source ENUM('quotation', 'purchase_order', 'invoice', 'manual') DEFAULT 'quotation',
    status ENUM('active', 'expired', 'superseded') DEFAULT 'active',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_product_supplier (product_id, supplier_id),
    INDEX idx_effective_date (effective_date),
    INDEX idx_status (status)
);

-- Vendor Discount Matrix for volume-based pricing
CREATE TABLE vendor_discount_matrix (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    supplier_id INT NOT NULL,
    min_quantity DECIMAL(10,2) NOT NULL,
    max_quantity DECIMAL(10,2) NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    effective_date DATE NOT NULL,
    valid_until DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    
    INDEX idx_product_supplier_qty (product_id, supplier_id, min_quantity)
);

-- Best Price View for quick access to current best prices
CREATE VIEW v_best_vendor_prices AS
SELECT 
    vph.product_id,
    p.name as product_name,
    vph.supplier_id,
    s.supplier_name,
    vph.price,
    vph.discount_percentage,
    ROUND(vph.price * (1 - vph.discount_percentage/100), 2) as net_price,
    vph.lead_time_days,
    vph.minimum_quantity,
    vph.effective_date,
    vph.valid_until,
    vph.payment_terms,
    ROW_NUMBER() OVER (PARTITION BY vph.product_id ORDER BY (vph.price * (1 - vph.discount_percentage/100))) as price_rank
FROM vendor_price_history vph
JOIN products p ON vph.product_id = p.id
JOIN suppliers s ON vph.supplier_id = s.id
WHERE vph.status = 'active' 
    AND (vph.valid_until IS NULL OR vph.valid_until >= CURDATE())
    AND vph.effective_date <= CURDATE();

-- Price Trend Analysis View
CREATE VIEW v_vendor_price_trends AS
SELECT 
    vph.product_id,
    p.name as product_name,
    vph.supplier_id,
    s.supplier_name,
    COUNT(*) as price_updates,
    MIN(vph.price) as min_price,
    MAX(vph.price) as max_price,
    AVG(vph.price) as avg_price,
    STDDEV(vph.price) as price_volatility,
    MAX(vph.created_at) as last_updated
FROM vendor_price_history vph
JOIN products p ON vph.product_id = p.id
JOIN suppliers s ON vph.supplier_id = s.id
WHERE vph.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
GROUP BY vph.product_id, vph.supplier_id, p.name, s.supplier_name;