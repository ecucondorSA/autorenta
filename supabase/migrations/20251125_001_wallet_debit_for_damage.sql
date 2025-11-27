-- Wallet Debit for Damage Claims
-- ============================================================================
-- Función para debitar fondos del wallet de seguridad cuando hay un reclamo por daños
-- Esta función es parte del Payment Waterfall System
-- ============================================================================

-- Drop function if exists to recreate
DROP FUNCTION IF EXISTS public.wallet_debit_for_damage CASCADE;

CREATE OR REPLACE FUNCTION public.wallet_debit_for_damage(
  p_booking_id UUID,
  p_claim_id UUID,
  p_amount_usd DECIMAL,
  p_description TEXT DEFAULT 'Débito por daños - Reclamo de seguro'
)
RETURNS TABLE (
  success BOOLEAN,
  transaction_id UUID,
  debited_amount_usd DECIMAL,
  remaining_balance_usd DECIMAL,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_renter_id UUID;
  v_wallet_id UUID;
  v_security_deposit_amount DECIMAL;
  v_available_balance DECIMAL;
  v_amount_to_debit DECIMAL;
  v_transaction_id UUID;
  v_fx_rate DECIMAL;
BEGIN
  -- 1. Obtener el renter_id del booking
  SELECT renter_id INTO v_renter_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      0::DECIMAL AS remaining_balance_usd,
      'Booking no encontrado'::TEXT AS error_message;
    RETURN;
  END IF;

  -- 2. Obtener el wallet del renter
  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = v_renter_id
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      0::DECIMAL AS remaining_balance_usd,
      'Wallet no encontrado para el locatario'::TEXT AS error_message;
    RETURN;
  END IF;

  -- 3. Verificar el saldo del depósito de seguridad
  -- Primero verificar si hay fondos bloqueados para este booking
  SELECT COALESCE(SUM(
    CASE
      WHEN transaction_type = 'lock' AND status = 'completed' THEN amount_usd
      WHEN transaction_type = 'unlock' AND status = 'completed' THEN -amount_usd
      ELSE 0
    END
  ), 0) INTO v_security_deposit_amount
  FROM wallet_transactions
  WHERE wallet_id = v_wallet_id
    AND reference_id = p_booking_id
    AND reference_type = 'booking_security'
    AND status = 'completed';

  -- Si no hay depósito bloqueado específico, usar el saldo disponible
  IF v_security_deposit_amount <= 0 THEN
    SELECT available_balance INTO v_available_balance
    FROM wallets
    WHERE id = v_wallet_id;

    v_security_deposit_amount := v_available_balance;
  END IF;

  -- 4. Determinar el monto a debitar (no puede ser mayor al disponible)
  v_amount_to_debit := LEAST(p_amount_usd, v_security_deposit_amount);

  IF v_amount_to_debit <= 0 THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      v_security_deposit_amount AS remaining_balance_usd,
      'Fondos insuficientes en el depósito de seguridad'::TEXT AS error_message;
    RETURN;
  END IF;

  -- 5. Obtener el tipo de cambio actual (USD a moneda local)
  SELECT exchange_rate INTO v_fx_rate
  FROM fx_rates
  WHERE from_currency = 'USD'
    AND to_currency = (
      SELECT currency_code
      FROM users
      WHERE id = v_renter_id
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fx_rate IS NULL THEN
    v_fx_rate := 1; -- Default a 1:1 si no hay tipo de cambio
  END IF;

  -- 6. Crear la transacción de débito
  v_transaction_id := gen_random_uuid();

  INSERT INTO wallet_transactions (
    id,
    wallet_id,
    transaction_type,
    amount_usd,
    amount_local,
    exchange_rate,
    currency_code,
    description,
    reference_type,
    reference_id,
    claim_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_transaction_id,
    v_wallet_id,
    'damage_debit',
    v_amount_to_debit,
    v_amount_to_debit * v_fx_rate,
    v_fx_rate,
    (SELECT currency_code FROM users WHERE id = v_renter_id),
    p_description || ' - Claim: ' || p_claim_id::TEXT,
    'damage_claim',
    p_booking_id,
    p_claim_id,
    'completed',
    NOW(),
    NOW()
  );

  -- 7. Actualizar el balance del wallet
  UPDATE wallets
  SET
    available_balance = available_balance - v_amount_to_debit,
    total_balance = total_balance - v_amount_to_debit,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- 8. Si había fondos bloqueados específicos para este booking, desbloquearlos parcialmente
  IF EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE wallet_id = v_wallet_id
      AND reference_id = p_booking_id
      AND reference_type = 'booking_security'
      AND transaction_type = 'lock'
      AND status = 'completed'
  ) THEN
    -- Crear transacción de desbloqueo parcial
    INSERT INTO wallet_transactions (
      wallet_id,
      transaction_type,
      amount_usd,
      amount_local,
      exchange_rate,
      currency_code,
      description,
      reference_type,
      reference_id,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_wallet_id,
      'unlock',
      v_amount_to_debit,
      v_amount_to_debit * v_fx_rate,
      v_fx_rate,
      (SELECT currency_code FROM users WHERE id = v_renter_id),
      'Desbloqueo parcial por débito de daños',
      'booking_security',
      p_booking_id,
      'completed',
      NOW(),
      NOW()
    );

    -- Actualizar locked_balance
    UPDATE wallets
    SET
      locked_balance = GREATEST(0, locked_balance - v_amount_to_debit),
      updated_at = NOW()
    WHERE id = v_wallet_id;
  END IF;

  -- 9. Retornar resultado exitoso
  RETURN QUERY
  SELECT
    TRUE AS success,
    v_transaction_id AS transaction_id,
    v_amount_to_debit AS debited_amount_usd,
    (v_security_deposit_amount - v_amount_to_debit) AS remaining_balance_usd,
    NULL::TEXT AS error_message;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, hacer rollback y retornar el error
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS transaction_id,
      0::DECIMAL AS debited_amount_usd,
      v_security_deposit_amount AS remaining_balance_usd,
      SQLERRM::TEXT AS error_message;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.wallet_debit_for_damage TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.wallet_debit_for_damage IS
'Debita fondos del wallet de seguridad del locatario para cubrir daños.
Parte del sistema Payment Waterfall para procesamiento de reclamos.
Retorna el monto debitado y el balance restante.';

-- ============================================================================
-- Función para transferir fondos adicionales si el depósito no es suficiente
-- ============================================================================

DROP FUNCTION IF EXISTS public.wallet_request_topup CASCADE;

CREATE OR REPLACE FUNCTION public.wallet_request_topup(
  p_booking_id UUID,
  p_claim_id UUID,
  p_amount_needed_usd DECIMAL,
  p_description TEXT DEFAULT 'Fondos adicionales requeridos para cubrir daños'
)
RETURNS TABLE (
  success BOOLEAN,
  request_id UUID,
  amount_requested_usd DECIMAL,
  status TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_renter_id UUID;
  v_request_id UUID;
BEGIN
  -- 1. Obtener el renter_id del booking
  SELECT renter_id INTO v_renter_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_renter_id IS NULL THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS request_id,
      0::DECIMAL AS amount_requested_usd,
      'failed'::TEXT AS status,
      'Booking no encontrado'::TEXT AS error_message;
    RETURN;
  END IF;

  -- 2. Crear solicitud de top-up
  v_request_id := gen_random_uuid();

  INSERT INTO wallet_topup_requests (
    id,
    user_id,
    booking_id,
    claim_id,
    amount_requested_usd,
    description,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_request_id,
    v_renter_id,
    p_booking_id,
    p_claim_id,
    p_amount_needed_usd,
    p_description,
    'pending',
    NOW(),
    NOW()
  );

  -- 3. Crear notificación para el usuario
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    v_renter_id,
    'wallet_topup_required',
    'Fondos adicionales requeridos',
    format('Se requieren $%s USD adicionales para cubrir los daños del vehículo. Por favor, agregue fondos a su wallet.', p_amount_needed_usd),
    jsonb_build_object(
      'booking_id', p_booking_id,
      'claim_id', p_claim_id,
      'amount_usd', p_amount_needed_usd,
      'request_id', v_request_id
    ),
    NOW()
  );

  -- 4. Retornar resultado
  RETURN QUERY
  SELECT
    TRUE AS success,
    v_request_id AS request_id,
    p_amount_needed_usd AS amount_requested_usd,
    'pending'::TEXT AS status,
    NULL::TEXT AS error_message;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY
    SELECT
      FALSE AS success,
      NULL::UUID AS request_id,
      0::DECIMAL AS amount_requested_usd,
      'failed'::TEXT AS status,
      SQLERRM::TEXT AS error_message;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.wallet_request_topup TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.wallet_request_topup IS
'Crea una solicitud de top-up cuando el depósito de seguridad no es suficiente para cubrir los daños.
Notifica al usuario para que agregue fondos adicionales a su wallet.';

-- ============================================================================
-- Crear tabla para solicitudes de top-up si no existe
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  claim_id UUID,
  amount_requested_usd DECIMAL(10,2) NOT NULL,
  amount_received_usd DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_wallet_topup_requests_user_id ON wallet_topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_requests_booking_id ON wallet_topup_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_requests_status ON wallet_topup_requests(status);

-- Enable RLS
ALTER TABLE public.wallet_topup_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own topup requests"
  ON wallet_topup_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create topup requests"
  ON wallet_topup_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update topup requests"
  ON wallet_topup_requests FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- Add comment
COMMENT ON TABLE public.wallet_topup_requests IS
'Solicitudes de fondos adicionales cuando el depósito de seguridad no es suficiente para cubrir daños.';