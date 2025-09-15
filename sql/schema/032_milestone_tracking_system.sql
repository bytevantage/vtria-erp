-- Milestone Tracking System with Dependencies and Project Breakdown
-- File: 032_milestone_tracking_system.sql
-- Implements comprehensive project milestone management with dependencies

-- Project templates for different types of work
CREATE TABLE project_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    template_type ENUM('engineering', 'manufacturing', 'installation', 'service', 'custom') NOT NULL,
    description TEXT,
    
    -- Template configuration
    default_duration_days INT NOT NULL DEFAULT 30,
    complexity_level ENUM('simple', 'medium', 'complex', 'critical') DEFAULT 'medium',
    required_roles JSON NULL COMMENT 'Roles needed for this project type',
    estimated_cost_range VARCHAR(50) NULL,
    
    -- Milestone configuration
    auto_create_milestones BOOLEAN DEFAULT TRUE,
    milestone_count INT DEFAULT 5,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_template_type (template_type),
    INDEX idx_active (is_active)
) COMMENT='Reusable project templates with predefined milestones';

-- Milestone definitions linked to templates
CREATE TABLE milestone_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    milestone_name VARCHAR(100) NOT NULL,
    sequence_order INT NOT NULL,
    
    -- Milestone characteristics
    milestone_type ENUM('planning', 'approval', 'execution', 'review', 'delivery', 'payment') NOT NULL,
    is_critical_path BOOLEAN DEFAULT FALSE,
    is_client_milestone BOOLEAN DEFAULT FALSE,
    requires_client_approval BOOLEAN DEFAULT FALSE,
    
    -- Timing
    start_offset_days INT DEFAULT 0 COMMENT 'Days from project start',
    duration_days INT NOT NULL DEFAULT 1,
    buffer_days INT DEFAULT 0 COMMENT 'Buffer time for this milestone',
    
    -- Dependencies
    depends_on_milestones JSON NULL COMMENT 'Array of prerequisite milestone IDs',
    blocking_conditions JSON NULL COMMENT 'Conditions that could block this milestone',
    
    -- Resources
    required_roles JSON NULL COMMENT 'Roles required for this milestone',
    estimated_hours DECIMAL(8,2) NULL,
    deliverables JSON NULL COMMENT 'Expected deliverables',
    
    -- Automation
    auto_start BOOLEAN DEFAULT FALSE COMMENT 'Start automatically when dependencies met',
    auto_complete_conditions JSON NULL COMMENT 'Conditions for auto-completion',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE,
    
    INDEX idx_template_sequence (template_id, sequence_order),
    INDEX idx_milestone_type (milestone_type),
    INDEX idx_critical_path (is_critical_path)
) COMMENT='Milestone definitions within project templates';

-- Actual project milestones for cases
CREATE TABLE case_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    milestone_template_id INT NULL COMMENT 'Reference to template if created from template',
    
    -- Milestone identification
    milestone_name VARCHAR(100) NOT NULL,
    milestone_code VARCHAR(20) NULL COMMENT 'Short code for reference',
    sequence_order INT NOT NULL,
    
    -- Status and progress
    status ENUM('not_started', 'in_progress', 'completed', 'cancelled', 'on_hold', 'blocked') DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_critical_path BOOLEAN DEFAULT FALSE,
    
    -- Timing
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE NULL,
    actual_end_date DATE NULL,
    estimated_hours DECIMAL(8,2) NULL,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    
    -- Dependencies
    depends_on_milestones JSON NULL COMMENT 'IDs of prerequisite milestones',
    blocks_milestones JSON NULL COMMENT 'IDs of milestones this blocks',
    dependency_status ENUM('waiting', 'ready', 'blocked') DEFAULT 'waiting',
    
    -- Assignment and resources
    assigned_to INT NULL COMMENT 'Primary responsible person',
    assigned_team JSON NULL COMMENT 'Team members involved',
    required_roles JSON NULL COMMENT 'Roles needed',
    
    -- Client interaction
    is_client_milestone BOOLEAN DEFAULT FALSE,
    requires_client_approval BOOLEAN DEFAULT FALSE,
    client_approved_at TIMESTAMP NULL,
    client_approved_by VARCHAR(100) NULL,
    client_feedback TEXT NULL,
    
    -- Deliverables and documentation
    deliverables JSON NULL COMMENT 'Expected outputs',
    completion_criteria TEXT NULL,
    notes TEXT NULL,
    
    -- Quality and compliance
    quality_check_required BOOLEAN DEFAULT FALSE,
    quality_approved BOOLEAN DEFAULT FALSE,
    quality_approved_by INT NULL,
    quality_notes TEXT NULL,
    
    -- Alerts and monitoring
    sla_hours DECIMAL(8,2) NULL COMMENT 'SLA for this milestone',
    is_sla_breached BOOLEAN DEFAULT FALSE,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    risk_description TEXT NULL,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_template_id) REFERENCES milestone_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (quality_approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_case_milestones (case_id, sequence_order),
    INDEX idx_milestone_status (status),
    INDEX idx_assigned_milestones (assigned_to),
    INDEX idx_client_milestones (is_client_milestone),
    INDEX idx_critical_path (is_critical_path),
    INDEX idx_planned_dates (planned_start_date, planned_end_date),
    INDEX idx_sla_monitoring (is_sla_breached, planned_end_date)
) COMMENT='Actual milestones for specific cases with tracking';

