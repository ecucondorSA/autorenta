-- ============================================================================
-- MIGRACIÓN: Sistema de Aprobación Manual de Reservas
-- Fecha: 26 de Octubre 2025
-- Descripción: Permite a locadores aprobar/rechazar reservas manualmente
-- ============================================================================

-- ============================================================================
-- PASO 1: Añadir campos de configuración a tabla CARS
-- ============================================================================

-- Añadir columnas de configuración de aprobación
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS instant_booking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_timeout_hours INTEGER DEFAULT 24;

-- Comentarios para documentación
COMMENT ON COLUMN cars.instant_booking IS 'Si true, reservas se confirman automáticamente al pagar. Si false, requieren aprobación del locador.';
COMMENT ON COLUMN cars.require_approval IS 'Alias de !instant_booking para claridad. Si true, locador debe aprobar manualmente.';
COMMENT ON COLUMN cars.approval_timeout_hours IS 'Horas que el locador tiene para aprobar antes de auto-cancelación (default: 24h)';

-- Índice para queries por configuración
CREATE INDEX IF NOT EXISTS idx_cars_instant_booking ON cars(instant_booking) WHERE instant_booking = false;

-- ============================================================================
-- PASO 2: Extender estados de BOOKINGS
-- ============================================================================

-- Nota: BookingStatus ya existe como tipo ENUM o CHECK constraint
-- Necesitamos añadir 'pending_approval' a los estados válidos

-- Si bookings.status es TEXT sin constraint:
-- No requiere cambios, solo validación en app layer

-- Si existe constraint CHECK, actualizarla:
DO $$ 
BEGIN
    -- Intentar eliminar constraint existente si existe
    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
    
    -- Crear nueva constraint con estado adicional
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN (
        'draft',
        'pending',
        'pending_approval',  -- ✅ NUEVO
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'rejected'  -- ✅ NUEVO (para rechazadas por locador)
    ));
EXCEPTION
    WHEN OTHERS THEN
        -- Si falla, probablemente porque la constraint no existe o tiene otro nombre
        RAISE NOTICE 'No se pudo actualizar constraint de status, verificar manualmente';
END $$;

-- Añadir campos de tracking de aprobación
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Comentarios
COMMENT ON COLUMN bookings.approval_status IS 'Estado de aprobación: pending, approved, rejected, expired';
COMMENT ON COLUMN bookings.approved_by IS 'Usuario (locador) que aprobó la reserva';
COMMENT ON COLUMN bookings.approved_at IS 'Timestamp de aprobación';
COMMENT ON COLUMN bookings.rejected_by IS 'Usuario (locador) que rechazó la reserva';
COMMENT ON COLUMN bookings.rejected_at IS 'Timestamp de rechazo';
COMMENT ON COLUMN bookings.rejection_reason IS 'Razón por la cual se rechazó (opcional)';
COMMENT ON COLUMN bookings.approval_expires_at IS 'Timestamp cuando expira la ventana de aprobación';

-- Índices para queries
CREATE INDEX IF NOT EXISTS idx_bookings_approval_status ON bookings(approval_status) WHERE approval_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bookings_approval_expires ON bookings(approval_expires_at) WHERE approval_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_pending_approval ON bookings(status) WHERE status = 'pending_approval';

-- ============================================================================
-- PASO 3: Función RPC para APROBAR reserva
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_booking(
    p_booking_id UUID,
    p_owner_id UUID DEFAULT NULL  -- NULL = usar auth.uid()
) RETURNS JSON AS $$
DECLARE
    v_owner_id UUID;
    v_booking RECORD;
    v_car RECORD;
    v_result JSON;
BEGIN
    -- Obtener ID del usuario actual
    v_owner_id := COALESCE(p_owner_id, auth.uid());
    
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener booking y validar
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;
    
    -- Obtener auto y validar que el usuario sea el dueño
    SELECT * INTO v_car
    FROM cars
    WHERE id = v_booking.car_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auto no encontrado';
    END IF;
    
    IF v_car.owner_id != v_owner_id THEN
        RAISE EXCEPTION 'No tienes permiso para aprobar esta reserva';
    END IF;
    
    -- Validar estado actual
    IF v_booking.status != 'pending_approval' THEN
        RAISE EXCEPTION 'La reserva no está pendiente de aprobación (estado actual: %)', v_booking.status;
    END IF;
    
    -- Validar que no haya expirado
    IF v_booking.approval_expires_at IS NOT NULL AND v_booking.approval_expires_at < NOW() THEN
        RAISE EXCEPTION 'La ventana de aprobación ha expirado';
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
    
    -- Retornar resultado
    v_result := json_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'confirmed',
        'approved_at', NOW(),
        'message', 'Reserva aprobada exitosamente'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Retornar error
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Error al aprobar reserva'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION approve_booking IS 'Aprueba una reserva pendiente. Solo el dueño del auto puede aprobar.';

