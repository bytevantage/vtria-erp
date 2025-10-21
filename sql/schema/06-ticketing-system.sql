-- ============================================
-- VTRIA ERP - Complete Ticketing System Schema (MySQL)
-- Supports customer support tickets with warranty tracking
-- Document Format: VESPL/TK/2526/XXX
-- ============================================

-- Ticket Queues Table
CREATE TABLE IF NOT EXISTS ticket_queues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    queue_type ENUM('support', 'diagnosis', 'resolution', 'closure') DEFAULT 'support',
    location_id INT,
    default_assignee_id INT,
    sla_hours INT DEFAULT 24,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ticket_queues_location (location_id),
    INDEX idx_ticket_queues_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tickets Table (Main)
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(20) NOT NULL UNIQUE COMMENT 'Format: VESPL/TK/2526/XXX',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Customer Information
    customer_id INT NOT NULL,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    -- Product & Warranty Information
    product_id INT,
    serial_number VARCHAR(100),
    purchase_date DATE,
    warranty_status ENUM('active', 'expired', 'claimed', 'void') DEFAULT 'active',
    vendor_warranty_expiry DATE,
    customer_warranty_expiry DATE,
    
    -- Assignment & Queue
    queue_id INT,
    assigned_to INT,
    assigned_location_id INT,
    
    -- Status & Priority
    status ENUM('open', 'in_progress', 'waiting_parts', 'waiting_customer', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    -- Categorization
    category VARCHAR(100) COMMENT 'installation, repair, maintenance, warranty',
    issue_type VARCHAR(100),
    source VARCHAR(50) COMMENT 'email, call, whatsapp, direct',
    
    -- Resolution Information
    resolution_type VARCHAR(100) COMMENT 'repair, replacement, refund, no_action',
    labor_hours DECIMAL(5,2),
    parts_cost DECIMAL(12,2) DEFAULT 0,
    labor_cost DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Warranty Claim
    is_warranty_claim BOOLEAN DEFAULT FALSE,
    warranty_claim_number VARCHAR(50),
    warranty_approved BOOLEAN DEFAULT NULL,
    warranty_approval_date DATE,
    
    -- Linked Case (Optional)
    linked_case_id INT COMMENT 'Link to original sales case if applicable',
    
    -- Resolution & Closure
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    resolution_summary TEXT,
    customer_satisfaction INT CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    
    -- Timestamps & User Tracking
    created_by INT NOT NULL,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_tickets_number (ticket_number),
    INDEX idx_tickets_customer (customer_id),
    INDEX idx_tickets_product (product_id),
    INDEX idx_tickets_serial (serial_number),
    INDEX idx_tickets_assigned_to (assigned_to),
    INDEX idx_tickets_queue (queue_id),
    INDEX idx_tickets_status (status),
    INDEX idx_tickets_priority (priority),
    INDEX idx_tickets_warranty_status (warranty_status),
    INDEX idx_tickets_created_by (created_by),
    INDEX idx_tickets_created_at (created_at),
    INDEX idx_tickets_linked_case (linked_case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Notes Table (Append-only)
CREATE TABLE IF NOT EXISTS ticket_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    note_type ENUM('general', 'internal', 'customer', 'system') DEFAULT 'general',
    title VARCHAR(200),
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE COMMENT 'Internal notes not visible to customer',
    is_system_generated BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_notes_ticket (ticket_id),
    INDEX idx_ticket_notes_created_by (created_by),
    INDEX idx_ticket_notes_created_at (created_at),
    INDEX idx_ticket_notes_type (note_type),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Parts Used (For Resolution)
CREATE TABLE IF NOT EXISTS ticket_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    product_id INT NOT NULL,
    serial_number VARCHAR(100),
    quantity INT DEFAULT 1,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    is_warranty_covered BOOLEAN DEFAULT FALSE,
    warranty_claim_reference VARCHAR(100),
    installed_date TIMESTAMP NULL,
    installed_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_parts_ticket (ticket_id),
    INDEX idx_ticket_parts_product (product_id),
    INDEX idx_ticket_parts_serial (serial_number),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Assignments History
CREATE TABLE IF NOT EXISTS ticket_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    assigned_to INT NOT NULL,
    assigned_by INT NOT NULL,
    assignment_reason TEXT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_ticket_assignments_ticket (ticket_id),
    INDEX idx_ticket_assignments_assigned_to (assigned_to),
    INDEX idx_ticket_assignments_active (is_active),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Status History
CREATE TABLE IF NOT EXISTS ticket_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    from_status ENUM('open', 'in_progress', 'waiting_parts', 'waiting_customer', 'resolved', 'closed'),
    to_status ENUM('open', 'in_progress', 'waiting_parts', 'waiting_customer', 'resolved', 'closed') NOT NULL,
    changed_by INT NOT NULL,
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_status_history_ticket (ticket_id),
    INDEX idx_ticket_status_history_changed_at (changed_at),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ticket Attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_ticket_attachments_ticket (ticket_id),
    
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Ticket Queues
INSERT INTO ticket_queues (name, description, queue_type, sla_hours) VALUES
('Support Ticket Queue', 'New customer support tickets awaiting triage', 'support', 4),
('Diagnosis Queue', 'Tickets under technical diagnosis', 'diagnosis', 8),
('Resolution Queue', 'Tickets being actively resolved', 'resolution', 24),
('Closure Queue', 'Tickets pending closure and customer confirmation', 'closure', 2)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Add TK document type to document_sequences if it doesn't exist
INSERT IGNORE INTO document_sequences (document_type, financial_year, last_sequence) 
VALUES ('TK', '2526', 0);

-- Success message
SELECT 'Ticketing System Schema Created Successfully!' as Status,
       'Document Format: VESPL/TK/2526/XXX' as Format,
       'Queues: Support → Diagnosis → Resolution → Closure' as Workflow;
