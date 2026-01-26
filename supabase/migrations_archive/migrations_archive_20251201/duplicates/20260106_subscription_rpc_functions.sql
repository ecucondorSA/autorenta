-- =====================================================
-- Autorentar Club: Additional RPC Functions
-- =====================================================
-- Created: 2026-01-06
-- Purpose: Support functions for subscription management
-- =====================================================

-- RPC: Get active subscription for a specific user (admin/service use)
CREATE OR REPLACE FUNCTION get_active_subscription_for_user(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
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
        'starts_at', v_subscription.starts_at,
        'expires_at', v_subscription.expires_at
    );
END;
$$;

-- RPC: Get subscription usage history
CREATE OR REPLACE FUNCTION get_subscription_usage_history(
    p_subscription_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    subscription_id UUID,
    booking_id UUID,
    claim_id UUID,
    amount_deducted_cents BIGINT,
    balance_before_cents BIGINT,
    balance_after_cents BIGINT,
    reason TEXT,
    description TEXT,
    performed_by UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_target_subscription_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- If subscription_id provided, verify ownership
    IF p_subscription_id IS NOT NULL THEN
        SELECT s.id INTO v_target_subscription_id
        FROM subscriptions s
        WHERE s.id = p_subscription_id AND s.user_id = v_user_id;

        IF v_target_subscription_id IS NULL THEN
            RAISE EXCEPTION 'Subscription not found or access denied';
        END IF;
    ELSE
        -- Get user's active subscription
        SELECT s.id INTO v_target_subscription_id
        FROM subscriptions s
        WHERE s.user_id = v_user_id
        ORDER BY s.created_at DESC
        LIMIT 1;
    END IF;

    -- Return empty if no subscription
    IF v_target_subscription_id IS NULL THEN
        RETURN;
    END IF;

    -- Return usage logs
    RETURN QUERY
    SELECT
        ul.id,
        ul.subscription_id,
        ul.booking_id,
        ul.claim_id,
        ul.amount_deducted_cents,
        ul.balance_before_cents,
        ul.balance_after_cents,
        ul.reason,
        ul.description,
        ul.performed_by,
        ul.created_at
    FROM subscription_usage_logs ul
    WHERE ul.subscription_id = v_target_subscription_id
    ORDER BY ul.created_at DESC
    LIMIT p_limit;
END;
$$;

-- RPC: Enhanced check_subscription_coverage with partial coverage support
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
    v_coverage_type TEXT;
BEGIN
    -- Get active subscription
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

    -- Check if balance is sufficient for any coverage
    IF v_sub.remaining_balance_cents <= 0 THEN
        RETURN json_build_object(
            'has_coverage', false,
            'coverage_type', 'none',
            'reason', 'balance_depleted',
            'subscription_id', v_sub.id,
            'available_cents', 0,
            'covered_cents', 0,
            'uncovered_cents', p_franchise_amount_cents,
            'deposit_required_cents', p_franchise_amount_cents
        );
    END IF;

    -- Calculate coverage
    IF v_sub.remaining_balance_cents >= p_franchise_amount_cents THEN
        -- Full coverage
        v_covered_cents := p_franchise_amount_cents;
        v_uncovered_cents := 0;
        v_coverage_type := 'full';
    ELSE
        -- Partial coverage
        v_covered_cents := v_sub.remaining_balance_cents;
        v_uncovered_cents := p_franchise_amount_cents - v_sub.remaining_balance_cents;
        v_coverage_type := 'partial';
    END IF;

    RETURN json_build_object(
        'has_coverage', true,
        'coverage_type', v_coverage_type,
        'subscription_id', v_sub.id,
        'tier', v_sub.tier,
        'available_cents', v_sub.remaining_balance_cents,
        'covered_cents', v_covered_cents,
        'uncovered_cents', v_uncovered_cents,
        'deposit_required_cents', v_uncovered_cents
    );
END;
$$;

-- GRANTS
GRANT EXECUTE ON FUNCTION get_subscription_usage_history TO authenticated;
-- get_active_subscription_for_user is SECURITY DEFINER, accessible via service_role only in webhook
