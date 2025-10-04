-- Advance Payment Management Schema for Purchase Orders
-- This schema adds comprehensive advance payment tracking capabilities

-- Create purchase order advance payments table
CREATE TABLE IF NOT EXISTS po_advance_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Generated payment ID (VESPL/ADV/YYYY/XXX)',
    purchase_order_id INT NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN po_grand_total > 0 THEN (payment_amount / po_grand_total) * 100
            ELSE 0
        END
    ) STORED COMMENT 'Percentage of PO amount',
    po_grand_total DECIMAL(15,2) NOT NULL COMMENT 'PO total at time of payment',
    
    -- Payment Details
    payment_date DATE NOT NULL,
    payment_method ENUM('bank_transfer', 'cheque', 'upi', 'cash', 'dd', 'online') DEFAULT 'bank_transfer',
    bank_name VARCHAR(100) NULL,
    cheque_number VARCHAR(50) NULL,
    transaction_reference VARCHAR(100) NULL,
    utr_number VARCHAR(50) NULL,
    
    -- Status and Tracking
    payment_status ENUM('pending', 'cleared', 'bounced', 'cancelled') DEFAULT 'pending',
    payment_due_date DATE NULL COMMENT 'When payment is expected to clear',
    cleared_date DATE NULL,
    
    -- Adjustment and Refund
    is_adjustment BOOLEAN DEFAULT FALSE COMMENT 'Whether this is an adjustment entry',
    adjustment_reason TEXT NULL,
    refund_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Amount refunded from this payment',
    adjusted_against_invoice DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Amount adjusted against final invoice',
    
    -- Approval Workflow
    requested_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    
    -- Additional Information
    notes TEXT NULL,
    attachment_path VARCHAR(255) NULL COMMENT 'Path to payment proof document',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_po_advance_po_id (purchase_order_id),
    INDEX idx_po_advance_payment_date (payment_date),
    INDEX idx_po_advance_status (payment_status),
    INDEX idx_po_advance_approval (approval_status),
    INDEX idx_po_advance_payment_number (payment_number)
);

-- Create purchase order payment summary table (for quick lookups)
CREATE TABLE IF NOT EXISTS po_payment_summary (
    purchase_order_id INT PRIMARY KEY,
    po_grand_total DECIMAL(15,2) NOT NULL,
    total_advance_paid DECIMAL(15,2) DEFAULT 0.00,
    total_advance_cleared DECIMAL(15,2) DEFAULT 0.00,
    total_advance_pending DECIMAL(15,2) DEFAULT 0.00,
    total_refunded DECIMAL(15,2) DEFAULT 0.00,
    total_adjusted DECIMAL(15,2) DEFAULT 0.00,
    balance_amount DECIMAL(15,2) GENERATED ALWAYS AS (
        po_grand_total - total_advance_cleared + total_refunded - total_adjusted
    ) STORED,
    advance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN po_grand_total > 0 THEN (total_advance_cleared / po_grand_total) * 100
            ELSE 0
        END
    ) STORED,
    payment_count INT DEFAULT 0,
    last_payment_date DATE NULL,
    next_payment_due DATE NULL,
    payment_status ENUM('no_advance', 'partial_advance', 'full_advance', 'over_paid') 
        GENERATED ALWAYS AS (
            CASE 
                WHEN total_advance_cleared = 0 THEN 'no_advance'
                WHEN total_advance_cleared >= po_grand_total THEN 'full_advance'
                WHEN total_advance_cleared > po_grand_total THEN 'over_paid'
                ELSE 'partial_advance'
            END
        ) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- Add advance payment tracking columns to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS advance_percentage DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Expected advance percentage',
ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(15,2) DEFAULT 0.00 COMMENT 'Expected advance amount',
ADD COLUMN IF NOT EXISTS advance_due_date DATE NULL COMMENT 'When advance payment is due',
ADD COLUMN IF NOT EXISTS payment_schedule TEXT NULL COMMENT 'JSON array of payment milestones';

-- Create indexes for better performance
ALTER TABLE purchase_orders 
ADD INDEX IF NOT EXISTS idx_po_advance_due (advance_due_date),
ADD INDEX IF NOT EXISTS idx_po_payment_status ((
    CASE 
        WHEN advance_amount = 0 THEN 'no_advance_required'
        WHEN advance_due_date < CURDATE() THEN 'advance_overdue'
        WHEN advance_due_date = CURDATE() THEN 'advance_due_today'
        ELSE 'advance_pending'
    END
));

