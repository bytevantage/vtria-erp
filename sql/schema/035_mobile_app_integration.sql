-- Mobile App Integration Schema
-- This file contains all tables and configurations needed for mobile app support

-- Mobile devices table for tracking user devices
CREATE TABLE mobile_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL COMMENT 'Unique device identifier',
    device_type ENUM('ios', 'android', 'tablet') NOT NULL,
    device_name VARCHAR(100) NULL COMMENT 'User-friendly device name',
    os_version VARCHAR(50) NULL,
    app_version VARCHAR(20) NULL,
    push_token TEXT NULL COMMENT 'Firebase/APNS push notification token',
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP NULL,
    location_lat DECIMAL(10, 8) NULL,
    location_lng DECIMAL(11, 8) NULL,
    location_updated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_device (user_id, device_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_push_token (push_token(255)),
    INDEX idx_last_active (last_active)
) COMMENT='Mobile devices registered for push notifications and tracking';

-- Mobile app sessions for analytics and security
CREATE TABLE mobile_app_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    app_version VARCHAR(20) NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_id),
    INDEX idx_session_token (session_token),
    INDEX idx_active_sessions (is_active, last_activity)
) COMMENT='Mobile app session tracking for security and analytics';

-- Mobile app sync status for offline capability
CREATE TABLE mobile_sync_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    entity_type ENUM('cases', 'milestones', 'notifications', 'clients', 'tasks') NOT NULL,
    last_sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_version BIGINT DEFAULT 1,
    pending_uploads INT DEFAULT 0,
    failed_syncs INT DEFAULT 0,
    last_error TEXT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_device_entity (user_id, device_id, entity_type),
    INDEX idx_last_sync (last_sync_timestamp),
    INDEX idx_pending_uploads (pending_uploads)
) COMMENT='Track sync status for offline mobile app functionality';

-- Mobile app configurations
CREATE TABLE mobile_app_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_config_key (config_key),
    INDEX idx_active (is_active)
) COMMENT='Mobile app configuration settings';

-- Insert default mobile app configurations
INSERT INTO mobile_app_config (config_key, config_value, description) VALUES
('push_notifications', '{"enabled": true, "sound": true, "badge": true, "alert": true}', 'Default push notification settings'),
('offline_mode', '{"enabled": true, "max_offline_hours": 72, "sync_interval_seconds": 300}', 'Offline mode configuration'),
('security_settings', '{"biometric_auth": true, "auto_lock_minutes": 15, "max_login_attempts": 5}', 'Security and authentication settings'),
('feature_flags', '{"dark_mode": true, "real_time_updates": true, "voice_notes": false, "location_tracking": false}', 'Feature availability flags'),
('api_settings', '{"timeout_seconds": 30, "retry_attempts": 3, "batch_size": 100}', 'API communication settings');

-- Mobile-specific notifications table extension
CREATE TABLE mobile_push_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NULL COMMENT 'Specific device or NULL for all devices',
    notification_type ENUM('task_reminder', 'deadline_alert', 'status_update', 'ai_insight', 'system_message') NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSON NULL COMMENT 'Additional data for the mobile app',
    priority ENUM('low', 'normal', 'high', 'critical') DEFAULT 'normal',
    scheduled_for TIMESTAMP NULL COMMENT 'For scheduled notifications',
    sent_at TIMESTAMP NULL,
    delivery_status ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled') DEFAULT 'pending',
    error_message TEXT NULL,
    opened_at TIMESTAMP NULL,
    action_taken VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_id),
    INDEX idx_delivery_status (delivery_status),
    INDEX idx_scheduled_for (scheduled_for),
    INDEX idx_sent_at (sent_at)
) COMMENT='Mobile push notifications with delivery tracking';

-- Offline queue for mobile actions
CREATE TABLE mobile_offline_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    action_type ENUM('update_milestone', 'add_note', 'status_change', 'upload_file', 'create_task') NOT NULL,
    entity_type ENUM('case', 'milestone', 'client', 'task') NOT NULL,
    entity_id INT NULL,
    action_data JSON NOT NULL,
    priority INT DEFAULT 5 COMMENT '1=highest, 10=lowest',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_device (user_id, device_id),
    INDEX idx_status_priority (status, priority),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
) COMMENT='Queue for actions performed offline on mobile devices';

