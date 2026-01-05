-- =====================================================
-- Autorentar Club: Claims Integration
-- =====================================================
-- Created: 2026-01-06
-- Purpose: Integrate subscription coverage with claim processing
-- =====================================================

-- Add subscription charge tracking fields to insurance_claims
ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS
    charge_source TEXT; -- 'subscription', 'wallet', 'subscription_plus_wallet', 'card'

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS
    subscription_deducted_cents BIGINT DEFAULT 0;

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS
    wallet_charged_cents BIGINT DEFAULT 0;

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS
    charged_at TIMESTAMPTZ;

ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS
    charged_by UUID REFERENCES profiles(id);

-- Create index for charge tracking
CREATE INDEX IF NOT EXISTS idx_claims_charged_at
    ON insurance_claims(charged_at)
    WHERE charged_at IS NOT NULL;

-- RPC: Process claim charge with subscription priority
-- Called when admin approves a claim with financial responsibility
CREATE OR REPLACE FUNCTION process_claim_charge(
    p_claim_id UUID,
    p_booking_id UUID,
    p_renter_id UUID,
    p_damage_amount_cents BIGINT,
    p_description TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
    v_deduction_result JSON;
    v_remaining_to_charge BIGINT;
    v_subscription_deducted BIGINT := 0;
    v_wallet_charged BIGINT := 0;
    v_charge_source TEXT;
    v_wallet_balance BIGINT;
BEGIN
    -- Validate inputs
    IF p_damage_amount_cents <= 0 THEN
        RAISE EXCEPTION 'Damage amount must be positive';
    END IF;

    -- 1. Check for active subscription
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_renter_id
      AND status IN ('active', 'depleted') -- Can still deduct from active subscriptions
      AND remaining_balance_cents > 0
    ORDER BY created_at DESC
    LIMIT 1;

    -- 2. Process based on subscription availability
    IF FOUND AND v_subscription.remaining_balance_cents > 0 THEN
        -- Deduct from subscription first
        SELECT deduct_from_subscription(
            v_subscription.id,
            p_damage_amount_cents,
            p_booking_id,
            'claim_deduction',
            COALESCE(p_description, 'Cargo por daño - Claim #' || p_claim_id::TEXT)
        ) INTO v_deduction_result;

        v_subscription_deducted := (v_deduction_result->>'deducted_cents')::BIGINT;
        v_remaining_to_charge := (v_deduction_result->>'uncovered_cents')::BIGINT;

        IF v_remaining_to_charge > 0 THEN
            v_charge_source := 'subscription_plus_wallet';
        ELSE
            v_charge_source := 'subscription';
        END IF;
    ELSE
        -- No subscription coverage
        v_remaining_to_charge := p_damage_amount_cents;
        v_charge_source := 'wallet';
    END IF;

    -- 3. If remaining amount, charge from wallet/deposit
    IF v_remaining_to_charge > 0 THEN
        -- Check wallet balance
        SELECT COALESCE(SUM(
            CASE WHEN kind IN ('deposit', 'bonus', 'refund', 'wallet_transfer_in') THEN amount_cents
                 WHEN kind IN ('lock', 'franchise_user', 'withdrawal', 'wallet_transfer_out') THEN -amount_cents
                 ELSE 0
            END
        ), 0) INTO v_wallet_balance
        FROM wallet_ledger
        WHERE user_id = p_renter_id;

        -- If wallet has sufficient funds, deduct
        IF v_wallet_balance >= v_remaining_to_charge THEN
            -- Use existing wallet deduction function if available
            -- For now, create a ledger entry
            INSERT INTO wallet_ledger (
                user_id,
                kind,
                amount_cents,
                booking_id,
                description
            ) VALUES (
                p_renter_id,
                'franchise_user',
                v_remaining_to_charge,
                p_booking_id,
                COALESCE(p_description, 'Cargo por daño - Claim #' || p_claim_id::TEXT)
            );

            v_wallet_charged := v_remaining_to_charge;
        ELSE
            -- Insufficient wallet balance - mark as requiring manual collection
            v_charge_source := CASE
                WHEN v_subscription_deducted > 0 THEN 'subscription_partial_pending'
                ELSE 'pending_collection'
            END;

            -- Charge what's available in wallet
            IF v_wallet_balance > 0 THEN
                INSERT INTO wallet_ledger (
                    user_id,
                    kind,
                    amount_cents,
                    booking_id,
                    description
                ) VALUES (
                    p_renter_id,
                    'franchise_user',
                    v_wallet_balance,
                    p_booking_id,
                    COALESCE(p_description, 'Cargo parcial por daño - Claim #' || p_claim_id::TEXT)
                );

                v_wallet_charged := v_wallet_balance;
            END IF;
        END IF;
    END IF;

    -- 4. Update claim with charge information
    UPDATE insurance_claims
    SET
        charge_source = v_charge_source,
        subscription_deducted_cents = v_subscription_deducted,
        wallet_charged_cents = v_wallet_charged,
        charged_at = NOW(),
        charged_by = p_performed_by,
        updated_at = NOW()
    WHERE id = p_claim_id;

    -- 5. Return result
    RETURN json_build_object(
        'success', true,
        'charge_source', v_charge_source,
        'total_damage_cents', p_damage_amount_cents,
        'subscription_deducted_cents', v_subscription_deducted,
        'wallet_charged_cents', v_wallet_charged,
        'remaining_uncollected_cents', p_damage_amount_cents - v_subscription_deducted - v_wallet_charged,
        'subscription_remaining_balance', CASE
            WHEN v_deduction_result IS NOT NULL
            THEN (v_deduction_result->>'remaining_balance_cents')::BIGINT
            ELSE NULL
        END
    );
END;
$$;

COMMENT ON FUNCTION process_claim_charge IS 'Processes claim charges with subscription coverage priority.
Order of deduction:
1. Active subscription balance (if available)
2. Wallet balance (deposit/bonus)
3. Mark as pending collection (if insufficient funds)

Returns JSON with charge breakdown including source and amounts.';

-- RPC: Get claim charge summary for admin
CREATE OR REPLACE FUNCTION get_claim_charge_summary(p_claim_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_claim RECORD;
BEGIN
    SELECT * INTO v_claim
    FROM insurance_claims
    WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Claim not found');
    END IF;

    RETURN json_build_object(
        'claim_id', v_claim.id,
        'status', v_claim.status,
        'damage_amount_cents', v_claim.damage_amount_cents,
        'charge_source', v_claim.charge_source,
        'subscription_deducted_cents', COALESCE(v_claim.subscription_deducted_cents, 0),
        'wallet_charged_cents', COALESCE(v_claim.wallet_charged_cents, 0),
        'charged_at', v_claim.charged_at,
        'is_fully_collected', (
            COALESCE(v_claim.subscription_deducted_cents, 0) +
            COALESCE(v_claim.wallet_charged_cents, 0)
        ) >= COALESCE(v_claim.damage_amount_cents, 0)
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_claim_charge TO service_role;
GRANT EXECUTE ON FUNCTION get_claim_charge_summary TO authenticated;
