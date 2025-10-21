-- Serial Number and Warranty Tracking Tables
-- This file creates the missing tables for serial number tracking and warranty management

-- Warranty Claims Table
CREATE TABLE IF NOT EXISTS warranty_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    serial_number_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(191),
    issue_description TEXT NOT NULL,
    claim_type ENUM('repair', 'replacement', 'refund') DEFAULT 'repair',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    warranty_valid BOOLEAN DEFAULT TRUE,
    status ENUM('open', 'in_progress', 'resolved', 'closed', 'rejected') DEFAULT 'open',
    resolution_notes TEXT,
    replacement_serial_number VARCHAR(100),
    repair_cost DECIMAL(10,2) DEFAULT 0.00,
    handled_by INT,
    claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_date TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (serial_number_id) REFERENCES product_serial_numbers(id) ON DELETE CASCADE,
    FOREIGN KEY (handled_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),

    -- Indexes
    INDEX idx_claim_number (claim_number),
    INDEX idx_claim_serial (serial_number_id),
    INDEX idx_claim_status (status),
    INDEX idx_claim_priority (priority),
    INDEX idx_claim_date (claim_date)
) COMMENT='Warranty claims for serial numbered products';

-- Serial Number History Table
CREATE TABLE IF NOT EXISTS serial_number_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_number_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by INT NOT NULL,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    -- Foreign Keys
    FOREIGN KEY (serial_number_id) REFERENCES product_serial_numbers(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),

    -- Indexes
    INDEX idx_history_serial (serial_number_id),
    INDEX idx_history_date (change_date),
    INDEX idx_history_status (status)
) COMMENT='History of serial number status changes';

-- Update product_serial_numbers table to include missing fields used by the controller
ALTER TABLE product_serial_numbers
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
ADD COLUMN IF NOT EXISTS warranty_months INT DEFAULT 12,
ADD COLUMN IF NOT EXISTS sales_order_id INT,
ADD COLUMN IF NOT EXISTS created_by INT,
ADD COLUMN IF NOT EXISTS updated_by INT,
ADD COLUMN IF NOT EXISTS notes TEXT,

-- Add foreign keys for the new fields
ADD CONSTRAINT fk_serial_sales_order FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
ADD CONSTRAINT fk_serial_created_by FOREIGN KEY (created_by) REFERENCES users(id),
ADD CONSTRAINT fk_serial_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- Add indexes for performance
ALTER TABLE product_serial_numbers
ADD INDEX IF NOT EXISTS idx_serial_batch (batch_number),
ADD INDEX IF NOT EXISTS idx_serial_manufacturing (manufacturing_date),
ADD INDEX IF NOT EXISTS idx_serial_sales_order (sales_order_id);