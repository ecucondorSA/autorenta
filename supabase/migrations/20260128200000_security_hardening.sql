-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Date: 2026-01-28
-- Purpose: Fix critical security issues from audit
-- ============================================================================

-- ============================================================================
-- 1. OVERBOOKING PREVENTION - CRITICAL
-- Prevents two bookings from overlapping on the same car
-- ============================================================================

-- First, enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 1: Archive conflicting historical bookings before adding constraint
-- This marks older conflicting bookings as 'cancelled' to allow constraint creation
-- Only affects PAST bookings that ended before today
DO $$
DECLARE
  v_conflicts RECORD;
  v_count INT := 0;
BEGIN
  -- Find all overlapping booking pairs where both are active and in the past
  FOR v_conflicts IN
    SELECT b1.id as booking1_id, b2.id as booking2_id,
           b1.created_at as b1_created, b2.created_at as b2_created
    FROM public.bookings b1
    JOIN public.bookings b2 ON b1.car_id = b2.car_id
      AND b1.id < b2.id  -- Avoid duplicate pairs
      AND tstzrange(b1.start_at, b1.end_at, '[)') && tstzrange(b2.start_at, b2.end_at, '[)')
    WHERE b1.status NOT IN ('cancelled', 'rejected', 'no_show')
      AND b2.status NOT IN ('cancelled', 'rejected', 'no_show')
      AND b1.end_at < NOW()  -- Only past bookings
      AND b2.end_at < NOW()
  LOOP
    -- Cancel the OLDER booking (keep the newer one)
    IF v_conflicts.b1_created < v_conflicts.b2_created THEN
      UPDATE public.bookings
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = v_conflicts.booking1_id
        AND status NOT IN ('cancelled', 'rejected', 'no_show');
      -- Log the conflict resolution
      RAISE NOTICE 'Cancelled booking % (older) - kept booking %', v_conflicts.booking1_id, v_conflicts.booking2_id;
    ELSE
      UPDATE public.bookings
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = v_conflicts.booking2_id
        AND status NOT IN ('cancelled', 'rejected', 'no_show');
      -- Log the conflict resolution
      RAISE NOTICE 'Cancelled booking % (older) - kept booking %', v_conflicts.booking2_id, v_conflicts.booking1_id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE 'Resolved % overlapping booking conflicts', v_count;
  END IF;
END $$;

-- Step 2: Now add the exclusion constraint
ALTER TABLE public.bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  car_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status NOT IN ('cancelled', 'rejected', 'no_show'));

COMMENT ON CONSTRAINT no_overlapping_bookings ON public.bookings IS
'Prevents double-booking: no two active bookings can overlap for the same car';

-- ============================================================================
-- 2. RLS FOR TABLES WITHOUT POLICIES - HIGH
-- ============================================================================

-- 2.1 reward_criteria_config (admin only)
ALTER TABLE IF EXISTS public.reward_criteria_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage reward_criteria_config" ON public.reward_criteria_config;
CREATE POLICY "Admin can manage reward_criteria_config" ON public.reward_criteria_config
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can view reward_criteria_config" ON public.reward_criteria_config;
CREATE POLICY "Users can view reward_criteria_config" ON public.reward_criteria_config
  FOR SELECT
  USING (true);

-- 2.2 reward_pool (admin manage, users view)
ALTER TABLE IF EXISTS public.reward_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage reward_pool" ON public.reward_pool;
CREATE POLICY "Admin can manage reward_pool" ON public.reward_pool
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Users can view reward_pool" ON public.reward_pool;
CREATE POLICY "Users can view reward_pool" ON public.reward_pool
  FOR SELECT
  USING (true);

