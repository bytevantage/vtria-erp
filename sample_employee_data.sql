-- Sample Employee Data for VTRIA ERP
-- This file adds sample employees to demonstrate the Employee Management System

INSERT INTO employees (
    employee_id, first_name, last_name, email, phone, 
    employee_type, status, hire_date, department_id, designation, basic_salary
) VALUES
-- Human Resources Department
('EMP/2024/001', 'Sarah', 'Johnson', 'sarah.johnson@vtria.com', '9876543210', 
 'full_time', 'active', '2023-01-15', 1, 'HR Manager', 55000.00),
('EMP/2024/002', 'Michael', 'Davis', 'michael.davis@vtria.com', '9876543211', 
 'full_time', 'active', '2023-03-20', 1, 'HR Executive', 35000.00),

-- Information Technology Department  
('EMP/2024/003', 'Priya', 'Sharma', 'priya.sharma@vtria.com', '9876543212', 
 'full_time', 'active', '2022-08-10', 2, 'Software Developer', 65000.00),
('EMP/2024/004', 'Rajesh', 'Kumar', 'rajesh.kumar@vtria.com', '9876543213', 
 'full_time', 'active', '2023-02-14', 2, 'Senior Developer', 85000.00),
('EMP/2024/005', 'Anita', 'Patel', 'anita.patel@vtria.com', '9876543214', 
 'full_time', 'active', '2023-06-01', 2, 'UI/UX Designer', 45000.00),
('EMP/2024/006', 'Deepak', 'Singh', 'deepak.singh@vtria.com', '9876543215', 
 'contract', 'active', '2024-01-10', 2, 'DevOps Engineer', 70000.00),

-- Finance & Accounts Department
('EMP/2024/007', 'Meera', 'Nair', 'meera.nair@vtria.com', '9876543216', 
 'full_time', 'active', '2022-11-25', 3, 'Finance Manager', 75000.00),
('EMP/2024/008', 'Vikram', 'Gupta', 'vikram.gupta@vtria.com', '9876543217', 
 'full_time', 'active', '2023-04-18', 3, 'Accountant', 40000.00),
('EMP/2024/009', 'Kavya', 'Reddy', 'kavya.reddy@vtria.com', '9876543218', 
 'part_time', 'active', '2023-09-05', 3, 'Accounts Assistant', 25000.00),

-- Sales & Marketing Department
('EMP/2024/010', 'Arjun', 'Mehta', 'arjun.mehta@vtria.com', '9876543219', 
 'full_time', 'active', '2022-06-12', 4, 'Sales Manager', 80000.00),
('EMP/2024/011', 'Sneha', 'Joshi', 'sneha.joshi@vtria.com', '9876543220', 
 'full_time', 'active', '2023-05-30', 4, 'Marketing Executive', 38000.00),
('EMP/2024/012', 'Rohit', 'Agarwal', 'rohit.agarwal@vtria.com', '9876543221', 
 'full_time', 'active', '2023-07-22', 4, 'Sales Executive', 42000.00),
('EMP/2024/013', 'Pooja', 'Malhotra', 'pooja.malhotra@vtria.com', '9876543222', 
 'full_time', 'on_leave', '2023-02-28', 4, 'Business Development', 50000.00),

-- Operations Department
('EMP/2024/014', 'Suresh', 'Yadav', 'suresh.yadav@vtria.com', '9876543223', 
 'full_time', 'active', '2022-10-08', 5, 'Operations Manager', 70000.00),
('EMP/2024/015', 'Ritu', 'Kapoor', 'ritu.kapoor@vtria.com', '9876543224', 
 'full_time', 'active', '2023-08-15', 5, 'Production Supervisor', 48000.00),
('EMP/2024/016', 'Manish', 'Trivedi', 'manish.trivedi@vtria.com', '9876543225', 
 'full_time', 'active', '2023-01-30', 5, 'Quality Analyst', 45000.00),
('EMP/2024/017', 'Nisha', 'Bansal', 'nisha.bansal@vtria.com', '9876543226', 
 'intern', 'active', '2024-06-01', 5, 'Operations Intern', 15000.00),

-- Additional employees with different statuses
('EMP/2024/018', 'Amit', 'Saxena', 'amit.saxena@vtria.com', '9876543227', 
 'full_time', 'inactive', '2022-12-12', 2, 'System Admin', 60000.00),
('EMP/2024/019', 'Divya', 'Chandra', 'divya.chandra@vtria.com', '9876543228', 
 'consultant', 'active', '2024-03-15', 1, 'HR Consultant', 90000.00),
('EMP/2024/020', 'Karan', 'Sethi', 'karan.sethi@vtria.com', '9876543229', 
 'full_time', 'on_leave', '2023-11-20', 3, 'Tax Specialist', 52000.00);