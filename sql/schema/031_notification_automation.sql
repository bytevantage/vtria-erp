-- Notification Automation Triggers and Procedures
-- File: 031_notification_automation.sql
-- Automated SLA monitoring and notification triggering

-- Stored procedure to queue SLA warning notifications
DELIMITER //
CREATE PROCEDURE QueueSLAWarningNotifications()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE case_id_val INT;
    DECLARE case_number_val VARCHAR(50);
    DECLARE hours_until_breach DECIMAL(8,2);
    DECLARE assigned_to_val INT;
    
    -- Cursor for cases approaching SLA breach
    DECLARE warning_cursor CURSOR FOR 
        SELECT 
            c.id,
            c.case_number,
            c.assigned_to,
            TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) as hours_remaining
        FROM cases c
        WHERE c.status = 'active'
        AND c.expected_state_completion > NOW()
        AND TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 4
        AND TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) > 0
        AND NOT EXISTS (
            -- Don't send duplicate warnings in last 2 hours
            SELECT 1 FROM notification_queue nq 
            WHERE nq.case_id = c.id 
            AND nq.template_id IN (SELECT id FROM notification_templates WHERE template_type = 'sla_warning')
            AND nq.created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)
            AND nq.status != 'failed'
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN warning_cursor;
    
    warning_loop: LOOP
        FETCH warning_cursor INTO case_id_val, case_number_val, assigned_to_val, hours_until_breach;
        
        IF done THEN
            LEAVE warning_loop;
        END IF;
        
        -- Queue warning notification for assigned user
        IF assigned_to_val IS NOT NULL THEN
            INSERT INTO notification_queue (
                case_id, 
                template_id, 
                recipient_type, 
                recipient_id,
                subject,
                message_body,
                notification_channels,
                scheduled_at,
                trigger_event,
                context_data
            )
            SELECT 
                case_id_val,
                nt.id,
                'user',
                assigned_to_val,
                REPLACE(REPLACE(nt.subject_template, '{{case_number}}', case_number_val), '{{hours_remaining}}', hours_until_breach),
                REPLACE(REPLACE(REPLACE(nt.body_template, '{{case_number}}', case_number_val), '{{hours_remaining}}', hours_until_breach), '{{user_name}}', u.name),
                nt.notification_channels,
                NOW(),
                'sla_warning',
                JSON_OBJECT('hours_until_breach', hours_until_breach, 'case_number', case_number_val)
            FROM notification_templates nt
            CROSS JOIN users u
            WHERE nt.template_name = 'SLA Warning - 2 Hours'
            AND u.id = assigned_to_val;
        END IF;
        
    END LOOP;
    
    CLOSE warning_cursor;
END//
DELIMITER ;

