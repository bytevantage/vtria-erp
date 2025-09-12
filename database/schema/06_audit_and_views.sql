-- VTRIA ERP Database Schema - Audit Logs and Views
-- Comprehensive audit trail and warranty tracking views

-- =============================================
-- AUDIT_LOGS TABLE
-- =============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(100), -- Session identifier
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- Table name or entity type
    entity_id UUID, -- ID of the affected record
    entity_name VARCHAR(200), -- Human-readable name of the entity
    old_values JSONB, -- Previous values (for updates)
    new_values JSONB, -- New values (for inserts/updates)
    changes JSONB, -- Specific changes made
    ip_address INET,
    user_agent TEXT,
    location_id UUID REFERENCES locations(id), -- User's location during action
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    additional_data JSONB DEFAULT '{}', -- Additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions';
COMMENT ON COLUMN audit_logs.changes IS 'Specific field changes in JSON format';
COMMENT ON COLUMN audit_logs.additional_data IS 'Additional context and metadata';

-- =============================================
-- LOGIN_HISTORY TABLE
-- =============================================
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    email VARCHAR(100),
    login_type VARCHAR(20) DEFAULT 'password', -- 'password', 'token', 'sso'
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100), -- Reason for failed login
    ip_address INET,
    user_agent TEXT,
    location_detected VARCHAR(100), -- Detected location from IP
    session_id VARCHAR(100),
    session_duration INTEGER, -- Duration in seconds (set on logout)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE -- Set when session ends
);

COMMENT ON TABLE login_history IS 'User login and session history';

-- =============================================
-- SYSTEM_LOGS TABLE
-- =============================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(10) NOT NULL, -- 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'
    category VARCHAR(50), -- 'authentication', 'database', 'email', 'license', 'system'
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    source VARCHAR(100), -- Source component or module
    user_id UUID REFERENCES users(id), -- Associated user if applicable
    session_id VARCHAR(100),
    correlation_id VARCHAR(100), -- For tracking related log entries
    stack_trace TEXT, -- For error logs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_logs IS 'System-wide application logs';

-- =============================================
-- WARRANTY TRACKING VIEW
-- =============================================
CREATE VIEW warranty_tracking AS
SELECT 
    si.id as stock_item_id,
    si.serial_number,
    p.name as product_name,
    p.sku as product_sku,
    m.name as manufacturer,
    c.company_name as customer_name,
    c.contact_person as customer_contact,
    l.name as location_name,
    
    -- Vendor warranty information
    si.vendor_warranty_start,
    si.vendor_warranty_end,
    CASE 
        WHEN si.vendor_warranty_end IS NULL THEN 'No Warranty'
        WHEN si.vendor_warranty_end < CURRENT_DATE THEN 'Expired'
        WHEN si.vendor_warranty_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as vendor_warranty_status,
    CASE 
        WHEN si.vendor_warranty_end IS NOT NULL AND si.vendor_warranty_end >= CURRENT_DATE 
        THEN si.vendor_warranty_end - CURRENT_DATE 
        ELSE NULL 
    END as vendor_warranty_days_remaining,
    
    -- Customer warranty information
    si.customer_warranty_start,
    si.customer_warranty_end,
    CASE 
        WHEN si.customer_warranty_end IS NULL THEN 'No Warranty'
        WHEN si.customer_warranty_end < CURRENT_DATE THEN 'Expired'
        WHEN si.customer_warranty_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as customer_warranty_status,
    CASE 
        WHEN si.customer_warranty_end IS NOT NULL AND si.customer_warranty_end >= CURRENT_DATE 
        THEN si.customer_warranty_end - CURRENT_DATE 
        ELSE NULL 
    END as customer_warranty_days_remaining,
    
    -- Additional information
    si.status as stock_status,
    si.warranty_details,
    si.condition_notes,
    si.last_audit_date,
    si.created_at as stock_received_date,
    
    -- Latest ticket information if any
    latest_ticket.ticket_number as latest_ticket,
    latest_ticket.status as latest_ticket_status,
    latest_ticket.created_at as latest_ticket_date
    
FROM stock_items si
JOIN products p ON si.product_id = p.id
JOIN locations l ON si.location_id = l.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
LEFT JOIN customers c ON si.reserved_for IN (
    SELECT id FROM cases WHERE customer_id = c.id
    UNION
    SELECT id FROM tickets WHERE customer_id = c.id
)
LEFT JOIN LATERAL (
    SELECT ticket_number, status, created_at
    FROM tickets t
    WHERE t.serial_number = si.serial_number
    ORDER BY created_at DESC
    LIMIT 1
) latest_ticket ON true
WHERE si.is_active = true;

COMMENT ON VIEW warranty_tracking IS 'Comprehensive warranty tracking for all stock items';