-- Milestone activities and updates
CREATE TABLE milestone_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL,
    
    -- Activity details
    activity_type ENUM('created', 'started', 'progress_update', 'completed', 'approved', 'blocked', 'cancelled', 'note_added') NOT NULL,
    description TEXT NULL,
    progress_change DECIMAL(5,2) NULL COMMENT 'Change in progress percentage',
    hours_logged DECIMAL(8,2) NULL COMMENT 'Hours worked in this activity',
    
    -- Timing
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    planned_completion_date DATE NULL COMMENT 'Updated planned completion if changed',
    
    -- User and context
    created_by INT NOT NULL,
    notes TEXT NULL,
    attachments JSON NULL COMMENT 'File attachments related to this activity',
    
    -- Client visibility
    is_client_visible BOOLEAN DEFAULT FALSE,
    client_notification_sent BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_milestone_activities (milestone_id, activity_date),
    INDEX idx_activity_type (activity_type),
    INDEX idx_client_visible (is_client_visible)
) COMMENT='Activity log for milestone updates and progress tracking';

-- Milestone dependencies tracking
CREATE TABLE milestone_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL COMMENT 'Dependent milestone',
    depends_on_milestone_id INT NOT NULL COMMENT 'Prerequisite milestone',
    
    -- Dependency type and rules
    dependency_type ENUM('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish') DEFAULT 'finish_to_start',
    lag_days INT DEFAULT 0 COMMENT 'Days delay after prerequisite completes',
    is_hard_dependency BOOLEAN DEFAULT TRUE COMMENT 'Whether this blocks progress',
    
    -- Status tracking
    is_satisfied BOOLEAN DEFAULT FALSE,
    satisfied_at TIMESTAMP NULL,
    override_reason TEXT NULL COMMENT 'Reason if dependency was overridden',
    overridden_by INT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (overridden_by) REFERENCES users(id),
    
    UNIQUE KEY unique_dependency (milestone_id, depends_on_milestone_id),
    INDEX idx_dependencies (depends_on_milestone_id),
    INDEX idx_unsatisfied (is_satisfied, milestone_id)
) COMMENT='Tracks dependencies between milestones';

-- Resource allocation for milestones
CREATE TABLE milestone_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL,
    
    -- Resource identification
    resource_type ENUM('user', 'equipment', 'material', 'vendor', 'facility') NOT NULL,
    resource_id INT NULL COMMENT 'ID in respective resource table',
    resource_name VARCHAR(100) NOT NULL,
    
    -- Allocation details
    allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE NULL,
    actual_end_date DATE NULL,
    
    -- Cost tracking
    estimated_cost DECIMAL(12,2) NULL,
    actual_cost DECIMAL(12,2) NULL,
    cost_center VARCHAR(50) NULL,
    
    -- Status
    allocation_status ENUM('planned', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'planned',
    notes TEXT NULL,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_milestone_resources (milestone_id),
    INDEX idx_resource_allocation (resource_type, resource_id),
    INDEX idx_allocation_dates (planned_start_date, planned_end_date)
) COMMENT='Resource allocation and cost tracking for milestones';

