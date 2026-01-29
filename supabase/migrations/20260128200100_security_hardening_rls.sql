-- ============================================================================
-- SECURITY HARDENING - RLS POLICIES
-- Date: 2026-01-28
-- Purpose: Add RLS to tables missing policies (safe version with error handling)
-- ============================================================================

-- Helper function to safely create RLS policies
CREATE OR REPLACE FUNCTION temp_safe_create_policy(
  p_table TEXT,
  p_policy_name TEXT,
  p_command TEXT,
  p_using TEXT,
  p_check TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Enable RLS on table
  EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', p_table);

  -- Drop existing policy if exists
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p_policy_name, p_table);

  -- Create new policy
  IF p_check IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s USING (%s) WITH CHECK (%s)',
      p_policy_name, p_table, p_command, p_using, p_check
    );
  ELSE
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR %s USING (%s)',
      p_policy_name, p_table, p_command, p_using
    );
  END IF;

  RAISE NOTICE 'Created policy % on %', p_policy_name, p_table;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped policy % on %: %', p_policy_name, p_table, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Apply RLS policies safely
-- ============================================================================

-- Admin-only tables (full access for admins)
DO $$
DECLARE
  v_admin_check TEXT := 'EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)';
  v_tables TEXT[] := ARRAY[
    'reward_criteria_config',
    'reward_pool',
    'notification_templates',
    'support_playbooks',
    'playbook_steps'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    PERFORM temp_safe_create_policy(v_table, 'Admin can manage ' || v_table, 'ALL', v_admin_check);
  END LOOP;
END $$;

-- Read-only for everyone, admin can write
DO $$
DECLARE
  v_admin_check TEXT := 'EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)';
  v_tables TEXT[] := ARRAY['remote_config', 'feature_flags'];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    PERFORM temp_safe_create_policy(v_table, 'Admin can manage ' || v_table, 'ALL', v_admin_check);
    PERFORM temp_safe_create_policy(v_table, 'All can read ' || v_table, 'SELECT', 'true');
  END LOOP;
END $$;

-- User-owned data tables
DO $$
DECLARE
  v_user_check TEXT := 'user_id = auth.uid()';
  v_tables TEXT[] := ARRAY[
    'owner_usage_limits',
    'personal_use_verifications',
    'user_stats',
    'recommendation_tracking'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    PERFORM temp_safe_create_policy(v_table, 'Users own ' || v_table, 'ALL', v_user_check);
    -- Also allow service role
    PERFORM temp_safe_create_policy(
      v_table,
      'Service manages ' || v_table,
      'ALL',
      'auth.role() = ''service_role'''
    );
  END LOOP;
END $$;

-- car_stats: public read, system write
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.car_stats ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "car_stats_select_all" ON public.car_stats;
  DROP POLICY IF EXISTS "All can read car_stats" ON public.car_stats;
  CREATE POLICY "All can read car_stats" ON public.car_stats FOR SELECT USING (true);
  DROP POLICY IF EXISTS "System manages car_stats" ON public.car_stats;
  CREATE POLICY "System manages car_stats" ON public.car_stats FOR ALL USING (auth.role() = 'service_role');
  RAISE NOTICE 'Applied RLS to car_stats';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped car_stats: %', SQLERRM;
END $$;

-- owner_availability: owner_id or user_id based
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.owner_availability ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Users manage own availability" ON public.owner_availability;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
             AND table_name = 'owner_availability'
             AND column_name = 'owner_id') THEN
    CREATE POLICY "Users manage own availability" ON public.owner_availability
      FOR ALL USING (owner_id = auth.uid());
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'owner_availability'
                AND column_name = 'user_id') THEN
    CREATE POLICY "Users manage own availability" ON public.owner_availability
      FOR ALL USING (user_id = auth.uid());
  END IF;
  RAISE NOTICE 'Applied RLS to owner_availability';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped owner_availability: %', SQLERRM;
END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS temp_safe_create_policy(TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================================
-- Fix wallet functions (IDOR vulnerabilities)
-- ============================================================================

-- wallet_transfer: validate recipient exists
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
  v_to_exists BOOLEAN;
BEGIN
  -- SECURITY: Caller must be the sender
  IF p_from_user != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  -- SECURITY: Cannot transfer to yourself
  IF p_from_user = p_to_user THEN
    RETURN jsonb_build_object('success', false, 'error', 'SELF_TRANSFER');
  END IF;

  -- SECURITY: Recipient must exist
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_to_user) INTO v_to_exists;
  IF NOT v_to_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'RECIPIENT_NOT_FOUND');
  END IF;

  -- SECURITY: Amount must be positive
  IF p_amount_cents <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
  END IF;

  -- Check sender balance
  SELECT COALESCE(available_balance_cents, 0) INTO v_from_balance
  FROM public.wallets WHERE user_id = p_from_user;

  IF v_from_balance < p_amount_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_FUNDS');
  END IF;

  -- Debit from sender
  INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_from_user, 'transfer_out', p_amount_cents, p_ref,
          jsonb_build_object('to_user', p_to_user) || COALESCE(p_meta, '{}'::jsonb));

  -- Credit to recipient
  INSERT INTO public.wallet_ledger (user_id, kind, amount_cents, ref, meta)
  VALUES (p_to_user, 'transfer_in', p_amount_cents, p_ref,
          jsonb_build_object('from_user', p_from_user) || COALESCE(p_meta, '{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'ref', p_ref, 'amount_cents', p_amount_cents);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'TRANSFER_FAILED', 'message', SQLERRM);
END;
$$;

-- ============================================================================
-- Add missing indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cars_owner_status ON public.cars (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_car_status_created ON public.bookings (car_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON public.payments (booking_id, status);

-- Geo index (if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'cars' AND column_name = 'latitude') THEN
    CREATE INDEX IF NOT EXISTS idx_cars_location ON public.cars (latitude, longitude)
    WHERE status = 'active';
    RAISE NOTICE 'Created geo index on cars';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped geo index: %', SQLERRM;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
