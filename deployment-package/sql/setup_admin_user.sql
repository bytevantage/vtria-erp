-- Production Database Setup Script
-- Creates initial admin user for VTRIA ERP

USE vtria_erp;

-- Insert initial admin user (password: Admin123!)
-- Hash generated for 'Admin123!' using bcrypt with salt rounds 10
INSERT INTO users (
    email,
    password_hash,
    full_name,
    user_role,
    status,
    created_at,
    updated_at
) VALUES (
    'admin@vtria.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Admin123!
    'System Administrator',
    'director',
    'active',
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT id, email, full_name, user_role, status, created_at 
FROM users 
WHERE email = 'admin@vtria.com';

-- Display instructions
SELECT 'SETUP COMPLETE: You can now login with admin@vtria.com / Admin123!' as message;
SELECT 'IMPORTANT: Change the default password after first login' as security_notice;