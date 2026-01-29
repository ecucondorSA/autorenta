-- ============================================
-- MIGRATION: MercadoPago Onboarding Validation
-- Date: 2025-11-13
-- Purpose: Ensure cars can only receive bookings if owner completed MP onboarding
-- ============================================

-- 1. Agregar columna can_receive_payments a cars
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS can_receive_payments BOOLEAN DEFAULT false;

-- 2. Crear índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_cars_can_receive_payments
ON cars(can_receive_payments, status)
WHERE status = 'active';

-- 3. Agregar comentario
COMMENT ON COLUMN cars.can_receive_payments IS 'Si el auto puede recibir bookings (owner tiene MP onboarding completo)';

-- 4. Función para verificar si un usuario puede recibir pagos
CREATE OR REPLACE FUNCTION user_can_receive_payments(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND mp_onboarding_completed = true
    AND mercadopago_collector_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para actualizar can_receive_payments de todos los autos de un usuario
CREATE OR REPLACE FUNCTION update_user_cars_payment_status(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_can_receive BOOLEAN;
  v_updated_count INTEGER;
BEGIN
  -- Verificar si el usuario puede recibir pagos
  v_can_receive := user_can_receive_payments(p_user_id);

  -- Actualizar todos los autos del usuario
  UPDATE cars
  SET can_receive_payments = v_can_receive,
      updated_at = NOW()
  WHERE owner_id = p_user_id
  AND can_receive_payments != v_can_receive; -- Solo si cambió

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE 'Updated % cars for user % (can_receive_payments = %)',
    v_updated_count, p_user_id, v_can_receive;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para actualizar can_receive_payments cuando user completa onboarding
CREATE OR REPLACE FUNCTION trigger_update_cars_on_mp_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo ejecutar si mp_onboarding_completed cambió a true
  IF NEW.mp_onboarding_completed = true AND (OLD.mp_onboarding_completed IS NULL OR OLD.mp_onboarding_completed = false) THEN
    PERFORM update_user_cars_payment_status(NEW.id);
    RAISE NOTICE 'User % completed MP onboarding, updated cars', NEW.id;
  END IF;

  -- Si mp_onboarding_completed cambió a false, deshabilitar autos
  IF NEW.mp_onboarding_completed = false AND OLD.mp_onboarding_completed = true THEN
    PERFORM update_user_cars_payment_status(NEW.id);
    RAISE WARNING 'User % MP onboarding revoked, disabled cars', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cars_on_mp_onboarding ON profiles;
CREATE TRIGGER trigger_update_cars_on_mp_onboarding
AFTER UPDATE OF mp_onboarding_completed, mercadopago_collector_id ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_update_cars_on_mp_onboarding();

-- 7. RLS Policy: Solo permitir bookings en autos que pueden recibir pagos
-- Primero, drop la policy si existe
DROP POLICY IF EXISTS "Can only book cars that can receive payments" ON bookings;

-- Crear policy mejorada
CREATE POLICY "Can only book cars that can receive payments"
ON bookings FOR INSERT
WITH CHECK (
  -- Verificar que el auto existe, está activo, y puede recibir pagos
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id = bookings.car_id
    AND cars.status = 'active'
    AND cars.can_receive_payments = true
  )
);

-- 8. Función helper para el frontend: verificar si puede publicar auto
CREATE OR REPLACE FUNCTION can_publish_car(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_can_receive_payments(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. View para autos bookables (con payment validation)
CREATE OR REPLACE VIEW bookable_cars AS
SELECT
  c.*,
  p.email as owner_email,
  p.full_name as owner_name,
  p.mp_onboarding_completed as owner_mp_completed
FROM cars c
JOIN profiles p ON p.id = c.owner_id
WHERE c.status = 'active'
AND c.can_receive_payments = true;

-- Grant permissions
GRANT SELECT ON bookable_cars TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_receive_payments TO authenticated;
GRANT EXECUTE ON FUNCTION can_publish_car TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_cars_payment_status TO service_role;

-- 10. MIGRACIÓN DE DATOS: Actualizar autos existentes
DO $$
DECLARE
  v_total_users INTEGER;
  v_updated_count INTEGER := 0;
  v_user RECORD;
BEGIN
  -- Contar usuarios con autos
  SELECT COUNT(DISTINCT owner_id) INTO v_total_users
  FROM cars;

  RAISE NOTICE 'Updating can_receive_payments for % users with cars...', v_total_users;

  -- Actualizar cada usuario
  FOR v_user IN (SELECT DISTINCT owner_id FROM cars) LOOP
    v_updated_count := v_updated_count + update_user_cars_payment_status(v_user.owner_id);
  END LOOP;

  RAISE NOTICE '✅ Updated % cars total', v_updated_count;
END $$;

-- 11. Verificación
SELECT
  COUNT(*) as total_cars,
  COUNT(*) FILTER (WHERE can_receive_payments = true) as can_receive_payments,
  COUNT(*) FILTER (WHERE can_receive_payments = false) as cannot_receive_payments,
  COUNT(*) FILTER (WHERE status = 'active' AND can_receive_payments = false) as active_but_cannot_receive
FROM cars;

-- 12. View de diagnóstico para admins
CREATE OR REPLACE VIEW cars_payment_status_diagnostic AS
SELECT
  c.id as car_id,
  c.brand || ' ' || c.model as car_name,
  c.status,
  c.can_receive_payments,
  p.id as owner_id,
  p.email as owner_email,
  p.mp_onboarding_completed as owner_mp_completed,
  p.mercadopago_collector_id as owner_collector_id,
  p.created_at as owner_created_at,
  CASE
    WHEN c.status = 'active' AND c.can_receive_payments = false THEN '⚠️ BLOQUEADO: Auto activo pero sin MP'
    WHEN c.status = 'active' AND c.can_receive_payments = true THEN '✅ OK: Puede recibir bookings'
    WHEN c.status != 'active' THEN 'ℹ️ Inactivo'
    ELSE '❓ Estado desconocido'
  END as diagnostic
FROM cars c
JOIN profiles p ON p.id = c.owner_id
ORDER BY
  CASE
    WHEN c.status = 'active' AND c.can_receive_payments = false THEN 1
    WHEN c.status = 'active' AND c.can_receive_payments = true THEN 2
    ELSE 3
  END,
  c.created_at DESC;

GRANT SELECT ON cars_payment_status_diagnostic TO authenticated;

-- ============================================
-- TESTING QUERIES
-- ============================================

-- Ver autos activos que NO pueden recibir bookings (problema!)
SELECT * FROM cars_payment_status_diagnostic
WHERE status = 'active' AND can_receive_payments = false;

-- Ver stats de autos por payment status
SELECT
  status,
  can_receive_payments,
  COUNT(*) as count
FROM cars
GROUP BY status, can_receive_payments
ORDER BY status, can_receive_payments;

-- ============================================
-- ROLLBACK (si es necesario)
-- ============================================

-- DROP VIEW IF EXISTS cars_payment_status_diagnostic CASCADE;
-- DROP VIEW IF EXISTS bookable_cars CASCADE;
-- DROP TRIGGER IF EXISTS trigger_update_cars_on_mp_onboarding ON users;
-- DROP FUNCTION IF EXISTS trigger_update_cars_on_mp_onboarding CASCADE;
-- DROP FUNCTION IF EXISTS can_publish_car CASCADE;
-- DROP FUNCTION IF EXISTS update_user_cars_payment_status CASCADE;
-- DROP FUNCTION IF EXISTS user_can_receive_payments CASCADE;
-- DROP POLICY IF EXISTS "Can only book cars that can receive payments" ON bookings;
-- DROP INDEX IF EXISTS idx_cars_can_receive_payments;
-- ALTER TABLE cars DROP COLUMN IF EXISTS can_receive_payments;
