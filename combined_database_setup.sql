-- VTRIA ERP Combined Database Setup Script
-- This script combines all migration files into a single script for easier execution

-- Create database (uncomment if running as postgres superuser)
-- DROP DATABASE IF EXISTS vtria_erp_dev;
-- CREATE DATABASE vtria_erp_dev;
-- \c vtria_erp_dev

-- Set client encoding and timezone
SET client_encoding = 'UTF8';
SET timezone = 'Asia/Kolkata';

-- =============================================
-- 01_create_database.sql
-- =============================================
-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB GIN indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create custom types for better data integrity
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE case_status AS ENUM ('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled');
CREATE TYPE case_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE stock_status AS ENUM ('available', 'reserved', 'sold', 'damaged', 'returned');
CREATE TYPE warranty_status AS ENUM ('active', 'expired', 'claimed', 'void');
CREATE TYPE document_type AS ENUM ('manual', 'specification', 'certificate', 'invoice', 'warranty', 'report', 'other');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'sms');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout');

-- =============================================
-- 02_locations_and_users.sql
-- =============================================
-- Locations Table
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  level INT NOT NULL,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  status user_status DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Roles Table (Many-to-Many)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Locations Table (Many-to-Many)
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings Table
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 03_products_and_stock.sql
-- =============================================
-- Product Categories Table
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES product_categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturers Table
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  contact_info JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  description TEXT,
  category_id UUID REFERENCES product_categories(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  specifications JSONB,
  unit_price DECIMAL(10, 2),
  warranty_period INT, -- in months
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Batches Table
CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  batch_number VARCHAR(50) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  purchase_date DATE,
  expiry_date DATE,
  quantity INT NOT NULL,
  unit_cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Table
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES locations(id),
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES product_batches(id),
  quantity INT NOT NULL,
  min_quantity INT DEFAULT 0,
  last_updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(location_id, product_id, batch_id)
);

