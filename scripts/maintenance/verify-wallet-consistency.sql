-- ============================================================================
-- AutoRenta - Wallet Data Consistency Verification
--
-- Run with: PGPASSWORD='...' psql -h ... -f verify-wallet-consistency.sql
--
-- This script checks for data integrity issues in the wallet system:
-- 1. User balance calculations from wallet_transactions
-- 2. Orphaned transactions (no user reference)
-- 3. Stuck pending transactions
-- 4. Negative balance detection
-- 5. Balance summary per user
-- ============================================================================

\echo '=============================================='
\echo 'WALLET DATA CONSISTENCY VERIFICATION'
\echo '=============================================='
\echo ''

-- ============================================================================
-- 1. CHECK USER BALANCES (from wallet_transactions)
-- Calculate balance for each user
-- ============================================================================

\echo '1. TOP 20 USER BALANCES...'
\echo ''

WITH user_balances AS (
  SELECT
    user_id,
    SUM(
      CASE
        WHEN type IN ('deposit', 'credit', 'refund', 'rental_income', 'unlock') THEN amount
        WHEN type IN ('withdrawal', 'debit', 'lock', 'rental_payment') THEN -amount
        ELSE 0
      END
    ) as balance_cents,
    COUNT(*) as transaction_count,
    MAX(created_at) as last_transaction
  FROM wallet_transactions
  WHERE status = 'completed'
  GROUP BY user_id
)
SELECT
  ub.user_id,
  COALESCE(p.email, 'N/A') as email,
  ub.balance_cents / 100.0 as balance_ars,
  ub.transaction_count,
  ub.last_transaction
FROM user_balances ub
LEFT JOIN profiles p ON p.id = ub.user_id
ORDER BY ub.balance_cents DESC
LIMIT 20;

-- ============================================================================
-- 2. CHECK FOR NEGATIVE BALANCES
-- Users should never have negative available balance
-- ============================================================================

\echo ''
\echo '2. CHECKING FOR NEGATIVE BALANCES...'
\echo ''

WITH user_balances AS (
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
)
SELECT
  ub.user_id,
  COALESCE(p.email, 'N/A') as email,
  ub.balance_cents / 100.0 as balance_ars,
  'NEGATIVE BALANCE' as issue
FROM user_balances ub
LEFT JOIN profiles p ON p.id = ub.user_id
WHERE ub.balance_cents < 0
ORDER BY ub.balance_cents ASC
LIMIT 20;

-- ============================================================================
-- 3. CHECK FOR ORPHANED TRANSACTIONS
-- Transactions without valid user reference
-- ============================================================================

\echo ''
\echo '3. CHECKING FOR ORPHANED TRANSACTIONS...'
\echo ''

SELECT
  wt.id,
  wt.user_id,
  wt.type,
  wt.amount,
  wt.status,
  wt.created_at,
  'ORPHAN: user not in profiles' as issue
FROM wallet_transactions wt
LEFT JOIN profiles p ON p.id = wt.user_id
WHERE p.id IS NULL
LIMIT 20;

-- ============================================================================
-- 4. CHECK FOR PENDING TRANSACTIONS OLDER THAN 24h
-- Old pending transactions may indicate stuck payments
-- ============================================================================

\echo ''
\echo '4. CHECKING FOR STUCK PENDING TRANSACTIONS...'
\echo ''

SELECT
  id,
  user_id,
  type,
  amount / 100.0 as amount,
  provider,
  created_at,
  NOW() - created_at as age
FROM wallet_transactions
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC
LIMIT 20;

-- ============================================================================
-- 5. CHECK TRANSACTION TYPE DISTRIBUTION
-- Verify transaction types and their counts
-- ============================================================================

\echo ''
\echo '5. TRANSACTION TYPE DISTRIBUTION...'
\echo ''

SELECT
  type,
  status,
  COUNT(*) as count,
  SUM(amount) / 100.0 as total_ars,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction
FROM wallet_transactions
GROUP BY type, status
ORDER BY type, status;

-- ============================================================================
-- 6. SUMMARY STATISTICS
-- ============================================================================

\echo ''
\echo '6. WALLET SYSTEM SUMMARY...'
\echo ''

SELECT
  'Total Users with Wallet Activity' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM wallet_transactions
UNION ALL
SELECT
  'Total Transactions' as metric,
  COUNT(*)::text as value
FROM wallet_transactions
UNION ALL
SELECT
  'Completed Transactions' as metric,
  COUNT(*)::text as value
FROM wallet_transactions WHERE status = 'completed'
UNION ALL
SELECT
  'Pending Transactions' as metric,
  COUNT(*)::text as value
FROM wallet_transactions WHERE status = 'pending'
UNION ALL
SELECT
  'Failed Transactions' as metric,
  COUNT(*)::text as value
FROM wallet_transactions WHERE status = 'failed'
UNION ALL
SELECT
  'Total Deposits (Completed ARS)' as metric,
  COALESCE(SUM(amount) / 100.0, 0)::text as value
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'completed'
UNION ALL
SELECT
  'Total Withdrawals (Completed ARS)' as metric,
  COALESCE(SUM(amount) / 100.0, 0)::text as value
FROM wallet_transactions
WHERE type = 'withdrawal' AND status = 'completed';

-- ============================================================================
-- 7. DAILY TRANSACTION VOLUME (LAST 7 DAYS)
-- ============================================================================

\echo ''
\echo '7. DAILY TRANSACTION VOLUME (LAST 7 DAYS)...'
\echo ''

SELECT
  DATE(created_at) as date,
  COUNT(*) as transactions,
  COUNT(*) FILTER (WHERE type = 'deposit') as deposits,
  COUNT(*) FILTER (WHERE type = 'withdrawal') as withdrawals,
  SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed') / 100.0 as deposit_total,
  SUM(amount) FILTER (WHERE type = 'withdrawal' AND status = 'completed') / 100.0 as withdrawal_total
FROM wallet_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

\echo ''
\echo '=============================================='
\echo 'VERIFICATION COMPLETE'
\echo '=============================================='
