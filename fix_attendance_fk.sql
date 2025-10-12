-- ============================================================================
-- Fix Attendance Records Foreign Key Constraint
-- Created: October 12, 2025
-- Purpose: Change foreign key to reference correct employees table
-- ============================================================================

USE vtria_erp;

-- Drop the incorrect foreign key
ALTER TABLE attendance_records 
DROP FOREIGN KEY attendance_records_ibfk_1;

-- Add correct foreign key to employees table
ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_ibfk_1 
FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Verify the change
SHOW CREATE TABLE attendance_records\G

SELECT 'Foreign key fixed successfully - now references employees table' as message;
