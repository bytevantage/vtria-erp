-- Case Management System Schema
-- File: 023_case_management_system.sql
-- This schema creates the core case management tables and integrates with existing workflow

-- Drop existing tables if they exist (for fresh implementation)
DROP TABLE IF EXISTS case_state_transitions;
DROP TABLE IF EXISTS cases;

-- Main Cases Table
CREATE TABLE cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_number VARCHAR(50) NOT NULL UNIQUE, -- VESPL/C/2526/XXX format
    enquiry_id INT NULL, -- Links to sales_enquiries table
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
    
    -- Foreign Key Constraints
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes for performance
    INDEX idx_case_number (case_number),
    INDEX idx_current_state (current_state),
    INDEX idx_client_id (client_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) COMMENT='Main cases table for tracking entire project lifecycle';

-- Case State Transitions Table
CREATE TABLE case_state_transitions (
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
    ) NULL, -- NULL for initial creation
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
    reference_id INT NULL, -- ID of the document that triggered the transition
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_case_transitions (case_id, created_at),
    INDEX idx_state_transition (from_state, to_state),
    INDEX idx_reference (reference_type, reference_id)
) COMMENT='Tracks all state transitions for cases with audit trail';

-- Case Documents Relationship Table
CREATE TABLE case_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    document_type ENUM('enquiry', 'estimation', 'quotation', 'sales_order', 'purchase_order', 'delivery_challan', 'invoice') NOT NULL,
    document_id INT NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_case_documents (case_id, document_type),
    INDEX idx_document_reference (document_type, document_id),
    
    -- Ensure unique current document per type per case
    UNIQUE KEY unique_current_doc (case_id, document_type, is_current)
) COMMENT='Links cases to their related documents across the workflow';

-- Case Timeline View for easy access to complete case history
CREATE VIEW case_timeline AS
SELECT 
    c.id as case_id,
    c.case_number,
    c.project_name,
    cl.company_name as client_name,
    c.current_state,
    c.status,
    c.created_at as case_created,
    cst.id as transition_id,
    cst.from_state,
    cst.to_state,
    cst.transition_reason,
    cst.notes as transition_notes,
    cst.reference_type,
    cst.reference_id,
    cst.created_at as transition_date,
    u.full_name as transition_by
FROM cases c
LEFT JOIN case_state_transitions cst ON c.id = cst.case_id
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN users u ON cst.created_by = u.id
ORDER BY c.id, cst.created_at;

-- Case Summary View for dashboard display
CREATE VIEW case_summary AS
SELECT 
    c.id as case_id,
    c.case_number,
    c.project_name,
    c.current_state,
    c.priority,
    c.status,
    c.estimated_value,
    c.final_value,
    c.expected_completion_date,
    c.created_at as case_created,
    c.updated_at as last_updated,
    cl.company_name as client_name,
    cl.contact_person,
    cl.city as client_city,
    cl.state as client_state,
    u_assigned.full_name as assigned_to_name,
    u_created.full_name as created_by_name,
    -- Count of documents in each stage
    (SELECT COUNT(*) FROM case_documents cd WHERE cd.case_id = c.id AND cd.document_type = 'enquiry') as enquiry_count,
    (SELECT COUNT(*) FROM case_documents cd WHERE cd.case_id = c.id AND cd.document_type = 'estimation') as estimation_count,
    (SELECT COUNT(*) FROM case_documents cd WHERE cd.case_id = c.id AND cd.document_type = 'quotation') as quotation_count,
    (SELECT COUNT(*) FROM case_documents cd WHERE cd.case_id = c.id AND cd.document_type = 'sales_order') as order_count,
    -- Latest transition info
    (SELECT cst.transition_reason FROM case_state_transitions cst WHERE cst.case_id = c.id ORDER BY cst.created_at DESC LIMIT 1) as last_transition_reason,
    (SELECT cst.created_at FROM case_state_transitions cst WHERE cst.case_id = c.id ORDER BY cst.created_at DESC LIMIT 1) as last_transition_date
FROM cases c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN users u_assigned ON c.assigned_to = u_assigned.id
LEFT JOIN users u_created ON c.created_by = u_created.id
WHERE c.status != 'cancelled'
ORDER BY c.updated_at DESC;

-- Triggers for automatic state transition logging

DELIMITER //

-- Trigger to log state changes in cases table
CREATE TRIGGER tr_case_state_change 
AFTER UPDATE ON cases
FOR EACH ROW
BEGIN
    IF OLD.current_state != NEW.current_state THEN
        INSERT INTO case_state_transitions (
            case_id, 
            from_state, 
            to_state, 
            transition_reason,
            notes,
            created_by
        ) VALUES (
            NEW.id,
            OLD.current_state,
            NEW.current_state,
            CONCAT('State changed from ', OLD.current_state, ' to ', NEW.current_state),
            'Automatic state transition',
            NEW.updated_by -- Assuming you add updated_by field to cases table
        );
    END IF;
END//

DELIMITER ;

-- Insert initial case states for document sequences
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) VALUES
('C', '2526', 0);

-- Sample data for testing (optional - remove in production)
-- INSERT INTO cases (case_number, client_id, project_name, requirements, current_state, created_by) VALUES
-- ('VESPL/C/2526/001', 1, 'Industrial Automation System', 'Complete PLC based automation for manufacturing line', 'enquiry', 1),
-- ('VESPL/C/2526/002', 2, 'HVAC Installation', 'Central air conditioning for 50000 sq ft warehouse', 'estimation', 1);

COMMENT ON TABLE cases IS 'Main table for case management - tracks entire project lifecycle';
COMMENT ON TABLE case_state_transitions IS 'Audit trail for all case state changes';
COMMENT ON TABLE case_documents IS 'Links cases to documents across different stages';