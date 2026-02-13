-- ============================================================================
-- Migration: Increase Club Access (club_standard) from $19.99 → $24.99/mes
-- ============================================================================
-- Sustainability adjustment: at $19.99 the loss ratio is ~78% at 5% claims.
-- At $24.99 it drops to ~62%, making the tier viable long-term.
-- Silver ($34.99) and Black ($69.99) remain unchanged.
-- ============================================================================

-- 1. Update subscription_plans seed
UPDATE public.subscription_plans
SET price_cents = 2499, updated_at = NOW()
WHERE slug = 'club_standard';

-- 2. Fix create_subscription() — club_standard price
CREATE OR REPLACE FUNCTION public.create_subscription(
    p_user_id UUID,
    p_tier subscription_tier,
    p_payment_provider TEXT,
    p_external_id TEXT,
    p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_subscription_id UUID;
    v_coverage_cents BIGINT;
    v_price_cents BIGINT;
    v_days INTEGER := 30;
BEGIN
    CASE p_tier
        WHEN 'club_standard' THEN
            v_coverage_cents := 300000;
            v_price_cents := 2499;        -- USD 24.99
        WHEN 'club_black' THEN
            v_coverage_cents := 600000;
            v_price_cents := 3499;        -- USD 34.99
        WHEN 'club_luxury' THEN
            v_coverage_cents := 1500000;
            v_price_cents := 6999;        -- USD 69.99
        ELSE
            RAISE EXCEPTION 'Invalid tier: %', p_tier;
    END CASE;

    INSERT INTO public.subscriptions (
        user_id, tier, status, coverage_limit_cents, remaining_balance_cents,
        purchase_amount_cents, payment_provider, payment_external_id,
        starts_at, expires_at, cancellable_after, metadata
    ) VALUES (
        p_user_id, p_tier, 'active', v_coverage_cents, v_coverage_cents,
        v_price_cents, p_payment_provider, p_external_id,
        NOW(), NOW() + (v_days || ' days')::INTERVAL,
        NOW() + INTERVAL '30 days', p_meta
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;

-- 3. Fix create_subscription_with_wallet() — club_standard price
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
    v_activation_lock_cents BIGINT := 15000;
    v_total_required BIGINT;
    v_wallet RECORD;
    v_transaction_id UUID;
    v_lock_transaction_id UUID;
    v_subscription_id UUID;
    v_currency TEXT;
BEGIN
    CASE p_tier
        WHEN 'club_standard' THEN v_amount_cents := 2499;  -- USD 24.99
        WHEN 'club_black' THEN v_amount_cents := 3499;     -- USD 34.99
        WHEN 'club_luxury' THEN v_amount_cents := 6999;    -- USD 69.99
        ELSE RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
    END CASE;

    v_total_required := v_amount_cents + v_activation_lock_cents;

    SELECT id INTO v_subscription_id
    FROM public.subscriptions
    WHERE user_id = p_user_id AND payment_external_id = p_ref
    ORDER BY created_at DESC LIMIT 1;

    IF v_subscription_id IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'status', 'duplicate', 'subscription_id', v_subscription_id);
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active subscription. Cancel or wait for expiration.';
    END IF;

    SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found for user: %', p_user_id; END IF;

    IF v_wallet.available_balance_cents < v_total_required THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: % (membership: % + guarantee: %)',
            v_wallet.available_balance_cents, v_total_required, v_amount_cents, v_activation_lock_cents;
    END IF;

    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_amount_cents,
        balance_cents = balance_cents - v_amount_cents, updated_at = NOW()
    WHERE user_id = p_user_id;

    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_activation_lock_cents,
        locked_balance_cents = locked_balance_cents + v_activation_lock_cents, updated_at = NOW()
    WHERE user_id = p_user_id;

    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, currency, status,
        description, provider, provider_transaction_id,
        provider_metadata, completed_at
    ) VALUES (
        v_transaction_id, p_user_id, 'charge', -v_amount_cents, v_currency,
        'completed', COALESCE(p_description, 'Suscripción mensual Autorentar Club'),
        'wallet', p_ref,
        jsonb_build_object('subscription_tier', p_tier) || p_meta, NOW()
    );

    v_lock_transaction_id := gen_random_uuid();

    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, currency, status,
        description, provider, provider_transaction_id,
        reference_type, provider_metadata, completed_at
    ) VALUES (
        v_lock_transaction_id, p_user_id, 'lock', v_activation_lock_cents, v_currency,
        'completed', 'Garantía de activación membresía (se libera al expirar)',
        'wallet', p_ref || '_lock', 'subscription_guarantee',
        jsonb_build_object(
            'subscription_tier', p_tier, 'lock_type', 'activation_guarantee',
            'lock_amount_usd', 150, 'releases_at', (NOW() + INTERVAL '30 days')::TEXT
        ), NOW()
    );

    v_subscription_id := public.create_subscription(
        p_user_id, p_tier, 'wallet', p_ref,
        jsonb_build_object(
            'wallet_transaction_id', v_transaction_id, 'wallet_charge_ref', p_ref,
            'activation_lock_transaction_id', v_lock_transaction_id,
            'activation_lock_cents', v_activation_lock_cents
        ) || p_meta
    );

    UPDATE public.subscriptions SET payment_transaction_id = v_transaction_id WHERE id = v_subscription_id;

    RETURN jsonb_build_object(
        'ok', true, 'status', 'completed', 'subscription_id', v_subscription_id,
        'transaction_id', v_transaction_id, 'lock_transaction_id', v_lock_transaction_id,
        'activation_lock_usd', 150
    );