-- =============================================
-- EXPIRING WARRANTIES VIEW
-- =============================================
CREATE VIEW expiring_warranties AS
SELECT 
    stock_item_id,
    serial_number,
    product_name,
    product_sku,
    manufacturer,
    customer_name,
    location_name,
    'vendor' as warranty_type,
    vendor_warranty_end as warranty_expiry,
    vendor_warranty_days_remaining as days_remaining,
    vendor_warranty_status as status
FROM warranty_tracking
WHERE vendor_warranty_status IN ('Expiring Soon', 'Expired')

UNION ALL

SELECT 
    stock_item_id,
    serial_number,
    product_name,
    product_sku,
    manufacturer,
    customer_name,
    location_name,
    'customer' as warranty_type,
    customer_warranty_end as warranty_expiry,
    customer_warranty_days_remaining as days_remaining,
    customer_warranty_status as status
FROM warranty_tracking
WHERE customer_warranty_status IN ('Expiring Soon', 'Expired')

ORDER BY warranty_expiry ASC NULLS LAST;

COMMENT ON VIEW expiring_warranties IS 'Parts with expiring or expired warranties';

-- =============================================
-- CASE AGING VIEW
-- =============================================
CREATE VIEW case_aging AS
SELECT 
    c.id,
    c.case_number,
    c.title,
    c.status,
    c.priority,
    c.created_at,
    c.due_date,
    
    -- Age calculations
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/3600 as age_hours,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/86400 as age_days,
    
    -- SLA calculations
    cq.sla_hours,
    CASE 
        WHEN c.due_date IS NOT NULL AND c.due_date < CURRENT_TIMESTAMP THEN 'Overdue'
        WHEN cq.sla_hours IS NOT NULL AND 
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/3600 > cq.sla_hours THEN 'SLA Breached'
        WHEN c.due_date IS NOT NULL AND 
             c.due_date <= CURRENT_TIMESTAMP + INTERVAL '4 hours' THEN 'Due Soon'
        ELSE 'On Time'
    END as sla_status,
    
    -- Assignment information
    u.first_name || ' ' || u.last_name as assigned_to_name,
    l.name as assigned_location,
    cust.company_name as customer_name,
    
    -- Latest activity
    latest_note.created_at as last_activity,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(latest_note.created_at, c.created_at)))/3600 as hours_since_activity
    
FROM cases c
LEFT JOIN case_queues cq ON c.queue_id = cq.id
LEFT JOIN users u ON c.assigned_to = u.id
LEFT JOIN locations l ON c.assigned_location_id = l.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN LATERAL (
    SELECT created_at
    FROM case_notes cn
    WHERE cn.case_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_note ON true
WHERE c.status NOT IN ('closed', 'cancelled');

COMMENT ON VIEW case_aging IS 'Case aging analysis with SLA tracking';

-- =============================================
-- STOCK SUMMARY VIEW
-- =============================================
CREATE VIEW stock_summary AS
SELECT 
    l.name as location_name,
    l.code as location_code,
    pc.name as category_name,
    p.name as product_name,
    p.sku as product_sku,
    m.name as manufacturer,
    
    -- Stock counts
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE si.status = 'available') as available_items,
    COUNT(*) FILTER (WHERE si.status = 'reserved') as reserved_items,
    COUNT(*) FILTER (WHERE si.status = 'sold') as sold_items,
    COUNT(*) FILTER (WHERE si.status = 'damaged') as damaged_items,
    
    -- Warranty status counts
    COUNT(*) FILTER (WHERE si.vendor_warranty_end >= CURRENT_DATE) as items_under_vendor_warranty,
    COUNT(*) FILTER (WHERE si.customer_warranty_end >= CURRENT_DATE) as items_under_customer_warranty,
    COUNT(*) FILTER (WHERE si.vendor_warranty_end <= CURRENT_DATE + INTERVAL '30 days' 
                     AND si.vendor_warranty_end >= CURRENT_DATE) as vendor_warranties_expiring_soon,
    COUNT(*) FILTER (WHERE si.customer_warranty_end <= CURRENT_DATE + INTERVAL '30 days' 
                     AND si.customer_warranty_end >= CURRENT_DATE) as customer_warranties_expiring_soon,
    
    -- Value calculations
    SUM(si.purchase_price) as total_purchase_value,
    SUM(si.selling_price) as total_selling_value,
    AVG(si.purchase_price) as avg_purchase_price,
    AVG(si.selling_price) as avg_selling_price,
    
    -- Last activity
    MAX(si.created_at) as last_stock_received,
    MAX(si.updated_at) as last_stock_updated
    
