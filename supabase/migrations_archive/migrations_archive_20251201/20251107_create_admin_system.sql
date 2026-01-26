-- ============================================================================
-- AUTORENTA ADMIN SYSTEM MIGRATION
-- Created: 2025-11-07
-- Issue: #123 - Admin Authentication & Role-Based Access Control
-- Purpose: Create admin role system with RBAC and audit logging
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENUMS (Admin Roles)
-- ============================================================================

-- Admin role types with clear hierarchy and permissions
CREATE TYPE admin_role AS ENUM (
  'super_admin',    -- Full system access, manages other admins
  'operations',     -- User management, verifications, bookings
  'support',        -- User support, view-only access to most features
  'finance'         -- Payment processing, refunds, financial reports
);

-- ============================================================================
-- SECTION 2: ADMIN TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 ADMIN_USERS TABLE
-- ----------------------------------------------------------------------------
-- Tracks which users have admin access and their roles
-- User must exist in auth.users first (created via normal registration)

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role admin_role NOT NULL,

  -- Metadata
  granted_by UUID REFERENCES auth.users(id), -- Which admin granted this role
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ, -- NULL = active, non-NULL = revoked
  revoked_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT, -- Why this person was granted admin access

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, role), -- Same user can't have same role twice
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

-- Indexes
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_active ON public.admin_users(user_id, role) WHERE revoked_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER set_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2.2 ADMIN_AUDIT_LOG TABLE
-- ----------------------------------------------------------------------------
-- Immutable append-only log of all admin actions
-- Critical for compliance and security auditing

CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_role admin_role NOT NULL, -- Role at time of action (stored for history)

  -- What
  action TEXT NOT NULL, -- e.g., 'approve_verification', 'process_refund', 'suspend_user'
  resource_type TEXT NOT NULL, -- e.g., 'user', 'booking', 'car', 'payment'
  resource_id UUID, -- ID of the affected resource (if applicable)

  -- Details
  details JSONB, -- Structured data about the action
  ip_address INET, -- IP address of admin when action was performed
  user_agent TEXT, -- Browser/client info

  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_resource ON public.admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- ============================================================================
-- SECTION 3: RLS POLICIES
-- ============================================================================

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3.1 ADMIN_USERS POLICIES
-- ----------------------------------------------------------------------------

-- Super admins can view all admin users
CREATE POLICY "super_admins_view_all_admin_users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.revoked_at IS NULL
    )
  );

-- Super admins can insert new admin users
CREATE POLICY "super_admins_insert_admin_users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.revoked_at IS NULL
    )
  );

-- Super admins can update admin users (for revocation)
CREATE POLICY "super_admins_update_admin_users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.revoked_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.revoked_at IS NULL
    )
  );

-- All admins can view their own admin user record
CREATE POLICY "admins_view_own_record"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND revoked_at IS NULL);

-- ----------------------------------------------------------------------------
-- 3.2 ADMIN_AUDIT_LOG POLICIES
-- ----------------------------------------------------------------------------

-- Only super admins can view audit log
CREATE POLICY "super_admins_view_audit_log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.role = 'super_admin'
        AND au.revoked_at IS NULL
    )
  );

-- All admins can insert audit log entries (for their own actions)
CREATE POLICY "admins_insert_audit_log"
  ON public.admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid()
        AND au.revoked_at IS NULL
    )
  );

-- NO UPDATE OR DELETE POLICIES - Audit log is append-only and immutable

-- ============================================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Check if user has admin role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id
      AND revoked_at IS NULL
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.2 Check if user has specific admin role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_admin_role(
  check_role admin_role,
  check_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = check_user_id
      AND role = check_role
      AND revoked_at IS NULL
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.3 Get user's admin roles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_roles(check_user_id UUID DEFAULT auth.uid())
RETURNS admin_role[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ARRAY(
    SELECT role FROM public.admin_users
    WHERE user_id = check_user_id
      AND revoked_at IS NULL
    ORDER BY role
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4.4 Log admin action
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role admin_role;
  v_log_id UUID;
BEGIN
  -- Get the admin's role (take first if multiple)
  SELECT role INTO v_admin_role
  FROM public.admin_users
  WHERE user_id = auth.uid()
    AND revoked_at IS NULL
  LIMIT 1;

  IF v_admin_role IS NULL THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;

  -- Insert audit log entry
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    admin_role,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    v_admin_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- SECTION 5: SEED DATA (Initial Super Admin)
-- ============================================================================

-- Note: This section should be customized per environment
-- The first super admin needs to be created manually or via secure process
-- DO NOT commit real user IDs to version control

-- Example for development (replace with actual user ID):
-- INSERT INTO public.admin_users (user_id, role, notes, granted_by)
-- VALUES (
--   'REPLACE_WITH_ACTUAL_USER_ID'::UUID,
--   'super_admin',
--   'Initial super admin created during migration',
--   NULL -- No granter for initial admin
-- );

-- ============================================================================
-- SECTION 6: COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TYPE admin_role IS 'Admin role types with hierarchical permissions';
COMMENT ON TABLE public.admin_users IS 'Tracks admin users and their roles with grant/revoke history';
COMMENT ON TABLE public.admin_audit_log IS 'Immutable audit log of all admin actions';

COMMENT ON FUNCTION public.is_admin IS 'Check if user has any admin role';
COMMENT ON FUNCTION public.has_admin_role IS 'Check if user has specific admin role';
COMMENT ON FUNCTION public.get_admin_roles IS 'Get array of all active admin roles for user';
COMMENT ON FUNCTION public.log_admin_action IS 'Log an admin action to audit trail';

COMMIT;
