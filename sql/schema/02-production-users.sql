-- Production Users Setup for VTRIA ERP
-- This script creates the default users for production deployment

USE vtria_erp;

-- Create admin user
INSERT IGNORE INTO users (email, password_hash, full_name, user_role, status) 
VALUES ('admin@vtria.com', '$2b$10$EIU7YqUqeSiZ.xK7ObfKruuI.AEQ8EcvCQf8l3KJw8xO2p4uxH0yC', 'System Administrator', 'admin', 'active');

-- Create director user  
INSERT IGNORE INTO users (email, password_hash, full_name, user_role, status)
VALUES ('director@vtria.com', '$2b$10$mfyY4LBOFlxZWYR.LYYJKu7iK0Z4Ho3TQM7mcdah0gOYxZBJo2XkG', 'Director', 'director', 'active');

-- Create manager user
INSERT IGNORE INTO users (email, password_hash, full_name, user_role, status)
VALUES ('manager@vtria.com', '$2b$10$lYjdRzCQVVNKVJ9tV.wC.uP0KqBRHJB8yO2jgYuyTgHQ4jHftwqsC', 'Manager', 'admin', 'active');

-- Default passwords (change after first login):
-- admin@vtria.com: Admin123!
-- director@vtria.com: VtriaDir2025!  
-- manager@vtria.com: Manager2025!
