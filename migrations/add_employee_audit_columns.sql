-- Migration: Add audit columns to employees table
-- Date: 2025-11-07
-- Description: Adds user_id, created_by, and updated_by columns to support user tracking

-- Add user_id column (link to users table)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id INT NULL COMMENT 'Reference to users table for system access' 
AFTER status;

-- Add created_by column (track who created the record)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS created_by INT NULL COMMENT 'User ID who created this record' 
AFTER user_id;

-- Add updated_by column (track who last updated the record)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS updated_by INT NULL COMMENT 'User ID who last updated this record' 
AFTER created_by;

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
