-- ================================
-- VTRIA ERP: Financial Management Module
-- Complete invoicing, payments, and GST compliance system
-- ================================

-- Invoice Management
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Invoice Information
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_type ENUM('sales', 'proforma', 'credit_note', 'debit_note') DEFAULT 'sales',
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Customer Information
    customer_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_gstin VARCHAR(15),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Reference Information
    reference_type ENUM('sales_order', 'quotation', 'manual') NOT NULL,
    reference_id INT,
    reference_number VARCHAR(100),
    
    -- Financial Details
    subtotal DECIMAL(15,4) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,4) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- GST Details
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(15,4) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_amount DECIMAL(15,4) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    igst_amount DECIMAL(15,4) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    cess_amount DECIMAL(15,4) DEFAULT 0,
    
    total_tax_amount DECIMAL(15,4) GENERATED ALWAYS AS (cgst_amount + sgst_amount + igst_amount + cess_amount) STORED,
    total_amount DECIMAL(15,4) GENERATED ALWAYS AS (subtotal - discount_amount + cgst_amount + sgst_amount + igst_amount + cess_amount) STORED,
    
    -- Payment Information
    payment_terms VARCHAR(255) DEFAULT 'Net 30',
    payment_status ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'unpaid',
    paid_amount DECIMAL(15,4) DEFAULT 0,
    balance_amount DECIMAL(15,4) GENERATED ALWAYS AS (subtotal - discount_amount + cgst_amount + sgst_amount + igst_amount + cess_amount - paid_amount) STORED,
    
    -- Additional Information
    notes TEXT,
    terms_conditions TEXT,
    bank_details TEXT,
    
    -- E-Invoice Details
    irn VARCHAR(64), -- Invoice Reference Number for e-invoicing
    ack_no VARCHAR(20), -- Acknowledgment number from GST portal
    ack_date DATETIME,
    qr_code_image TEXT, -- Base64 encoded QR code
    
    -- Status and Workflow
    status ENUM('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    sent_date DATETIME,
    viewed_date DATETIME,
    
    -- Audit Trail
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_customer (customer_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date),
    INDEX idx_payment_status (payment_status),
    INDEX idx_status (status),
    INDEX idx_reference (reference_type, reference_id)
);

-- Invoice Items
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    
    -- Product Information
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    description TEXT,
    hsn_code VARCHAR(20),
    
    -- Quantity and Pricing
    quantity DECIMAL(10,4) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Nos',
    unit_price DECIMAL(12,4) NOT NULL,
    total_price DECIMAL(15,4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Discount
    item_discount_percentage DECIMAL(5,2) DEFAULT 0,
    item_discount_amount DECIMAL(15,4) DEFAULT 0,
    discounted_amount DECIMAL(15,4) GENERATED ALWAYS AS (total_price - item_discount_amount) STORED,
    
    -- GST Details (Item-wise)
    gst_rate DECIMAL(5,2) DEFAULT 0,
    cgst_rate DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(15,4) DEFAULT 0,
    sgst_rate DECIMAL(5,2) DEFAULT 0,
    sgst_amount DECIMAL(15,4) DEFAULT 0,
    igst_rate DECIMAL(5,2) DEFAULT 0,
    igst_amount DECIMAL(15,4) DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    cess_amount DECIMAL(15,4) DEFAULT 0,
    
    -- Serial Numbers (if applicable)
    serial_numbers JSON,
    
    -- Inventory Integration
    inventory_allocated BOOLEAN DEFAULT FALSE,
    batch_allocations JSON, -- Track which batches were used
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_invoice_item (invoice_id),
    INDEX idx_product (product_id),
    INDEX idx_hsn_code (hsn_code)
);

