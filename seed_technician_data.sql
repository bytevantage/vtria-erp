-- Seed initial technician profile data
-- This script populates the technician profile tables with realistic sample data

-- First, ensure we have some basic master data for skills
INSERT IGNORE INTO skills_master (skill_name, skill_category, description) VALUES
('PLC Programming', 'Automation', 'Programming and configuration of Programmable Logic Controllers'),
('SCADA Systems', 'Automation', 'Supervisory Control and Data Acquisition systems'),
('Industrial Networks', 'Networking', 'Industrial communication protocols and networks'),
('Process Control', 'Control Systems', 'Process control design and implementation'),
('Instrumentation', 'Measurement', 'Industrial instrumentation and calibration'),
('DCS Systems', 'Control Systems', 'Distributed Control Systems'),
('HMI Development', 'User Interface', 'Human Machine Interface development'),
('Safety Systems', 'Safety', 'Safety Instrumented Systems and safety protocols'),
('Electrical Design', 'Electrical', 'Electrical system design and analysis'),
('Motor Control', 'Electrical', 'Motor control circuits and drives'),
('Project Management', 'Management', 'Project planning and execution'),
('Troubleshooting', 'Problem Solving', 'System diagnosis and problem resolution'),
('Customer Training', 'Training', 'Technical training and knowledge transfer'),
('System Integration', 'Integration', 'System integration and commissioning'),
('Documentation', 'Documentation', 'Technical documentation and reporting');

-- Insert certifications master data
INSERT IGNORE INTO certifications_master (certification_name, issuing_body, validity_period_months, typical_cost_inr) VALUES
('Siemens S7 Certified', 'Siemens', 36, 2500.00),
('Rockwell Automation Expert', 'Rockwell Automation', 24, 3000.00),
('Schneider Electric Certified', 'Schneider Electric', 36, 2200.00),
('ABB Certified Engineer', 'ABB', 24, 2800.00),
('Honeywell DCS Expert', 'Honeywell', 36, 3500.00),
('Emerson DeltaV Specialist', 'Emerson', 24, 3200.00),
('PMP Certified', 'PMI', 36, 4000.00),
('Functional Safety Certified', 'TUV', 60, 5000.00),
('ISA Certified Automation Professional', 'ISA', 36, 1800.00),
('NEMA Certified Technician', 'NEMA', 24, 1500.00);

-- Insert specializations master data
INSERT IGNORE INTO specializations_master (specialization_name, category, description) VALUES
('Process Automation', 'automation', 'Specialization in process industry automation'),
('Factory Automation', 'automation', 'Manufacturing and factory automation expertise'),
('Building Automation', 'automation', 'Building management and automation systems'),
('Water Treatment Systems', 'control_systems', 'Water and wastewater treatment automation'),
('Oil & Gas Systems', 'control_systems', 'Oil and gas industry automation and control'),
('Pharmaceutical Systems', 'automation', 'Pharmaceutical manufacturing automation'),
('Food & Beverage', 'automation', 'Food and beverage industry automation'),
('Power Generation', 'electrical', 'Power plant automation and control'),
('Mining & Minerals', 'automation', 'Mining industry automation systems'),
('Automotive Manufacturing', 'automation', 'Automotive production line automation'),
('Chemical Processing', 'control_systems', 'Chemical industry process control'),
('HVAC Systems', 'mechanical', 'Heating, ventilation, and air conditioning systems'),
('Fire & Safety Systems', 'instrumentation', 'Fire detection and safety system integration'),
('Energy Management', 'electrical', 'Energy management and optimization systems'),
('Robotics Integration', 'automation', 'Industrial robotics integration and programming');

-- Add some sample skills to existing employees who are technicians/engineers
-- First, let's add skills for employees who have technician or engineer roles
INSERT INTO employee_skills (employee_id, skill_name, proficiency_level)
SELECT 
    e.id as employee_id,
    s.skill_name as skill_name,
    CASE 
        WHEN RAND() > 0.7 THEN 'expert'
        WHEN RAND() > 0.4 THEN 'advanced'
        WHEN RAND() > 0.2 THEN 'intermediate'
        ELSE 'beginner'
    END as proficiency_level
FROM employees e
CROSS JOIN skills_master s
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')
AND e.status = 'active'
AND RAND() > 0.5  -- Only assign ~50% of possible skill combinations
ON DUPLICATE KEY UPDATE proficiency_level = VALUES(proficiency_level);

-- Add certifications to employees
INSERT INTO employee_certifications (employee_id, certification_id, obtained_date, expiry_date, status, cost_incurred)
SELECT 
    e.id as employee_id,
    c.id as certification_id,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as obtained_date,
    DATE_ADD(DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY), INTERVAL c.validity_period_months MONTH) as expiry_date,
    CASE 
        WHEN RAND() > 0.8 THEN 'expired'
        WHEN RAND() > 0.1 THEN 'active'
        ELSE 'suspended'
    END as status,
    c.typical_cost_inr * (0.8 + RAND() * 0.4) as cost_incurred  -- Some variation in actual cost
FROM employees e
CROSS JOIN certifications_master c
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')
AND e.status = 'active'
AND RAND() > 0.7  -- Only ~30% of employees have each certification
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- Add specializations to employees
INSERT INTO employee_specializations (employee_id, specialization_id, years_of_experience, projects_completed, last_project_date, proficiency_level)
SELECT 
    e.id as employee_id,
    s.id as specialization_id,
    ROUND(RAND() * 8 + 1, 1) as years_of_experience,
    FLOOR(RAND() * 15) + 1 as projects_completed,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 180) DAY) as last_project_date,
    CASE 
        WHEN RAND() > 0.6 THEN 'expert'
        WHEN RAND() > 0.3 THEN 'proficient'
        ELSE 'competent'
    END as proficiency_level
