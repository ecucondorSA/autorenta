-- ============================================================================
-- MIGRATION: Subscription Tiered Pricing by Vehicle Value
-- Description: Adds club_luxury tier and updates preauthorization structure
-- Author: Claude Code
-- Date: 2026-01-07
-- ============================================================================
--
-- TIERS:
-- - club_standard ($300/year): Autos < $20,000, FGO cap $800, preauth $1,000 ($500 con sub)
-- - club_black ($600/year): Autos $20,000-$40,000, FGO cap $1,200, preauth $2,500 ($800 con sub)
-- - club_luxury ($1,200/year): Autos > $40,000, FGO cap $2,000, preauth $5,000 ($1,000 con sub)
--
-- PREAUTH FORMULA: max(tier_preauth, vehicle_value * 10%)
-- ============================================================================

-- ============================================================================
-- PART 1: ADD NEW ENUM VALUE
-- ============================================================================

-- Add club_luxury to subscription_tier enum
DO $$
BEGIN
    -- Check if the value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'subscription_tier'::regtype
        AND enumlabel = 'club_luxury'
    ) THEN
        ALTER TYPE subscription_tier ADD VALUE 'club_luxury';
    END IF;
EXCEPTION
    WHEN others THEN
        -- Enum might not exist yet, which is fine
        NULL;
END $$;

-- ============================================================================
-- PART 2: ADD PREAUTHORIZATION COLUMNS TO SUBSCRIPTIONS
-- ============================================================================

DO $$
BEGIN
    -- Add fgo_cap_cents column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'fgo_cap_cents'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN fgo_cap_cents BIGINT;
        COMMENT ON COLUMN subscriptions.fgo_cap_cents IS 'Maximum FGO coverage per event for this subscription tier';
    END IF;

    -- Add min_vehicle_value_usd column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'min_vehicle_value_usd'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN min_vehicle_value_usd NUMERIC(12,2) DEFAULT 0;
        COMMENT ON COLUMN subscriptions.min_vehicle_value_usd IS 'Minimum vehicle value covered by this tier';
    END IF;

    -- Add max_vehicle_value_usd column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscriptions' AND column_name = 'max_vehicle_value_usd'
    ) THEN
        ALTER TABLE subscriptions ADD COLUMN max_vehicle_value_usd NUMERIC(12,2);
        COMMENT ON COLUMN subscriptions.max_vehicle_value_usd IS 'Maximum vehicle value covered by this tier (NULL = unlimited)';
    END IF;
END $$;

