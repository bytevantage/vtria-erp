-- ByteVantage Licensing Server Database Schema
-- PostgreSQL Schema for License Management System

-- Create database (run as postgres superuser)
-- CREATE DATABASE bytevantage_licenses;
-- CREATE USER bytevantage_user WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE bytevantage_licenses TO bytevantage_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create custom types
CREATE TYPE license_status AS ENUM ('active', 'expired', 'suspended', 'revoked', 'pending');
CREATE TYPE client_type AS ENUM ('individual', 'corporate', 'enterprise', 'trial');
CREATE TYPE feature_type AS ENUM ('module', 'user_limit', 'storage_limit', 'api_calls', 'custom');

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(200) NOT NULL,
    client_code VARCHAR(50) UNIQUE,
    client_type client_type DEFAULT 'corporate',
    contact_person VARCHAR(100),
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(200),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'India',
    postal_code VARCHAR(20),
    tax_id VARCHAR(50),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE clients IS 'Client information for license management';

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name VARCHAR(100) NOT NULL UNIQUE,
    product_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    version VARCHAR(20),
    features JSONB DEFAULT '{}', -- Available features for this product
    pricing_model VARCHAR(50), -- 'per_user', 'per_month', 'one_time', 'custom'
    base_price DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE products IS 'Products available for licensing';

-- =============================================
-- LICENSES TABLE
-- =============================================
CREATE TABLE licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_key VARCHAR(255) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id),
    product_id UUID NOT NULL REFERENCES products(id),
    license_name VARCHAR(200),
    status license_status DEFAULT 'active',
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE NOT NULL,
    grace_period_days INTEGER DEFAULT 7,
    max_users INTEGER DEFAULT 1,
    current_users INTEGER DEFAULT 0,
    max_locations INTEGER DEFAULT 1,
    current_locations INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}', -- Licensed features and limits
    restrictions JSONB DEFAULT '{}', -- Usage restrictions
    metadata JSONB DEFAULT '{}', -- Additional license data
    last_validated TIMESTAMP WITH TIME ZONE,
    validation_count INTEGER DEFAULT 0,
    is_trial BOOLEAN DEFAULT false,
    trial_days INTEGER,
    auto_renew BOOLEAN DEFAULT false,
    renewal_notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE licenses IS 'License keys and their configurations';
COMMENT ON COLUMN licenses.license_key IS 'Unique license key for validation';
COMMENT ON COLUMN licenses.features IS 'JSON object containing licensed features and limits';
COMMENT ON COLUMN licenses.restrictions IS 'JSON object containing usage restrictions';

-- =============================================
-- LICENSE_VALIDATIONS TABLE
-- =============================================
CREATE TABLE license_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES licenses(id),
    validation_key VARCHAR(255), -- The key that was validated
    client_ip INET,
    user_agent TEXT,
    validation_result VARCHAR(20) NOT NULL, -- 'valid', 'expired', 'invalid', 'suspended'
    validation_data JSONB DEFAULT '{}', -- Request/response data
    error_message TEXT,
    response_time_ms INTEGER,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE license_validations IS 'License validation history and analytics';

-- =============================================
-- LICENSE_USAGE TABLE
-- =============================================
CREATE TABLE license_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES licenses(id),
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    active_users INTEGER DEFAULT 0,
    active_locations INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    feature_usage JSONB DEFAULT '{}', -- Usage per feature
    peak_concurrent_users INTEGER DEFAULT 0,
    total_session_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(license_id, usage_date)
);

COMMENT ON TABLE license_usage IS 'Daily license usage statistics';

-- =============================================
-- LICENSE_FEATURES TABLE
-- =============================================
CREATE TABLE license_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES licenses(id),
    feature_name VARCHAR(100) NOT NULL,
    feature_type feature_type DEFAULT 'module',
    is_enabled BOOLEAN DEFAULT true,
    limit_value INTEGER, -- For features with limits
    current_usage INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(license_id, feature_name)
);

COMMENT ON TABLE license_features IS 'Individual feature settings per license';

-- =============================================
-- API_KEYS TABLE
-- =============================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    client_id UUID REFERENCES clients(id),
    permissions JSONB DEFAULT '{}', -- API permissions
    rate_limit INTEGER DEFAULT 1000, -- Requests per hour
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE api_keys IS 'API keys for accessing licensing endpoints';

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID REFERENCES licenses(id),
    client_id UUID REFERENCES clients(id),
    notification_type VARCHAR(50) NOT NULL, -- 'expiry_warning', 'expired', 'suspended', 'usage_limit'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    send_attempts INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notifications IS 'License-related notifications and alerts';

-- =============================================
-- SYSTEM_LOGS TABLE
-- =============================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(10) NOT NULL,
    category VARCHAR(50),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    source VARCHAR(100),
    correlation_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE system_logs IS 'System logs for the licensing server';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Clients indexes
CREATE INDEX idx_clients_code ON clients(client_code);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_active ON clients(is_active);

