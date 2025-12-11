-- Admin Users and RBAC System
-- Created: 2025-12-03
-- Issue: Admin Authentication & Role-Based Access Control

-- Admin roles enum
CREATE TYPE admin_role AS ENUM ('super_admin', 'operations', 'support', 'finance');

-- Admin users table
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role admin_role NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent duplicate active roles for same user
    CONSTRAINT unique_active_role UNIQUE (user_id, role)
);

-- Indexes
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(user_id) WHERE revoked_at IS NULL;

-- Admin audit log table
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE user_id = check_user_id
        AND revoked_at IS NULL
    );
END;
$$;

-- Function: Get admin roles for user
CREATE OR REPLACE FUNCTION get_admin_roles(check_user_id UUID)
RETURNS admin_role[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN ARRAY(
        SELECT role FROM admin_users
        WHERE user_id = check_user_id
        AND revoked_at IS NULL
    );
END;
$$;

-- Function: Log admin action
CREATE OR REPLACE FUNCTION log_admin_action(
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO admin_audit_log (admin_user_id, action, resource_type, resource_id, details, ip_address, user_agent)
    VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_details, p_ip_address::INET, p_user_agent)
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- RLS Policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view/modify admin_users
CREATE POLICY "Super admins can manage admin_users"
    ON admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.role = 'super_admin'
            AND au.revoked_at IS NULL
        )
    );

-- Admins can view audit log
CREATE POLICY "Admins can view audit_log"
    ON admin_audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.revoked_at IS NULL
        )
    );

-- Admins can insert to audit log
CREATE POLICY "Admins can insert audit_log"
    ON admin_audit_log
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
            AND au.revoked_at IS NULL
        )
    );

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_action(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
