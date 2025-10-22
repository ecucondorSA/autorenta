-- =====================================================
-- RPC FUNCTION: wallet_get_balance
-- DESCRIPCIÓN: Obtiene el balance de wallet de un usuario
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS wallet_get_balance();
DROP FUNCTION IF EXISTS wallet_get_balance(UUID);

-- Crear función para obtener el balance del usuario autenticado
CREATE OR REPLACE FUNCTION wallet_get_balance()
RETURNS TABLE (
  available_balance NUMERIC(10, 2),
  withdrawable_balance NUMERIC(10, 2),
  non_withdrawable_balance NUMERIC(10, 2),
  locked_balance NUMERIC(10, 2),
  total_balance NUMERIC(10, 2),
  currency TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_available NUMERIC(10, 2) := 0;
  v_locked NUMERIC(10, 2) := 0;
  v_floor NUMERIC(10, 2) := 0;
  v_non_withdrawable NUMERIC(10, 2) := 0;
  v_withdrawable NUMERIC(10, 2) := 0;
BEGIN
  -- Obtener el user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Calcular balance disponible (deposits + refunds + bonuses - charges)
  -- Solo transacciones completadas
  SELECT COALESCE(
    SUM(CASE
      WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
      WHEN type IN ('charge') THEN -amount
      ELSE 0
    END),
    0
  )
  INTO v_available
  FROM wallet_transactions
  WHERE user_id = v_user_id
    AND status = 'completed'
    AND type NOT IN ('lock', 'unlock');  -- Excluir operaciones de lock/unlock del balance disponible

  -- Calcular balance bloqueado (locks activos - unlocks)
  -- Solo transacciones completadas
  SELECT COALESCE(
    SUM(CASE
      WHEN type = 'lock' THEN amount
      WHEN type = 'unlock' THEN -amount
      ELSE 0
    END),
    0
  )
  INTO v_locked
  FROM wallet_transactions
  WHERE user_id = v_user_id
    AND status = 'completed'
    AND type IN ('lock', 'unlock');

  -- Obtener piso de fondos no reembolsables
  SELECT non_withdrawable_floor INTO v_floor
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_floor IS NULL THEN
    v_floor := 0;
  END IF;

  -- Calcular balances retirables vs crédito de plataforma
  v_non_withdrawable := LEAST(v_available, v_floor);
  v_withdrawable := GREATEST(v_available - v_non_withdrawable, 0);

  -- Retornar el balance
  RETURN QUERY SELECT
    v_available AS available_balance,
    v_withdrawable AS withdrawable_balance,
    v_non_withdrawable AS non_withdrawable_balance,
    v_locked AS locked_balance,
    (v_available + v_locked) AS total_balance,
    'USD'::TEXT AS currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Cualquier usuario autenticado puede obtener su balance
GRANT EXECUTE ON FUNCTION wallet_get_balance() TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION wallet_get_balance() IS 'Obtiene el balance de wallet del usuario autenticado (disponible, bloqueado, total)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Obtener balance del usuario autenticado
SELECT * FROM wallet_get_balance();

-- Resultado esperado:
-- available_balance | withdrawable_balance | non_withdrawable_balance | locked_balance | total_balance | currency
-- 150.00            | 50.00                 | 100.00                    | 50.00          | 200.00        | USD
*/
