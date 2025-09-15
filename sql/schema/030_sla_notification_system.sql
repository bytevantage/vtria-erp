-- SLA Notification and Escalation System
-- File: 030_sla_notification_system.sql
-- Implements automated notifications, escalations, and performance tracking

-- Notification templates table
CREATE TABLE notification_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type ENUM('sla_warning', 'sla_breach', 'escalation', 'reminder', 'approval_pending') NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    notification_channels JSON NOT NULL COMMENT 'Array of channels: email, sms, in_app, slack',
    trigger_conditions JSON NULL COMMENT 'Conditions for when to send this template',
    
    -- Timing configuration
    trigger_hours_before DECIMAL(8,2) NULL COMMENT 'Hours before event to trigger (for warnings)',
    max_frequency_hours DECIMAL(8,2) DEFAULT 24.00 COMMENT 'Minimum hours between same notifications',
    
    -- Personalization
    role_specific BOOLEAN DEFAULT FALSE COMMENT 'Whether template varies by user role',
    client_visible BOOLEAN DEFAULT FALSE COMMENT 'Whether clients receive this notification',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_template_type (template_type),
    INDEX idx_active (is_active)
) COMMENT='Templates for automated notifications';

-- Notification queue table
CREATE TABLE notification_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    template_id INT NOT NULL,
    recipient_type ENUM('user', 'role', 'client', 'external') NOT NULL,
    recipient_id INT NULL COMMENT 'User ID for user type, NULL for role-based',
    recipient_role VARCHAR(50) NULL COMMENT 'Role name for role-based notifications',
    recipient_email VARCHAR(255) NULL COMMENT 'Email for external recipients',
    recipient_phone VARCHAR(20) NULL COMMENT 'Phone for SMS notifications',
    
    -- Notification content (personalized)
    subject TEXT NOT NULL,
    message_body TEXT NOT NULL,
    notification_channels JSON NOT NULL,
    
    -- Scheduling and status
    scheduled_at TIMESTAMP NOT NULL COMMENT 'When to send notification',
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    failed_reason TEXT NULL,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Context data
    trigger_event VARCHAR(100) NOT NULL COMMENT 'Event that triggered notification',
    context_data JSON NULL COMMENT 'Additional data for personalization',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_scheduled (status, scheduled_at),
    INDEX idx_case_notifications (case_id),
    INDEX idx_recipient (recipient_type, recipient_id),
    INDEX idx_status (status)
) COMMENT='Queue for outbound notifications';

-- Escalation rules table
CREATE TABLE escalation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    trigger_type ENUM('sla_breach', 'time_based', 'approval_delay', 'custom') NOT NULL,
    
    -- Trigger conditions
    state_name ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed') NULL,
    sub_state_name VARCHAR(50) NULL,
    priority_level ENUM('low', 'medium', 'high') NULL,
    hours_overdue DECIMAL(8,2) NULL COMMENT 'Hours past SLA to trigger escalation',
    
    -- Escalation actions
    escalate_to_role VARCHAR(50) NOT NULL COMMENT 'Role to escalate to',
    escalate_after_hours DECIMAL(8,2) NOT NULL COMMENT 'Hours to wait before escalating',
    max_escalation_levels INT DEFAULT 3,
    
    -- Notification settings
    send_notification BOOLEAN DEFAULT TRUE,
    notification_template_id INT NULL,
    cc_original_assignee BOOLEAN DEFAULT TRUE,
    
    -- Auto-assignment
    auto_reassign BOOLEAN DEFAULT FALSE COMMENT 'Whether to auto-reassign case',
    reassignment_logic ENUM('round_robin', 'least_loaded', 'skill_based', 'manual') DEFAULT 'manual',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id),
    
    INDEX idx_trigger_type (trigger_type),
    INDEX idx_state_substate (state_name, sub_state_name),
    INDEX idx_active (is_active)
) COMMENT='Rules for automatic escalation of cases';

-- Escalation history table
CREATE TABLE case_escalations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    escalation_rule_id INT NOT NULL,
    escalation_level INT NOT NULL DEFAULT 1,
    
    -- Escalation details
    triggered_by ENUM('sla_breach', 'manual', 'system') NOT NULL,
    escalated_from_user INT NULL,
    escalated_to_user INT NULL,
    escalated_to_role VARCHAR(50) NULL,
    
    -- Timing
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolution_action ENUM('completed', 'reassigned', 'cancelled', 'further_escalated') NULL,
    resolution_notes TEXT NULL,
    
    -- Impact tracking
    hours_to_resolution DECIMAL(8,2) NULL,
    client_impact_level ENUM('none', 'low', 'medium', 'high', 'critical') DEFAULT 'low',
    
    created_by INT NOT NULL,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (escalation_rule_id) REFERENCES escalation_rules(id),
    FOREIGN KEY (escalated_from_user) REFERENCES users(id),
    FOREIGN KEY (escalated_to_user) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_case_escalations (case_id),
    INDEX idx_trigger_time (triggered_at),
    INDEX idx_escalation_level (escalation_level)
) COMMENT='History of case escalations';