FROM employees e
CROSS JOIN specializations_master s
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')
AND e.status = 'active'
AND RAND() > 0.6  -- Only ~40% of employees have each specialization
ON DUPLICATE KEY UPDATE years_of_experience = VALUES(years_of_experience);

-- Add employee experience records
INSERT INTO employee_experience (employee_id, total_experience_years, seniority_level, previous_companies, key_achievements, career_progression)
SELECT 
    e.id as employee_id,
    GREATEST(ROUND(DATEDIFF(CURDATE(), e.hire_date) / 365.25, 1), ROUND(RAND() * 15 + 2, 1)) as total_experience_years,
    CASE 
        WHEN ROUND(DATEDIFF(CURDATE(), e.hire_date) / 365.25, 1) >= 8 THEN 'senior'
        WHEN ROUND(DATEDIFF(CURDATE(), e.hire_date) / 365.25, 1) >= 4 THEN 'mid-level'
        ELSE 'junior'
    END as seniority_level,
    JSON_ARRAY(
        JSON_OBJECT('company', 'TechCorp Solutions', 'duration', '2 years', 'role', 'Automation Engineer'),
        JSON_OBJECT('company', 'Industrial Systems Ltd', 'duration', '3 years', 'role', 'Control Systems Engineer')
    ) as previous_companies,
    JSON_ARRAY(
        'Successfully implemented 15+ automation projects',
        'Reduced system downtime by 30% through preventive maintenance',
        'Led team of 5 engineers in major plant upgrade',
        'Certified in multiple industrial automation platforms'
    ) as key_achievements,
    JSON_ARRAY(
        JSON_OBJECT('year', 2020, 'role', 'Junior Engineer', 'achievement', 'First automation project completion'),
        JSON_OBJECT('year', 2022, 'role', 'Engineer', 'achievement', 'Team lead promotion'),
        JSON_OBJECT('year', 2024, 'role', 'Senior Engineer', 'achievement', 'Advanced certification earned')
    ) as career_progression
FROM employees e
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')
AND e.status = 'active'
ON DUPLICATE KEY UPDATE total_experience_years = VALUES(total_experience_years);

-- Add some project assignments
INSERT INTO employee_project_assignments (employee_id, project_name, client_name, start_date, end_date, role_in_project, project_status, technologies_used)
SELECT 
    e.id as employee_id,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'Factory Automation Upgrade'
        WHEN 1 THEN 'Water Treatment Plant Control System'
        WHEN 2 THEN 'Manufacturing Line Integration'
        WHEN 3 THEN 'Building Management System'
        ELSE 'Process Control Implementation'
    END as project_name,
    CASE FLOOR(RAND() * 5)
        WHEN 0 THEN 'ABC Manufacturing'
        WHEN 1 THEN 'XYZ Industries'
        WHEN 2 THEN 'DEF Corporation'
        WHEN 3 THEN 'GHI Enterprises'
        ELSE 'JKL Systems'
    END as client_name,
    DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY) as start_date,
    CASE 
        WHEN RAND() > 0.3 THEN DATE_ADD(DATE_SUB(CURDATE(), INTERVAL FLOOR(RAND() * 365) DAY), INTERVAL FLOOR(RAND() * 180) + 30 DAY)
        ELSE NULL  -- 30% of projects are ongoing
    END as end_date,
    CASE FLOOR(RAND() * 4)
        WHEN 0 THEN 'Lead Engineer'
        WHEN 1 THEN 'Project Engineer'
        WHEN 2 THEN 'Controls Engineer'
        ELSE 'Systems Engineer'
    END as role_in_project,
    CASE 
        WHEN RAND() > 0.6 THEN 'completed'
        WHEN RAND() > 0.2 THEN 'in_progress'
        ELSE 'on_hold'
    END as project_status,
    JSON_ARRAY('Siemens S7', 'Schneider Unity', 'Wonderware SCADA', 'ABB DCS') as technologies_used
FROM employees e
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')
AND e.status = 'active'
AND RAND() > 0.4  -- 60% of employees have project assignments
ON DUPLICATE KEY UPDATE project_status = VALUES(project_status);

-- Display summary of seeded data
SELECT 'Technician Profile Data Seeded Successfully' as Status;

SELECT 
    'Skills' as DataType,
    COUNT(*) as RecordsCreated
FROM employee_skills es
JOIN employees e ON es.employee_id = e.id
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')

UNION ALL

SELECT 
    'Certifications' as DataType,
    COUNT(*) as RecordsCreated
FROM employee_certifications ec
JOIN employees e ON ec.employee_id = e.id
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')

UNION ALL

SELECT 
    'Specializations' as DataType,
    COUNT(*) as RecordsCreated
FROM employee_specializations esp
JOIN employees e ON esp.employee_id = e.id
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')

UNION ALL

SELECT 
    'Experience Records' as DataType,
    COUNT(*) as RecordsCreated
FROM employee_experience ee
JOIN employees e ON ee.employee_id = e.id
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%')

UNION ALL

SELECT 
    'Project Assignments' as DataType,
    COUNT(*) as RecordsCreated
FROM employee_project_assignments epa
JOIN employees e ON epa.employee_id = e.id
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%' OR e.designation LIKE '%specialist%');