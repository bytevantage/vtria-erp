-- Competitive Bidding System Database Schema
-- This creates the tables needed for RFQ (Request for Quote) competitive bidding

-- RFQ Campaigns table
CREATE TABLE IF NOT EXISTS rfq_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id VARCHAR(50) NOT NULL, -- Links to quotations.quotation_id
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATE NOT NULL,
    terms TEXT,
    status ENUM('draft', 'sent', 'bidding', 'evaluation', 'completed', 'cancelled') DEFAULT 'draft',
    winner_supplier_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- RFQ Suppliers (which suppliers received this RFQ)
CREATE TABLE IF NOT EXISTS rfq_suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_id INT NOT NULL,
    supplier_id INT NOT NULL,
    status ENUM('sent', 'viewed', 'responded', 'declined') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP NULL,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (rfq_id) REFERENCES rfq_campaigns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rfq_supplier (rfq_id, supplier_id),
    INDEX idx_supplier_id (supplier_id)
);

-- Supplier Bids (responses from suppliers)
CREATE TABLE IF NOT EXISTS supplier_bids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_id INT NOT NULL,
    supplier_id INT NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    delivery_days INT NOT NULL,
    payment_terms VARCHAR(255),
    notes TEXT,
    status ENUM('draft', 'submitted', 'under_review', 'won', 'lost') DEFAULT 'draft',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP NULL,
    FOREIGN KEY (rfq_id) REFERENCES rfq_campaigns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rfq_supplier_bid (rfq_id, supplier_id),
    INDEX idx_rfq_id (rfq_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_total_price (total_price)
);

-- Supplier Bid Items (detailed line items in each bid)
CREATE TABLE IF NOT EXISTS supplier_bid_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bid_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    notes TEXT,
    FOREIGN KEY (bid_id) REFERENCES supplier_bids(id) ON DELETE CASCADE,
    INDEX idx_bid_id (bid_id)
);

-- Add RFQ reference to purchase_requisitions table (if column doesn't exist)
ALTER TABLE purchase_requisitions 
ADD COLUMN IF NOT EXISTS rfq_id INT NULL,
ADD INDEX IF NOT EXISTS idx_rfq_id (rfq_id);

-- Sample data for testing
INSERT IGNORE INTO rfq_campaigns (rfq_number, quotation_id, title, description, deadline, terms, status, created_by) VALUES
('RFQ-2025-001', 'QUO-2025-001', 'Office Equipment Procurement', 'Competitive bidding for office furniture and equipment', '2025-10-15', 'Net 30 payment terms, FOB destination', 'sent', 1),
('RFQ-2025-002', 'QUO-2025-002', 'Manufacturing Components', 'RFQ for precision manufacturing components', '2025-10-20', 'Net 45 payment terms, quality certification required', 'sent', 1);

-- Create views for better data access
CREATE OR REPLACE VIEW rfq_campaigns_summary AS
SELECT 
    r.*,
    COUNT(DISTINCT rs.supplier_id) as suppliers_invited,
    COUNT(DISTINCT sb.id) as bids_received,
    MIN(sb.total_price) as lowest_bid,
    MAX(sb.total_price) as highest_bid,
    AVG(sb.total_price) as average_bid,
    (MAX(sb.total_price) - MIN(sb.total_price)) as bid_range,
    CASE 
        WHEN COUNT(DISTINCT sb.id) > 0 THEN 
            ROUND(((MAX(sb.total_price) - MIN(sb.total_price)) / MAX(sb.total_price) * 100), 2)
        ELSE 0 
    END as savings_percentage
FROM rfq_campaigns r
LEFT JOIN rfq_suppliers rs ON r.id = rs.rfq_id
LEFT JOIN supplier_bids sb ON r.id = sb.rfq_id AND sb.status = 'submitted'
GROUP BY r.id;

-- Competitive bidding analytics view
CREATE OR REPLACE VIEW competitive_bidding_analytics AS
SELECT 
    r.id as rfq_id,
    r.rfq_number,
    r.title,
    COUNT(DISTINCT sb.supplier_id) as participating_suppliers,
    MIN(sb.total_price) as winning_price,
    MAX(sb.total_price) as highest_price,
    AVG(sb.total_price) as average_price,
    (MAX(sb.total_price) - MIN(sb.total_price)) as cost_savings,
    ROUND(((MAX(sb.total_price) - MIN(sb.total_price)) / MAX(sb.total_price) * 100), 2) as savings_percentage,
    s.company_name as winning_supplier
FROM rfq_campaigns r
LEFT JOIN supplier_bids sb ON r.id = sb.rfq_id AND sb.status IN ('submitted', 'won')
LEFT JOIN suppliers s ON r.winner_supplier_id = s.id
WHERE r.status = 'completed'
GROUP BY r.id
HAVING participating_suppliers > 1;