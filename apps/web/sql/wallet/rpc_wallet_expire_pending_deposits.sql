-- =====================================================
-- RPC FUNCTION: wallet_expire_pending_deposits
-- DESCRIPCIÓN: Marca como expirados los depósitos pendientes antiguos
-- AUTOR: Claude Code
-- FECHA: 2025-10-20
-- =====================================================

DROP FUNCTION IF EXISTS wallet_expire_pending_deposits(INTERVAL);

CREATE OR REPLACE FUNCTION wallet_expire_pending_deposits(
  p_older_than INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE (
  expired_count INTEGER,
  total_amount NUMERIC,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_expired_count INTEGER;
  v_total_amount NUMERIC;
BEGIN
  -- Actualizar transacciones pendientes antiguas a 'failed'
  WITH expired_transactions AS (
    UPDATE wallet_transactions
    SET
      status = 'failed',
      admin_notes = COALESCE(admin_notes, '') ||
        E'\n[Auto-expired] Depósito marcado como fallido por falta de confirmación de pago después de ' || p_older_than::TEXT,
      updated_at = NOW()
    WHERE type = 'deposit'
      AND status = 'pending'
      AND created_at < NOW() - p_older_than
    RETURNING id, amount
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(amount), 0)
  INTO v_expired_count, v_total_amount
  FROM expired_transactions;

  RETURN QUERY SELECT
    v_expired_count AS expired_count,
    v_total_amount AS total_amount,
    FORMAT(
      'Se expiraron %s depósitos pendientes por un total de $%s',
      v_expired_count,
      v_total_amount
    ) AS message;
END;
$$;

COMMENT ON FUNCTION wallet_expire_pending_deposits(INTERVAL) IS
'Marca como expirados los depósitos pendientes que tienen más de X tiempo sin confirmarse';

-- Permisos: Solo service_role puede ejecutar esta función
GRANT EXECUTE ON FUNCTION wallet_expire_pending_deposits(INTERVAL) TO service_role;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Expirar depósitos pendientes de más de 24 horas (default)
SELECT * FROM wallet_expire_pending_deposits();

-- Resultado esperado:
-- expired_count | total_amount | message
-- 48            | 5100.00      | Se expiraron 48 depósitos pendientes por un total de $5100.00

-- 2. Expirar depósitos pendientes de más de 1 hora (para testing)
SELECT * FROM wallet_expire_pending_deposits('1 hour');

-- 3. Expirar depósitos pendientes de más de 7 días
SELECT * FROM wallet_expire_pending_deposits('7 days');
*/
