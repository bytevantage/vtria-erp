-- ===================================
-- HR Module Enhancement Migration
-- Date: 2024-09-18
-- Description: Essential HR schema enhancements
-- ===================================

-- Add critical employee fields
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5) AFTER gender,
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20) AFTER phone,
ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20) AFTER pan_number,
ADD COLUMN IF NOT EXISTS uan_number VARCHAR(20) AFTER aadhar_number,
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(30) AFTER basic_salary,
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100) AFTER bank_account_number,
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20) AFTER bank_name;

-- Enhanced documents table
CREATE TABLE IF NOT EXISTS employee_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    document_type ENUM('aadhar', 'pan', 'passport', 'visa', 'resume', 'offer_letter', 'other') NOT NULL,
    document_number VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS employee_emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Skills tracking
CREATE TABLE IF NOT EXISTS employee_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'expert') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_skill (employee_id, skill_name)
);

-- Leave balance tracking
CREATE TABLE IF NOT EXISTS employee_leave_balance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    year YEAR NOT NULL,
    entitled_days DECIMAL(5,1) NOT NULL,
    pending_days DECIMAL(5,1) DEFAULT 0,
    approved_days DECIMAL(5,1) DEFAULT 0,
    remaining_days DECIMAL(5,1) GENERATED ALWAYS AS (entitled_days - pending_days - approved_days) STORED,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_leave_balance (employee_id, leave_type_id, year)
);

-- Performance reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    review_date DATE NOT NULL,
    reviewer_id INT NOT NULL,
    rating DECIMAL(3,1) NOT NULL,
    comments TEXT,
    goals TEXT,
    next_review_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES employees(id) ON DELETE CASCADE
);
