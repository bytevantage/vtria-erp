-- VTRIA ERP Database Schema - Cases and Tickets Management
-- Queue-based lifecycle management with status tracking and aging

-- =============================================
-- CASE_QUEUES TABLE
-- =============================================
CREATE TABLE case_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    location_id UUID REFERENCES locations(id),
    default_assignee_id UUID REFERENCES users(id),
    auto_assign_rules JSONB DEFAULT '{}', -- Rules for automatic assignment
    sla_hours INTEGER DEFAULT 24, -- Service Level Agreement in hours
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE case_queues IS 'Case queues for organizing and routing cases';
COMMENT ON COLUMN case_queues.auto_assign_rules IS 'JSON rules for automatic case assignment';
COMMENT ON COLUMN case_queues.sla_hours IS 'Service Level Agreement response time in hours';

-- =============================================
-- CASES TABLE
-- =============================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(20) NOT NULL UNIQUE, -- Auto-generated: CASE-YYYY-NNNNNN
    title VARCHAR(200) NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES customers(id),
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    queue_id UUID REFERENCES case_queues(id),
    assigned_to UUID REFERENCES users(id),
    assigned_location_id UUID REFERENCES locations(id),
    status case_status DEFAULT 'new',
    priority case_priority DEFAULT 'medium',
    source VARCHAR(50), -- 'email', 'phone', 'web', 'walk-in'
    category VARCHAR(100),
    subcategory VARCHAR(100),
    product_id UUID REFERENCES products(id), -- Related product if any
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    estimated_cost DECIMAL(12,2),
    actual_cost DECIMAL(12,2),
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    resolution_summary TEXT,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    case_data JSONB DEFAULT '{}', -- Flexible case-specific data
    tags VARCHAR(500), -- Comma-separated tags
    is_billable BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cases IS 'Customer cases from enquiry to closure';
COMMENT ON COLUMN cases.case_number IS 'Auto-generated unique case identifier';
COMMENT ON COLUMN cases.case_data IS 'Flexible JSON field for case-specific attributes';
COMMENT ON COLUMN cases.customer_satisfaction IS 'Customer satisfaction rating (1-5)';

-- =============================================
-- CASE_NOTES TABLE
-- =============================================
CREATE TABLE case_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'internal', 'customer', 'system'
    title VARCHAR(200),
    content TEXT NOT NULL,
    note_data JSONB DEFAULT '{}', -- Additional structured data
    is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to customer
    is_system_generated BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]', -- Array of attachment file paths
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE case_notes IS 'Case notes with date/time/updater tracking';
COMMENT ON COLUMN case_notes.note_data IS 'Additional structured data in JSON format';
COMMENT ON COLUMN case_notes.attachments IS 'JSON array of attachment file paths';

-- =============================================
-- CASE_STATUS_HISTORY TABLE
-- =============================================
CREATE TABLE case_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    from_status case_status,
    to_status case_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE case_status_history IS 'Audit trail for case status changes';

-- =============================================
-- TICKETS TABLE (Customer Support)
-- =============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(20) NOT NULL UNIQUE, -- Auto-generated: TKT-YYYY-NNNNNN
    title VARCHAR(200) NOT NULL,
    description TEXT,
    customer_id UUID NOT NULL REFERENCES customers(id),
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    product_id UUID REFERENCES products(id),
    serial_number VARCHAR(100), -- Product serial number
    purchase_date DATE,
    warranty_status warranty_status,
    warranty_expiry DATE,
    assigned_to UUID REFERENCES users(id),
    assigned_location_id UUID REFERENCES locations(id),
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    category VARCHAR(100), -- 'installation', 'repair', 'maintenance', 'warranty'
    issue_type VARCHAR(100),
    resolution_type VARCHAR(100), -- 'repair', 'replacement', 'refund', 'no_action'
    parts_required JSONB DEFAULT '[]', -- Array of required parts
    labor_hours DECIMAL(5,2),
    parts_cost DECIMAL(12,2),
    labor_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    is_warranty_claim BOOLEAN DEFAULT false,
    warranty_claim_number VARCHAR(50),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    resolution_summary TEXT,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 1 AND customer_satisfaction <= 5),
    ticket_data JSONB DEFAULT '{}', -- Flexible ticket-specific data
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tickets IS 'Customer support tickets linked to products and warranties';
COMMENT ON COLUMN tickets.parts_required IS 'JSON array of required parts for resolution';
COMMENT ON COLUMN tickets.ticket_data IS 'Flexible JSON field for ticket-specific data';

-- =============================================
-- TICKET_NOTES TABLE
-- =============================================
CREATE TABLE ticket_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    note_type VARCHAR(50) DEFAULT 'general',
    title VARCHAR(200),
    content TEXT NOT NULL,
    note_data JSONB DEFAULT '{}',
    is_internal BOOLEAN DEFAULT false,
    is_system_generated BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_notes IS 'Support ticket notes and updates';