FROM stock_items si
JOIN products p ON si.product_id = p.id
JOIN locations l ON si.location_id = l.id
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
WHERE si.is_active = true
GROUP BY l.id, l.name, l.code, pc.id, pc.name, p.id, p.name, p.sku, m.name
ORDER BY l.name, pc.name, p.name;

COMMENT ON VIEW stock_summary IS 'Stock summary by location, category, and product';

-- =============================================
-- USER ACTIVITY VIEW
-- =============================================
CREATE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    l.name as location_name,
    
    -- Login statistics
    lh.total_logins,
    lh.successful_logins,
    lh.failed_logins,
    lh.last_login,
    lh.avg_session_duration,
    
    -- Activity statistics
    al.total_actions,
    al.creates,
    al.reads,
    al.updates,
    al.deletes,
    al.last_activity,
    
    -- Case/Ticket assignments
    COALESCE(case_stats.assigned_cases, 0) as assigned_cases,
    COALESCE(case_stats.resolved_cases, 0) as resolved_cases,
    COALESCE(ticket_stats.assigned_tickets, 0) as assigned_tickets,
    COALESCE(ticket_stats.resolved_tickets, 0) as resolved_tickets
    
FROM users u
LEFT JOIN locations l ON u.location_id = l.id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_logins,
        COUNT(*) FILTER (WHERE success = true) as successful_logins,
        COUNT(*) FILTER (WHERE success = false) as failed_logins,
        MAX(created_at) as last_login,
        AVG(session_duration) as avg_session_duration
    FROM login_history
    GROUP BY user_id
) lh ON u.id = lh.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE action = 'create') as creates,
        COUNT(*) FILTER (WHERE action = 'read') as reads,
        COUNT(*) FILTER (WHERE action = 'update') as updates,
        COUNT(*) FILTER (WHERE action = 'delete') as deletes,
        MAX(created_at) as last_activity
    FROM audit_logs
    GROUP BY user_id
) al ON u.id = al.user_id
LEFT JOIN (
    SELECT 
        assigned_to,
        COUNT(*) as assigned_cases,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_cases
    FROM cases
    WHERE assigned_to IS NOT NULL
    GROUP BY assigned_to
) case_stats ON u.id = case_stats.assigned_to
LEFT JOIN (
    SELECT 
        assigned_to,
        COUNT(*) as assigned_tickets,
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_tickets
    FROM tickets
    WHERE assigned_to IS NOT NULL
    GROUP BY assigned_to
) ticket_stats ON u.id = ticket_stats.assigned_to
WHERE u.is_active = true;

COMMENT ON VIEW user_activity_summary IS 'Comprehensive user activity and performance metrics';

-- =============================================
-- INDEXES FOR AUDIT TABLES
-- =============================================

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_location ON audit_logs(location_id);
CREATE GIN INDEX idx_audit_logs_changes ON audit_logs USING gin(changes);

-- Login history indexes
CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_created_at ON login_history(created_at);
CREATE INDEX idx_login_history_success ON login_history(success);
CREATE INDEX idx_login_history_ip ON login_history(ip_address);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_correlation ON system_logs(correlation_id);

-- =============================================
-- FUNCTIONS FOR AUDIT LOGGING
-- =============================================

-- Function to log user action
CREATE OR REPLACE FUNCTION log_user_action(
    p_user_id UUID,
    p_action audit_action,
    p_entity_type VARCHAR(50),
    p_entity_id UUID DEFAULT NULL,
    p_entity_name VARCHAR(200) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    user_location_id UUID;
    changes_json JSONB;
BEGIN
    -- Get user's location
    SELECT location_id INTO user_location_id FROM users WHERE id = p_user_id;
    
    -- Calculate changes if both old and new values provided
    IF p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT jsonb_object_agg(key, jsonb_build_object('old', p_old_values->key, 'new', p_new_values->key))
        INTO changes_json
        FROM jsonb_each(p_new_values)
        WHERE p_old_values->key IS DISTINCT FROM p_new_values->key;
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        user_id, session_id, action, entity_type, entity_id, entity_name,
        old_values, new_values, changes, ip_address, user_agent,
        location_id, additional_data
    )
    VALUES (
        p_user_id, p_session_id, p_action, p_entity_type, p_entity_id, p_entity_name,
        p_old_values, p_new_values, changes_json, p_ip_address, p_user_agent,
        user_location_id, p_additional_data
    )
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log system event
CREATE OR REPLACE FUNCTION log_system_event(
    p_level VARCHAR(10),
    p_category VARCHAR(50),
    p_message TEXT,
    p_details JSONB DEFAULT '{}',
    p_source VARCHAR(100) DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_correlation_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO system_logs (
        log_level, category, message, details, source,
        user_id, session_id, correlation_id
    )
    VALUES (
        p_level, p_category, p_message, p_details, p_source,
        p_user_id, p_session_id, p_correlation_id
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;
