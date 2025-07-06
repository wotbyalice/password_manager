-- Office Password Manager Database Schema
-- PostgreSQL Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Password entries table
CREATE TABLE IF NOT EXISTS password_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    username VARCHAR(200) NOT NULL,
    password_encrypted TEXT NOT NULL,
    url VARCHAR(500),
    notes TEXT,
    category VARCHAR(100),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password categories table (for organizing passwords)
CREATE TABLE IF NOT EXISTS password_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT true,
    auto_logout_minutes INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_password_entries_created_by ON password_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_password_entries_category ON password_entries(category);
CREATE INDEX IF NOT EXISTS idx_password_entries_deleted ON password_entries(is_deleted);
CREATE INDEX IF NOT EXISTS idx_password_entries_title ON password_entries(title);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_password_entries_updated_at BEFORE UPDATE ON password_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data, admins can see all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR 
                     EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin'));

-- Password entries are visible to all authenticated users
CREATE POLICY "All users can view password entries" ON password_entries
    FOR SELECT USING (auth.role() = 'authenticated' AND is_deleted = false);

-- Only admins can modify password entries
CREATE POLICY "Only admins can modify password entries" ON password_entries
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin'));

-- Users can add new password entries
CREATE POLICY "Users can add password entries" ON password_entries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Audit logs are only visible to admins
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin'));

-- Insert default admin user (password: AdminPass123!)
-- Note: This should be changed immediately after setup
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES (
    'admin@company.local',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO/G', -- AdminPass123!
    'System',
    'Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert default password categories
INSERT INTO password_categories (name, description, color) VALUES
    ('Email', 'Email accounts and services', '#FF6B6B'),
    ('Social Media', 'Social networking platforms', '#4ECDC4'),
    ('Banking', 'Financial and banking services', '#45B7D1'),
    ('Work Tools', 'Business and productivity tools', '#96CEB4'),
    ('Servers', 'Server and infrastructure access', '#FFEAA7'),
    ('WiFi', 'Network and WiFi passwords', '#DDA0DD'),
    ('Software', 'Software licenses and accounts', '#98D8C8')
ON CONFLICT (name) DO NOTHING;
