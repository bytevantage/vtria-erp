-- Integration of Existing Tables with Case Management System
-- File: 024_integrate_existing_tables_with_cases.sql
-- This schema modifies existing tables to integrate with the case management system

-- Add case_id to sales_enquiries table
ALTER TABLE sales_enquiries 
ADD COLUMN case_id INT NULL AFTER id,
ADD FOREIGN KEY fk_enquiry_case (case_id) REFERENCES cases(id) ON DELETE SET NULL,
ADD INDEX idx_enquiry_case (case_id);

-- Add case_id to estimations table  
ALTER TABLE estimations
ADD COLUMN case_id INT NULL AFTER id,
ADD FOREIGN KEY fk_estimation_case (case_id) REFERENCES cases(id) ON DELETE SET NULL,
ADD INDEX idx_estimation_case (case_id);

-- Add case_id to quotations table
ALTER TABLE quotations
ADD COLUMN case_id INT NULL AFTER id,
ADD FOREIGN KEY fk_quotation_case (case_id) REFERENCES cases(id) ON DELETE SET NULL,
ADD INDEX idx_quotation_case (case_id);

-- Add case_id to sales_orders table (if it exists)
-- Note: Uncomment this section if sales_orders table exists
/*
ALTER TABLE sales_orders
ADD COLUMN case_id INT NULL AFTER id,
ADD FOREIGN KEY fk_sales_order_case (case_id) REFERENCES cases(id) ON DELETE SET NULL,
ADD INDEX idx_sales_order_case (case_id);
*/