-- Insert default project templates
INSERT INTO project_templates 
(template_name, template_type, description, default_duration_days, complexity_level, required_roles, milestone_count) VALUES

('Standard Engineering Project', 'engineering', 'Standard engineering design and development project', 45, 'medium', '["engineer", "manager"]', 6),
('Complex Manufacturing Project', 'manufacturing', 'Multi-stage manufacturing with quality control', 60, 'complex', '["engineer", "production_manager", "quality_inspector"]', 8),
('Equipment Installation', 'installation', 'On-site equipment installation and commissioning', 15, 'medium', '["technician", "engineer"]', 4),
('Service and Maintenance', 'service', 'Regular service or maintenance work', 7, 'simple', '["technician"]', 3),
('Custom Solution Development', 'custom', 'Fully customized engineering solution', 90, 'critical', '["senior_engineer", "manager", "director"]', 10);

-- Insert milestone templates for Standard Engineering Project
INSERT INTO milestone_templates 
(template_id, milestone_name, sequence_order, milestone_type, is_critical_path, is_client_milestone, start_offset_days, duration_days, required_roles, estimated_hours, requires_client_approval) VALUES

-- Standard Engineering Project milestones
(1, 'Project Initiation & Requirements', 1, 'planning', TRUE, TRUE, 0, 3, '["engineer", "manager"]', 24, FALSE),
(1, 'Preliminary Design', 2, 'execution', TRUE, TRUE, 3, 7, '["engineer"]', 56, FALSE),
(1, 'Design Review & Approval', 3, 'approval', TRUE, TRUE, 10, 3, '["manager"]', 12, TRUE),
(1, 'Detailed Engineering', 4, 'execution', TRUE, FALSE, 13, 15, '["engineer"]', 120, FALSE),
(1, 'Prototype & Testing', 5, 'execution', TRUE, TRUE, 28, 10, '["engineer", "technician"]', 80, FALSE),
(1, 'Final Delivery & Documentation', 6, 'delivery', TRUE, TRUE, 38, 7, '["engineer"]', 40, TRUE),

-- Equipment Installation milestones
(3, 'Site Survey & Planning', 1, 'planning', TRUE, TRUE, 0, 2, '["technician", "engineer"]', 16, FALSE),
(3, 'Equipment Delivery', 2, 'execution', TRUE, TRUE, 2, 1, '["technician"]', 8, FALSE),
(3, 'Installation & Setup', 3, 'execution', TRUE, FALSE, 3, 5, '["technician", "engineer"]', 40, FALSE),
(3, 'Testing & Commissioning', 4, 'delivery', TRUE, TRUE, 8, 7, '["engineer"]', 32, TRUE);

-- Create views for milestone analytics
CREATE VIEW milestone_progress_summary AS
SELECT 
    c.id as case_id,
    c.case_number,
    c.project_name,
    cl.name as client_name,
    COUNT(cm.id) as total_milestones,
    SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_milestones,
    SUM(CASE WHEN cm.status = 'in_progress' THEN 1 ELSE 0 END) as active_milestones,
    SUM(CASE WHEN cm.status = 'blocked' THEN 1 ELSE 0 END) as blocked_milestones,
    AVG(cm.progress_percentage) as overall_progress,
    
    -- Critical path analysis
    COUNT(CASE WHEN cm.is_critical_path = TRUE THEN 1 END) as critical_milestones,
    MIN(CASE WHEN cm.is_critical_path = TRUE AND cm.status != 'completed' THEN cm.planned_end_date END) as next_critical_deadline,
    
    -- Client milestones
    COUNT(CASE WHEN cm.is_client_milestone = TRUE THEN 1 END) as client_milestones,
    SUM(CASE WHEN cm.is_client_milestone = TRUE AND cm.requires_client_approval = TRUE AND cm.client_approved_at IS NULL THEN 1 ELSE 0 END) as pending_client_approvals,
    
    -- Timeline analysis
    MIN(cm.planned_start_date) as project_start_date,
    MAX(cm.planned_end_date) as project_end_date,
    SUM(CASE WHEN cm.is_sla_breached = TRUE THEN 1 ELSE 0 END) as breached_milestones
    
