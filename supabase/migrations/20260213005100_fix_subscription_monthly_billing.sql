-- =============================================================================
-- Fix subscription system: monthly billing + correct coverage + missing RPCs
--
-- Problems fixed:
-- 1. create_subscription() used 365 days (annual) → now 30 days (monthly)
-- 2. create_subscription() had wrong coverage limits → aligned with frontend model
-- 3. create_subscription_with_wallet() had wrong price_cents → aligned with frontend
-- 4. Missing RPC: check_subscription_coverage() — needed by claim flow
-- 5. Missing RPC: upgrade_subscription_with_wallet() — needed by upgrade Edge Function
-- 6. Stub RPC: calculate_subscription_upgrade() — now real implementation
-- 7. New column: subscriptions.cancellable_after — non-cancellable first month
-- 8. New columns: profiles.platform_blocked + pending_debt_cents — damage recovery
--
-- Source of truth: apps/web/src/app/core/models/subscription.model.ts
--   club_standard: $19.99/mo, $3,000 coverage
--   club_black:    $34.99/mo, $6,000 coverage
--   club_luxury:   $69.99/mo, $15,000 coverage
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema changes
-- -----------------------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancellable_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_amount_cents BIGINT DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_debt_cents BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.subscriptions.cancellable_after IS
  'Earliest date the subscription can be cancelled. Set to starts_at + 30 days.';
COMMENT ON COLUMN public.subscriptions.purchase_amount_cents IS
  'Amount charged for this subscription period (in cents USD).';
COMMENT ON COLUMN public.profiles.platform_blocked IS
  'User blocked from booking due to unpaid damage debt.';
COMMENT ON COLUMN public.profiles.pending_debt_cents IS
  'Outstanding debt from uncovered damage claims (in cents USD).';

-- -----------------------------------------------------------------------------
-- 2. Fix create_subscription() — monthly billing + correct coverage
-- -----------------------------------------------------------------------------
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
    v_days INTEGER := 30; -- Monthly subscription
BEGIN
    -- Coverage and price based on tier (source: subscription.model.ts)
    CASE p_tier
        WHEN 'club_standard' THEN
            v_coverage_cents := 300000;   -- USD 3,000
            v_price_cents := 1999;        -- USD 19.99
        WHEN 'club_black' THEN
            v_coverage_cents := 600000;   -- USD 6,000
            v_price_cents := 3499;        -- USD 34.99
        WHEN 'club_luxury' THEN
            v_coverage_cents := 1500000;  -- USD 15,000
            v_price_cents := 6999;        -- USD 69.99
        ELSE
            RAISE EXCEPTION 'Invalid tier: %', p_tier;
    END CASE;

    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        coverage_limit_cents,
        remaining_balance_cents,
        purchase_amount_cents,
        payment_provider,
        payment_external_id,
        starts_at,
        expires_at,
        cancellable_after,
        metadata
    ) VALUES (
        p_user_id,
        p_tier,
        'active',
        v_coverage_cents,
        v_coverage_cents,  -- starts full
        v_price_cents,
        p_payment_provider,
        p_external_id,
        NOW(),
        NOW() + (v_days || ' days')::INTERVAL,
        NOW() + INTERVAL '30 days',  -- non-cancellable for 1 month
        p_meta
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Fix create_subscription_with_wallet() — monthly prices
-- -----------------------------------------------------------------------------
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
        metadata, completed_at
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
        reference_type, metadata, completed_at
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

    -- 5) Create Subscription (uses fixed create_subscription above)
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

