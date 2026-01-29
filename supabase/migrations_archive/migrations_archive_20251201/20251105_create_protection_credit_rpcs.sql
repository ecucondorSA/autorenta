-- ============================================================================
-- AUTORENTA - RPC FUNCTIONS: PROTECTION CREDIT (CRÉDITO DE PROTECCIÓN)
-- ============================================================================
-- Created: 2025-11-05
-- Purpose: Funciones RPC para gestión de Crédito de Protección (CP)
-- ============================================================================
--
-- NOMENCLATURA:
-- - CP = Crédito de Protección (anteriormente BSNR)
-- - Almacenado en CENTAVOS (cents)
-- - NO RETIRABLE (non-withdrawable)
-- - Renovable por buen historial
--
-- FUNCIONES INCLUIDAS:
-- 1. issue_protection_credit(user_id, amount_cents) - Emite CP inicial
-- 2. consume_protection_credit_for_claim(user_id, claim_amount_cents, booking_id) - Consume CP
-- 3. extend_protection_credit_for_good_history(user_id) - Renueva CP
-- 4. recognize_protection_credit_breakage(user_id) - Reconoce breakage
-- 5. get_protection_credit_balance(user_id) - Obtiene balance CP
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ISSUE_PROTECTION_CREDIT
-- ============================================================================
-- Emite Crédito de Protección inicial a un usuario nuevo

CREATE OR REPLACE FUNCTION issue_protection_credit(
  p_user_id UUID,
  p_amount_cents BIGINT DEFAULT 30000, -- $300 USD por defecto
  p_validity_days INT DEFAULT 365 -- 1 año
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_exists BOOLEAN;
  v_transaction_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validar monto
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Monto de CP debe ser mayor a 0';
  END IF;

  -- Calcular fecha de expiración
  v_expires_at := NOW() + (p_validity_days || ' days')::INTERVAL;

  -- Verificar si existe wallet
  SELECT EXISTS (
    SELECT 1 FROM user_wallets WHERE user_id = p_user_id
  ) INTO v_wallet_exists;

  -- Crear wallet si no existe
  IF NOT v_wallet_exists THEN
    INSERT INTO user_wallets (
      user_id,
      available_balance,
      locked_balance,
      currency,
      protection_credit_cents,
      protection_credit_currency,
      protection_credit_issued_at,
      protection_credit_expires_at,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      0,
      0,
      'USD',
      p_amount_cents,
      'USD',
      NOW(),
      v_expires_at,
      NOW(),
      NOW()
    );
  ELSE
    -- Actualizar wallet existente
    UPDATE user_wallets
    SET
      protection_credit_cents = p_amount_cents,
      protection_credit_currency = 'USD',
      protection_credit_issued_at = NOW(),
      protection_credit_expires_at = v_expires_at,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    reference_id,
    provider,
    is_withdrawable,
    is_protection_credit,
    protection_credit_reference_type,
    description,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'bonus',
    'completed',
    p_amount_cents / 100.0, -- Convertir a unidades para transaction
    'USD',
    NULL,
    NULL,
    'internal',
    FALSE, -- No retirable
    TRUE,
    'issuance',
    'Crédito de Protección inicial - $' || (p_amount_cents / 100.0) || ' USD',
    NOW(),
    NOW()
  ) RETURNING id INTO v_transaction_id;

  RAISE NOTICE 'Crédito de Protección emitido: % centavos USD (Expira: %)', p_amount_cents, v_expires_at;
  RETURN v_transaction_id;
END;
$$;

COMMENT ON FUNCTION issue_protection_credit IS
  'Emite Crédito de Protección inicial ($300 USD por defecto, válido 1 año)';

-- ============================================================================
-- 2. CONSUME_PROTECTION_CREDIT_FOR_CLAIM
-- ============================================================================
-- Consume CP para cubrir un siniestro (waterfall: CP → WR → externo)

