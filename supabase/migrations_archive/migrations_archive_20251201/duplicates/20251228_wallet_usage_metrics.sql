-- ============================================================================
-- Migration: Wallet Usage Metrics
-- Created: 2025-12-28
-- Description: Adds RPCs and views for wallet usage analytics
-- ============================================================================

-- ============================================================================
-- 1. RPC: Get Wallet Usage Summary
-- Returns key metrics for admin dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_get_wallet_metrics(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'summary', (
      SELECT jsonb_build_object(
        'total_users_with_wallet', COUNT(DISTINCT user_id),
        'active_users_period', COUNT(DISTINCT user_id) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ),
        'total_transactions', COUNT(*),
        'transactions_in_period', COUNT(*) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ),
        'completed_transactions', COUNT(*) FILTER (WHERE status = 'completed'),
        'pending_transactions', COUNT(*) FILTER (WHERE status = 'pending'),
        'failed_transactions', COUNT(*) FILTER (WHERE status = 'failed')
      )
      FROM wallet_transactions
    ),
    'deposits', (
      SELECT jsonb_build_object(
        'total_count', COUNT(*),
        'total_amount_ars', COALESCE(SUM(amount) / 100.0, 0),
        'avg_amount_ars', COALESCE(AVG(amount) / 100.0, 0),
        'period_count', COUNT(*) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ),
        'period_amount_ars', COALESCE(SUM(amount) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ) / 100.0, 0)
      )
      FROM wallet_transactions
      WHERE type = 'deposit' AND status = 'completed'
    ),
    'withdrawals', (
      SELECT jsonb_build_object(
        'total_count', COUNT(*),
        'total_amount_ars', COALESCE(SUM(amount) / 100.0, 0),
        'avg_amount_ars', COALESCE(AVG(amount) / 100.0, 0),
        'period_count', COUNT(*) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ),
        'period_amount_ars', COALESCE(SUM(amount) FILTER (
          WHERE created_at BETWEEN p_start_date AND p_end_date
        ) / 100.0, 0)
      )
      FROM wallet_transactions
      WHERE type = 'withdrawal' AND status = 'completed'
    ),
    'locks', (
      SELECT jsonb_build_object(
        'total_locked_amount_ars', COALESCE(SUM(amount) / 100.0, 0),
        'active_locks', COUNT(*)
      )
      FROM wallet_transactions
      WHERE type IN ('lock', 'security_deposit_lock') AND status = 'completed'
    ),
    'balances', (
      SELECT jsonb_build_object(
        'total_balance_all_users_ars', COALESCE(SUM(balance_cents) / 100.0, 0),
        'users_with_positive_balance', COUNT(*) FILTER (WHERE balance_cents > 0),
        'users_with_zero_balance', COUNT(*) FILTER (WHERE balance_cents = 0),
        'max_balance_ars', COALESCE(MAX(balance_cents) / 100.0, 0),
        'avg_balance_ars', COALESCE(AVG(balance_cents) / 100.0, 0)
      )
      FROM (
        SELECT
          user_id,
          SUM(
            CASE
              WHEN type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock') THEN amount
              WHEN type IN ('withdrawal', 'debit', 'lock', 'rental_payment') THEN -amount
              ELSE 0
            END
          ) as balance_cents
        FROM wallet_transactions
        WHERE status = 'completed'
        GROUP BY user_id
      ) balances
    ),
    'by_provider', (
      SELECT COALESCE(jsonb_object_agg(
        COALESCE(provider, 'unknown'),
        jsonb_build_object(
          'count', cnt,
          'amount_ars', amount_ars
        )
      ), '{}'::jsonb)
      FROM (
        SELECT
          provider,
          COUNT(*) as cnt,
          SUM(amount) / 100.0 as amount_ars
        FROM wallet_transactions
        WHERE status = 'completed'
          AND type = 'deposit'
        GROUP BY provider
      ) by_prov
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'date', day,
          'deposits', deposits,
          'withdrawals', withdrawals,
          'deposit_amount_ars', deposit_amount,
          'withdrawal_amount_ars', withdrawal_amount
        )
        ORDER BY day DESC
      ), '[]'::jsonb)
      FROM (
        SELECT
          DATE(created_at) as day,
          COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'completed') as deposits,
          COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'completed') as withdrawals,
          COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed') / 100.0, 0) as deposit_amount,
          COALESCE(SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed') / 100.0, 0) as withdrawal_amount
        FROM wallet_transactions
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY DATE(created_at)
        ORDER BY day DESC
        LIMIT 30
      ) daily
    ),
    'top_users_by_balance', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'email', email,
          'balance_ars', balance_cents / 100.0,
          'transaction_count', tx_count
        )
      ), '[]'::jsonb)
      FROM (
        SELECT
          wt.user_id,
          p.email,
          SUM(
            CASE
              WHEN wt.type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock') THEN wt.amount
              WHEN wt.type IN ('withdrawal', 'debit', 'lock', 'rental_payment') THEN -wt.amount
              ELSE 0
            END
          ) as balance_cents,
          COUNT(*) as tx_count
        FROM wallet_transactions wt
        LEFT JOIN profiles p ON p.id = wt.user_id
        WHERE wt.status = 'completed'
        GROUP BY wt.user_id, p.email
        ORDER BY balance_cents DESC
        LIMIT 10
      ) top_users
    ),
    'generated_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_wallet_metrics TO authenticated;

