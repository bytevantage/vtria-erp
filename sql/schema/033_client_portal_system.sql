-- Client Portal System with Real-time Case Tracking
-- File: 033_client_portal_system.sql
-- Provides clients with dedicated portal access for project tracking

-- Client portal access management
CREATE TABLE client_portal_access (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    portal_user_email VARCHAR(255) NOT NULL,
    portal_user_name VARCHAR(100) NOT NULL,
    access_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Access configuration
    access_level ENUM('view_only', 'interactive', 'collaborative') DEFAULT 'view_only',
    can_approve_milestones BOOLEAN DEFAULT FALSE,
    can_add_comments BOOLEAN DEFAULT TRUE,
    can_upload_files BOOLEAN DEFAULT FALSE,
    can_view_costs BOOLEAN DEFAULT FALSE,
    
    -- Session management
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    
    -- Password for portal (separate from main system)
    portal_password_hash VARCHAR(255) NULL,
    password_reset_token VARCHAR(255) NULL,
    password_reset_expires TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_client_id (client_id),
    INDEX idx_access_token (access_token),
    INDEX idx_portal_email (portal_user_email),
    UNIQUE KEY uk_client_email (client_id, portal_user_email)
) COMMENT='Client portal access management with role-based permissions';

-- Client communications and feedback
CREATE TABLE client_communications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    milestone_id INT NULL,
    client_portal_user_id INT NULL,
    internal_user_id INT NULL,
    
    -- Communication details
    communication_type ENUM('comment', 'query', 'approval_request', 'approval_response', 'file_upload', 'system_update', 'milestone_update') NOT NULL,
    subject VARCHAR(200) NULL,
    message TEXT NOT NULL,
    
    -- Metadata
    is_from_client BOOLEAN DEFAULT FALSE,
    requires_response BOOLEAN DEFAULT FALSE,
    response_deadline TIMESTAMP NULL,
    parent_communication_id INT NULL COMMENT 'For threaded conversations',
    
    -- File attachments
    attachment_path VARCHAR(500) NULL,
    attachment_filename VARCHAR(255) NULL,
    attachment_size INT NULL,
    
    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL,
    
    -- Client visibility
    visible_to_client BOOLEAN DEFAULT TRUE,
    client_priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (client_portal_user_id) REFERENCES client_portal_access(id) ON DELETE SET NULL,
    FOREIGN KEY (internal_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_communication_id) REFERENCES client_communications(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_case_id (case_id),
    INDEX idx_milestone_id (milestone_id),
    INDEX idx_communication_type (communication_type),
    INDEX idx_is_from_client (is_from_client),
    INDEX idx_requires_response (requires_response),
    INDEX idx_created_at (created_at),
    INDEX idx_client_visible (visible_to_client)
) COMMENT='Client-internal team communications with threaded conversations';

-- Client portal preferences and customization
CREATE TABLE client_portal_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_portal_user_id INT NOT NULL,
    
    -- Notification preferences
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    milestone_update_notifications BOOLEAN DEFAULT TRUE,
    daily_summary_enabled BOOLEAN DEFAULT FALSE,
    weekly_report_enabled BOOLEAN DEFAULT TRUE,
    
    -- Dashboard preferences
    preferred_view ENUM('timeline', 'milestone_list', 'gantt_chart', 'summary') DEFAULT 'timeline',
    show_costs BOOLEAN DEFAULT FALSE,
    show_technical_details BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    
    -- Communication preferences
    auto_subscribe_to_milestones BOOLEAN DEFAULT TRUE,
    receive_system_updates BOOLEAN DEFAULT TRUE,
    preferred_communication_method ENUM('email', 'portal', 'both') DEFAULT 'both',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_portal_user_id) REFERENCES client_portal_access(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_preferences (client_portal_user_id)
) COMMENT='Client portal user preferences and customization settings';

