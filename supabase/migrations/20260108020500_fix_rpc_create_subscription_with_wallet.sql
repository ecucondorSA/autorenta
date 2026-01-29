-- Fix create_subscription_with_wallet RPC to handle all tiers and ensure correct schema path
-- Date: 2026-01-08

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
    v_wallet RECORD;
    v_transaction_id UUID;
    v_subscription_id UUID;
    v_currency TEXT;
BEGIN
    -- 1. Determine amount based on tier (Explicit check for all current tiers)
    CASE p_tier
        WHEN 'club_standard' THEN
            v_amount_cents := 30000;
        WHEN 'club_black' THEN
            v_amount_cents := 60000;
        WHEN 'club_luxury' THEN
            v_amount_cents := 120000;
        ELSE
            RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
    END CASE;

    -- 2. Idempotency check (prevent double charging)
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

    -- 3. Prevent multiple active subscriptions
    IF EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active subscription. Cancel or wait for expiration.';
    END IF;

    -- 4. Lock wallet and validate balance
    SELECT * INTO v_wallet
    FROM public.user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user: %', p_user_id;
    END IF;

    IF v_wallet.available_balance_cents < v_amount_cents THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
            v_wallet.available_balance_cents, v_amount_cents;
    END IF;

    -- 5. Debit Wallet
    UPDATE public.user_wallets
    SET available_balance_cents = available_balance_cents - v_amount_cents,
        balance_cents = balance_cents - v_amount_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 6. Create Transaction Record
    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO public.wallet_transactions (
        id,
        user_id,
        type,
        amount,
        currency,
        status,
        description,
        provider,
        provider_transaction_id,
        metadata,
        completed_at
    ) VALUES (
        v_transaction_id,
        p_user_id,
        'charge',
        -v_amount_cents,
        v_currency,
        'completed',
        COALESCE(p_description, 'Suscripción Autorentar Club'),
        'wallet',
        p_ref,
        jsonb_build_object('subscription_tier', p_tier) || p_meta,
        NOW()
    );

    -- 7. Create Subscription (delegated to create_subscription helper)
    v_subscription_id := public.create_subscription(
        p_user_id,
        p_tier,
        'wallet',
        p_ref,
        jsonb_build_object(
            'wallet_transaction_id', v_transaction_id,
            'wallet_charge_ref', p_ref
        ) || p_meta
    );

    -- 8. Link Transaction back to subscription for easier lookup
    UPDATE public.subscriptions
    SET payment_transaction_id = v_transaction_id
    WHERE id = v_subscription_id;

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'completed',
        'subscription_id', v_subscription_id,
        'transaction_id', v_transaction_id
    );
END;
$$;

-- Ensure permissions are set
REVOKE ALL ON FUNCTION public.create_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;