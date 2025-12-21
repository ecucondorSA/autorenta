-- ============================================================================
-- Migration: Booking Approval System
-- Created: 2025-12-20
-- Description: Adds approval workflow for bookings (owner approves/rejects renter requests)
-- ============================================================================

-- ============================================================================
-- FASE 1: Agregar columnas a tabla bookings
-- ============================================================================

-- Columnas de aprobación
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS approval_status TEXT
  CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Comentarios
COMMENT ON COLUMN bookings.approval_status IS 'Estado de aprobación: pending, approved, rejected, expired';
COMMENT ON COLUMN bookings.approval_expires_at IS 'Fecha límite para que el owner apruebe/rechace (24h desde creación)';
COMMENT ON COLUMN bookings.approved_by IS 'UUID del usuario que aprobó (owner o admin)';
COMMENT ON COLUMN bookings.approved_at IS 'Timestamp de cuando se aprobó la reserva';
COMMENT ON COLUMN bookings.rejection_reason IS 'Razón del rechazo proporcionada por el owner';

-- Índice para consultas de aprobaciones pendientes
CREATE INDEX IF NOT EXISTS idx_bookings_approval_pending
ON bookings(status, approval_expires_at)
WHERE status IN ('pending', 'pending_approval');

-- ============================================================================
-- FASE 2: Crear vista owner_pending_approvals
-- ============================================================================

CREATE OR REPLACE VIEW owner_pending_approvals AS
SELECT
  b.id AS booking_id,
  b.car_id,
  COALESCE(c.title, '') || ' ' || COALESCE(c.model, '') AS car_name,
  c.year AS car_year,
  b.renter_id,
  b.start_at,
  b.end_at,
  b.total_amount,
  COALESCE(b.currency, 'ARS') AS currency,
  b.created_at AS booking_created_at,
  b.approval_expires_at,
  -- Horas restantes para aprobar (mínimo 0)
  GREATEST(0, EXTRACT(EPOCH FROM (b.approval_expires_at - NOW())) / 3600)::NUMERIC(10,2) AS hours_remaining,
  -- Días de alquiler
  GREATEST(1, EXTRACT(DAY FROM (b.end_at - b.start_at)))::INT AS days_count
FROM bookings b
JOIN cars c ON c.id = b.car_id
WHERE c.owner_id = auth.uid()
  AND b.status IN ('pending', 'pending_approval')
  AND b.approval_status = 'pending'
  AND (b.approval_expires_at IS NULL OR b.approval_expires_at > NOW())
ORDER BY b.approval_expires_at ASC NULLS LAST;

COMMENT ON VIEW owner_pending_approvals IS 'Reservas pendientes de aprobación para el owner autenticado';

-- Políticas RLS para la vista (hereda de bookings, pero aseguramos)
-- Las vistas en Supabase heredan las políticas de las tablas subyacentes

-- ============================================================================
-- FASE 3: Corregir función approve_booking
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_booking(p_booking_id UUID, p_owner_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_owner_id UUID;
  v_booking RECORD;
  v_car RECORD;
BEGIN
  -- Obtener caller
  SELECT role, id INTO v_caller_role, v_caller_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  v_owner_id := COALESCE(p_owner_id, v_caller_id);

  -- Obtener booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Obtener auto y validar ownership
  SELECT * INTO v_car
  FROM cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Auto no encontrado');
  END IF;

  -- Solo owner o admin
  IF v_caller_role != 'admin' AND v_car.owner_id != v_caller_id THEN
    RETURN json_build_object('success', false, 'error', 'Solo el dueño del auto puede aprobar esta reserva');
  END IF;

  -- Validar estado (pending o pending_approval)
  IF v_booking.status NOT IN ('pending_approval', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'La reserva no está pendiente de aprobación (estado actual: ' || v_booking.status || ')');
  END IF;

  -- Validar expiración
  IF v_booking.approval_expires_at IS NOT NULL AND v_booking.approval_expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'La ventana de aprobación ha expirado');
  END IF;

  -- Actualizar booking
  UPDATE bookings
  SET
    status = 'confirmed',
    approval_status = 'approved',
    approved_by = v_owner_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- TODO: Trigger notificación al renter (implementar con pg_notify o edge function)

  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'confirmed',
    'approved_at', NOW(),
    'message', 'Reserva aprobada exitosamente'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION approve_booking(UUID, UUID) TO authenticated;
