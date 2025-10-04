-- Sample Attendance Data for Today
-- This creates attendance records for today to demonstrate the dashboard

INSERT INTO attendance_records (
    employee_id, attendance_date, check_in_time, check_out_time, 
    total_hours, attendance_status, is_late, late_minutes
) VALUES
-- Today's attendance for active employees
(1, CURDATE(), CONCAT(CURDATE(), ' 09:00:00'), NULL, 0, 'present', FALSE, 0),
(2, CURDATE(), CONCAT(CURDATE(), ' 09:15:00'), NULL, 0, 'present', TRUE, 15),
(3, CURDATE(), CONCAT(CURDATE(), ' 08:45:00'), CONCAT(CURDATE(), ' 18:00:00'), 9.25, 'present', FALSE, 0),
(4, CURDATE(), CONCAT(CURDATE(), ' 09:30:00'), NULL, 0, 'present', TRUE, 30),
(5, CURDATE(), CONCAT(CURDATE(), ' 09:00:00'), CONCAT(CURDATE(), ' 17:30:00'), 8.5, 'present', FALSE, 0),
(6, CURDATE(), CONCAT(CURDATE(), ' 10:00:00'), NULL, 0, 'present', TRUE, 60),
(7, CURDATE(), CONCAT(CURDATE(), ' 08:30:00'), CONCAT(CURDATE(), ' 17:45:00'), 9.25, 'present', FALSE, 0),
(8, CURDATE(), CONCAT(CURDATE(), ' 09:10:00'), NULL, 0, 'present', TRUE, 10),
(9, CURDATE(), CONCAT(CURDATE(), ' 12:00:00'), CONCAT(CURDATE(), ' 17:00:00'), 5, 'present', FALSE, 0),
(10, CURDATE(), CONCAT(CURDATE(), ' 08:45:00'), CONCAT(CURDATE(), ' 18:30:00'), 9.75, 'present', FALSE, 0),
(11, CURDATE(), CONCAT(CURDATE(), ' 09:00:00'), NULL, 0, 'present', FALSE, 0),
(12, CURDATE(), CONCAT(CURDATE(), ' 09:20:00'), NULL, 0, 'present', TRUE, 20),
(14, CURDATE(), CONCAT(CURDATE(), ' 08:00:00'), CONCAT(CURDATE(), ' 17:00:00'), 9, 'present', FALSE, 0),
(15, CURDATE(), CONCAT(CURDATE(), ' 08:30:00'), NULL, 0, 'present', FALSE, 0),
(16, CURDATE(), CONCAT(CURDATE(), ' 09:00:00'), CONCAT(CURDATE(), ' 17:30:00'), 8.5, 'present', FALSE, 0),
(17, CURDATE(), CONCAT(CURDATE(), ' 10:30:00'), NULL, 0, 'present', TRUE, 90),
-- Employees on leave marked as on_leave
(13, CURDATE(), NULL, NULL, 0, 'on_leave', FALSE, 0),
(20, CURDATE(), NULL, NULL, 0, 'on_leave', FALSE, 0);

-- Add some leave applications
INSERT INTO leave_applications (
    employee_id, start_date, end_date, total_days, leave_reason, status
) VALUES
(13, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 3, 'Family function', 'approved'),
(20, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 5, 'Medical treatment', 'approved'),
(2, DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 3, 'Personal work', 'submitted'),
(5, DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 18 DAY), 5, 'Vacation', 'submitted'),
(8, DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 21 DAY), 1, 'Emergency', 'submitted'),
(12, DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 32 DAY), 3, 'Wedding', 'submitted'),
(17, DATE_ADD(CURDATE(), INTERVAL 45 DAY), DATE_ADD(CURDATE(), INTERVAL 47 DAY), 3, 'Training program', 'submitted');