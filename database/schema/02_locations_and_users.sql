-- VTRIA ERP Database Schema - Locations and Users
-- Multi-location support and RBAC implementation

-- =============================================
-- LOCATIONS TABLE
-- =============================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE, -- MNG, BLR, PUN
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50) DEFAULT 'India',
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_id UUID, -- FK to users table (added later)
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- Flexible fields for location-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE locations IS 'Company locations (Mangalore, Bangalore, Pune)';
COMMENT ON COLUMN locations.code IS 'Short code for location identification';
COMMENT ON COLUMN locations.metadata IS 'Flexible JSON field for location-specific attributes';

-- =============================================
-- ROLES TABLE
-- =============================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Hierarchy level (1=Director, 2=Manager, etc.)
    permissions JSONB NOT NULL DEFAULT '{}', -- Role-specific permissions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE roles IS 'User roles for RBAC system';
COMMENT ON COLUMN roles.level IS 'Hierarchy level - lower numbers have higher authority';
COMMENT ON COLUMN roles.permissions IS 'JSON object containing role permissions';

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(20) UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(50),
    designation VARCHAR(100),
    location_id UUID REFERENCES locations(id),
    manager_id UUID REFERENCES users(id), -- Self-referencing for hierarchy
    status user_status DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB DEFAULT '{}', -- Additional profile information
    preferences JSONB DEFAULT '{}', -- User preferences and settings
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments
COMMENT ON TABLE users IS 'System users with multi-location support';
COMMENT ON COLUMN users.employee_id IS 'Company employee ID';
COMMENT ON COLUMN users.manager_id IS 'Self-referencing FK for organizational hierarchy';
COMMENT ON COLUMN users.profile_data IS 'Additional profile information in JSON format';
COMMENT ON COLUMN users.preferences IS 'User preferences and application settings';

-- =============================================
-- USER_ROLES TABLE (Many-to-Many)
-- =============================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id), -- Role can be location-specific
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional role expiration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique user-role-location combination
    UNIQUE(user_id, role_id, location_id)
);

-- Add comments
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles with location support';
COMMENT ON COLUMN user_roles.location_id IS 'Optional location-specific role assignment';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional expiration date for temporary roles';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Locations indexes
CREATE INDEX idx_locations_code ON locations(code);
CREATE INDEX idx_locations_active ON locations(is_active);
CREATE INDEX idx_locations_city ON locations(city);

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);

-- Roles indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);
CREATE INDEX idx_roles_active ON roles(is_active);

-- User roles indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_location ON user_roles(location_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