END;
$$;

-- 4. Fix calculate_subscription_upgrade() — club_standard price for diff calc
CREATE OR REPLACE FUNCTION public.calculate_subscription_upgrade(
    p_user_id UUID,
    p_new_tier subscription_tier
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_current RECORD;
    v_current_price BIGINT;
    v_new_price BIGINT;
    v_tier_level_current INT;
    v_tier_level_new INT;
    v_price_diff BIGINT;
BEGIN
    SELECT * INTO v_current
    FROM public.subscriptions
    WHERE user_id = p_user_id AND status = 'active' AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_upgrade', false, 'reason', 'no_active_subscription',
            'message', 'No tienes una suscripción activa para hacer upgrade.'
        );
    END IF;

    v_tier_level_current := CASE v_current.tier
        WHEN 'club_standard' THEN 1 WHEN 'club_black' THEN 2 WHEN 'club_luxury' THEN 3 END;
    v_tier_level_new := CASE p_new_tier
        WHEN 'club_standard' THEN 1 WHEN 'club_black' THEN 2 WHEN 'club_luxury' THEN 3 END;

    IF v_tier_level_new <= v_tier_level_current THEN
        RETURN jsonb_build_object(
            'can_upgrade', false, 'reason', 'not_upgrade',
            'message', 'Solo puedes hacer upgrade a un tier superior.',
            'current_tier', v_current.tier
        );
    END IF;

    v_current_price := CASE v_current.tier
        WHEN 'club_standard' THEN 2499 WHEN 'club_black' THEN 3499 WHEN 'club_luxury' THEN 6999 END;
    v_new_price := CASE p_new_tier
        WHEN 'club_standard' THEN 2499 WHEN 'club_black' THEN 3499 WHEN 'club_luxury' THEN 6999 END;

    v_price_diff := v_new_price - v_current_price;

    RETURN jsonb_build_object(
        'can_upgrade', true, 'current_tier', v_current.tier, 'new_tier', p_new_tier,
        'current_subscription_id', v_current.id, 'price_difference_cents', v_price_diff,
        'price_difference_usd', ROUND(v_price_diff::NUMERIC / 100, 2),
        'reason', 'eligible', 'message', 'Upgrade disponible.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_subscription_upgrade(UUID, subscription_tier) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_subscription_upgrade(UUID, subscription_tier) TO service_role;