-- 2.3 owner_availability (users own data only)
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.owner_availability ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users can manage own availability" ON public.owner_availability;
  -- Check if owner_id column exists (some schemas use owner_id instead of user_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_availability' AND column_name = 'owner_id') THEN
    CREATE POLICY "Users can manage own availability" ON public.owner_availability
      FOR ALL USING (owner_id = auth.uid());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owner_availability' AND column_name = 'user_id') THEN
    CREATE POLICY "Users can manage own availability" ON public.owner_availability
      FOR ALL USING (user_id = auth.uid());
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'owner_availability: %', SQLERRM;
END $$;

-- 2.4 owner_usage_limits (users own data only)
ALTER TABLE IF EXISTS public.owner_usage_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage limits" ON public.owner_usage_limits;
CREATE POLICY "Users can view own usage limits" ON public.owner_usage_limits
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage usage limits" ON public.owner_usage_limits;
CREATE POLICY "System can manage usage limits" ON public.owner_usage_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- 2.5 personal_use_verifications (users own data only)
ALTER TABLE IF EXISTS public.personal_use_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own verifications" ON public.personal_use_verifications;
CREATE POLICY "Users can manage own verifications" ON public.personal_use_verifications
  FOR ALL
  USING (user_id = auth.uid());

-- 2.6 notification_templates (admin only)
ALTER TABLE IF EXISTS public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage notification_templates" ON public.notification_templates;
CREATE POLICY "Admin can manage notification_templates" ON public.notification_templates
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "System can read notification_templates" ON public.notification_templates;
CREATE POLICY "System can read notification_templates" ON public.notification_templates
  FOR SELECT
  USING (auth.role() = 'service_role');

-- 2.7 support_playbooks (admin only)
ALTER TABLE IF EXISTS public.support_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage support_playbooks" ON public.support_playbooks;
CREATE POLICY "Admin can manage support_playbooks" ON public.support_playbooks
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 2.8 playbook_steps (admin only)
ALTER TABLE IF EXISTS public.playbook_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage playbook_steps" ON public.playbook_steps;
CREATE POLICY "Admin can manage playbook_steps" ON public.playbook_steps
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 2.9 remote_config (admin manage, all read)
ALTER TABLE IF EXISTS public.remote_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage remote_config" ON public.remote_config;
CREATE POLICY "Admin can manage remote_config" ON public.remote_config
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "All can read remote_config" ON public.remote_config;
CREATE POLICY "All can read remote_config" ON public.remote_config
  FOR SELECT
  USING (true);

-- 2.10 feature_flags (admin manage, all read)
ALTER TABLE IF EXISTS public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage feature_flags" ON public.feature_flags;
CREATE POLICY "Admin can manage feature_flags" ON public.feature_flags
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "All can read feature_flags" ON public.feature_flags;
CREATE POLICY "All can read feature_flags" ON public.feature_flags
  FOR SELECT
  USING (true);

-- 2.11 car_stats (public read, system write)
ALTER TABLE IF EXISTS public.car_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "car_stats_select_all" ON public.car_stats;
DROP POLICY IF EXISTS "All can read car_stats" ON public.car_stats;
CREATE POLICY "All can read car_stats" ON public.car_stats
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "System can manage car_stats" ON public.car_stats;
CREATE POLICY "System can manage car_stats" ON public.car_stats
  FOR ALL
  USING (auth.role() = 'service_role');

-- 2.12 user_stats (own data only)
ALTER TABLE IF EXISTS public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage user_stats" ON public.user_stats;
CREATE POLICY "System can manage user_stats" ON public.user_stats
  FOR ALL
  USING (auth.role() = 'service_role');

-- 2.13 recommendation_tracking (own data only)
ALTER TABLE IF EXISTS public.recommendation_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendation_tracking;
CREATE POLICY "Users can view own recommendations" ON public.recommendation_tracking
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage recommendations" ON public.recommendation_tracking;
CREATE POLICY "System can manage recommendations" ON public.recommendation_tracking
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. FIX WALLET FUNCTIONS - IDOR VULNERABILITY
-- ============================================================================

-- 3.1 Fix wallet_charge_rental to validate booking ownership
CREATE OR REPLACE FUNCTION public.wallet_charge_rental(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
BEGIN
  -- SECURITY: Validate that booking exists and belongs to user
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BOOKING_NOT_FOUND',
      'message', 'Booking does not exist'
    );
  END IF;

  -- SECURITY: User must be the renter of this booking
  IF v_booking.renter_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'OWNERSHIP_VIOLATION',
      'message', 'User is not the renter of this booking'
    );
  END IF;

  -- SECURITY: Booking must be in correct state for charging
  IF v_booking.status NOT IN ('confirmed', 'in_progress') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_BOOKING_STATE',
      'message', 'Booking is not in a chargeable state'
    );
  END IF;

  -- Proceed with the charge via ledger
  INSERT INTO public.wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_user_id,
    'rental_charge',
    p_amount_cents,
    p_ref,
    p_booking_id,
    p_meta
  );

  RETURN jsonb_build_object(
    'success', true,
    'ref', p_ref,
    'amount_cents', p_amount_cents
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'CHARGE_FAILED',
    'message', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.wallet_charge_rental IS
'Charges rental from user wallet. SECURITY: Validates booking ownership and state.';

-- 3.2 Fix wallet_deposit_ledger to validate provider
CREATE OR REPLACE FUNCTION public.wallet_deposit_ledger(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_provider TEXT DEFAULT 'mercadopago',
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_providers TEXT[] := ARRAY['mercadopago', 'paypal', 'stripe', 'manual', 'system'];
BEGIN
  -- SECURITY: Validate provider is in allowed list
  IF NOT (p_provider = ANY(v_allowed_providers)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_PROVIDER',
      'message', 'Provider must be one of: ' || array_to_string(v_allowed_providers, ', ')
    );
  END IF;

  -- SECURITY: Amount must be positive
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_AMOUNT',
      'message', 'Amount must be positive'
    );
  END IF;

  -- Proceed with deposit
  INSERT INTO public.wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    meta
  ) VALUES (
    p_user_id,
    'deposit',
    p_amount_cents,
    p_ref,
    jsonb_build_object('provider', p_provider) || COALESCE(p_meta, '{}'::jsonb)
  );

  RETURN jsonb_build_object(
    'success', true,
    'ref', p_ref,
    'amount_cents', p_amount_cents,
    'provider', p_provider
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'DEPOSIT_FAILED',
    'message', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.wallet_deposit_ledger IS
'Deposits to user wallet via ledger. SECURITY: Validates provider against allowlist.';

-- 3.3 Fix wallet_transfer to validate recipient exists
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_user UUID,
  p_to_user UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance BIGINT;
  v_to_profile RECORD;
BEGIN
  -- SECURITY: Caller must be the sender
  IF p_from_user != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNAUTHORIZED',
      'message', 'You can only transfer from your own wallet'
    );
  END IF;

  -- SECURITY: Cannot transfer to yourself
  IF p_from_user = p_to_user THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SELF_TRANSFER',
      'message', 'Cannot transfer to yourself'
    );
  END IF;

  -- SECURITY: Recipient must exist
  SELECT * INTO v_to_profile FROM public.profiles WHERE id = p_to_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RECIPIENT_NOT_FOUND',
      'message', 'Recipient user does not exist'
    );
  END IF;

  -- SECURITY: Amount must be positive
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_AMOUNT',
      'message', 'Amount must be positive'
    );
  END IF;

  -- Check sender balance
  SELECT COALESCE(available_balance_cents, 0) INTO v_from_balance
  FROM public.wallets
  WHERE user_id = p_from_user;

  IF v_from_balance < p_amount_cents THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_FUNDS',
      'message', 'Not enough balance for this transfer'
    );
  END IF;

  -- Debit from sender
  INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_from_user, 'transfer_out', p_amount_cents, p_ref,
          jsonb_build_object('to_user', p_to_user) || COALESCE(p_meta, '{}'::jsonb));

  -- Credit to recipient
  INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_to_user, 'transfer_in', p_amount_cents, p_ref,
          jsonb_build_object('from_user', p_from_user) || COALESCE(p_meta, '{}'::jsonb));

  RETURN jsonb_build_object(
    'success', true,
    'ref', p_ref,
    'amount_cents', p_amount_cents,
    'from_user', p_from_user,
    'to_user', p_to_user
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'TRANSFER_FAILED',
    'message', SQLERRM
  );
