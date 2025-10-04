-- Create RFQ (Request for Quotation) system for competitive bidding
-- This allows creating competitive bidding campaigns from open quotations

-- RFQ Campaigns Table
CREATE TABLE IF NOT EXISTS rfq_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id INT NOT NULL, -- Reference to the quotation being bid on
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATETIME NOT NULL,
    terms TEXT,
    status ENUM('draft', 'sent', 'active', 'closed', 'cancelled') DEFAULT 'draft',
    winning_bid_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quotation_id (quotation_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- RFQ Suppliers - tracks which suppliers were invited to bid
CREATE TABLE IF NOT EXISTS rfq_suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_id INT NOT NULL,
    supplier_id INT NOT NULL,
    status ENUM('sent', 'viewed', 'responded', 'declined') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (rfq_id) REFERENCES rfq_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rfq_supplier (rfq_id, supplier_id),
    INDEX idx_rfq_id (rfq_id),
    INDEX idx_supplier_id (supplier_id)
);

-- Supplier Bids - stores the bids submitted by suppliers
CREATE TABLE IF NOT EXISTS supplier_bids (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rfq_id INT NOT NULL,
    supplier_id INT NOT NULL,
    bid_number VARCHAR(50) UNIQUE NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    delivery_time_days INT NOT NULL,
    notes TEXT,
    terms TEXT,
    status ENUM('submitted', 'under_review', 'accepted', 'rejected') DEFAULT 'submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (rfq_id) REFERENCES rfq_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_rfq_id (rfq_id),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_total_price (total_price)
);

-- Supplier Bid Items - line items for each bid
CREATE TABLE IF NOT EXISTS supplier_bid_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bid_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    delivery_days INT NOT NULL,
    notes TEXT,
    FOREIGN KEY (bid_id) REFERENCES supplier_bids(id) ON DELETE CASCADE,
    INDEX idx_bid_id (bid_id)
);

-- Add RFQ reference to purchase_requisitions table (check if column exists first)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'purchase_requisitions' 
     AND COLUMN_NAME = 'rfq_id') = 0,
    'ALTER TABLE purchase_requisitions ADD COLUMN rfq_id INT NULL',
    'SELECT 1'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for rfq_id if column was added
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'purchase_requisitions' 
     AND INDEX_NAME = 'idx_rfq_id') = 0,
    'ALTER TABLE purchase_requisitions ADD INDEX idx_rfq_id (rfq_id)',
    'SELECT 1'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;