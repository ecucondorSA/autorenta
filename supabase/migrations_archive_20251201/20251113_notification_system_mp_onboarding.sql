-- ============================================
-- MIGRATION: Notification System for MP Onboarding
-- Date: 2025-11-13
-- Purpose: Notificar (no bloquear) cuando un usuario publica sin MP onboarding
-- ============================================

-- 1. Crear función para notificar al usuario cuando publica sin MP
CREATE OR REPLACE FUNCTION notify_mp_onboarding_required()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_has_mp BOOLEAN;
BEGIN
  -- Solo verificar cuando se activa un auto
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN

    -- Verificar si el owner tiene MP onboarding completo
    SELECT mp_onboarding_completed INTO v_owner_has_mp
    FROM profiles
    WHERE id = NEW.owner_id;

    -- Si NO tiene MP onboarding, crear notificación
    IF v_owner_has_mp IS NULL OR v_owner_has_mp = false THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        cta_link,
        metadata
      ) VALUES (
        NEW.owner_id,
        'mp_onboarding_required',
        '⚠️ Completa tu onboarding de MercadoPago',
        'Has publicado un auto, pero aún no has conectado tu cuenta de MercadoPago. Para recibir pagos, debes completar el proceso de onboarding en Configuración → Pagos.',
        '/settings/payments',
        jsonb_build_object(
          'car_id', NEW.id,
          'car_name', NEW.brand || ' ' || NEW.model,
          'published_at', NOW(),
          'notification_reason', 'mp_onboarding_required'
        )
      );

      RAISE NOTICE 'Notification created: User % needs to complete MP onboarding for car %', NEW.owner_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger para notificar (NO bloquear)
DROP TRIGGER IF EXISTS notify_mp_onboarding_on_publish ON cars;
CREATE TRIGGER notify_mp_onboarding_on_publish
  AFTER INSERT OR UPDATE ON cars
  FOR EACH ROW
  EXECUTE FUNCTION notify_mp_onboarding_required();

-- 3. Crear índice para búsqueda rápida de notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
ON notifications(user_id, type, created_at DESC)
WHERE is_read = false;

-- 4. Función helper para obtener notificaciones de MP pendientes
CREATE OR REPLACE FUNCTION get_mp_onboarding_notifications(p_user_id UUID)
RETURNS TABLE (
  notification_id UUID,
  car_id UUID,
  car_name TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    (n.metadata->>'car_id')::UUID,
    n.metadata->>'car_name',
    (n.metadata->>'published_at')::TIMESTAMPTZ,
    n.created_at
  FROM notifications n
  WHERE n.user_id = p_user_id
  AND n.metadata->>'notification_reason' = 'mp_onboarding_required'
  AND n.is_read = false
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_mp_onboarding_notifications TO authenticated;

-- 6. Comentarios
COMMENT ON FUNCTION notify_mp_onboarding_required() IS
  'Crea una notificación cuando un usuario publica un auto sin tener MP onboarding completo. NO bloquea la publicación.';

COMMENT ON FUNCTION get_mp_onboarding_notifications IS
  'Obtiene todas las notificaciones de MP onboarding pendientes para un usuario';

-- ============================================
-- TESTING
-- ============================================

-- Ver notificaciones de MP onboarding pendientes
-- SELECT * FROM get_mp_onboarding_notifications('user-uuid-here');

-- Ver todas las notificaciones de MP onboarding
-- SELECT * FROM notifications WHERE type = 'mp_onboarding_required' ORDER BY created_at DESC;
