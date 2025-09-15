-- Apply Case Integration - Complete Database Setup Script
-- This script applies all case management changes to your database

-- Execute schema files in order
SOURCE 023_case_management_system.sql;
SOURCE 024_integrate_existing_tables_with_cases.sql;

-- Verification queries to ensure everything is set up correctly

-- Check if all required tables exist
SELECT 
    'cases' as table_name,
    COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'cases'
UNION ALL
SELECT 
    'case_state_transitions' as table_name,
    COUNT(*) as table_exists  
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'case_state_transitions'
UNION ALL
SELECT 
    'case_documents' as table_name,
    COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'case_documents';

-- Check if case_id columns were added to existing tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND column_name = 'case_id'
AND table_name IN ('sales_enquiries', 'estimations', 'quotations')
ORDER BY table_name;

-- Check if stored procedures were created
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = DATABASE() 
AND routine_name IN ('CreateCaseFromEnquiry', 'TransitionCaseToEstimation', 'TransitionCaseToQuotation')
ORDER BY routine_name;

-- Check if views were created
SELECT 
    table_name as view_name
FROM information_schema.views 
WHERE table_schema = DATABASE() 
AND table_name IN ('case_timeline', 'case_summary', 'case_workflow_status')
ORDER BY table_name;

-- Sample data insertion for testing (optional - remove in production)
-- Note: This assumes you have at least one client and user in your system

/*
-- Insert a sample client if needed
INSERT IGNORE INTO clients (id, company_name, contact_person, email, phone, address, city, state, status) 
VALUES (1, 'Test Manufacturing Ltd', 'John Doe', 'john@testmfg.com', '9876543210', '123 Industrial Estate', 'Mumbai', 'Maharashtra', 'active');

-- Insert a sample user if needed  
INSERT IGNORE INTO users (id, email, password_hash, full_name, user_role, status)
VALUES (1, 'admin@vtria.com', '$2b$10$dummy.hash.for.testing', 'System Admin', 'admin', 'active');

-- Test case creation workflow
-- Note: Uncomment these only after ensuring clients and users tables have data

-- 1. Create a sample enquiry (this should automatically create a case)
INSERT INTO sales_enquiries (
    enquiry_id, date, client_id, project_name, description, requirements, 
    priority, estimated_value, enquiry_by, status
) VALUES (
    'VESPL/EQ/2526/999', 
    CURDATE(), 
    1, 
    'Test Automation Project', 
    'Complete industrial automation system for testing case workflow',
    'PLC controls, HMI interface, motor drives, safety systems',
    'medium',
    500000.00,
    1,
    'new'
);

-- Get the enquiry ID for creating case
SET @enquiry_id = LAST_INSERT_ID();

-- Create case from enquiry
CALL CreateCaseFromEnquiry(@enquiry_id, 1);

-- Verify the case was created
SELECT 
    c.case_number,
    c.current_state,
    se.enquiry_id,
    se.project_name
FROM cases c
JOIN sales_enquiries se ON c.enquiry_id = se.id
WHERE se.id = @enquiry_id;
*/

-- Display final status
SELECT 
    'Case Management System Installation Complete' as status,
    NOW() as completed_at;