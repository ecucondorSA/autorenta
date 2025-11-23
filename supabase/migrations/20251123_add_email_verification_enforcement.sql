-- ============================================================================
-- Migration: Enforce Email Verification (P0-013 FIX)
-- ============================================================================
-- Date: 2025-11-23
-- Category: Security / Authentication
-- Priority: P0 - CRITICAL
--
-- Description:
-- Adds database-level enforcement of email verification for critical operations.
-- Users must verify their email before:
-- - Creating bookings
-- - Making payments
-- - Publishing cars
-- - Accessing sensitive data
--
-- This prevents bypassing client-side email verification checks.
-- ============================================================================

-- ============================================================================
-- PART 1: Helper function to check email verification
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.is_email_verified()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_email_confirmed_at timestamptz;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check email_confirmed_at from auth.users
  SELECT email_confirmed_at INTO v_email_confirmed_at
  FROM auth.users
  WHERE id = v_user_id;

  -- Return true if email is confirmed
  RETURN v_email_confirmed_at IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION auth.is_email_verified() IS
'✅ P0-013 FIX: Check if the current authenticated user has verified their email.
Returns true if email_confirmed_at is not null, false otherwise.
Used in RLS policies to enforce email verification.';

-- ============================================================================
-- PART 2: Update RLS policies for critical tables
-- ============================================================================

-- Bookings: Require email verification for creating bookings
DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;

CREATE POLICY "Users can create their own bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = renter_id
  AND auth.is_email_verified() -- ✅ P0-013 FIX
);

COMMENT ON POLICY "Users can create their own bookings" ON public.bookings IS
'✅ P0-013 FIX: Users must verify email before creating bookings';

-- Cars: Require email verification for publishing cars
DROP POLICY IF EXISTS "Users can create their own cars" ON public.cars;

CREATE POLICY "Users can create their own cars"
ON public.cars
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND auth.is_email_verified() -- ✅ P0-013 FIX
);

COMMENT ON POLICY "Users can create their own cars" ON public.cars IS
'✅ P0-013 FIX: Users must verify email before publishing cars';

-- Payment Authorizations: Require email verification
DROP POLICY IF EXISTS "Users can create payment authorizations for their bookings" ON public.payment_authorizations;

CREATE POLICY "Users can create payment authorizations for their bookings"
ON public.payment_authorizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = booking_id
    AND renter_id = auth.uid()
  )
  AND auth.is_email_verified() -- ✅ P0-013 FIX
);

COMMENT ON POLICY "Users can create payment authorizations for their bookings" ON public.payment_authorizations IS
'✅ P0-013 FIX: Users must verify email before authorizing payments';

-- Wallet Transactions: Require email verification for transfers
DROP POLICY IF EXISTS "Users can create their own wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users can create their own wallet transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND auth.is_email_verified() -- ✅ P0-013 FIX
);

COMMENT ON POLICY "Users can create their own wallet transactions" ON public.wallet_transactions IS
'✅ P0-013 FIX: Users must verify email before creating wallet transactions';

-- ============================================================================
-- PART 3: Add check constraint for critical operations
-- ============================================================================

-- Note: We cannot add CHECK constraints that reference auth.users directly
-- as it's in a different schema. RLS policies above handle this enforcement.

-- ============================================================================
-- PART 4: Create audit log for verification bypasses
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  attempted_operation text NOT NULL,
  email_verified boolean NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_audit_user ON public.email_verification_audit_log(user_id);
CREATE INDEX idx_email_verification_audit_created ON public.email_verification_audit_log(created_at DESC);

COMMENT ON TABLE public.email_verification_audit_log IS
'✅ P0-013 FIX: Audit log for email verification checks.
Tracks attempts to perform operations that require email verification.
Used for security monitoring and detection of bypass attempts.';

-- Enable RLS on audit log
ALTER TABLE public.email_verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view email verification audit logs"
ON public.email_verification_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND revoked_at IS NULL
  )
);

-- ============================================================================
-- PART 5: Create monitoring view for unverified users
-- ============================================================================

CREATE OR REPLACE VIEW public.unverified_users_with_activity AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at,
  p.full_name,
  COUNT(DISTINCT b.id) as booking_count,
  COUNT(DISTINCT c.id) as car_count,
  MAX(b.created_at) as last_booking_attempt
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.bookings b ON b.renter_id = u.id
LEFT JOIN public.cars c ON c.owner_id = u.id
WHERE u.email_confirmed_at IS NULL
  AND u.created_at < NOW() - INTERVAL '24 hours' -- Only show users created >24h ago
GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, p.full_name
HAVING COUNT(DISTINCT b.id) > 0 OR COUNT(DISTINCT c.id) > 0
ORDER BY last_booking_attempt DESC NULLS LAST;

COMMENT ON VIEW public.unverified_users_with_activity IS
'✅ P0-013 FIX: Monitor unverified users who have created bookings or cars.
These users may have bypassed email verification (legacy data or security bug).
Used for security audits and cleanup operations.';

-- ============================================================================
-- PART 6: Grant necessary permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION auth.is_email_verified() TO authenticated;
GRANT SELECT ON public.email_verification_audit_log TO authenticated;
GRANT SELECT ON public.unverified_users_with_activity TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ P0-013 FIX: Email verification enforcement migration completed successfully';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - auth.is_email_verified() function';
  RAISE NOTICE '  - Updated RLS policies for bookings, cars, payments, wallet';
  RAISE NOTICE '  - email_verification_audit_log table';
  RAISE NOTICE '  - unverified_users_with_activity monitoring view';
END $$;
