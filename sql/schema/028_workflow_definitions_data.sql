-- Insert default workflow definitions
INSERT INTO case_workflow_definitions 
(state_name, sub_state_name, step_order, display_name, description, sla_hours, requires_approval, approval_role, is_client_visible, notify_on_entry, escalation_hours, escalation_to) VALUES

-- Enquiry workflow
('enquiry', 'received', 1, 'Enquiry Received', 'New enquiry has been received and logged', 2.00, FALSE, NULL, TRUE, TRUE, 4.00, 'manager'),
('enquiry', 'under_review', 2, 'Under Review', 'Technical team is reviewing the enquiry', 4.00, FALSE, NULL, TRUE, TRUE, 8.00, 'manager'),
('enquiry', 'clarification_pending', 3, 'Clarification Pending', 'Waiting for clarification from client', 24.00, FALSE, NULL, TRUE, TRUE, 48.00, 'manager'),
('enquiry', 'approved', 4, 'Approved for Estimation', 'Enquiry approved, ready for estimation', 1.00, TRUE, 'manager', TRUE, TRUE, 2.00, 'director'),

-- Estimation workflow
('estimation', 'assigned', 1, 'Assigned to Engineer', 'Estimation assigned to technical engineer', 2.00, FALSE, NULL, TRUE, TRUE, 4.00, 'manager'),
('estimation', 'in_progress', 2, 'Estimation in Progress', 'Engineer is working on the estimation', 16.00, FALSE, NULL, TRUE, TRUE, 24.00, 'manager'),
('estimation', 'technical_review', 3, 'Technical Review', 'Estimation under technical review', 4.00, FALSE, NULL, FALSE, TRUE, 8.00, 'manager'),
('estimation', 'management_review', 4, 'Management Review', 'Estimation under management review', 4.00, TRUE, 'manager', FALSE, TRUE, 8.00, 'director'),
('estimation', 'approved', 5, 'Approved', 'Estimation approved for quotation', 1.00, FALSE, NULL, TRUE, TRUE, 2.00, 'manager'),

-- Quotation workflow
('quotation', 'draft', 1, 'Draft Preparation', 'Quotation being prepared', 4.00, FALSE, NULL, FALSE, TRUE, 8.00, 'manager'),
('quotation', 'internal_review', 2, 'Internal Review', 'Internal review of quotation', 2.00, TRUE, 'manager', FALSE, TRUE, 4.00, 'director'),
('quotation', 'sent_to_client', 3, 'Sent to Client', 'Quotation sent to client for review', 0.50, FALSE, NULL, TRUE, TRUE, 1.00, 'manager'),
('quotation', 'negotiation', 4, 'Under Negotiation', 'Price and terms negotiation with client', 48.00, FALSE, NULL, TRUE, TRUE, 72.00, 'manager'),
('quotation', 'approved', 5, 'Client Approved', 'Client has approved the quotation', 1.00, FALSE, NULL, TRUE, TRUE, 2.00, 'manager'),

-- Order workflow
('order', 'po_received', 1, 'PO Received', 'Purchase order received from client', 1.00, FALSE, NULL, TRUE, TRUE, 2.00, 'manager'),
('order', 'po_review', 2, 'PO Under Review', 'Purchase order under review', 4.00, FALSE, NULL, FALSE, TRUE, 8.00, 'manager'),
('order', 'confirmed', 3, 'Order Confirmed', 'Order confirmed and scheduled', 2.00, TRUE, 'manager', TRUE, TRUE, 4.00, 'director'),

-- Production workflow
('production', 'planning', 1, 'Production Planning', 'Planning resources and timeline', 8.00, FALSE, NULL, TRUE, TRUE, 16.00, 'manager'),
('production', 'material_procurement', 2, 'Material Procurement', 'Procuring required materials', 72.00, FALSE, NULL, TRUE, TRUE, 96.00, 'manager'),
('production', 'manufacturing', 3, 'Manufacturing', 'Product manufacturing in progress', 168.00, FALSE, NULL, TRUE, TRUE, 192.00, 'manager'),
('production', 'quality_check', 4, 'Quality Check', 'Quality inspection and testing', 8.00, FALSE, NULL, TRUE, TRUE, 16.00, 'manager'),
('production', 'ready', 5, 'Ready for Delivery', 'Product ready for shipment', 4.00, TRUE, 'manager', TRUE, TRUE, 8.00, 'director'),