-- Client document sharing and approvals
CREATE TABLE client_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    milestone_id INT NULL,
    uploaded_by_client_user_id INT NULL,
    uploaded_by_internal_user_id INT NULL,
    
    -- Document details
    document_name VARCHAR(255) NOT NULL,
    document_type ENUM('requirement', 'specification', 'drawing', 'approval', 'contract', 'invoice', 'report', 'photo', 'other') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- Document metadata
    version VARCHAR(20) DEFAULT '1.0',
    description TEXT NULL,
    is_confidential BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    
    -- Approval workflow
    approval_status ENUM('pending', 'approved', 'rejected', 'needs_revision') NULL,
    approved_by INT NULL,
    approval_date TIMESTAMP NULL,
    approval_comments TEXT NULL,
    
    -- Access control
    visible_to_client BOOLEAN DEFAULT TRUE,
    client_can_download BOOLEAN DEFAULT TRUE,
    internal_only BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by_client_user_id) REFERENCES client_portal_access(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by_internal_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_case_id (case_id),
    INDEX idx_milestone_id (milestone_id),
    INDEX idx_document_type (document_type),
    INDEX idx_approval_status (approval_status),
    INDEX idx_visible_to_client (visible_to_client),
    INDEX idx_created_at (created_at)
) COMMENT='Client document sharing with approval workflows';

-- Real-time notifications for client portal
CREATE TABLE client_portal_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_portal_user_id INT NOT NULL,
    case_id INT NULL,
    milestone_id INT NULL,
    communication_id INT NULL,
    
    -- Notification details
    notification_type ENUM('milestone_update', 'new_message', 'approval_request', 'document_shared', 'case_update', 'system_alert') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- Delivery tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    
    -- Action links
    action_url VARCHAR(500) NULL,
    action_text VARCHAR(100) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_portal_user_id) REFERENCES client_portal_access(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    FOREIGN KEY (milestone_id) REFERENCES case_milestones(id) ON DELETE SET NULL,
    FOREIGN KEY (communication_id) REFERENCES client_communications(id) ON DELETE SET NULL,
    
    INDEX idx_client_portal_user_id (client_portal_user_id),
    INDEX idx_case_id (case_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) COMMENT='Real-time notifications for client portal users';

-- Client portal analytics and usage tracking
CREATE TABLE client_portal_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_portal_user_id INT NOT NULL,
    case_id INT NULL,
    
    -- Session tracking
    session_id VARCHAR(255) NOT NULL,
    page_visited VARCHAR(200) NOT NULL,
    action_performed VARCHAR(100) NULL,
    time_spent_seconds INT DEFAULT 0,
    
    -- Engagement metrics
    milestone_views INT DEFAULT 0,
    document_downloads INT DEFAULT 0,
    comments_posted INT DEFAULT 0,
    approvals_given INT DEFAULT 0,
    
    -- Technical details
    user_agent TEXT NULL,
    ip_address VARCHAR(45) NULL,
    device_type ENUM('desktop', 'tablet', 'mobile') NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_portal_user_id) REFERENCES client_portal_access(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL,
    
    INDEX idx_client_portal_user_id (client_portal_user_id),
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
) COMMENT='Client portal usage analytics and engagement tracking';

-- Insert default client portal access for existing clients
INSERT INTO client_portal_access (
    client_id, 
    portal_user_email, 
    portal_user_name, 
    access_token,
    access_level,
    can_approve_milestones,
    can_view_costs
)
SELECT 
    c.id,
    c.email,
    c.contact_person,
    MD5(CONCAT(c.id, c.email, NOW())),
    'interactive',
    TRUE,
    FALSE
FROM clients c
WHERE c.email IS NOT NULL 
AND c.email != ''
LIMIT 10; -- Limit to first 10 clients for testing

-- Create view for client portal dashboard data
CREATE VIEW client_portal_dashboard AS
SELECT 
    cpa.id as portal_user_id,
    cpa.client_id,
    cpa.portal_user_name,
    c.company_name as client_name,
    
    -- Case summary
    COUNT(DISTINCT cases.id) as total_cases,
    COUNT(DISTINCT CASE WHEN cases.status = 'active' THEN cases.id END) as active_cases,
    COUNT(DISTINCT CASE WHEN cases.status = 'completed' THEN cases.id END) as completed_cases,
    
    -- Milestone summary
    COUNT(DISTINCT cm.id) as total_milestones,
    COUNT(DISTINCT CASE WHEN cm.status = 'completed' THEN cm.id END) as completed_milestones,
    COUNT(DISTINCT CASE WHEN cm.status = 'in_progress' THEN cm.id END) as in_progress_milestones,
    COUNT(DISTINCT CASE WHEN cm.requires_client_approval = TRUE AND cm.client_approval_received = FALSE THEN cm.id END) as pending_approvals,
    
    -- Communication summary
    COUNT(DISTINCT cc.id) as total_communications,
    COUNT(DISTINCT CASE WHEN cc.requires_response = TRUE AND cc.is_resolved = FALSE THEN cc.id END) as pending_responses,
    
    -- Recent activity
    MAX(cm.updated_at) as last_milestone_update,
    MAX(cc.created_at) as last_communication,
    
    cpa.last_login_at,
    cpa.created_at as portal_access_created
    
