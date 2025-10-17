-- =====================================================
-- MIGRATION: Agregar campos de wallet a bookings
-- DESCRIPCIÓN: Agrega campos para tracking de wallet en reservas
-- AUTOR: Claude Code
-- FECHA: 2025-10-17
-- =====================================================

-- Agregar columnas de wallet a la tabla bookings
ALTER TABLE bookings
  -- Método de pago
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('credit_card', 'wallet', 'partial_wallet')),

  -- Monto pagado con wallet
  ADD COLUMN IF NOT EXISTS wallet_amount_cents BIGINT DEFAULT 0 CHECK (wallet_amount_cents >= 0),

  -- ID de transacción de bloqueo de fondos
  ADD COLUMN IF NOT EXISTS wallet_lock_transaction_id UUID REFERENCES wallet_transactions(id),

  -- Estado del wallet para esta reserva
  ADD COLUMN IF NOT EXISTS wallet_status TEXT DEFAULT 'none' CHECK (wallet_status IN ('none', 'locked', 'charged', 'refunded')),

  -- Timestamp de cargos/refunds de wallet
  ADD COLUMN IF NOT EXISTS wallet_charged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_refunded_at TIMESTAMPTZ;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para búsquedas por método de pago
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

-- Índice para búsquedas por wallet_status
CREATE INDEX IF NOT EXISTS idx_bookings_wallet_status ON bookings(wallet_status);

-- Índice para búsquedas por transacción de lock
CREATE INDEX IF NOT EXISTS idx_bookings_wallet_lock_tx ON bookings(wallet_lock_transaction_id);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON COLUMN bookings.payment_method IS 'Método de pago: credit_card (100% tarjeta), wallet (100% wallet), partial_wallet (mix)';
COMMENT ON COLUMN bookings.wallet_amount_cents IS 'Monto pagado con wallet en centavos';
COMMENT ON COLUMN bookings.wallet_lock_transaction_id IS 'ID de la transacción de bloqueo de fondos en wallet_transactions';
COMMENT ON COLUMN bookings.wallet_status IS 'Estado del wallet para esta reserva: none, locked, charged, refunded';
COMMENT ON COLUMN bookings.wallet_charged_at IS 'Timestamp cuando se cargaron los fondos del wallet';
COMMENT ON COLUMN bookings.wallet_refunded_at IS 'Timestamp cuando se reembolsaron los fondos al wallet';

-- =====================================================
-- DATOS DEFAULT PARA BOOKINGS EXISTENTES
-- =====================================================

-- Actualizar bookings existentes a payment_method = 'credit_card' (asumiendo todos eran con tarjeta antes)
UPDATE bookings
SET
  payment_method = 'credit_card',
  wallet_amount_cents = 0,
  wallet_status = 'none'
WHERE payment_method IS NULL;

-- =====================================================
-- VALIDACIONES ADICIONALES
-- =====================================================

-- Trigger para validar consistencia de wallet_amount_cents
CREATE OR REPLACE FUNCTION validate_booking_wallet_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Si payment_method es 'credit_card', wallet_amount debe ser 0
  IF NEW.payment_method = 'credit_card' AND NEW.wallet_amount_cents != 0 THEN
    RAISE EXCEPTION 'Booking con payment_method=credit_card debe tener wallet_amount_cents=0';
  END IF;

  -- Si payment_method es 'wallet', wallet_amount debe ser igual a total_cents
  IF NEW.payment_method = 'wallet' AND NEW.wallet_amount_cents != NEW.total_cents THEN
    RAISE EXCEPTION 'Booking con payment_method=wallet debe tener wallet_amount_cents=total_cents';
  END IF;

  -- Si payment_method es 'partial_wallet', wallet_amount debe ser > 0 y < total_cents
  IF NEW.payment_method = 'partial_wallet' AND (NEW.wallet_amount_cents <= 0 OR NEW.wallet_amount_cents >= NEW.total_cents) THEN
    RAISE EXCEPTION 'Booking con payment_method=partial_wallet debe tener 0 < wallet_amount_cents < total_cents';
  END IF;

  -- Si wallet_status es 'locked', debe tener wallet_lock_transaction_id
  IF NEW.wallet_status IN ('locked', 'charged', 'refunded') AND NEW.wallet_lock_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Booking con wallet_status=% debe tener wallet_lock_transaction_id', NEW.wallet_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_booking_wallet_amounts
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_wallet_amounts();

-- =====================================================
-- FUNCIÓN HELPER: Cargar fondos de wallet a booking
-- =====================================================

CREATE OR REPLACE FUNCTION booking_charge_wallet_funds(
  p_booking_id UUID,
  p_description TEXT DEFAULT 'Pago de reserva con wallet'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_booking RECORD;
  v_user_id UUID;
BEGIN
  -- Obtener la reserva
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking IS NULL THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Reserva no encontrada' AS message;
    RETURN;
  END IF;

  -- Validar que la reserva use wallet
  IF v_booking.payment_method NOT IN ('wallet', 'partial_wallet') THEN
    RETURN QUERY SELECT
      FALSE AS success,
      'Esta reserva no usa wallet como método de pago' AS message;
    RETURN;
  END IF;

  -- Validar que los fondos estén bloqueados
  IF v_booking.wallet_status != 'locked' THEN
    RETURN QUERY SELECT
      FALSE AS success,
      FORMAT('Los fondos no están bloqueados. Estado actual: %s', v_booking.wallet_status) AS message;
    RETURN;
  END IF;

  -- Obtener el user_id del renter
  v_user_id := v_booking.renter_id;

  -- Crear transacción de cargo
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
    description
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'charge',
    'completed',
    (v_booking.wallet_amount_cents::NUMERIC / 100),  -- Convertir centavos a dólares
    'USD',
    'booking',
    p_booking_id,
    'internal',
    p_description
  );

  -- Actualizar estado del booking
  UPDATE bookings
  SET
    wallet_status = 'charged',
    wallet_charged_at = NOW()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT
    TRUE AS success,
    FORMAT('Fondos cargados exitosamente: $%s', (v_booking.wallet_amount_cents::NUMERIC / 100)) AS message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION booking_charge_wallet_funds(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION booking_charge_wallet_funds(UUID, TEXT) IS 'Carga los fondos bloqueados del wallet a una reserva (convierte lock → charge)';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- 1. Ver bookings con uso de wallet
SELECT
  id,
  renter_id,
  total_cents,
  payment_method,
  wallet_amount_cents,
  wallet_status,
  wallet_charged_at
FROM bookings
WHERE payment_method IN ('wallet', 'partial_wallet');

-- 2. Cargar fondos de wallet a una reserva después de que se confirme
SELECT * FROM booking_charge_wallet_funds(
  'a6de0b79-0c9f-4b89-9e15-e2c82f4915e4'::UUID,  -- booking_id
  'Pago confirmado de reserva Toyota Corolla'    -- description
);
*/
