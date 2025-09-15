-- Triggers for automatic workflow management

-- Trigger to automatically update SLA breach status
DELIMITER //
CREATE TRIGGER update_case_sla_status 
BEFORE UPDATE ON cases
FOR EACH ROW
BEGIN
    -- Update SLA breach status if expected completion time has passed
    IF NEW.expected_state_completion IS NOT NULL AND NEW.expected_state_completion < NOW() THEN
        SET NEW.is_sla_breached = TRUE;
    END IF;
    
    -- Update last activity timestamp
    SET NEW.last_activity_at = CURRENT_TIMESTAMP;
END//
DELIMITER ;

-- Trigger to set initial sub-state when case is created
DELIMITER //
CREATE TRIGGER set_initial_substate 
BEFORE INSERT ON cases
FOR EACH ROW
BEGIN
    DECLARE sla_hours_val DECIMAL(8,2) DEFAULT 24.00;
    
    -- Set initial sub-state based on current_state
    IF NEW.sub_state IS NULL THEN
        CASE NEW.current_state
            WHEN 'enquiry' THEN SET NEW.sub_state = 'received';
            WHEN 'estimation' THEN SET NEW.sub_state = 'assigned';
            WHEN 'quotation' THEN SET NEW.sub_state = 'draft';
            WHEN 'order' THEN SET NEW.sub_state = 'po_received';
            WHEN 'production' THEN SET NEW.sub_state = 'planning';
            WHEN 'delivery' THEN SET NEW.sub_state = 'packaging';
            WHEN 'closed' THEN SET NEW.sub_state = 'completed';
        END CASE;
    END IF;
    
    -- Set initial workflow step
    IF NEW.workflow_step IS NULL THEN
        SET NEW.workflow_step = 1;
    END IF;
    
    -- Set state entry time
    SET NEW.state_entered_at = CURRENT_TIMESTAMP;
    SET NEW.last_activity_at = CURRENT_TIMESTAMP;
    
    -- Calculate expected completion time based on SLA
    SELECT sla_hours INTO sla_hours_val 
    FROM case_workflow_definitions 
    WHERE state_name = NEW.current_state AND sub_state_name = NEW.sub_state
    LIMIT 1;
    
    IF sla_hours_val IS NOT NULL THEN
        SET NEW.sla_hours_for_state = sla_hours_val;
        SET NEW.expected_state_completion = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL sla_hours_val HOUR);
    END IF;
END//
DELIMITER ;

-- Trigger to log sub-state transitions
DELIMITER //
CREATE TRIGGER log_substate_transition 
AFTER UPDATE ON cases
FOR EACH ROW
BEGIN
    -- Log transition if state or sub_state changed
    IF OLD.current_state != NEW.current_state OR OLD.sub_state != NEW.sub_state THEN
        INSERT INTO case_substate_transitions (
            case_id,
            from_state,
            from_sub_state,
            to_state,
            to_sub_state,
            transition_type,
            time_spent_hours,
            created_by,
            created_at
        ) VALUES (
            NEW.id,
            OLD.current_state,
            OLD.sub_state,
            NEW.current_state,
            NEW.sub_state,
            'manual',
            TIMESTAMPDIFF(HOUR, OLD.state_entered_at, NOW()),
            NEW.assigned_to,
            NOW()
        );
    END IF;
END//
DELIMITER ;

-- Stored procedure to transition case to next sub-state
DELIMITER //
CREATE PROCEDURE TransitionCaseSubState(
    IN p_case_id INT,
    IN p_transition_notes TEXT,
    IN p_created_by INT
)
BEGIN
    DECLARE current_state_val ENUM('enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed');
    DECLARE current_sub_state_val VARCHAR(50);
    DECLARE current_step_val INT;
    DECLARE next_sub_state_val VARCHAR(50);
    DECLARE next_step_val INT;
    DECLARE next_sla_hours DECIMAL(8,2);
    DECLARE requires_approval_val BOOLEAN;
    DECLARE approval_role_val VARCHAR(50);
    
    -- Get current case state
    SELECT current_state, sub_state, workflow_step 
    INTO current_state_val, current_sub_state_val, current_step_val
    FROM cases WHERE id = p_case_id;
    
    -- Find next sub-state in workflow
    SELECT sub_state_name, step_order, sla_hours, requires_approval, approval_role
    INTO next_sub_state_val, next_step_val, next_sla_hours, requires_approval_val, approval_role_val
    FROM case_workflow_definitions 
    WHERE state_name = current_state_val AND step_order = current_step_val + 1
    LIMIT 1;
    
    -- If no next sub-state in current state, check if we need to move to next main state
    IF next_sub_state_val IS NULL THEN
        -- Logic to move to next main state would go here
        -- For now, we'll just mark as ready for manual transition
        UPDATE cases SET 
            can_proceed = FALSE,
            blocking_reason = 'Ready for next state transition',
            last_activity_at = NOW()
        WHERE id = p_case_id;
    ELSE
        -- Update case to next sub-state
        UPDATE cases SET
            sub_state = next_sub_state_val,
            workflow_step = next_step_val,
            state_entered_at = NOW(),
            expected_state_completion = DATE_ADD(NOW(), INTERVAL next_sla_hours HOUR),
            sla_hours_for_state = next_sla_hours,
            requires_approval = requires_approval_val,
            is_sla_breached = FALSE,
            last_activity_at = NOW()
        WHERE id = p_case_id;
        
        -- Log the transition
        INSERT INTO case_substate_transitions (
            case_id, from_state, from_sub_state, to_state, to_sub_state,
            transition_type, notes, created_by
        ) VALUES (
            p_case_id, current_state_val, current_sub_state_val, 
            current_state_val, next_sub_state_val,
            'manual', p_transition_notes, p_created_by
        );
    END IF;
    
END//
DELIMITER ;

-- Stored procedure to get SLA breach alerts
DELIMITER //
CREATE PROCEDURE GetSLABreachAlerts()
BEGIN
    SELECT 
        c.id,
        c.case_number,
        c.current_state,
        c.sub_state,
        cwd.display_name,
        c.expected_state_completion,
        TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) as hours_until_breach,
        c.assigned_to,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        cl.name as client_name,
        c.project_name,
        CASE 
            WHEN c.is_sla_breached THEN 'BREACHED'
            WHEN TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 2 THEN 'CRITICAL'
            WHEN TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 4 THEN 'WARNING'
            ELSE 'NORMAL'
        END as alert_level
    FROM cases c
    LEFT JOIN case_workflow_definitions cwd ON (
        cwd.state_name = c.current_state 
        AND cwd.sub_state_name = c.sub_state
    )
    LEFT JOIN users u ON u.id = c.assigned_to
    LEFT JOIN clients cl ON cl.id = c.client_id
    WHERE c.status = 'active' 
    AND (
        c.is_sla_breached = TRUE 
        OR c.expected_state_completion <= DATE_ADD(NOW(), INTERVAL 4 HOUR)
    )
    ORDER BY c.expected_state_completion ASC;
END//
DELIMITER ;

COMMIT;