-- Products indexes
CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_active ON products(is_active);

-- Licenses indexes
CREATE INDEX idx_licenses_key ON licenses(license_key);
CREATE INDEX idx_licenses_client ON licenses(client_id);
CREATE INDEX idx_licenses_product ON licenses(product_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_expiry ON licenses(expiry_date);
CREATE INDEX idx_licenses_start_date ON licenses(start_date);
CREATE INDEX idx_licenses_trial ON licenses(is_trial);
CREATE INDEX idx_licenses_auto_renew ON licenses(auto_renew);

-- License validations indexes
CREATE INDEX idx_license_validations_license ON license_validations(license_id);
CREATE INDEX idx_license_validations_key ON license_validations(validation_key);
CREATE INDEX idx_license_validations_result ON license_validations(validation_result);
CREATE INDEX idx_license_validations_date ON license_validations(validated_at);
CREATE INDEX idx_license_validations_ip ON license_validations(client_ip);

-- License usage indexes
CREATE INDEX idx_license_usage_license ON license_usage(license_id);
CREATE INDEX idx_license_usage_date ON license_usage(usage_date);

-- License features indexes
CREATE INDEX idx_license_features_license ON license_features(license_id);
CREATE INDEX idx_license_features_name ON license_features(feature_name);
CREATE INDEX idx_license_features_enabled ON license_features(is_enabled);

-- API keys indexes
CREATE INDEX idx_api_keys_key ON api_keys(api_key);
CREATE INDEX idx_api_keys_client ON api_keys(client_id);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Notifications indexes
CREATE INDEX idx_notifications_license ON notifications(license_id);
CREATE INDEX idx_notifications_client ON notifications(client_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_sent ON notifications(is_sent);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR LICENSE MANAGEMENT
-- =============================================

-- Function to generate license key
CREATE OR REPLACE FUNCTION generate_license_key(
    p_client_code VARCHAR(50),
    p_product_code VARCHAR(20)
)
RETURNS VARCHAR(255) AS $$
DECLARE
    timestamp_part VARCHAR(20);
    random_part VARCHAR(20);
    checksum_part VARCHAR(10);
    license_key VARCHAR(255);
BEGIN
    -- Generate timestamp part (base36 encoded)
    timestamp_part := UPPER(SUBSTRING(TO_HEX(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT), 1, 8));
    
    -- Generate random part
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Generate checksum part
    checksum_part := UPPER(SUBSTRING(MD5(p_client_code || p_product_code || timestamp_part), 1, 4));
    
    -- Combine parts with dashes
    license_key := p_product_code || '-' || p_client_code || '-' || timestamp_part || '-' || random_part || '-' || checksum_part;
    
    RETURN license_key;
END;
$$ LANGUAGE plpgsql;

-- Function to validate license key format
CREATE OR REPLACE FUNCTION validate_license_key_format(license_key VARCHAR(255))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if license key matches expected format: PROD-CLIENT-TIMESTAMP-RANDOM-CHECKSUM
    RETURN license_key ~ '^[A-Z0-9]+-[A-Z0-9]+-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{4}$';
END;
$$ LANGUAGE plpgsql;

-- Function to check license validity
CREATE OR REPLACE FUNCTION check_license_validity(p_license_key VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    license_record RECORD;
    result JSONB;
BEGIN
    -- Get license record
    SELECT l.*, c.client_name, p.product_name 
    INTO license_record
    FROM licenses l
    JOIN clients c ON l.client_id = c.id
    JOIN products p ON l.product_id = p.id
    WHERE l.license_key = p_license_key;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'invalid',
            'message', 'License key not found'
        );
    END IF;
    
    -- Check if license is active
    IF license_record.status != 'active' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'status', license_record.status,
            'message', 'License is ' || license_record.status
        );
    END IF;
    
    -- Check expiry date (with grace period)
    IF CURRENT_DATE > (license_record.expiry_date + INTERVAL '1 day' * license_record.grace_period_days) THEN
        -- Update license status to expired
        UPDATE licenses SET status = 'expired' WHERE id = license_record.id;
        
        RETURN jsonb_build_object(
            'valid', false,
            'status', 'expired',
            'message', 'License has expired',
            'expiry_date', license_record.expiry_date
        );
    END IF;
    
    -- License is valid
    result := jsonb_build_object(
        'valid', true,
        'status', 'active',
        'message', 'License is valid',
        'license_id', license_record.id,
        'client_name', license_record.client_name,
        'product_name', license_record.product_name,
        'expiry_date', license_record.expiry_date,
        'max_users', license_record.max_users,
        'current_users', license_record.current_users,
        'max_locations', license_record.max_locations,
        'current_locations', license_record.current_locations,
        'features', license_record.features,
        'restrictions', license_record.restrictions,
        'is_trial', license_record.is_trial
    );
    
    -- Update last validated timestamp and count
    UPDATE licenses 
    SET last_validated = CURRENT_TIMESTAMP, 
        validation_count = validation_count + 1
    WHERE id = license_record.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
