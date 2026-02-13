-- ============================================================================
-- FIX REFERRAL SYSTEM — 6-layer bug
-- ============================================================================
-- Root cause: migration 20260201130000_referrals_v1.sql overwrote the USD-updated
-- RPCs with the old ARS version, and never recreated the 3 critical triggers
-- that existed in the archive migration.
--
-- Bugs fixed:
--   1. apply_referral_code was V1 (ARS 50000) instead of USD (1000 cents)
--   2. 3 triggers missing (first_car, booking_completed, payout)
--   3. wallet_transaction_id column missing from referral_rewards
--   4. Old triggers referenced non-existent wallet_balance table
--   5. Welcome bonus stuck in 'pending' forever (nothing approved it)
--   6. Currency default still ARS instead of USD
--
-- New reward scheme:
--   - Referred user: $10 USD welcome bonus (auto-approved, non-withdrawable)
--   - Referrer: $15 USD when referred user's first car gets a completed booking
-- ============================================================================

BEGIN;

-- ============================================================
-- 1. SCHEMA CHANGES
-- ============================================================

-- Add wallet_transaction_id to referral_rewards (was in archive but not V1)
ALTER TABLE public.referral_rewards
  ADD COLUMN IF NOT EXISTS wallet_transaction_id UUID;

-- Add tracking columns to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS first_published_car_id UUID,
  ADD COLUMN IF NOT EXISTS trigger_booking_id UUID,
  ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ;

-- Fix currency default from ARS to USD
ALTER TABLE public.referral_rewards
  ALTER COLUMN currency SET DEFAULT 'USD';

-- ============================================================
-- 2. FIX apply_referral_code — USD, auto-approve welcome bonus
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_referred_user_id UUID,
  p_code TEXT,
  p_source TEXT DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_code_id UUID;
  v_referrer_id UUID;
  v_referral_id UUID;
  v_payout JSONB;
  v_tx_id UUID;
BEGIN
  -- Find active, non-expired code with remaining uses
  SELECT id, user_id INTO v_referral_code_id, v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired referral code';
  END IF;

  -- Anti-fraud: cannot refer yourself
  IF v_referrer_id = p_referred_user_id THEN
    RAISE EXCEPTION 'Cannot use own referral code';
  END IF;

  -- One referral per user
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id) THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (
    referrer_id, referred_id, referral_code_id, status, source
  ) VALUES (
    v_referrer_id, p_referred_user_id, v_referral_code_id, 'registered', p_source
  ) RETURNING id INTO v_referral_id;

  -- Increment usage counter
  UPDATE public.referral_codes
  SET current_uses = current_uses + 1
  WHERE id = v_referral_code_id;

  -- Credit $10 USD welcome bonus immediately (non-withdrawable platform credit)
  v_payout := public.process_wallet_transaction(
    p_referred_user_id,
    1000,  -- $10 USD in cents
    'bonus',
    'referral',
    'Bono de bienvenida por referido ($10 USD)',
    NULL,
    'referral_welcome_' || v_referral_id::text
  );

  v_tx_id := (v_payout->>'transaction_id')::UUID;

  -- Mark as non-withdrawable (can only be used on platform)
  IF v_tx_id IS NOT NULL THEN
    UPDATE public.wallet_transactions
    SET is_withdrawable = false
    WHERE id = v_tx_id;
  END IF;

  -- Record reward as already paid
  INSERT INTO public.referral_rewards (
    referral_id, user_id, reward_type, amount_cents, currency,
    status, wallet_transaction_id, approved_at, paid_at
  ) VALUES (
    v_referral_id, p_referred_user_id, 'welcome_bonus', 1000, 'USD',
    'paid', v_tx_id, now(), now()
  );

  RETURN v_referral_id;
END;
$$;

