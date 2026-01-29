-- ============================================================================
-- P0-SECURITY: Atomic Damage Deduction Function
-- ============================================================================
-- This migration creates a function that atomically:
-- 1. Deducts damage amount from renter's locked wallet
-- 2. Pays the owner the damage amount
-- 3. Updates booking wallet status
--
-- If any step fails, the entire transaction is rolled back.
-- ============================================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS wallet_deduct_damage_atomic(UUID, UUID, UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION wallet_deduct_damage_atomic(
  p_booking_id UUID,
  p_renter_id UUID,
  p_owner_id UUID,
  p_damage_amount_cents INTEGER,
  p_damage_description TEXT,
  p_car_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_tx_id UUID;
  v_locked_amount INTEGER;
  v_remaining_deposit INTEGER;
  v_ref TEXT;
  v_result JSONB;
BEGIN
  -- Generate unique reference
  v_ref := 'damage-deduction-' || p_booking_id || '-' || extract(epoch from now())::text;

  -- 1. Get and validate the lock transaction
  SELECT wl.id, wl.amount_cents
  INTO v_lock_tx_id, v_locked_amount
  FROM wallet_ledger wl
  WHERE wl.booking_id = p_booking_id
    AND wl.user_id = p_renter_id
    AND wl.kind IN ('lock', 'security_deposit_lock', 'rental_payment_lock')
    AND NOT EXISTS (
      -- Ensure no unlock has been processed for this booking
      SELECT 1 FROM wallet_ledger ul
      WHERE ul.booking_id = p_booking_id
        AND ul.user_id = p_renter_id
        AND ul.kind IN ('unlock', 'security_deposit_unlock')
    )
  ORDER BY wl.created_at DESC
  LIMIT 1;

  IF v_lock_tx_id IS NULL THEN
    RAISE EXCEPTION 'No locked security deposit found for booking %', p_booking_id
      USING ERRCODE = 'P0001';
  END IF;

  IF p_damage_amount_cents > v_locked_amount THEN
    RAISE EXCEPTION 'Damage amount (%) exceeds locked deposit (%)',
      p_damage_amount_cents, v_locked_amount
      USING ERRCODE = 'P0002';
  END IF;

  -- Calculate remaining deposit
  v_remaining_deposit := v_locked_amount - p_damage_amount_cents;

  -- 2. ATOMIC: Deduct from renter's wallet (rental_charge)
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_renter_id,
    'rental_charge',
    p_damage_amount_cents,
    v_ref || '-charge',
    p_booking_id,
    jsonb_build_object(
      'damage_description', p_damage_description,
      'deducted_at', now()::text,
      'car_id', p_car_id,
      'original_deposit', v_locked_amount,
      'atomic_transaction', true
    )
  );

  -- 3. ATOMIC: Pay to owner (rental_payment)
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_cents,
    ref,
    booking_id,
    meta
  ) VALUES (
    p_owner_id,
    'rental_payment',
    p_damage_amount_cents,
    v_ref || '-payment',
    p_booking_id,
    jsonb_build_object(
      'damage_description', p_damage_description,
      'received_at', now()::text,
      'car_id', p_car_id,
      'renter_id', p_renter_id,
      'atomic_transaction', true
    )
  );

  -- 4. ATOMIC: Unlock remaining deposit (if any)
  IF v_remaining_deposit > 0 THEN
    INSERT INTO wallet_ledger (
      user_id,
      kind,
      amount_cents,
      ref,
      booking_id,
      meta
    ) VALUES (
      p_renter_id,
      'unlock',
      v_remaining_deposit,
      v_ref || '-partial-unlock',
      p_booking_id,
      jsonb_build_object(
        'unlocked_at', now()::text,
        'reason', 'Partial release after damage deduction',
        'original_locked', v_locked_amount,
        'damage_charged', p_damage_amount_cents,
        'atomic_transaction', true
      )
    );
  END IF;

  -- 5. ATOMIC: Update booking wallet status
  UPDATE bookings
  SET
    wallet_status = CASE
      WHEN v_remaining_deposit > 0 THEN 'partially_charged'
      ELSE 'charged'
    END,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Build result
  v_result := jsonb_build_object(
    'ok', true,
    'remaining_deposit', v_remaining_deposit,
    'damage_charged', p_damage_amount_cents,
    'original_deposit', v_locked_amount,
    'ref', v_ref
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will be automatically rolled back
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION wallet_deduct_damage_atomic TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION wallet_deduct_damage_atomic IS
'P0-SECURITY: Atomically deducts damage amount from renter wallet and pays owner.
All operations succeed or fail together - no partial state possible.
Returns: {ok: boolean, remaining_deposit?: number, error?: string}';

-- ============================================================================
-- Claims table updates for locking support
-- ============================================================================

-- Add locking columns to claims table if they don't exist
DO $$
BEGIN
  -- Add locked_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'locked_at'
  ) THEN
    ALTER TABLE claims ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;

  -- Add locked_by column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'locked_by'
  ) THEN
    ALTER TABLE claims ADD COLUMN locked_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add processed_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'claims' AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE claims ADD COLUMN processed_at TIMESTAMPTZ;
  END IF;

  -- Update status enum to include 'processing' if claims table exists
  -- This is a safe operation - it will only add if not exists
  BEGIN
    ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'processing';
  EXCEPTION
    WHEN undefined_object THEN
      -- Type doesn't exist, ignore
      NULL;
    WHEN duplicate_object THEN
      -- Value already exists, ignore
      NULL;
  END;
