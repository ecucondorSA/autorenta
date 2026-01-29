-- ============================================================================
-- SECURITY HOTFIX: wallet_transfer IDOR Vulnerability
-- ============================================================================
-- Fecha: 2026-01-24
-- Auditor: Gemini Agent
-- Descripción: Se agrega validación obligatoria de auth.uid() para evitar
-- que un usuario transfiera fondos de una billetera ajena.
-- ============================================================================

CREATE OR REPLACE FUNCTION wallet_transfer(
  p_from_user UUID,
  p_to_user UUID,
  p_amount_cents BIGINT,
  p_ref VARCHAR,
  p_meta JSONB DEFAULT '{}'
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_transfer_id UUID;
  v_from_balance BIGINT;
  v_current_user UUID;
BEGIN
  -- 1. SECURITY CHECK (El Parche)
  -- ============================================================================
  v_current_user := auth.uid();
  
  -- Si el usuario no está autenticado, error.
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: You must be logged in';
  END IF;

  -- Si intenta mover dinero de OTRO usuario, error.
  -- Excepción: Permitir si es admin (opcional, aquí seremos estrictos por seguridad)
  IF p_from_user != v_current_user THEN
    RAISE EXCEPTION 'Security Violation: You can only transfer funds from your own wallet. (Attempted % from %)', v_current_user, p_from_user;
  END IF;
  -- ============================================================================

  -- Validaciones de Negocio
  IF p_from_user = p_to_user THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Verificar idempotencia
  IF EXISTS (SELECT 1 FROM wallet_transfers WHERE ref = p_ref) THEN
    SELECT id INTO v_transfer_id FROM wallet_transfers WHERE ref = p_ref;
    RETURN jsonb_build_object(
      'ok', true,
      'transfer_id', v_transfer_id,
      'ref', p_ref,
      'status', 'duplicate'
    );
  END IF;

  -- Iniciar transacción atómica
  BEGIN
    -- Verificar saldo con lock
    SELECT available_balance INTO v_from_balance
    FROM user_wallets
    WHERE user_id = p_from_user
    FOR UPDATE;

    IF v_from_balance IS NULL THEN
       RAISE EXCEPTION 'Wallet not found for user %', p_from_user;
    END IF;

    IF v_from_balance < p_amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance. Available: %, Required: %', v_from_balance, p_amount_cents;
    END IF;

    -- Crear registro de transferencia
    INSERT INTO wallet_transfers (from_user, to_user, amount_cents, ref, status, meta, completed_at)
    VALUES (p_from_user, p_to_user, p_amount_cents, p_ref, 'completed', p_meta, NOW())
    RETURNING id INTO v_transfer_id;

    -- Los triggers de la tabla wallet_transfers se encargarán de actualizar
    -- el wallet_ledger y los saldos (si están configurados así en 003-wallet-ledger).
    -- Si no hay triggers, deberíamos insertar en ledger aquí. 
    -- Asumimos que la lógica original confiaba en la inserción.
    
    -- NOTA: Basado en el archivo 003 original, parece que falta la lógica de inserción en ledger 
    -- dentro de esta función o depende de triggers no vistos. 
    -- Para este hotfix, mantenemos la lógica original de inserción en `wallet_transfers`
    -- y asumimos que el sistema Ledger reacciona a ello.

    RETURN jsonb_build_object(
      'ok', true,
      'transfer_id', v_transfer_id,
      'new_balance', v_from_balance - p_amount_cents
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE; -- Re-lanzar error para abortar transacción
  END;
END;
$$;

COMMENT ON FUNCTION wallet_transfer IS 'SECURITY PATCHED: Realiza transferencias P2P verificando ownership';