-- ============================================================================
-- PART 3: UPDATE CREATE_SUBSCRIPTION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_subscription(
    p_user_id UUID,
    p_tier subscription_tier,
    p_payment_provider TEXT,
    p_payment_external_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription_id UUID;
    v_amount_cents BIGINT;
    v_coverage_cents BIGINT;
    v_fgo_cap_cents BIGINT;
    v_min_vehicle_value NUMERIC;
    v_max_vehicle_value NUMERIC;
BEGIN
    -- Determine pricing based on tier
    CASE p_tier
        WHEN 'club_standard' THEN
            v_amount_cents := 30000;      -- $300
            v_coverage_cents := 80000;    -- $800 coverage
            v_fgo_cap_cents := 80000;     -- $800 FGO cap
            v_min_vehicle_value := 0;
            v_max_vehicle_value := 20000;
        WHEN 'club_black' THEN
            v_amount_cents := 60000;      -- $600
            v_coverage_cents := 120000;   -- $1,200 coverage
            v_fgo_cap_cents := 120000;    -- $1,200 FGO cap
            v_min_vehicle_value := 20000;
            v_max_vehicle_value := 40000;
        WHEN 'club_luxury' THEN
            v_amount_cents := 120000;     -- $1,200
            v_coverage_cents := 200000;   -- $2,000 coverage
            v_fgo_cap_cents := 200000;    -- $2,000 FGO cap
            v_min_vehicle_value := 40000;
            v_max_vehicle_value := NULL;  -- Unlimited
        ELSE
            RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
    END CASE;

    -- Check for existing active subscription
    IF EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
        AND status = 'active'
        AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'User already has an active subscription. Cancel or wait for expiration.';
    END IF;

    -- Create subscription
    INSERT INTO subscriptions (
        user_id,
        tier,
        status,
        purchase_amount_cents,
        coverage_limit_cents,
        remaining_balance_cents,
        fgo_cap_cents,
        min_vehicle_value_usd,
        max_vehicle_value_usd,
        starts_at,
        expires_at,
        payment_provider,
        payment_external_id,
        metadata
    ) VALUES (
        p_user_id,
        p_tier,
        'active',
        v_amount_cents,
        v_coverage_cents,
        v_coverage_cents, -- Initial balance = coverage limit
        v_fgo_cap_cents,
        v_min_vehicle_value,
        v_max_vehicle_value,
        NOW(),
        NOW() + INTERVAL '1 year',
        p_payment_provider,
        p_payment_external_id,
        p_metadata
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$;

COMMENT ON FUNCTION create_subscription IS 'Create a new tiered subscription after payment confirmation. Service role only.';

-- ============================================================================
-- PART 4: CREATE PREAUTHORIZATION CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_preauthorization(
    p_vehicle_value_usd NUMERIC,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_tier TEXT;
    v_user_tier TEXT;
    v_base_hold_cents BIGINT;
    v_formula_hold_cents BIGINT;
    v_final_hold_cents BIGINT;
    v_fgo_cap_cents BIGINT;
    v_discount_applied BOOLEAN := false;
    v_discount_reason TEXT;
    v_preauth_with_sub_cents BIGINT;
BEGIN
    -- Determine required tier based on vehicle value
    IF p_vehicle_value_usd > 40000 THEN
        v_required_tier := 'club_luxury';
        v_base_hold_cents := 500000;        -- $5,000
        v_preauth_with_sub_cents := 100000; -- $1,000 with subscription
        v_fgo_cap_cents := 200000;          -- $2,000 FGO cap
    ELSIF p_vehicle_value_usd > 20000 THEN
        v_required_tier := 'club_black';
        v_base_hold_cents := 250000;        -- $2,500
        v_preauth_with_sub_cents := 80000;  -- $800 with subscription
        v_fgo_cap_cents := 120000;          -- $1,200 FGO cap
    ELSE
        v_required_tier := 'club_standard';
        v_base_hold_cents := 100000;        -- $1,000
        v_preauth_with_sub_cents := 50000;  -- $500 with subscription
        v_fgo_cap_cents := 80000;           -- $800 FGO cap
    END IF;

    -- Calculate formula-based hold (10% of vehicle value)
    v_formula_hold_cents := ROUND(p_vehicle_value_usd * 0.10 * 100);

    -- Use the higher of tier base or formula
    v_base_hold_cents := GREATEST(v_base_hold_cents, v_formula_hold_cents);
    v_final_hold_cents := v_base_hold_cents;

    -- Check if user has an active subscription
    IF p_user_id IS NOT NULL THEN
        SELECT tier::TEXT INTO v_user_tier
        FROM subscriptions
        WHERE user_id = p_user_id
          AND status = 'active'
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_user_tier IS NOT NULL THEN
            -- Check if user's tier is adequate
            IF (v_user_tier = 'club_luxury') OR
               (v_user_tier = 'club_black' AND v_required_tier IN ('club_black', 'club_standard')) OR
               (v_user_tier = 'club_standard' AND v_required_tier = 'club_standard') THEN
                v_final_hold_cents := v_preauth_with_sub_cents;
                v_discount_applied := true;
                v_discount_reason := 'Suscripción ' ||
                    CASE v_user_tier
                        WHEN 'club_standard' THEN 'Club Access'
                        WHEN 'club_black' THEN 'Silver Access'
                        WHEN 'club_luxury' THEN 'Black Access'
                    END || ' activa';
            END IF;
        END IF;
    END IF;

    RETURN json_build_object(
        'hold_amount_cents', v_final_hold_cents,
        'hold_amount_usd', v_final_hold_cents / 100.0,
        'base_hold_cents', v_base_hold_cents,
        'base_hold_usd', v_base_hold_cents / 100.0,
        'discount_applied', v_discount_applied,
        'discount_reason', v_discount_reason,
        'required_tier', v_required_tier,
        'user_tier', v_user_tier,
        'fgo_cap_cents', v_fgo_cap_cents,
        'fgo_cap_usd', v_fgo_cap_cents / 100.0,
        'vehicle_value_usd', p_vehicle_value_usd
    );
END;
$$;

COMMENT ON FUNCTION calculate_preauthorization IS 'Calculate required preauthorization (hold) amount based on vehicle value and user subscription tier';

GRANT EXECUTE ON FUNCTION calculate_preauthorization TO authenticated;

-- ============================================================================
-- PART 5: CREATE TIER VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_subscription_for_vehicle(
    p_user_id UUID,
    p_vehicle_value_usd NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required_tier TEXT;
    v_user_subscription RECORD;
    v_tier_hierarchy JSONB := '{"club_standard": 1, "club_black": 2, "club_luxury": 3}'::JSONB;
    v_user_level INT;
    v_required_level INT;
BEGIN
    -- Determine required tier
    IF p_vehicle_value_usd > 40000 THEN
        v_required_tier := 'club_luxury';
        v_required_level := 3;
    ELSIF p_vehicle_value_usd > 20000 THEN
        v_required_tier := 'club_black';
        v_required_level := 2;
    ELSE
        v_required_tier := 'club_standard';
        v_required_level := 1;
    END IF;

    -- Get user's active subscription
    SELECT * INTO v_user_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- No subscription
    IF NOT FOUND THEN
        RETURN json_build_object(
            'has_subscription', false,
            'can_book', true,
            'requires_full_preauth', true,
            'required_tier', v_required_tier,
            'user_tier', NULL,
            'message', 'Sin suscripción: se requiere preautorización completa de $' ||
                CASE v_required_tier
                    WHEN 'club_luxury' THEN '5,000'
                    WHEN 'club_black' THEN '2,500'
                    ELSE '1,000'
                END || ' USD'
        );
    END IF;

    -- Get user's tier level
    v_user_level := CASE v_user_subscription.tier
        WHEN 'club_standard' THEN 1
        WHEN 'club_black' THEN 2
        WHEN 'club_luxury' THEN 3
    END;

    -- Check if tier is adequate
    IF v_user_level >= v_required_level THEN
        RETURN json_build_object(
            'has_subscription', true,
            'can_book', true,
            'requires_full_preauth', false,
            'required_tier', v_required_tier,
            'user_tier', v_user_subscription.tier,
            'subscription_id', v_user_subscription.id,
            'remaining_balance_cents', v_user_subscription.remaining_balance_cents,
            'message', 'Suscripción válida para este vehículo'
        );
    ELSE
        -- Tier insufficient but can still book with higher preauth
        RETURN json_build_object(
            'has_subscription', true,
            'can_book', true,
            'requires_full_preauth', true,
            'required_tier', v_required_tier,
            'user_tier', v_user_subscription.tier,
            'subscription_id', v_user_subscription.id,
            'upgrade_recommended', true,
            'message', 'Tu suscripción ' ||
                CASE v_user_subscription.tier
                    WHEN 'club_standard' THEN 'Club Access'
                    WHEN 'club_black' THEN 'Silver Access'
                END ||
                ' no cubre autos de este valor. Se aplicará preautorización estándar.'
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION validate_subscription_for_vehicle IS 'Validate if user subscription tier is adequate for a vehicle value';

GRANT EXECUTE ON FUNCTION validate_subscription_for_vehicle TO authenticated;

-- ============================================================================
-- PART 6: UPDATE SUBSCRIPTION TIERS VIEW
-- ============================================================================

DROP VIEW IF EXISTS v_subscription_tiers;

CREATE VIEW v_subscription_tiers AS
SELECT
    'club_standard'::subscription_tier as tier,
    'Club Access' as name,
    'Para autos económicos (valor < $20,000)' as description,
    30000 as price_cents,
    300.00 as price_usd,
    80000 as coverage_limit_cents,
    800.00 as coverage_limit_usd,
    80000 as fgo_cap_cents,
    800.00 as fgo_cap_usd,
    0 as min_vehicle_value_usd,
    20000 as max_vehicle_value_usd,
    100000 as preauth_hold_cents,
    1000.00 as preauth_hold_usd,
    50000 as preauth_with_subscription_cents,
    500.00 as preauth_with_subscription_usd,
    'Autos con valor < $20,000' as target_segment
UNION ALL
SELECT
    'club_black'::subscription_tier as tier,
    'Silver Access' as name,
    'Para autos de gama media (valor $20,000 - $40,000)' as description,
    60000 as price_cents,
    600.00 as price_usd,
    120000 as coverage_limit_cents,
    1200.00 as coverage_limit_usd,
    120000 as fgo_cap_cents,
    1200.00 as fgo_cap_usd,
    20000 as min_vehicle_value_usd,
    40000 as max_vehicle_value_usd,
    250000 as preauth_hold_cents,
    2500.00 as preauth_hold_usd,
    80000 as preauth_with_subscription_cents,
    800.00 as preauth_with_subscription_usd,
    'Autos con valor $20,000 - $40,000' as target_segment
UNION ALL
SELECT
    'club_luxury'::subscription_tier as tier,
    'Black Access' as name,
    'Para autos premium y de lujo (valor > $40,000)' as description,
    120000 as price_cents,
    1200.00 as price_usd,
    200000 as coverage_limit_cents,
    2000.00 as coverage_limit_usd,
    200000 as fgo_cap_cents,
    2000.00 as fgo_cap_usd,
    40000 as min_vehicle_value_usd,
    NULL::NUMERIC as max_vehicle_value_usd,
    500000 as preauth_hold_cents,
    5000.00 as preauth_hold_usd,
    100000 as preauth_with_subscription_cents,
    1000.00 as preauth_with_subscription_usd,
    'Autos con valor > $40,000' as target_segment;

COMMENT ON VIEW v_subscription_tiers IS 'Reference view for subscription tier pricing, benefits and preauthorization';

GRANT SELECT ON v_subscription_tiers TO authenticated;

-- ============================================================================
-- PART 7: UPDATE EXISTING SUBSCRIPTIONS WITH NEW COLUMNS
-- ============================================================================

-- Set fgo_cap_cents based on existing tiers
UPDATE subscriptions
SET
    fgo_cap_cents = CASE tier
        WHEN 'club_standard' THEN 80000
        WHEN 'club_black' THEN 120000
        WHEN 'club_luxury' THEN 200000
    END,
    min_vehicle_value_usd = CASE tier
        WHEN 'club_standard' THEN 0
        WHEN 'club_black' THEN 20000
        WHEN 'club_luxury' THEN 40000
    END,
    max_vehicle_value_usd = CASE tier
        WHEN 'club_standard' THEN 20000
        WHEN 'club_black' THEN 40000
        WHEN 'club_luxury' THEN NULL
    END
WHERE fgo_cap_cents IS NULL;

-- Also update coverage_limit_cents to new values for existing subscriptions
-- Note: This is optional - you may want to grandfather existing subscriptions
-- UPDATE subscriptions
-- SET coverage_limit_cents = CASE tier
--     WHEN 'club_standard' THEN 80000
--     WHEN 'club_black' THEN 120000
--     WHEN 'club_luxury' THEN 200000
-- END
-- WHERE coverage_limit_cents < CASE tier
--     WHEN 'club_standard' THEN 80000
--     WHEN 'club_black' THEN 120000
--     WHEN 'club_luxury' THEN 200000
-- END;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary of changes:
-- 1. Added 'club_luxury' to subscription_tier enum
-- 2. Added fgo_cap_cents, min/max_vehicle_value_usd columns to subscriptions
-- 3. Updated create_subscription() to handle all 3 tiers
-- 4. Created calculate_preauthorization() function
-- 5. Created validate_subscription_for_vehicle() function
-- 6. Updated v_subscription_tiers view with all pricing info
