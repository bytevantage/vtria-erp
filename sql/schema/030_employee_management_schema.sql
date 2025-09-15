-- ===================================
-- Employee Management Module Schema
-- ===================================

-- Employee Master Table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'Formatted ID (EMP/YYYY/XXX)',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    employee_type ENUM('full_time', 'part_time', 'contract', 'intern', 'consultant') DEFAULT 'full_time',
    status ENUM('active', 'inactive', 'terminated', 'on_leave') DEFAULT 'active',
    
    -- Personal Information
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    
    -- Employment Details
    hire_date DATE NOT NULL,
    termination_date DATE,
    probation_end_date DATE,
    confirmation_date DATE,
    
    -- Organizational Details
    department_id INT,
    designation VARCHAR(100),
    reporting_manager_id INT,
    work_location VARCHAR(100),
    
    -- Compensation
    basic_salary DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- System Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    
    -- Foreign Key Constraints
    FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_department (department_id),
    INDEX idx_reporting_manager (reporting_manager_id),
    INDEX idx_hire_date (hire_date)
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(10) UNIQUE,
    description TEXT,
    head_of_department_id INT,
    parent_department_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    cost_center VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (head_of_department_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL,
    
    INDEX idx_department_code (department_code),
    INDEX idx_status (status)
);

-- Add foreign key constraint for employees.department_id after departments table is created
ALTER TABLE employees ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- Work Shifts Table
CREATE TABLE IF NOT EXISTS work_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_name VARCHAR(50) NOT NULL,
    shift_code VARCHAR(10) UNIQUE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INT DEFAULT 0 COMMENT 'Break duration in minutes',
    total_hours DECIMAL(4,2) CALCULATED AS (
        CASE 
            WHEN end_time >= start_time 
            THEN TIME_TO_SEC(TIMEDIFF(end_time, start_time))/3600 - break_duration/60
            ELSE TIME_TO_SEC(TIMEDIFF(ADDTIME(end_time, '24:00:00'), start_time))/3600 - break_duration/60
        END
    ) STORED,
    is_night_shift BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_shift_code (shift_code)
);

-- Employee Shift Assignment
CREATE TABLE IF NOT EXISTS employee_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    shift_id INT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_current BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES work_shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee_shift (employee_id, effective_from),
    INDEX idx_current_shift (employee_id, is_current)
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    shift_id INT,
    
    -- Check-in Details
    check_in_time TIMESTAMP,
    check_in_location VARCHAR(200),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_in_method ENUM('manual', 'biometric', 'mobile_gps', 'web', 'admin_entry') DEFAULT 'manual',
    check_in_device_info JSON,
    
    -- Check-out Details  
    check_out_time TIMESTAMP,
    check_out_location VARCHAR(200),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_out_method ENUM('manual', 'biometric', 'mobile_gps', 'web', 'admin_entry') DEFAULT 'manual',
    check_out_device_info JSON,
    
    -- Calculated Fields
    total_hours DECIMAL(4,2),
    regular_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2),
    
    -- Status Fields
    attendance_status ENUM('present', 'absent', 'partial_day', 'on_leave', 'holiday', 'weekend') DEFAULT 'present',
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INT DEFAULT 0,
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INT DEFAULT 0,
    
    -- Break Times
    break_start_time TIMESTAMP,
    break_end_time TIMESTAMP,
    actual_break_minutes INT DEFAULT 0,
    
    -- Approval Workflow
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by INT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Administrative Fields
    remarks TEXT,
    modified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES work_shifts(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_employee_date (employee_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_status (attendance_status),
    INDEX idx_employee_date_range (employee_id, attendance_date)
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_type_name VARCHAR(50) NOT NULL UNIQUE,
    leave_code VARCHAR(10) UNIQUE,
    description TEXT,
    is_paid BOOLEAN DEFAULT TRUE,
    max_days_per_year INT,
    max_consecutive_days INT,
    carry_forward_allowed BOOLEAN DEFAULT FALSE,
    carry_forward_max_days INT DEFAULT 0,
    
    -- Approval Requirements
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_hierarchy_levels INT DEFAULT 1,
    advance_notice_days INT DEFAULT 0,
    
    -- Availability Rules
    applicable_after_months INT DEFAULT 0 COMMENT 'Months of employment before leave is available',
    prorate_first_year BOOLEAN DEFAULT TRUE,
    
    gender_specific ENUM('all', 'male', 'female', 'other') DEFAULT 'all',
    employee_type_applicable JSON COMMENT 'Array of applicable employee types',
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_leave_code (leave_code),
    INDEX idx_status (status)
);

-- Employee Leave Balances  
CREATE TABLE IF NOT EXISTS employee_leave_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    leave_year YEAR NOT NULL,
    
    -- Balance Details
    entitled_days DECIMAL(4,1) DEFAULT 0,
    opening_balance DECIMAL(4,1) DEFAULT 0,
    earned_days DECIMAL(4,1) DEFAULT 0,
    used_days DECIMAL(4,1) DEFAULT 0,
    carry_forward_days DECIMAL(4,1) DEFAULT 0,
    encashed_days DECIMAL(4,1) DEFAULT 0,
    
    -- Calculated Balance
    available_balance DECIMAL(4,1) GENERATED ALWAYS AS 
        (opening_balance + earned_days + carry_forward_days - used_days - encashed_days) STORED,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_employee_leave_year (employee_id, leave_type_id, leave_year),
    INDEX idx_leave_year (leave_year),
    INDEX idx_balance_lookup (employee_id, leave_type_id, leave_year)
);

