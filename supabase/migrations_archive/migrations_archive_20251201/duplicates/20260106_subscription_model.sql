-- ============================================================================
-- MIGRATION: Autorentar Club - Subscription Model
-- Description: Creates subscription system for deposit-free rentals
-- Author: Claude Code
-- Date: 2026-01-06
-- ============================================================================

-- ============================================================================
-- PART 1: ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active',       -- Suscripción vigente y usable
        'inactive',     -- Desactivada manualmente
        'depleted',     -- Saldo agotado (remaining_balance = 0)
        'expired',      -- Pasó la fecha de expiración
        'cancelled'     -- Cancelada (con posible reembolso)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'club_standard',  -- $300/año, cobertura hasta $500
        'club_black'      -- $600/año, cobertura hasta $1000
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    tier subscription_tier NOT NULL DEFAULT 'club_standard',
    status subscription_status NOT NULL DEFAULT 'active',

    -- Finanzas (en centavos USD)
    purchase_amount_cents BIGINT NOT NULL,           -- Monto pagado: 30000 ($300) o 60000 ($600)
    coverage_limit_cents BIGINT NOT NULL,            -- Límite de cobertura según tier
    remaining_balance_cents BIGINT NOT NULL,         -- Saldo disponible para cubrir daños
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Vigencia
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,                 -- +1 año desde starts_at

    -- Pago
    payment_transaction_id UUID,                     -- Ref a wallet_transactions si aplica
    payment_provider TEXT,                           -- 'mercadopago', 'stripe', 'wallet'
    payment_external_id TEXT,                        -- ID externo del pago (MP preference_id, etc.)

    -- Metadatos
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Constraints
    CONSTRAINT chk_balance_non_negative CHECK (remaining_balance_cents >= 0),
    CONSTRAINT chk_balance_lte_limit CHECK (remaining_balance_cents <= coverage_limit_cents),
    CONSTRAINT chk_expires_after_starts CHECK (expires_at > starts_at)
);

COMMENT ON TABLE subscriptions IS 'Autorentar Club memberships - provides deposit coverage for rentals';
COMMENT ON COLUMN subscriptions.tier IS 'Membership level: club_standard ($300/yr, $500 coverage) or club_black ($600/yr, $1000 coverage)';
COMMENT ON COLUMN subscriptions.coverage_limit_cents IS 'Maximum coverage amount based on tier';
COMMENT ON COLUMN subscriptions.remaining_balance_cents IS 'Available balance to cover damages (decreases with claims)';

-- ============================================================================
-- PART 3: SUBSCRIPTION USAGE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES bookings(id),
    claim_id UUID,                                   -- Futuro: ref a tabla insurance_claims

    -- Montos
    amount_deducted_cents BIGINT NOT NULL,
    balance_before_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,

    -- Clasificación
    reason TEXT NOT NULL,                            -- 'claim_deduction', 'admin_adjustment', 'refund', 'expiration_forfeit'
    description TEXT,

    -- Auditoría
    performed_by UUID REFERENCES profiles(id),       -- NULL = sistema automático
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_deduction_logic CHECK (
        (reason = 'refund' AND amount_deducted_cents <= 0) OR
        (reason != 'refund' AND amount_deducted_cents > 0)
    )
);

COMMENT ON TABLE subscription_usage_logs IS 'Audit trail for subscription balance changes';
COMMENT ON COLUMN subscription_usage_logs.reason IS 'Type of deduction: claim_deduction, admin_adjustment, refund, expiration_forfeit';

-- ============================================================================
-- PART 4: INDEXES
-- ============================================================================

-- Fast lookup of active subscription for user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
    ON subscriptions(user_id)
    WHERE status = 'active';

-- Find expiring subscriptions (for cron jobs)
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires
    ON subscriptions(expires_at)
    WHERE status = 'active';

-- User subscription history
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_created
    ON subscriptions(user_id, created_at DESC);

-- Usage logs by subscription
CREATE INDEX IF NOT EXISTS idx_subscription_usage_subscription
    ON subscription_usage_logs(subscription_id, created_at DESC);

-- Usage logs by booking (for claims integration)
CREATE INDEX IF NOT EXISTS idx_subscription_usage_booking
    ON subscription_usage_logs(booking_id)
    WHERE booking_id IS NOT NULL;

-- ============================================================================
-- PART 5: TRIGGER FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (user_id = auth.uid());

-- Users can view their own usage logs
DROP POLICY IF EXISTS "Users can view own usage logs" ON subscription_usage_logs;
CREATE POLICY "Users can view own usage logs"
    ON subscription_usage_logs FOR SELECT
    USING (
        subscription_id IN (
            SELECT id FROM subscriptions WHERE user_id = auth.uid()
        )
    );

