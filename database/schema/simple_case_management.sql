-- Simple Case Management System for VTRIA ERP
-- This creates only the essential case management tables

-- Create cases table if it doesn't exist
CREATE TABLE IF NOT EXISTS cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE,
    enquiry_id INT NULL,
    current_state ENUM(
        'enquiry', 
        'estimation', 
        'quotation', 
        'order', 
        'production', 
        'delivery', 
        'closed'
    ) DEFAULT 'enquiry',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    client_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    requirements TEXT,
    estimated_value DECIMAL(15,2) NULL,
    final_value DECIMAL(15,2) NULL,
    assigned_to INT NULL,
    created_by INT NOT NULL,
    status ENUM('active', 'on_hold', 'cancelled', 'completed') DEFAULT 'active',
    expected_completion_date DATE NULL,
    actual_completion_date DATE NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT NULL,
    
    INDEX idx_case_number (case_number),
    INDEX idx_current_state (current_state),
    INDEX idx_client_id (client_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create case state transitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS case_state_transitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    from_state ENUM(
        'enquiry', 
        'estimation', 
        'quotation', 
        'order', 
        'production', 
        'delivery', 
        'closed'
    ) NULL,
    to_state ENUM(
        'enquiry', 
        'estimation', 
        'quotation', 
        'order', 
        'production', 
        'delivery', 
        'closed'
    ) NOT NULL,
    transition_reason VARCHAR(255) NULL,
    notes TEXT,
    reference_type ENUM('enquiry', 'estimation', 'quotation', 'sales_order', 'production_order', 'delivery') NULL,
    reference_id INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_case_transitions (case_id, created_at),
    INDEX idx_state_transition (from_state, to_state),
    INDEX idx_reference (reference_type, reference_id)
);

-- Add case_id columns to existing tables if they don't exist
ALTER TABLE sales_enquiries ADD COLUMN IF NOT EXISTS case_id INT NULL;
ALTER TABLE estimations ADD COLUMN IF NOT EXISTS case_id INT NULL;  
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS case_id INT NULL;

-- Add indexes if they don't exist
ALTER TABLE sales_enquiries ADD INDEX IF NOT EXISTS idx_enquiry_case (case_id);
ALTER TABLE estimations ADD INDEX IF NOT EXISTS idx_estimation_case (case_id);
ALTER TABLE quotations ADD INDEX IF NOT EXISTS idx_quotation_case (case_id);

-- Create basic stored procedures for case management

DELIMITER //

-- Create case from enquiry
CREATE PROCEDURE IF NOT EXISTS CreateCaseFromEnquiry(
    IN p_enquiry_id INT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_case_number VARCHAR(50);
    DECLARE v_case_id INT;
    DECLARE v_client_id INT;
    DECLARE v_project_name VARCHAR(255);
    DECLARE v_requirements TEXT;
    DECLARE v_priority ENUM('low', 'medium', 'high');
    DECLARE v_estimated_value DECIMAL(15,2);
    DECLARE v_sequence INT;
    
    -- Get enquiry details
    SELECT client_id, project_name, description, priority, estimated_value
    INTO v_client_id, v_project_name, v_requirements, v_priority, v_estimated_value
    FROM sales_enquiries 
    WHERE id = p_enquiry_id;
    
    -- Generate case number
    INSERT INTO document_sequences (document_type, financial_year, last_sequence)
    VALUES ('C', '2526', 1)
    ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1;
    
    SELECT last_sequence INTO v_sequence
    FROM document_sequences
    WHERE document_type = 'C' AND financial_year = '2526';
    
    SET v_case_number = CONCAT('VESPL/C/2526/', LPAD(v_sequence, 3, '0'));
    
    -- Create the case
    INSERT INTO cases (
        case_number, 
        enquiry_id, 
        current_state, 
        priority,
        client_id, 
        project_name, 
        requirements,
        estimated_value,
        created_by,
        updated_by
    ) VALUES (
        v_case_number,
        p_enquiry_id,
        'enquiry',
        IFNULL(v_priority, 'medium'),
        v_client_id,
        v_project_name,
        v_requirements,
        v_estimated_value,
        p_created_by,
        p_created_by
    );
    
    SET v_case_id = LAST_INSERT_ID();
    
    -- Update enquiry with case_id
    UPDATE sales_enquiries 
    SET case_id = v_case_id 
    WHERE id = p_enquiry_id;
    
    -- Create initial state transition
    INSERT INTO case_state_transitions (
        case_id, 
        from_state, 
        to_state, 
        transition_reason,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        v_case_id,
        NULL,
        'enquiry',
        'Case created from enquiry',
        'enquiry',
        p_enquiry_id,
        p_created_by
    );
    
    -- Return the case ID
    SELECT v_case_id as case_id, v_case_number as case_number;
END//

DELIMITER ;

-- Insert document sequence for cases if it doesn't exist
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('C', '2526', 0);

SELECT 'Case Management System Created Successfully!' as status;