-- =============================================
-- TICKET_PARTS TABLE (Parts used in ticket resolution)
-- =============================================
CREATE TABLE ticket_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    stock_item_id UUID REFERENCES stock_items(id),
    product_id UUID NOT NULL REFERENCES products(id),
    serial_number VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    is_warranty_covered BOOLEAN DEFAULT false,
    warranty_claim_reference VARCHAR(100),
    installed_date TIMESTAMP WITH TIME ZONE,
    installed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE ticket_parts IS 'Parts used in ticket resolution with warranty tracking';

-- =============================================
-- CASE_ASSIGNMENTS TABLE (Assignment history)
-- =============================================
CREATE TABLE case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assignment_reason TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE case_assignments IS 'Case assignment history and tracking';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Case queues indexes
CREATE INDEX idx_case_queues_location ON case_queues(location_id);
CREATE INDEX idx_case_queues_active ON case_queues(is_active);

-- Cases indexes
CREATE INDEX idx_cases_number ON cases(case_number);
CREATE INDEX idx_cases_customer ON cases(customer_id);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_assigned_location ON cases(assigned_location_id);
CREATE INDEX idx_cases_queue ON cases(queue_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_created_at ON cases(created_at);
CREATE INDEX idx_cases_due_date ON cases(due_date);
CREATE INDEX idx_cases_product ON cases(product_id);
CREATE GIN INDEX idx_cases_data ON cases USING gin(case_data);

-- Case notes indexes
CREATE INDEX idx_case_notes_case ON case_notes(case_id);
CREATE INDEX idx_case_notes_created_by ON case_notes(created_by);
CREATE INDEX idx_case_notes_created_at ON case_notes(created_at);
CREATE INDEX idx_case_notes_type ON case_notes(note_type);

-- Case status history indexes
CREATE INDEX idx_case_status_history_case ON case_status_history(case_id);
CREATE INDEX idx_case_status_history_changed_at ON case_status_history(changed_at);

-- Tickets indexes
CREATE INDEX idx_tickets_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_product ON tickets(product_id);
CREATE INDEX idx_tickets_serial ON tickets(serial_number);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_assigned_location ON tickets(assigned_location_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_warranty_status ON tickets(warranty_status);
CREATE INDEX idx_tickets_warranty_expiry ON tickets(warranty_expiry);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE GIN INDEX idx_tickets_data ON tickets USING gin(ticket_data);

-- Ticket notes indexes
CREATE INDEX idx_ticket_notes_ticket ON ticket_notes(ticket_id);
CREATE INDEX idx_ticket_notes_created_by ON ticket_notes(created_by);
CREATE INDEX idx_ticket_notes_created_at ON ticket_notes(created_at);

-- Ticket parts indexes
CREATE INDEX idx_ticket_parts_ticket ON ticket_parts(ticket_id);
CREATE INDEX idx_ticket_parts_stock_item ON ticket_parts(stock_item_id);
CREATE INDEX idx_ticket_parts_product ON ticket_parts(product_id);
CREATE INDEX idx_ticket_parts_serial ON ticket_parts(serial_number);

-- Case assignments indexes
CREATE INDEX idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_assigned_to ON case_assignments(assigned_to);
CREATE INDEX idx_case_assignments_active ON case_assignments(is_active);

-- =============================================
-- TRIGGERS
-- =============================================

-- Apply updated_at triggers
CREATE TRIGGER update_case_queues_updated_at BEFORE UPDATE ON case_queues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_notes_updated_at BEFORE UPDATE ON case_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ticket_notes_updated_at BEFORE UPDATE ON ticket_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR CASE/TICKET NUMBER GENERATION
-- =============================================

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    next_sequence INTEGER;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for the year
    SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_sequence
    FROM cases
    WHERE case_number LIKE 'CASE-' || year_part || '-%';
    
    sequence_part := LPAD(next_sequence::TEXT, 6, '0');
    
    RETURN 'CASE-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    next_sequence INTEGER;
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get next sequence number for the year
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_sequence
    FROM tickets
    WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
    
    sequence_part := LPAD(next_sequence::TEXT, 6, '0');
    
    RETURN 'TKT-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate case numbers
CREATE OR REPLACE FUNCTION set_case_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
        NEW.case_number := generate_case_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_case_number
    BEFORE INSERT ON cases
    FOR EACH ROW
    EXECUTE FUNCTION set_case_number();

-- Trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_number();

-- Trigger to log case status changes
CREATE OR REPLACE FUNCTION log_case_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, change_reason)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by, 'Status changed');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_by column to cases for status change tracking
ALTER TABLE cases ADD COLUMN updated_by UUID REFERENCES users(id);

CREATE TRIGGER trigger_log_case_status_change
    AFTER UPDATE ON cases
    FOR EACH ROW
    EXECUTE FUNCTION log_case_status_change();
