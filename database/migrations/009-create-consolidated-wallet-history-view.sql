-- =====================================================
-- Migration 009: Consolidated Wallet History View
-- =====================================================
-- Fecha: 2025-10-22
-- Propósito: Vista unificada que combina wallet_transactions (legacy)
--            y wallet_ledger (nuevo) para facilitar migración gradual
-- =====================================================

-- =====================================================
-- 1. VISTA CONSOLIDADA: wallet_history
-- =====================================================

CREATE OR REPLACE VIEW v_wallet_history AS
SELECT
  -- Campos comunes normalizados
  COALESCE(wt.id, wl.id) AS id,
  COALESCE(wt.user_id, wl.user_id) AS user_id,
  COALESCE(wt.created_at, wl.ts) AS transaction_date,

  -- Tipo de transacción (normalizado)
  CASE
    WHEN wt.id IS NOT NULL THEN wt.type::TEXT
    WHEN wl.id IS NOT NULL THEN wl.kind::TEXT
    ELSE 'unknown'
  END AS transaction_type,

  -- Estado (solo wallet_transactions tiene estado)
  CASE
    WHEN wt.id IS NOT NULL THEN wt.status::TEXT
    WHEN wl.id IS NOT NULL THEN 'completed' -- ledger entries son siempre completed
    ELSE NULL
  END AS status,

  -- Monto (siempre en centavos)
  CASE
    WHEN wt.id IS NOT NULL THEN wt.amount * 100 -- wallet_transactions usa decimales
    WHEN wl.id IS NOT NULL THEN wl.amount_cents
    ELSE 0
  END AS amount_cents,

  -- Moneda
  COALESCE(wt.currency, wl.original_currency, 'USD') AS currency,

  -- Metadata
  CASE
    WHEN wt.id IS NOT NULL THEN jsonb_build_object(
      'description', wt.description,
      'reference_type', wt.reference_type,
      'reference_id', wt.reference_id,
      'provider', wt.provider,
      'provider_transaction_id', wt.provider_transaction_id,
      'provider_metadata', wt.provider_metadata,
      'admin_notes', wt.admin_notes,
      'is_withdrawable', wt.is_withdrawable
    )
    WHEN wl.id IS NOT NULL THEN wl.meta
    ELSE '{}'::jsonb
  END AS metadata,

  -- Booking reference
  COALESCE(
    wt.reference_id::UUID,
    wl.booking_id
  ) AS booking_id,

  -- Source system (para debugging)
  CASE
    WHEN wt.id IS NOT NULL AND wl.id IS NOT NULL THEN 'both'
    WHEN wt.id IS NOT NULL THEN 'legacy'
    WHEN wl.id IS NOT NULL THEN 'ledger'
    ELSE 'unknown'
  END AS source_system,

  -- IDs originales para referencia
  wt.id AS legacy_transaction_id,
  wl.id AS ledger_entry_id,
  wl.ref AS ledger_ref,

  -- Timestamps
  wt.completed_at AS legacy_completed_at,
  wl.created_at AS ledger_created_at

FROM wallet_transactions wt
FULL OUTER JOIN wallet_ledger wl ON wl.transaction_id = wt.id

-- Ordenar por fecha más reciente primero
ORDER BY COALESCE(wt.created_at, wl.ts) DESC;

COMMENT ON VIEW v_wallet_history IS
'Vista consolidada que combina wallet_transactions (legacy) y wallet_ledger (nuevo).
Útil para:
- Mostrar historial completo del usuario
- Debugging de migración
- Transición gradual del código frontend
- Reconciliación contable

Campos clave:
- source_system: "legacy", "ledger", "both" (transaction migrada)
- amount_cents: Siempre en centavos (normalizado)
- transaction_type: Enum como texto para compatibilidad
- status: "completed" para ledger entries, estado real para legacy';

-- =====================================================
-- 2. VISTA ESPECÍFICA: Historial de Usuario
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_wallet_history(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  transaction_date TIMESTAMPTZ,
  transaction_type TEXT,
  status TEXT,
  amount_cents BIGINT,
  currency TEXT,
  description TEXT,
  booking_id UUID,
  source_system TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    vh.id,
    vh.transaction_date,
    vh.transaction_type,
    vh.status,
    vh.amount_cents,
    vh.currency,
    vh.metadata->>'description' AS description,
    vh.booking_id,
    vh.source_system
  FROM v_wallet_history vh
  WHERE vh.user_id = p_user_id
  ORDER BY vh.transaction_date DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION get_user_wallet_history(UUID, INT, INT) IS
'Obtiene historial de transacciones de un usuario desde vista consolidada.
Parámetros:
- p_user_id: ID del usuario
- p_limit: Cantidad de resultados (default 50)
- p_offset: Offset para paginación (default 0)

Retorna transacciones ordenadas por fecha descendente.';

-- =====================================================
-- 3. FUNCIÓN: Estadísticas de Migración
-- =====================================================

CREATE OR REPLACE FUNCTION get_wallet_migration_stats()
RETURNS TABLE(
  total_legacy_transactions BIGINT,
  migrated_to_ledger BIGINT,
  pending_migration BIGINT,
  ledger_only_entries BIGINT,
  migration_percentage NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE source_system IN ('legacy', 'both')) AS total_legacy_transactions,
    COUNT(*) FILTER (WHERE source_system = 'both') AS migrated_to_ledger,
    COUNT(*) FILTER (WHERE source_system = 'legacy') AS pending_migration,
    COUNT(*) FILTER (WHERE source_system = 'ledger') AS ledger_only_entries,
    ROUND(
      (COUNT(*) FILTER (WHERE source_system = 'both')::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE source_system IN ('legacy', 'both')), 0) * 100),
      2
    ) AS migration_percentage
  FROM v_wallet_history;
