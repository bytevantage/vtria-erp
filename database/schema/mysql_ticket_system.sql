-- MySQL Ticket System Schema
-- This creates the complete ticketing system tables for VTRIA ERP

-- Ticket Queues Table
CREATE TABLE IF NOT EXISTS ticket_queues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  queue_type ENUM('support', 'diagnosis', 'resolution', 'closure') NOT NULL,
  description TEXT,
  allowed_roles JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customer_id INT NOT NULL,
  contact_person VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  product_id INT,
  serial_number VARCHAR(100),
  category VARCHAR(50) DEFAULT 'support',
  issue_type VARCHAR(100),
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  source VARCHAR(50) DEFAULT 'direct',
  status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed') DEFAULT 'open',
  warranty_status ENUM('active', 'expired', 'expiring_soon') NULL,
  vendor_warranty_expiry DATE NULL,
  customer_warranty_expiry DATE NULL,
  is_warranty_claim BOOLEAN DEFAULT FALSE,
  queue_id INT,
  assigned_to INT,
  created_by INT NOT NULL,
  resolved_at TIMESTAMP NULL,
  closed_at TIMESTAMP NULL,
  resolution_summary TEXT,
  customer_satisfaction INT CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES clients(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (queue_id) REFERENCES ticket_queues(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Ticket Notes Table
CREATE TABLE IF NOT EXISTS ticket_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  title VARCHAR(200),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  is_system_generated BOOLEAN DEFAULT FALSE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Ticket Status History Table
CREATE TABLE IF NOT EXISTS ticket_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  from_status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed'),
  to_status ENUM('open', 'in_progress', 'waiting_parts', 'resolved', 'closed') NOT NULL,
  changed_by INT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Ticket Assignments Table
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  assignment_reason TEXT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Ticket Parts Table
CREATE TABLE IF NOT EXISTS ticket_parts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  product_id INT NOT NULL,
  serial_number VARCHAR(100),
  quantity INT DEFAULT 1,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  is_warranty_covered BOOLEAN DEFAULT FALSE,
  warranty_claim_reference VARCHAR(100),
  installed_date TIMESTAMP NULL,
  installed_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (installed_by) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_product ON tickets(product_id);
CREATE INDEX idx_tickets_serial ON tickets(serial_number);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_queue ON tickets(queue_id);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

CREATE INDEX idx_ticket_notes_ticket ON ticket_notes(ticket_id);
CREATE INDEX idx_ticket_notes_created_by ON ticket_notes(created_by);
CREATE INDEX idx_ticket_notes_created_at ON ticket_notes(created_at);

CREATE INDEX idx_ticket_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX idx_ticket_status_history_changed_at ON ticket_status_history(changed_at);

CREATE INDEX idx_ticket_assignments_ticket ON ticket_assignments(ticket_id);
CREATE INDEX idx_ticket_assignments_assigned_to ON ticket_assignments(assigned_to);
CREATE INDEX idx_ticket_assignments_active ON ticket_assignments(is_active);

-- Insert default ticket queues
INSERT IGNORE INTO ticket_queues (name, queue_type, description, allowed_roles) VALUES
('Support Ticket Queue', 'support', 'Initial support ticket intake', '["sales-admin", "support-staff", "engineer"]'),
('Diagnosis Queue', 'diagnosis', 'Technical diagnosis and analysis', '["engineer", "technician"]'),
('Resolution Queue', 'resolution', 'Issue resolution and repair', '["engineer", "technician"]'),
('Closure Queue', 'closure', 'Final verification and closure', '["sales-admin", "manager", "director"]');