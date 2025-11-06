-- Enterprise Production Features Schema
-- This script creates all necessary tables for enterprise production deployment

-- ============================================================================
-- 1. LEAVE POLICY MANAGEMENT SYSTEM
-- ============================================================================

-- Company Leave Policies
CREATE TABLE IF NOT EXISTS leave_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Leave Types with Policy Configuration
CREATE TABLE IF NOT EXISTS leave_types_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_type_name VARCHAR(50) NOT NULL,
    leave_code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    policy_id INT,
    is_paid BOOLEAN DEFAULT TRUE,
    is_carryforward BOOLEAN DEFAULT FALSE,
    max_carryforward_days INT DEFAULT 0,
    advance_notice_days INT DEFAULT 1,
    max_consecutive_days INT DEFAULT 365,
    requires_document BOOLEAN DEFAULT FALSE,
    document_required_after_days INT DEFAULT 3,
    is_weekend_included BOOLEAN DEFAULT TRUE,
    is_holiday_included BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES leave_policies(id)
);

-- Employee Leave Entitlements
CREATE TABLE IF NOT EXISTS employee_leave_entitlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    year YEAR NOT NULL,
    allocated_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    carried_forward_days DECIMAL(5,2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(5,2) GENERATED ALWAYS AS (allocated_days + carried_forward_days - used_days - pending_days) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_enhanced(id),
    UNIQUE KEY unique_employee_leave_year (employee_id, leave_type_id, year)
);

-- Enhanced Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_date TIMESTAMP NULL,
    approved_by INT NULL,
    rejection_reason TEXT NULL,
    supporting_document_path VARCHAR(500) NULL,
    emergency_contact VARCHAR(100) NULL,
    handover_notes TEXT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period ENUM('first_half', 'second_half') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types_enhanced(id),
    FOREIGN KEY (approved_by) REFERENCES employees(id)
);

-- ============================================================================
-- 2. LOCATION-BASED ACCESS CONTROL SYSTEM
-- ============================================================================

-- Office Locations with Geofencing
CREATE TABLE IF NOT EXISTS office_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100,
    location_type ENUM('head_office', 'branch_office', 'client_site', 'warehouse', 'remote_authorized') DEFAULT 'branch_office',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employee Location Permissions
CREATE TABLE IF NOT EXISTS employee_location_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    location_id INT NOT NULL,
    permission_type ENUM('attendance', 'login', 'both') DEFAULT 'both',
    is_remote_work_authorized BOOLEAN DEFAULT FALSE,
    remote_work_start_date DATE NULL,
    remote_work_end_date DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES office_locations(id),
    UNIQUE KEY unique_employee_location (employee_id, location_id)
);

-- IP Address Restrictions
CREATE TABLE IF NOT EXISTS ip_access_controls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    subnet_mask VARCHAR(45) NULL,
    access_type ENUM('allow', 'deny') DEFAULT 'allow',
    location_id INT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES office_locations(id)
);

-- Login Attempt Logging
CREATE TABLE IF NOT EXISTS login_attempt_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    location_data JSON NULL,
    attempt_result ENUM('success', 'failed', 'blocked') NOT NULL,
    failure_reason VARCHAR(255) NULL,
    session_token VARCHAR(255) NULL,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Device Management for Enhanced Security
CREATE TABLE IF NOT EXISTS trusted_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(100) NULL,
    device_type ENUM('mobile', 'desktop', 'tablet') DEFAULT 'desktop',
    browser_info VARCHAR(255) NULL,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    trust_expiry TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_device (employee_id, device_fingerprint)
);

-- ============================================================================
-- 3. ENHANCED ATTENDANCE SYSTEM
-- ============================================================================

-- Attendance Validation Rules
CREATE TABLE IF NOT EXISTS attendance_validation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    location_id INT NOT NULL,
    max_distance_meters INT DEFAULT 100,
    allow_outside_hours BOOLEAN DEFAULT FALSE,
    start_time TIME DEFAULT '08:00:00',
    end_time TIME DEFAULT '18:00:00',
    grace_period_minutes INT DEFAULT 15,
    require_photo BOOLEAN DEFAULT FALSE,
    require_manager_approval BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES office_locations(id)
);

-- Enhanced Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP NULL,
    check_out_time TIMESTAMP NULL,
    check_in_location_id INT NULL,
    check_out_location_id INT NULL,
    check_in_latitude DECIMAL(10, 8) NULL,
    check_in_longitude DECIMAL(11, 8) NULL,
    check_out_latitude DECIMAL(10, 8) NULL,
    check_out_longitude DECIMAL(11, 8) NULL,
    check_in_distance_meters INT NULL,
    check_out_distance_meters INT NULL,
    check_in_photo_path VARCHAR(500) NULL,
    check_out_photo_path VARCHAR(500) NULL,
    total_hours DECIMAL(5, 2) NULL,
    break_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    attendance_status ENUM('present', 'absent', 'partial', 'on_leave', 'holiday') DEFAULT 'present',
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INT DEFAULT 0,
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INT DEFAULT 0,
    validation_status ENUM('valid', 'suspicious', 'invalid') DEFAULT 'valid',
    validation_notes TEXT NULL,
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (check_in_location_id) REFERENCES office_locations(id),
    FOREIGN KEY (check_out_location_id) REFERENCES office_locations(id),
    FOREIGN KEY (approved_by) REFERENCES employees(id),
    UNIQUE KEY unique_employee_date (employee_id, attendance_date)
);