-- Leave Applications
CREATE TABLE IF NOT EXISTS leave_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(20) UNIQUE NOT NULL COMMENT 'Formatted ID (LA/YYYY/XXX)',
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    
    -- Leave Details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_session ENUM('first_half', 'second_half'),
    
    -- Application Details
    reason TEXT NOT NULL,
    emergency_contact_during_leave VARCHAR(100),
    contact_phone VARCHAR(15),
    
    -- Approval Workflow
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'draft',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_date TIMESTAMP,
    
    -- Multi-level Approval Support
    current_approval_level INT DEFAULT 1,
    max_approval_levels INT DEFAULT 1,
    
    final_approved_by INT,
    final_approved_date TIMESTAMP,
    rejection_reason TEXT,
    cancelled_reason TEXT,
    cancelled_by INT,
    cancelled_date TIMESTAMP,
    
    -- Administrative Fields
    admin_remarks TEXT,
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (final_approved_by) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_application_id (application_id),
    INDEX idx_employee_dates (employee_id, start_date, end_date),
    INDEX idx_status (status),
    INDEX idx_applied_date (applied_date)
);

-- Leave Approval Workflow
CREATE TABLE IF NOT EXISTS leave_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_application_id INT NOT NULL,
    approval_level INT NOT NULL,
    approver_employee_id INT NOT NULL,
    
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_date TIMESTAMP,
    comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_application_level_approver (leave_application_id, approval_level, approver_employee_id),
    INDEX idx_approver_pending (approver_employee_id, status)
);

-- Work Locations for Geo-fencing
CREATE TABLE IF NOT EXISTS work_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geo_fence_radius INT DEFAULT 100 COMMENT 'Radius in meters for geo-fencing',
    
    -- Location Details
    is_head_office BOOLEAN DEFAULT FALSE,
    is_branch_office BOOLEAN DEFAULT FALSE,
    is_remote_location BOOLEAN DEFAULT FALSE,
    
    -- Operational Details
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    working_days JSON COMMENT 'Array of working days (0=Sunday, 6=Saturday)',
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_coordinates (latitude, longitude),
    INDEX idx_status (status)
);

-- Employee Location Assignment
CREATE TABLE IF NOT EXISTS employee_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_location_id INT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_primary_location BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (work_location_id) REFERENCES work_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee_location (employee_id, effective_from),
    INDEX idx_primary_location (employee_id, is_primary_location)
);

-- Holidays Calendar
CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    holiday_name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type ENUM('national', 'regional', 'company', 'optional') DEFAULT 'company',
    is_mandatory BOOLEAN DEFAULT TRUE,
    description TEXT,
    
    -- Location Specific
    applicable_locations JSON COMMENT 'Array of location IDs, null means all locations',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_holiday_date (holiday_date),
    INDEX idx_holiday_type (holiday_type)
);

-- Employee Performance Reviews (Future Enhancement)
CREATE TABLE IF NOT EXISTS performance_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type ENUM('probation', 'annual', 'mid_year', 'project_based') DEFAULT 'annual',
    
    -- Review Scores
    overall_rating DECIMAL(3,2),
    reviewer_employee_id INT,
    review_date DATE,
    review_status ENUM('draft', 'submitted', 'approved', 'completed') DEFAULT 'draft',
    
    -- Goals and Comments
    goals_achieved TEXT,
    areas_of_improvement TEXT,
    reviewer_comments TEXT,
    employee_comments TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    
    INDEX idx_employee_review_period (employee_id, review_period_start, review_period_end)
);

-- Insert Default Data

