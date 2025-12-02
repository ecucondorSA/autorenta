-- =====================================================
-- BONUS-MALUS ACCOUNTING INTEGRATION
-- Phase 7: Integración del sistema Bonus-Malus con Contabilidad
-- Basado en NIIF 15 (Reconocimiento de ingresos) e IFRIC 13 (Programas de fidelización)
-- =====================================================

-- =====================================================
-- 1. NUEVAS CUENTAS CONTABLES PARA BONUS-MALUS
-- =====================================================

-- Insertar nuevas cuentas en el plan de cuentas
INSERT INTO accounting_accounts (code, name, account_type, sub_type, is_control_account, is_active) VALUES

-- PASIVOS (Liability) - Ingresos Diferidos
('2110', 'Ingresos Diferidos', 'LIABILITY', 'PASIVO_CORRIENTE', true, true),
('2111', 'Crédito de Protección No Devengado', 'LIABILITY', 'PASIVO_CORRIENTE', false, true),

-- INGRESOS (Income) - Reconocimiento de Ingresos
('4103', 'Ingreso por Consumo de Crédito Protección', 'INCOME', 'INGRESO_OPERACIONAL', false, true),
('4203', 'Ingreso por Breakage (CP No Usado)', 'INCOME', 'INGRESO_NO_OPERACIONAL', false, true),
('4104', 'Ingreso por Venta de Protector de Bonus', 'INCOME', 'INGRESO_OPERACIONAL', false, true)

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. FUNCIÓN: CONTABILIZAR EMISIÓN DE CRÉDITO PROTECCIÓN
-- =====================================================

/**
 * account_protection_credit_issuance
 *
 * Registra el asiento contable cuando se emite Crédito de Protección (CP).
 *
 * TRATAMIENTO CONTABLE (IFRIC 13):
 * - CP emitido = Ingreso diferido (pasivo)
 * - No se reconoce como ingreso hasta que se consuma
 * - Similar a puntos de fidelización
 *
 * ASIENTO:
 * DEBE:  1102 MercadoPago Disponible       $300
 * HABER: 2111 CP No Devengado              $300
 *
 * NOTA: En este caso el débito es ficticio porque el CP se otorga gratis.
 * En la práctica, podría debitarse de 3100 Capital Social o 3300 Resultados Acumulados.
 */
CREATE OR REPLACE FUNCTION account_protection_credit_issuance(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_transaction_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_amount_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '3300',  -- Resultados Acumulados (EQUITY)
      'debit', v_amount_decimal,
      'description', 'Emisión de Crédito de Protección'
    ),
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'credit', v_amount_decimal,
      'description', 'Pasivo por CP otorgado a usuario'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_ISSUANCE',
    p_transaction_id,
    'wallet_transactions',
    'Emisión CP $' || v_amount_decimal || ' USD - Usuario: ' || p_user_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION account_protection_credit_issuance TO authenticated, service_role;

-- =====================================================
-- 3. FUNCIÓN: CONTABILIZAR CONSUMO DE CRÉDITO PROTECCIÓN
-- =====================================================

/**
 * account_protection_credit_consumption
 *
 * Registra el asiento contable cuando se consume CP para un siniestro.
 *
 * TRATAMIENTO CONTABLE (NIIF 15):
 * - CP consumido = Reconocimiento de ingreso (performance obligation satisfied)
 * - Se libera el pasivo y se reconoce ingreso
 *
 * ASIENTO:
 * DEBE:  2111 CP No Devengado              $100
 * HABER: 4103 Ingreso por Consumo CP       $100
 *
 * @param p_user_id - ID del usuario
 * @param p_consumed_cents - Monto consumido en centavos
 * @param p_claim_id - ID del siniestro
 * @param p_transaction_id - ID de la transacción wallet
 */