-- Attendance Exceptions and Approvals
CREATE TABLE IF NOT EXISTS attendance_exceptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_record_id INT NOT NULL,
    exception_type ENUM('location_variance', 'time_variance', 'manual_entry', 'correction') NOT NULL,
    description TEXT NOT NULL,
    requested_by INT NOT NULL,
    approved_by INT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records_enhanced(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES employees(id),
    FOREIGN KEY (approved_by) REFERENCES employees(id)
);

-- ============================================================================
-- 4. SYSTEM CONFIGURATION
-- ============================================================================

-- Company Configuration for Policies
CREATE TABLE IF NOT EXISTS company_policy_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_system_config BOOLEAN DEFAULT FALSE,
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES employees(id)
);

-- ============================================================================
-- 5. INSERT DEFAULT DATA
-- ============================================================================

-- Insert default leave policy
INSERT IGNORE INTO leave_policies (policy_name, description, is_active) VALUES
('Standard Company Policy', 'Default leave policy for all employees', TRUE);

-- Insert enhanced leave types
INSERT IGNORE INTO leave_types_enhanced (leave_type_name, leave_code, description, policy_id, is_paid, advance_notice_days, max_consecutive_days, requires_document, document_required_after_days) VALUES
('Annual Leave', 'AL', 'Annual vacation leave', 1, TRUE, 7, 30, FALSE, 5),
('Sick Leave', 'SL', 'Medical leave for illness', 1, TRUE, 0, 10, TRUE, 3),
('Casual Leave', 'CL', 'Short-term personal leave', 1, TRUE, 1, 3, FALSE, NULL),
('Maternity Leave', 'ML', 'Maternity leave for new mothers', 1, TRUE, 30, 180, TRUE, 1),
('Paternity Leave', 'PL', 'Paternity leave for new fathers', 1, TRUE, 15, 15, FALSE, NULL),
('Emergency Leave', 'EL', 'Emergency situations', 1, TRUE, 0, 5, FALSE, 1),
('Compensatory Off', 'CO', 'Compensatory time off', 1, TRUE, 1, 2, FALSE, NULL),
('Loss of Pay', 'LOP', 'Unpaid leave', 1, FALSE, 3, 30, FALSE, NULL);

-- Insert default office locations
INSERT IGNORE INTO office_locations (location_name, address, latitude, longitude, radius_meters, location_type) VALUES
('Head Office', 'VTRIA Head Office, Mangalore, Karnataka', 12.9141, 74.8560, 100, 'head_office'),
('Branch Office', 'VTRIA Branch Office, Mangalore, Karnataka', 12.9160, 74.8570, 50, 'branch_office'),
('Remote Work Zone', 'Authorized Remote Work Location', 0.0000, 0.0000, 5000, 'remote_authorized');

-- Insert default company policy configurations
INSERT IGNORE INTO company_policy_config (config_key, config_value, data_type, description, category) VALUES
('max_login_attempts', '5', 'number', 'Maximum failed login attempts before lockout', 'security'),
('lockout_duration_minutes', '15', 'number', 'Account lockout duration in minutes', 'security'),
('session_timeout_hours', '8', 'number', 'Session timeout in hours', 'security'),
('require_location_for_attendance', 'true', 'boolean', 'Require location validation for attendance', 'attendance'),
('attendance_grace_period_minutes', '15', 'number', 'Grace period for late attendance', 'attendance'),
('max_attendance_distance_meters', '100', 'number', 'Maximum distance allowed for attendance marking', 'attendance'),
('allow_remote_attendance', 'false', 'boolean', 'Allow attendance marking from remote locations', 'attendance'),
('require_manager_approval_remote', 'true', 'boolean', 'Require manager approval for remote attendance', 'attendance'),
('working_hours_start', '09:00', 'string', 'Standard working hours start time', 'attendance'),
('working_hours_end', '18:00', 'string', 'Standard working hours end time', 'attendance'),
('annual_leave_allocation', '21', 'number', 'Default annual leave allocation in days', 'leave'),
('sick_leave_allocation', '12', 'number', 'Default sick leave allocation in days', 'leave'),
('casual_leave_allocation', '6', 'number', 'Default casual leave allocation in days', 'leave');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records_enhanced(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications_enhanced(status, applied_date);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempt_logs(login_timestamp);
CREATE INDEX IF NOT EXISTS idx_location_permissions_employee ON employee_location_permissions(employee_id);

-- ============================================================================
-- 6. CREATE VIEWS FOR EASY DATA ACCESS
-- ============================================================================

-- Employee Leave Balance View
CREATE OR REPLACE VIEW employee_leave_balances AS
SELECT 
    e.id as employee_id,
    e.employee_id as emp_id,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    lt.leave_type_name,
    lt.leave_code,
    ent.year,
    ent.allocated_days,
    ent.used_days,
    ent.pending_days,
    ent.carried_forward_days,
    ent.remaining_days
FROM employees e
JOIN employee_leave_entitlements ent ON e.id = ent.employee_id
JOIN leave_types_enhanced lt ON ent.leave_type_id = lt.id
WHERE e.status = 'active' AND lt.is_active = TRUE;

-- Current Attendance Status View
CREATE OR REPLACE VIEW current_attendance_status AS
SELECT 
    e.id as employee_id,
    e.employee_id as emp_id,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    DATE(NOW()) as today,
    ar.check_in_time,
    ar.check_out_time,
    ar.attendance_status,
    ar.total_hours,
    ar.is_late,
    ar.late_minutes,
    CASE 
        WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NULL THEN 'checked_in'
        WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL THEN 'completed'
        ELSE 'not_started'
    END as current_status
FROM employees e
LEFT JOIN attendance_records_enhanced ar ON e.id = ar.employee_id AND ar.attendance_date = DATE(NOW())
WHERE e.status = 'active';

COMMIT;