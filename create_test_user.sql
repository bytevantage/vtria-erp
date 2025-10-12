-- Create test user for API testing
-- Password: TestPayroll@2025

-- First, check if test user exists
DELETE FROM users WHERE email = 'test.payroll@vtria.com';

-- Insert test user with hashed password (bcrypt hash of 'TestPayroll@2025')
-- Note: You'll need to generate this hash using bcrypt in Node.js
-- For now, let's use the same hash as another admin user

INSERT INTO users (
    email,
    password_hash,
    full_name,
    user_role,
    status,
    first_name,
    last_name,
    phone,
    is_active
) VALUES (
    'test.payroll@vtria.com',
    '$2b$10$abcdefghijklmnopqrstuv',  -- This needs to be updated with actual hash
    'Test Payroll User',
    'admin',
    'active',
    'Test',
    'Payroll',
    '+91-9876543210',
    1
);

SELECT 'Test user created successfully' as message;
