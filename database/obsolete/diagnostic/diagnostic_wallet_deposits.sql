-- =====================================================
-- DIAGNOSTIC SCRIPT: Wallet Deposits Investigation
-- DATE: 2025-10-19
-- PURPOSE: Investigate why 41 pending deposits are not being credited
-- =====================================================

-- =====================================================
-- 1. VERIFICAR TRANSACCIONES PENDIENTES
-- =====================================================

SELECT
  '=== TRANSACCIONES PENDIENTES ===' AS section;

SELECT
  id AS transaction_id,
  user_id,
  type,
  status,
  amount,
  currency,
  provider,
  created_at,
  completed_at,
  provider_metadata->>'preference_id' AS mercadopago_preference_id,
  provider_metadata->>'init_point' AS payment_url,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_since_created
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 50;

-- =====================================================
-- 2. VERIFICAR TRANSACCIONES COMPLETADAS
-- =====================================================

SELECT
  '=== TRANSACCIONES COMPLETADAS ===' AS section;

SELECT
  id AS transaction_id,
  user_id,
  type,
  status,
  amount,
  currency,
  provider,
  provider_transaction_id AS mercadopago_payment_id,
  created_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - created_at))/60 AS minutes_to_complete,
  provider_metadata->>'status' AS mp_status,
  provider_metadata->>'payment_method_id' AS payment_method
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 20;

-- =====================================================
-- 3. VERIFICAR BALANCE CALCULADO VS ESPERADO
-- =====================================================

SELECT
  '=== ANÁLISIS DE BALANCE ===' AS section;

-- Balance esperado si TODAS las transacciones pendientes fueran completadas
WITH pending_sum AS (
  SELECT
    user_id,
    SUM(amount) AS total_pending
  FROM wallet_transactions
  WHERE type = 'deposit'
    AND status = 'pending'
  GROUP BY user_id
),
completed_sum AS (
  SELECT
    user_id,
    SUM(CASE
      WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
      WHEN type IN ('charge') THEN -amount
      ELSE 0
    END) AS total_completed
  FROM wallet_transactions
  WHERE status = 'completed'
    AND type NOT IN ('lock', 'unlock')
  GROUP BY user_id
)
SELECT
  COALESCE(p.user_id, c.user_id) AS user_id,
  COALESCE(c.total_completed, 0) AS current_balance,
  COALESCE(p.total_pending, 0) AS pending_deposits,
  COALESCE(c.total_completed, 0) + COALESCE(p.total_pending, 0) AS expected_balance_if_completed
FROM pending_sum p
FULL OUTER JOIN completed_sum c ON p.user_id = c.user_id
ORDER BY pending_deposits DESC;

-- =====================================================
-- 4. VERIFICAR METADATA DE TRANSACCIONES PENDIENTES
-- =====================================================

SELECT
  '=== METADATA DE TRANSACCIONES PENDIENTES ===' AS section;

SELECT
  id,
  created_at,
  provider_metadata->>'preference_id' AS preference_id,
  provider_metadata->>'init_point' AS init_point,
  provider_metadata ? 'status' AS has_payment_status,
  provider_metadata->>'status' AS payment_status,
  provider_metadata ? 'payment_method_id' AS has_payment_method,
  CASE
    WHEN provider_metadata->>'preference_id' IS NULL THEN '❌ SIN PREFERENCE_ID'
    WHEN provider_metadata->>'status' IS NOT NULL THEN '⚠️ TIENE STATUS PERO NO COMPLETED'
    ELSE '✅ PREFERENCE CREADA'
  END AS diagnosis
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 5. BUSCAR TRANSACCIONES CON ERRORES
-- =====================================================

SELECT
  '=== TRANSACCIONES CON STATUS FAILED ===' AS section;

SELECT
  id,
  user_id,
  type,
  status,
  amount,
  created_at,
  provider_metadata
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 6. ESTADÍSTICAS GENERALES
-- =====================================================

SELECT
  '=== ESTADÍSTICAS GENERALES ===' AS section;

SELECT
  status,
  COUNT(*) AS count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest
FROM wallet_transactions
WHERE type = 'deposit'
GROUP BY status
ORDER BY status;

-- =====================================================
-- 7. VERIFICAR SI HAY DUPLICATE PREFERENCES
-- =====================================================

SELECT
  '=== DUPLICATE PREFERENCES ===' AS section;

SELECT
  provider_metadata->>'preference_id' AS preference_id,
  COUNT(*) AS count,
  array_agg(id) AS transaction_ids,
  array_agg(status) AS statuses
FROM wallet_transactions
WHERE type = 'deposit'
  AND provider_metadata->>'preference_id' IS NOT NULL
GROUP BY provider_metadata->>'preference_id'
HAVING COUNT(*) > 1;

-- =====================================================
-- DIAGNÓSTICO FINAL
-- =====================================================

SELECT
  '=== DIAGNÓSTICO FINAL ===' AS section;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE type = 'deposit' AND status = 'pending' AND provider_metadata->>'preference_id' IS NULL
    ) THEN '❌ CAUSA 1: Hay transacciones sin preference_id (create-preference falló)'

    WHEN EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE type = 'deposit' AND status = 'pending'
        AND provider_metadata->>'preference_id' IS NOT NULL
        AND provider_metadata->>'status' IS NULL
    ) THEN '❌ CAUSA 2: Hay preferences creadas pero webhook nunca recibió notificación'

    WHEN EXISTS (
      SELECT 1 FROM wallet_transactions
      WHERE type = 'deposit' AND status = 'pending'
        AND provider_metadata->>'status' IS NOT NULL
    ) THEN '❌ CAUSA 3: Webhook recibió pago pero wallet_confirm_deposit falló'

    ELSE '✅ No se detectaron problemas obvios'
  END AS probable_cause,

  (SELECT COUNT(*) FROM wallet_transactions WHERE type = 'deposit' AND status = 'pending') AS pending_count,
  (SELECT COUNT(*) FROM wallet_transactions WHERE type = 'deposit' AND status = 'completed') AS completed_count,
  (SELECT COUNT(*) FROM wallet_transactions WHERE type = 'deposit' AND status = 'failed') AS failed_count;
