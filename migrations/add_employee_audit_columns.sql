-- Migration: Add audit columns to employees table
-- Date: 2025-11-07
-- Description: Adds user_id, created_by, and updated_by columns to support user tracking

-- Check if columns exist and add them if they don't
SET @sql = '';

-- Add user_id column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'vtria_erp' AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'user_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE employees ADD COLUMN user_id INT NULL COMMENT ''Reference to users table for system access'' AFTER status;', 
    'SELECT ''user_id column already exists'' as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add created_by column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'vtria_erp' AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'created_by';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE employees ADD COLUMN created_by INT NULL COMMENT ''User ID who created this record'' AFTER user_id;', 
    'SELECT ''created_by column already exists'' as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add updated_by column if it doesn't exist
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'vtria_erp' AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'updated_by';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE employees ADD COLUMN updated_by INT NULL COMMENT ''User ID who last updated this record'' AFTER created_by;', 
    'SELECT ''updated_by column already exists'' as message;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify columns were added
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'vtria_erp' 
  AND TABLE_NAME = 'employees' 
  AND COLUMN_NAME IN ('user_id', 'created_by', 'updated_by')
ORDER BY ORDINAL_POSITION;