$$;

COMMENT ON FUNCTION get_wallet_migration_stats() IS
'Retorna estadísticas del progreso de migración legacy → ledger.
Útil para monitorear el estado de la migración.';

-- =====================================================
-- 4. FUNCIÓN: Buscar Transacciones por Payment ID
-- =====================================================

CREATE OR REPLACE FUNCTION search_transactions_by_payment_id(
  p_payment_id TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  transaction_date TIMESTAMPTZ,
  transaction_type TEXT,
  amount_cents BIGINT,
  source_system TEXT,
  metadata JSONB
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    vh.id,
    vh.user_id,
    vh.transaction_date,
    vh.transaction_type,
    vh.amount_cents,
    vh.source_system,
    vh.metadata
  FROM v_wallet_history vh
  WHERE
    -- Buscar en metadata tanto de legacy como de ledger
    vh.metadata @> jsonb_build_object('payment_id', p_payment_id)
    OR vh.metadata @> jsonb_build_object('provider_transaction_id', p_payment_id)
    OR vh.metadata->'provider_metadata' @> jsonb_build_object('payment_id', p_payment_id)
  ORDER BY vh.transaction_date DESC;
$$;

COMMENT ON FUNCTION search_transactions_by_payment_id(TEXT) IS
'Busca transacciones por payment_id de MercadoPago u otro proveedor.
Útil para debugging de webhooks y reconciliación de pagos.';

-- =====================================================
-- 5. PERMISOS
-- =====================================================

GRANT SELECT ON v_wallet_history TO authenticated;
GRANT SELECT ON v_wallet_history TO service_role;

GRANT EXECUTE ON FUNCTION get_user_wallet_history(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_migration_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION search_transactions_by_payment_id(TEXT) TO service_role;

-- =====================================================
-- 6. QUERIES DE VALIDACIÓN
-- =====================================================

-- Verificar que la vista funciona correctamente
DO $$
DECLARE
  total_records BIGINT;
  legacy_count BIGINT;
  ledger_count BIGINT;
  both_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_records FROM v_wallet_history;
  SELECT COUNT(*) INTO legacy_count FROM v_wallet_history WHERE source_system = 'legacy';
  SELECT COUNT(*) INTO ledger_count FROM v_wallet_history WHERE source_system = 'ledger';
  SELECT COUNT(*) INTO both_count FROM v_wallet_history WHERE source_system = 'both';

  RAISE NOTICE '✅ Vista v_wallet_history creada exitosamente';
  RAISE NOTICE '   Total de registros: %', total_records;
  RAISE NOTICE '   Solo legacy: % transacciones', legacy_count;
  RAISE NOTICE '   Solo ledger: % entries', ledger_count;
  RAISE NOTICE '   Migradas (both): % transacciones', both_count;

  IF total_records = 0 THEN
    RAISE WARNING '⚠️  Vista está vacía (esperado si no hay datos aún)';
  END IF;
END $$;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Ver historial completo de un usuario
SELECT * FROM get_user_wallet_history('user-uuid-here');

-- 2. Ver estadísticas de migración
SELECT * FROM get_wallet_migration_stats();

-- 3. Buscar transacción por payment_id
SELECT * FROM search_transactions_by_payment_id('130635680108');

-- 4. Ver todas las transacciones pending de migración
SELECT
  id,
  user_id,
  transaction_type,
  amount_cents / 100.0 AS amount,
  currency,
  transaction_date
FROM v_wallet_history
WHERE source_system = 'legacy'
ORDER BY transaction_date DESC;

-- 5. Comparar balance legacy vs ledger
SELECT
  user_id,
  SUM(CASE WHEN source_system IN ('legacy', 'both') THEN amount_cents ELSE 0 END) / 100.0 AS legacy_total,
  SUM(CASE WHEN source_system IN ('ledger', 'both') THEN amount_cents ELSE 0 END) / 100.0 AS ledger_total,
  (
    SUM(CASE WHEN source_system IN ('legacy', 'both') THEN amount_cents ELSE 0 END) -
    SUM(CASE WHEN source_system IN ('ledger', 'both') THEN amount_cents ELSE 0 END)
  ) / 100.0 AS difference
FROM v_wallet_history
GROUP BY user_id;
*/

-- =====================================================
-- FIN DE MIGRACIÓN 009
-- =====================================================
