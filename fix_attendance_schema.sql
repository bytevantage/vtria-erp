-- ============================================================================
-- Attendance Management Schema Fixes
-- Created: October 12, 2025
-- Purpose: Fix attendance_records table to support GPS tracking and proper time handling
-- ============================================================================

USE vtria_erp;

-- Backup existing data (if any)
-- CREATE TABLE attendance_records_backup AS SELECT * FROM attendance_records;

-- Step 1: Modify time columns to datetime for proper timestamp support
ALTER TABLE attendance_records 
MODIFY COLUMN check_in_time DATETIME,
MODIFY COLUMN check_out_time DATETIME;

-- Step 2: Add GPS tracking columns for check-in
ALTER TABLE attendance_records 
ADD COLUMN check_in_location VARCHAR(255) AFTER check_in_time,
ADD COLUMN check_in_latitude DECIMAL(10, 8) AFTER check_in_location,
ADD COLUMN check_in_longitude DECIMAL(11, 8) AFTER check_in_latitude,
ADD COLUMN check_in_method VARCHAR(50) DEFAULT 'manual' AFTER check_in_longitude;

-- Step 3: Add GPS tracking columns for check-out
ALTER TABLE attendance_records 
ADD COLUMN check_out_location VARCHAR(255) AFTER check_out_time,
ADD COLUMN check_out_latitude DECIMAL(10, 8) AFTER check_out_location,
ADD COLUMN check_out_longitude DECIMAL(11, 8) AFTER check_out_latitude;

-- Step 4: Add late tracking columns
ALTER TABLE attendance_records 
ADD COLUMN is_late BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN late_minutes INT DEFAULT 0 AFTER is_late;

-- Step 5: Add regular hours column for payroll calculations
ALTER TABLE attendance_records 
ADD COLUMN regular_hours DECIMAL(4,2) DEFAULT 0.00 AFTER total_hours;

-- Step 6: Verify the changes
DESCRIBE attendance_records;

-- Step 7: Show sample structure
SELECT 
  'attendance_records table updated successfully' as message,
  COUNT(*) as existing_records
FROM attendance_records;

-- ============================================================================
-- Expected Final Structure:
-- ============================================================================
-- id (int, PK, AUTO_INCREMENT)
-- employee_id (int, FK → employees.id)
-- attendance_date (date)
-- check_in_time (datetime)
-- check_in_location (varchar)
-- check_in_latitude (decimal)
-- check_in_longitude (decimal)
-- check_in_method (varchar)
-- check_out_time (datetime)
-- check_out_location (varchar)
-- check_out_latitude (decimal)
-- check_out_longitude (decimal)
-- total_hours (decimal)
-- regular_hours (decimal)
-- overtime_hours (decimal)
-- status (enum)
-- is_late (boolean)
-- late_minutes (int)
-- notes (text)
-- created_by (int)
-- created_at (timestamp)
-- updated_at (timestamp)
-- ============================================================================