-- Create trigger to update payment summary when advance payments change
DELIMITER $$

DROP TRIGGER IF EXISTS update_po_payment_summary_after_insert$$
CREATE TRIGGER update_po_payment_summary_after_insert
    AFTER INSERT ON po_advance_payments
    FOR EACH ROW
BEGIN
    -- Insert or update payment summary
    INSERT INTO po_payment_summary (
        purchase_order_id, 
        po_grand_total,
        total_advance_paid,
        total_advance_cleared,
        total_advance_pending,
        total_refunded,
        total_adjusted,
        payment_count,
        last_payment_date
    )
    SELECT 
        NEW.purchase_order_id,
        po.grand_total,
        COALESCE(SUM(pap.payment_amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN pap.payment_status = 'cleared' THEN pap.payment_amount ELSE 0 END), 0) as total_cleared,
        COALESCE(SUM(CASE WHEN pap.payment_status = 'pending' THEN pap.payment_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(pap.refund_amount), 0) as total_refunded,
        COALESCE(SUM(pap.adjusted_against_invoice), 0) as total_adjusted,
        COUNT(pap.id) as payment_count,
        MAX(pap.payment_date) as last_payment_date
    FROM purchase_orders po
    LEFT JOIN po_advance_payments pap ON po.id = pap.purchase_order_id
    WHERE po.id = NEW.purchase_order_id
    GROUP BY po.id
    ON DUPLICATE KEY UPDATE
        po_grand_total = VALUES(po_grand_total),
        total_advance_paid = VALUES(total_advance_paid),
        total_advance_cleared = VALUES(total_advance_cleared),
        total_advance_pending = VALUES(total_advance_pending),
        total_refunded = VALUES(total_refunded),
        total_adjusted = VALUES(total_adjusted),
        payment_count = VALUES(payment_count),
        last_payment_date = VALUES(last_payment_date);
END$$

DROP TRIGGER IF EXISTS update_po_payment_summary_after_update$$
CREATE TRIGGER update_po_payment_summary_after_update
    AFTER UPDATE ON po_advance_payments
    FOR EACH ROW
BEGIN
    -- Update payment summary
    INSERT INTO po_payment_summary (
        purchase_order_id, 
        po_grand_total,
        total_advance_paid,
        total_advance_cleared,
        total_advance_pending,
        total_refunded,
        total_adjusted,
        payment_count,
        last_payment_date
    )
    SELECT 
        NEW.purchase_order_id,
        po.grand_total,
        COALESCE(SUM(pap.payment_amount), 0) as total_paid,
        COALESCE(SUM(CASE WHEN pap.payment_status = 'cleared' THEN pap.payment_amount ELSE 0 END), 0) as total_cleared,
        COALESCE(SUM(CASE WHEN pap.payment_status = 'pending' THEN pap.payment_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(pap.refund_amount), 0) as total_refunded,
        COALESCE(SUM(pap.adjusted_against_invoice), 0) as total_adjusted,
        COUNT(pap.id) as payment_count,
        MAX(pap.payment_date) as last_payment_date
    FROM purchase_orders po
    LEFT JOIN po_advance_payments pap ON po.id = pap.purchase_order_id
    WHERE po.id = NEW.purchase_order_id
    GROUP BY po.id
    ON DUPLICATE KEY UPDATE
        po_grand_total = VALUES(po_grand_total),
        total_advance_paid = VALUES(total_advance_paid),
        total_advance_cleared = VALUES(total_advance_cleared),
        total_advance_pending = VALUES(total_advance_pending),
        total_refunded = VALUES(total_refunded),
        total_adjusted = VALUES(total_adjusted),
        payment_count = VALUES(payment_count),
        last_payment_date = VALUES(last_payment_date);
END$$

DELIMITER ;

-- Sample data for testing
/*
-- Sample advance payment entries
INSERT INTO po_advance_payments (
    payment_number, purchase_order_id, payment_amount, po_grand_total,
    payment_date, payment_method, bank_name, transaction_reference,
    payment_status, requested_by, created_by
) VALUES 
('VESPL/ADV/2526/001', 1, 25000.00, 100000.00, CURDATE(), 'bank_transfer', 
 'HDFC Bank', 'TXN202501001', 'cleared', 1, 1),
('VESPL/ADV/2526/002', 1, 15000.00, 100000.00, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 
 'cheque', 'ICICI Bank', 'CHQ456789', 'pending', 1, 1);
*/