-- Payment Tracking
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Payment Information
    payment_number VARCHAR(100) NOT NULL UNIQUE,
    payment_date DATE NOT NULL,
    payment_type ENUM('receipt', 'payment') NOT NULL, -- receipt = money in, payment = money out
    
    -- Party Information
    party_type ENUM('customer', 'supplier', 'employee', 'other') NOT NULL,
    party_id INT,
    party_name VARCHAR(255) NOT NULL,
    
    -- Payment Details
    amount DECIMAL(15,4) NOT NULL,
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'upi', 'card', 'online') NOT NULL,
    
    -- Bank/Payment Details
    bank_name VARCHAR(255),
    cheque_number VARCHAR(50),
    transaction_reference VARCHAR(255),
    utr_number VARCHAR(50), -- Unique Transaction Reference
    
    -- Reference Information
    reference_type ENUM('invoice', 'purchase_order', 'advance', 'refund', 'other') NOT NULL,
    reference_id INT,
    reference_number VARCHAR(100),
    
    -- Status
    payment_status ENUM('pending', 'cleared', 'bounced', 'cancelled') DEFAULT 'cleared',
    clearance_date DATE,
    
    -- Additional Information
    notes TEXT,
    
    -- Audit Trail
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    INDEX idx_payment_number (payment_number),
    INDEX idx_payment_date (payment_date),
    INDEX idx_party (party_type, party_id),
    INDEX idx_payment_type (payment_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_payment_status (payment_status)
);

-- Payment Allocations (for partial payments)
CREATE TABLE payment_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    invoice_id INT NOT NULL,
    allocated_amount DECIMAL(15,4) NOT NULL,
    allocation_date DATE NOT NULL,
    notes TEXT,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    UNIQUE KEY unique_payment_invoice (payment_id, invoice_id),
    INDEX idx_payment (payment_id),
    INDEX idx_invoice (invoice_id)
);

-- Customer Credit Management
CREATE TABLE customer_credit_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    
    -- Credit Limits
    credit_limit DECIMAL(15,4) NOT NULL DEFAULT 0,
    credit_days INT NOT NULL DEFAULT 30,
    
    -- Current Outstanding
    current_outstanding DECIMAL(15,4) DEFAULT 0,
    available_credit DECIMAL(15,4) GENERATED ALWAYS AS (credit_limit - current_outstanding) STORED,
    
    -- Risk Assessment
    risk_category ENUM('low', 'medium', 'high', 'blocked') DEFAULT 'low',
    payment_behavior ENUM('excellent', 'good', 'average', 'poor') DEFAULT 'good',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    blocked_reason TEXT,
    blocked_date DATE,
    
    -- Audit
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    UNIQUE KEY unique_customer (customer_id),
    INDEX idx_credit_limit (credit_limit),
    INDEX idx_risk_category (risk_category)
);

-- GST Configuration and Compliance
CREATE TABLE gst_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hsn_code VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    
    -- GST Rates
    cgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    sgst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    igst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    cess_rate DECIMAL(5,2) DEFAULT 0,
    
    total_gst_rate DECIMAL(5,2) GENERATED ALWAYS AS (cgst_rate + sgst_rate + igst_rate + cess_rate) STORED,
    
    -- Validity
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_hsn_date (hsn_code, effective_from),
    INDEX idx_hsn_code (hsn_code),
    INDEX idx_effective_date (effective_from, effective_to)
);

-- GST Returns Data
CREATE TABLE gst_returns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Return Information
    return_type ENUM('GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR9') NOT NULL,
    return_period VARCHAR(7) NOT NULL, -- MMYYYY format
    filing_frequency ENUM('monthly', 'quarterly', 'annually') NOT NULL,
    
    -- Financial Data
    total_taxable_value DECIMAL(15,4) DEFAULT 0,
    total_cgst DECIMAL(15,4) DEFAULT 0,
    total_sgst DECIMAL(15,4) DEFAULT 0,
    total_igst DECIMAL(15,4) DEFAULT 0,
    total_cess DECIMAL(15,4) DEFAULT 0,
    total_tax_amount DECIMAL(15,4) GENERATED ALWAYS AS (total_cgst + total_sgst + total_igst + total_cess) STORED,
    
    -- Status
    status ENUM('draft', 'prepared', 'filed', 'accepted', 'rejected') DEFAULT 'draft',
    prepared_date DATE,
    filed_date DATE,
    accepted_date DATE,
    
    -- GST Portal Information
    arn VARCHAR(50), -- Acknowledgment Reference Number
    json_data JSON, -- Complete return data in JSON format
    
    -- Audit
    prepared_by INT,
    filed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (prepared_by) REFERENCES users(id),
    FOREIGN KEY (filed_by) REFERENCES users(id),
    
    UNIQUE KEY unique_return_period (return_type, return_period),
    INDEX idx_return_type (return_type),
    INDEX idx_return_period (return_period),
    INDEX idx_status (status)
);

