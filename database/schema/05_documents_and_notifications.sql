-- VTRIA ERP Database Schema - Documents and Notifications
-- Document management with versioning and notification system

-- =============================================
-- DOCUMENT_CATEGORIES TABLE
-- =============================================
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES document_categories(id),
    icon VARCHAR(50), -- Icon class or name
    color VARCHAR(7), -- Hex color code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_categories IS 'Hierarchical document categories';

-- =============================================
-- DOCUMENTS TABLE
-- =============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    document_type document_type DEFAULT 'other',
    category_id UUID REFERENCES document_categories(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- Relative path in local filesystem
    file_size BIGINT, -- File size in bytes
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 hash for integrity checking
    version_number VARCHAR(20) DEFAULT '1.0',
    is_current_version BOOLEAN DEFAULT true,
    parent_document_id UUID REFERENCES documents(id), -- For versioning
    related_entity_type VARCHAR(50), -- 'case', 'ticket', 'product', 'customer', 'user'
    related_entity_id UUID, -- ID of the related entity
    access_level VARCHAR(20) DEFAULT 'internal', -- 'public', 'internal', 'restricted', 'confidential'
    tags VARCHAR(500), -- Comma-separated tags
    metadata JSONB DEFAULT '{}', -- Additional document metadata
    is_template BOOLEAN DEFAULT false,
    template_data JSONB DEFAULT '{}', -- Template configuration if applicable
    expiry_date DATE, -- For documents with expiration
    review_date DATE, -- Next review date
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE documents IS 'Document management with versioning and metadata';
COMMENT ON COLUMN documents.file_path IS 'Relative path in local WAMP filesystem';
COMMENT ON COLUMN documents.parent_document_id IS 'Parent document for version tracking';
COMMENT ON COLUMN documents.access_level IS 'Document access control level';

-- =============================================
-- DOCUMENT_PERMISSIONS TABLE
-- =============================================
CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL, -- 'user', 'role', 'location'
    entity_id UUID NOT NULL,
    permission_type VARCHAR(20) NOT NULL, -- 'read', 'write', 'delete', 'admin'
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE document_permissions IS 'Granular document access permissions';

-- =============================================
-- DOCUMENT_ACCESS_LOG TABLE
-- =============================================
CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL, -- 'view', 'download', 'edit', 'delete'
    ip_address INET,
    user_agent TEXT,
    access_granted BOOLEAN DEFAULT true,
    access_reason TEXT, -- Reason if access denied
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE document_access_log IS 'Document access audit trail';

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type notification_type DEFAULT 'info',
    category VARCHAR(50), -- 'case', 'ticket', 'stock', 'system', 'reminder'
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1=highest, 5=lowest
    related_entity_type VARCHAR(50), -- 'case', 'ticket', 'stock_item', 'document'
    related_entity_id UUID,
    action_url VARCHAR(500), -- URL for notification action
    action_label VARCHAR(50), -- Label for action button
    notification_data JSONB DEFAULT '{}', -- Additional notification data
    is_system_generated BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration
);

COMMENT ON TABLE notifications IS 'System notifications and alerts';
COMMENT ON COLUMN notifications.priority IS 'Priority level (1=highest, 5=lowest)';

-- =============================================
-- NOTIFICATION_RECIPIENTS TABLE
-- =============================================
CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL, -- 'user', 'role', 'location', 'all'
    recipient_id UUID, -- User ID, Role ID, or Location ID (null for 'all')
    channel notification_channel DEFAULT 'in_app',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP WITH TIME ZONE,
    delivery_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notification_recipients IS 'Notification delivery tracking per recipient';

-- =============================================
-- EMAIL_QUEUE TABLE
-- =============================================
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id),
    to_email VARCHAR(255) NOT NULL,
    cc_email VARCHAR(500), -- Comma-separated CC emails
    bcc_email VARCHAR(500), -- Comma-separated BCC emails
    subject VARCHAR(255) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]', -- Array of attachment file paths
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE email_queue IS 'Email queue for asynchronous email delivery';

-- =============================================
-- SYSTEM_SETTINGS TABLE
-- =============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_user_configurable BOOLEAN DEFAULT true,
    validation_rules JSONB DEFAULT '{}', -- Validation rules for the setting
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Document categories indexes
CREATE INDEX idx_document_categories_parent ON document_categories(parent_id);
CREATE INDEX idx_document_categories_active ON document_categories(is_active);