REVOKE ALL ON FUNCTION public.create_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. NEW: check_subscription_coverage() — needed by claim/settlement flow
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_subscription_coverage(
    p_franchise_amount_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_sub RECORD;
    v_covered BIGINT;
    v_uncovered BIGINT;
    v_coverage_type TEXT;
BEGIN
    -- Get active subscription for current user
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- No subscription
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'has_coverage', false,
            'coverage_type', 'none',
            'reason', 'No active subscription',
            'subscription_id', NULL,
            'available_cents', 0,
            'covered_cents', 0,
            'uncovered_cents', p_franchise_amount_cents,
            'deposit_required_cents', p_franchise_amount_cents
        );
    END IF;

    -- Depleted subscription
    IF v_sub.remaining_balance_cents <= 0 THEN
        RETURN jsonb_build_object(
            'has_coverage', false,
            'coverage_type', 'depleted',
            'reason', 'Subscription coverage depleted',
            'subscription_id', v_sub.id,
            'tier', v_sub.tier,
            'available_cents', 0,
            'covered_cents', 0,
            'uncovered_cents', p_franchise_amount_cents,
            'deposit_required_cents', p_franchise_amount_cents
        );
    END IF;

    -- Calculate coverage
    IF v_sub.remaining_balance_cents >= p_franchise_amount_cents THEN
        v_covered := p_franchise_amount_cents;
        v_uncovered := 0;
        v_coverage_type := 'full';
    ELSE
        v_covered := v_sub.remaining_balance_cents;
        v_uncovered := p_franchise_amount_cents - v_sub.remaining_balance_cents;
        v_coverage_type := 'partial';
    END IF;

    RETURN jsonb_build_object(
        'has_coverage', true,
        'coverage_type', v_coverage_type,
        'reason', CASE v_coverage_type
            WHEN 'full' THEN 'Fully covered by subscription'
            ELSE 'Partially covered — user pays difference'
        END,
        'subscription_id', v_sub.id,
        'tier', v_sub.tier,
        'available_cents', v_sub.remaining_balance_cents,
        'covered_cents', v_covered,
        'uncovered_cents', v_uncovered,
        'deposit_required_cents', v_uncovered
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_subscription_coverage(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_subscription_coverage(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_coverage(BIGINT) TO service_role;

COMMENT ON FUNCTION public.check_subscription_coverage(BIGINT) IS
  'Check if authenticated user''s subscription can cover a franchise amount. Returns coverage breakdown.';

-- -----------------------------------------------------------------------------
-- 5. NEW: calculate_subscription_upgrade() — real implementation
-- -----------------------------------------------------------------------------
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
    -- Get current active subscription
    SELECT * INTO v_current
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'can_upgrade', false,
            'reason', 'no_active_subscription',
            'message', 'No tienes una suscripción activa para hacer upgrade.'
        );
    END IF;

    -- Tier levels for comparison
    v_tier_level_current := CASE v_current.tier
        WHEN 'club_standard' THEN 1
        WHEN 'club_black' THEN 2
        WHEN 'club_luxury' THEN 3
    END;
    v_tier_level_new := CASE p_new_tier
        WHEN 'club_standard' THEN 1
        WHEN 'club_black' THEN 2
        WHEN 'club_luxury' THEN 3
    END;

    -- Can only upgrade, not downgrade
    IF v_tier_level_new <= v_tier_level_current THEN
        RETURN jsonb_build_object(
            'can_upgrade', false,
            'reason', 'not_upgrade',
            'message', 'Solo puedes hacer upgrade a un tier superior.',
            'current_tier', v_current.tier
        );
    END IF;

    -- Monthly prices
    v_current_price := CASE v_current.tier
        WHEN 'club_standard' THEN 1999
        WHEN 'club_black' THEN 3499
        WHEN 'club_luxury' THEN 6999
    END;
    v_new_price := CASE p_new_tier
        WHEN 'club_standard' THEN 1999
        WHEN 'club_black' THEN 3499
        WHEN 'club_luxury' THEN 6999
    END;

    v_price_diff := v_new_price - v_current_price;

    RETURN jsonb_build_object(
        'can_upgrade', true,
        'current_tier', v_current.tier,
        'new_tier', p_new_tier,
        'current_subscription_id', v_current.id,
        'price_difference_cents', v_price_diff,
        'price_difference_usd', ROUND(v_price_diff::NUMERIC / 100, 2),
        'reason', 'eligible',
        'message', 'Upgrade disponible.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_subscription_upgrade(UUID, subscription_tier) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_subscription_upgrade(UUID, subscription_tier) TO service_role;

-- -----------------------------------------------------------------------------
-- 6. NEW: upgrade_subscription_with_wallet() — needed by Edge Function
-- -----------------------------------------------------------------------------
-- TODO(human): Implement the core upgrade logic
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
    v_new_coverage BIGINT;
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
        metadata, completed_at
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

REVOKE ALL ON FUNCTION public.upgrade_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upgrade_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.upgrade_subscription_with_wallet IS
  'Upgrade subscription to higher tier, charging wallet for price difference only.';
