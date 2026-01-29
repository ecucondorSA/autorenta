-- ============================================================================
-- Migración 001: Vista wallet_user_aggregates
-- ============================================================================
-- Fecha: 2025-10-22
-- Propósito: Separar balances en Transferible, Retirable y Crédito Protegido
--
-- Cambios:
-- 1. Agregar constraint para nuevos reference_type
-- 2. Crear vista de agregados basada en transacciones
-- 3. Actualizar RPC wallet_get_balance() para usar la vista
--
-- Rollback: Ver archivo 001-rollback-aggregates-view.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Actualizar constraint de reference_type
-- ============================================================================

ALTER TABLE wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;

ALTER TABLE wallet_transactions
  ADD CONSTRAINT wallet_transactions_reference_type_check
  CHECK (reference_type = ANY (ARRAY[
    'deposit',           -- Depósitos normales
    'booking',           -- Pagos de reservas
    'reward',            -- Bonificaciones
    'credit_protected',  -- ← NUEVO: Aportes al Crédito Autorentar (no retirable)
    'transfer',          -- ← NUEVO: Transferencias entre usuarios
    'withdrawal'         -- ← NUEVO: Retiros a cuenta bancaria
  ]));

-- ============================================================================
-- STEP 2: Crear vista wallet_user_aggregates
-- ============================================================================
-- Esta vista calcula los balances desde las transacciones completadas,
-- separando explícitamente el crédito protegido de los demás fondos.
-- ============================================================================

CREATE OR REPLACE VIEW wallet_user_aggregates AS
SELECT
  t.user_id,

  -- Total en centavos (solo completed)
  -- Suma depósitos/bonos/refunds, resta retiros/cargos
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.type IN ('deposit', 'bonus', 'refund')
        THEN t.amount
      WHEN t.status='completed' AND t.type IN ('withdrawal', 'charge')
        THEN -t.amount
      ELSE 0
    END
  ), 0) AS total_cents,

  -- Bloqueos (locks) en centavos
  -- Fondos bloqueados temporalmente (ej: garantía de reserva)
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.type='lock'
        THEN t.amount
      WHEN t.status='completed' AND t.type='unlock'
        THEN -t.amount
      ELSE 0
    END
  ), 0) AS locked_cents,

  -- Crédito protegido aportado explícitamente
  -- SOLO transacciones con reference_type='credit_protected'
  COALESCE(SUM(
    CASE
      WHEN t.status='completed' AND t.reference_type='credit_protected'
        THEN t.amount
      ELSE 0
    END
  ), 0) AS protected_credit_cents

FROM wallet_transactions t
GROUP BY t.user_id;

-- ============================================================================
-- STEP 3: Actualizar RPC wallet_get_balance()
-- ============================================================================
-- Retorna 6 tipos de balance:
-- 1. available_balance: Total - Locked (fondos disponibles)
-- 2. transferable_balance: Available - Protected (para usar en app o transferir)
-- 3. withdrawable_balance: Transferable (para retirar a banco)
-- 4. protected_credit_balance: Crédito Autorentar (meta USD 250)
-- 5. locked_balance: Bloqueado en reservas
-- 6. total_balance: Total de fondos
-- ============================================================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS wallet_get_balance();

CREATE OR REPLACE FUNCTION wallet_get_balance()
RETURNS TABLE (
  available_balance NUMERIC(10, 2),
  transferable_balance NUMERIC(10, 2),
  withdrawable_balance NUMERIC(10, 2),
  protected_credit_balance NUMERIC(10, 2),
  locked_balance NUMERIC(10, 2),
  total_balance NUMERIC(10, 2),
  currency TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_total NUMERIC(10, 2) := 0;
  v_locked NUMERIC(10, 2) := 0;
  v_protected NUMERIC(10, 2) := 0;
  v_available NUMERIC(10, 2) := 0;
  v_transferable NUMERIC(10, 2) := 0;
  v_withdrawable NUMERIC(10, 2) := 0;
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener agregados desde la vista
  SELECT
    total_cents / 100.0,
    locked_cents / 100.0,
    protected_credit_cents / 100.0
  INTO v_total, v_locked, v_protected
  FROM wallet_user_aggregates
  WHERE user_id = v_user_id;

  -- Si no hay datos, inicializar en cero
  v_total := COALESCE(v_total, 0);
  v_locked := COALESCE(v_locked, 0);
  v_protected := COALESCE(v_protected, 0);

  -- Calcular balances derivados
  v_available := GREATEST(v_total - v_locked, 0);
  v_transferable := GREATEST(v_available - v_protected, 0);
  v_withdrawable := v_transferable; -- Por ahora, sin hold mínimo

  -- Retornar resultado
  RETURN QUERY SELECT
    v_available AS available_balance,
    v_transferable AS transferable_balance,
    v_withdrawable AS withdrawable_balance,
    v_protected AS protected_credit_balance,
    v_locked AS locked_balance,
    v_total AS total_balance,
    'USD'::TEXT AS currency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Comentarios para documentación
-- ============================================================================

COMMENT ON VIEW wallet_user_aggregates IS
'Vista de agregados de wallet por usuario. Calcula total, locked y protected_credit desde transacciones completadas.';

COMMENT ON FUNCTION wallet_get_balance() IS
'RPC para obtener balances del wallet del usuario autenticado. Retorna available, transferable, withdrawable, protected_credit, locked y total en USD.';

COMMIT;