-- Stock Items Table (Serial Number Tracking)
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id),
  serial_number VARCHAR(100) UNIQUE,
  status stock_status DEFAULT 'available',
  vendor_warranty_start DATE,
  vendor_warranty_end DATE,
  customer_warranty_start DATE,
  customer_warranty_end DATE,
  customer_id UUID REFERENCES customers(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Movements Table
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id UUID NOT NULL REFERENCES stocks(id),
  stock_item_id UUID REFERENCES stock_items(id),
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  quantity INT NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  reference_id UUID, -- Can reference a case, ticket, etc.
  reference_type VARCHAR(50),
  performed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 04_cases_and_tickets.sql
-- =============================================
-- Case Queues Table
CREATE TABLE case_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allowed_roles JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cases Table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customer_id UUID REFERENCES customers(id),
  status case_status DEFAULT 'new',
  priority case_priority DEFAULT 'medium',
  queue_id UUID REFERENCES case_queues(id),
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  due_date TIMESTAMP,
  sla_breach_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case Notes Table
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case Status History Table
CREATE TABLE case_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status case_status,
  to_status case_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customer_id UUID REFERENCES customers(id),
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  related_case_id UUID REFERENCES cases(id),
  due_date TIMESTAMP,
  sla_breach_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Notes Table
CREATE TABLE ticket_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Status History Table
CREATE TABLE ticket_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Parts Table
CREATE TABLE ticket_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES stock_items(id),
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  added_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 05_documents_and_notifications.sql
-- =============================================
-- Document Categories Table
CREATE TABLE document_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents Table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  document_type document_type NOT NULL,
  category_id UUID REFERENCES document_categories(id),
  case_id UUID REFERENCES cases(id),
  ticket_id UUID REFERENCES tickets(id),
  product_id UUID REFERENCES products(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  version INT DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Versions Table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  notification_type notification_type DEFAULT 'info',
  channel notification_channel DEFAULT 'in_app',
  reference_id UUID,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 06_audit_and_views.sql
-- =============================================
-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action audit_action NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login History Table
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address VARCHAR(50),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  failure_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create view for warranty tracking
CREATE OR REPLACE VIEW warranty_tracking AS
SELECT 
  si.id AS stock_item_id,
  si.serial_number,
  p.name AS product_name,
  p.sku,
  m.name AS manufacturer,
  si.vendor_warranty_start,
  si.vendor_warranty_end,
  si.customer_warranty_start,
  si.customer_warranty_end,
  c.name AS customer_name,
  c.contact_person,
  c.email AS customer_email,
  c.phone AS customer_phone,
  l.name AS location_name,
  CASE 
    WHEN si.vendor_warranty_end < CURRENT_DATE THEN 'expired'
    WHEN si.vendor_warranty_end < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS vendor_warranty_status,
  CASE 
    WHEN si.customer_warranty_end < CURRENT_DATE THEN 'expired'
    WHEN si.customer_warranty_end < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'active'
  END AS customer_warranty_status
FROM 
  stock_items si
JOIN 
  stocks s ON si.stock_id = s.id
JOIN 
  products p ON s.product_id = p.id
JOIN 
  locations l ON s.location_id = l.id
LEFT JOIN 
  manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN 
  customers c ON si.customer_id = c.id
WHERE 
  si.status != 'damaged';

-- Create view for case aging analysis
CREATE OR REPLACE VIEW case_aging AS
SELECT 
  c.id AS case_id,
  c.title,
  c.status,
  c.priority,
  c.created_at,
  c.updated_at,
  c.due_date,
  c.sla_breach_at,
  u.first_name || ' ' || u.last_name AS assigned_to_name,
  l.name AS location_name,
  cq.name AS queue_name,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/3600 AS age_hours,
  CASE 
    WHEN c.status IN ('resolved', 'closed', 'cancelled') THEN 'completed'
    WHEN c.sla_breach_at < CURRENT_TIMESTAMP THEN 'breached'
    WHEN c.sla_breach_at < CURRENT_TIMESTAMP + INTERVAL '24 hours' THEN 'at_risk'
    ELSE 'on_track'
  END AS sla_status
FROM 
  cases c
LEFT JOIN 
  users u ON c.assigned_to = u.id
JOIN 
  locations l ON c.location_id = l.id
LEFT JOIN 
  case_queues cq ON c.queue_id = cq.id;

-- Create view for stock summary
CREATE OR REPLACE VIEW stock_summary AS
SELECT 
  l.name AS location_name,
  p.name AS product_name,
  p.sku,
  pc.name AS category_name,
  SUM(s.quantity) AS total_quantity,
  s.min_quantity,
  CASE 
    WHEN SUM(s.quantity) <= s.min_quantity THEN TRUE
    ELSE FALSE
  END AS low_stock
FROM 
  stocks s
JOIN 
  locations l ON s.location_id = l.id
JOIN 
  products p ON s.product_id = p.id
LEFT JOIN 
  product_categories pc ON p.category_id = pc.id
GROUP BY 
  l.name, p.name, p.sku, pc.name, s.min_quantity;

-- Create view for user activity
CREATE OR REPLACE VIEW user_activity AS
SELECT 
  u.id AS user_id,
  u.first_name || ' ' || u.last_name AS user_name,
  u.email,
  r.name AS role_name,
  l.name AS location_name,
  COUNT(DISTINCT c.id) AS assigned_cases,
  COUNT(DISTINCT t.id) AS assigned_tickets,
  MAX(u.last_login) AS last_login,
  COUNT(DISTINCT al.id) AS audit_actions,
  MAX(al.created_at) AS last_activity
FROM 
  users u
LEFT JOIN 
  user_roles ur ON u.id = ur.user_id
LEFT JOIN 
  roles r ON ur.role_id = r.id
LEFT JOIN 
  user_locations ul ON u.id = ul.user_id
LEFT JOIN 
  locations l ON ul.location_id = l.id
LEFT JOIN 
  cases c ON u.id = c.assigned_to AND c.status NOT IN ('resolved', 'closed', 'cancelled')
LEFT JOIN 
  tickets t ON u.id = t.assigned_to AND t.status NOT IN ('resolved', 'closed')
LEFT JOIN 
  audit_logs al ON u.id = al.user_id
WHERE 
  u.status = 'active'
GROUP BY 
  u.id, u.first_name, u.last_name, u.email, r.name, l.name;

-- =============================================
-- 07_seed_data.sql
-- =============================================
-- Insert roles
INSERT INTO roles (name, description, level, permissions) VALUES
('Director', 'Full system access and administration', 5, '["user.create", "user.read", "user.update", "user.delete", "case.create", "case.read", "case.update", "case.delete", "stock.create", "stock.read", "stock.update", "stock.delete", "document.create", "document.read", "document.update", "document.delete", "report.generate", "system.admin"]'),
('Manager', 'Management level access with reporting', 4, '["user.read", "case.create", "case.read", "case.update", "stock.read", "stock.update", "document.read", "document.create", "report.generate"]'),
('Sales Admin', 'Sales and customer management', 3, '["case.create", "case.read", "case.update", "document.read", "document.create"]'),
('Engineer', 'Technical case handling and stock management', 2, '["case.read", "case.update", "stock.read", "stock.update", "document.read", "document.create"]'),
('User', 'Basic user access', 1, '["case.read", "document.read"]');

-- Insert locations
INSERT INTO locations (name, code, address, city, state, country, postal_code) VALUES
('Mangalore Office', 'MNG', 'VTRIA Engineering Solutions Pvt Ltd, Mangalore', 'Mangalore', 'Karnataka', 'India', '575001'),
('Bangalore Office', 'BLR', 'VTRIA Engineering Solutions Pvt Ltd, Bangalore', 'Bangalore', 'Karnataka', 'India', '560001'),
('Pune Office', 'PUN', 'VTRIA Engineering Solutions Pvt Ltd, Pune', 'Pune', 'Maharashtra', 'India', '411001');

-- Insert product categories
INSERT INTO product_categories (name, description) VALUES
('Electronics', 'Electronic components and devices'),
('Mechanical', 'Mechanical parts and assemblies'),
('Tools', 'Tools and equipment'),
('Consumables', 'Consumable items and supplies');

-- Insert manufacturers
INSERT INTO manufacturers (name, contact_info) VALUES
('ABC Electronics', '{"contact": "John Smith", "email": "john@abcelectronics.com", "phone": "+91-9876543210"}'),
('XYZ Mechanics', '{"contact": "Jane Doe", "email": "jane@xyzmechanics.com", "phone": "+91-9876543211"}'),
('Tools & Co', '{"contact": "Robert Johnson", "email": "robert@toolsco.com", "phone": "+91-9876543212"}');

-- Insert case queues
INSERT INTO case_queues (name, description, allowed_roles) VALUES
('Sales', 'Sales related enquiries and cases', '["Director", "Manager", "Sales Admin"]'),
('Technical', 'Technical support and engineering cases', '["Director", "Manager", "Engineer"]'),
('Administrative', 'Administrative and general cases', '["Director", "Manager"]');

-- Insert document categories
INSERT INTO document_categories (name, description) VALUES
('Product Manuals', 'Product user manuals and guides'),
('Technical Specifications', 'Technical specifications and datasheets'),
('Certificates', 'Certificates and compliance documents'),
('Reports', 'Reports and analysis documents');

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_info', '{"name": "VTRIA Engineering Solutions Pvt Ltd", "address": "Mangalore, Karnataka, India", "phone": "+91-9876543200", "email": "info@vtria.com", "website": "https://vtria.com"}', 'Company information'),
('email_settings', '{"smtp_host": "smtp.vtria.com", "smtp_port": 587, "smtp_user": "notifications@vtria.com", "smtp_from": "VTRIA ERP <notifications@vtria.com>"}', 'Email notification settings'),
('sla_settings', '{"critical": 4, "high": 8, "medium": 24, "low": 48}', 'SLA hours by priority');

-- Create admin user with hashed password (VtriaAdmin@2024)
INSERT INTO users (email, password, first_name, last_name, employee_id, department) VALUES
('admin@vtria.com', '$2a$12$1oE8Fz5Qx7ZG3RxJV8xY5.XtZ5vZU5UEgL7S5q5HvWW5JZjZ5ZJZ5', 'System', 'Administrator', 'VTRIA001', 'IT');

-- Assign Director role to admin user
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT u.id, r.id, u.id
FROM users u, roles r
WHERE u.email = 'admin@vtria.com' AND r.name = 'Director';

-- Assign all locations to admin user
INSERT INTO user_locations (user_id, location_id)
SELECT u.id, l.id
FROM users u, locations l
WHERE u.email = 'admin@vtria.com';

-- Create test customers
INSERT INTO customers (name, contact_person, email, phone, address) VALUES
('Customer A', 'Contact A', 'contacta@customera.com', '+91-9876543220', 'Customer A Address, Mangalore'),
('Customer B', 'Contact B', 'contactb@customerb.com', '+91-9876543221', 'Customer B Address, Bangalore'),
('Customer C', 'Contact C', 'contactc@customerc.com', '+91-9876543222', 'Customer C Address, Pune');

-- Create test suppliers
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
('Supplier X', 'Contact X', 'contactx@supplierx.com', '+91-9876543230', 'Supplier X Address, Mumbai'),
('Supplier Y', 'Contact Y', 'contacty@suppliery.com', '+91-9876543231', 'Supplier Y Address, Delhi'),
('Supplier Z', 'Contact Z', 'contactz@supplierz.com', '+91-9876543232', 'Supplier Z Address, Chennai');

-- Create test products
INSERT INTO products (name, sku, description, category_id, manufacturer_id, specifications, unit_price, warranty_period) VALUES
('Product 1', 'PRD001', 'Description for Product 1', 
  (SELECT id FROM product_categories WHERE name = 'Electronics'), 
  (SELECT id FROM manufacturers WHERE name = 'ABC Electronics'),
  '{"weight": "1.5kg", "dimensions": "10x15x5cm", "power": "220V"}',
  1500.00, 12),
('Product 2', 'PRD002', 'Description for Product 2', 
  (SELECT id FROM product_categories WHERE name = 'Mechanical'), 
  (SELECT id FROM manufacturers WHERE name = 'XYZ Mechanics'),
  '{"weight": "2.5kg", "dimensions": "20x25x10cm", "material": "Steel"}',
  2500.00, 24),
('Product 3', 'PRD003', 'Description for Product 3', 
  (SELECT id FROM product_categories WHERE name = 'Tools'), 
  (SELECT id FROM manufacturers WHERE name = 'Tools & Co'),
  '{"weight": "0.5kg", "dimensions": "5x10x2cm", "material": "Carbon Steel"}',
  500.00, 6);

-- Create initial stock
INSERT INTO stocks (location_id, product_id, quantity, min_quantity, last_updated_by)
SELECT 
  l.id, 
  p.id, 
  CASE l.name
    WHEN 'Mangalore Office' THEN 10
    WHEN 'Bangalore Office' THEN 5
    WHEN 'Pune Office' THEN 3
  END,
  2,
  (SELECT id FROM users WHERE email = 'admin@vtria.com')
FROM 
  locations l, 
  products p
WHERE 
  p.sku IN ('PRD001', 'PRD002', 'PRD003');

-- Show created tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
