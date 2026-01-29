-- ============================================================================
-- AUTORENTAR - BOOKING DETAIL & PAYMENT SYSTEM (ARGENTINA)
-- ============================================================================
-- Migration Date: 2025-10-24
-- Purpose: Implementar sistema completo de Detalle & Pago con:
--   - Tabla fx_rates para snapshots de tipo de cambio
--   - Extensión de payment_intents para preautorizaciones (holds)
--   - RLS policies para seguridad
--   - Funciones helper para validación
--   - Seed data inicial
-- ============================================================================

-- ============================================================================
-- 1. TABLA FX_RATES (TIPO DE CAMBIO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currencies
  from_currency TEXT NOT NULL CHECK (from_currency IN ('USD', 'ARS', 'COP', 'MXN')),
  to_currency TEXT NOT NULL CHECK (to_currency IN ('USD', 'ARS', 'COP', 'MXN')),

  -- Rate
  rate NUMERIC(12, 4) NOT NULL CHECK (rate > 0),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Source
  source TEXT DEFAULT 'manual', -- 'manual', 'api', 'automated'
  source_reference TEXT, -- Referencia al origen (API endpoint, etc.)

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ, -- Opcional: fecha de expiración explícita

  -- Constraints
  CONSTRAINT fx_rates_different_currencies CHECK (from_currency != to_currency),
  CONSTRAINT fx_rates_unique_pair_active UNIQUE (from_currency, to_currency, is_active, valid_from)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fx_rates_active ON public.fx_rates (is_active, from_currency, to_currency) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fx_rates_valid_from ON public.fx_rates (valid_from DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rates_created_at ON public.fx_rates (created_at DESC);

-- Comments
COMMENT ON TABLE public.fx_rates IS 'Snapshots de tipos de cambio para cálculos de reservas';
COMMENT ON COLUMN public.fx_rates.rate IS 'Tasa de cambio: 1 from_currency = rate to_currency';
COMMENT ON COLUMN public.fx_rates.is_active IS 'Solo debe haber 1 rate activo por par de monedas';
COMMENT ON COLUMN public.fx_rates.valid_from IS 'Fecha desde la cual este rate es válido';
COMMENT ON COLUMN public.fx_rates.valid_until IS 'Fecha hasta la cual este rate es válido (opcional)';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_fx_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fx_rates_updated_at
  BEFORE UPDATE ON public.fx_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_fx_rates_updated_at();

-- ============================================================================
-- 2. EXTENSIÓN DE PAYMENT_INTENTS PARA PREAUTORIZACIONES
-- ============================================================================

-- Agregar campos para manejar holds/preautorizaciones
ALTER TABLE public.payment_intents
ADD COLUMN IF NOT EXISTS capture BOOLEAN DEFAULT true,
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
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON public.payment_intents (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents (status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_idempotency_key ON public.payment_intents (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON public.payment_intents (expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.payment_intents.capture IS 'true = captura inmediata, false = preautorización (hold)';
COMMENT ON COLUMN public.payment_intents.authorized_at IS 'Fecha de autorización del hold';
COMMENT ON COLUMN public.payment_intents.captured_at IS 'Fecha de captura de fondos';
COMMENT ON COLUMN public.payment_intents.canceled_at IS 'Fecha de cancelación del hold';
COMMENT ON COLUMN public.payment_intents.amount_authorized_cents IS 'Monto autorizado (hold) en centavos';
COMMENT ON COLUMN public.payment_intents.amount_captured_cents IS 'Monto capturado real en centavos';
COMMENT ON COLUMN public.payment_intents.expires_at IS 'Fecha de expiración del hold (típicamente 7 días)';
COMMENT ON COLUMN public.payment_intents.idempotency_key IS 'Key para evitar duplicados';

-- ============================================================================
-- 3. EXTENSIÓN DE BOOKINGS PARA PAYMENT MODE
-- ============================================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('card', 'wallet')),
ADD COLUMN IF NOT EXISTS coverage_upgrade TEXT CHECK (coverage_upgrade IN ('standard', 'premium50', 'zero')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS authorized_payment_id UUID REFERENCES public.payment_intents(id),
ADD COLUMN IF NOT EXISTS wallet_lock_id UUID,
ADD COLUMN IF NOT EXISTS total_price_ars NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_mode ON public.bookings (payment_mode);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency_key ON public.bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.bookings.payment_mode IS 'Modalidad de pago: card (hold) o wallet (crédito seguridad)';
COMMENT ON COLUMN public.bookings.coverage_upgrade IS 'Upgrade de cobertura elegido';
COMMENT ON COLUMN public.bookings.authorized_payment_id IS 'ID del payment_intent autorizado (si card)';
COMMENT ON COLUMN public.bookings.wallet_lock_id IS 'ID del lock de wallet (si wallet)';
COMMENT ON COLUMN public.bookings.total_price_ars IS 'Precio total en ARS al momento de la reserva';

-- ============================================================================
-- 4. RLS POLICIES - FX_RATES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Todos pueden leer rates activos (necesario para cálculos públicos)
CREATE POLICY "fx_rates_select_active_public"
ON public.fx_rates
FOR SELECT
USING (is_active = true);

-- Policy: Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "fx_rates_insert_admin_only"
ON public.fx_rates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "fx_rates_update_admin_only"
ON public.fx_rates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "fx_rates_delete_admin_only"
ON public.fx_rates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================================================
-- 5. RLS POLICIES - PAYMENT_INTENTS (ACTUALIZADAS)
-- ============================================================================

-- Drop existing policies if any (to recreate)
DROP POLICY IF EXISTS "payment_intents_select_own" ON public.payment_intents;
DROP POLICY IF EXISTS "payment_intents_insert_own" ON public.payment_intents;
DROP POLICY IF EXISTS "payment_intents_update_own" ON public.payment_intents;

-- Policy: Usuarios pueden ver sus propios payment intents
CREATE POLICY "payment_intents_select_own"
ON public.payment_intents
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = payment_intents.booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- Policy: Usuarios pueden crear payment intents
CREATE POLICY "payment_intents_insert_own"
ON public.payment_intents
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_id
    AND bookings.user_id = auth.uid()
  )
);

-- Policy: Sistema puede actualizar (para webhooks)
-- Nota: Esta policy permite updates del sistema (service_role)
CREATE POLICY "payment_intents_update_system"
ON public.payment_intents
FOR UPDATE
USING (true) -- El sistema (service_role) puede actualizar
WITH CHECK (true);

-- ============================================================================
-- 6. FUNCIONES HELPER
-- ============================================================================

-- Función: Obtener FX rate actual para un par de monedas
CREATE OR REPLACE FUNCTION get_current_fx_rate(
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT rate INTO v_rate
  FROM public.fx_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No active FX rate found for % → %', p_from_currency, p_to_currency;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_fx_rate IS 'Obtiene el rate de cambio activo actual para un par de monedas';

-- Función: Validar si un FX rate necesita revalidación
CREATE OR REPLACE FUNCTION fx_rate_needs_revalidation(
  p_rate_timestamp TIMESTAMPTZ,
  p_max_age_days INTEGER DEFAULT 7,
  p_old_rate NUMERIC DEFAULT NULL,
  p_new_rate NUMERIC DEFAULT NULL,
  p_variation_threshold NUMERIC DEFAULT 0.10
)
RETURNS TABLE (
  needs_revalidation BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  -- Check 1: Time elapsed > max_age_days
  IF (now() - p_rate_timestamp) > (p_max_age_days || ' days')::INTERVAL THEN
    RETURN QUERY SELECT true, 'FX rate expired (>' || p_max_age_days || ' days)';
    RETURN;
  END IF;

  -- Check 2: Rate variation > threshold
  IF p_old_rate IS NOT NULL AND p_new_rate IS NOT NULL THEN
    IF ABS(p_new_rate - p_old_rate) / p_old_rate > p_variation_threshold THEN
      RETURN QUERY SELECT true, 'FX rate variation exceeded ' || (p_variation_threshold * 100)::TEXT || '%';
      RETURN;
    END IF;
  END IF;

  -- No revalidation needed
  RETURN QUERY SELECT false, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fx_rate_needs_revalidation IS 'Valida si un FX rate necesita revalidación por tiempo o variación';

-- Función: Marcar rate anterior como inactivo al insertar uno nuevo
CREATE OR REPLACE FUNCTION deactivate_previous_fx_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el nuevo rate es activo, desactivar el anterior
  IF NEW.is_active = true THEN
    UPDATE public.fx_rates
    SET is_active = false,
        updated_at = now()
    WHERE from_currency = NEW.from_currency
      AND to_currency = NEW.to_currency
      AND is_active = true
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deactivate_previous_fx_rate
  AFTER INSERT ON public.fx_rates
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION deactivate_previous_fx_rate();

COMMENT ON FUNCTION deactivate_previous_fx_rate IS 'Desactiva automáticamente el FX rate anterior cuando se inserta uno nuevo activo';

-- ============================================================================
-- 7. SEED DATA - FX RATES INICIALES
-- ============================================================================

-- Insertar rate inicial USD → ARS (Argentina)
INSERT INTO public.fx_rates (from_currency, to_currency, rate, is_active, source, metadata)
VALUES ('USD', 'ARS', 1000.00, true, 'manual', '{"note": "Rate inicial para MVP"}')
ON CONFLICT DO NOTHING;

-- Insertar rate inverso ARS → USD
INSERT INTO public.fx_rates (from_currency, to_currency, rate, is_active, source, metadata)
VALUES ('ARS', 'USD', 0.001, true, 'manual', '{"note": "Rate inverso calculado"}')
ON CONFLICT DO NOTHING;

-- Insertar rates para otros países (preparación futura)
INSERT INTO public.fx_rates (from_currency, to_currency, rate, is_active, source, metadata)
VALUES
  ('USD', 'COP', 4000.00, true, 'manual', '{"note": "Colombia - preparación"}'),
  ('USD', 'MXN', 18.00, true, 'manual', '{"note": "México - preparación"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. VIEWS ÚTILES
-- ============================================================================

-- View: FX rates actuales (solo activos)
CREATE OR REPLACE VIEW public.v_fx_rates_current AS
SELECT
  id,
  from_currency,
  to_currency,
  rate,
  created_at AS snapshot_timestamp,
  now() - created_at AS age,
  CASE
    WHEN (now() - created_at) > INTERVAL '7 days' THEN true
    ELSE false
  END AS is_expired,
  source,
  metadata
FROM public.fx_rates
WHERE is_active = true
ORDER BY from_currency, to_currency;

COMMENT ON VIEW public.v_fx_rates_current IS 'Vista de FX rates activos con información de edad y expiración';

-- View: Payment intents con información de booking
CREATE OR REPLACE VIEW public.v_payment_intents_detailed AS
SELECT
  pi.id,
  pi.booking_id,
  b.user_id,
  p.email AS user_email,
  p.full_name AS user_name,
  pi.amount,
  pi.currency,
  pi.status,
  pi.capture,
  pi.authorized_at,
  pi.captured_at,
  pi.canceled_at,
  pi.expires_at,
  pi.amount_authorized_cents,
  pi.amount_captured_cents,
  pi.payment_method_id,
  pi.card_last4,
  pi.created_at,
  -- Computed fields
  CASE
    WHEN pi.expires_at IS NOT NULL AND now() > pi.expires_at THEN true
    ELSE false
  END AS is_expired,
  CASE
    WHEN pi.capture = false THEN 'hold'
    WHEN pi.capture = true THEN 'capture'
  END AS intent_type
FROM public.payment_intents pi
LEFT JOIN public.bookings b ON pi.booking_id = b.id
LEFT JOIN public.profiles p ON b.user_id = p.id;

COMMENT ON VIEW public.v_payment_intents_detailed IS 'Vista detallada de payment intents con info de usuario';

-- ============================================================================
-- 9. GRANTS DE PERMISOS
-- ============================================================================

-- Grant SELECT en fx_rates para usuarios autenticados (necesario para la app)
GRANT SELECT ON public.fx_rates TO authenticated;
GRANT SELECT ON public.v_fx_rates_current TO authenticated;

-- Grant EXECUTE en funciones helper
GRANT EXECUTE ON FUNCTION get_current_fx_rate TO authenticated;
GRANT EXECUTE ON FUNCTION fx_rate_needs_revalidation TO authenticated;

-- ============================================================================
-- 10. VERIFICACIÓN DE INSTALACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
DECLARE
  v_fx_rates_count INTEGER;
  v_payment_intents_count INTEGER;
BEGIN
  -- Verificar fx_rates
  SELECT COUNT(*) INTO v_fx_rates_count FROM public.fx_rates WHERE is_active = true;
  RAISE NOTICE 'fx_rates activos: %', v_fx_rates_count;

  -- Verificar payment_intents con nuevas columnas
  SELECT COUNT(*) INTO v_payment_intents_count
  FROM information_schema.columns
  WHERE table_name = 'payment_intents' AND column_name = 'capture';

  IF v_payment_intents_count > 0 THEN
    RAISE NOTICE 'payment_intents: columna capture agregada correctamente';
  ELSE
    RAISE WARNING 'payment_intents: columna capture NO encontrada';
  END IF;

  RAISE NOTICE '✅ Migración booking_detail_payment_complete aplicada exitosamente';
END;
$$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
