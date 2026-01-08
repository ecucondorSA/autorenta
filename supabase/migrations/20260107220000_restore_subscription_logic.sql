-- ============================================================================
-- RESTORE SUBSCRIPTION LOGIC
-- Date: 2026-01-07
-- Description: Restores missing subscriptions table and related functions
--              to fix 500 error in create-subscription-wallet.
-- ============================================================================

-- 1. Create Types if they don't exist
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('club_standard', 'club_black', 'club_luxury');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',

    -- Coverage & Limits
    coverage_limit_cents BIGINT NOT NULL,
    remaining_balance_cents BIGINT NOT NULL,

    -- Payment Info
    payment_provider TEXT NOT NULL, -- 'wallet', 'mercadopago'
    payment_external_id TEXT,       -- Reference from provider
    payment_transaction_id UUID REFERENCES public.wallet_transactions(id),

    -- Dates
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Create Subscription Helper Function
DROP FUNCTION IF EXISTS public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB);

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
SET search_path = public
AS $$
DECLARE
    v_subscription_id UUID;
    v_coverage_cents BIGINT;
    v_days INTEGER := 365; -- Annual subscription
BEGIN
    -- Determine coverage based on tier
    CASE p_tier
        WHEN 'club_standard' THEN v_coverage_cents := 80000;  -- $800 USD
        WHEN 'club_black' THEN v_coverage_cents := 120000;    -- $1200 USD
        WHEN 'club_luxury' THEN v_coverage_cents := 200000;   -- $2000 USD
        ELSE RAISE EXCEPTION 'Invalid tier: %', p_tier;
    END CASE;

    INSERT INTO public.subscriptions (
        user_id,
        tier,
        status,
        coverage_limit_cents,
        remaining_balance_cents,
        payment_provider,
        payment_external_id,
        starts_at,
        expires_at,
        metadata
    ) VALUES (
        p_user_id,
        p_tier,
        'active',
        v_coverage_cents,
        v_coverage_cents, -- Starts full
        p_payment_provider,
        p_external_id,
        now(),
        now() + (v_days || ' days')::INTERVAL,
        p_meta
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;

-- 4. Restore Wallet Charge Functions (from duplicates/20260107_wallet_subscription_charge.sql)

-- 4.1 Wallet Charge Helper
CREATE OR REPLACE FUNCTION public.wallet_charge_subscription(
    p_user_id UUID,
    p_amount_cents BIGINT,
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
    v_wallet RECORD;
    v_transaction_id UUID;
    v_currency TEXT;
BEGIN
    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a 0';
    END IF;

    SELECT * INTO v_wallet
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet no encontrada para usuario: %', p_user_id;
    END IF;

    IF v_wallet.available_balance_cents < p_amount_cents THEN
        RAISE EXCEPTION 'Saldo insuficiente. Disponible: %, Requerido: %',
            v_wallet.available_balance_cents, p_amount_cents;
    END IF;

    -- Idempotency check
    IF EXISTS (
        SELECT 1
        FROM wallet_transactions
        WHERE provider_transaction_id = p_ref
          AND type = 'charge'
          AND status = 'completed'
    ) THEN
        SELECT id INTO v_transaction_id
        FROM wallet_transactions
        WHERE provider_transaction_id = p_ref
          AND type = 'charge'
          AND status = 'completed'
        LIMIT 1;

        RETURN jsonb_build_object(
            'ok', true,
            'status', 'duplicate',
            'transaction_id', v_transaction_id
        );
    END IF;

    UPDATE user_wallets
    SET available_balance_cents = available_balance_cents - p_amount_cents,
        balance_cents = balance_cents - p_amount_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO wallet_transactions (
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
        -p_amount_cents,
        v_currency,
        'completed',
        p_description,
        'wallet',
        p_ref,
        p_meta,
        NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'completed',
        'transaction_id', v_transaction_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.wallet_charge_subscription(UUID, BIGINT, TEXT, TEXT, JSONB) TO service_role;

-- 4.2 Atomic Subscription Creation with Wallet
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
SET search_path = 'public'
AS $$
DECLARE
    v_amount_cents BIGINT;
    v_wallet RECORD;
    v_transaction_id UUID;
    v_subscription_id UUID;
    v_currency TEXT;
BEGIN
    CASE p_tier
        WHEN 'club_standard' THEN
            v_amount_cents := 30000;
        WHEN 'club_black' THEN
            v_amount_cents := 60000;
        ELSE
            RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
    END CASE;

    -- Idempotency by reference
    SELECT id INTO v_subscription_id
    FROM subscriptions
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
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active subscription. Cancel or wait for expiration.';
    END IF;

    -- Lock wallet and validate balance
    SELECT * INTO v_wallet
    FROM user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found for user: %', p_user_id;
    END IF;

    IF v_wallet.available_balance_cents < v_amount_cents THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %',
            v_wallet.available_balance_cents, v_amount_cents;
    END IF;

    -- Debit Wallet
    UPDATE user_wallets
    SET available_balance_cents = available_balance_cents - v_amount_cents,
        balance_cents = balance_cents - v_amount_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    v_transaction_id := gen_random_uuid();
    v_currency := COALESCE(v_wallet.currency, 'USD');

    INSERT INTO wallet_transactions (
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

    -- Create Subscription
    v_subscription_id := create_subscription(
        p_user_id,
        p_tier,
        'wallet',
        p_ref,
        jsonb_build_object(
            'wallet_transaction_id', v_transaction_id,
            'wallet_charge_ref', p_ref
        ) || p_meta
    );

    -- Link Transaction
    UPDATE subscriptions
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

GRANT EXECUTE ON FUNCTION public.create_subscription_with_wallet(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;
