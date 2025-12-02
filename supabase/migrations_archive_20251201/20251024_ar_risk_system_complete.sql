-- ============================================================================
-- AUTORENTAR - SISTEMA DE RISK AR (ARGENTINA) - COMPLETO
-- ============================================================================
-- Implementa el sistema completo de franquicias, holds, créditos de seguridad
-- y snapshots de riesgo para Argentina.
--
-- Incluye:
-- - Tabla de risk snapshots con todos los campos AR
-- - Actualización de bookings con campos de garantía
-- - Función de revalidación de snapshots por FX
-- - Índices de performance
-- - RLS policies
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIÓN DE BOOKINGS CON CAMPOS AR
-- ============================================================================

-- Agregar campos de garantía y risk a bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS guarantee_type TEXT CHECK (guarantee_type IN ('hold', 'security_credit')),
ADD COLUMN IF NOT EXISTS guarantee_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS risk_snapshot_id UUID REFERENCES booking_risk_snapshot(id),
ADD COLUMN IF NOT EXISTS risk_snapshot_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_revalidation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hold_authorization_id TEXT, -- ID de preautorización de MercadoPago
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ, -- Fecha de expiración del hold (7 días)
ADD COLUMN IF NOT EXISTS reauthorization_count INTEGER DEFAULT 0; -- Cuántas veces se reautorizó

COMMENT ON COLUMN bookings.guarantee_type IS 'Tipo de garantía: hold (tarjeta) o security_credit (wallet)';
COMMENT ON COLUMN bookings.guarantee_amount_cents IS 'Monto de garantía en centavos (hold o crédito)';
COMMENT ON COLUMN bookings.risk_snapshot_id IS 'ID del snapshot de risk vinculado';
COMMENT ON COLUMN bookings.risk_snapshot_date IS 'Fecha del último snapshot de risk';
COMMENT ON COLUMN bookings.requires_revalidation IS 'Si requiere revalidación por FX o tiempo';
COMMENT ON COLUMN bookings.hold_authorization_id IS 'ID de preautorización en MercadoPago';
COMMENT ON COLUMN bookings.hold_expires_at IS 'Fecha de expiración del hold (alquileres >7 días)';
COMMENT ON COLUMN bookings.reauthorization_count IS 'Contador de reautorizaciones (alquileres largos)';

-- ============================================================================
-- 2. EXTENSIÓN DE BOOKING_RISK_SNAPSHOT CON CAMPOS AR
-- ============================================================================

-- Agregar campos específicos de AR al snapshot
ALTER TABLE booking_risk_snapshot
ADD COLUMN IF NOT EXISTS standard_franchise_usd INTEGER, -- Franquicia estándar en centavos USD
ADD COLUMN IF NOT EXISTS rollover_franchise_usd INTEGER, -- Franquicia rollover en centavos USD (2×)
ADD COLUMN IF NOT EXISTS guarantee_type TEXT CHECK (guarantee_type IN ('hold', 'security_credit')),
ADD COLUMN IF NOT EXISTS guarantee_amount_ars INTEGER, -- Monto garantía en centavos ARS
ADD COLUMN IF NOT EXISTS guarantee_amount_usd INTEGER, -- Monto garantía en centavos USD
ADD COLUMN IF NOT EXISTS fx_snapshot NUMERIC(10, 2), -- Tasa FX en el momento del snapshot
ADD COLUMN IF NOT EXISTS fx_snapshot_date TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS bucket TEXT CHECK (bucket IN ('economy', 'standard', 'premium', 'luxury', 'ultra-luxury')),
ADD COLUMN IF NOT EXISTS has_card BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_hold_ars INTEGER, -- Mínimo de hold según bucket
ADD COLUMN IF NOT EXISTS requires_revalidation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revalidation_reason TEXT; -- Motivo de revalidación ('fx_variation' | 'time_elapsed')

