-- =====================================================
-- Migration 006: Performance Indexes for wallet_ledger
-- =====================================================
-- Fecha: 2025-10-22
-- Propósito: Agregar índices faltantes para optimizar queries comunes
-- =====================================================

-- 1. Índice para reverse lookup desde wallet_transactions
-- Usado en: v_wallet_transactions_legacy_compat view (migration 005)
-- Query: SELECT * FROM wallet_ledger WHERE transaction_id = ?
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_transaction_id
  ON wallet_ledger (transaction_id)
  WHERE transaction_id IS NOT NULL;

COMMENT ON INDEX idx_wallet_ledger_transaction_id IS
'Optimiza búsquedas reversas desde wallet_transactions a ledger.
Usado en vista de compatibilidad para mostrar estado de migración.';

-- 2. Índice compuesto para historial filtrado por tipo
-- Usado en: WalletService.getTransactions({ type: 'deposit' })
-- Query: SELECT * FROM wallet_ledger WHERE user_id = ? AND kind = ? ORDER BY ts DESC
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_kind_ts
  ON wallet_ledger (user_id, kind, ts DESC);

COMMENT ON INDEX idx_wallet_ledger_user_kind_ts IS
'Optimiza consultas de historial filtradas por tipo de transacción.
Ejemplos: "Mostrar todos mis depósitos", "Ver mis transferencias".';

-- 3. Índice para búsquedas en metadata (opcional pero recomendado)
-- Usado en: Queries que filtran por provider_metadata, payment_id, etc
-- Query: SELECT * FROM wallet_ledger WHERE meta @> '{"payment_id": "123"}'
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_meta_gin
  ON wallet_ledger USING GIN (meta);

COMMENT ON INDEX idx_wallet_ledger_meta_gin IS
'Optimiza búsquedas en metadata JSONB.
Ejemplos: Buscar por payment_id, preference_id, provider específico.';

-- =====================================================
-- ANÁLISIS DE COBERTURA DE ÍNDICES
-- =====================================================

-- ANTES (6 índices):
-- ✅ idx_wallet_ledger_user_ts        - Historial completo de usuario
-- ✅ idx_ledger_ts_kind               - Timeline global filtrado
-- ✅ idx_wallet_ledger_kind           - Filtro por tipo (global)
-- ✅ idx_wallet_ledger_booking        - Búsquedas por booking
-- ✅ uq_wallet_ledger_ref             - Idempotencia (CRITICAL)
-- ✅ wallet_ledger_pkey               - Primary key

-- DESPUÉS (9 índices):
-- ✅ + idx_wallet_ledger_transaction_id  - Compatibilidad con legacy table
-- ✅ + idx_wallet_ledger_user_kind_ts    - Historial filtrado por tipo
-- ✅ + idx_wallet_ledger_meta_gin        - Búsquedas en metadata

-- =====================================================
-- PATRONES DE QUERY OPTIMIZADOS
-- =====================================================

/*
QUERY PATTERN 1: Historial de usuario filtrado por tipo
---------------------------------------------------------
SELECT * FROM wallet_ledger
WHERE user_id = '64d3d7f5-9722-48a6-a294-fa1724002e1b'
  AND kind = 'deposit'
ORDER BY ts DESC
LIMIT 20;

ANTES: Index Scan usando idx_wallet_ledger_user_ts + Filter kind (slower)
AHORA: Index Scan usando idx_wallet_ledger_user_kind_ts (faster) ✅

QUERY PATTERN 2: Reverse lookup desde legacy table
---------------------------------------------------------
SELECT ledger.* FROM wallet_ledger ledger
WHERE transaction_id = 'abc123-def456';

ANTES: Seq Scan (very slow on large tables)
AHORA: Index Scan usando idx_wallet_ledger_transaction_id ✅

QUERY PATTERN 3: Buscar transacción por MercadoPago payment_id
---------------------------------------------------------
SELECT * FROM wallet_ledger
WHERE meta @> '{"payment_id": "130635680108"}';

ANTES: Seq Scan (very slow)
AHORA: Bitmap Index Scan usando idx_wallet_ledger_meta_gin ✅
*/

-- =====================================================
-- VALIDACIÓN POST-MIGRACIÓN
-- =====================================================

-- Verificar que los índices se crearon correctamente
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE tablename = 'wallet_ledger'
    AND indexname IN (
      'idx_wallet_ledger_transaction_id',
      'idx_wallet_ledger_user_kind_ts',
      'idx_wallet_ledger_meta_gin'
    );

  IF idx_count = 3 THEN
    RAISE NOTICE '✅ Migration 006 completada: 3 índices creados exitosamente';
    RAISE NOTICE '   - idx_wallet_ledger_transaction_id (reverse lookup)';
    RAISE NOTICE '   - idx_wallet_ledger_user_kind_ts (filtered history)';
    RAISE NOTICE '   - idx_wallet_ledger_meta_gin (metadata search)';
  ELSE
    RAISE WARNING '⚠️  Solo % de 3 índices fueron creados', idx_count;
  END IF;
END $$;

-- =====================================================
-- FIN DE MIGRACIÓN 006
-- =====================================================
