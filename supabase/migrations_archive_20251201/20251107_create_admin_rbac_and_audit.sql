-- ============================================================================
-- ADMIN PANEL RBAC & AUDIT LOGGING
-- Created: 2025-11-07
-- Purpose: Role-Based Access Control and Audit Logging for Admin Operations
-- Epic: #110 - Admin Panel & Operations Tools
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ADMIN ROLES & PERMISSIONS
-- ============================================================================

-- Admin role types enum
CREATE TYPE admin_role_type AS ENUM (
  'super_admin',    -- Full access to all admin features
  'operations',     -- Withdrawals, verifications, bookings
  'support',        -- User support, content moderation
  'finance'         -- Payment investigation, refunds, accounting
);

-- Admin roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name admin_role_type NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User-role assignments
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role_type NOT NULL,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = no expiration
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, role)
);

-- Indexes for admin_user_roles
CREATE INDEX idx_admin_user_roles_user_id ON public.admin_user_roles(user_id);
CREATE INDEX idx_admin_user_roles_role ON public.admin_user_roles(role);
CREATE INDEX idx_admin_user_roles_active ON public.admin_user_roles(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- SECTION 2: AUDIT LOGGING
-- ============================================================================

-- Audit log action types
CREATE TYPE admin_action_type AS ENUM (
  -- User Management
  'user_search',
  'user_view',
  'user_update',
  'user_suspend',
  'user_unsuspend',

  -- Verification Management
  'verification_view',
  'verification_approve',
  'verification_reject',

  -- Booking Management
  'booking_search',
  'booking_view',
  'booking_cancel',
  'booking_refund',

  -- Payment Management
  'payment_view',
  'payment_refund_full',
  'payment_refund_partial',
  'payment_investigate',

  -- Withdrawal Management
  'withdrawal_view',
  'withdrawal_approve',
  'withdrawal_reject',
  'withdrawal_complete',
  'withdrawal_fail',

  -- Car Management
  'car_approve',
  'car_suspend',
  'car_delete',

  -- Content Moderation
  'review_flag',
  'review_approve',
  'review_reject',
  'review_hide',

  -- System Configuration
  'config_view',
  'config_update',
  'role_grant',
  'role_revoke'
);

-- Audit logs table (immutable)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_role admin_role_type NOT NULL,

  -- Action
  action admin_action_type NOT NULL,
  resource_type TEXT NOT NULL, -- 'user', 'booking', 'payment', etc.
  resource_id UUID, -- ID of the affected resource

  -- Changes
  changes JSONB, -- Before/after snapshot: {before: {...}, after: {...}}
  metadata JSONB, -- Additional context: {reason: "...", ip: "...", user_agent: "..."}

  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  -- Timestamps (immutable - no updates allowed)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_admin_user ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- ============================================================================
-- SECTION 3: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin roles: Only super_admins can manage
CREATE POLICY "Super admins can view admin roles"
ON public.admin_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

CREATE POLICY "Super admins can manage admin roles"
ON public.admin_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Admin user roles: Super admins can manage, users can view their own
CREATE POLICY "Users can view their own admin roles"
ON public.admin_user_roles FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

CREATE POLICY "Super admins can manage user roles"
ON public.admin_user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  )
);

-- Audit logs: Admins can view, service role can insert
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

CREATE POLICY "Service can insert audit logs"
ON public.admin_audit_logs FOR INSERT
WITH CHECK (true);

-- Prevent updates and deletes on audit logs (immutable)
CREATE POLICY "No updates on audit logs"
ON public.admin_audit_logs FOR UPDATE
USING (false);

CREATE POLICY "No deletes on audit logs"
ON public.admin_audit_logs FOR DELETE
USING (false);

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

