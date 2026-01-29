-- ============================================================================
-- AUTORENTAR - BOOKING DETAIL & PAYMENT - EXTENSIÓN DE PAYMENTS
-- ============================================================================
-- Migration Date: 2025-10-24
-- Purpose: Extender tabla payments existente para soportar preautorizaciones (holds)
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIÓN DE PAYMENTS PARA PREAUTORIZACIONES
-- ============================================================================

-- Agregar campos para manejar holds/preautorizaciones
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS is_hold BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS amount_authorized_cents BIGINT,
ADD COLUMN IF NOT EXISTS amount_captured_cents BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS card_last4 TEXT,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS description TEXT;

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_is_hold ON public.payments (is_hold) WHERE is_hold = true;
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON public.payments (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON public.payments (expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.payments.is_hold IS 'true = preautorización (hold), false = pago capturado';
COMMENT ON COLUMN public.payments.authorized_at IS 'Fecha de autorización del hold';
COMMENT ON COLUMN public.payments.captured_at IS 'Fecha de captura de fondos';
COMMENT ON COLUMN public.payments.canceled_at IS 'Fecha de cancelación del hold';
COMMENT ON COLUMN public.payments.amount_authorized_cents IS 'Monto autorizado (hold) en centavos';
COMMENT ON COLUMN public.payments.amount_captured_cents IS 'Monto capturado real en centavos';
COMMENT ON COLUMN public.payments.expires_at IS 'Fecha de expiración del hold (típicamente 7 días)';
COMMENT ON COLUMN public.payments.idempotency_key IS 'Key para evitar duplicados';
COMMENT ON COLUMN public.payments.user_id IS 'Usuario que creó el payment (puede ser diferente del renter)';

-- ============================================================================
-- 2. EXTENSIÓN DE BOOKINGS PARA PAYMENT MODE
-- ============================================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('card', 'wallet')),
ADD COLUMN IF NOT EXISTS coverage_upgrade TEXT CHECK (coverage_upgrade IN ('standard', 'premium50', 'zero')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS authorized_payment_id UUID REFERENCES public.payments(id),
ADD COLUMN IF NOT EXISTS wallet_lock_id UUID,
ADD COLUMN IF NOT EXISTS total_price_ars NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_mode ON public.bookings (payment_mode);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency_key ON public.bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_authorized_payment ON public.bookings (authorized_payment_id) WHERE authorized_payment_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.payment_mode IS 'Modalidad de pago: card (hold) o wallet (crédito seguridad)';
COMMENT ON COLUMN public.bookings.coverage_upgrade IS 'Upgrade de cobertura elegido';
COMMENT ON COLUMN public.bookings.authorized_payment_id IS 'ID del payment autorizado (hold, si card)';
COMMENT ON COLUMN public.bookings.wallet_lock_id IS 'ID del lock de wallet (si wallet)';
COMMENT ON COLUMN public.bookings.total_price_ars IS 'Precio total en ARS al momento de la reserva';

-- ============================================================================
-- 3. VIEW: PAYMENT AUTHORIZATIONS (HOLDS)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_payment_authorizations AS
SELECT
  p.id,
  p.booking_id,
  p.user_id,
  prof.email AS user_email,
  prof.full_name AS user_name,
  p.amount AS amount_usd,
  p.amount_authorized_cents,
  p.amount_captured_cents,
  p.currency,
  p.status,
  p.is_hold,
  p.authorized_at,
  p.captured_at,
  p.canceled_at,
  p.expires_at,
  p.payment_method_id,
  p.card_last4,
  p.created_at,
  p.idempotency_key,
  -- Computed fields
  CASE
    WHEN p.expires_at IS NOT NULL AND now() > p.expires_at THEN true
    ELSE false
  END AS is_expired,
  CASE
    WHEN p.authorized_at IS NOT NULL AND p.captured_at IS NULL AND p.canceled_at IS NULL THEN 'authorized'
    WHEN p.captured_at IS NOT NULL THEN 'captured'
    WHEN p.canceled_at IS NOT NULL THEN 'canceled'
    WHEN p.expires_at IS NOT NULL AND now() > p.expires_at THEN 'expired'
    ELSE 'pending'
  END AS authorization_status
FROM public.payments p
LEFT JOIN public.profiles prof ON p.user_id = prof.id
WHERE p.is_hold = true;

COMMENT ON VIEW public.v_payment_authorizations IS 'Vista de preautorizaciones (holds) con estado calculado';

GRANT SELECT ON public.v_payment_authorizations TO authenticated;

-- ============================================================================
-- 4. FUNCIÓN: CREAR PREAUTORIZACIÓN (HOLD)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_payment_authorization(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_currency TEXT DEFAULT 'ARS',
  p_description TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  payment_id UUID,
  authorized_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT
) AS $$
DECLARE
  v_payment_id UUID;
  v_authorized_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Validar que el usuario tenga permisos sobre el booking (si se proporciona)
  IF p_booking_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = p_booking_id
      AND (user_id = p_user_id OR renter_id = p_user_id)
    ) THEN
      RAISE EXCEPTION 'Usuario no autorizado para este booking';
    END IF;
  END IF;

  -- Calcular fechas
  v_authorized_at := now();
  v_expires_at := now() + INTERVAL '7 days';

  -- Insertar payment como hold
  INSERT INTO public.payments (
    user_id,
    booking_id,
    provider,
    status,
    amount,
    amount_authorized_cents,
    amount_captured_cents,
    currency,
    is_hold,
    authorized_at,
    expires_at,
    description,
    idempotency_key
  ) VALUES (
    p_user_id,
    p_booking_id,
    'mercadopago',
    'authorized',
    p_amount_cents / 100.0, -- Convertir a decimal
    p_amount_cents,
    0,
    p_currency,
    true,
    v_authorized_at,
    v_expires_at,
    COALESCE(p_description, 'Preautorización para reserva'),
    p_idempotency_key
  )
  RETURNING id INTO v_payment_id;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_payment_id,
    v_authorized_at,
    v_expires_at,
    'authorized'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_payment_authorization IS 'Crea una preautorización (hold) en la tabla payments';

GRANT EXECUTE ON FUNCTION create_payment_authorization TO authenticated;

-- ============================================================================
-- 5. FUNCIÓN: CAPTURAR FONDOS DE HOLD
-- ============================================================================

CREATE OR REPLACE FUNCTION capture_payment_authorization(
  p_payment_id UUID,
  p_amount_cents BIGINT
)
RETURNS TABLE (
  success BOOLEAN,
  captured_amount_cents BIGINT,
  captured_at TIMESTAMPTZ,
  message TEXT
) AS $$
DECLARE
  v_payment RECORD;
  v_captured_at TIMESTAMPTZ;
BEGIN
  -- Obtener payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  AND is_hold = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Payment no encontrado o no es un hold';
    RETURN;
  END IF;

  -- Validar que esté autorizado
  IF v_payment.status != 'authorized' THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Payment no está en estado authorized';
    RETURN;
  END IF;

  -- Validar que no esté expirado
  IF v_payment.expires_at IS NOT NULL AND now() > v_payment.expires_at THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ, 'Hold expirado';
    RETURN;
  END IF;

  -- Validar que el monto a capturar no exceda el autorizado
  IF p_amount_cents > v_payment.amount_authorized_cents THEN
    RETURN QUERY SELECT false, 0::BIGINT, NULL::TIMESTAMPTZ,
      'Monto a capturar excede monto autorizado';
    RETURN;
  END IF;

  v_captured_at := now();

  -- Actualizar payment
  UPDATE public.payments
  SET
    amount_captured_cents = p_amount_cents,
    captured_at = v_captured_at,
    status = 'captured'
  WHERE id = p_payment_id;

  RETURN QUERY SELECT true, p_amount_cents, v_captured_at, 'Captura exitosa'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION capture_payment_authorization IS 'Captura fondos de una preautorización (hold)';

GRANT EXECUTE ON FUNCTION capture_payment_authorization TO authenticated;

-- ============================================================================
-- 6. FUNCIÓN: CANCELAR HOLD
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_payment_authorization(
  p_payment_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  canceled_at TIMESTAMPTZ,
  message TEXT
) AS $$
DECLARE
  v_payment RECORD;
  v_canceled_at TIMESTAMPTZ;
BEGIN
  -- Obtener payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  AND is_hold = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'Payment no encontrado o no es un hold';
    RETURN;
  END IF;

  -- Validar que no esté ya capturado
  IF v_payment.captured_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 'No se puede cancelar un hold ya capturado';
    RETURN;
  END IF;

  v_canceled_at := now();

  -- Actualizar payment
  UPDATE public.payments
  SET
    canceled_at = v_canceled_at,
    status = 'canceled'
  WHERE id = p_payment_id;

  RETURN QUERY SELECT true, v_canceled_at, 'Hold cancelado exitosamente'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_payment_authorization IS 'Cancela una preautorización (hold) y libera los fondos';

GRANT EXECUTE ON FUNCTION cancel_payment_authorization TO authenticated;

-- ============================================================================
-- 7. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración booking_detail_payment_payments_extension aplicada exitosamente';
  RAISE NOTICE 'Columnas agregadas a payments: is_hold, authorized_at, expires_at, amount_authorized_cents, etc.';
  RAISE NOTICE 'Columnas agregadas a bookings: payment_mode, coverage_upgrade, authorized_payment_id, etc.';
  RAISE NOTICE 'Funciones creadas: create_payment_authorization, capture_payment_authorization, cancel_payment_authorization';
END;
$$;
