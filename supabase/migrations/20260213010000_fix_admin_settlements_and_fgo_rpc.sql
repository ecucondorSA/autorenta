-- ============================================================================
-- Migration: Fix admin settlements — real pay_fgo_siniestro replacing stub
-- ============================================================================
-- Replaces the stub pay_fgo_siniestro() with a real implementation that:
-- 1. Validates the booking exists
-- 2. Deducts from the FGO platform wallet
-- 3. Records a wallet transaction
-- 4. Updates the claim waterfall_result
-- 5. Sets platform_blocked + pending_debt if FGO insufficient
-- ============================================================================

-- Drop old stub (had wrong signature: p_claim_id, p_amount)
DROP FUNCTION IF EXISTS public.pay_fgo_siniestro(UUID, NUMERIC);

-- Create real implementation matching the caller in fgo-v1-1.service.ts
-- Caller sends: p_booking_id, p_amount_cents, p_description
CREATE OR REPLACE FUNCTION public.pay_fgo_siniestro(
    p_booking_id UUID,
    p_amount_cents BIGINT,
    p_description TEXT DEFAULT 'Pago FGO por siniestro'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_platform_wallet_id UUID;
    v_platform_balance BIGINT;
    v_amount_usd NUMERIC(10,2);
    v_transaction_id UUID;
    v_claim_id UUID;
    v_booking RECORD;
    v_paid_cents BIGINT;
    v_deficit_cents BIGINT := 0;
BEGIN
    -- Validate amount
    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive: %', p_amount_cents;
    END IF;

    -- Validate booking exists
    SELECT id, renter_id, owner_id, status
    INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    v_amount_usd := p_amount_cents / 100.0;

    -- Find the platform FGO wallet (convention: user_id = '00000000-0000-0000-0000-000000000000' or a config)
    -- We look for a wallet with type 'fgo' or the platform system wallet
    SELECT id, available_balance
    INTO v_platform_wallet_id, v_platform_balance
    FROM user_wallets
    WHERE account_type = 'fgo'
    LIMIT 1;

    -- If no FGO wallet found, try the platform wallet
    IF v_platform_wallet_id IS NULL THEN
        SELECT id, available_balance
        INTO v_platform_wallet_id, v_platform_balance
        FROM user_wallets
        WHERE account_type = 'platform'
        LIMIT 1;
    END IF;

    IF v_platform_wallet_id IS NULL THEN
        -- No platform wallet: record as deficit, don't fail
        v_paid_cents := 0;
        v_deficit_cents := p_amount_cents;
    ELSIF v_platform_balance < p_amount_cents THEN
        -- Partial payment: pay what we can, rest is deficit
        v_paid_cents := v_platform_balance;
        v_deficit_cents := p_amount_cents - v_platform_balance;
    ELSE
        -- Full payment
        v_paid_cents := p_amount_cents;
        v_deficit_cents := 0;
    END IF;

    -- Deduct from FGO wallet if there's something to pay
    IF v_paid_cents > 0 AND v_platform_wallet_id IS NOT NULL THEN
        UPDATE user_wallets
        SET available_balance = available_balance - v_paid_cents,
            updated_at = now()
        WHERE id = v_platform_wallet_id;

        -- Record wallet transaction
        INSERT INTO wallet_transactions (
            user_id, type, amount, currency, status, description,
            booking_id, metadata, created_at
        )
        VALUES (
            v_booking.owner_id,
            'charge',
            v_paid_cents,
            'USD',
            'completed',
            p_description,
            p_booking_id,
            jsonb_build_object(
                'source', 'fgo',
                'fgo_wallet_id', v_platform_wallet_id,
                'total_claim_cents', p_amount_cents,
                'paid_cents', v_paid_cents,
                'deficit_cents', v_deficit_cents
            ),
            now()
        )
        RETURNING id INTO v_transaction_id;
    END IF;

    -- Find associated claim (if any) and update waterfall_result
    SELECT id INTO v_claim_id
    FROM claims
    WHERE booking_id = p_booking_id
      AND status IN ('approved', 'processing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_claim_id IS NOT NULL THEN
        UPDATE claims
        SET waterfall_result = COALESCE(waterfall_result, '{}'::jsonb) || jsonb_build_object(
                'fgo_paid_cents', v_paid_cents,
                'fgo_deficit_cents', v_deficit_cents,
                'fgo_transaction_id', v_transaction_id,
                'fgo_paid_at', now()::text
            ),
            status = CASE
                WHEN v_deficit_cents = 0 THEN 'paid'::claim_status
                ELSE 'processing'::claim_status
            END,
            updated_at = now()
        WHERE id = v_claim_id;
    END IF;

    -- If deficit exists, block the renter from future bookings
    IF v_deficit_cents > 0 THEN
        UPDATE profiles
        SET platform_blocked = true,
            pending_debt_cents = COALESCE(pending_debt_cents, 0) + v_deficit_cents,
            updated_at = now()
        WHERE id = v_booking.renter_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'claim_id', v_claim_id,
        'transaction_id', v_transaction_id,
        'paid_cents', v_paid_cents,
        'deficit_cents', v_deficit_cents,
        'description', p_description
    );
END;
$$;

-- Grant to service_role (called from Edge Functions / admin)
GRANT EXECUTE ON FUNCTION public.pay_fgo_siniestro(UUID, BIGINT, TEXT) TO service_role;

COMMENT ON FUNCTION public.pay_fgo_siniestro IS
'Executes FGO (Fondo de Garantia Operativa) payment for a damage claim.
Deducts from the platform FGO wallet, records transaction, updates claim.
If FGO balance insufficient, records deficit and blocks renter from future bookings.';
