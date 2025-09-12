-- VTRIA ERP Remaining Tables Setup Script for MySQL
-- This script creates the missing tables: products, stock, cases, tickets

-- Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);

-- Manufacturers Table
CREATE TABLE IF NOT EXISTS manufacturers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_info JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(191),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(191),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  sku VARCHAR(50) UNIQUE,
  description TEXT,
  category_id VARCHAR(36),
  manufacturer_id VARCHAR(36),
  specifications JSON,
  unit_price DECIMAL(10, 2),
  warranty_period INT, -- in months
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES product_categories(id),
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
);

-- Product Batches Table
CREATE TABLE IF NOT EXISTS product_batches (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(36),
  purchase_date DATE,
  expiry_date DATE,
  quantity INT NOT NULL,
  unit_cost DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Stock Table
CREATE TABLE IF NOT EXISTS stocks (
  id VARCHAR(36) PRIMARY KEY,
  location_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  batch_id VARCHAR(36),
  quantity INT NOT NULL,
  min_quantity INT DEFAULT 0,
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(location_id, product_id, batch_id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (batch_id) REFERENCES product_batches(id),
  FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

-- Stock Items Table (Serial Number Tracking)
CREATE TABLE IF NOT EXISTS stock_items (
  id VARCHAR(36) PRIMARY KEY,
  stock_id VARCHAR(36) NOT NULL,
  serial_number VARCHAR(100) UNIQUE,
  status ENUM('available', 'reserved', 'sold', 'damaged', 'returned') DEFAULT 'available',
  vendor_warranty_start DATE,
  vendor_warranty_end DATE,
  customer_warranty_start DATE,
  customer_warranty_end DATE,
  customer_id VARCHAR(36),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Stock Movements Table
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(36) PRIMARY KEY,
  stock_id VARCHAR(36) NOT NULL,
  stock_item_id VARCHAR(36),
  from_location_id VARCHAR(36),
  to_location_id VARCHAR(36),
  quantity INT NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(36), -- Can reference a case, ticket, etc.
  reference_type VARCHAR(50),
  performed_by VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id),
  FOREIGN KEY (performed_by) REFERENCES users(id)
);

-- Case Queues Table
CREATE TABLE IF NOT EXISTS case_queues (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  allowed_roles JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cases Table
CREATE TABLE IF NOT EXISTS cases (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  description TEXT,
  customer_id VARCHAR(36),
  status ENUM('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled') DEFAULT 'new',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  queue_id VARCHAR(36),
  assigned_to VARCHAR(36),
  created_by VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  due_date TIMESTAMP NULL,
  sla_breach_at TIMESTAMP NULL,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (queue_id) REFERENCES case_queues(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Case Notes Table
CREATE TABLE IF NOT EXISTS case_notes (
  id VARCHAR(36) PRIMARY KEY,
  case_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Case Status History Table
CREATE TABLE IF NOT EXISTS case_status_history (
  id VARCHAR(36) PRIMARY KEY,
  case_id VARCHAR(36) NOT NULL,
  from_status ENUM('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled'),
  to_status ENUM('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled') NOT NULL,
  changed_by VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(191) NOT NULL,
  description TEXT,
  customer_id VARCHAR(36),
  status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed') DEFAULT 'open',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  assigned_to VARCHAR(36),
  created_by VARCHAR(36) NOT NULL,
  location_id VARCHAR(36) NOT NULL,
  related_case_id VARCHAR(36),
  due_date TIMESTAMP NULL,
  sla_breach_at TIMESTAMP NULL,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (related_case_id) REFERENCES cases(id)
);

-- Ticket Notes Table
CREATE TABLE IF NOT EXISTS ticket_notes (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Ticket Status History Table
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  from_status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed'),
  to_status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed') NOT NULL,
  changed_by VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Ticket Parts Table
CREATE TABLE IF NOT EXISTS ticket_parts (
  id VARCHAR(36) PRIMARY KEY,
  ticket_id VARCHAR(36) NOT NULL,
  stock_item_id VARCHAR(36),
  product_id VARCHAR(36),
  quantity INT NOT NULL,
  added_by VARCHAR(36) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (added_by) REFERENCES users(id)
);

-- Insert seed data for product categories
INSERT INTO product_categories (id, name, description) VALUES
(UUID(), 'Electronics', 'Electronic components and devices'),
(UUID(), 'Mechanical', 'Mechanical parts and assemblies'),
(UUID(), 'Tools', 'Tools and equipment'),
(UUID(), 'Consumables', 'Consumable items and supplies');

-- Insert seed data for manufacturers
INSERT INTO manufacturers (id, name, contact_info) VALUES
(UUID(), 'ABC Electronics', '{"contact": "John Smith", "email": "john@abcelectronics.com", "phone": "+91-9876543210"}'),
(UUID(), 'XYZ Mechanics', '{"contact": "Jane Doe", "email": "jane@xyzmechanics.com", "phone": "+91-9876543211"}'),
(UUID(), 'Tools & Co', '{"contact": "Robert Johnson", "email": "robert@toolsco.com", "phone": "+91-9876543212"}');

-- Insert seed data for case queues
INSERT INTO case_queues (id, name, description, allowed_roles) VALUES
(UUID(), 'Sales', 'Sales related enquiries and cases', '["Director", "Manager", "Sales Admin"]'),
(UUID(), 'Technical', 'Technical support and engineering cases', '["Director", "Manager", "Engineer"]'),
(UUID(), 'Administrative', 'Administrative and general cases', '["Director", "Manager"]');