-- Admins can view all subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can view all usage logs
DROP POLICY IF EXISTS "Admins can view all usage logs" ON subscription_usage_logs;
CREATE POLICY "Admins can view all usage logs"
    ON subscription_usage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Service role has full access (for RPCs)
-- No INSERT/UPDATE/DELETE policies for authenticated - only service_role can modify

-- ============================================================================
-- PART 7: RPC FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- get_active_subscription: Get current user's active subscription
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_subscription()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    SELECT
        id,
        tier,
        status,
        remaining_balance_cents,
        coverage_limit_cents,
        purchase_amount_cents,
        starts_at,
        expires_at,
        created_at
    INTO v_subscription
    FROM subscriptions
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN json_build_object(
        'id', v_subscription.id,
        'tier', v_subscription.tier,
        'status', v_subscription.status,
        'remaining_balance_cents', v_subscription.remaining_balance_cents,
        'coverage_limit_cents', v_subscription.coverage_limit_cents,
        'purchase_amount_cents', v_subscription.purchase_amount_cents,
        'starts_at', v_subscription.starts_at,
        'expires_at', v_subscription.expires_at,
        'created_at', v_subscription.created_at,
        'remaining_balance_usd', v_subscription.remaining_balance_cents / 100.0,
        'coverage_limit_usd', v_subscription.coverage_limit_cents / 100.0,
        'days_remaining', EXTRACT(DAY FROM (v_subscription.expires_at - NOW()))::INT
    );
END;
$$;

COMMENT ON FUNCTION get_active_subscription IS 'Returns the current user active subscription details or NULL if none';

