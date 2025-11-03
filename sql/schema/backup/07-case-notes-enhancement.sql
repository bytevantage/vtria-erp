-- ============================================
-- VTRIA ERP - Enhance Case Notes System
-- Make notes truly append-only with auto-prefix
-- ============================================

-- Add columns for tracking note immutability (only if they don't exist)
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'case_notes' 
     AND column_name = 'is_editable') = 0,
    'ALTER TABLE case_notes ADD COLUMN is_editable BOOLEAN DEFAULT FALSE',
    'SELECT "Column is_editable already exists" AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'case_notes' 
     AND column_name = 'edited_at') = 0,
    'ALTER TABLE case_notes ADD COLUMN edited_at TIMESTAMP NULL',
    'SELECT "Column edited_at already exists" AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'case_notes' 
     AND column_name = 'edited_by') = 0,
    'ALTER TABLE case_notes ADD COLUMN edited_by INT NULL',
    'SELECT "Column edited_by already exists" AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add trigger to prevent updates to notes after creation
-- This enforces append-only behavior

DELIMITER //

DROP TRIGGER IF EXISTS prevent_case_note_update//

CREATE TRIGGER prevent_case_note_update
BEFORE UPDATE ON case_notes
FOR EACH ROW
BEGIN
    -- Allow only marking as read or updating metadata, not content
    IF OLD.content != NEW.content AND OLD.is_editable = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot modify case notes. Notes are append-only.';
    END IF;
    
    -- If editing is allowed and content changed, track it
    IF OLD.content != NEW.content AND NEW.is_editable = TRUE THEN
        SET NEW.edited_at = NOW();
        SET NEW.edited_by = NEW.user_id;
    END IF;
END//

DELIMITER ;

-- Add soft delete columns (only if they don't exist)
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'case_notes' 
     AND column_name = 'deleted_at') = 0,
    'ALTER TABLE case_notes ADD COLUMN deleted_at TIMESTAMP NULL',
    'SELECT "Column deleted_at already exists" AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'case_notes' 
     AND column_name = 'deleted_by') = 0,
    'ALTER TABLE case_notes ADD COLUMN deleted_by INT NULL',
    'SELECT "Column deleted_by already exists" AS Info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELIMITER //

DROP TRIGGER IF EXISTS prevent_case_note_delete//

CREATE TRIGGER prevent_case_note_delete
BEFORE DELETE ON case_notes
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Cannot delete case notes. Use soft delete instead.';
END//

DELIMITER ;

-- Create stored procedure for adding case notes with auto-prefix
DELIMITER //

DROP PROCEDURE IF EXISTS add_case_note//

CREATE PROCEDURE add_case_note(
    IN p_case_id INT,
    IN p_note_type VARCHAR(50),
    IN p_content TEXT,
    IN p_created_by INT,
    IN p_is_system_generated BOOLEAN
)
BEGIN
    DECLARE v_user_name VARCHAR(255);
    DECLARE v_prefixed_content TEXT;
    
    -- Get user name
    SELECT full_name INTO v_user_name 
    FROM users 
    WHERE id = p_created_by 
    LIMIT 1;
    
    -- Create prefixed content: [YYYY-MM-DD HH:MM:SS - User Name]:
    SET v_prefixed_content = CONCAT(
        '[',
        DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
        ' - ',
        COALESCE(v_user_name, 'Unknown User'),
        ']: ',
        p_content
    );
    
    -- Insert note with prefix
    INSERT INTO case_notes (
        case_id,
        note_type,
        content,
        created_by,
        is_system_generated,
        is_editable,
        created_at
    ) VALUES (
        p_case_id,
        p_note_type,
        v_prefixed_content,
        p_created_by,
        p_is_system_generated,
        FALSE,
        NOW()
    );
END//

DELIMITER ;

-- Create view for formatted case notes
CREATE OR REPLACE VIEW case_notes_formatted AS
SELECT 
    cn.id,
    cn.case_id,
    cn.note_type,
    cn.content,
    cn.is_internal,
    cn.is_system_generated,
    cn.is_editable,
    cn.created_by,
    u.full_name as created_by_name,
    cn.created_at,
    cn.edited_at,
    cn.edited_by,
    eu.full_name as edited_by_name,
    DATE_FORMAT(cn.created_at, '%Y-%m-%d %H:%i:%s') as formatted_date,
    TIMESTAMPDIFF(MINUTE, cn.created_at, NOW()) as minutes_ago,
    CASE
        WHEN TIMESTAMPDIFF(MINUTE, cn.created_at, NOW()) < 60 THEN CONCAT(TIMESTAMPDIFF(MINUTE, cn.created_at, NOW()), ' minutes ago')
        WHEN TIMESTAMPDIFF(HOUR, cn.created_at, NOW()) < 24 THEN CONCAT(TIMESTAMPDIFF(HOUR, cn.created_at, NOW()), ' hours ago')
        ELSE CONCAT(TIMESTAMPDIFF(DAY, cn.created_at, NOW()), ' days ago')
    END as relative_time
FROM case_notes cn
LEFT JOIN users u ON cn.created_by = u.id
LEFT JOIN users eu ON cn.edited_by = eu.id
WHERE cn.deleted_at IS NULL
ORDER BY cn.created_at ASC;

-- Sample usage comment
-- To add a case note with auto-prefix:
-- CALL add_case_note(1, 'general', 'This is my note content', 1, FALSE);

-- Success message
SELECT 'Case Notes Enhancement Completed!' as Status,
       'Notes are now append-only with auto date/time/user prefix' as Feature;
