-- ============================================================================
-- VTRIA ERP - Comprehensive Payroll Management System
-- ============================================================================
-- Description: Complete payroll system with salary components, statutory 
--              compliance, payslip generation, and payment tracking
-- Created: October 12, 2025
-- ============================================================================

-- ============================================================================
-- 1. SALARY COMPONENTS MASTER
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    component_code VARCHAR(20) NOT NULL UNIQUE,
    component_name VARCHAR(100) NOT NULL,
    component_type ENUM('earning', 'deduction', 'reimbursement') NOT NULL,
    calculation_type ENUM('fixed', 'percentage', 'formula') NOT NULL DEFAULT 'fixed',
    percentage_of INT NULL COMMENT 'Component ID if percentage-based',
    formula TEXT NULL COMMENT 'Formula for calculation',
    is_taxable BOOLEAN DEFAULT TRUE,
    is_statutory BOOLEAN DEFAULT FALSE COMMENT 'PF, ESI, PT, TDS',
    affects_ctc BOOLEAN DEFAULT TRUE,
    affects_gross BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_component_code (component_code),
    INDEX idx_component_type (component_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. EMPLOYEE SALARY STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_salary_structure (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    component_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES salary_components(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_active_component (employee_id, component_id, effective_from),
    INDEX idx_employee (employee_id),
    INDEX idx_effective_dates (effective_from, effective_to),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. PAYROLL CYCLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_cycles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cycle_name VARCHAR(100) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('draft', 'processing', 'approved', 'paid', 'cancelled') DEFAULT 'draft',
    total_employees INT DEFAULT 0,
    total_gross DECIMAL(15,2) DEFAULT 0.00,
    total_deductions DECIMAL(15,2) DEFAULT 0.00,
    total_net DECIMAL(15,2) DEFAULT 0.00,
    processed_by INT,
    processed_at TIMESTAMP NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (processed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_pay_period (pay_period_start, pay_period_end),
    INDEX idx_status (status),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. PAYROLL TRANSACTIONS (Main Payroll Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payroll_cycle_id INT NOT NULL,
    employee_id INT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    
    -- Days calculation
    total_days DECIMAL(5,2) DEFAULT 0.00,
    present_days DECIMAL(5,2) DEFAULT 0.00,
    absent_days DECIMAL(5,2) DEFAULT 0.00,
    leave_days DECIMAL(5,2) DEFAULT 0.00,
    holidays DECIMAL(5,2) DEFAULT 0.00,
    payable_days DECIMAL(5,2) DEFAULT 0.00,
    
    -- Salary components
    basic_salary DECIMAL(12,2) DEFAULT 0.00,
    hra DECIMAL(12,2) DEFAULT 0.00,
    conveyance_allowance DECIMAL(12,2) DEFAULT 0.00,
    medical_allowance DECIMAL(12,2) DEFAULT 0.00,
    special_allowance DECIMAL(12,2) DEFAULT 0.00,
    other_allowances DECIMAL(12,2) DEFAULT 0.00,
    
    -- Gross salary
    gross_salary DECIMAL(12,2) DEFAULT 0.00,
    
    -- Statutory deductions
    pf_employee DECIMAL(12,2) DEFAULT 0.00,
    pf_employer DECIMAL(12,2) DEFAULT 0.00,
    esi_employee DECIMAL(12,2) DEFAULT 0.00,
    esi_employer DECIMAL(12,2) DEFAULT 0.00,
    professional_tax DECIMAL(12,2) DEFAULT 0.00,
    tds DECIMAL(12,2) DEFAULT 0.00,
    
    -- Other deductions
    loan_deduction DECIMAL(12,2) DEFAULT 0.00,
    advance_deduction DECIMAL(12,2) DEFAULT 0.00,
    other_deductions DECIMAL(12,2) DEFAULT 0.00,
    
    -- Total deductions
    total_deductions DECIMAL(12,2) DEFAULT 0.00,
    
    -- Net salary
    net_salary DECIMAL(12,2) DEFAULT 0.00,
    
    -- Reimbursements (paid separately)
    reimbursements DECIMAL(12,2) DEFAULT 0.00,
    
    -- Total payment
    total_payment DECIMAL(12,2) DEFAULT 0.00,
    
    -- Status and payment
    status ENUM('draft', 'approved', 'paid', 'on_hold', 'cancelled') DEFAULT 'draft',
    payment_mode ENUM('bank_transfer', 'cash', 'cheque') DEFAULT 'bank_transfer',
    payment_reference VARCHAR(100),
    paid_on DATE NULL,
    
    -- Additional info
    remarks TEXT,
    payslip_generated BOOLEAN DEFAULT FALSE,
    payslip_sent BOOLEAN DEFAULT FALSE,
    payslip_path VARCHAR(255),
    
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payroll_cycle_id) REFERENCES payroll_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    UNIQUE KEY unique_employee_cycle (employee_id, payroll_cycle_id),
    INDEX idx_employee (employee_id),
    INDEX idx_pay_period (pay_period_start, pay_period_end),
    INDEX idx_status (status),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. PAYROLL TRANSACTION DETAILS (Component-wise breakdown)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_transaction_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payroll_transaction_id INT NOT NULL,
    component_id INT NOT NULL,
    component_type ENUM('earning', 'deduction', 'reimbursement') NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    calculation_base DECIMAL(12,2) NULL COMMENT 'Base amount for percentage calculation',
    remarks TEXT,
    FOREIGN KEY (payroll_transaction_id) REFERENCES payroll_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES salary_components(id),
    INDEX idx_transaction (payroll_transaction_id),
    INDEX idx_component (component_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. SALARY REVISIONS / INCREMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_revisions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    revision_type ENUM('increment', 'promotion', 'correction', 'adjustment') NOT NULL,
    effective_date DATE NOT NULL,
    old_ctc DECIMAL(12,2) NOT NULL,
    new_ctc DECIMAL(12,2) NOT NULL,
    increment_amount DECIMAL(12,2) NOT NULL,
    increment_percentage DECIMAL(5,2) NOT NULL,
    reason TEXT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_employee (employee_id),
    INDEX idx_effective_date (effective_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. LOANS AND ADVANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    loan_type ENUM('loan', 'advance', 'salary_advance') NOT NULL,
    loan_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    emi_amount DECIMAL(12,2) NOT NULL,
    number_of_installments INT NOT NULL,
    paid_installments INT DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('active', 'closed', 'cancelled') DEFAULT 'active',
    reason TEXT,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_employee (employee_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. LOAN REPAYMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS loan_repayments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    payroll_transaction_id INT NULL,
    installment_number INT NOT NULL,
    repayment_date DATE NOT NULL,
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    outstanding_balance DECIMAL(12,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
    FOREIGN KEY (payroll_transaction_id) REFERENCES payroll_transactions(id),
    INDEX idx_loan (loan_id),
    INDEX idx_repayment_date (repayment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. STATUTORY SETTINGS (PF, ESI, PT, TDS Configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS statutory_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_type ENUM('pf', 'esi', 'pt', 'tds', 'gratuity', 'bonus') NOT NULL,
    setting_key VARCHAR(50) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_setting (setting_type, setting_key, effective_from),
    INDEX idx_setting_type (setting_type),
    INDEX idx_effective_dates (effective_from, effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. REIMBURSEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS reimbursement_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    reimbursement_type ENUM('travel', 'medical', 'food', 'telephone', 'internet', 'fuel', 'other') NOT NULL,
    request_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    bill_number VARCHAR(50),
    bill_date DATE,
    bill_attachment VARCHAR(255),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    approved_by INT,
    approved_at TIMESTAMP NULL,
    approval_remarks TEXT,
    payroll_transaction_id INT NULL COMMENT 'Linked when paid via payroll',
    paid_on DATE NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (payroll_transaction_id) REFERENCES payroll_transactions(id),
    INDEX idx_employee (employee_id),
    INDEX idx_status (status),
    INDEX idx_request_date (request_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. TAX DECLARATIONS (For TDS Calculation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_tax_declarations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    financial_year VARCHAR(10) NOT NULL COMMENT 'e.g., 2024-2025',
    declaration_type ENUM('investment', 'deduction', 'exemption') NOT NULL,
    section VARCHAR(20) NOT NULL COMMENT '80C, 80D, HRA, etc.',
    declared_amount DECIMAL(12,2) NOT NULL,
    proof_submitted BOOLEAN DEFAULT FALSE,
    proof_document VARCHAR(255),
    status ENUM('declared', 'verified', 'rejected') DEFAULT 'declared',
    verified_by INT,
    verified_at TIMESTAMP NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_employee_year (employee_id, financial_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Employee Current Salary Structure
CREATE OR REPLACE VIEW v_employee_current_salary AS
SELECT 
    e.id as employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    e.department,
    e.designation,
    SUM(CASE WHEN sc.component_type = 'earning' THEN ess.amount ELSE 0 END) as total_earnings,
    SUM(CASE WHEN sc.component_type = 'deduction' THEN ess.amount ELSE 0 END) as total_deductions,
    SUM(CASE WHEN sc.component_type = 'earning' THEN ess.amount ELSE 0 END) - 
    SUM(CASE WHEN sc.component_type = 'deduction' THEN ess.amount ELSE 0 END) as net_salary,
    SUM(CASE WHEN sc.component_type = 'earning' AND sc.affects_ctc = TRUE THEN ess.amount ELSE 0 END) as ctc
FROM employees e
LEFT JOIN employee_salary_structure ess ON e.id = ess.employee_id AND ess.is_active = TRUE
LEFT JOIN salary_components sc ON ess.component_id = sc.id
WHERE e.status = 'active'
GROUP BY e.id, e.employee_id, e.first_name, e.last_name, e.department, e.designation;

-- View: Monthly Payroll Summary
CREATE OR REPLACE VIEW v_monthly_payroll_summary AS
SELECT 
    pc.id as cycle_id,
    pc.cycle_name,
    pc.pay_period_start,
    pc.pay_period_end,
    pc.payment_date,
    pc.status,
    COUNT(pt.id) as total_employees,
    SUM(pt.gross_salary) as total_gross,
    SUM(pt.total_deductions) as total_deductions,
    SUM(pt.net_salary) as total_net,
    SUM(pt.pf_employee) as total_pf_employee,
    SUM(pt.pf_employer) as total_pf_employer,
    SUM(pt.esi_employee) as total_esi_employee,
    SUM(pt.esi_employer) as total_esi_employer,
    SUM(pt.professional_tax) as total_pt,
    SUM(pt.tds) as total_tds
FROM payroll_cycles pc
LEFT JOIN payroll_transactions pt ON pc.id = pt.payroll_cycle_id
GROUP BY pc.id, pc.cycle_name, pc.pay_period_start, pc.pay_period_end, pc.payment_date, pc.status;

-- View: Employee Payroll History
CREATE OR REPLACE VIEW v_employee_payroll_history AS
SELECT 
    pt.employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    pt.pay_period_start,
    pt.pay_period_end,
    pt.payment_date,
    pt.gross_salary,
    pt.total_deductions,
    pt.net_salary,
    pt.status,
    pt.payment_mode,
    pt.paid_on,
    pc.cycle_name
FROM payroll_transactions pt
JOIN employees e ON pt.employee_id = e.id
JOIN payroll_cycles pc ON pt.payroll_cycle_id = pc.id
ORDER BY pt.payment_date DESC;

-- View: Pending Loans Summary
CREATE OR REPLACE VIEW v_pending_loans AS
SELECT 
    el.id as loan_id,
    el.employee_id,
    e.employee_id as emp_code,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    el.loan_type,
    el.loan_amount,
    el.outstanding_amount,
    el.emi_amount,
    el.number_of_installments,
    el.paid_installments,
    (el.number_of_installments - el.paid_installments) as pending_installments,
    el.start_date,
    el.status
FROM employee_loans el
JOIN employees e ON el.employee_id = e.id
WHERE el.status = 'active' AND el.outstanding_amount > 0;

-- ============================================================================
-- INSERT DEFAULT SALARY COMPONENTS
-- ============================================================================

INSERT IGNORE INTO salary_components (component_code, component_name, component_type, calculation_type, is_taxable, is_statutory, affects_ctc, affects_gross, display_order, description) VALUES
-- Earnings
('BASIC', 'Basic Salary', 'earning', 'fixed', TRUE, FALSE, TRUE, TRUE, 1, 'Basic salary component - typically 40-50% of CTC'),
('HRA', 'House Rent Allowance', 'earning', 'percentage', TRUE, FALSE, TRUE, TRUE, 2, 'House Rent Allowance - typically 40-50% of basic'),
('CONV', 'Conveyance Allowance', 'earning', 'fixed', TRUE, FALSE, TRUE, TRUE, 3, 'Conveyance/Transport Allowance - Rs.1600 exempt'),
('MED', 'Medical Allowance', 'earning', 'fixed', TRUE, FALSE, TRUE, TRUE, 4, 'Medical Allowance - Rs.1250 exempt'),
('SPECIAL', 'Special Allowance', 'earning', 'fixed', TRUE, FALSE, TRUE, TRUE, 5, 'Special Allowance - balancing component'),
('DA', 'Dearness Allowance', 'earning', 'percentage', TRUE, FALSE, TRUE, TRUE, 6, 'Dearness Allowance'),
('LTA', 'Leave Travel Allowance', 'earning', 'fixed', TRUE, FALSE, TRUE, TRUE, 7, 'Leave Travel Allowance'),
('BONUS', 'Bonus', 'earning', 'fixed', TRUE, FALSE, TRUE, FALSE, 8, 'Annual/Performance Bonus'),
('INCENTIVE', 'Incentive', 'earning', 'fixed', TRUE, FALSE, FALSE, FALSE, 9, 'Performance Incentive'),
('OT', 'Overtime', 'earning', 'fixed', TRUE, FALSE, FALSE, FALSE, 10, 'Overtime payment'),

-- Deductions
('PF_EMP', 'PF - Employee', 'deduction', 'percentage', FALSE, TRUE, TRUE, FALSE, 11, 'Provident Fund - Employee contribution (12%)'),
('PF_EMP_VPF', 'VPF - Voluntary PF', 'deduction', 'percentage', FALSE, TRUE, TRUE, FALSE, 12, 'Voluntary Provident Fund'),
('ESI_EMP', 'ESI - Employee', 'deduction', 'percentage', FALSE, TRUE, TRUE, FALSE, 13, 'Employee State Insurance - Employee (0.75%)'),
('PT', 'Professional Tax', 'deduction', 'fixed', FALSE, TRUE, TRUE, FALSE, 14, 'Professional Tax - state specific'),
('TDS', 'Tax Deducted at Source', 'deduction', 'formula', FALSE, TRUE, FALSE, FALSE, 15, 'Income Tax TDS'),
('LOAN', 'Loan Deduction', 'deduction', 'fixed', FALSE, FALSE, FALSE, FALSE, 16, 'Loan EMI deduction'),
('ADVANCE', 'Advance Deduction', 'deduction', 'fixed', FALSE, FALSE, FALSE, FALSE, 17, 'Salary advance recovery'),
('LWP', 'Loss of Pay', 'deduction', 'formula', FALSE, FALSE, FALSE, FALSE, 18, 'Leave without pay deduction'),
('OTHER_DED', 'Other Deductions', 'deduction', 'fixed', FALSE, FALSE, FALSE, FALSE, 19, 'Miscellaneous deductions'),

-- Reimbursements
('TRAVEL_REIMB', 'Travel Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 20, 'Travel expense reimbursement'),
('MEDICAL_REIMB', 'Medical Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 21, 'Medical expense reimbursement'),
('FOOD_REIMB', 'Food Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 22, 'Food/Meal reimbursement'),
('PHONE_REIMB', 'Telephone Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 23, 'Phone/Communication reimbursement'),
('INTERNET_REIMB', 'Internet Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 24, 'Internet reimbursement'),
('FUEL_REIMB', 'Fuel Reimbursement', 'reimbursement', 'fixed', FALSE, FALSE, FALSE, FALSE, 25, 'Fuel/Petrol reimbursement');

-- ============================================================================
-- INSERT DEFAULT STATUTORY SETTINGS
-- ============================================================================

INSERT IGNORE INTO statutory_settings (setting_type, setting_key, setting_value, effective_from, description) VALUES
-- PF Settings
('pf', 'pf_ceiling', '15000', '2024-04-01', 'PF wage ceiling limit'),
('pf', 'employee_contribution', '12', '2024-04-01', 'Employee PF contribution percentage'),
('pf', 'employer_contribution', '12', '2024-04-01', 'Employer PF contribution percentage'),
('pf', 'eps_contribution', '8.33', '2024-04-01', 'EPS contribution percentage'),
('pf', 'edli_contribution', '0.5', '2024-04-01', 'EDLI contribution percentage'),
('pf', 'admin_charges', '0.5', '2024-04-01', 'PF admin charges percentage'),

-- ESI Settings
('esi', 'esi_ceiling', '21000', '2024-04-01', 'ESI wage ceiling limit'),
('esi', 'employee_contribution', '0.75', '2024-04-01', 'Employee ESI contribution percentage'),
('esi', 'employer_contribution', '3.25', '2024-04-01', 'Employer ESI contribution percentage'),

-- Professional Tax Settings (example for Karnataka)
('pt', 'slab_1_limit', '15000', '2024-04-01', 'PT Slab 1: Up to 15000 - Rs.200'),
('pt', 'slab_1_amount', '200', '2024-04-01', 'PT amount for slab 1'),
('pt', 'slab_2_limit', '99999999', '2024-04-01', 'PT Slab 2: Above 15000 - Rs.208.33'),
('pt', 'slab_2_amount', '208.33', '2024-04-01', 'PT amount for slab 2 (monthly)'),
('pt', 'max_annual', '2500', '2024-04-01', 'Maximum annual PT'),

-- TDS Settings (FY 2024-25 - Old regime example)
('tds', 'basic_exemption', '250000', '2024-04-01', 'Basic exemption limit'),
('tds', 'slab_1_limit', '250000', '2024-04-01', 'Up to 2.5L - 0%'),
('tds', 'slab_2_limit', '500000', '2024-04-01', '2.5L to 5L - 5%'),
('tds', 'slab_3_limit', '1000000', '2024-04-01', '5L to 10L - 20%'),
('tds', 'slab_4_limit', '99999999', '2024-04-01', 'Above 10L - 30%');

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Note: Actual employee salary structures will be created via API
-- This is just to show the table structure

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Already created inline with tables

-- ============================================================================
-- END OF PAYROLL SCHEMA
-- ============================================================================

-- Success message
SELECT 'Payroll schema created successfully!' as status,
       'Tables: 11 main tables + 4 views created' as info;