-- Mobile app analytics
CREATE TABLE mobile_app_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    device_id VARCHAR(255) NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category ENUM('user_action', 'app_lifecycle', 'performance', 'error', 'sync') NOT NULL,
    event_data JSON NULL,
    screen_name VARCHAR(100) NULL,
    session_id VARCHAR(255) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type (event_type),
    INDEX idx_event_category (event_category),
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_session_id (session_id)
) COMMENT='Mobile app usage analytics and events';

-- Create views for mobile dashboard
CREATE VIEW mobile_user_dashboard AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    COUNT(DISTINCT c.id) as assigned_cases,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_cases,
    COUNT(DISTINCT m.id) as assigned_tasks,
    COUNT(DISTINCT CASE WHEN m.status = 'in_progress' THEN m.id END) as active_tasks,
    COUNT(DISTINCT CASE WHEN m.planned_end_date < NOW() AND m.status != 'completed' THEN m.id END) as overdue_tasks,
    COUNT(DISTINCT CASE WHEN n.is_read = FALSE THEN n.id END) as unread_notifications,
    MAX(md.last_active) as last_mobile_activity
FROM users u
LEFT JOIN cases c ON (c.assigned_to = u.id OR c.team_members LIKE CONCAT('%', u.id, '%'))
LEFT JOIN case_milestones m ON m.assigned_to = u.id
LEFT JOIN notifications n ON n.user_id = u.id
LEFT JOIN mobile_devices md ON md.user_id = u.id AND md.is_active = TRUE
WHERE u.is_active = TRUE
GROUP BY u.id, u.full_name, u.email;

-- Create indexes for mobile performance
CREATE INDEX idx_cases_mobile_user ON cases(assigned_to, status, priority);
CREATE INDEX idx_milestones_mobile_user ON case_milestones(assigned_to, status, planned_end_date);
CREATE INDEX idx_notifications_mobile_user ON notifications(user_id, is_read, created_at);

-- Create stored procedures for mobile operations

DELIMITER //

-- Get mobile dashboard data
CREATE PROCEDURE GetMobileDashboard(IN p_user_id INT)
BEGIN
    -- Get dashboard summary
    SELECT * FROM mobile_user_dashboard WHERE user_id = p_user_id;
    
    -- Get recent cases
    SELECT c.*, cl.company_name, cl.contact_person
    FROM cases c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.assigned_to = p_user_id OR c.team_members LIKE CONCAT('%', p_user_id, '%')
    ORDER BY c.updated_at DESC
    LIMIT 10;
    
    -- Get pending tasks
    SELECT m.*, c.case_number, c.project_name
    FROM case_milestones m
    JOIN cases c ON m.case_id = c.id
    WHERE m.assigned_to = p_user_id 
    AND m.status IN ('not_started', 'in_progress')
    ORDER BY m.planned_end_date ASC
    LIMIT 20;
    
    -- Get unread notifications
    SELECT * FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT 10;
END //