-- Stored procedure to queue SLA breach notifications
DELIMITER //
CREATE PROCEDURE QueueSLABreachNotifications()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE case_id_val INT;
    DECLARE case_number_val VARCHAR(50);
    DECLARE hours_overdue DECIMAL(8,2);
    DECLARE assigned_to_val INT;
    DECLARE priority_val ENUM('low', 'medium', 'high');
    
    -- Cursor for breached cases
    DECLARE breach_cursor CURSOR FOR 
        SELECT 
            c.id,
            c.case_number,
            c.assigned_to,
            c.priority,
            TIMESTAMPDIFF(HOUR, c.expected_state_completion, NOW()) as hours_past_sla
        FROM cases c
        WHERE c.status = 'active'
        AND c.expected_state_completion < NOW()
        AND c.is_sla_breached = FALSE  -- Only newly breached cases
        AND NOT EXISTS (
            -- Don't send duplicate breach alerts in last 1 hour
            SELECT 1 FROM notification_queue nq 
            WHERE nq.case_id = c.id 
            AND nq.template_id IN (SELECT id FROM notification_templates WHERE template_type = 'sla_breach')
            AND nq.created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN breach_cursor;
    
    breach_loop: LOOP
        FETCH breach_cursor INTO case_id_val, case_number_val, assigned_to_val, priority_val, hours_overdue;
        
        IF done THEN
            LEAVE breach_loop;
        END IF;
        
        -- Mark case as SLA breached
        UPDATE cases SET is_sla_breached = TRUE WHERE id = case_id_val;
        
        -- Queue breach notification for assigned user
        IF assigned_to_val IS NOT NULL THEN
            INSERT INTO notification_queue (
                case_id, 
                template_id, 
                recipient_type, 
                recipient_id,
                subject,
                message_body,
                notification_channels,
                scheduled_at,
                trigger_event,
                context_data
            )
            SELECT 
                case_id_val,
                nt.id,
                'user',
                assigned_to_val,
                REPLACE(REPLACE(nt.subject_template, '{{case_number}}', case_number_val), '{{hours_overdue}}', hours_overdue),
                REPLACE(REPLACE(REPLACE(nt.body_template, '{{case_number}}', case_number_val), '{{hours_overdue}}', hours_overdue), '{{user_name}}', u.name),
                nt.notification_channels,
                NOW(),
                'sla_breach',
                JSON_OBJECT('hours_overdue', hours_overdue, 'priority', priority_val)
            FROM notification_templates nt
            CROSS JOIN users u
            WHERE nt.template_name = 'SLA Breach Alert'
            AND u.id = assigned_to_val;
        END IF;
        
        -- Queue notification for manager if high priority
        IF priority_val = 'high' THEN
            INSERT INTO notification_queue (
                case_id, 
                template_id, 
                recipient_type, 
                recipient_role,
                subject,
                message_body,
                notification_channels,
                scheduled_at,
                trigger_event
            )
            SELECT 
                case_id_val,
                nt.id,
                'role',
                'manager',
                REPLACE(REPLACE(nt.subject_template, '{{case_number}}', case_number_val), '{{hours_overdue}}', hours_overdue),
                REPLACE(REPLACE(nt.body_template, '{{case_number}}', case_number_val), '{{hours_overdue}}', hours_overdue),
                nt.notification_channels,
                NOW(),
                'high_priority_breach'
            FROM notification_templates nt
            WHERE nt.template_name = 'SLA Breach Alert';
        END IF;
        
    END LOOP;
    
    CLOSE breach_cursor;
END//
DELIMITER ;

-- Stored procedure to trigger escalations
DELIMITER //
CREATE PROCEDURE ProcessEscalations()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE case_id_val INT;
    DECLARE rule_id_val INT;
    DECLARE escalate_to_role_val VARCHAR(50);
    DECLARE assigned_to_val INT;
    
    -- Cursor for cases that need escalation
    DECLARE escalation_cursor CURSOR FOR 
        SELECT DISTINCT
            c.id as case_id,
            er.id as rule_id,
            er.escalate_to_role,
            c.assigned_to
        FROM cases c
        JOIN escalation_rules er ON (
            (er.state_name IS NULL OR er.state_name = c.current_state)
            AND (er.priority_level IS NULL OR er.priority_level = c.priority)
            AND er.is_active = TRUE
        )
        WHERE c.status = 'active'
        AND c.is_sla_breached = TRUE
        AND TIMESTAMPDIFF(HOUR, c.expected_state_completion, NOW()) >= COALESCE(er.hours_overdue, 0)
        AND NOT EXISTS (
            -- Don't escalate if already escalated recently
            SELECT 1 FROM case_escalations ce 
            WHERE ce.case_id = c.id 
            AND ce.escalation_rule_id = er.id
            AND ce.triggered_at > DATE_SUB(NOW(), INTERVAL er.escalate_after_hours HOUR)
        );
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN escalation_cursor;
    
    escalation_loop: LOOP
        FETCH escalation_cursor INTO case_id_val, rule_id_val, escalate_to_role_val, assigned_to_val;
        
        IF done THEN
            LEAVE escalation_loop;
        END IF;
        
        -- Create escalation record
        INSERT INTO case_escalations (
            case_id,
            escalation_rule_id,
            escalation_level,
            triggered_by,
            escalated_from_user,
            escalated_to_role,
            created_by
        ) VALUES (
            case_id_val,
            rule_id_val,
            1, -- First level escalation
            'sla_breach',
            assigned_to_val,
            escalate_to_role_val,
            1 -- System user
        );
        
        -- Queue escalation notification
        INSERT INTO notification_queue (
            case_id, 
            template_id, 
            recipient_type, 
            recipient_role,
            subject,
            message_body,
            notification_channels,
            scheduled_at,
            trigger_event,
            context_data
        )
        SELECT 
            case_id_val,
            nt.id,
            'role',
            escalate_to_role_val,
            REPLACE(nt.subject_template, '{{case_number}}', c.case_number),
            REPLACE(REPLACE(nt.body_template, '{{case_number}}', c.case_number), '{{escalation_reason}}', 'SLA Breach'),
            nt.notification_channels,
            NOW(),
            'escalation',
            JSON_OBJECT('escalated_to_role', escalate_to_role_val, 'rule_id', rule_id_val)
        FROM notification_templates nt
        CROSS JOIN cases c
        WHERE nt.template_name = 'Escalation Notice'
        AND c.id = case_id_val;
        
    END LOOP;
    
    CLOSE escalation_cursor;
END//
DELIMITER ;

-- Create event to run SLA monitoring every 15 minutes
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS sla_monitoring_event
ON SCHEDULE EVERY 15 MINUTE
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    CALL QueueSLAWarningNotifications();
    CALL QueueSLABreachNotifications();
    CALL ProcessEscalations();
END;

-- Procedure to calculate case performance metrics
DELIMITER //
CREATE PROCEDURE CalculateCaseMetrics(IN p_case_id INT)
BEGIN
    DECLARE total_hours DECIMAL(10,2);
    DECLARE sla_met_count INT;
    DECLARE total_sla_count INT;
    DECLARE sla_compliance DECIMAL(5,2);
    
    -- Calculate total cycle time
    SELECT TIMESTAMPDIFF(HOUR, MIN(created_at), MAX(updated_at)) INTO total_hours
    FROM case_substate_transitions 
    WHERE case_id = p_case_id;
    
    -- Calculate SLA compliance
    SELECT 
        COUNT(CASE WHEN cst.time_spent_hours <= cwd.sla_hours THEN 1 END),
        COUNT(*)
    INTO sla_met_count, total_sla_count
    FROM case_substate_transitions cst
    JOIN case_workflow_definitions cwd ON (
        cwd.state_name = cst.to_state 
        AND cwd.sub_state_name = cst.to_sub_state
    )
    WHERE cst.case_id = p_case_id
    AND cst.time_spent_hours IS NOT NULL;
    
    -- Calculate compliance percentage
    IF total_sla_count > 0 THEN
        SET sla_compliance = (sla_met_count * 100.0) / total_sla_count;
    ELSE
        SET sla_compliance = 100.0;
    END IF;
    
    -- Insert or update performance metrics
    INSERT INTO case_performance_metrics (
        case_id,
        total_cycle_time_hours,
        sla_compliance_percentage,
        calculated_at
    ) VALUES (
        p_case_id,
        total_hours,
        sla_compliance,
        NOW()
    ) ON DUPLICATE KEY UPDATE
        total_cycle_time_hours = total_hours,
        sla_compliance_percentage = sla_compliance,
        calculated_at = NOW();
        
END//
DELIMITER ;

-- Trigger to calculate metrics when case is closed
DELIMITER //
CREATE TRIGGER calculate_metrics_on_close
AFTER UPDATE ON cases
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        CALL CalculateCaseMetrics(NEW.id);
    END IF;
END//
DELIMITER ;

-- Create indexes for better performance
CREATE INDEX idx_notification_queue_processing ON notification_queue(status, scheduled_at);
CREATE INDEX idx_cases_sla_monitoring ON cases(status, is_sla_breached, expected_state_completion);
CREATE INDEX idx_escalation_monitoring ON case_escalations(case_id, triggered_at);

-- View for notification dashboard
CREATE VIEW notification_dashboard AS
SELECT 
    DATE(nq.created_at) as notification_date,
    nt.template_type,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN nq.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
    SUM(CASE WHEN nq.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    SUM(CASE WHEN nq.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    AVG(TIMESTAMPDIFF(MINUTE, nq.created_at, nq.sent_at)) as avg_delivery_time_minutes
FROM notification_queue nq
JOIN notification_templates nt ON nq.template_id = nt.id
WHERE nq.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(nq.created_at), nt.template_type
ORDER BY notification_date DESC, template_type;

COMMIT;