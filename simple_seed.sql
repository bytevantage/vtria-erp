-- Simple seed script with only basic technician data
-- Insert basic skills data
INSERT IGNORE INTO skills_master (skill_name, skill_category, description) VALUES
('PLC Programming', 'technical', 'Programming and configuration of Programmable Logic Controllers'),
('SCADA Systems', 'technical', 'Supervisory Control and Data Acquisition systems'),
('Industrial Networks', 'technical', 'Industrial communication protocols and networks'),
('Process Control', 'technical', 'Process control design and implementation'),
('System Integration', 'technical', 'System integration and commissioning');

-- Insert basic certifications
INSERT IGNORE INTO certifications_master (certification_name, issuing_body, validity_period_months, typical_cost_inr) VALUES
('Siemens S7 Certified', 'Siemens', 36, 2500.00),
('Rockwell Automation Expert', 'Rockwell Automation', 24, 3000.00),
('Schneider Electric Certified', 'Schneider Electric', 36, 2200.00);

-- Insert basic specializations
INSERT IGNORE INTO specializations_master (specialization_name, category, description) VALUES
('Process Automation', 'automation', 'Specialization in process industry automation'),
('Factory Automation', 'automation', 'Manufacturing and factory automation expertise'),
('Control Systems', 'control_systems', 'Advanced control systems design');

-- Add sample skills to technicians (simplified)
INSERT IGNORE INTO employee_skills (employee_id, skill_name, proficiency_level)
SELECT 
    e.id,
    'PLC Programming',
    'advanced'
FROM employees e
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%')
AND e.status = 'active'
LIMIT 5;

-- Add sample certifications to technicians
INSERT IGNORE INTO employee_certifications (employee_id, certification_id, obtained_date, status, cost_incurred)
SELECT 
    e.id,
    1,
    CURDATE() - INTERVAL 100 DAY,
    'active',
    2500.00
FROM employees e
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%')
AND e.status = 'active'
LIMIT 3;

-- Add sample specializations to technicians
INSERT IGNORE INTO employee_specializations (employee_id, specialization_id, years_of_experience, projects_completed, proficiency_level)
SELECT 
    e.id,
    1,
    2.5,
    5,
    'competent'
FROM employees e
WHERE (e.designation LIKE '%engineer%' OR e.designation LIKE '%technician%')
AND e.status = 'active'
LIMIT 3;

-- Summary
SELECT 'Basic technician data seeded' as Status;