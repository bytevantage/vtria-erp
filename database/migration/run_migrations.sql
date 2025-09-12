-- VTRIA ERP Database Migration Runner
-- Execute this script to create the complete database schema
-- Run as: psql -U postgres -d vtria_erp_dev -f run_migrations.sql

\echo 'Starting VTRIA ERP Database Migration...'
\echo ''

-- Set client encoding and timezone
SET client_encoding = 'UTF8';
SET timezone = 'Asia/Kolkata';

\echo 'Step 1: Creating database structure and types...'
\i 'C:/wamp64/www/vtria-erp/database/schema/01_create_database.sql'

\echo 'Step 2: Creating locations and users tables...'
\i 'C:/wamp64/www/vtria-erp/database/schema/02_locations_and_users.sql'

\echo 'Step 3: Creating products and stock tables...'
\i 'C:/wamp64/www/vtria-erp/database/schema/03_products_and_stock.sql'

\echo 'Step 4: Creating cases and tickets tables...'
\i 'C:/wamp64/www/vtria-erp/database/schema/04_cases_and_tickets.sql'

\echo 'Step 5: Creating documents and notifications tables...'
\i 'C:/wamp64/www/vtria-erp/database/schema/05_documents_and_notifications.sql'

\echo 'Step 6: Creating audit logs and views...'
\i 'C:/wamp64/www/vtria-erp/database/schema/06_audit_and_views.sql'

\echo 'Step 7: Seeding initial data...'
\i 'C:/wamp64/www/vtria-erp/database/schema/07_seed_data.sql'

\echo ''
\echo 'VTRIA ERP Database Migration Completed Successfully!'
\echo ''
\echo 'Default Admin Login:'
\echo 'Email: admin@vtria.com'
\echo 'Password: VtriaAdmin@2024'
\echo ''

-- Verify installation
SELECT 'Database Tables Created:' as status, COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT 'Database Views Created:' as status, COUNT(*) as view_count 
FROM information_schema.views 
WHERE table_schema = 'public';

SELECT 'Initial Data Summary:' as status;
SELECT 'Locations' as table_name, COUNT(*) as record_count FROM locations
UNION ALL
SELECT 'Roles', COUNT(*) FROM roles
UNION ALL  
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'Product Categories', COUNT(*) FROM product_categories
UNION ALL
SELECT 'Manufacturers', COUNT(*) FROM manufacturers
UNION ALL
SELECT 'Case Queues', COUNT(*) FROM case_queues
UNION ALL
SELECT 'Document Categories', COUNT(*) FROM document_categories
UNION ALL
SELECT 'System Settings', COUNT(*) FROM system_settings
ORDER BY table_name;
