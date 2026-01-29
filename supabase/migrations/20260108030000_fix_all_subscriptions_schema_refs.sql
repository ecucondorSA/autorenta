-- Ensure all subscription related functions use explicit public schema
-- This prevents 500 errors caused by search_path issues in complex RPC calls.

-- 1. Update create_subscription to be robust
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
SET search_path = 'public'
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

-- 2. Update get_active_subscription to be robust
DROP FUNCTION IF EXISTS public.get_active_subscription() CASCADE;

CREATE OR REPLACE FUNCTION public.get_active_subscription()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    SELECT
        s.*,
        (s.remaining_balance_cents::float / 100.0) as remaining_balance_usd,
        (s.coverage_limit_cents::float / 100.0) as coverage_limit_usd,
        EXTRACT(DAY FROM (s.expires_at - now()))::int as days_remaining
    INTO v_sub
    FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.status = 'active'
      AND s.expires_at > now()
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(v_sub)::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_subscription(UUID, subscription_tier, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_subscription() TO authenticated;
