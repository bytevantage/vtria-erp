-- ============================================
-- Expenses Management Schema
-- Complete expense tracking with categories and approvals
-- ============================================

-- Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id INT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_limit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES expense_categories(id),
    INDEX idx_category_code (category_code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Expense category hierarchy';

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    expense_date DATE NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT NULL,
    department_id INT NULL,
    employee_id INT NULL,
    supplier_id INT NULL,
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'credit_card', 'upi') NOT NULL,
    payment_status ENUM('pending', 'paid', 'partially_paid') DEFAULT 'pending',
    approval_status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'cancelled') DEFAULT 'draft',
    description TEXT,
    receipt_number VARCHAR(100),
    reference_number VARCHAR(100),
    notes TEXT,
    attachment_path VARCHAR(500),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NULL,
    recurring_until DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    paid_by INT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES expense_categories(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (paid_by) REFERENCES users(id),
    INDEX idx_expense_number (expense_number),
    INDEX idx_expense_date (expense_date),
    INDEX idx_category (category_id),
    INDEX idx_department (department_id),
    INDEX idx_employee (employee_id),
    INDEX idx_approval_status (approval_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Expense tracking and management';

-- Expense Items (for detailed breakdown)
CREATE TABLE IF NOT EXISTS expense_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_id INT NOT NULL,
    item_description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    INDEX idx_expense_id (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Expense item details';

-- Expense Approvals (Approval workflow tracking)
CREATE TABLE IF NOT EXISTS expense_approvals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    expense_id INT NOT NULL,
    approver_id INT NOT NULL,
    approval_level INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id),
    INDEX idx_expense_id (expense_id),
    INDEX idx_approver_id (approver_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Multi-level expense approval tracking';

-- Credit/Debit Notes Table
CREATE TABLE IF NOT EXISTS credit_debit_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    note_number VARCHAR(50) UNIQUE NOT NULL,
    note_type ENUM('credit_note', 'debit_note') NOT NULL,
    note_date DATE NOT NULL,
    original_invoice_id INT NOT NULL,
    customer_id INT NOT NULL,
    reason_code VARCHAR(50),
    reason_description TEXT,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('draft', 'issued', 'applied', 'cancelled') DEFAULT 'draft',
    applied_to_invoice_id INT NULL,
    applied_date DATE NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (original_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_id) REFERENCES clients(id),
    FOREIGN KEY (applied_to_invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_note_number (note_number),
    INDEX idx_note_type (note_type),
    INDEX idx_original_invoice (original_invoice_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Credit and debit notes for invoice adjustments';

-- Bank Reconciliation Table
CREATE TABLE IF NOT EXISTS bank_reconciliation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bank_account VARCHAR(50) NOT NULL,
    statement_date DATE NOT NULL,
    statement_balance DECIMAL(15,2) NOT NULL,
    book_balance DECIMAL(15,2) NOT NULL,
    reconciled_balance DECIMAL(15,2) NOT NULL,
    difference_amount DECIMAL(15,2) DEFAULT 0,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciliation_notes TEXT,
    reconciled_by INT NULL,
    reconciled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reconciled_by) REFERENCES users(id),
    INDEX idx_bank_account (bank_account),
    INDEX idx_statement_date (statement_date),
    INDEX idx_reconciled (is_reconciled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bank statement reconciliation';

-- Bank Reconciliation Items
CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reconciliation_id INT NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type ENUM('payment', 'receipt', 'bank_charge', 'interest', 'adjustment') NOT NULL,
    reference_number VARCHAR(100),
    payment_id INT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    is_matched BOOLEAN DEFAULT FALSE,
    matched_with VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reconciliation_id) REFERENCES bank_reconciliation(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    INDEX idx_reconciliation_id (reconciliation_id),
    INDEX idx_reference_number (reference_number),
    INDEX idx_matched (is_matched)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bank reconciliation transaction items';

-- Email Notifications Log
CREATE TABLE IF NOT EXISTS email_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_type ENUM('invoice', 'payment_receipt', 'statement', 'reminder', 'alert') NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT,
    reference_type VARCHAR(50),
    reference_id INT,
    status ENUM('pending', 'sent', 'failed', 'bounced') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_type (notification_type),
    INDEX idx_recipient (recipient_email),
    INDEX idx_status (status),
    INDEX idx_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Email notification tracking';

-- Insert default expense categories
INSERT INTO expense_categories (category_code, category_name, description, approval_limit) VALUES
('SAL', 'Salaries & Wages', 'Employee salaries, wages, and bonuses', 0),
('RENT', 'Rent & Utilities', 'Office rent, electricity, water, internet', 50000),
('TRVL', 'Travel & Conveyance', 'Business travel, fuel, vehicle maintenance', 20000),
('OFFC', 'Office Supplies', 'Stationery, equipment, consumables', 10000),
('MARK', 'Marketing & Advertising', 'Promotional activities, advertising costs', 50000),
('TECH', 'Technology & Software', 'Software licenses, IT infrastructure', 30000),
('PROF', 'Professional Fees', 'Legal, accounting, consulting fees', 25000),
('MAIN', 'Maintenance & Repairs', 'Equipment maintenance, repairs', 15000),
('INSUR', 'Insurance', 'Business insurance premiums', 0),
('TAX', 'Taxes & Licenses', 'Business taxes, licenses, permits', 0),
('MISC', 'Miscellaneous', 'Other business expenses', 5000);

-- Create views for quick reporting
CREATE OR REPLACE VIEW v_expense_summary AS
SELECT 
    e.id,
    e.expense_number,
    e.expense_date,
    ec.category_name,
    COALESCE(esc.category_name, '') as subcategory_name,
    COALESCE(d.department_name, '') as department_name,
    COALESCE(CONCAT(emp.first_name, ' ', emp.last_name), '') as employee_name,
    COALESCE(s.company_name, '') as supplier_name,
    e.amount,
    e.tax_amount,
    e.total_amount,
    e.payment_status,
    e.approval_status,
    u.full_name as created_by_name,
    COALESCE(approver.full_name, '') as approved_by_name,
    e.created_at
FROM expenses e
LEFT JOIN expense_categories ec ON e.category_id = ec.id
LEFT JOIN expense_categories esc ON e.subcategory_id = esc.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN employees emp ON e.employee_id = emp.id
LEFT JOIN suppliers s ON e.supplier_id = s.id
LEFT JOIN users u ON e.created_by = u.id
LEFT JOIN users approver ON e.approved_by = approver.id
WHERE e.is_active = TRUE;

-- Create view for outstanding approvals
CREATE OR REPLACE VIEW v_pending_expense_approvals AS
SELECT 
    ea.id as approval_id,
    e.id as expense_id,
    e.expense_number,
    e.expense_date,
    ec.category_name,
    e.total_amount,
    e.description,
    CONCAT(emp.first_name, ' ', emp.last_name) as employee_name,
    u.full_name as approver_name,
    ea.approval_level,
    ea.status,
    ea.created_at
FROM expense_approvals ea
JOIN expenses e ON ea.expense_id = e.id
JOIN expense_categories ec ON e.category_id = ec.id
LEFT JOIN employees emp ON e.employee_id = emp.id
JOIN users u ON ea.approver_id = u.id
WHERE ea.status = 'pending'
AND e.is_active = TRUE
ORDER BY ea.created_at ASC;

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE ON expense_categories TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON expenses TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON expense_items TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON expense_approvals TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON credit_debit_notes TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON bank_reconciliation TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON bank_reconciliation_items TO 'vtria_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON email_notifications TO 'vtria_user'@'%';

-- End of financial expenses schema