END $$;

-- Create index for efficient lock queries
CREATE INDEX IF NOT EXISTS idx_claims_status_locked
ON claims(status, locked_at)
WHERE status = 'processing';

-- ============================================================================
-- Anti-fraud validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_claim_anti_fraud(
  p_booking_id UUID,
  p_owner_id UUID,
  p_total_estimated_usd NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_duration_hours INTEGER;
  v_owner_claims_last_30d INTEGER;
  v_owner_total_claimed_usd NUMERIC;
  v_avg_claim_amount_usd NUMERIC;
  v_warnings JSONB := '[]'::jsonb;
  v_block_reason TEXT := NULL;
BEGIN
  -- 1. Check booking duration (flag if < 24 hours)
  SELECT EXTRACT(EPOCH FROM (end_at - start_at)) / 3600
  INTO v_booking_duration_hours
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_duration_hours IS NOT NULL AND v_booking_duration_hours < 24 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'short_booking',
      'message', 'Booking duration is less than 24 hours',
      'value', v_booking_duration_hours
    );
  END IF;

  -- 2. Check owner's claim frequency (last 30 days)
  SELECT COUNT(*), COALESCE(SUM(total_estimated_cost_usd), 0)
  INTO v_owner_claims_last_30d, v_owner_total_claimed_usd
  FROM claims
  WHERE reported_by = p_owner_id
    AND created_at > now() - interval '30 days'
    AND status NOT IN ('rejected');

  IF v_owner_claims_last_30d >= 3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'high_claim_frequency',
      'message', 'Owner has submitted 3+ claims in last 30 days',
      'value', v_owner_claims_last_30d
    );
  END IF;

  IF v_owner_claims_last_30d >= 5 THEN
    v_block_reason := 'Owner has submitted 5+ claims in last 30 days - requires manual review';
  END IF;

  -- 3. Check if claim amount is unusually high compared to owner's average
  SELECT AVG(total_estimated_cost_usd)
  INTO v_avg_claim_amount_usd
  FROM claims
  WHERE reported_by = p_owner_id
    AND status NOT IN ('rejected', 'draft');

  IF v_avg_claim_amount_usd IS NOT NULL
     AND p_total_estimated_usd > v_avg_claim_amount_usd * 3 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'unusually_high_amount',
      'message', 'Claim amount is 3x higher than owner average',
      'value', p_total_estimated_usd,
      'average', v_avg_claim_amount_usd
    );
  END IF;

  -- 4. Check for suspicious claim amount (exactly round numbers)
  IF p_total_estimated_usd = FLOOR(p_total_estimated_usd)
     AND p_total_estimated_usd >= 100 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'round_number_amount',
      'message', 'Claim amount is suspiciously round',
      'value', p_total_estimated_usd
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', v_block_reason IS NULL,
    'blocked', v_block_reason IS NOT NULL,
    'block_reason', v_block_reason,
    'warnings', v_warnings,
    'owner_claims_30d', v_owner_claims_last_30d,
    'owner_total_claimed_30d_usd', v_owner_total_claimed_usd
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_claim_anti_fraud TO authenticated;

COMMENT ON FUNCTION validate_claim_anti_fraud IS
'P0-SECURITY: Validates a claim for potential fraud patterns.
Returns warnings and can block submission if fraud score is too high.';