-- Delivery workflow
('delivery', 'packaging', 1, 'Packaging', 'Product packaging and documentation', 4.00, FALSE, NULL, TRUE, TRUE, 8.00, 'manager'),
('delivery', 'dispatched', 2, 'Dispatched', 'Product dispatched to client', 1.00, FALSE, NULL, TRUE, TRUE, 2.00, 'manager'),
('delivery', 'in_transit', 3, 'In Transit', 'Product in transit to client location', 48.00, FALSE, NULL, TRUE, TRUE, 72.00, 'manager'),
('delivery', 'delivered', 4, 'Delivered', 'Product delivered to client', 1.00, FALSE, NULL, TRUE, TRUE, 2.00, 'manager'),
('delivery', 'installation', 5, 'Installation', 'Product installation and commissioning', 24.00, FALSE, NULL, TRUE, TRUE, 48.00, 'manager'),
('delivery', 'acceptance', 6, 'Client Acceptance', 'Awaiting client acceptance', 24.00, FALSE, NULL, TRUE, TRUE, 48.00, 'manager'),

-- Closed workflow
('closed', 'completed', 1, 'Project Completed', 'Project successfully completed', 0.00, FALSE, NULL, TRUE, FALSE, NULL, NULL),
('closed', 'cancelled', 1, 'Project Cancelled', 'Project cancelled', 0.00, TRUE, 'manager', TRUE, FALSE, NULL, NULL);

-- Create view for current case workflow status
CREATE VIEW case_workflow_status AS
SELECT 
    c.id as case_id,
    c.case_number,
    c.current_state,
    c.sub_state,
    c.workflow_step,
    cwd.display_name as current_step_name,
    cwd.description as current_step_description,
    cwd.sla_hours,
    c.state_entered_at,
    c.expected_state_completion,
    c.is_sla_breached,
    
    -- Calculate SLA status
    CASE 
        WHEN c.expected_state_completion IS NULL THEN 'No SLA'
        WHEN c.expected_state_completion < NOW() THEN 'Breached'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 4 THEN 'Critical'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 8 THEN 'Warning'
        ELSE 'On Track'
    END as sla_status,
    
    -- Time calculations
    TIMESTAMPDIFF(HOUR, c.state_entered_at, NOW()) as hours_in_current_state,
    TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) as hours_until_sla_breach,
    
    -- Next step information
    next_cwd.sub_state_name as next_sub_state,
    next_cwd.display_name as next_step_name,
    next_cwd.requires_approval as next_requires_approval,
    next_cwd.approval_role as next_approval_role,
    
    c.requires_approval,
    c.approval_pending_from,
    u.name as approval_pending_from_name,
    c.can_proceed,
    c.blocking_reason,
    
    -- Client visibility
    cwd.is_client_visible,
    cwd.is_billable,
    
    c.priority,
    c.status,
    c.client_id,
    cl.name as client_name,
    c.project_name,
    c.assigned_to,
    au.name as assigned_to_name

FROM cases c
LEFT JOIN case_workflow_definitions cwd ON (
    cwd.state_name = c.current_state 
    AND cwd.sub_state_name = c.sub_state
)
LEFT JOIN case_workflow_definitions next_cwd ON (
    next_cwd.state_name = c.current_state 
    AND next_cwd.step_order = cwd.step_order + 1
)
LEFT JOIN users u ON u.id = c.approval_pending_from
LEFT JOIN users au ON au.id = c.assigned_to
LEFT JOIN clients cl ON cl.id = c.client_id
WHERE c.status = 'active';

-- Create indexes for performance
CREATE INDEX idx_cases_substate ON cases(current_state, sub_state);
CREATE INDEX idx_cases_sla_breach ON cases(is_sla_breached, expected_state_completion);
CREATE INDEX idx_cases_approval ON cases(requires_approval, approval_pending_from);
CREATE INDEX idx_cases_activity ON cases(last_activity_at);