-- Documents indexes
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_parent ON documents(parent_document_id);
CREATE INDEX idx_documents_entity ON documents(related_entity_type, related_entity_id);
CREATE INDEX idx_documents_access_level ON documents(access_level);
CREATE INDEX idx_documents_current_version ON documents(is_current_version);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);
CREATE INDEX idx_documents_review ON documents(review_date);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);
CREATE GIN INDEX idx_documents_metadata ON documents USING gin(metadata);

-- Document permissions indexes
CREATE INDEX idx_document_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_document_permissions_entity ON document_permissions(entity_type, entity_id);
CREATE INDEX idx_document_permissions_active ON document_permissions(is_active);

-- Document access log indexes
CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(user_id);
CREATE INDEX idx_document_access_log_accessed_at ON document_access_log(accessed_at);
CREATE INDEX idx_document_access_log_action ON document_access_log(action);

-- Notifications indexes
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_created_by ON notifications(created_by);

-- Notification recipients indexes
CREATE INDEX idx_notification_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX idx_notification_recipients_recipient ON notification_recipients(recipient_type, recipient_id);
CREATE INDEX idx_notification_recipients_channel ON notification_recipients(channel);
CREATE INDEX idx_notification_recipients_read ON notification_recipients(is_read);
CREATE INDEX idx_notification_recipients_status ON notification_recipients(delivery_status);

-- Email queue indexes
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_priority ON email_queue(priority);
CREATE INDEX idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX idx_email_queue_notification ON email_queue(notification_id);

-- System settings indexes
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- =============================================
-- TRIGGERS
-- =============================================

-- Apply updated_at triggers
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR DOCUMENT MANAGEMENT
-- =============================================

-- Function to create document version
CREATE OR REPLACE FUNCTION create_document_version(
    parent_doc_id UUID,
    new_title VARCHAR(200),
    new_file_path VARCHAR(500),
    new_version VARCHAR(20),
    creator_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_doc_id UUID;
    parent_doc RECORD;
BEGIN
    -- Get parent document details
    SELECT * INTO parent_doc FROM documents WHERE id = parent_doc_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent document not found';
    END IF;
    
    -- Mark current version as not current
    UPDATE documents SET is_current_version = false 
    WHERE parent_document_id = parent_doc_id OR id = parent_doc_id;
    
    -- Create new version
    INSERT INTO documents (
        title, description, document_type, category_id, file_name, file_path,
        mime_type, version_number, is_current_version, parent_document_id,
        related_entity_type, related_entity_id, access_level, tags,
        is_template, template_data, created_by
    )
    SELECT 
        COALESCE(new_title, parent_doc.title),
        parent_doc.description,
        parent_doc.document_type,
        parent_doc.category_id,
        SUBSTRING(new_file_path FROM '[^/]*$'), -- Extract filename
        new_file_path,
        parent_doc.mime_type,
        new_version,
        true, -- is_current_version
        parent_doc_id,
        parent_doc.related_entity_type,
        parent_doc.related_entity_id,
        parent_doc.access_level,
        parent_doc.tags,
        parent_doc.is_template,
        parent_doc.template_data,
        creator_id
    RETURNING id INTO new_doc_id;
    
    RETURN new_doc_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send notification
CREATE OR REPLACE FUNCTION send_notification(
    p_title VARCHAR(200),
    p_message TEXT,
    p_type notification_type DEFAULT 'info',
    p_category VARCHAR(50) DEFAULT NULL,
    p_priority INTEGER DEFAULT 3,
    p_recipients JSONB DEFAULT '[]', -- Array of {type, id, channel}
    p_related_entity_type VARCHAR(50) DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    recipient JSONB;
BEGIN
    -- Create notification
    INSERT INTO notifications (
        title, message, notification_type, category, priority,
        related_entity_type, related_entity_id, created_by
    )
    VALUES (
        p_title, p_message, p_type, p_category, p_priority,
        p_related_entity_type, p_related_entity_id, p_created_by
    )
    RETURNING id INTO notification_id;
    
    -- Add recipients
    FOR recipient IN SELECT * FROM jsonb_array_elements(p_recipients)
    LOOP
        INSERT INTO notification_recipients (
            notification_id, recipient_type, recipient_id, channel
        )
        VALUES (
            notification_id,
            recipient->>'type',
            CASE WHEN recipient->>'id' = 'null' THEN NULL ELSE (recipient->>'id')::UUID END,
            COALESCE((recipient->>'channel')::notification_channel, 'in_app')
        );
    END LOOP;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notification_recipients 
    SET is_read = true, read_at = CURRENT_TIMESTAMP
    WHERE notification_id = p_notification_id 
    AND recipient_type = 'user' 
    AND recipient_id = p_user_id
    AND is_read = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