FROM cases c
LEFT JOIN case_milestones cm ON c.id = cm.case_id
LEFT JOIN clients cl ON c.client_id = cl.id
WHERE c.status = 'active'
GROUP BY c.id, c.case_number, c.project_name, cl.name;

-- Create view for resource utilization
CREATE VIEW milestone_resource_utilization AS
SELECT 
    mr.resource_type,
    mr.resource_name,
    COUNT(DISTINCT mr.milestone_id) as assigned_milestones,
    SUM(mr.allocation_percentage) as total_allocation_percentage,
    AVG(mr.allocation_percentage) as avg_allocation_percentage,
    MIN(mr.planned_start_date) as earliest_assignment,
    MAX(mr.planned_end_date) as latest_assignment,
    SUM(mr.estimated_cost) as total_estimated_cost,
    SUM(mr.actual_cost) as total_actual_cost
FROM milestone_resources mr
JOIN case_milestones cm ON mr.milestone_id = cm.id
WHERE mr.allocation_status IN ('confirmed', 'active')
GROUP BY mr.resource_type, mr.resource_name
ORDER BY total_allocation_percentage DESC;

-- Stored procedure to create milestones from template
DELIMITER //
CREATE PROCEDURE CreateMilestonesFromTemplate(
    IN p_case_id INT,
    IN p_template_id INT,
    IN p_project_start_date DATE,
    IN p_created_by INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE template_milestone_id INT;
    DECLARE milestone_name_val VARCHAR(100);
    DECLARE sequence_order_val INT;
    DECLARE milestone_type_val ENUM('planning', 'approval', 'execution', 'review', 'delivery', 'payment');
    DECLARE is_critical_path_val BOOLEAN;
    DECLARE is_client_milestone_val BOOLEAN;
    DECLARE requires_client_approval_val BOOLEAN;
    DECLARE start_offset_days_val INT;
    DECLARE duration_days_val INT;
    DECLARE required_roles_val JSON;
    DECLARE estimated_hours_val DECIMAL(8,2);
    
    -- Cursor for milestone templates
    DECLARE milestone_cursor CURSOR FOR 
        SELECT 
            id, milestone_name, sequence_order, milestone_type, is_critical_path,
            is_client_milestone, requires_client_approval, start_offset_days, 
            duration_days, required_roles, estimated_hours
        FROM milestone_templates 
        WHERE template_id = p_template_id
        ORDER BY sequence_order;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN milestone_cursor;
    
    milestone_loop: LOOP
        FETCH milestone_cursor INTO 
            template_milestone_id, milestone_name_val, sequence_order_val, milestone_type_val,
            is_critical_path_val, is_client_milestone_val, requires_client_approval_val,
            start_offset_days_val, duration_days_val, required_roles_val, estimated_hours_val;
        
        IF done THEN
            LEAVE milestone_loop;
        END IF;
        
        -- Create milestone for case
        INSERT INTO case_milestones (
            case_id, milestone_template_id, milestone_name, sequence_order,
            milestone_type, is_critical_path, is_client_milestone, requires_client_approval,
            planned_start_date, planned_end_date, required_roles, estimated_hours,
            created_by
        ) VALUES (
            p_case_id, template_milestone_id, milestone_name_val, sequence_order_val,
            milestone_type_val, is_critical_path_val, is_client_milestone_val, requires_client_approval_val,
            DATE_ADD(p_project_start_date, INTERVAL start_offset_days_val DAY),
            DATE_ADD(p_project_start_date, INTERVAL (start_offset_days_val + duration_days_val) DAY),
            required_roles_val, estimated_hours_val, p_created_by
        );
        
    END LOOP;
    
    CLOSE milestone_cursor;
    
    -- Create dependencies based on sequence
    INSERT INTO milestone_dependencies (milestone_id, depends_on_milestone_id, dependency_type)
    SELECT 
        cm2.id as milestone_id,
        cm1.id as depends_on_milestone_id,
        'finish_to_start'
    FROM case_milestones cm1
    JOIN case_milestones cm2 ON (
        cm1.case_id = cm2.case_id 
        AND cm1.sequence_order = cm2.sequence_order - 1
    )
    WHERE cm1.case_id = p_case_id
    AND cm1.sequence_order > 1;
    
END//
DELIMITER ;

COMMIT;