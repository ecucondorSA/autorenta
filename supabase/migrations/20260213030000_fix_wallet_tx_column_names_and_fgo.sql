-- ============================================================================
-- Migration: Fix wallet_transactions column names in subscription RPCs + FGO
-- ============================================================================
-- Fixes dormant bugs: all 3 subscription RPCs used 'metadata' column in
-- wallet_transactions INSERTs, but the real column is 'provider_metadata'.
-- PL/pgSQL doesn't validate column names at CREATE time — only at execution.
-- Also rewrites pay_fgo_siniestro to use fgo_subfunds (not user_wallets).
-- ============================================================================

-- 1. Fix create_subscription_with_wallet() — metadata → provider_metadata
CREATE OR REPLACE FUNCTION public.create_subscription_with_wallet(
    p_user_id UUID,
    p_tier subscription_tier,
    p_ref TEXT,
    p_description TEXT DEFAULT NULL,
    p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_amount_cents BIGINT;
    v_activation_lock_cents BIGINT := 15000; -- USD 150 (starter floor = skin in the game)
    v_total_required BIGINT;
    v_wallet RECORD;
    v_transaction_id UUID;
    v_lock_transaction_id UUID;
    v_subscription_id UUID;
    v_currency TEXT;
BEGIN
    -- Monthly prices (source: subscription.model.ts)
    CASE p_tier
        WHEN 'club_standard' THEN
            v_amount_cents := 1999;     -- USD 19.99
        WHEN 'club_black' THEN
            v_amount_cents := 3499;     -- USD 34.99
        WHEN 'club_luxury' THEN
            v_amount_cents := 6999;     -- USD 69.99
        ELSE
            RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
    END CASE;

    v_total_required := v_amount_cents + v_activation_lock_cents;

    -- Idempotency check
    SELECT id INTO v_subscription_id
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND payment_external_id = p_ref
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_subscription_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'ok', true,
            'status', 'duplicate',
            'subscription_id', v_subscription_id
        );
    END IF;

    -- Prevent multiple active subscriptions
    IF EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active subscription. Cancel or wait for expiration.';
    END IF;

    -- Lock wallet and validate balance (membership fee + activation lock)
    SELECT * INTO v_wallet
    FROM public.user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user: %', p_user_id;
    END IF;

    IF v_wallet.available_balance_cents < v_total_required THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: % (membership: % + guarantee: %)',
            v_wallet.available_balance_cents, v_total_required, v_amount_cents, v_activation_lock_cents;
    END IF;

    -- 1) Debit membership fee (permanent charge)
    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_amount_cents,
        balance_cents = balance_cents - v_amount_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 2) Lock activation guarantee (temporary, released on subscription expiry)
    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_activation_lock_cents,
        locked_balance_cents = locked_balance_cents + v_activation_lock_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 3) Create charge transaction (membership fee)
    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, currency, status,
        description, provider, provider_transaction_id,
        provider_metadata, completed_at
    ) VALUES (
        v_transaction_id, p_user_id, 'charge', -v_amount_cents, v_currency,
        'completed',
        COALESCE(p_description, 'Suscripción mensual Autorentar Club'),
        'wallet', p_ref,
        jsonb_build_object('subscription_tier', p_tier) || p_meta,
        NOW()
    );

    -- 4) Create lock transaction (activation guarantee)
    v_lock_transaction_id := gen_random_uuid();

    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, currency, status,
        description, provider, provider_transaction_id,
        reference_type, provider_metadata, completed_at
    ) VALUES (
        v_lock_transaction_id, p_user_id, 'lock', v_activation_lock_cents, v_currency,
        'completed',
        'Garantía de activación membresía (se libera al expirar)',
        'wallet', p_ref || '_lock',
        'subscription_guarantee',
        jsonb_build_object(
            'subscription_tier', p_tier,
            'lock_type', 'activation_guarantee',
            'lock_amount_usd', 150,
            'releases_at', (NOW() + INTERVAL '30 days')::TEXT
        ),
        NOW()
    );

    -- 5) Create Subscription
    v_subscription_id := public.create_subscription(
        p_user_id, p_tier, 'wallet', p_ref,
        jsonb_build_object(
            'wallet_transaction_id', v_transaction_id,
            'wallet_charge_ref', p_ref,
            'activation_lock_transaction_id', v_lock_transaction_id,
            'activation_lock_cents', v_activation_lock_cents
        ) || p_meta
    );

    -- 6) Link transactions to subscription
    UPDATE public.subscriptions
    SET payment_transaction_id = v_transaction_id
    WHERE id = v_subscription_id;

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'completed',
        'subscription_id', v_subscription_id,
        'transaction_id', v_transaction_id,
        'lock_transaction_id', v_lock_transaction_id,
        'activation_lock_usd', 150
    );
END;
$$;