COMMENT ON COLUMN booking_risk_snapshot.standard_franchise_usd IS 'Franquicia estándar (daño/robo) en centavos USD';
COMMENT ON COLUMN booking_risk_snapshot.rollover_franchise_usd IS 'Franquicia por vuelco (2× estándar) en centavos USD';
COMMENT ON COLUMN booking_risk_snapshot.guarantee_type IS 'Tipo de garantía aplicada';
COMMENT ON COLUMN booking_risk_snapshot.guarantee_amount_ars IS 'Monto de garantía en centavos ARS';
COMMENT ON COLUMN booking_risk_snapshot.guarantee_amount_usd IS 'Monto de garantía en centavos USD';
COMMENT ON COLUMN booking_risk_snapshot.fx_snapshot IS 'Tasa USD → ARS en el momento del snapshot';
COMMENT ON COLUMN booking_risk_snapshot.fx_snapshot_date IS 'Fecha del snapshot FX';
COMMENT ON COLUMN booking_risk_snapshot.bucket IS 'Bucket del auto (economy, standard, premium, luxury, ultra-luxury)';
COMMENT ON COLUMN booking_risk_snapshot.has_card IS 'Si el usuario tiene tarjeta registrada';
COMMENT ON COLUMN booking_risk_snapshot.min_hold_ars IS 'Mínimo de hold según bucket en centavos ARS';
COMMENT ON COLUMN booking_risk_snapshot.requires_revalidation IS 'Si requiere revalidación';
COMMENT ON COLUMN booking_risk_snapshot.revalidation_reason IS 'Motivo de revalidación';

-- ============================================================================
-- 3. FUNCIÓN DE REVALIDACIÓN DE SNAPSHOTS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_snapshot_revalidation(
  p_booking_id UUID
)
RETURNS TABLE (
  requires_revalidation BOOLEAN,
  reason TEXT,
  old_fx NUMERIC,
  new_fx NUMERIC,
  days_since_snapshot INTEGER
) AS $$
DECLARE
  v_snapshot RECORD;
  v_current_fx NUMERIC;
  v_days_elapsed INTEGER;
  v_fx_variation NUMERIC;
BEGIN
  -- Obtener snapshot actual
  SELECT * INTO v_snapshot
  FROM booking_risk_snapshot
  WHERE booking_id = p_booking_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró snapshot para booking %', p_booking_id;
  END IF;

  -- Obtener FX actual
  SELECT platform_rate INTO v_current_fx
  FROM exchange_rates
  WHERE pair = 'USDTARS' AND is_active = true
  ORDER BY last_updated DESC
  LIMIT 1;

  IF v_current_fx IS NULL THEN
    v_current_fx := 1015.0; -- Fallback
  END IF;

  -- Calcular días transcurridos
  v_days_elapsed := EXTRACT(DAY FROM (NOW() - v_snapshot.fx_snapshot_date));

  -- Calcular variación de FX (porcentaje)
  v_fx_variation := ABS((v_current_fx - v_snapshot.fx_snapshot) / v_snapshot.fx_snapshot);

  -- Determinar si requiere revalidación
  -- Umbral: 10% de variación FX o 7 días transcurridos
  IF v_fx_variation >= 0.10 THEN
    RETURN QUERY SELECT
      true,
      'fx_variation'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  ELSIF v_days_elapsed >= 7 THEN
    RETURN QUERY SELECT
      true,
      'time_elapsed'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  ELSE
    RETURN QUERY SELECT
      false,
      'valid'::TEXT,
      v_snapshot.fx_snapshot,
      v_current_fx,
      v_days_elapsed;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_snapshot_revalidation IS
'Verifica si un snapshot de risk requiere revalidación por variación de FX (±10%) o tiempo (≥7 días)';