-- -----------------------------------------------------------------------------
-- check_subscription_coverage: Verify if user has coverage for a franchise amount
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_subscription_coverage(
    p_user_id UUID,
    p_franchise_amount_cents BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_covered_cents BIGINT;
    v_uncovered_cents BIGINT;
BEGIN
    -- Find active subscription
    SELECT * INTO v_sub
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- No subscription found
    IF NOT FOUND THEN
        RETURN json_build_object(
            'has_coverage', false,
            'coverage_type', 'none',
            'reason', 'no_active_subscription',
            'subscription_id', NULL,
            'available_cents', 0,
            'covered_cents', 0,
            'uncovered_cents', p_franchise_amount_cents,
            'deposit_required_cents', p_franchise_amount_cents
        );
    END IF;

    -- Calculate coverage (partial or full)
    v_covered_cents := LEAST(v_sub.remaining_balance_cents, p_franchise_amount_cents);
    v_uncovered_cents := p_franchise_amount_cents - v_covered_cents;

    -- Full coverage
    IF v_sub.remaining_balance_cents >= p_franchise_amount_cents THEN
        RETURN json_build_object(
            'has_coverage', true,
            'coverage_type', 'full',
            'reason', 'full_coverage',
            'subscription_id', v_sub.id,
            'tier', v_sub.tier,
            'available_cents', v_sub.remaining_balance_cents,
            'covered_cents', p_franchise_amount_cents,
            'uncovered_cents', 0,
            'deposit_required_cents', 0
        );
    END IF;

    -- Partial coverage (some balance but less than franchise)
    IF v_sub.remaining_balance_cents > 0 THEN
        RETURN json_build_object(
            'has_coverage', true,
            'coverage_type', 'partial',
            'reason', 'partial_coverage',
            'subscription_id', v_sub.id,
            'tier', v_sub.tier,
            'available_cents', v_sub.remaining_balance_cents,
            'covered_cents', v_covered_cents,
            'uncovered_cents', v_uncovered_cents,
            'deposit_required_cents', v_uncovered_cents
        );
    END IF;

    -- Subscription exists but depleted
    RETURN json_build_object(
        'has_coverage', false,
        'coverage_type', 'depleted',
        'reason', 'subscription_depleted',
        'subscription_id', v_sub.id,
        'tier', v_sub.tier,
        'available_cents', 0,
        'covered_cents', 0,
        'uncovered_cents', p_franchise_amount_cents,
        'deposit_required_cents', p_franchise_amount_cents
    );
END;
$$;

COMMENT ON FUNCTION check_subscription_coverage IS 'Check if user has subscription coverage for a given franchise amount. Returns coverage details including partial coverage.';

-- -----------------------------------------------------------------------------
-- create_subscription: Create a new subscription (service_role only)
-- -----------------------------------------------------------------------------
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
BEGIN
    -- Determine pricing based on tier
    CASE p_tier
        WHEN 'club_standard' THEN
            v_amount_cents := 30000;    -- $300
            v_coverage_cents := 50000;  -- $500 coverage
        WHEN 'club_black' THEN
            v_amount_cents := 60000;    -- $600
            v_coverage_cents := 100000; -- $1000 coverage
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

COMMENT ON FUNCTION create_subscription IS 'Create a new subscription after payment confirmation. Service role only.';

-- -----------------------------------------------------------------------------
-- deduct_from_subscription: Deduct amount from subscription (for claims)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deduct_from_subscription(
    p_subscription_id UUID,
    p_amount_cents BIGINT,
    p_booking_id UUID,
    p_reason TEXT,
    p_description TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sub RECORD;
    v_new_balance BIGINT;
    v_actual_deduction BIGINT;
    v_new_status subscription_status;
BEGIN
    -- Lock the subscription row to prevent race conditions
    SELECT * INTO v_sub
    FROM subscriptions
    WHERE id = p_subscription_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
    END IF;

    IF v_sub.status != 'active' THEN
        RAISE EXCEPTION 'Cannot deduct from non-active subscription. Status: %', v_sub.status;
    END IF;

    -- Calculate actual deduction (cannot exceed balance)
    v_actual_deduction := LEAST(p_amount_cents, v_sub.remaining_balance_cents);
    v_new_balance := v_sub.remaining_balance_cents - v_actual_deduction;

    -- Determine new status
    IF v_new_balance = 0 THEN
        v_new_status := 'depleted';
    ELSE
        v_new_status := 'active';
    END IF;

    -- Update subscription
    UPDATE subscriptions
    SET remaining_balance_cents = v_new_balance,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_subscription_id;

    -- Create usage log
    INSERT INTO subscription_usage_logs (
        subscription_id,
        booking_id,
        amount_deducted_cents,
        balance_before_cents,
        balance_after_cents,
        reason,
        description,
        performed_by
    ) VALUES (
        p_subscription_id,
        p_booking_id,
        v_actual_deduction,
        v_sub.remaining_balance_cents,
        v_new_balance,
        p_reason,
        p_description,
        p_performed_by
    );

    RETURN json_build_object(
        'success', true,
        'deducted_cents', v_actual_deduction,
        'remaining_balance_cents', v_new_balance,
        'uncovered_cents', p_amount_cents - v_actual_deduction,
        'new_status', v_new_status,
        'was_fully_covered', (p_amount_cents - v_actual_deduction) = 0
    );
END;
$$;

COMMENT ON FUNCTION deduct_from_subscription IS 'Deduct an amount from subscription balance. Used when processing damage claims.';

-- -----------------------------------------------------------------------------
-- get_subscription_usage_history: Get usage history for user's subscription
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_subscription_usage_history(
    p_subscription_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    v_user_id := auth.uid();

    SELECT json_agg(row_to_json(t))
    INTO v_result
    FROM (
        SELECT
            sul.id,
            sul.subscription_id,
            sul.booking_id,
            sul.amount_deducted_cents,
            sul.balance_before_cents,
            sul.balance_after_cents,
            sul.reason,
            sul.description,
            sul.created_at,
            b.start_at as booking_start,
            c.brand || ' ' || c.model as car_name
        FROM subscription_usage_logs sul
        JOIN subscriptions s ON s.id = sul.subscription_id
        LEFT JOIN bookings b ON b.id = sul.booking_id
        LEFT JOIN cars c ON c.id = b.car_id
        WHERE s.user_id = v_user_id
          AND (p_subscription_id IS NULL OR sul.subscription_id = p_subscription_id)
        ORDER BY sul.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

COMMENT ON FUNCTION get_subscription_usage_history IS 'Get usage history for the current user subscriptions';

-- -----------------------------------------------------------------------------
-- process_claim_charge: Process a claim charge (integrates with claims system)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_claim_charge(
    p_claim_id UUID,
    p_booking_id UUID,
    p_renter_id UUID,
    p_damage_amount_cents BIGINT,
    p_description TEXT DEFAULT NULL
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
BEGIN
    -- 1. Find active subscription for renter
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_renter_id
      AND status = 'active'
      AND expires_at > NOW()
      AND remaining_balance_cents > 0
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        -- 2. Deduct from subscription first
        SELECT deduct_from_subscription(
            v_subscription.id,
            p_damage_amount_cents,
            p_booking_id,
            'claim_deduction',
            p_description,
            NULL -- system action
        ) INTO v_deduction_result;

        v_subscription_deducted := (v_deduction_result->>'deducted_cents')::BIGINT;
        v_remaining_to_charge := (v_deduction_result->>'uncovered_cents')::BIGINT;

        -- 3. If there's remaining amount, charge from wallet/deposit
        IF v_remaining_to_charge > 0 THEN
            -- Call existing wallet damage deduction function
            -- This handles the remaining amount from wallet or credit card hold
            PERFORM wallet_deduct_damage_atomic(
                p_booking_id,
                p_renter_id,
                NULL, -- owner_id obtained from booking
                v_remaining_to_charge,
                'Daño no cubierto por suscripción: ' || COALESCE(p_description, 'Sin descripción'),
                NULL  -- car_id
            );
            v_wallet_charged := v_remaining_to_charge;
        END IF;

        RETURN json_build_object(
            'success', true,
            'source', CASE
                WHEN v_wallet_charged > 0 THEN 'subscription_plus_wallet'
                ELSE 'subscription_only'
            END,
            'total_charged_cents', p_damage_amount_cents,
            'subscription_deducted_cents', v_subscription_deducted,
            'wallet_charged_cents', v_wallet_charged,
            'subscription_remaining_cents', (v_deduction_result->>'remaining_balance_cents')::BIGINT,
            'subscription_id', v_subscription.id
        );
    ELSE
        -- 4. No active subscription: charge entirely from wallet/deposit
        PERFORM wallet_deduct_damage_atomic(
            p_booking_id,
            p_renter_id,
            NULL,
            p_damage_amount_cents,
            COALESCE(p_description, 'Cargo por daños'),
            NULL
        );

        RETURN json_build_object(
            'success', true,
            'source', 'wallet_only',
            'total_charged_cents', p_damage_amount_cents,
            'subscription_deducted_cents', 0,
            'wallet_charged_cents', p_damage_amount_cents,
            'subscription_remaining_cents', NULL,
            'subscription_id', NULL
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE
        );
END;
$$;

COMMENT ON FUNCTION process_claim_charge IS 'Process a damage claim charge. First tries subscription, then wallet/deposit for remaining.';

-- -----------------------------------------------------------------------------
-- expire_subscriptions: Cron job to expire old subscriptions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION expire_subscriptions IS 'Cron job function to mark expired subscriptions. Run daily.';

-- ============================================================================
-- PART 8: GRANTS
-- ============================================================================

GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON subscription_usage_logs TO authenticated;

GRANT EXECUTE ON FUNCTION get_active_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_usage_history TO authenticated;

-- These functions are for service_role only (backend/webhooks)
-- No GRANT to authenticated for: create_subscription, deduct_from_subscription, process_claim_charge, expire_subscriptions

-- ============================================================================
-- PART 9: BOOKINGS TABLE EXTENSION (Optional columns for subscription tracking)
-- ============================================================================

DO $$
BEGIN
    -- Add subscription_id to track which subscription covered the deposit
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE bookings ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
        COMMENT ON COLUMN bookings.subscription_id IS 'Reference to subscription that covered the deposit (if any)';
    END IF;

    -- Add deposit_covered_by to indicate coverage source
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'deposit_covered_by'
    ) THEN
        ALTER TABLE bookings ADD COLUMN deposit_covered_by TEXT;
        COMMENT ON COLUMN bookings.deposit_covered_by IS 'Source of deposit coverage: subscription, wallet, card, partial_subscription';
    END IF;

    -- Add subscription_coverage_cents for partial coverage tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bookings' AND column_name = 'subscription_coverage_cents'
    ) THEN
        ALTER TABLE bookings ADD COLUMN subscription_coverage_cents BIGINT DEFAULT 0;
        COMMENT ON COLUMN bookings.subscription_coverage_cents IS 'Amount covered by subscription for this booking';
    END IF;
END $$;

-- Index for finding bookings by subscription
CREATE INDEX IF NOT EXISTS idx_bookings_subscription
    ON bookings(subscription_id)
    WHERE subscription_id IS NOT NULL;

-- ============================================================================
-- PART 10: SUBSCRIPTION TIERS CONFIGURATION VIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_subscription_tiers AS
SELECT
    'club_standard'::subscription_tier as tier,
    'Club Estándar' as name,
    'Ideal para autos económicos y medios' as description,
    30000 as price_cents,
    300.00 as price_usd,
    50000 as coverage_limit_cents,
    500.00 as coverage_limit_usd,
    'Autos con valor < $20,000' as target_segment
UNION ALL
SELECT
    'club_black'::subscription_tier as tier,
    'Club Black' as name,
    'Para autos premium y de lujo' as description,
    60000 as price_cents,
    600.00 as price_usd,
    100000 as coverage_limit_cents,
    1000.00 as coverage_limit_usd,
    'Autos con valor > $20,000' as target_segment;

COMMENT ON VIEW v_subscription_tiers IS 'Reference view for subscription tier pricing and benefits';

GRANT SELECT ON v_subscription_tiers TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
