-- Add upgrade_subscription_with_wallet RPC
-- Implements "Option A": Pay difference and restart year
-- Date: 2026-01-08

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
    v_current_sub RECORD;
    v_wallet RECORD;
    v_current_price BIGINT;
    v_new_price BIGINT;
    v_diff_cents BIGINT;
    v_new_coverage BIGINT;
    v_transaction_id UUID;
    v_currency TEXT;
BEGIN
    -- 1. Get Active Subscription
    SELECT * INTO v_current_sub
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'no_active_subscription';
    END IF;

    -- 2. Determine Prices & Coverage
    -- Prices: Standard ($300), Black ($600), Luxury ($1200)
    CASE v_current_sub.tier
        WHEN 'club_standard' THEN v_current_price := 30000;
        WHEN 'club_black' THEN v_current_price := 60000;
        WHEN 'club_luxury' THEN v_current_price := 120000;
        ELSE v_current_price := 0;
    END CASE;

    CASE p_new_tier
        WHEN 'club_standard' THEN
            v_new_price := 30000;
            v_new_coverage := 80000;
        WHEN 'club_black' THEN
            v_new_price := 60000;
            v_new_coverage := 120000;
        WHEN 'club_luxury' THEN
            v_new_price := 120000;
            v_new_coverage := 200000;
        ELSE RAISE EXCEPTION 'Invalid new tier';
    END CASE;

    -- 3. Validate Upgrade (New > Old)
    IF v_new_price <= v_current_price THEN
        RAISE EXCEPTION 'not_upgrade';
    END IF;

    v_diff_cents := v_new_price - v_current_price;

    -- 4. Check Wallet
    SELECT * INTO v_wallet
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
         RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_wallet.available_balance_cents < v_diff_cents THEN
         RAISE EXCEPTION 'insufficient_balance';
    END IF;

    -- 5. Charge Wallet
    UPDATE user_wallets
    SET available_balance_cents = available_balance_cents - v_diff_cents,
        balance_cents = balance_cents - v_diff_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 6. Record Transaction
    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO wallet_transactions (
        id, user_id, type, amount, currency, status, description,
        provider, provider_transaction_id, metadata, completed_at
    ) VALUES (
        v_transaction_id, p_user_id, 'charge', -v_diff_cents, v_currency, 'completed',
        COALESCE(p_description, 'Upgrade Suscripción Autorentar Club'),
        'wallet', p_ref,
        p_meta || jsonb_build_object('upgrade_from', v_current_sub.tier, 'upgrade_to', p_new_tier),
        NOW()
    );

    -- 7. Update Subscription (Restart Year logic)
    UPDATE subscriptions
    SET
        tier = p_new_tier,
        coverage_limit_cents = v_new_coverage,
        remaining_balance_cents = v_new_coverage, -- Reset balance (Fresh start for new tier)
        starts_at = NOW(), -- Reset start
        expires_at = NOW() + INTERVAL '365 days', -- Reset expiry (Full new year)
        updated_at = NOW(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'last_upgrade_at', NOW(),
            'last_upgrade_transaction', v_transaction_id,
            'previous_tier', v_current_sub.tier,
            'upgraded_from_starts_at', v_current_sub.starts_at,
            'upgrade_price_paid_cents', v_diff_cents
        )
    WHERE id = v_current_sub.id;

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_current_sub.id,
        'price_paid_usd', v_diff_cents::float / 100.0,
        'transaction_id', v_transaction_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;
