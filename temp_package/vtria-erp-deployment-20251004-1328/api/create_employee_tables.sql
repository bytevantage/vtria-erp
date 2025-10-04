-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    employee_type ENUM('full_time', 'part_time', 'contract', 'intern', 'consultant') DEFAULT 'full_time',
    status ENUM('active', 'inactive', 'terminated', 'on_leave') DEFAULT 'active',
    
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    
    hire_date DATE NOT NULL,
    termination_date DATE,
    probation_end_date DATE,
    confirmation_date DATE,
    
    department_id INT,
    designation VARCHAR(100),
    reporting_manager_id INT,
    work_location VARCHAR(100),
    
    basic_salary DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'INR',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    updated_by INT,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_department (department_id),
    INDEX idx_hire_date (hire_date)
);

-- Create leave_types table
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
    
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_hierarchy_levels INT DEFAULT 1,
    advance_notice_days INT DEFAULT 0,
    
    applicable_after_months INT DEFAULT 0,
    prorate_first_year BOOLEAN DEFAULT TRUE,
    
    gender_specific ENUM('all', 'male', 'female', 'other') DEFAULT 'all',
    employee_type_applicable JSON,
    
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_leave_code (leave_code),
    INDEX idx_status (status)
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    shift_id INT,
    
    check_in_time TIMESTAMP,
    check_in_location VARCHAR(200),
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_in_method ENUM('manual', 'biometric', 'mobile_gps', 'web', 'admin_entry') DEFAULT 'manual',
    check_in_device_info JSON,
    
    check_out_time TIMESTAMP,
    check_out_location VARCHAR(200),
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_out_method ENUM('manual', 'biometric', 'mobile_gps', 'web', 'admin_entry') DEFAULT 'manual',
    check_out_device_info JSON,
    
    total_hours DECIMAL(4,2),
    regular_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2),
    
    attendance_status ENUM('present', 'absent', 'partial_day', 'on_leave', 'holiday', 'weekend') DEFAULT 'present',
    is_late BOOLEAN DEFAULT FALSE,
    late_minutes INT DEFAULT 0,
    is_early_departure BOOLEAN DEFAULT FALSE,
    early_departure_minutes INT DEFAULT 0,
    
    break_start_time TIMESTAMP,
    break_end_time TIMESTAMP,
    actual_break_minutes INT DEFAULT 0,
    
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    approved_by INT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    remarks TEXT,
    modified_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_employee_date (employee_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_attendance_status (attendance_status),
    INDEX idx_employee_date_range (employee_id, attendance_date)
);

-- Insert default departments
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

-- Insert default leave types
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