-- ================================
-- STORED PROCEDURES FOR FINANCIAL OPERATIONS
-- ================================

DELIMITER //

-- Procedure to update invoice payment status
CREATE PROCEDURE UpdateInvoicePaymentStatus(IN p_invoice_id INT)
BEGIN
    DECLARE v_total_amount DECIMAL(15,4);
    DECLARE v_paid_amount DECIMAL(15,4);
    DECLARE v_balance_amount DECIMAL(15,4);
    DECLARE v_new_status ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled');
    
    -- Get invoice total and current paid amount
    SELECT 
        total_amount,
        COALESCE((
            SELECT SUM(pa.allocated_amount)
            FROM payment_allocations pa 
            JOIN payments p ON pa.payment_id = p.id
            WHERE pa.invoice_id = p_invoice_id 
            AND p.payment_status = 'cleared'
        ), 0)
    INTO v_total_amount, v_paid_amount
    FROM invoices 
    WHERE id = p_invoice_id;
    
    SET v_balance_amount = v_total_amount - v_paid_amount;
    
    -- Determine new payment status
    IF v_paid_amount = 0 THEN
        SET v_new_status = 'unpaid';
    ELSEIF v_balance_amount <= 0 THEN
        SET v_new_status = 'paid';
    ELSE
        SET v_new_status = 'partial';
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        paid_amount = v_paid_amount,
        payment_status = v_new_status
    WHERE id = p_invoice_id;
    
END//

-- Procedure to update customer outstanding
CREATE PROCEDURE UpdateCustomerOutstanding(IN p_customer_id INT)
BEGIN
    DECLARE v_total_outstanding DECIMAL(15,4);
    
    -- Calculate total outstanding
    SELECT COALESCE(SUM(balance_amount), 0)
    INTO v_total_outstanding
    FROM invoices
    WHERE customer_id = p_customer_id 
    AND payment_status IN ('unpaid', 'partial', 'overdue');
    
    -- Update customer credit limit record
    INSERT INTO customer_credit_limits (customer_id, current_outstanding, created_by)
    VALUES (p_customer_id, v_total_outstanding, 1)
    ON DUPLICATE KEY UPDATE 
        current_outstanding = v_total_outstanding,
        updated_at = CURRENT_TIMESTAMP;
        
END//

-- Function to get next invoice number
CREATE FUNCTION GetNextInvoiceNumber(p_invoice_type VARCHAR(20)) 
RETURNS VARCHAR(100)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_prefix VARCHAR(20);
    DECLARE v_year VARCHAR(4);
    DECLARE v_month VARCHAR(2);
    DECLARE v_sequence INT;
    DECLARE v_invoice_number VARCHAR(100);
    
    -- Set prefix based on type
    CASE p_invoice_type
        WHEN 'sales' THEN SET v_prefix = 'VESPL/INV';
        WHEN 'proforma' THEN SET v_prefix = 'VESPL/PI';
        WHEN 'credit_note' THEN SET v_prefix = 'VESPL/CN';
        WHEN 'debit_note' THEN SET v_prefix = 'VESPL/DN';
        ELSE SET v_prefix = 'VESPL/DOC';
    END CASE;
    
    SET v_year = YEAR(CURDATE());
    SET v_month = LPAD(MONTH(CURDATE()), 2, '0');
    
    -- Get next sequence number
    SELECT COALESCE(MAX(
        CAST(SUBSTRING_INDEX(invoice_number, '/', -1) AS UNSIGNED)
    ), 0) + 1
    INTO v_sequence
    FROM invoices 
    WHERE invoice_number LIKE CONCAT(v_prefix, '/', v_year, v_month, '/%');
    
    SET v_invoice_number = CONCAT(v_prefix, '/', v_year, v_month, '/', LPAD(v_sequence, 4, '0'));
    
    RETURN v_invoice_number;
END//

DELIMITER ;

-- ================================
-- VIEWS FOR FINANCIAL REPORTING
-- ================================