-- Default Departments
INSERT INTO departments (department_name, department_code, description) VALUES
('Human Resources', 'HR', 'Human Resources Department'),
('Information Technology', 'IT', 'Information Technology Department'),
('Finance & Accounts', 'FIN', 'Finance and Accounts Department'),
('Sales & Marketing', 'SALES', 'Sales and Marketing Department'),
('Operations', 'OPS', 'Operations Department'),
('Research & Development', 'RND', 'Research and Development Department'),
('Quality Assurance', 'QA', 'Quality Assurance Department'),
('Admin', 'ADMIN', 'Administrative Department')
ON DUPLICATE KEY UPDATE department_name = VALUES(department_name);

-- Default Work Shifts
INSERT INTO work_shifts (shift_name, shift_code, start_time, end_time, break_duration) VALUES
('General Shift', 'GEN', '09:00:00', '18:00:00', 60),
('Morning Shift', 'MORN', '06:00:00', '15:00:00', 60),
('Evening Shift', 'EVE', '15:00:00', '00:00:00', 60),
('Night Shift', 'NIGHT', '22:00:00', '07:00:00', 60),
('Flexible Hours', 'FLEX', '09:00:00', '18:00:00', 60)
ON DUPLICATE KEY UPDATE shift_name = VALUES(shift_name);

-- Default Leave Types
INSERT INTO leave_types (leave_type_name, leave_code, description, is_paid, max_days_per_year, requires_approval) VALUES
('Annual Leave', 'AL', 'Annual/Casual Leave', TRUE, 21, TRUE),
('Sick Leave', 'SL', 'Medical Leave', TRUE, 12, TRUE),
('Maternity Leave', 'ML', 'Maternity Leave for Female Employees', TRUE, 180, TRUE),
('Paternity Leave', 'PL', 'Paternity Leave for Male Employees', TRUE, 15, TRUE),
('Emergency Leave', 'EL', 'Emergency Leave', TRUE, 5, TRUE),
('Comp Off', 'CO', 'Compensatory Off', TRUE, 12, TRUE),
('Loss of Pay', 'LOP', 'Loss of Pay Leave', FALSE, 999, TRUE),
('Work From Home', 'WFH', 'Work From Home', TRUE, 24, TRUE)
ON DUPLICATE KEY UPDATE leave_type_name = VALUES(leave_type_name);

-- Default Work Location (Head Office)
INSERT INTO work_locations (location_name, address, latitude, longitude, is_head_office) VALUES
('Head Office', 'VTRIA Engineering Solutions Pvt Ltd, Mangalore', 12.9141, 74.8560, TRUE)
ON DUPLICATE KEY UPDATE location_name = VALUES(location_name);

-- Default Holidays (Indian National Holidays for 2025)
INSERT INTO holidays (holiday_name, holiday_date, holiday_type, is_mandatory) VALUES
('New Year Day', '2025-01-01', 'national', TRUE),
('Republic Day', '2025-01-26', 'national', TRUE),
('Independence Day', '2025-08-15', 'national', TRUE),
('Gandhi Jayanti', '2025-10-02', 'national', TRUE),
('Diwali', '2025-10-20', 'national', TRUE)
ON DUPLICATE KEY UPDATE holiday_name = VALUES(holiday_name);

-- Views for Reporting

-- Employee Summary View
CREATE OR REPLACE VIEW v_employee_summary AS
SELECT 
    e.id,
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as full_name,
    e.email,
    e.phone,
    e.employee_type,
    e.status,
    d.department_name,
    e.designation,
    mgr.employee_id as manager_id,
    CONCAT(mgr.first_name, ' ', mgr.last_name) as manager_name,
    e.hire_date,
    DATEDIFF(CURDATE(), e.hire_date) as days_since_hire,
    e.basic_salary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN employees mgr ON e.reporting_manager_id = mgr.id;

-- Current Month Attendance Summary
CREATE OR REPLACE VIEW v_monthly_attendance_summary AS
SELECT 
    e.id as employee_id,
    e.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
    YEAR(CURDATE()) as year,
    MONTH(CURDATE()) as month,
    COUNT(ar.id) as total_working_days,
    SUM(CASE WHEN ar.attendance_status = 'present' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN ar.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_days,
    SUM(CASE WHEN ar.attendance_status = 'on_leave' THEN 1 ELSE 0 END) as leave_days,
    SUM(CASE WHEN ar.is_late = TRUE THEN 1 ELSE 0 END) as late_days,
    SUM(ar.total_hours) as total_hours_worked,
    SUM(ar.overtime_hours) as total_overtime_hours
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
    AND YEAR(ar.attendance_date) = YEAR(CURDATE())
    AND MONTH(ar.attendance_date) = MONTH(CURDATE())
WHERE e.status = 'active'
GROUP BY e.id, e.employee_id, employee_name;