-- Performance metrics table
CREATE TABLE case_performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    
    -- Timing metrics
    total_cycle_time_hours DECIMAL(10,2) NULL COMMENT 'Total time from start to completion',
    sla_compliance_percentage DECIMAL(5,2) NULL COMMENT 'Percentage of SLAs met',
    average_response_time_hours DECIMAL(8,2) NULL COMMENT 'Average response time per state',
    
    -- State-wise timing
    enquiry_time_hours DECIMAL(8,2) NULL,
    estimation_time_hours DECIMAL(8,2) NULL,
    quotation_time_hours DECIMAL(8,2) NULL,
    order_time_hours DECIMAL(8,2) NULL,
    production_time_hours DECIMAL(8,2) NULL,
    delivery_time_hours DECIMAL(8,2) NULL,
    
    -- Quality metrics
    rework_count INT DEFAULT 0 COMMENT 'Number of times case went backwards',
    approval_delays_count INT DEFAULT 0 COMMENT 'Number of approval delays',
    client_escalations_count INT DEFAULT 0 COMMENT 'Client-initiated escalations',
    
    -- Business metrics
    estimated_value DECIMAL(15,2) NULL,
    final_value DECIMAL(15,2) NULL,
    value_variance_percentage DECIMAL(5,2) NULL COMMENT 'Variance between estimated and final',
    profit_margin_percentage DECIMAL(5,2) NULL,
    
    -- Resource utilization
    engineers_involved INT NULL COMMENT 'Number of engineers who worked on case',
    departments_involved JSON NULL COMMENT 'List of departments involved',
    
    -- Client satisfaction
    client_satisfaction_score DECIMAL(3,1) NULL COMMENT 'Score out of 10',
    client_feedback TEXT NULL,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    UNIQUE KEY unique_case_metrics (case_id),
    INDEX idx_sla_compliance (sla_compliance_percentage),
    INDEX idx_cycle_time (total_cycle_time_hours)
) COMMENT='Performance metrics for each case';

-- Insert default notification templates
INSERT INTO notification_templates 
(template_name, template_type, subject_template, body_template, notification_channels, trigger_hours_before, client_visible) VALUES

-- SLA Warning notifications
('SLA Warning - 2 Hours', 'sla_warning', 
'⚠️ SLA Warning: Case {{case_number}} - {{project_name}}',
'Dear {{user_name}},

Case {{case_number}} for {{client_name}} is approaching its SLA deadline.

Project: {{project_name}}
Current State: {{current_state}} - {{sub_state}}
SLA Deadline: {{sla_deadline}}
Time Remaining: 2 hours

Please take immediate action to avoid SLA breach.

View Case: {{case_url}}

Best regards,
VTRIA ERP System',
'["email", "in_app"]', 2.00, FALSE),

-- SLA Breach notifications
('SLA Breach Alert', 'sla_breach',
'🚨 SLA BREACH: Case {{case_number}} - IMMEDIATE ACTION REQUIRED',
'URGENT: SLA BREACH NOTIFICATION

Case {{case_number}} has breached its SLA and requires immediate attention.

Project: {{project_name}}
Client: {{client_name}}
Current State: {{current_state}} - {{sub_state}}
Hours Overdue: {{hours_overdue}}
Assigned To: {{assigned_to_name}}

This breach may impact client satisfaction and contract SLAs.

IMMEDIATE ACTIONS REQUIRED:
1. Contact assigned engineer: {{assigned_to_email}}
2. Assess delay reason and provide ETA
3. Notify client if necessary
4. Update case status

View Case: {{case_url}}

VTRIA ERP System',
'["email", "sms", "in_app"]', NULL, FALSE),

-- Escalation notifications
('Escalation Notice', 'escalation',
'📈 Case Escalated: {{case_number}} - {{escalation_reason}}',
'Case Escalation Notification

Case {{case_number}} has been escalated to your attention.

Project: {{project_name}}
Client: {{client_name}}
Escalation Reason: {{escalation_reason}}
Escalated From: {{escalated_from_name}}
Priority: {{priority}}

Current Status:
- State: {{current_state}} - {{sub_state}}
- Hours Overdue: {{hours_overdue}}
- Previous Actions: {{previous_actions}}

Please review and take appropriate action within {{escalation_sla}} hours.

View Case: {{case_url}}

VTRIA ERP System',
'["email", "in_app"]', NULL, FALSE),

-- Client notification templates
('Client SLA Update', 'sla_warning',
'Project Update: {{project_name}} - Status Update',
'Dear {{client_name}},

We wanted to provide you with an update on your project:

Project: {{project_name}}
Reference: {{case_number}}
Current Status: {{current_state_display}}
Progress: {{progress_percentage}}%

We are currently working on {{current_step_description}} and expect to complete this phase by {{expected_completion}}.

If you have any questions, please contact your project manager at {{assigned_to_email}}.

Thank you for your patience.

Best regards,
VTRIA Engineering Solutions Team',
'["email"]', 4.00, TRUE);

-- Insert default escalation rules
INSERT INTO escalation_rules 
(rule_name, trigger_type, state_name, hours_overdue, escalate_to_role, escalate_after_hours, notification_template_id) VALUES

('Enquiry SLA Breach', 'sla_breach', 'enquiry', 0.5, 'manager', 0.0, 
 (SELECT id FROM notification_templates WHERE template_name = 'Escalation Notice')),

('Estimation Delay', 'sla_breach', 'estimation', 2.0, 'manager', 1.0,
 (SELECT id FROM notification_templates WHERE template_name = 'Escalation Notice')),

('Production Critical Delay', 'sla_breach', 'production', 4.0, 'director', 2.0,
 (SELECT id FROM notification_templates WHERE template_name = 'Escalation Notice')),

('High Priority Cases', 'sla_breach', NULL, 0.0, 'director', 0.5,
 (SELECT id FROM notification_templates WHERE template_name = 'SLA Breach Alert'));