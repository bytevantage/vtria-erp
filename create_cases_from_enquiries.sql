-- Create actual case records from existing sales enquiries
-- This will populate the cases table with real case data

-- First, ensure the cases table exists
CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id INT NOT NULL,
    current_state ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed') DEFAULT 'enquiry',
    assigned_to INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_case_number (case_number),
    INDEX idx_enquiry_id (enquiry_id),
    INDEX idx_current_state (current_state),
    INDEX idx_assigned_to (assigned_to),
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create case state transitions table
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

-- Clear existing cases to start fresh
DELETE FROM case_state_transitions;
DELETE FROM cases;

-- Create cases from sales enquiries with different states based on their progress
INSERT INTO cases (case_number, enquiry_id, current_state, assigned_to, created_by, created_at)
SELECT 
    CONCAT('VESPL/C/2526/', LPAD(se.id, 3, '0')) as case_number,
    se.id as enquiry_id,
    CASE 
        -- If there's a sales order, case is in order state
        WHEN EXISTS (SELECT 1 FROM sales_orders so 
                    JOIN quotations q ON so.quotation_id = q.id 
                    JOIN estimations e ON q.estimation_id = e.id 
                    WHERE e.enquiry_id = se.id) THEN 'order'
        -- If there's a quotation, case is in quotation state  
        WHEN EXISTS (SELECT 1 FROM quotations q 
                    JOIN estimations e ON q.estimation_id = e.id 
                    WHERE e.enquiry_id = se.id) THEN 'quotation'
        -- If there's an estimation, case is in estimation state
        WHEN EXISTS (SELECT 1 FROM estimations e WHERE e.enquiry_id = se.id) THEN 'estimation'
        -- Otherwise, it's still in enquiry state
        ELSE 'enquiry'
    END as current_state,
    1 as assigned_to, -- Default to admin user
    1 as created_by,
    se.date as created_at
FROM sales_enquiries se
WHERE se.id IS NOT NULL
ORDER BY se.id;

-- Create initial state transitions for all cases
INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
SELECT 
    c.id as case_id,
    NULL as from_state,
    c.current_state as to_state,
    CONCAT('Case created from sales enquiry #', c.enquiry_id) as notes,
    1 as created_by,
    c.created_at
FROM cases c;

-- Create additional transitions for cases that have progressed beyond enquiry
-- Estimation transitions
INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
SELECT 
    c.id as case_id,
    'enquiry' as from_state,
    'estimation' as to_state,
    CONCAT('Estimation created - ID: ', e.id) as notes,
    1 as created_by,
    e.created_at
FROM cases c
JOIN estimations e ON c.enquiry_id = e.enquiry_id
WHERE c.current_state IN ('estimation', 'quotation', 'order');

-- Quotation transitions  
INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
SELECT 
    c.id as case_id,
    'estimation' as from_state,
    'quotation' as to_state,
    CONCAT('Quotation created - ID: ', q.id) as notes,
    1 as created_by,
    q.created_at
FROM cases c
JOIN estimations e ON c.enquiry_id = e.enquiry_id
JOIN quotations q ON e.id = q.estimation_id
WHERE c.current_state IN ('quotation', 'order');

-- Order transitions
INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
SELECT 
    c.id as case_id,
    'quotation' as from_state,
    'order' as to_state,
    CONCAT('Sales order created - ID: ', so.id) as notes,
    1 as created_by,
    so.created_at
FROM cases c
JOIN estimations e ON c.enquiry_id = e.enquiry_id
JOIN quotations q ON e.id = q.estimation_id
JOIN sales_orders so ON q.id = so.quotation_id
WHERE c.current_state = 'order';

-- Update sales_enquiries to link with cases
UPDATE sales_enquiries se 
JOIN cases c ON se.id = c.enquiry_id 
SET se.case_id = c.id 
WHERE se.case_id IS NULL;

-- Show the results
SELECT 
    'Cases created:' as summary,
    COUNT(*) as count,
    GROUP_CONCAT(DISTINCT current_state) as states
FROM cases;

SELECT 
    current_state,
    COUNT(*) as case_count
FROM cases 
GROUP BY current_state
ORDER BY 
    FIELD(current_state, 'enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed');