-- ============================================================================
-- PASO 4: Función RPC para RECHAZAR reserva
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_booking(
    p_booking_id UUID,
    p_rejection_reason TEXT DEFAULT 'No especificado',
    p_owner_id UUID DEFAULT NULL  -- NULL = usar auth.uid()
) RETURNS JSON AS $$
DECLARE
    v_owner_id UUID;
    v_booking RECORD;
    v_car RECORD;
    v_result JSON;
    v_refund_result JSON;
BEGIN
    -- Obtener ID del usuario actual
    v_owner_id := COALESCE(p_owner_id, auth.uid());
    
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;
    
    -- Obtener booking y validar
    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;
    
    -- Obtener auto y validar que el usuario sea el dueño
    SELECT * INTO v_car
    FROM cars
    WHERE id = v_booking.car_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auto no encontrado';
    END IF;
    
    IF v_car.owner_id != v_owner_id THEN
        RAISE EXCEPTION 'No tienes permiso para rechazar esta reserva';
    END IF;
    
    -- Validar estado actual
    IF v_booking.status NOT IN ('pending_approval', 'pending') THEN
        RAISE EXCEPTION 'La reserva no puede ser rechazada (estado actual: %)', v_booking.status;
    END IF;
    
    -- Actualizar booking
    UPDATE bookings
    SET 
        status = 'rejected',
        approval_status = 'rejected',
        rejected_by = v_owner_id,
        rejected_at = NOW(),
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_booking_id;
    
    -- TODO: Desbloquear fondos si estaban bloqueados
    -- Esto depende de la implementación del wallet
    -- Puede requerir llamar a unlock_funds() o similar
    
    -- Retornar resultado
    v_result := json_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'rejected',
        'rejected_at', NOW(),
        'rejection_reason', p_rejection_reason,
        'message', 'Reserva rechazada exitosamente'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Retornar error
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Error al rechazar reserva'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION reject_booking IS 'Rechaza una reserva pendiente. Solo el dueño del auto puede rechazar.';

-- ============================================================================
-- PASO 5: Función para auto-cancelar reservas expiradas
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_cancel_expired_approvals()
RETURNS JSON AS $$
DECLARE
    v_expired_count INTEGER;
    v_expired_ids UUID[];