-- Process mobile offline queue
CREATE PROCEDURE ProcessMobileOfflineQueue(IN p_user_id INT, IN p_device_id VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE queue_id INT;
    DECLARE action_type VARCHAR(50);
    DECLARE entity_type VARCHAR(50);
    DECLARE entity_id INT;
    DECLARE action_data JSON;
    
    DECLARE queue_cursor CURSOR FOR
        SELECT id, action_type, entity_type, entity_id, action_data
        FROM mobile_offline_queue
        WHERE user_id = p_user_id 
        AND device_id = p_device_id 
        AND status = 'pending'
        ORDER BY priority ASC, created_at ASC
        LIMIT 50;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN queue_cursor;
    
    queue_loop: LOOP
        FETCH queue_cursor INTO queue_id, action_type, entity_type, entity_id, action_data;
        
        IF done THEN
            LEAVE queue_loop;
        END IF;
        
        -- Mark as processing
        UPDATE mobile_offline_queue 
        SET status = 'processing', attempts = attempts + 1
        WHERE id = queue_id;
        
        -- Process based on action type
        CASE action_type
            WHEN 'update_milestone' THEN
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        UPDATE mobile_offline_queue 
                        SET status = 'failed', error_message = 'SQL Error during milestone update'
                        WHERE id = queue_id;
                    END;
                    
                    -- Update milestone (simplified example)
                    UPDATE case_milestones 
                    SET status = JSON_UNQUOTE(JSON_EXTRACT(action_data, '$.status')),
                        updated_notes = JSON_UNQUOTE(JSON_EXTRACT(action_data, '$.notes')),
                        updated_by = p_user_id,
                        updated_at = NOW()
                    WHERE id = entity_id;
                    
                    UPDATE mobile_offline_queue 
                    SET status = 'completed', processed_at = NOW()
                    WHERE id = queue_id;
                END;
            ELSE
                UPDATE mobile_offline_queue 
                SET status = 'failed', error_message = 'Unknown action type'
                WHERE id = queue_id;
        END CASE;
    END LOOP;
    
    CLOSE queue_cursor;
END //

DELIMITER ;

-- Add mobile-specific triggers

DELIMITER //

-- Trigger to send push notifications on case updates
CREATE TRIGGER after_case_update_mobile_notification
AFTER UPDATE ON cases
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status OR NEW.priority != OLD.priority THEN
        INSERT INTO mobile_push_notifications (
            user_id, notification_type, title, body, data, priority
        )
        SELECT 
            NEW.assigned_to,
            'status_update',
            CONCAT('Case ', NEW.case_number, ' Updated'),
            CONCAT('Status changed from ', OLD.status, ' to ', NEW.status),
            JSON_OBJECT('case_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status),
            CASE 
                WHEN NEW.priority = 'high' THEN 'high'
                WHEN NEW.priority = 'medium' THEN 'normal'
                ELSE 'low'
            END
        WHERE NEW.assigned_to IS NOT NULL;
    END IF;
END //

-- Trigger to send push notifications on milestone updates
CREATE TRIGGER after_milestone_update_mobile_notification
AFTER UPDATE ON case_milestones
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO mobile_push_notifications (
            user_id, notification_type, title, body, data, priority
        )
        SELECT 
            NEW.assigned_to,
            'task_reminder',
            CONCAT('Task Updated: ', NEW.milestone_name),
            CONCAT('Status changed to ', NEW.status),
            JSON_OBJECT('milestone_id', NEW.id, 'case_id', NEW.case_id, 'status', NEW.status),
            CASE 
                WHEN NEW.priority_level = 'high' THEN 'high'
                WHEN NEW.priority_level = 'medium' THEN 'normal'
                ELSE 'low'
            END
        WHERE NEW.assigned_to IS NOT NULL;
    END IF;
END //

DELIMITER ;

-- Create function to check mobile permissions
DELIMITER //

CREATE FUNCTION CheckMobilePermission(p_user_id INT, p_resource VARCHAR(100), p_action VARCHAR(100))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE permission_count INT DEFAULT 0;
    
    SELECT COUNT(*)
    INTO permission_count
    FROM user_role_permissions urp
    JOIN permissions p ON urp.permission_id = p.id
    WHERE urp.user_id = p_user_id
    AND p.resource = p_resource
    AND p.action = p_action;
    
    RETURN permission_count > 0;
END //

DELIMITER ;

-- Insert sample mobile configurations
INSERT INTO mobile_app_config (config_key, config_value, description) VALUES
('notification_sounds', '{"task_complete": "chime.mp3", "deadline_alert": "alert.mp3", "message": "message.mp3"}', 'Custom notification sounds'),
('sync_priorities', '{"cases": 1, "milestones": 2, "notifications": 3, "clients": 4, "files": 5}', 'Data sync priority order'),
('cache_settings', '{"max_cache_size_mb": 100, "image_cache_hours": 24, "data_cache_minutes": 60}', 'Mobile app caching configuration'),
('performance_settings', '{"lazy_loading": true, "image_compression": 0.8, "batch_requests": true}', 'Performance optimization settings');

-- Create indexes for better mobile query performance
CREATE INDEX idx_cases_priority_status ON cases(priority, status, assigned_to);
CREATE INDEX idx_milestones_due_date ON case_milestones(planned_end_date, status, assigned_to);
CREATE INDEX idx_mobile_devices_active ON mobile_devices(is_active, last_active, user_id);
CREATE INDEX idx_push_notifications_delivery ON mobile_push_notifications(delivery_status, sent_at, user_id);

COMMIT;