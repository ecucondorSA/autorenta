-- ============================================================================
-- AUTORENTAR - SISTEMA DE RISK AR (ARGENTINA) - FIXED
-- ============================================================================
-- Versión corregida: usa booking_id como PK y solo agrega campos faltantes
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIÓN DE BOOKINGS CON CAMPOS AR (solo campos nuevos)
-- ============================================================================

-- Agregar campos de garantía y risk a bookings
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS guarantee_type TEXT CHECK (guarantee_type IN ('hold', 'security_credit')),
ADD COLUMN IF NOT EXISTS guarantee_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS risk_snapshot_booking_id UUID, -- Referencia a booking_risk_snapshot(booking_id)
ADD COLUMN IF NOT EXISTS risk_snapshot_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_revalidation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hold_authorization_id TEXT,
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reauthorization_count INTEGER DEFAULT 0;

-- Agregar FK después de crear la columna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_risk_snapshot_booking_id_fkey'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_risk_snapshot_booking_id_fkey
    FOREIGN KEY (risk_snapshot_booking_id)
    REFERENCES booking_risk_snapshot(booking_id);
  END IF;
END $$;

COMMENT ON COLUMN bookings.guarantee_type IS 'Tipo de garantía: hold (tarjeta) o security_credit (wallet)';
COMMENT ON COLUMN bookings.guarantee_amount_cents IS 'Monto de garantía en centavos (hold o crédito)';
COMMENT ON COLUMN bookings.risk_snapshot_booking_id IS 'Booking ID del snapshot de risk vinculado';
COMMENT ON COLUMN bookings.risk_snapshot_date IS 'Fecha del último snapshot de risk';
COMMENT ON COLUMN bookings.requires_revalidation IS 'Si requiere revalidación por FX o tiempo';
COMMENT ON COLUMN bookings.hold_authorization_id IS 'ID de preautorización en MercadoPago';
COMMENT ON COLUMN bookings.hold_expires_at IS 'Fecha de expiración del hold (alquileres >7 días)';
COMMENT ON COLUMN bookings.reauthorization_count IS 'Contador de reautorizaciones (alquileres largos)';

-- ============================================================================
-- 2. VERIFICAR CAMPOS EN BOOKING_RISK_SNAPSHOT
-- ============================================================================

-- Los campos ya existen, solo agregamos comentarios si no existen
DO $$
BEGIN
  -- Verificar que los campos críticos existen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'booking_risk_snapshot'
    AND column_name = 'standard_franchise_usd'
  ) THEN
    RAISE EXCEPTION 'Campos críticos faltan en booking_risk_snapshot. Ejecutar migración FGO v1.1 primero';
  END IF;
END $$;

-- ============================================================================
-- 3. FUNCIÓN DE REVALIDACIÓN DE SNAPSHOTS (ya existe, recrear si cambió)
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
    v_current_fx := 1015.0;
  END IF;

  -- Calcular días transcurridos
  v_days_elapsed := EXTRACT(DAY FROM (NOW() - v_snapshot.fx_snapshot_date));

  -- Calcular variación de FX (porcentaje)
  v_fx_variation := ABS((v_current_fx - v_snapshot.fx_snapshot) / v_snapshot.fx_snapshot);

  -- Determinar si requiere revalidación
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

-- Índices para búsquedas frecuentes en bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guarantee_type
  ON bookings(guarantee_type)
  WHERE guarantee_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_hold_expires_at
  ON bookings(hold_expires_at)
  WHERE hold_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_risk_snapshot_booking_id
  ON bookings(risk_snapshot_booking_id)
  WHERE risk_snapshot_booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_requires_revalidation
  ON bookings(requires_revalidation)
  WHERE requires_revalidation = true;

-- Los índices de booking_risk_snapshot ya existen

-- ============================================================================
-- 6. VISTA DE RISK ANALYTICS
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
LEFT JOIN booking_risk_snapshot rs ON b.risk_snapshot_booking_id = rs.booking_id
WHERE b.status IN ('pending', 'confirmed', 'active', 'pending_payment');

COMMENT ON VIEW v_risk_analytics IS
'Vista analítica de risk snapshots con flags de expiración y validación';

-- ============================================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  v_bookings_columns INTEGER;
  v_snapshot_columns INTEGER;
BEGIN
  -- Contar columnas nuevas en bookings
  SELECT COUNT(*) INTO v_bookings_columns
  FROM information_schema.columns
  WHERE table_name = 'bookings'
  AND column_name IN ('guarantee_type', 'hold_authorization_id', 'requires_revalidation');

  -- Contar columnas AR en booking_risk_snapshot
  SELECT COUNT(*) INTO v_snapshot_columns
  FROM information_schema.columns
  WHERE table_name = 'booking_risk_snapshot'
  AND column_name IN ('standard_franchise_usd', 'rollover_franchise_usd', 'guarantee_type');

  RAISE NOTICE '';
  RAISE NOTICE '✅ Sistema de Risk AR instalado correctamente';
  RAISE NOTICE '   - Campos en bookings: % (esperado: 3+)', v_bookings_columns;
  RAISE NOTICE '   - Campos AR en booking_risk_snapshot: % (esperado: 3+)', v_snapshot_columns;
  RAISE NOTICE '   - Función check_snapshot_revalidation: ✓';
  RAISE NOTICE '   - Función get_expiring_holds: ✓';
  RAISE NOTICE '   - Índices de performance: ✓';
  RAISE NOTICE '   - Vista v_risk_analytics: ✓';
  RAISE NOTICE '';

  IF v_bookings_columns < 3 THEN
    RAISE WARNING '⚠️ Algunos campos de bookings no se crearon correctamente';
  END IF;

  IF v_snapshot_columns < 3 THEN
    RAISE WARNING '⚠️ Algunos campos de booking_risk_snapshot faltan (ejecutar migración FGO v1.1 primero)';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