CREATE OR REPLACE FUNCTION account_protection_credit_consumption(
  p_user_id UUID,
  p_consumed_cents BIGINT,
  p_claim_id UUID,
  p_transaction_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar que hay algo que consumir
  IF p_consumed_cents <= 0 THEN
    RAISE EXCEPTION 'El monto consumido debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_consumed_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Liberación de pasivo por consumo CP'
    ),
    jsonb_build_object(
      'account_code', '4103',  -- Ingreso por Consumo CP (INCOME)
      'credit', v_amount_decimal,
      'description', 'Reconocimiento de ingreso por consumo CP'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_CONSUMPTION',
    p_transaction_id,
    'wallet_transactions',
    'Consumo CP $' || v_amount_decimal || ' USD - Siniestro: ' || p_claim_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION account_protection_credit_consumption TO authenticated, service_role;

-- =====================================================
-- 4. FUNCIÓN: CONTABILIZAR BREAKAGE (CP NO USADO)
-- =====================================================

/**
 * account_protection_credit_breakage
 *
 * Registra el asiento contable cuando CP expira sin ser usado.
 *
 * TRATAMIENTO CONTABLE (IFRIC 13 Breakage):
 * - CP no usado = Breakage revenue (ingreso no operacional)
 * - Se libera el pasivo y se reconoce como ingreso extraordinario
 * - Común en programas de puntos/gift cards
 *
 * ASIENTO:
 * DEBE:  2111 CP No Devengado              $300
 * HABER: 4203 Ingreso por Breakage         $300
 *
 * @param p_user_id - ID del usuario
 * @param p_expired_cents - Monto expirado en centavos
 * @param p_reason - Razón del breakage ('EXPIRATION', 'ACCOUNT_CLOSURE')
 */
CREATE OR REPLACE FUNCTION account_protection_credit_breakage(
  p_user_id UUID,
  p_expired_cents BIGINT,
  p_reason VARCHAR(50),
  p_transaction_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar que hay algo que expirar
  IF p_expired_cents <= 0 THEN
    RAISE EXCEPTION 'El monto expirado debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_expired_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Liberación de pasivo por CP no usado'
    ),
    jsonb_build_object(
      'account_code', '4203',  -- Ingreso por Breakage (INCOME)
      'credit', v_amount_decimal,
      'description', 'Reconocimiento de ingreso por breakage'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_BREAKAGE',
    p_transaction_id,
    'wallet_transactions',
    'Breakage CP $' || v_amount_decimal || ' USD - Razón: ' || p_reason,
    v_entries
  );

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION account_protection_credit_breakage TO authenticated, service_role;

-- =====================================================
-- 5. FUNCIÓN: CONTABILIZAR VENTA DE PROTECTOR BONUS
-- =====================================================

/**
 * account_bonus_protector_sale
 *
 * Registra el asiento contable cuando se vende un Protector de Bonus.
 *
 * TRATAMIENTO CONTABLE (NIIF 15):
 * - Venta de servicio = Ingreso reconocido inmediatamente
 * - Performance obligation satisfied al momento de la compra
 * - Fondos tomados de wallet del usuario
 *
 * ASIENTO:
 * DEBE:  2101 Depósitos Clientes (Billetera)  $15
 * HABER: 4104 Ingreso Protector Bonus         $15
 *
 * @param p_user_id - ID del usuario
 * @param p_price_cents - Precio en centavos
 * @param p_protection_level - Nivel del protector (1-3)
 * @param p_addon_id - ID del add-on
 * @param p_transaction_id - ID de la transacción wallet
 */
CREATE OR REPLACE FUNCTION account_bonus_protector_sale(
  p_user_id UUID,
  p_price_cents BIGINT,
  p_protection_level INT,
  p_addon_id UUID,
  p_transaction_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Validar precio
  IF p_price_cents <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor a 0';
  END IF;

  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_price_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '2101',  -- Depósitos Clientes (LIABILITY)
      'debit', v_amount_decimal,
      'description', 'Pago de Protector Bonus desde billetera'
    ),
    jsonb_build_object(
      'account_code', '4104',  -- Ingreso Protector Bonus (INCOME)
      'credit', v_amount_decimal,
      'description', 'Ingreso por venta de Protector Nivel ' || p_protection_level
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'BONUS_PROTECTOR_SALE',
    p_transaction_id,
    'wallet_transactions',
    'Venta Protector Bonus Nivel ' || p_protection_level || ' - $' || v_amount_decimal || ' USD',
    v_entries
  );

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION account_bonus_protector_sale TO authenticated, service_role;

-- =====================================================
-- 6. FUNCIÓN: CONTABILIZAR RENOVACIÓN GRATUITA DE CP
-- =====================================================

/**
 * account_protection_credit_renewal
 *
 * Registra el asiento contable cuando se renueva CP gratis (10 bookings sin siniestros).
 *
 * TRATAMIENTO CONTABLE:
 * - Renovación gratuita = Similar a emisión inicial
 * - Se crea nuevo pasivo diferido
 * - Se debita de Resultados Acumulados (promoción/gasto)
 *
 * ASIENTO:
 * DEBE:  5103 Gastos Marketing/Promoción     $300
 * HABER: 2111 CP No Devengado                $300
 *
 * @param p_user_id - ID del usuario
 * @param p_amount_cents - Monto renovado en centavos
 * @param p_transaction_id - ID de la transacción wallet
 */
CREATE OR REPLACE FUNCTION account_protection_credit_renewal(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_transaction_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_amount_decimal DECIMAL(15, 2);
  v_entries JSONB;
  v_journal_id UUID;
BEGIN
  -- Convertir centavos a decimal (USD)
  v_amount_decimal := p_amount_cents / 100.0;

  -- Construir asiento contable
  v_entries := jsonb_build_array(
    jsonb_build_object(
      'account_code', '5103',  -- Gastos Marketing (EXPENSE)
      'debit', v_amount_decimal,
      'description', 'Costo de renovación gratuita CP (promoción)'
    ),
    jsonb_build_object(
      'account_code', '2111',  -- CP No Devengado (LIABILITY)
      'credit', v_amount_decimal,
      'description', 'Pasivo por CP renovado gratuitamente'
    )
  );

  -- Crear asiento contable
  v_journal_id := create_journal_entry(
    'PROTECTION_CREDIT_RENEWAL',
    p_transaction_id,
    'wallet_transactions',
    'Renovación gratuita CP $' || v_amount_decimal || ' USD - Usuario: ' || p_user_id::TEXT,
    v_entries
  );

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION account_protection_credit_renewal TO authenticated, service_role;

-- =====================================================
-- 7. MODIFICAR FUNCIONES EXISTENTES PARA INTEGRAR CONTABILIDAD
-- =====================================================

/**
 * MODIFICACIÓN: consume_protection_credit_for_claim
 *
 * Agregar llamada a contabilización después de consumir CP.
 */
CREATE OR REPLACE FUNCTION consume_protection_credit_for_claim(
  p_user_id UUID,
  p_claim_amount_cents BIGINT,
  p_booking_id UUID
)
RETURNS TABLE(
  cp_used_cents BIGINT,
  wr_used_cents BIGINT,
  remaining_claim_cents BIGINT
) AS $$
DECLARE
  v_cp_available_cents BIGINT;
  v_wr_available_cents BIGINT;
  v_cp_to_use_cents BIGINT := 0;
  v_wr_to_use_cents BIGINT := 0;
  v_remaining_cents BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Validaciones
  IF p_claim_amount_cents <= 0 THEN
    RAISE EXCEPTION 'El monto del siniestro debe ser mayor a 0';
  END IF;

  -- Obtener balance de CP
  SELECT protection_credit_cents
  INTO v_cp_available_cents
  FROM user_wallets
  WHERE user_id = p_user_id
  AND (protection_credit_expires_at IS NULL OR protection_credit_expires_at > NOW());

  IF v_cp_available_cents IS NULL THEN
    v_cp_available_cents := 0;
  END IF;

  -- Obtener balance retirable (WR)
  SELECT available_balance_cents
  INTO v_wr_available_cents
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wr_available_cents IS NULL THEN
    v_wr_available_cents := 0;
  END IF;

  -- WATERFALL LOGIC: CP → WR → External

  -- 1. Usar CP primero (no retirable)
  v_cp_to_use_cents := LEAST(v_cp_available_cents, p_claim_amount_cents);
  v_remaining_cents := p_claim_amount_cents - v_cp_to_use_cents;

  -- 2. Usar WR si queda saldo por cubrir
  IF v_remaining_cents > 0 THEN
    v_wr_to_use_cents := LEAST(v_wr_available_cents, v_remaining_cents);
    v_remaining_cents := v_remaining_cents - v_wr_to_use_cents;
  END IF;

  -- 3. Actualizar wallet: Descontar CP usado
  IF v_cp_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET protection_credit_cents = protection_credit_cents - v_cp_to_use_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Registrar transacción CP
    INSERT INTO wallet_transactions (
      id, user_id, transaction_type, amount_cents, currency,
      status, reference_id, reference_type, notes,
      is_protection_credit, protection_credit_reference_type
    ) VALUES (
      gen_random_uuid(), p_user_id, 'DEBIT', -v_cp_to_use_cents, 'USD',
      'COMPLETED', p_booking_id, 'CLAIM', 'Consumo CP para siniestro',
      TRUE, 'CLAIM_PAYMENT'
    )
    RETURNING id INTO v_transaction_id;

    -- 🆕 CONTABILIZAR CONSUMO DE CP
    PERFORM account_protection_credit_consumption(
      p_user_id,
      v_cp_to_use_cents,
      p_booking_id,
      v_transaction_id
    );
  END IF;

  -- 4. Actualizar wallet: Descontar WR usado
  IF v_wr_to_use_cents > 0 THEN
    UPDATE user_wallets
    SET available_balance_cents = available_balance_cents - v_wr_to_use_cents,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Registrar transacción WR
    INSERT INTO wallet_transactions (
      id, user_id, transaction_type, amount_cents, currency,
      status, reference_id, reference_type, notes
    ) VALUES (
      gen_random_uuid(), p_user_id, 'DEBIT', -v_wr_to_use_cents, 'USD',
      'COMPLETED', p_booking_id, 'CLAIM', 'Consumo wallet para siniestro'
    );
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT v_cp_to_use_cents, v_wr_to_use_cents, v_remaining_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * MODIFICACIÓN: recognize_protection_credit_breakage
 *
 * Agregar llamada a contabilización cuando se reconoce breakage.
 */
CREATE OR REPLACE FUNCTION recognize_protection_credit_breakage(
  p_user_id UUID
)
RETURNS TABLE(
  breakage_amount_cents BIGINT,
  breakage_amount_usd DECIMAL(15, 2)
) AS $$
DECLARE
  v_expired_cents BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Obtener CP expirado
  SELECT protection_credit_cents
  INTO v_expired_cents
  FROM user_wallets
  WHERE user_id = p_user_id
  AND protection_credit_expires_at < NOW()
  AND protection_credit_cents > 0;

  IF v_expired_cents IS NULL OR v_expired_cents <= 0 THEN
    -- No hay breakage
    RETURN QUERY SELECT 0::BIGINT, 0::DECIMAL(15, 2);
    RETURN;
  END IF;

  -- Resetear CP en wallet
  UPDATE user_wallets
  SET protection_credit_cents = 0,
      protection_credit_issued_at = NULL,
      protection_credit_expires_at = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción de breakage
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'DEBIT', -v_expired_cents, 'USD',
    'COMPLETED', 'BREAKAGE', 'CP expirado sin uso',
    TRUE, 'BREAKAGE'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR BREAKAGE
  PERFORM account_protection_credit_breakage(
    p_user_id,
    v_expired_cents,
    'EXPIRATION',
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT v_expired_cents, (v_expired_cents / 100.0)::DECIMAL(15, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * MODIFICACIÓN: issue_protection_credit
 *
 * Agregar llamada a contabilización cuando se emite CP.
 */
CREATE OR REPLACE FUNCTION issue_protection_credit(
  p_user_id UUID,
  p_amount_cents BIGINT DEFAULT 30000,  -- $300 USD
  p_validity_days INT DEFAULT 365
)
RETURNS TABLE(
  issued_amount_cents BIGINT,
  issued_amount_usd DECIMAL(15, 2),
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_wallet_exists BOOLEAN;
  v_expiry_date TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  -- Validar monto
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'El monto de CP debe ser mayor a 0';
  END IF;

  -- Calcular fecha de expiración
  v_expiry_date := NOW() + (p_validity_days || ' days')::INTERVAL;

  -- Verificar si existe wallet
  SELECT EXISTS(SELECT 1 FROM user_wallets WHERE user_id = p_user_id)
  INTO v_wallet_exists;

  IF NOT v_wallet_exists THEN
    -- Crear wallet si no existe
    INSERT INTO user_wallets (
      user_id, available_balance_cents, currency,
      protection_credit_cents, protection_credit_currency,
      protection_credit_issued_at, protection_credit_expires_at
    ) VALUES (
      p_user_id, 0, 'USD',
      p_amount_cents, 'USD',
      NOW(), v_expiry_date
    );
  ELSE
    -- Actualizar wallet existente
    UPDATE user_wallets
    SET protection_credit_cents = protection_credit_cents + p_amount_cents,
        protection_credit_currency = 'USD',
        protection_credit_issued_at = NOW(),
        protection_credit_expires_at = v_expiry_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'CREDIT', p_amount_cents, 'USD',
    'COMPLETED', 'ISSUANCE', 'Emisión de Crédito de Protección',
    TRUE, 'ISSUANCE'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR EMISIÓN DE CP
  PERFORM account_protection_credit_issuance(
    p_user_id,
    p_amount_cents,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT p_amount_cents, (p_amount_cents / 100.0)::DECIMAL(15, 2), v_expiry_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * MODIFICACIÓN: extend_protection_credit_for_good_history
 *
 * Agregar llamada a contabilización cuando se renueva CP gratis.
 */
CREATE OR REPLACE FUNCTION extend_protection_credit_for_good_history(
  p_user_id UUID
)
RETURNS TABLE(
  renewed_amount_cents BIGINT,
  renewed_amount_usd DECIMAL(15, 2),
  new_expires_at TIMESTAMPTZ,
  eligible BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_bookings_count INT;
  v_claims_count INT;
  v_renewal_amount_cents BIGINT := 30000;  -- $300 USD
  v_new_expiry TIMESTAMPTZ;
  v_transaction_id UUID;
BEGIN
  -- Verificar elegibilidad: ≥10 bookings sin siniestros
  SELECT COUNT(*) INTO v_bookings_count
  FROM bookings
  WHERE renter_id = p_user_id
  AND status = 'COMPLETED';

  SELECT COUNT(*) INTO v_claims_count
  FROM booking_claims
  WHERE booking_id IN (
    SELECT id FROM bookings WHERE renter_id = p_user_id
  )
  AND with_fault = TRUE;

  -- Validar elegibilidad
  IF v_bookings_count < 10 THEN
    RETURN QUERY SELECT
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Necesitas al menos 10 bookings completados';
    RETURN;
  END IF;

  IF v_claims_count > 0 THEN
    RETURN QUERY SELECT
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Tienes siniestros con responsabilidad';
    RETURN;
  END IF;

  -- Usuario es elegible: renovar CP
  v_new_expiry := NOW() + INTERVAL '1 year';

  -- Actualizar wallet
  UPDATE user_wallets
  SET protection_credit_cents = protection_credit_cents + v_renewal_amount_cents,
      protection_credit_issued_at = NOW(),
      protection_credit_expires_at = v_new_expiry,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_type, notes,
    is_protection_credit, protection_credit_reference_type
  ) VALUES (
    gen_random_uuid(), p_user_id, 'CREDIT', v_renewal_amount_cents, 'USD',
    'COMPLETED', 'RENEWAL', 'Renovación gratuita CP por buen historial',
    TRUE, 'RENEWAL'
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR RENOVACIÓN DE CP
  PERFORM account_protection_credit_renewal(
    p_user_id,
    v_renewal_amount_cents,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT
    v_renewal_amount_cents,
    (v_renewal_amount_cents / 100.0)::DECIMAL(15, 2),
    v_new_expiry,
    TRUE,
    'CP renovado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * MODIFICACIÓN: purchase_bonus_protector
 *
 * Agregar llamada a contabilización cuando se compra Protector Bonus.
 */
CREATE OR REPLACE FUNCTION purchase_bonus_protector(
  p_user_id UUID,
  p_protection_level INT
)
RETURNS TABLE(
  addon_id UUID,
  price_paid_cents BIGINT,
  price_paid_usd DECIMAL(15, 2),
  expires_at TIMESTAMPTZ,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_addon_id UUID;
  v_price_cents BIGINT;
  v_wallet_balance BIGINT;
  v_expiry_date TIMESTAMPTZ;
  v_existing_addon_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Validar nivel de protección
  IF p_protection_level NOT IN (1, 2, 3) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Nivel de protección inválido (debe ser 1, 2 o 3)'::TEXT;
    RETURN;
  END IF;

  -- Obtener precio según nivel
  v_price_cents := CASE p_protection_level
    WHEN 1 THEN 1500   -- $15 USD
    WHEN 2 THEN 2500   -- $25 USD
    WHEN 3 THEN 4000   -- $40 USD
  END;

  -- Verificar balance en wallet
  SELECT available_balance_cents INTO v_wallet_balance
  FROM user_wallets
  WHERE user_id = p_user_id;

  IF v_wallet_balance IS NULL OR v_wallet_balance < v_price_cents THEN
    RETURN QUERY SELECT
      NULL::UUID,
      v_price_cents,
      (v_price_cents / 100.0)::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Fondos insuficientes en wallet'::TEXT;
    RETURN;
  END IF;

  -- Verificar que no tenga protector activo
  SELECT id INTO v_existing_addon_id
  FROM driver_protection_addons
  WHERE user_id = p_user_id
  AND addon_type = 'BONUS_PROTECTOR'
  AND status = 'ACTIVE'
  AND expires_at > NOW();

  IF v_existing_addon_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_existing_addon_id,
      0::BIGINT,
      0::DECIMAL(15, 2),
      NULL::TIMESTAMPTZ,
      FALSE,
      'Ya tienes un Protector Bonus activo'::TEXT;
    RETURN;
  END IF;

  -- Calcular expiración (1 año)
  v_expiry_date := NOW() + INTERVAL '1 year';

  -- Crear add-on
  INSERT INTO driver_protection_addons (
    id, user_id, addon_type, protection_level,
    price_paid_cents, currency, status,
    purchased_at, expires_at
  ) VALUES (
    gen_random_uuid(), p_user_id, 'BONUS_PROTECTOR', p_protection_level,
    v_price_cents, 'USD', 'ACTIVE',
    NOW(), v_expiry_date
  )
  RETURNING id INTO v_addon_id;

  -- Descontar de wallet
  UPDATE user_wallets
  SET available_balance_cents = available_balance_cents - v_price_cents,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO wallet_transactions (
    id, user_id, transaction_type, amount_cents, currency,
    status, reference_id, reference_type, notes
  ) VALUES (
    gen_random_uuid(), p_user_id, 'DEBIT', -v_price_cents, 'USD',
    'COMPLETED', v_addon_id, 'ADDON_PURCHASE', 'Compra de Protector Bonus Nivel ' || p_protection_level
  )
  RETURNING id INTO v_transaction_id;

  -- 🆕 CONTABILIZAR VENTA DE PROTECTOR BONUS
  PERFORM account_bonus_protector_sale(
    p_user_id,
    v_price_cents,
    p_protection_level,
    v_addon_id,
    v_transaction_id
  );

  -- Retornar resultado
  RETURN QUERY SELECT
    v_addon_id,
    v_price_cents,
    (v_price_cents / 100.0)::DECIMAL(15, 2),
    v_expiry_date,
    TRUE,
    'Protector Bonus comprado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. ÍNDICES PARA MEJORAR RENDIMIENTO DE CONSULTAS CONTABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_journal_entries_transaction_type
ON accounting_journal_entries(transaction_type, entry_date);

CREATE INDEX IF NOT EXISTS idx_journal_entries_reference
ON accounting_journal_entries(reference_table, reference_id);

CREATE INDEX IF NOT EXISTS idx_ledger_account_date
ON accounting_ledger(account_id, entry_date);

-- =====================================================
-- 9. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE accounting_accounts IS 'Plan de cuentas contable según NIIF';
COMMENT ON COLUMN accounting_accounts.code IS 'Código único de cuenta (ej: 2111)';
COMMENT ON COLUMN accounting_accounts.account_type IS 'Tipo: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE';

COMMENT ON TABLE accounting_journal_entries IS 'Libro diario - Asientos contables (partida doble)';
COMMENT ON COLUMN accounting_journal_entries.is_balanced IS 'Validación: total_debit = total_credit';

COMMENT ON TABLE accounting_ledger IS 'Libro mayor - Detalle de movimientos por cuenta';

COMMENT ON FUNCTION account_protection_credit_issuance IS 'Contabiliza emisión de CP como ingreso diferido (pasivo)';
COMMENT ON FUNCTION account_protection_credit_consumption IS 'Contabiliza consumo de CP como reconocimiento de ingreso';
COMMENT ON FUNCTION account_protection_credit_breakage IS 'Contabiliza CP no usado como breakage revenue';
COMMENT ON FUNCTION account_bonus_protector_sale IS 'Contabiliza venta de Protector Bonus como ingreso';
COMMENT ON FUNCTION account_protection_credit_renewal IS 'Contabiliza renovación gratuita de CP como gasto de marketing';

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================