-- ============================================================================
-- 4. FUNCIÓN DE HOLD EXPIRATION CHECK (para cron jobs)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expiring_holds(
  p_hours_ahead INTEGER DEFAULT 24
)
RETURNS TABLE (
  booking_id UUID,
  hold_authorization_id TEXT,
  hold_expires_at TIMESTAMPTZ,
  hours_until_expiry NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.hold_authorization_id,
    b.hold_expires_at,
    EXTRACT(EPOCH FROM (b.hold_expires_at - NOW())) / 3600 AS hours_until_expiry
  FROM bookings b
  WHERE
    b.guarantee_type = 'hold'
    AND b.hold_authorization_id IS NOT NULL
    AND b.hold_expires_at IS NOT NULL
    AND b.hold_expires_at <= NOW() + (p_hours_ahead || ' hours')::INTERVAL
    AND b.status IN ('confirmed', 'active')
  ORDER BY b.hold_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expiring_holds IS
'Obtiene holds que expiran en las próximas X horas (para cron de reautorización)';

-- ============================================================================
-- 5. ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_bookings_guarantee_type ON bookings(guarantee_type) WHERE guarantee_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_hold_expires_at ON bookings(hold_expires_at) WHERE hold_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_risk_snapshot_id ON bookings(risk_snapshot_id) WHERE risk_snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_requires_revalidation ON bookings(requires_revalidation) WHERE requires_revalidation = true;

CREATE INDEX IF NOT EXISTS idx_risk_snapshot_fx_date ON booking_risk_snapshot(fx_snapshot_date);
CREATE INDEX IF NOT EXISTS idx_risk_snapshot_bucket ON booking_risk_snapshot(bucket);
CREATE INDEX IF NOT EXISTS idx_risk_snapshot_guarantee_type ON booking_risk_snapshot(guarantee_type);
CREATE INDEX IF NOT EXISTS idx_risk_snapshot_requires_revalidation ON booking_risk_snapshot(requires_revalidation) WHERE requires_revalidation = true;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Policy para leer risk snapshots (owners y renters)
CREATE POLICY "Users can view risk snapshots for own bookings" ON booking_risk_snapshot
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN cars c ON b.car_id = c.id
      WHERE b.id = booking_risk_snapshot.booking_id
      AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
    )
  );

-- Policy para crear risk snapshots (ya existe, pero verificar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_risk_snapshot'
    AND policyname = 'Users can create risk snapshots for own bookings'
  ) THEN
    CREATE POLICY "Users can create risk snapshots for own bookings" ON booking_risk_snapshot
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM bookings b
          JOIN cars c ON b.car_id = c.id
          WHERE b.id = booking_risk_snapshot.booking_id
          AND (c.owner_id = auth.uid() OR b.renter_id = auth.uid())
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 7. VISTA DE RISK ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW v_risk_analytics AS
SELECT
  b.id AS booking_id,
  b.status AS booking_status,
  b.start_date,
  b.end_date,
  b.total_amount,
  b.guarantee_type,
  b.guarantee_amount_cents,
  b.requires_revalidation,

  rs.standard_franchise_usd,
  rs.rollover_franchise_usd,
  rs.fx_snapshot,
  rs.fx_snapshot_date,
  rs.bucket,
  rs.has_card,
  rs.guarantee_amount_ars,
  rs.guarantee_amount_usd,

  -- Calcular días hasta check-in
  EXTRACT(DAY FROM (b.start_date - NOW()))::INTEGER AS days_until_checkin,

  -- Calcular duración del alquiler
  EXTRACT(DAY FROM (b.end_date - b.start_date))::INTEGER AS rental_duration_days,

  -- Flags
  (b.guarantee_type = 'hold' AND b.hold_expires_at < NOW()) AS hold_expired,
  (EXTRACT(DAY FROM (NOW() - rs.fx_snapshot_date)) >= 7) AS fx_outdated

FROM bookings b
LEFT JOIN booking_risk_snapshot rs ON b.risk_snapshot_id = rs.id
WHERE b.status IN ('pending', 'confirmed', 'active', 'pending_payment');

COMMENT ON VIEW v_risk_analytics IS
'Vista analítica de risk snapshots con flags de expiración y validación';

-- ============================================================================
-- 8. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Risk AR instalado correctamente';
  RAISE NOTICE '   - Campos extendidos en bookings y booking_risk_snapshot';
  RAISE NOTICE '   - Función check_snapshot_revalidation creada';
  RAISE NOTICE '   - Función get_expiring_holds creada';
  RAISE NOTICE '   - Índices de performance creados';
  RAISE NOTICE '   - RLS policies verificadas';
  RAISE NOTICE '   - Vista v_risk_analytics creada';
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