CREATE OR REPLACE FUNCTION consume_protection_credit_for_claim(
  p_user_id UUID,
  p_claim_amount_cents BIGINT,
  p_booking_id UUID
)
RETURNS TABLE (
  cp_used_cents BIGINT,
  wr_used_cents BIGINT,
  remaining_claim_cents BIGINT,
  transaction_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_cp_available_cents BIGINT;
  v_wr_available_cents BIGINT;
  v_cp_to_use_cents BIGINT;
  v_wr_to_use_cents BIGINT;
  v_remaining_cents BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Validar monto
  IF p_claim_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Monto de siniestro debe ser mayor a 0';
  END IF;

  -- Obtener wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet no encontrado para usuario %', p_user_id;
  END IF;

  -- Obtener balances disponibles
  v_cp_available_cents := COALESCE(v_wallet.protection_credit_cents, 0);
  v_wr_available_cents := COALESCE(v_wallet.available_balance * 100, 0); -- Convertir a centavos

  -- Verificar expiración de CP
  IF v_wallet.protection_credit_expires_at IS NOT NULL
     AND v_wallet.protection_credit_expires_at < NOW() THEN
    RAISE NOTICE 'Crédito de Protección expirado, no se puede usar';
    v_cp_available_cents := 0;
  END IF;

  -- WATERFALL LOGIC
  -- 1. Usar CP primero (hasta agotar)
  v_cp_to_use_cents := LEAST(v_cp_available_cents, p_claim_amount_cents);
  v_remaining_cents := p_claim_amount_cents - v_cp_to_use_cents;

  -- 2. Si queda saldo, usar WR (Wallet Retirable)
  v_wr_to_use_cents := LEAST(v_wr_available_cents, v_remaining_cents);
  v_remaining_cents := v_remaining_cents - v_wr_to_use_cents;

  -- Actualizar wallet: descontar CP
  IF v_cp_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET
      protection_credit_cents = protection_credit_cents - v_cp_to_use_cents,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'CP consumido: % centavos', v_cp_to_use_cents;
  END IF;

  -- Actualizar wallet: descontar WR
  IF v_wr_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET
      available_balance = available_balance - (v_wr_to_use_cents / 100.0),
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'WR consumido: % centavos', v_wr_to_use_cents;
  END IF;

  -- Registrar transacción de consumo de CP
  IF v_cp_to_use_cents > 0 THEN
    INSERT INTO wallet_transactions (
      id,
      user_id,
      type,
      status,
      amount,
      currency,
      reference_type,
      reference_id,
      provider,
      is_withdrawable,
      is_protection_credit,
      protection_credit_reference_type,
      description,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      'charge',
      'completed',
      v_cp_to_use_cents / 100.0,
      'USD',
      'booking',
      p_booking_id,
      'internal',
      FALSE,
      TRUE,
      'consumption',
      'Consumo CP para siniestro - Booking ' || p_booking_id,
      NOW(),
      NOW()
    ) RETURNING id INTO v_transaction_id;
  END IF;

  -- Registrar transacción de consumo de WR (si se usó)
  IF v_wr_to_use_cents > 0 THEN
    INSERT INTO wallet_transactions (
      id,
      user_id,
      type,
      status,
      amount,
      currency,
      reference_type,
      reference_id,
      provider,
      is_withdrawable,
      is_protection_credit,
      description,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      p_user_id,
      'charge',
      'completed',
      v_wr_to_use_cents / 100.0,
      'USD',
      'booking',
      p_booking_id,
      'internal',
      TRUE,
      FALSE,
      'Cargo de wallet para siniestro - Booking ' || p_booking_id,
      NOW(),
      NOW()
    );
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_cp_to_use_cents,
    v_wr_to_use_cents,
    v_remaining_cents,
    v_transaction_id;

  RAISE NOTICE 'Siniestro procesado: CP: %, WR: %, Restante: %',
    v_cp_to_use_cents, v_wr_to_use_cents, v_remaining_cents;
END;
$$;

COMMENT ON FUNCTION consume_protection_credit_for_claim IS
  'Consume CP y WR para cubrir siniestro (waterfall: CP → WR → externo)';

-- ============================================================================
-- 3. EXTEND_PROTECTION_CREDIT_FOR_GOOD_HISTORY
-- ============================================================================
-- Renueva CP gratis por buen historial (10 bookings sin siniestros)

CREATE OR REPLACE FUNCTION extend_protection_credit_for_good_history(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_bookings INT;
  v_total_claims INT;
  v_wallet RECORD;
  v_new_amount_cents BIGINT;
  v_new_expires_at TIMESTAMPTZ;
  v_is_eligible BOOLEAN;
BEGIN
  -- Contar bookings completados
  SELECT COUNT(*) INTO v_completed_bookings
  FROM bookings
  WHERE renter_id = p_user_id
  AND status = 'completed';

  -- Contar siniestros
  SELECT COUNT(*) INTO v_total_claims
  FROM booking_claims
  WHERE user_id = p_user_id
  AND status IN ('approved', 'resolved');

  -- Verificar elegibilidad: ≥10 bookings y 0 siniestros
  v_is_eligible := (v_completed_bookings >= 10 AND v_total_claims = 0);

  IF NOT v_is_eligible THEN
    RAISE NOTICE 'Usuario no elegible para renovación CP (Bookings: %, Siniestros: %)',
      v_completed_bookings, v_total_claims;
    RETURN FALSE;
  END IF;

  -- Obtener wallet actual
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet no encontrado para usuario %', p_user_id;
  END IF;

  -- Calcular nuevo monto (renovar a $300 USD)
  v_new_amount_cents := 30000; -- $300 USD

  -- Si ya tiene CP, sumar al existente
  IF v_wallet.protection_credit_cents > 0 THEN
    v_new_amount_cents := v_wallet.protection_credit_cents + 30000;
  END IF;

  -- Nueva fecha de expiración (1 año desde hoy)
  v_new_expires_at := NOW() + INTERVAL '365 days';

  -- Actualizar wallet
  UPDATE user_wallets
  SET
    protection_credit_cents = v_new_amount_cents,
    protection_credit_issued_at = NOW(),
    protection_credit_expires_at = v_new_expires_at,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    provider,
    is_withdrawable,
    is_protection_credit,
    protection_credit_reference_type,
    description,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'bonus',
    'completed',
    300.00,
    'USD',
    NULL,
    'internal',
    FALSE,
    TRUE,
    'renewal',
    'Renovación gratuita CP por buen historial (10+ bookings sin siniestros)',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'CP renovado para usuario %: % → % centavos (Expira: %)',
    p_user_id, v_wallet.protection_credit_cents, v_new_amount_cents, v_new_expires_at;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION extend_protection_credit_for_good_history IS
  'Renueva CP gratis si usuario tiene ≥10 bookings completados sin siniestros';

-- ============================================================================
-- 4. RECOGNIZE_PROTECTION_CREDIT_BREAKAGE
-- ============================================================================
-- Reconoce breakage cuando el usuario cierra cuenta o CP expira

CREATE OR REPLACE FUNCTION recognize_protection_credit_breakage(
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_breakage_amount NUMERIC;
  v_breakage_cents BIGINT;
BEGIN
  -- Obtener wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Wallet no encontrado para usuario %', p_user_id;
    RETURN 0;
  END IF;

  v_breakage_cents := COALESCE(v_wallet.protection_credit_cents, 0);

  -- Si no hay CP, no hay breakage
  IF v_breakage_cents = 0 THEN
    RAISE NOTICE 'No hay CP para reconocer breakage';
    RETURN 0;
  END IF;

  v_breakage_amount := v_breakage_cents / 100.0;

  -- Actualizar wallet (resetear CP a 0)
  UPDATE user_wallets
  SET
    protection_credit_cents = 0,
    protection_credit_expires_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción de breakage
  INSERT INTO wallet_transactions (
    id,
    user_id,
    type,
    status,
    amount,
    currency,
    provider,
    is_withdrawable,
    is_protection_credit,
    protection_credit_reference_type,
    description,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'charge',
    'completed',
    v_breakage_amount,
    'USD',
    'internal',
    FALSE,
    TRUE,
    'breakage',
    'Reconocimiento de breakage CP - Cuenta cerrada o expirado',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Breakage reconocido: $% USD (% centavos)', v_breakage_amount, v_breakage_cents;
  RETURN v_breakage_amount;
END;
$$;

COMMENT ON FUNCTION recognize_protection_credit_breakage IS
  'Reconoce breakage de CP no utilizado (cuenta cerrada o expirado)';

-- ============================================================================
-- 5. GET_PROTECTION_CREDIT_BALANCE
-- ============================================================================
-- Obtiene balance actual de CP

CREATE OR REPLACE FUNCTION get_protection_credit_balance(
  p_user_id UUID
)
RETURNS TABLE (
  balance_cents BIGINT,
  balance_usd NUMERIC,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  days_until_expiry INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_is_expired BOOLEAN;
  v_days_until_expiry INT;
BEGIN
  -- Obtener wallet
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'Wallet no encontrado para usuario %', p_user_id;
    RETURN;
  END IF;

  -- Verificar expiración
  v_is_expired := FALSE;
  v_days_until_expiry := NULL;

  IF v_wallet.protection_credit_expires_at IS NOT NULL THEN
    v_is_expired := (v_wallet.protection_credit_expires_at < NOW());
    v_days_until_expiry := EXTRACT(DAY FROM (v_wallet.protection_credit_expires_at - NOW()))::INT;
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT
    COALESCE(v_wallet.protection_credit_cents, 0)::BIGINT,
    (COALESCE(v_wallet.protection_credit_cents, 0) / 100.0)::NUMERIC,
    v_wallet.protection_credit_issued_at,
    v_wallet.protection_credit_expires_at,
    v_is_expired,
    v_days_until_expiry;
END;
$$;

COMMENT ON FUNCTION get_protection_credit_balance IS
  'Obtiene balance actual de Crédito de Protección con info de expiración';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Authenticated users can check their own CP balance
GRANT EXECUTE ON FUNCTION get_protection_credit_balance(UUID) TO authenticated;

-- Only service role can issue, consume, extend and recognize breakage
GRANT EXECUTE ON FUNCTION issue_protection_credit(UUID, BIGINT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION consume_protection_credit_for_claim(UUID, BIGINT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION extend_protection_credit_for_good_history(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION recognize_protection_credit_breakage(UUID) TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Protection Credit RPCs creadas correctamente';
  RAISE NOTICE '   - issue_protection_credit(user_id, amount_cents, validity_days)';
  RAISE NOTICE '   - consume_protection_credit_for_claim(user_id, claim_amount_cents, booking_id)';
  RAISE NOTICE '   - extend_protection_credit_for_good_history(user_id)';
  RAISE NOTICE '   - recognize_protection_credit_breakage(user_id)';
  RAISE NOTICE '   - get_protection_credit_balance(user_id)';
END $$;

COMMIT;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
