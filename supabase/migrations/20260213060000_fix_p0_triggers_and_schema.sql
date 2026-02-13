-- ============================================================================
-- FIX P0: Triggers & Schema — Global Audit Findings
-- ============================================================================
-- Fixes:
--   P0-7: bookings.cancelled_by_role column missing (triggers fail at runtime)
--   P0-8: notify_booking_status_change uses GUC that returns NULL
--   Cleanup: Drop 4 orphan accounting trigger functions (disabled since 2026-01-11)
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. ADD cancelled_by_role TO bookings TABLE
-- ============================================================
-- Multiple trigger functions reference NEW.cancelled_by_role on bookings:
--   - add_cancellation_cooldown (reward_pool_system)
--   - calculate_daily_points (reward_pool_system)
--   - detect_owner_gaming_signals (antifraud_system)
-- All will raise a runtime error without this column.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT;

COMMENT ON COLUMN public.bookings.cancelled_by_role IS
  'Who cancelled the booking: renter, owner, system, or admin. Set by cancellation RPCs.';

-- Backfill from existing cancellation data where possible
UPDATE public.bookings b
SET cancelled_by_role = CASE
  WHEN b.status = 'cancelled_owner' THEN 'owner'
  WHEN b.status = 'cancelled_renter' THEN 'renter'
  WHEN b.status = 'cancelled_system' THEN 'system'
  ELSE NULL
END
WHERE b.cancelled_by_role IS NULL
  AND b.status IN ('cancelled_owner', 'cancelled_renter', 'cancelled_system', 'cancelled');

-- ============================================================
-- 1b. ADD phantom booking columns (used by booking_v2 RPCs)
-- ============================================================
-- These columns are referenced by booking_v2_submit_inspection,
-- booking_v2_resolve_conclusion, automation_timeouts_v2 cron, and
-- booking_completion_fix RPCs — all fail at runtime without them.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS has_damages BOOLEAN,
  ADD COLUMN IF NOT EXISTS damage_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS damage_description TEXT,
  ADD COLUMN IF NOT EXISTS owner_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS renter_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.has_damages IS 'Whether owner reported damages during inspection';
COMMENT ON COLUMN public.bookings.damage_amount_cents IS 'Damage amount in cents claimed by owner';
COMMENT ON COLUMN public.bookings.damage_description IS 'Description of damages reported by owner';
COMMENT ON COLUMN public.bookings.owner_confirmed_at IS 'When owner confirmed car delivery/return';
COMMENT ON COLUMN public.bookings.renter_confirmed_at IS 'When renter confirmed damage payment acceptance';

-- ============================================================
-- 2. FIX notify_booking_status_change — vault instead of GUC
-- ============================================================
-- The GUC current_setting('app.settings.service_role_key', true) was never
-- configured, making the Authorization header 'Bearer null'. This silently
-- fails all notification Edge Function calls.

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  v_service_key text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Read service_role_key from vault (same pattern as cron jobs)
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'notify_booking_status_change: service_role_key not found in vault';
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'UPDATE',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)::jsonb,
    'old_record', row_to_json(OLD)::jsonb
  );

  PERFORM net.http_post(
    url := 'https://aceacpaockyxgogxsfyc.supabase.co/functions/v1/notify-multi-channel',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_booking_status_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_booking_status_change() IS
  'Calls notify-multi-channel Edge Function when booking status changes. Uses vault for auth.';

-- ============================================================
-- 3. DROP orphan accounting trigger functions
-- ============================================================
-- These were disabled in migration 20260111230000 but their functions
-- remained in pg_proc. They reference non-existent account_codes.

DROP FUNCTION IF EXISTS public.trigger_accounting_revenue_recognition() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_accounting_wallet_deposit() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_accounting_wallet_withdrawal() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_accounting_security_deposit() CASCADE;

-- ============================================================
-- 4. ADD club_luxury to subscription_tier enum
-- ============================================================
-- Frontend has extensive logic for 3 tiers (club_standard, club_black,
-- club_luxury) but DB enum only has 2. This will cause insert failures
-- when a user tries to purchase the Black Access tier.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'club_luxury'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_tier')
  ) THEN
    ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'club_luxury';
  END IF;
END;
$$;

COMMIT;