-- Add updated_by field to cases table for trigger functionality
ALTER TABLE cases
ADD COLUMN updated_by INT NULL AFTER updated_at,
ADD FOREIGN KEY fk_case_updated_by (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update case_history table to link with cases
ALTER TABLE case_history
ADD COLUMN case_id INT NULL AFTER id,
ADD FOREIGN KEY fk_case_history_case (case_id) REFERENCES cases(id) ON DELETE SET NULL,
ADD INDEX idx_case_history_case (case_id);

-- Create stored procedures for case management workflow

DELIMITER //

-- Procedure to create a new case from enquiry
CREATE PROCEDURE CreateCaseFromEnquiry(
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
    
    -- Get enquiry details
    SELECT client_id, project_name, description, priority, estimated_value
    INTO v_client_id, v_project_name, v_requirements, v_priority, v_estimated_value
    FROM sales_enquiries 
    WHERE id = p_enquiry_id;
    
    -- Generate case number
    SET v_case_number = GenerateDocumentNumber('C');
    
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
    
    -- Link document to case
    INSERT INTO case_documents (
        case_id,
        document_type,
        document_id,
        document_number
    ) SELECT 
        v_case_id,
        'enquiry',
        id,
        enquiry_id
    FROM sales_enquiries 
    WHERE id = p_enquiry_id;
    
    -- Return the case ID
    SELECT v_case_id as case_id, v_case_number as case_number;
END//

-- Procedure to transition case to estimation
CREATE PROCEDURE TransitionCaseToEstimation(
    IN p_case_id INT,
    IN p_estimation_id INT,
    IN p_user_id INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE v_estimation_number VARCHAR(50);
    
    -- Get estimation number
    SELECT estimation_id INTO v_estimation_number
    FROM estimations 
    WHERE id = p_estimation_id;
    
    -- Update case state
    UPDATE cases 
    SET current_state = 'estimation',
        updated_by = p_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_case_id;
    
    -- Update estimation with case_id
    UPDATE estimations 
    SET case_id = p_case_id 
    WHERE id = p_estimation_id;
    
    -- Create state transition record
    INSERT INTO case_state_transitions (
        case_id,
        from_state,
        to_state,
        transition_reason,
        notes,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        p_case_id,
        'enquiry',
        'estimation',
        'Estimation created',
        p_notes,
        'estimation',
        p_estimation_id,
        p_user_id
    );
    
    -- Link estimation document to case
    INSERT INTO case_documents (
        case_id,
        document_type,
        document_id,
        document_number
    ) VALUES (
        p_case_id,
        'estimation',
        p_estimation_id,
        v_estimation_number
    );
END//

-- Procedure to transition case to quotation
CREATE PROCEDURE TransitionCaseToQuotation(
    IN p_case_id INT,
    IN p_quotation_id INT,
    IN p_user_id INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE v_quotation_number VARCHAR(50);
    DECLARE v_quotation_amount DECIMAL(12,2);
    
    -- Get quotation details
    SELECT quotation_id, grand_total 
    INTO v_quotation_number, v_quotation_amount
    FROM quotations 
    WHERE id = p_quotation_id;
    
    -- Update case state and value
    UPDATE cases 
    SET current_state = 'quotation',
        final_value = v_quotation_amount,
        updated_by = p_user_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_case_id;
    
    -- Update quotation with case_id
    UPDATE quotations 
    SET case_id = p_case_id 
    WHERE id = p_quotation_id;
    
    -- Create state transition record
    INSERT INTO case_state_transitions (
        case_id,
        from_state,
        to_state,
        transition_reason,
        notes,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        p_case_id,
        'estimation',
        'quotation',
        'Quotation generated',
        p_notes,
        'quotation',
        p_quotation_id,
        p_user_id
    );
    
    -- Link quotation document to case
    INSERT INTO case_documents (
        case_id,
        document_type,
        document_id,
        document_number
    ) VALUES (
        p_case_id,
        'quotation',
        p_quotation_id,
        v_quotation_number
    );
END//

-- Function to generate document numbers
CREATE FUNCTION GenerateDocumentNumber(doc_type VARCHAR(10))
RETURNS VARCHAR(50)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE next_seq INT;
    DECLARE financial_year VARCHAR(4);
    DECLARE doc_number VARCHAR(50);
    
    -- Get current financial year (Apr-Mar cycle)
    SET financial_year = CASE 
        WHEN MONTH(CURDATE()) >= 4 THEN CONCAT(RIGHT(YEAR(CURDATE()), 2), RIGHT(YEAR(CURDATE()) + 1, 2))
        ELSE CONCAT(RIGHT(YEAR(CURDATE()) - 1, 2), RIGHT(YEAR(CURDATE()), 2))
    END;
    
    -- Get and increment sequence
    INSERT INTO document_sequences (document_type, financial_year, last_sequence)
    VALUES (doc_type, financial_year, 1)
    ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1;
    
    SELECT last_sequence INTO next_seq
    FROM document_sequences
    WHERE document_type = doc_type AND financial_year = financial_year;
    
    -- Format document number
    SET doc_number = CONCAT('VESPL/', doc_type, '/', financial_year, '/', LPAD(next_seq, 3, '0'));
    
    RETURN doc_number;
END//

DELIMITER ;

-- Create indexes for better performance on joined queries
CREATE INDEX idx_sales_enquiries_case_client ON sales_enquiries(case_id, client_id);
CREATE INDEX idx_estimations_case_enquiry ON estimations(case_id, enquiry_id);
CREATE INDEX idx_quotations_case_estimation ON quotations(case_id, estimation_id);

-- Update existing case_history entries to link with cases (if needed)
-- This would require manual data migration based on reference_type and reference_id

-- Add comments for documentation
ALTER TABLE sales_enquiries COMMENT = 'Sales enquiries table - now integrated with case management system';
ALTER TABLE estimations COMMENT = 'Estimations table - linked to cases for workflow tracking';
ALTER TABLE quotations COMMENT = 'Quotations table - part of case management workflow';

-- Create view for complete case workflow status
CREATE VIEW case_workflow_status AS
SELECT 
    c.case_number,
    c.project_name,
    c.current_state,
    c.status,
    cl.company_name as client_name,
    -- Enquiry info
    se.enquiry_id,
    se.date as enquiry_date,
    se.status as enquiry_status,
    -- Estimation info
    e.estimation_id,
    e.date as estimation_date,
    e.status as estimation_status,
    e.total_final_price as estimation_amount,
    -- Quotation info
    q.quotation_id,
    q.date as quotation_date,
    q.status as quotation_status,
    q.grand_total as quotation_amount,
    q.valid_until as quotation_valid_until,
    -- Timeline info
    c.created_at as case_created,
    c.updated_at as last_updated,
    u.full_name as assigned_to
FROM cases c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN sales_enquiries se ON c.enquiry_id = se.id
LEFT JOIN estimations e ON c.id = e.case_id
LEFT JOIN quotations q ON c.id = q.case_id
LEFT JOIN users u ON c.assigned_to = u.id
ORDER BY c.updated_at DESC;