BEGIN
    -- Encontrar reservas expiradas
    SELECT ARRAY_AGG(id), COUNT(*)
    INTO v_expired_ids, v_expired_count
    FROM bookings
    WHERE status = 'pending_approval'
      AND approval_expires_at < NOW()
      AND approval_status = 'pending';
    
    IF v_expired_count > 0 THEN
        -- Cancelar automáticamente
        UPDATE bookings
        SET 
            status = 'cancelled',
            approval_status = 'expired',
            rejection_reason = 'Ventana de aprobación expirada (auto-cancelado)',
            updated_at = NOW()
        WHERE id = ANY(v_expired_ids);
        
        -- TODO: Desbloquear fondos
        
        RETURN json_build_object(
            'success', true,
            'cancelled_count', v_expired_count,
            'booking_ids', v_expired_ids,
            'message', format('%s reservas auto-canceladas por expiración', v_expired_count)
        );
    ELSE
        RETURN json_build_object(
            'success', true,
            'cancelled_count', 0,
            'message', 'No hay reservas expiradas'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION auto_cancel_expired_approvals IS 'Auto-cancela reservas cuya ventana de aprobación expiró. Debe ejecutarse periódicamente (cron).';

-- ============================================================================
-- PASO 6: Trigger para configurar approval_expires_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION set_approval_expiry()
RETURNS TRIGGER AS $$
DECLARE
    v_car RECORD;
BEGIN
    -- Solo aplicar si el status es pending_approval
    IF NEW.status = 'pending_approval' AND NEW.approval_expires_at IS NULL THEN
        -- Obtener configuración del auto
        SELECT approval_timeout_hours INTO v_car
        FROM cars
        WHERE id = NEW.car_id;
        
        -- Configurar expiración
        NEW.approval_expires_at := NOW() + (COALESCE(v_car.approval_timeout_hours, 24) || ' hours')::INTERVAL;
        NEW.approval_status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trg_set_approval_expiry ON bookings;
CREATE TRIGGER trg_set_approval_expiry
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    WHEN (NEW.status = 'pending_approval')
    EXECUTE FUNCTION set_approval_expiry();

-- ============================================================================
-- PASO 7: Permisos RLS (Row Level Security)
-- ============================================================================

-- Permitir a locadores ver sus reservas pendientes
CREATE POLICY IF NOT EXISTS "owners_can_view_pending_approvals"
ON bookings FOR SELECT
TO authenticated
USING (
    status = 'pending_approval' 
    AND car_id IN (SELECT id FROM cars WHERE owner_id = auth.uid())
);

-- Permitir a locadores aprobar/rechazar
CREATE POLICY IF NOT EXISTS "owners_can_update_approval_status"
ON bookings FOR UPDATE
TO authenticated
USING (
    status = 'pending_approval' 
    AND car_id IN (SELECT id FROM cars WHERE owner_id = auth.uid())
)
WITH CHECK (
    status IN ('confirmed', 'rejected')
    AND car_id IN (SELECT id FROM cars WHERE owner_id = auth.uid())
);

-- ============================================================================
-- PASO 8: Vista helper para locadores
-- ============================================================================

CREATE OR REPLACE VIEW owner_pending_approvals AS
SELECT 
    b.id as booking_id,
    b.car_id,
    c.brand || ' ' || c.model as car_name,
    c.year as car_year,
    b.renter_id,
    b.start_at,
    b.end_at,
    b.total_amount,
    b.currency,
    b.created_at as booking_created_at,
    b.approval_expires_at,
    EXTRACT(EPOCH FROM (b.approval_expires_at - NOW())) / 3600 as hours_remaining,
    b.days_count,
    c.owner_id as car_owner_id
FROM bookings b
JOIN cars c ON b.car_id = c.id
WHERE b.status = 'pending_approval'
  AND b.approval_status = 'pending'
  AND c.owner_id = auth.uid()
ORDER BY b.approval_expires_at ASC;

-- Comentario
COMMENT ON VIEW owner_pending_approvals IS 'Vista helper para que locadores vean sus reservas pendientes de aprobación, ordenadas por urgencia.';

-- ============================================================================
-- ROLLBACK (si necesitas revertir esta migración)
-- ============================================================================

/*
-- Para revertir, ejecutar:

-- Eliminar vista
DROP VIEW IF EXISTS owner_pending_approvals;

-- Eliminar policies
DROP POLICY IF EXISTS "owners_can_view_pending_approvals" ON bookings;
DROP POLICY IF EXISTS "owners_can_update_approval_status" ON bookings;

-- Eliminar trigger
DROP TRIGGER IF EXISTS trg_set_approval_expiry ON bookings;
DROP FUNCTION IF EXISTS set_approval_expiry();

-- Eliminar funciones RPC
DROP FUNCTION IF EXISTS auto_cancel_expired_approvals();
DROP FUNCTION IF EXISTS reject_booking(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS approve_booking(UUID, UUID);

-- Eliminar índices
DROP INDEX IF EXISTS idx_bookings_pending_approval;
DROP INDEX IF EXISTS idx_bookings_approval_expires;
DROP INDEX IF EXISTS idx_bookings_approval_status;
DROP INDEX IF EXISTS idx_cars_instant_booking;

-- Eliminar columnas de bookings
ALTER TABLE bookings 
DROP COLUMN IF EXISTS approval_expires_at,
DROP COLUMN IF EXISTS rejection_reason,
DROP COLUMN IF EXISTS rejected_at,
DROP COLUMN IF EXISTS rejected_by,
DROP COLUMN IF EXISTS approved_at,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approval_status;

-- Eliminar columnas de cars
ALTER TABLE cars 
DROP COLUMN IF EXISTS approval_timeout_hours,
DROP COLUMN IF EXISTS require_approval,
DROP COLUMN IF EXISTS instant_booking;

-- Actualizar constraint de status (quitar nuevos estados)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));
*/

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE 'Campos añadidos a cars: instant_booking, require_approval, approval_timeout_hours';
    RAISE NOTICE 'Campos añadidos a bookings: approval_status, approved_by, approved_at, etc.';
    RAISE NOTICE 'Funciones RPC creadas: approve_booking(), reject_booking(), auto_cancel_expired_approvals()';
    RAISE NOTICE 'Vista creada: owner_pending_approvals';
    RAISE NOTICE 'Trigger creado: trg_set_approval_expiry';
END $$;