-- ============================================================
-- 3. TRIGGER: Track first published car for referred users
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_referral_track_first_car()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If this user was referred and hasn't published a car yet, track it
    UPDATE public.referrals
    SET
      first_published_car_id = NEW.id,
      status = 'first_car',
      first_car_at = now()
    WHERE referred_id = NEW.owner_id
      AND first_published_car_id IS NULL
      AND status IN ('registered', 'verified');

    -- Auto-generate referral code for every new car publisher
    PERFORM public.generate_referral_code(NEW.owner_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_track_first_car ON public.cars;
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.cars;

CREATE TRIGGER trigger_referral_track_first_car
  AFTER INSERT ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_referral_track_first_car();

-- ============================================================
-- 4. TRIGGER: Pay referrer $15 when booking on referred's car completes
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_referral_on_booking_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral RECORD;
  v_payout JSONB;
  v_tx_id UUID;
  v_idempotency_key TEXT;
BEGIN
  -- Only fire when booking transitions to 'completed'
  IF NEW.status::text = 'completed' AND OLD.status::text != 'completed' THEN

    -- Find a referral where this booking's car is the referred user's first car
    -- and the referrer hasn't been paid yet
    SELECT r.id, r.referrer_id, r.referred_id
    INTO v_referral
    FROM public.referrals r
    WHERE r.first_published_car_id = NEW.car_id
      AND r.status = 'first_car'
      AND r.trigger_booking_id IS NULL;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    -- Anti-fraud: renter cannot be the referrer (self-dealing)
    IF NEW.renter_id = v_referral.referrer_id THEN
      RETURN NEW;
    END IF;

    -- Anti-fraud: renter cannot be the referred user renting their own car
    IF NEW.renter_id = v_referral.referred_id THEN
      RETURN NEW;
    END IF;

    -- Credit referrer's wallet: $15 USD
    v_idempotency_key := 'referral_bonus_' || v_referral.id::text;

    v_payout := public.process_wallet_transaction(
      v_referral.referrer_id,
      1500,  -- $15 USD in cents
      'bonus',
      'referral',
      'Bono por referir nuevo Renter ($15 USD)',
      NEW.id,
      v_idempotency_key
    );

    v_tx_id := (v_payout->>'transaction_id')::UUID;

    -- Record reward
    INSERT INTO public.referral_rewards (
      referral_id, user_id, reward_type, amount_cents, currency,
      status, wallet_transaction_id, approved_at, paid_at
    ) VALUES (
      v_referral.id, v_referral.referrer_id, 'referrer_bonus', 1500, 'USD',
      'paid', v_tx_id, now(), now()
    );

    -- Mark referral as fully paid
    UPDATE public.referrals
    SET
      status = 'reward_paid',
      trigger_booking_id = NEW.id,
      first_booking_at = now(),
      reward_paid_at = now()
    WHERE id = v_referral.id;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_referral_on_booking_completed ON public.bookings;
DROP TRIGGER IF EXISTS trigger_auto_complete_first_booking ON public.bookings;

CREATE TRIGGER trigger_referral_on_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_referral_on_booking_completed();

-- ============================================================
-- 5. SIMPLIFY complete_referral_milestone (kept for manual/verified use)
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_referral_milestone(
  p_referred_user_id UUID,
  p_milestone TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral_id UUID;
  v_current_status TEXT;
BEGIN
  SELECT id, status INTO v_referral_id, v_current_status
  FROM public.referrals
  WHERE referred_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  CASE p_milestone
    WHEN 'verified' THEN
      IF v_current_status = 'registered' THEN
        UPDATE public.referrals
        SET status = 'verified', verified_at = now()
        WHERE id = v_referral_id;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid milestone: %. first_car and booking are handled by triggers.', p_milestone;
  END CASE;

  RETURN true;
END;
$$;

-- ============================================================
-- 6. CLEANUP: Drop old orphan trigger functions
-- ============================================================

DROP TRIGGER IF EXISTS trigger_auto_payout_rewards ON public.referral_rewards;
DROP FUNCTION IF EXISTS public.auto_generate_referral_code_on_first_car();
DROP FUNCTION IF EXISTS public.auto_complete_first_booking_milestone();
DROP FUNCTION IF EXISTS public.auto_payout_approved_rewards();

-- ============================================================
-- 7. FIX EXISTING DATA
-- ============================================================

-- 7a. Fix the 2 existing rewards stuck in pending/ARS
DO $$
DECLARE
  v_reward RECORD;
  v_payout JSONB;
  v_tx_id UUID;
BEGIN
  FOR v_reward IN
    SELECT rr.id, rr.referral_id, rr.user_id
    FROM public.referral_rewards rr
    WHERE rr.status = 'pending'
      AND rr.reward_type = 'welcome_bonus'
      AND rr.amount_cents = 50000
      AND rr.currency = 'ARS'
  LOOP
    -- Credit wallet: $10 USD
    v_payout := public.process_wallet_transaction(
      v_reward.user_id,
      1000,
      'bonus',
      'referral',
      'Bono de bienvenida por referido ($10 USD) - corrección',
      NULL,
      'referral_welcome_' || v_reward.referral_id::text
    );

    v_tx_id := (v_payout->>'transaction_id')::UUID;

    -- Mark non-withdrawable
    IF v_tx_id IS NOT NULL THEN
      UPDATE public.wallet_transactions
      SET is_withdrawable = false
      WHERE id = v_tx_id;
    END IF;

    -- Fix reward record
    UPDATE public.referral_rewards
    SET
      amount_cents = 1000,
      currency = 'USD',
      status = 'paid',
      wallet_transaction_id = v_tx_id,
      approved_at = now(),
      paid_at = now()
    WHERE id = v_reward.id;
  END LOOP;
END;
$$;

-- 7b. Backfill first_published_car_id for referred users who already have cars
DO $$
DECLARE
  v_ref RECORD;
  v_first_car_id UUID;
BEGIN
  FOR v_ref IN
    SELECT r.id, r.referred_id
    FROM public.referrals r
    WHERE r.first_published_car_id IS NULL
      AND r.status IN ('registered', 'verified')
  LOOP
    SELECT id INTO v_first_car_id
    FROM public.cars
    WHERE owner_id = v_ref.referred_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_first_car_id IS NOT NULL THEN
      UPDATE public.referrals
      SET
        first_published_car_id = v_first_car_id,
        status = 'first_car',
        first_car_at = now()
      WHERE id = v_ref.id;
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 8. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_referral_milestone(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.apply_referral_code IS 'Applies referral code: creates referral + $10 USD welcome bonus (auto-paid, non-withdrawable)';
COMMENT ON FUNCTION public.complete_referral_milestone IS 'Manual milestone (verified only). first_car and booking handled by triggers.';
COMMENT ON FUNCTION public.trg_referral_track_first_car IS 'Tracks first published car for referred users + auto-generates referral code';
COMMENT ON FUNCTION public.trg_referral_on_booking_completed IS 'Pays referrer $15 USD when referred users first car gets a completed booking';

COMMIT;
