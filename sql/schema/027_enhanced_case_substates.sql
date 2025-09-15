-- Enhanced Case Management with Sub-states and Workflow Automation
-- File: 027_enhanced_case_substates.sql
-- Adds sub-state management and workflow automation capabilities

-- Add sub-state columns to cases table
ALTER TABLE cases ADD COLUMN 
    sub_state VARCHAR(50) NULL COMMENT 'Current sub-state within the main state',
ADD COLUMN 
    workflow_step INT DEFAULT 1 COMMENT 'Current step number in the workflow',
ADD COLUMN 
    auto_transition BOOLEAN DEFAULT FALSE COMMENT 'Whether this case can auto-transition',
ADD COLUMN 
    requires_approval BOOLEAN DEFAULT FALSE COMMENT 'Whether next transition needs approval',
ADD COLUMN 
    approval_pending_from INT NULL COMMENT 'User ID from whom approval is pending',
ADD COLUMN 
    workflow_data JSON NULL COMMENT 'Workflow-specific data and configurations',
ADD COLUMN 
    state_entered_at TIMESTAMP NULL COMMENT 'When current state was entered',
ADD COLUMN 
    expected_state_completion TIMESTAMP NULL COMMENT 'Expected completion time for current state',
ADD COLUMN 
    sla_hours_for_state DECIMAL(8,2) DEFAULT 24.00 COMMENT 'SLA hours for current state',
ADD COLUMN 
    is_sla_breached BOOLEAN DEFAULT FALSE COMMENT 'Whether SLA is currently breached',
ADD COLUMN 
    can_proceed BOOLEAN DEFAULT TRUE COMMENT 'Whether case can proceed to next step',
ADD COLUMN 
    blocking_reason VARCHAR(255) NULL COMMENT 'Reason if case is blocked',
ADD COLUMN 
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Last activity timestamp',
ADD FOREIGN KEY (approval_pending_from) REFERENCES users(id) ON DELETE SET NULL;

-- Create case workflow definitions table
CREATE TABLE case_workflow_definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_name ENUM(
        'enquiry', 
        'estimation', 
        'quotation', 
        'order', 
        'production', 
        'delivery', 
        'closed'
    ) NOT NULL,
    sub_state_name VARCHAR(50) NOT NULL,
    step_order INT NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Workflow rules
    sla_hours DECIMAL(8,2) NOT NULL DEFAULT 24.00,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_role VARCHAR(50) NULL COMMENT 'Role required for approval (manager, director, etc.)',
    auto_transition_conditions JSON NULL COMMENT 'Conditions for automatic transition',
    required_documents JSON NULL COMMENT 'Documents required to complete this step',
    
    -- Business rules
    is_client_visible BOOLEAN DEFAULT TRUE COMMENT 'Whether client can see this sub-state',
    is_billable BOOLEAN DEFAULT FALSE COMMENT 'Whether time in this state is billable',
    resource_type VARCHAR(50) NULL COMMENT 'Type of resource needed (engineer, manager, etc.)',
    
    -- Notifications
    notify_on_entry BOOLEAN DEFAULT TRUE,
    notify_on_sla_breach BOOLEAN DEFAULT TRUE,
    escalation_hours DECIMAL(8,2) NULL COMMENT 'Hours before escalation',
    escalation_to VARCHAR(50) NULL COMMENT 'Role to escalate to',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_state_substate (state_name, sub_state_name),
    INDEX idx_state_step (state_name, step_order),
    INDEX idx_approval_role (approval_role)
) COMMENT='Defines workflow steps and rules for each case state';

-- Case sub-state transitions tracking
CREATE TABLE case_substate_transitions (
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
    from_sub_state VARCHAR(50) NULL,
    to_state ENUM(
        'enquiry', 
        'estimation', 
        'quotation', 
        'order', 
        'production', 
        'delivery', 
        'closed'
    ) NOT NULL,
    to_sub_state VARCHAR(50) NOT NULL,
    
    transition_type ENUM('auto', 'manual', 'approval', 'escalation') DEFAULT 'manual',
    transition_reason VARCHAR(255) NULL,
    notes TEXT,
    time_spent_hours DECIMAL(8,2) NULL COMMENT 'Time spent in previous state',
    
    -- Approval tracking
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    approval_notes TEXT,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_case_transitions (case_id, created_at),
    INDEX idx_state_transition (from_state, to_state),
    INDEX idx_approval (approval_required, approved_by)
) COMMENT='Detailed tracking of sub-state transitions';