COMMENT ON FUNCTION admin_get_wallet_metrics IS
'Returns comprehensive wallet usage metrics for admin dashboard.
Includes deposits, withdrawals, balances, provider breakdown, and daily trends.';

-- ============================================================================
-- 2. RPC: Get User Wallet History
-- Returns paginated transaction history for a specific user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_wallet_history(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  amount NUMERIC,
  status TEXT,
  provider TEXT,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: user can only see their own history
  IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    wt.id,
    wt.type,
    wt.amount / 100.0 as amount,
    wt.status,
    wt.provider,
    wt.reference_id,
    wt.description,
    wt.created_at,
    wt.metadata
  FROM wallet_transactions wt
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_wallet_history TO authenticated;

COMMENT ON FUNCTION get_user_wallet_history IS
'Returns paginated wallet transaction history for a user.
Admin users can view any user history.';

-- ============================================================================
-- 3. RPC: Get Wallet Health Check
-- Returns health status of the wallet system
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_wallet_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_negative_balances INT;
  v_stuck_pending INT;
  v_orphaned_txns INT;
BEGIN
  -- Count negative balances
  SELECT COUNT(*) INTO v_negative_balances
  FROM (
    SELECT user_id, SUM(
      CASE
        WHEN type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock') THEN amount
        WHEN type IN ('withdrawal', 'debit', 'lock', 'rental_payment') THEN -amount
        ELSE 0
      END
    ) as balance
    FROM wallet_transactions
    WHERE status = 'completed'
    GROUP BY user_id
    HAVING SUM(
      CASE
        WHEN type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock') THEN amount
        WHEN type IN ('withdrawal', 'debit', 'lock', 'rental_payment') THEN -amount
        ELSE 0
      END
    ) < 0
  ) neg;

  -- Count stuck pending transactions (>24h)
  SELECT COUNT(*) INTO v_stuck_pending
  FROM wallet_transactions
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';

  -- Count orphaned transactions (no profile)
  SELECT COUNT(*) INTO v_orphaned_txns
  FROM wallet_transactions wt
  LEFT JOIN profiles p ON p.id = wt.user_id
  WHERE p.id IS NULL;

  SELECT jsonb_build_object(
    'status', CASE
      WHEN v_negative_balances > 0 THEN 'critical'
      WHEN v_stuck_pending > 10 THEN 'warning'
      WHEN v_orphaned_txns > 0 THEN 'warning'
      ELSE 'healthy'
    END,
    'checks', jsonb_build_object(
      'negative_balances', jsonb_build_object(
        'count', v_negative_balances,
        'status', CASE WHEN v_negative_balances > 0 THEN 'fail' ELSE 'pass' END
      ),
      'stuck_pending_transactions', jsonb_build_object(
        'count', v_stuck_pending,
        'status', CASE WHEN v_stuck_pending > 10 THEN 'warning' ELSE 'pass' END
      ),
      'orphaned_transactions', jsonb_build_object(
        'count', v_orphaned_txns,
        'status', CASE WHEN v_orphaned_txns > 0 THEN 'warning' ELSE 'pass' END
      )
    ),
    'checked_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_wallet_health_check TO authenticated;

COMMENT ON FUNCTION admin_wallet_health_check IS
'Returns health check status for the wallet system.
Checks for negative balances, stuck transactions, and orphaned records.';

-- ============================================================================
-- Done
-- ============================================================================
