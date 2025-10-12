-- ============================================================================
-- Sample Attendance Data for Testing
-- Created: October 12, 2025
-- Purpose: Populate attendance_records with realistic test data
-- ============================================================================

USE vtria_erp;

-- Get employee IDs first
SELECT id, employee_id, CONCAT(first_name, ' ', last_name) as name FROM employees LIMIT 10;

-- Sample attendance for today (all 3 employees)
-- Employee 1: On time check-in
INSERT INTO attendance_records (
  employee_id, attendance_date, 
  check_in_time, check_in_location, check_in_latitude, check_in_longitude, check_in_method,
  is_late, late_minutes, status, created_by
) VALUES (
  1, CURDATE(),
  CONCAT(CURDATE(), ' 08:55:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'mobile_gps',
  FALSE, 0, 'present', 3
);

-- Employee 2: Late check-in (30 minutes late)
INSERT INTO attendance_records (
  employee_id, attendance_date,
  check_in_time, check_in_location, check_in_latitude, check_in_longitude, check_in_method,
  is_late, late_minutes, status, created_by
) VALUES (
  2, CURDATE(),
  CONCAT(CURDATE(), ' 09:45:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'mobile_gps',
  TRUE, 30, 'late', 3
);

-- Employee 3: On time check-in with check-out
INSERT INTO attendance_records (
  employee_id, attendance_date,
  check_in_time, check_in_location, check_in_latitude, check_in_longitude, check_in_method,
  check_out_time, check_out_location, check_out_latitude, check_out_longitude,
  total_hours, regular_hours, overtime_hours,
  is_late, late_minutes, status, created_by
) VALUES (
  3, CURDATE(),
  CONCAT(CURDATE(), ' 09:00:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'mobile_gps',
  CONCAT(CURDATE(), ' 18:30:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
  9.50, 9.00, 0.50,
  FALSE, 0, 'present', 3
);

-- Sample data for yesterday
INSERT INTO attendance_records (
  employee_id, attendance_date,
  check_in_time, check_in_location, check_in_latitude, check_in_longitude, check_in_method,
  check_out_time, check_out_location, check_out_latitude, check_out_longitude,
  total_hours, regular_hours, overtime_hours,
  is_late, late_minutes, status, created_by
) VALUES 
(1, DATE_SUB(CURDATE(), INTERVAL 1 DAY),
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 09:10:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'manual',
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 18:00:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
 8.83, 8.83, 0.00,
 FALSE, 0, 'present', 3),
 
(2, DATE_SUB(CURDATE(), INTERVAL 1 DAY),
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 08:45:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'manual',
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 17:45:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
 9.00, 9.00, 0.00,
 FALSE, 0, 'present', 3),

(3, DATE_SUB(CURDATE(), INTERVAL 1 DAY),
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 09:25:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'manual',
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 1 DAY), ' 18:15:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
 8.83, 8.83, 0.00,
 TRUE, 10, 'late', 3);

-- Sample data for 2 days ago
INSERT INTO attendance_records (
  employee_id, attendance_date,
  check_in_time, check_in_location, check_in_latitude, check_in_longitude, check_in_method,
  check_out_time, check_out_location, check_out_latitude, check_out_longitude,
  total_hours, regular_hours, overtime_hours,
  is_late, late_minutes, status, created_by
) VALUES 
(1, DATE_SUB(CURDATE(), INTERVAL 2 DAY),
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 08:50:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'manual',
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 19:00:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
 10.17, 9.00, 1.17,
 FALSE, 0, 'present', 3),
 
(2, DATE_SUB(CURDATE(), INTERVAL 2 DAY),
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 09:30:00'), 'Head Office, Mangalore', 12.9141, 74.8560, 'manual',
 CONCAT(DATE_SUB(CURDATE(), INTERVAL 2 DAY), ' 18:30:00'), 'Head Office, Mangalore', 12.9141, 74.8560,
 9.00, 9.00, 0.00,
 TRUE, 15, 'late', 3);

-- Verify the inserted data
SELECT 
  ar.id,
  e.employee_id,
  CONCAT(e.first_name, ' ', e.last_name) as employee_name,
  ar.attendance_date,
  ar.check_in_time,
  ar.check_out_time,
  ar.total_hours,
  ar.is_late,
  ar.late_minutes,
  ar.status
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
ORDER BY ar.attendance_date DESC, ar.check_in_time;

-- Summary statistics
SELECT 
  'Total Records' as metric,
  COUNT(*) as value
FROM attendance_records
UNION ALL
SELECT 
  'Today Records' as metric,
  COUNT(*) as value
FROM attendance_records
WHERE attendance_date = CURDATE()
UNION ALL
SELECT 
  'Late Arrivals' as metric,
  COUNT(*) as value
FROM attendance_records
WHERE is_late = TRUE;