-- Customer Outstanding Summary
CREATE VIEW v_customer_outstanding AS
SELECT 
    c.id as customer_id,
    c.company_name,
    c.contact_person,
    c.phone,
    c.email,
    ccl.credit_limit,
    ccl.credit_days,
    ccl.current_outstanding,
    ccl.available_credit,
    ccl.risk_category,
    ccl.payment_behavior,
    
    -- Aging Analysis
    COALESCE(SUM(CASE 
        WHEN DATEDIFF(CURDATE(), i.due_date) <= 0 THEN i.balance_amount 
        ELSE 0 
    END), 0) as current_amount,
    
    COALESCE(SUM(CASE 
        WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 1 AND 30 THEN i.balance_amount 
        ELSE 0 
    END), 0) as amount_1_30_days,
    
    COALESCE(SUM(CASE 
        WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 31 AND 60 THEN i.balance_amount 
        ELSE 0 
    END), 0) as amount_31_60_days,
    
    COALESCE(SUM(CASE 
        WHEN DATEDIFF(CURDATE(), i.due_date) BETWEEN 61 AND 90 THEN i.balance_amount 
        ELSE 0 
    END), 0) as amount_61_90_days,
    
    COALESCE(SUM(CASE 
        WHEN DATEDIFF(CURDATE(), i.due_date) > 90 THEN i.balance_amount 
        ELSE 0 
    END), 0) as amount_above_90_days
    
FROM clients c
LEFT JOIN customer_credit_limits ccl ON c.id = ccl.customer_id
LEFT JOIN invoices i ON c.id = i.customer_id 
    AND i.payment_status IN ('unpaid', 'partial', 'overdue')
GROUP BY c.id, ccl.credit_limit, ccl.credit_days, ccl.current_outstanding;

-- Sales Summary by Month
CREATE VIEW v_monthly_sales_summary AS
SELECT 
    YEAR(invoice_date) as year,
    MONTH(invoice_date) as month,
    CONCAT(YEAR(invoice_date), '-', LPAD(MONTH(invoice_date), 2, '0')) as year_month,
    
    COUNT(*) as total_invoices,
    SUM(subtotal) as total_subtotal,
    SUM(total_tax_amount) as total_tax,
    SUM(total_amount) as total_amount,
    SUM(paid_amount) as total_collected,
    SUM(balance_amount) as total_outstanding,
    
    -- Payment efficiency
    ROUND((SUM(paid_amount) / SUM(total_amount)) * 100, 2) as collection_percentage
    
FROM invoices 
WHERE invoice_type = 'sales'
AND status != 'cancelled'
GROUP BY YEAR(invoice_date), MONTH(invoice_date)
ORDER BY year DESC, month DESC;

-- GST Summary Report
CREATE VIEW v_gst_summary AS
SELECT 
    YEAR(invoice_date) as year,
    MONTH(invoice_date) as month,
    CONCAT(YEAR(invoice_date), '-', LPAD(MONTH(invoice_date), 2, '0')) as year_month,
    
    -- Taxable Values
    SUM(subtotal - discount_amount) as taxable_value,
    
    -- GST Components
    SUM(cgst_amount) as total_cgst,
    SUM(sgst_amount) as total_sgst, 
    SUM(igst_amount) as total_igst,
    SUM(cess_amount) as total_cess,
    SUM(total_tax_amount) as total_gst,
    
    -- Invoice Count
    COUNT(*) as total_invoices
    
FROM invoices 
WHERE invoice_type = 'sales'
AND status != 'cancelled'
GROUP BY YEAR(invoice_date), MONTH(invoice_date)
ORDER BY year DESC, month DESC;

-- ================================
-- SAMPLE CONFIGURATION DATA
-- ================================

-- Default GST Rates for common products
INSERT INTO gst_rates (hsn_code, description, cgst_rate, sgst_rate, igst_rate, effective_from) VALUES
('8537', 'Electrical Control Panels', 9.00, 9.00, 18.00, '2017-07-01'),
('8501', 'Electric Motors', 9.00, 9.00, 18.00, '2017-07-01'),
('8544', 'Insulated Wire and Cables', 9.00, 9.00, 18.00, '2017-07-01'),
('8536', 'Electrical Apparatus', 9.00, 9.00, 18.00, '2017-07-01'),
('7326', 'Articles of Iron or Steel', 9.00, 9.00, 18.00, '2017-07-01');

-- Default credit limits for risk categories
INSERT INTO customer_credit_limits (customer_id, credit_limit, credit_days, created_by)
SELECT id, 100000, 30, 1 
FROM clients 
WHERE id IS NOT NULL
ON DUPLICATE KEY UPDATE credit_limit = credit_limit;