-- 2. Fix upgrade_subscription_with_wallet() — metadata → provider_metadata
CREATE OR REPLACE FUNCTION public.upgrade_subscription_with_wallet(
    p_user_id UUID,
    p_new_tier subscription_tier,
    p_ref TEXT,
    p_description TEXT DEFAULT NULL,
    p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_current RECORD;
    v_upgrade_calc JSONB;
    v_price_diff BIGINT;
    v_wallet RECORD;
    v_transaction_id UUID;
    v_new_subscription_id UUID;
    v_currency TEXT;
BEGIN
    -- Calculate upgrade eligibility
    v_upgrade_calc := public.calculate_subscription_upgrade(p_user_id, p_new_tier);

    IF NOT (v_upgrade_calc->>'can_upgrade')::BOOLEAN THEN
        RAISE EXCEPTION '%', v_upgrade_calc->>'message';
    END IF;

    v_price_diff := (v_upgrade_calc->>'price_difference_cents')::BIGINT;

    -- Lock wallet and validate
    SELECT * INTO v_wallet
    FROM public.user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet no encontrada para usuario: %', p_user_id;
    END IF;

    IF v_wallet.available_balance_cents < v_price_diff THEN
        RAISE EXCEPTION 'Saldo insuficiente. Disponible: %, Requerido: %',
            v_wallet.available_balance_cents, v_price_diff;
    END IF;

    -- Debit wallet for price difference
    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_price_diff,
        balance_cents = balance_cents - v_price_diff,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Create transaction record
    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, currency, status,
        description, provider, provider_transaction_id,
        provider_metadata, completed_at
    ) VALUES (
        v_transaction_id, p_user_id, 'charge', -v_price_diff, v_currency,
        'completed',
        COALESCE(p_description, 'Upgrade suscripción Autorentar Club'),
        'wallet', p_ref,
        jsonb_build_object(
            'subscription_upgrade', true,
            'from_tier', v_upgrade_calc->>'current_tier',
            'to_tier', p_new_tier
        ) || p_meta,
        NOW()
    );

    -- Mark old subscription as upgraded
    UPDATE public.subscriptions
    SET status = 'cancelled',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'upgraded_to', p_new_tier,
            'upgraded_at', NOW()::TEXT,
            'upgrade_transaction_id', v_transaction_id::TEXT
        ),
        updated_at = NOW()
    WHERE id = (v_upgrade_calc->>'current_subscription_id')::UUID;

    -- Create new subscription at higher tier
    v_new_subscription_id := public.create_subscription(
        p_user_id, p_new_tier, 'wallet', p_ref,
        jsonb_build_object(
            'upgrade_from', v_upgrade_calc->>'current_tier',
            'upgrade_transaction_id', v_transaction_id,
            'previous_subscription_id', v_upgrade_calc->>'current_subscription_id'
        ) || p_meta
    );

    -- Link transaction
    UPDATE public.subscriptions
    SET payment_transaction_id = v_transaction_id
    WHERE id = v_new_subscription_id;

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'completed',
        'subscription_id', v_new_subscription_id,
        'transaction_id', v_transaction_id,
        'price_paid_cents', v_price_diff,
        'price_paid_usd', ROUND(v_price_diff::NUMERIC / 100, 2),
        'new_tier', p_new_tier
    );
END;
$$;

-- 3. Fix pay_fgo_siniestro() — rewrite to use fgo_subfunds instead of user_wallets
DROP FUNCTION IF EXISTS public.pay_fgo_siniestro(UUID, BIGINT, TEXT);

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
    v_fgo_subfund_id UUID;
    v_fgo_balance BIGINT;
    v_booking RECORD;
    v_claim_id UUID;
    v_transaction_id UUID;
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

    -- Find FGO liquidity subfund (the pool for immediate payments/claims)
    SELECT id, balance_cents
    INTO v_fgo_subfund_id, v_fgo_balance
    FROM fgo_subfunds
    WHERE subfund_type = 'liquidity'
    FOR UPDATE;

    IF v_fgo_subfund_id IS NULL OR v_fgo_balance IS NULL THEN
        -- No FGO fund: record full deficit
        v_paid_cents := 0;
        v_deficit_cents := p_amount_cents;
    ELSIF v_fgo_balance < p_amount_cents THEN
        -- Partial payment: pay what we can, rest is deficit
        v_paid_cents := v_fgo_balance;
        v_deficit_cents := p_amount_cents - v_fgo_balance;
    ELSE
        -- Full payment
        v_paid_cents := p_amount_cents;
        v_deficit_cents := 0;
    END IF;

    -- Deduct from FGO liquidity subfund
    IF v_paid_cents > 0 AND v_fgo_subfund_id IS NOT NULL THEN
        UPDATE fgo_subfunds
        SET balance_cents = balance_cents - v_paid_cents,
            updated_at = NOW()
        WHERE id = v_fgo_subfund_id;

        -- Record wallet transaction for audit trail (on owner's account)
        v_transaction_id := gen_random_uuid();

        INSERT INTO wallet_transactions (
            id, user_id, type, amount, currency, status,
            description, provider, provider_transaction_id,
            reference_type, reference_id, provider_metadata, completed_at
        ) VALUES (
            v_transaction_id,
            v_booking.owner_id,
            'charge',
            v_paid_cents,
            'USD',
            'completed',
            p_description,
            'fgo',
            'fgo_claim_' || p_booking_id::TEXT,
            'fgo_siniestro',
            p_booking_id,
            jsonb_build_object(
                'source', 'fgo_liquidity',
                'fgo_subfund_id', v_fgo_subfund_id,
                'total_claim_cents', p_amount_cents,
                'paid_cents', v_paid_cents,
                'deficit_cents', v_deficit_cents
            ),
            NOW()
        );
    END IF;

    -- Find associated claim and update waterfall_result
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
                'fgo_paid_at', NOW()::TEXT
            ),
            status = CASE
                WHEN v_deficit_cents = 0 THEN 'paid'::claim_status
                ELSE 'processing'::claim_status
            END,
            updated_at = NOW()
        WHERE id = v_claim_id;
    END IF;

    -- If deficit exists, block the renter from future bookings
    IF v_deficit_cents > 0 THEN
        UPDATE profiles
        SET platform_blocked = true,
            pending_debt_cents = COALESCE(pending_debt_cents, 0) + v_deficit_cents,
            updated_at = NOW()
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

GRANT EXECUTE ON FUNCTION public.pay_fgo_siniestro(UUID, BIGINT, TEXT) TO service_role;

COMMENT ON FUNCTION public.pay_fgo_siniestro IS
'Executes FGO payment for a damage claim from fgo_subfunds liquidity pool.
If insufficient funds, records deficit and blocks renter.';