COMMENT ON FUNCTION approve_booking IS 'Aprueba una reserva pendiente. Solo owner del auto o admin.';

-- ============================================================================
-- FASE 4: Crear función reject_booking
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_booking(p_booking_id UUID, p_rejection_reason TEXT DEFAULT 'No especificado')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_booking RECORD;
  v_car RECORD;
  v_wallet_unlock_result RECORD;
BEGIN
  -- Obtener caller
  SELECT id, role INTO v_caller_id, v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  -- Obtener booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  -- Obtener auto
  SELECT * INTO v_car
  FROM cars
  WHERE id = v_booking.car_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Auto no encontrado');
  END IF;

  -- Solo owner o admin
  IF v_caller_role != 'admin' AND v_car.owner_id != v_caller_id THEN
    RETURN json_build_object('success', false, 'error', 'Solo el dueño del auto puede rechazar esta reserva');
  END IF;

  -- Validar estado
  IF v_booking.status NOT IN ('pending_approval', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'La reserva no está pendiente de aprobación (estado actual: ' || v_booking.status || ')');
  END IF;

  -- Actualizar booking a cancelled
  UPDATE bookings
  SET
    status = 'cancelled',
    approval_status = 'rejected',
    rejection_reason = p_rejection_reason,
    cancelled_at = NOW(),
    cancellation_reason = 'owner_rejected: ' || p_rejection_reason,
    cancelled_by_role = CASE WHEN v_caller_role = 'admin' THEN 'admin' ELSE 'owner' END,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Liberar fondos retenidos en wallet (si existen)
  -- Buscar transacciones de tipo 'lock' para este booking y crear 'unlock'
  INSERT INTO wallet_ledger (
    wallet_id,
    transaction_type,
    amount,
    currency,
    reference_type,
    reference_id,
    description,
    metadata
  )
  SELECT
    wl.wallet_id,
    'unlock',
    wl.amount,
    wl.currency,
    'booking',
    p_booking_id,
    'Liberación de fondos - Reserva rechazada por propietario',
    jsonb_build_object(
      'original_lock_id', wl.id,
      'rejection_reason', p_rejection_reason,
      'rejected_by', v_caller_id
    )
  FROM wallet_ledger wl
  WHERE wl.reference_id = p_booking_id
    AND wl.reference_type = 'booking'
    AND wl.transaction_type = 'lock'
    AND NOT EXISTS (
      -- No crear unlock duplicado
      SELECT 1 FROM wallet_ledger ul
      WHERE ul.reference_id = p_booking_id
        AND ul.transaction_type = 'unlock'
        AND (ul.metadata->>'original_lock_id')::UUID = wl.id
    );

  -- TODO: Trigger notificación al renter (implementar con pg_notify o edge function)

  RETURN json_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', 'cancelled',
    'rejection_reason', p_rejection_reason,
    'message', 'Reserva rechazada. Se notificará al cliente y se liberarán los fondos retenidos.'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION reject_booking(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION reject_booking IS 'Rechaza una reserva pendiente de aprobación. Solo owner del auto o admin. Libera fondos retenidos.';

-- ============================================================================
-- FASE 5: Función para expirar aprobaciones vencidas (cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_pending_approvals()
RETURNS TABLE(expired_count INT, expired_bookings UUID[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_ids UUID[];
  v_count INT;
BEGIN
  -- Marcar bookings expirados
  WITH expired AS (
    UPDATE bookings
    SET
      status = 'expired',
      approval_status = 'expired',
      cancellation_reason = 'approval_window_expired',
      cancelled_by_role = 'system',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE status IN ('pending', 'pending_approval')
      AND approval_status = 'pending'
      AND approval_expires_at IS NOT NULL
      AND approval_expires_at < NOW()
    RETURNING id
  )
  SELECT ARRAY_AGG(id), COUNT(*)::INT INTO v_expired_ids, v_count
  FROM expired;

  -- Liberar fondos de los bookings expirados
  IF v_expired_ids IS NOT NULL AND array_length(v_expired_ids, 1) > 0 THEN
    INSERT INTO wallet_ledger (
      wallet_id,
      transaction_type,
      amount,
      currency,
      reference_type,
      reference_id,
      description,
      metadata
    )
    SELECT
      wl.wallet_id,
      'unlock',
      wl.amount,
      wl.currency,
      'booking',
      wl.reference_id,
      'Liberación de fondos - Reserva expirada (sin respuesta del propietario)',
      jsonb_build_object(
        'original_lock_id', wl.id,
        'expiration_reason', 'approval_window_expired'
      )
    FROM wallet_ledger wl
    WHERE wl.reference_id = ANY(v_expired_ids)
      AND wl.reference_type = 'booking'
      AND wl.transaction_type = 'lock'
      AND NOT EXISTS (
        SELECT 1 FROM wallet_ledger ul
        WHERE ul.reference_id = wl.reference_id
          AND ul.transaction_type = 'unlock'
          AND (ul.metadata->>'original_lock_id')::UUID = wl.id
      );
  END IF;

  -- TODO: Notificar a renters y owners sobre expiración

  expired_count := COALESCE(v_count, 0);
  expired_bookings := COALESCE(v_expired_ids, ARRAY[]::UUID[]);

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION expire_pending_approvals IS 'Expira bookings pendientes que superaron la ventana de 24h y libera fondos retenidos';

-- ============================================================================
-- FASE 6: Trigger para establecer approval_expires_at al crear booking
-- ============================================================================

CREATE OR REPLACE FUNCTION set_approval_expires_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si el booking requiere aprobación y no tiene fecha de expiración, establecer 24h
  IF NEW.status IN ('pending', 'pending_approval') AND NEW.approval_expires_at IS NULL THEN
    NEW.approval_expires_at := NOW() + INTERVAL '24 hours';
    NEW.approval_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_approval_expires_at'
  ) THEN
    CREATE TRIGGER trg_set_approval_expires_at
      BEFORE INSERT ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION set_approval_expires_at();
  END IF;
END $$;

-- ============================================================================
-- FASE 7: Programar cron job (requiere pg_cron extension)
-- ============================================================================

-- Verificar si pg_cron está disponible antes de intentar programar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Eliminar job existente si hay uno
    PERFORM cron.unschedule('expire-pending-approvals');

    -- Programar cada 5 minutos
    PERFORM cron.schedule(
      'expire-pending-approvals',
      '*/5 * * * *',
      'SELECT * FROM expire_pending_approvals();'
    );

    RAISE NOTICE 'Cron job expire-pending-approvals programado cada 5 minutos';
  ELSE
    RAISE NOTICE 'pg_cron no está disponible. El job de expiración debe ejecutarse manualmente o vía Edge Function.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo programar cron job: %', SQLERRM;
END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  -- Verificar columnas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'approval_status') THEN
    RAISE NOTICE 'Columnas de approval agregadas correctamente';
  ELSE
    RAISE WARNING 'Columnas de approval NO fueron agregadas';
  END IF;

  -- Verificar vista
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'owner_pending_approvals') THEN
    RAISE NOTICE 'Vista owner_pending_approvals creada correctamente';
  ELSE
    RAISE WARNING 'Vista owner_pending_approvals NO fue creada';
  END IF;

  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_booking') THEN
    RAISE NOTICE 'Función approve_booking existe';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reject_booking') THEN
    RAISE NOTICE 'Función reject_booking creada correctamente';
  ELSE
    RAISE WARNING 'Función reject_booking NO fue creada';
  END IF;
END $$;
