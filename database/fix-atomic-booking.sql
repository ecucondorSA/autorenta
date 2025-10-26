-- =====================================================
-- FUNCIÓN RPC ATÓMICA: Crear Booking Completo
-- Soluciona el problema de "reservas fantasma"
-- =====================================================

CREATE OR REPLACE FUNCTION create_booking_atomic(
  p_car_id UUID,
  p_renter_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_total_amount NUMERIC,
  p_currency TEXT,
  p_payment_mode TEXT,
  p_coverage_upgrade TEXT,
  p_authorized_payment_id TEXT,
  p_wallet_lock_id UUID,
  -- Risk snapshot data
  p_risk_daily_price_usd NUMERIC,
  p_risk_security_deposit_usd NUMERIC,
  p_risk_vehicle_value_usd NUMERIC,
  p_risk_driver_age INTEGER,
  p_risk_coverage_type TEXT,
  p_risk_payment_mode TEXT,
  p_risk_total_usd NUMERIC,
  p_risk_total_ars NUMERIC,
  p_risk_exchange_rate NUMERIC
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  risk_snapshot_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_booking_id UUID;
  v_risk_snapshot_id UUID;
  v_owner_id UUID;
  v_available BOOLEAN;
BEGIN
  -- 1. Verificar disponibilidad del auto
  SELECT 
    user_id,
    NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.car_id = p_car_id
        AND b.status NOT IN ('cancelled', 'completed')
        AND (
          (p_start_date, p_end_date) OVERLAPS (b.start_date, b.end_date)
        )
    )
  INTO v_owner_id, v_available
  FROM cars
  WHERE id = p_car_id;

  IF NOT v_available THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'El vehículo no está disponible para las fechas seleccionadas';
    RETURN;
  END IF;

  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Vehículo no encontrado';
    RETURN;
  END IF;

  IF v_owner_id = p_renter_id THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'No puedes alquilar tu propio vehículo';
    RETURN;
  END IF;

  -- 2. Crear el booking (iniciar transacción implícita)
  INSERT INTO bookings (
    car_id,
    renter_id,
    owner_id,
    start_date,
    end_date,
    total_amount,
    currency,
    payment_mode,
    coverage_upgrade,
    authorized_payment_id,
    wallet_lock_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_car_id,
    p_renter_id,
    v_owner_id,
    p_start_date,
    p_end_date,
    p_total_amount,
    p_currency,
    p_payment_mode,
    p_coverage_upgrade,
    p_authorized_payment_id,
    p_wallet_lock_id,
    'pending',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  -- 3. Crear el risk snapshot
  INSERT INTO risk_snapshots (
    booking_id,
    daily_price_usd,
    security_deposit_usd,
    vehicle_value_usd,
    driver_age,
    coverage_type,
    payment_mode,
    total_usd,
    total_ars,
    exchange_rate,
    created_at
  ) VALUES (
    v_booking_id,
    p_risk_daily_price_usd,
    p_risk_security_deposit_usd,
    p_risk_vehicle_value_usd,
    p_risk_driver_age,
    p_risk_coverage_type,
    p_risk_payment_mode,
    p_risk_total_usd,
    p_risk_total_ars,
    p_risk_exchange_rate,
    NOW()
  )
  RETURNING id INTO v_risk_snapshot_id;

  -- 4. Actualizar booking con risk_snapshot_id
  UPDATE bookings
  SET 
    risk_snapshot_id = v_risk_snapshot_id,
    updated_at = NOW()
  WHERE id = v_booking_id;

  -- 5. Retornar resultado exitoso
  RETURN QUERY SELECT TRUE, v_booking_id, v_risk_snapshot_id, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    -- Si algo falla, PostgreSQL hace rollback automático
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION create_booking_atomic IS 
'Crea una reserva de forma atómica en una sola transacción.
Incluye validación de disponibilidad, creación del booking y risk snapshot.
Si cualquier paso falla, toda la operación se revierte automáticamente.
Esto evita "reservas fantasma" en la base de datos.';

-- =====================================================
-- PERMISOS
-- =====================================================

-- Solo usuarios autenticados pueden ejecutar esta función
REVOKE EXECUTE ON FUNCTION create_booking_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_booking_atomic TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la función existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'create_booking_atomic'
  AND routine_schema = 'public';
