-- Case Management System Tables
-- This creates the unified case tracking system for VTRIA ERP

-- Cases table - Main case tracking
CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id INT NOT NULL,
    current_state ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed') DEFAULT 'enquiry',
    assigned_to INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_case_number (case_number),
    INDEX idx_enquiry_id (enquiry_id),
    INDEX idx_current_state (current_state),
    INDEX idx_assigned_to (assigned_to),
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Case state transitions table - Audit trail
CREATE TABLE IF NOT EXISTS case_state_transitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    from_state ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed') NULL,
    to_state ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed') NOT NULL,
    notes TEXT NULL,
    reference_id INT NULL COMMENT 'ID of related record (estimation_id, quotation_id, etc.)',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_case_id (case_id),
    INDEX idx_from_state (from_state),
    INDEX idx_to_state (to_state),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Add case_id column to sales_enquiries if it doesn't exist (ignore if exists)
-- ALTER TABLE sales_enquiries ADD COLUMN case_id INT NULL;

-- Add index for case_id (ignore if exists)
-- ALTER TABLE sales_enquiries ADD INDEX idx_case_id (case_id);

-- Insert sample cases for existing enquiries (if any exist)
INSERT IGNORE INTO cases (case_number, enquiry_id, current_state, created_by)
SELECT 
    CONCAT('VESPL/C/2526/', LPAD(ROW_NUMBER() OVER (ORDER BY id), 3, '0')) as case_number,
    id as enquiry_id,
    'enquiry' as current_state,
    1 as created_by
FROM sales_enquiries 
WHERE id NOT IN (SELECT DISTINCT enquiry_id FROM cases WHERE enquiry_id IS NOT NULL)
LIMIT 10;

-- Create initial state transitions for the sample cases
INSERT IGNORE INTO case_state_transitions (case_id, from_state, to_state, notes, created_by)
SELECT 
    c.id as case_id,
    NULL as from_state,
    'enquiry' as to_state,
    'Case created from existing sales enquiry' as notes,
    1 as created_by
FROM cases c
WHERE c.id NOT IN (SELECT DISTINCT case_id FROM case_state_transitions WHERE case_id IS NOT NULL);

-- Update sales_enquiries to link with cases
UPDATE sales_enquiries se 
JOIN cases c ON se.id = c.enquiry_id 
SET se.case_id = c.id 
WHERE se.case_id IS NULL;
