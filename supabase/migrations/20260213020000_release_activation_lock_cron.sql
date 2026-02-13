-- ============================================================================
-- Migration: Release activation lock ($150) when subscription expires
-- ============================================================================
-- The activation lock (USD 150) is created at subscription purchase via
-- create_subscription_with_wallet(). It blocks funds in locked_balance_cents
-- to ensure "skin in the game". This cron releases those funds back to
-- available_balance when the subscription expires.
--
-- Design: Separate from process_subscription_expirations() (mark → release
-- pattern). Expiry marking and financial release are decoupled so a failure
-- in one doesn't block the other.
-- ============================================================================

-- 1. RPC: release_expired_activation_locks()
CREATE OR REPLACE FUNCTION public.release_expired_activation_locks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_lock_tx RECORD;
    v_unlock_exists BOOLEAN;
    v_unlock_tx_id UUID;
    v_released_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_error_count INTEGER := 0;
    v_errors JSONB := '[]'::jsonb;
BEGIN
    -- Find expired subscriptions that have an activation lock transaction
    FOR v_rec IN
        SELECT
            s.id AS subscription_id,
            s.user_id,
            s.tier,
            s.expires_at,
            (s.metadata->>'activation_lock_transaction_id')::UUID AS lock_transaction_id,
            COALESCE((s.metadata->>'activation_lock_cents')::BIGINT, 15000) AS lock_cents
        FROM subscriptions s
        WHERE s.status IN ('expired', 'cancelled')
          AND s.metadata->>'activation_lock_transaction_id' IS NOT NULL
          -- Only process subscriptions expired in the last 7 days (safety window)
          AND s.expires_at > NOW() - INTERVAL '7 days'
    LOOP
        BEGIN
            -- Verify the lock transaction exists
            SELECT id, amount, user_id, provider_transaction_id
            INTO v_lock_tx
            FROM wallet_transactions
            WHERE id = v_rec.lock_transaction_id
              AND type = 'lock'
              AND status = 'completed';

            IF NOT FOUND THEN
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Idempotency: check if unlock already processed
            SELECT EXISTS (
                SELECT 1
                FROM wallet_transactions
                WHERE provider_transaction_id = v_lock_tx.provider_transaction_id || '_release'
                  AND type = 'unlock'
                  AND status = 'completed'
            ) INTO v_unlock_exists;

            IF v_unlock_exists THEN
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Move funds: locked → available (balance_cents stays same per consistency constraint)
            UPDATE user_wallets
            SET locked_balance_cents = locked_balance_cents - v_rec.lock_cents,
                available_balance_cents = available_balance_cents + v_rec.lock_cents,
                updated_at = NOW()
            WHERE user_id = v_rec.user_id
              AND locked_balance_cents >= v_rec.lock_cents;

            -- If wallet didn't have enough locked funds, skip
            IF NOT FOUND THEN
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Record unlock transaction
            v_unlock_tx_id := gen_random_uuid();

            INSERT INTO wallet_transactions (
                id, user_id, type, amount, currency, status,
                description, provider, provider_transaction_id,
                reference_type, provider_metadata, completed_at
            ) VALUES (
                v_unlock_tx_id,
                v_rec.user_id,
                'unlock',
                v_rec.lock_cents,
                'USD',
                'completed',
                'Liberación garantía de activación (suscripción expirada)',
                'wallet',
                v_lock_tx.provider_transaction_id || '_release',
                'subscription_guarantee',
                jsonb_build_object(
                    'subscription_id', v_rec.subscription_id,
                    'subscription_tier', v_rec.tier,
                    'lock_transaction_id', v_rec.lock_transaction_id,
                    'lock_amount_cents', v_rec.lock_cents,
                    'expired_at', v_rec.expires_at::TEXT,
                    'released_at', NOW()::TEXT
                ),
                NOW()
            );

            -- Update subscription metadata to record release
            UPDATE subscriptions
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                    'activation_lock_released_at', NOW()::TEXT,
                    'activation_lock_release_tx_id', v_unlock_tx_id
                ),
                updated_at = NOW()
            WHERE id = v_rec.subscription_id;

            v_released_count := v_released_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'subscription_id', v_rec.subscription_id,
                'error', SQLERRM
            );
            -- Continue processing other subscriptions
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'released', v_released_count,
        'skipped', v_skipped_count,
        'errors', v_error_count,
        'error_details', v_errors,
        'ran_at', NOW()::TEXT
    );
END;
$$;

-- Grant to service_role only (called by cron)
REVOKE ALL ON FUNCTION public.release_expired_activation_locks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_expired_activation_locks() TO service_role;

COMMENT ON FUNCTION public.release_expired_activation_locks IS
'Cron-safe: releases USD 150 activation locks for expired/cancelled subscriptions.
Idempotent via provider_transaction_id check. Processes subscriptions expired within last 7 days.';

-- 2. Schedule cron: run 5 minutes after expiration cron (which runs at midnight)
SELECT cron.schedule(
    'release-activation-locks',
    '5 0 * * *',   -- Daily at 00:05 UTC (after process-subscription-expirations at 00:00)
    $$ SELECT public.release_expired_activation_locks(); $$
);
