-- =====================================================
-- QUICK DIAGNOSIS: ¿Por qué no se acreditan los depósitos?
-- =====================================================

-- QUERY 1: Ver las últimas 10 transacciones pendientes
SELECT
  id,
  amount,
  created_at,
  provider_metadata->>'preference_id' as mp_preference,
  CASE
    WHEN provider_metadata->>'preference_id' IS NULL THEN '❌ NO SE CREÓ PREFERENCE'
    WHEN provider_metadata->>'status' IS NOT NULL THEN '⚠️ PAGO RECIBIDO PERO NO PROCESADO'
    ELSE '🕐 ESPERANDO PAGO DE USUARIO'
  END as diagnosis
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- QUERY 2: Contar transacciones por status
SELECT
  status,
  COUNT(*) as cantidad,
  SUM(amount) as total_monto
FROM wallet_transactions
WHERE type = 'deposit'
GROUP BY status;

-- QUERY 3: Ver si algún depósito se completó exitosamente
SELECT
  id,
  amount,
  created_at,
  completed_at,
  provider_transaction_id
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 5;
