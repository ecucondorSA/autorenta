-- ============================================
-- MIGRATION: Fix Non-Withdrawable Cash Deposits
-- Fecha: 2025-10-28
-- Descripción: Los depósitos en efectivo (Pago Fácil/Rapipago)
--              NO deben ser retirables a cuenta bancaria.
--              Quedan como créditos en la plataforma.
-- ============================================

BEGIN;

-- ============================================
-- 1. MEJORAR wallet_confirm_deposit
-- ============================================
-- Ahora actualiza non_withdrawable_floor correctamente
-- basándose en el monto real del depósito

CREATE OR REPLACE FUNCTION public.wallet_confirm_deposit(
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_transaction RECORD;
  v_new_balance NUMERIC(10, 2);
  v_is_withdrawable BOOLEAN;
  v_payment_type TEXT;
BEGIN
  -- Buscar la transacción de depósito
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND type = 'deposit'
    AND status = 'pending';

  -- Verificar que existe la transacción
  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción de depósito no encontrada o ya fue procesada' AS message,
      NULL::NUMERIC(10, 2) AS new_available_balance;
    RETURN;
  END IF;

  -- Determinar si es retirable según el tipo de pago
  -- Extraer payment_type_id del metadata
  v_payment_type := p_provider_metadata->>'payment_type_id';

  -- Pagos en efectivo (ticket) NO son retirables
  v_is_withdrawable := COALESCE(
    v_transaction.is_withdrawable AND (v_payment_type != 'ticket'),
    v_transaction.is_withdrawable,
    TRUE
  );

  -- Actualizar la transacción a 'completed'
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = COALESCE(provider_metadata, '{}'::jsonb) || p_provider_metadata || jsonb_build_object(
      'confirmed_at', NOW(),
      'is_cash_deposit', (v_payment_type = 'ticket')
    ),
    completed_at = NOW(),
    is_withdrawable = v_is_withdrawable  -- Actualizar flag
  WHERE id = p_transaction_id;

  -- Asegurar existencia del wallet
  INSERT INTO user_wallets (user_id, currency)
  VALUES (v_transaction.user_id, v_transaction.currency)
  ON CONFLICT (user_id) DO NOTHING;

  -- Si NO es retirable, incrementar non_withdrawable_floor
  IF NOT v_is_withdrawable THEN
    UPDATE user_wallets
    SET
      non_withdrawable_floor = non_withdrawable_floor + v_transaction.amount,
      updated_at = NOW()
    WHERE user_id = v_transaction.user_id;

    RAISE NOTICE 'Depósito en efectivo: $% agregados a non_withdrawable_floor', v_transaction.amount;
  END IF;

  -- Obtener nuevo balance
  SELECT available_balance INTO v_new_balance
  FROM wallet_get_balance();

  -- Mensaje personalizado según tipo de pago
  IF NOT v_is_withdrawable THEN
    RETURN QUERY SELECT
      TRUE AS success,
      FORMAT('Depósito en efectivo confirmado: $%s acreditados. Estos fondos solo pueden usarse para reservas en AutoRenta.', v_transaction.amount) AS message,
      v_new_balance AS new_available_balance;
  ELSE
    RETURN QUERY SELECT
      TRUE AS success,
      FORMAT('Depósito confirmado exitosamente: $%s acreditados a tu wallet', v_transaction.amount) AS message,
      v_new_balance AS new_available_balance;
  END IF;
END;
$function$;


-- ============================================
-- 2. ACTUALIZAR wallet_confirm_deposit_admin (usada por webhook)
-- ============================================

CREATE OR REPLACE FUNCTION public.wallet_confirm_deposit_admin(
  p_user_id UUID,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC,
  new_withdrawable_balance NUMERIC,
  new_total_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_transaction RECORD;
  v_available NUMERIC(10, 2);
  v_locked NUMERIC(10, 2);
  v_floor NUMERIC(10, 2);
  v_withdrawable NUMERIC(10, 2);
  v_existing_provider_tx_id TEXT;
  v_payment_amount NUMERIC;
  v_is_withdrawable BOOLEAN;
  v_payment_type TEXT;
BEGIN
  -- VALIDACIÓN: provider_transaction_id único
  IF p_provider_transaction_id IS NOT NULL AND p_provider_transaction_id != '' THEN
    SELECT provider_transaction_id INTO v_existing_provider_tx_id
    FROM wallet_transactions
    WHERE provider_transaction_id = p_provider_transaction_id
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_provider_tx_id IS NOT NULL THEN
      RETURN QUERY SELECT
        FALSE AS success,
        FORMAT('Payment ID %s ya fue procesado', p_provider_transaction_id) AS message,
        NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
      RETURN;
    END IF;
  END IF;

  -- Buscar transacción pending
  SELECT * INTO v_transaction
  FROM wallet_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending';

  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Transacción no encontrada o ya procesada' AS message,
      NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
    RETURN;
  END IF;

  -- VALIDACIÓN: Verificar monto si está en metadata
  IF p_provider_metadata ? 'transaction_amount' THEN
    v_payment_amount := (p_provider_metadata->>'transaction_amount')::NUMERIC;
    IF ABS(v_payment_amount - v_transaction.amount) > 0.01 THEN
      RETURN QUERY SELECT
        FALSE AS success,
        FORMAT('Monto no coincide: %s vs %s', v_payment_amount, v_transaction.amount) AS message,
        NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2), NULL::NUMERIC(10, 2);
      RETURN;
    END IF;
  END IF;

  -- ✅ NUEVO: Determinar si es retirable según tipo de pago
  v_payment_type := p_provider_metadata->>'payment_type_id';

  -- Pagos en efectivo (ticket) NO son retirables
  v_is_withdrawable := COALESCE(
    v_transaction.is_withdrawable AND (v_payment_type != 'ticket'),
    v_transaction.is_withdrawable,
    TRUE
  );

  -- Actualizar transacción
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = COALESCE(provider_metadata, '{}'::jsonb) || p_provider_metadata || jsonb_build_object(
      'confirmed_at', NOW(),
      'is_cash_deposit', (v_payment_type = 'ticket')
    ),
    completed_at = NOW(),
    is_withdrawable = v_is_withdrawable  -- ✅ Actualizar flag
  WHERE id = p_transaction_id;

  -- Asegurar existencia del wallet
  INSERT INTO user_wallets (user_id, currency)
  VALUES (p_user_id, v_transaction.currency)
  ON CONFLICT (user_id) DO NOTHING;

  -- ✅ NUEVO: Si NO es retirable, incrementar non_withdrawable_floor
  IF NOT v_is_withdrawable THEN
    UPDATE user_wallets
    SET
      non_withdrawable_floor = non_withdrawable_floor + v_transaction.amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Depósito en efectivo: $% agregados a non_withdrawable_floor', v_transaction.amount;
  END IF;

  -- Obtener balances actualizados
  SELECT
    available_balance,
    locked_balance,
    non_withdrawable_floor
  INTO v_available, v_locked, v_floor
  FROM user_wallets
  WHERE user_id = p_user_id;

  v_withdrawable := GREATEST(0, v_available - v_floor);

  -- Retornar éxito
  RETURN QUERY SELECT
    TRUE AS success,
    CASE
      WHEN NOT v_is_withdrawable THEN
        FORMAT('Depósito en efectivo confirmado: $%s. Estos fondos solo pueden usarse para reservas.', v_transaction.amount)
      ELSE
        FORMAT('Depósito confirmado: $%s acreditados', v_transaction.amount)
    END AS message,
    v_available AS new_available_balance,
    v_withdrawable AS new_withdrawable_balance,
    v_available + v_locked AS new_total_balance;
END;
$function$;


-- ============================================
-- 3. MEJORAR wallet_request_withdrawal
-- ============================================
-- Validar que no se intente retirar fondos no retirables

CREATE OR REPLACE FUNCTION public.wallet_request_withdrawal(
  p_bank_account_id UUID,
  p_amount NUMERIC,
  p_user_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  request_id UUID,
  fee_amount NUMERIC,
  net_amount NUMERIC,
  new_available_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_withdrawable_amount NUMERIC;
  v_fee_percent NUMERIC := 0.02;  -- 2% fee
  v_fee_amount NUMERIC;
  v_net_amount NUMERIC;
  v_request_id UUID;
  v_bank_account RECORD;
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE, 'Usuario no autenticado', NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Obtener wallet del usuario
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      FALSE, 'Wallet no encontrado', NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- ✅ VALIDACIÓN CRÍTICA: Calcular cuánto es realmente retirable
  -- available_balance - non_withdrawable_floor
  v_withdrawable_amount := GREATEST(0, v_wallet.available_balance - v_wallet.non_withdrawable_floor);

  -- Validar monto mínimo
  IF p_amount < 100 THEN
    RETURN QUERY SELECT
      FALSE,
      'El monto mínimo de retiro es $100',
      NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- ✅ VALIDACIÓN: Verificar fondos retirables suficientes
  IF p_amount > v_withdrawable_amount THEN
    RETURN QUERY SELECT
      FALSE,
      FORMAT(
        'Fondos insuficientes para retirar. Disponible para retiro: $%s (tienes $%s en créditos no retirables)',
        v_withdrawable_amount,
        v_wallet.non_withdrawable_floor
      ),
      NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Validar que hay fondos disponibles
  IF p_amount > v_wallet.available_balance THEN
    RETURN QUERY SELECT
      FALSE,
      FORMAT('Fondos insuficientes. Disponible: $%s', v_wallet.available_balance),
      NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Verificar cuenta bancaria
  SELECT * INTO v_bank_account
  FROM user_bank_accounts
  WHERE id = p_bank_account_id
    AND user_id = v_user_id
    AND is_active = TRUE;

  IF v_bank_account IS NULL THEN
    RETURN QUERY SELECT
      FALSE, 'Cuenta bancaria no encontrada o inactiva', NULL::UUID, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC;
    RETURN;
  END IF;

  -- Calcular fee y monto neto
  v_fee_amount := ROUND(p_amount * v_fee_percent, 2);
  v_net_amount := p_amount - v_fee_amount;

  -- Crear solicitud de retiro
  INSERT INTO wallet_withdrawal_requests (
    user_id,
    bank_account_id,
    amount,
    fee_amount,
    net_amount,
    status,
    user_notes
  ) VALUES (
    v_user_id,
    p_bank_account_id,
    p_amount,
    v_fee_amount,
    v_net_amount,
    'pending',
    p_user_notes
  ) RETURNING id INTO v_request_id;

  -- Bloquear fondos (de available a locked)
  UPDATE user_wallets
  SET
    available_balance = available_balance - p_amount,
    locked_balance = locked_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Crear transacción de retiro
  INSERT INTO wallet_transactions (
    user_id,
    type,
    status,
    amount,
    currency,
    reference_type,
    reference_id,
    description,
    is_withdrawable
  ) VALUES (
    v_user_id,
    'withdrawal',
    'pending',
    p_amount,
    v_wallet.currency,
    'withdrawal',
    v_request_id,
    FORMAT('Retiro a cuenta bancaria %s', v_bank_account.bank_name),
    FALSE  -- Los retiros no son "re-retirables"
  );

  -- Retornar éxito
  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Solicitud de retiro creada. Monto: $%s, Fee: $%s, Recibirás: $%s', p_amount, v_fee_amount, v_net_amount) AS message,
    v_request_id,
    v_fee_amount,
    v_net_amount,
    v_wallet.available_balance - p_amount AS new_available_balance;
END;
$function$;


-- ============================================
-- 3. FUNCIÓN HELPER: Obtener balance retirable
-- ============================================

CREATE OR REPLACE FUNCTION public.wallet_get_withdrawable_balance()
RETURNS TABLE(
  available_balance NUMERIC,
  non_withdrawable_floor NUMERIC,
  withdrawable_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    v_wallet.available_balance,
    v_wallet.non_withdrawable_floor,
    GREATEST(0, v_wallet.available_balance - v_wallet.non_withdrawable_floor) AS withdrawable_balance,
    v_wallet.locked_balance,
    v_wallet.available_balance + v_wallet.locked_balance AS total_balance;
END;
$function$;


-- ============================================
-- 4. ACTUALIZAR wallet_get_balance existente
-- ============================================
-- Agregar withdrawable_balance al output

CREATE OR REPLACE FUNCTION public.wallet_get_balance()
RETURNS TABLE(
  available_balance NUMERIC,
  transferable_balance NUMERIC,
  withdrawable_balance NUMERIC,
  protected_credit_balance NUMERIC,
  locked_balance NUMERIC,
  total_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_non_withdrawable NUMERIC;
  v_withdrawable NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'ARS'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = v_user_id;

  IF v_wallet IS NULL THEN
    RETURN QUERY SELECT
      0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'ARS'::TEXT;
    RETURN;
  END IF;

  -- Calcular balance retirable
  v_non_withdrawable := COALESCE(v_wallet.non_withdrawable_floor, 0);
  v_withdrawable := GREATEST(0, v_wallet.available_balance - v_non_withdrawable);

  RETURN QUERY SELECT
    v_wallet.available_balance,
    v_wallet.available_balance AS transferable_balance,  -- Por ahora igual
    v_withdrawable AS withdrawable_balance,              -- ✅ NUEVO
    v_non_withdrawable AS protected_credit_balance,
    v_wallet.locked_balance,
    v_wallet.available_balance + v_wallet.locked_balance AS total_balance,
    v_wallet.currency;
END;
$function$;


-- ============================================
-- 5. COMENTARIOS EN COLUMNAS
-- ============================================

COMMENT ON COLUMN user_wallets.non_withdrawable_floor IS
'Monto mínimo que NO se puede retirar a cuenta bancaria. Incluye: depósitos en efectivo, bonos, créditos promocionales.';

COMMENT ON COLUMN wallet_transactions.is_withdrawable IS
'FALSE para depósitos en efectivo (Pago Fácil/Rapipago) que solo pueden usarse en la plataforma.';


COMMIT;


-- ============================================
-- NOTAS DE MIGRACIÓN
-- ============================================
--
-- Esta migración implementa:
--
-- 1. Detección automática de pagos en efectivo (payment_type_id = 'ticket')
-- 2. Actualización de non_withdrawable_floor para depósitos en efectivo
-- 3. Validación en wallet_request_withdrawal para prevenir retiros de fondos no retirables
-- 4. Nueva función wallet_get_withdrawable_balance() para el frontend
-- 5. Actualización de wallet_get_balance() para incluir withdrawable_balance
--
-- IMPORTANTE: Los depósitos en efectivo quedan como créditos permanentes
-- en la plataforma. Pueden usarse para reservas pero NO para retirar.
--
-- Esto previene:
-- - Lavado de dinero (depositar efectivo → retirar a banco)
-- - Fraude (depositar efectivo robado → retirar)
-- - Abuso del sistema
--
-- Y fomenta:
-- - Uso recurrente de la plataforma
-- - Conversión de usuarios ocasionales en frecuentes
-- - Reducción de costos de transacción
--
-- ============================================