FROM client_portal_access cpa
JOIN clients c ON cpa.client_id = c.id
LEFT JOIN cases ON c.id = cases.client_id
LEFT JOIN case_milestones cm ON cases.id = cm.case_id
LEFT JOIN client_communications cc ON cases.id = cc.case_id
WHERE cpa.is_active = TRUE
GROUP BY cpa.id, cpa.client_id, cpa.portal_user_name, c.company_name, cpa.last_login_at, cpa.created_at;

-- Create stored procedure for client notification generation
DELIMITER //
CREATE PROCEDURE CreateClientNotification(
    IN p_client_portal_user_id INT,
    IN p_case_id INT,
    IN p_milestone_id INT,
    IN p_notification_type VARCHAR(50),
    IN p_title VARCHAR(200),
    IN p_message TEXT,
    IN p_priority VARCHAR(10),
    IN p_action_url VARCHAR(500)
)
BEGIN
    -- Insert notification
    INSERT INTO client_portal_notifications (
        client_portal_user_id,
        case_id,
        milestone_id,
        notification_type,
        title,
        message,
        priority,
        action_url
    ) VALUES (
        p_client_portal_user_id,
        p_case_id,
        p_milestone_id,
        p_notification_type,
        p_title,
        p_message,
        p_priority,
        p_action_url
    );
    
    -- Update notification preferences if email enabled
    UPDATE client_portal_preferences cpp
    JOIN client_portal_access cpa ON cpp.client_portal_user_id = cpa.id
    SET cpp.updated_at = NOW()
    WHERE cpa.id = p_client_portal_user_id
    AND cpp.email_notifications_enabled = TRUE;
    
END//
DELIMITER ;

-- Create trigger for automatic client notifications on milestone updates
DELIMITER //
CREATE TRIGGER client_milestone_notification_trigger
    AFTER UPDATE ON case_milestones
    FOR EACH ROW
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_portal_user_id INT;
    DECLARE v_client_id INT;
    DECLARE v_case_number VARCHAR(50);
    
    DECLARE client_cursor CURSOR FOR
        SELECT cpa.id, c.id, cases.case_number
        FROM client_portal_access cpa
        JOIN clients c ON cpa.client_id = c.id
        JOIN cases ON c.id = cases.client_id
        WHERE cases.id = NEW.case_id
        AND cpa.is_active = TRUE;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Only trigger for status or progress changes
    IF OLD.status != NEW.status OR OLD.progress_percentage != NEW.progress_percentage THEN
        
        OPEN client_cursor;
        
        notification_loop: LOOP
            FETCH client_cursor INTO v_portal_user_id, v_client_id, v_case_number;
            
            IF done THEN
                LEAVE notification_loop;
            END IF;
            
            -- Create notification based on change type
            IF OLD.status != NEW.status THEN
                CALL CreateClientNotification(
                    v_portal_user_id,
                    NEW.case_id,
                    NEW.id,
                    'milestone_update',
                    CONCAT('Milestone Status Updated: ', NEW.milestone_name),
                    CONCAT('Milestone "', NEW.milestone_name, '" status changed from ', OLD.status, ' to ', NEW.status),
                    'medium',
                    CONCAT('/portal/cases/', v_case_number, '/milestones/', NEW.id)
                );
            END IF;
            
            IF OLD.progress_percentage != NEW.progress_percentage THEN
                CALL CreateClientNotification(
                    v_portal_user_id,
                    NEW.case_id,
                    NEW.id,
                    'milestone_update',
                    CONCAT('Progress Update: ', NEW.milestone_name),
                    CONCAT('Milestone "', NEW.milestone_name, '" progress updated to ', NEW.progress_percentage, '%'),
                    'low',
                    CONCAT('/portal/cases/', v_case_number, '/milestones/', NEW.id)
                );
            END IF;
            
        END LOOP;
        
        CLOSE client_cursor;
    END IF;
END//
DELIMITER ;