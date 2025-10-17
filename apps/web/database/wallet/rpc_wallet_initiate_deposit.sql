-- =====================================================
-- RPC FUNCTION: wallet_initiate_deposit
-- DESCRIPCIÓN: Inicia un proceso de depósito en el wallet
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Drop function if exists
DROP FUNCTION IF EXISTS wallet_initiate_deposit(NUMERIC, TEXT, TEXT);

-- Crear función para iniciar depósito
CREATE OR REPLACE FUNCTION wallet_initiate_deposit(
  p_amount NUMERIC(10, 2),
  p_provider TEXT DEFAULT 'mercadopago',
  p_description TEXT DEFAULT 'Depósito a wallet'
)
RETURNS TABLE (
  transaction_id UUID,
  success BOOLEAN,
  message TEXT,
  payment_provider TEXT,
  payment_url TEXT,
  status TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_transaction_id UUID;
  v_payment_url TEXT;
BEGIN
  -- Obtener el user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar parámetros
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  IF p_amount < 10 THEN
    RAISE EXCEPTION 'El depósito mínimo es $10 USD';
  END IF;

  IF p_amount > 5000 THEN
    RAISE EXCEPTION 'El depósito máximo es $5,000 USD. Para montos mayores contacte a soporte';
  END IF;

  IF p_provider NOT IN ('mercadopago', 'stripe', 'bank_transfer') THEN
    RAISE EXCEPTION 'Proveedor de pago no soportado: %. Opciones válidas: mercadopago, stripe, bank_transfer', p_provider;
  END IF;

  -- Generar nuevo transaction_id
  v_transaction_id := gen_random_uuid();

  -- Crear transacción de depósito en estado 'pending'
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
    description,
    provider_metadata
  ) VALUES (
    v_transaction_id,
    v_user_id,
    'deposit',
    'pending',  -- Inicia como pending hasta que se confirme el pago
    p_amount,
    'USD',
    'deposit',
    v_transaction_id,  -- La referencia es a sí misma
    p_provider,
    p_description,
    jsonb_build_object(
      'initiated_at', NOW(),
      'user_id', v_user_id,
      'amount', p_amount,
      'provider', p_provider
    )
  );

  -- Generar URL de pago simulada (en producción, llamar a API del proveedor)
  -- TODO: Integrar con API real de Mercado Pago / Stripe
  v_payment_url := FORMAT(
    'https://checkout.%s.com/pay/%s?amount=%s',
    CASE
      WHEN p_provider = 'mercadopago' THEN 'mercadopago'
      WHEN p_provider = 'stripe' THEN 'stripe'
      ELSE 'bank'
    END,
    v_transaction_id,
    p_amount
  );

  -- Actualizar metadata con payment URL
  UPDATE wallet_transactions
  SET provider_metadata = provider_metadata || jsonb_build_object('payment_url', v_payment_url)
  WHERE id = v_transaction_id;

  -- Retornar resultado exitoso con información para el frontend
  RETURN QUERY SELECT
    v_transaction_id AS transaction_id,
    TRUE AS success,
    FORMAT('Depósito iniciado. Completa el pago para acreditar $%s a tu wallet', p_amount) AS message,
    p_provider AS payment_provider,
    v_payment_url AS payment_url,
    'pending'::TEXT AS status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANTS (permisos)
-- =====================================================

-- Cualquier usuario autenticado puede iniciar depósitos
GRANT EXECUTE ON FUNCTION wallet_initiate_deposit(NUMERIC, TEXT, TEXT) TO authenticated;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION wallet_initiate_deposit(NUMERIC, TEXT, TEXT) IS 'Inicia un proceso de depósito en el wallet del usuario (crea transacción pending y genera payment URL)';

-- =====================================================
-- FUNCIÓN AUXILIAR: Confirmar depósito (webhook)
-- =====================================================

DROP FUNCTION IF EXISTS wallet_confirm_deposit(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION wallet_confirm_deposit(
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_available_balance NUMERIC(10, 2)
) AS $$
DECLARE
  v_transaction RECORD;
  v_new_balance NUMERIC(10, 2);
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

  -- Actualizar la transacción a 'completed'
  UPDATE wallet_transactions
  SET
    status = 'completed',
    provider_transaction_id = p_provider_transaction_id,
    provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object('confirmed_at', NOW()),
    completed_at = NOW()
  WHERE id = p_transaction_id;

  -- Obtener nuevo balance
  SELECT available_balance INTO v_new_balance
  FROM wallet_get_balance();

  -- Retornar éxito
  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Depósito confirmado exitosamente: $%s acreditados a tu wallet', v_transaction.amount) AS message,
    v_new_balance AS new_available_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION wallet_confirm_deposit(UUID, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION wallet_confirm_deposit(UUID, TEXT, JSONB) IS 'Confirma un depósito pendiente (llamado por webhook del proveedor de pago)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Usuario inicia depósito de $100 con MercadoPago
SELECT * FROM wallet_initiate_deposit(
  100.00,                                         -- amount
  'mercadopago',                                  -- provider
  'Recarga de saldo para alquileres'             -- description (opcional)
);

-- Resultado esperado:
-- transaction_id                        | success | message                                                     | payment_provider | payment_url                                             | status
-- 123e4567-e89b-12d3-a456-426614174000 | true    | Depósito iniciado. Completa el pago para acreditar $100...  | mercadopago      | https://checkout.mercadopago.com/pay/123e4567...       | pending

-- 2. Webhook de MercadoPago confirma el pago (llamado por el sistema)
SELECT * FROM wallet_confirm_deposit(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- transaction_id
  'MP-12345678',                                  -- provider_transaction_id
  '{"payment_method": "credit_card", "card_last_4": "1234"}'::JSONB  -- metadata (opcional)
);

-- Resultado esperado:
-- success | message                                                       | new_available_balance
-- true    | Depósito confirmado exitosamente: $100 acreditados a tu wallet | 100.00

-- 3. Usuario verifica su nuevo balance
SELECT * FROM wallet_get_balance();

-- Resultado esperado:
-- available_balance | locked_balance | total_balance | currency
-- 100.00            | 0.00           | 100.00        | USD
*/