-- Check if user has a specific admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(p_user_id UUID, p_role admin_role_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = p_user_id
    AND role = p_role
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Check if current user has a specific admin role
CREATE OR REPLACE FUNCTION public.current_user_has_admin_role(p_role admin_role_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_admin_role(auth.uid(), p_role);
END;
$$;

-- Check if current user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check new RBAC system first
  IF EXISTS (
    SELECT 1 FROM public.admin_user_roles
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  -- Fallback to legacy is_admin flag in profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Get user's admin roles
CREATE OR REPLACE FUNCTION public.get_user_admin_roles(p_user_id UUID)
RETURNS TABLE (
  role admin_role_type,
  display_name TEXT,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.role,
    r.display_name,
    ur.granted_at,
    ur.expires_at
  FROM public.admin_user_roles ur
  JOIN public.admin_roles r ON r.name = ur.role
  WHERE ur.user_id = p_user_id
  AND ur.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY ur.granted_at DESC;
END;
$$;

-- Log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action admin_action_type,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_admin_role admin_role_type;
BEGIN
  -- Get user's primary admin role (highest privilege)
  SELECT role INTO v_admin_role
  FROM public.admin_user_roles
  WHERE user_id = auth.uid()
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'operations' THEN 2
      WHEN 'finance' THEN 3
      WHEN 'support' THEN 4
    END
  LIMIT 1;

  -- If no role found, check legacy is_admin
  IF v_admin_role IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
      v_admin_role := 'super_admin'; -- Default legacy admins to super_admin
    ELSE
      RAISE EXCEPTION 'User is not an admin';
    END IF;
  END IF;

  -- Insert audit log
  INSERT INTO public.admin_audit_logs (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    resource_id,
    changes,
    metadata,
    success
  ) VALUES (
    auth.uid(),
    v_admin_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_changes,
    p_metadata,
    true
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_admin_role(UUID, admin_role_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_admin_role(admin_role_type) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_admin_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(admin_action_type, TEXT, UUID, JSONB, JSONB) TO authenticated;

-- ============================================================================
-- SECTION 5: SEED ADMIN ROLES
-- ============================================================================

INSERT INTO public.admin_roles (name, display_name, description, permissions) VALUES
  (
    'super_admin',
    'Super Administrator',
    'Full access to all admin features including user management and system configuration',
    '["*"]'::jsonb
  ),
  (
    'operations',
    'Operations Manager',
    'Manage withdrawals, verifications, bookings, and operational tasks',
    '["withdrawals:*", "verifications:*", "bookings:*", "cars:*"]'::jsonb
  ),
  (
    'support',
    'Support Specialist',
    'User support, content moderation, and customer service',
    '["users:view", "bookings:view", "reviews:moderate", "support:*"]'::jsonb
  ),
  (
    'finance',
    'Finance Manager',
    'Payment investigation, refunds, accounting, and financial operations',
    '["payments:*", "refunds:*", "accounting:*", "reports:*"]'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  updated_at = now();

-- ============================================================================
-- SECTION 6: MIGRATION HELPER - Migrate legacy is_admin users
-- ============================================================================

-- Migrate users with is_admin = true to super_admin role
INSERT INTO public.admin_user_roles (user_id, role, granted_by, is_active)
SELECT
  p.id,
  'super_admin'::admin_role_type,
  p.id, -- Self-granted for legacy migration
  true
FROM public.profiles p
WHERE p.is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- Updated_at trigger for admin_roles
CREATE TRIGGER set_admin_roles_updated_at
  BEFORE UPDATE ON public.admin_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 8: COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.admin_roles IS 'Admin role definitions with permissions';
COMMENT ON TABLE public.admin_user_roles IS 'Admin role assignments to users';
COMMENT ON TABLE public.admin_audit_logs IS 'Immutable audit log of all admin actions';

COMMENT ON FUNCTION public.has_admin_role IS 'Check if a user has a specific admin role';
COMMENT ON FUNCTION public.current_user_has_admin_role IS 'Check if current user has a specific admin role';
COMMENT ON FUNCTION public.is_admin IS 'Check if current user is any type of admin (RBAC or legacy)';
COMMENT ON FUNCTION public.get_user_admin_roles IS 'Get all active admin roles for a user';
COMMENT ON FUNCTION public.log_admin_action IS 'Log an admin action to the audit trail';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMIT;