END;
$$;

COMMENT ON FUNCTION public.wallet_transfer IS
'P2P wallet transfer. SECURITY: Validates auth, recipient exists, and sufficient funds.';

-- ============================================================================
-- 4. ADD MISSING INDEXES FOR PERFORMANCE
-- ============================================================================

-- 4.1 Geospatial index for cars (if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cars' AND column_name = 'latitude'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_cars_location
    ON public.cars (latitude, longitude)
    WHERE status = 'active';
  END IF;
END $$;

-- 4.2 Composite index for owner's active cars
CREATE INDEX IF NOT EXISTS idx_cars_owner_status
ON public.cars (owner_id, status);

-- 4.3 Composite index for booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_car_status_created
ON public.bookings (car_id, status, created_at DESC);

-- 4.4 Index for payments by created_at
CREATE INDEX IF NOT EXISTS idx_payments_created_at
ON public.payments (created_at DESC);

-- 4.5 Composite index for booking payments
CREATE INDEX IF NOT EXISTS idx_payments_booking_status
ON public.payments (booking_id, status);

-- ============================================================================
-- 5. CLEANUP DUPLICATE MIGRATIONS
-- ============================================================================

-- Drop old buggy version of handle_new_user if exists and recreate clean
-- Note: The trigger itself should only exist once

-- First, ensure we have the correct version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
'Creates profile when new auth user is created. v3 - cleaned up from audit.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
