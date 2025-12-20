-- ============================================
-- SISTEMA EXTENDIDO DE NOTIFICACIONES
-- ============================================

-- 1. NOTIFICACION DE BIENVENIDA (Trigger al crear usuario)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enviar notificación de bienvenida al nuevo usuario
  INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
  VALUES (
    NEW.id,
    '🎉 ¡Bienvenido a AutoRenta!',
    'Gracias por unirte. Completa tu perfil para comenzar a alquilar o publicar tu auto.',
    'welcome',
    '/profile/verification',
    jsonb_build_object('registered_at', NOW())
  );

  RETURN NEW;
END;
$$;

-- Crear trigger en profiles (se ejecuta cuando se crea el perfil del usuario)
DROP TRIGGER IF EXISTS trigger_welcome_notification ON profiles;
CREATE TRIGGER trigger_welcome_notification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_notification();


-- 2. NOTIFICACION DE VERIFICACION (Trigger al cambiar estado)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_verification_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  notification_type notification_type;
BEGIN
  -- Solo notificar si cambió el estado de verificación
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN

    IF NEW.verification_status = 'verified' THEN
      notification_title := '✅ ¡Perfil verificado!';
      notification_body := 'Tu identidad ha sido verificada. Ahora puedes disfrutar de todas las funciones de AutoRenta.';
      notification_type := 'verification_approved';
    ELSIF NEW.verification_status = 'rejected' THEN
      notification_title := '❌ Verificación rechazada';
      notification_body := 'Tu documentación no pudo ser verificada. Por favor, revisa los requisitos y vuelve a intentarlo.';
      notification_type := 'verification_rejected';
    ELSIF NEW.verification_status = 'pending' THEN
      -- No notificar cuando pasa a pending (ya sabe que subió docs)
      RETURN NEW;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      NEW.id,
      notification_title,
      notification_body,
      notification_type,
      '/profile/verification',
      jsonb_build_object('old_status', OLD.verification_status, 'new_status', NEW.verification_status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_verification_notification ON profiles;
CREATE TRIGGER trigger_verification_notification
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION public.send_verification_notification();


-- 3. NOTIFICACION DE AUTOS CERCANOS (Semanal)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_nearby_cars_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rec RECORD;
  car_count INTEGER;
  sample_cars TEXT;
BEGIN
  -- Buscar usuarios con ubicación que no recibieron esta notificación recientemente
  FOR user_rec IN
    SELECT
      p.id,
      p.location_city,
      p.location_lat,
      p.location_lng
    FROM profiles p
    WHERE p.location_lat IS NOT NULL
      AND p.location_lng IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = p.id
          AND n.type = 'nearby_cars'
          AND n.created_at > NOW() - INTERVAL '6 days'
      )
    LIMIT 50
  LOOP
    -- Contar autos activos cerca del usuario (50km)
    SELECT COUNT(*) INTO car_count
    FROM cars c
    WHERE c.status = 'active'
      AND c.owner_id != user_rec.id
      AND c.location_lat IS NOT NULL
      AND c.location_lng IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(user_rec.location_lat)) * cos(radians(c.location_lat)) *
          cos(radians(c.location_lng) - radians(user_rec.location_lng)) +
          sin(radians(user_rec.location_lat)) * sin(radians(c.location_lat))
        )
      ) <= 50;

    -- Solo notificar si hay autos disponibles
    IF car_count > 0 THEN
      -- Obtener algunos ejemplos de autos
      SELECT string_agg(brand || ' ' || model, ', ' ORDER BY created_at DESC)
      INTO sample_cars
      FROM (
        SELECT c.brand, c.model, c.created_at
        FROM cars c
        WHERE c.status = 'active'
          AND c.owner_id != user_rec.id
          AND c.location_lat IS NOT NULL
          AND (
            6371 * acos(
              cos(radians(user_rec.location_lat)) * cos(radians(c.location_lat)) *
              cos(radians(c.location_lng) - radians(user_rec.location_lng)) +
              sin(radians(user_rec.location_lat)) * sin(radians(c.location_lat))
            )
          ) <= 50
        ORDER BY c.created_at DESC
        LIMIT 3
      ) recent_cars;

      INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
      VALUES (
        user_rec.id,
        '🚗 ' || car_count || ' autos disponibles cerca tuyo',
        CASE
          WHEN car_count = 1 THEN 'Hay un ' || sample_cars || ' disponible en tu zona.'
          WHEN car_count <= 3 THEN 'Disponibles: ' || sample_cars
          ELSE sample_cars || ' y ' || (car_count - 3) || ' más te esperan.'
        END,
        'nearby_cars',
        '/marketplace',
        jsonb_build_object('car_count', car_count, 'city', user_rec.location_city)
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Nearby cars notifications sent successfully';
END;
$$;


-- 4. NOTIFICACION DE VISTAS DEL AUTO (Milestones)
-- ============================================
-- Primero necesitamos una tabla para trackear vistas si no existe
CREATE TABLE IF NOT EXISTS car_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_ip TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_car_views_car_id ON car_views(car_id);
CREATE INDEX IF NOT EXISTS idx_car_views_viewed_at ON car_views(viewed_at);

-- Enable RLS
ALTER TABLE car_views ENABLE ROW LEVEL SECURITY;

-- Política para insertar vistas (cualquiera puede ver un auto)
DROP POLICY IF EXISTS "Anyone can insert car views" ON car_views;
CREATE POLICY "Anyone can insert car views" ON car_views
  FOR INSERT WITH CHECK (true);

-- Política para que owners vean las vistas de sus autos
DROP POLICY IF EXISTS "Owners can view their car views" ON car_views;
CREATE POLICY "Owners can view their car views" ON car_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cars c
      WHERE c.id = car_views.car_id
        AND c.owner_id = auth.uid()
    )
  );

-- Función para notificar milestones de vistas
CREATE OR REPLACE FUNCTION public.send_car_views_milestone_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  car_rec RECORD;
  view_count INTEGER;
  last_milestone INTEGER;
  new_milestone INTEGER;
  milestones INTEGER[] := ARRAY[10, 25, 50, 100, 250, 500, 1000];
BEGIN
  -- Para cada auto activo
  FOR car_rec IN
    SELECT
      c.id,
      c.owner_id,
      c.brand,
      c.model
    FROM cars c
    WHERE c.status = 'active'
  LOOP
    -- Contar vistas totales
    SELECT COUNT(*) INTO view_count
    FROM car_views cv
    WHERE cv.car_id = car_rec.id;

    -- Encontrar el milestone alcanzado
    new_milestone := 0;
    FOR i IN 1..array_length(milestones, 1) LOOP
      IF view_count >= milestones[i] THEN
        new_milestone := milestones[i];
      END IF;
    END LOOP;

    -- Si alcanzó un milestone, verificar si ya se notificó
    IF new_milestone > 0 THEN
      -- Obtener último milestone notificado
      SELECT COALESCE((metadata->>'milestone')::integer, 0) INTO last_milestone
      FROM notifications
      WHERE user_id = car_rec.owner_id
        AND type = 'car_views_milestone'
        AND metadata->>'car_id' = car_rec.id::text
      ORDER BY created_at DESC
      LIMIT 1;

      -- Solo notificar si es un nuevo milestone
      IF new_milestone > COALESCE(last_milestone, 0) THEN
        INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
        VALUES (
          car_rec.owner_id,
          '👀 ¡' || new_milestone || ' personas vieron tu auto!',
          format('Tu %s %s está generando interés. ¡Sigue así!', car_rec.brand, car_rec.model),
          'car_views_milestone',
          '/cars/' || car_rec.id,
          jsonb_build_object('car_id', car_rec.id, 'milestone', new_milestone, 'total_views', view_count)
        );
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE 'Car views milestone notifications sent successfully';
END;
$$;


-- 5. NOTIFICACION DE RECOMENDACION DE AUTO (Personalizada)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_car_recommendations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rec RECORD;
  recommended_car RECORD;
BEGIN
  -- Buscar usuarios activos sin reservas recientes
  FOR user_rec IN
    SELECT
      p.id,
      p.full_name,
      p.location_lat,
      p.location_lng,
      p.location_city
    FROM profiles p
    WHERE p.location_lat IS NOT NULL
      AND NOT EXISTS (
        -- No tiene reservas activas o recientes
        SELECT 1 FROM bookings b
        WHERE b.renter_id = p.id
          AND b.created_at > NOW() - INTERVAL '30 days'
      )
      AND NOT EXISTS (
        -- No recibió recomendación recientemente
        SELECT 1 FROM notifications n
        WHERE n.user_id = p.id
          AND n.type = 'car_recommendation'
          AND n.created_at > NOW() - INTERVAL '13 days'
      )
    LIMIT 30
  LOOP
    -- Buscar un auto destacado cerca del usuario
    SELECT
      c.id,
      c.brand,
      c.model,
      c.price_per_day,
      c.location_city,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(DISTINCT b.id) as booking_count
    INTO recommended_car
    FROM cars c
    LEFT JOIN reviews r ON r.car_id = c.id
    LEFT JOIN bookings b ON b.car_id = c.id AND b.status = 'completed'
    WHERE c.status = 'active'
      AND c.owner_id != user_rec.id
      AND c.location_lat IS NOT NULL
      AND (
        6371 * acos(
          cos(radians(user_rec.location_lat)) * cos(radians(c.location_lat)) *
          cos(radians(c.location_lng) - radians(user_rec.location_lng)) +
          sin(radians(user_rec.location_lat)) * sin(radians(c.location_lat))
        )
      ) <= 30
    GROUP BY c.id, c.brand, c.model, c.price_per_day, c.location_city
    ORDER BY COALESCE(AVG(r.rating), 0) DESC, COUNT(DISTINCT b.id) DESC
    LIMIT 1;

    IF recommended_car.id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
      VALUES (
        user_rec.id,
        '⭐ Auto recomendado para ti',
        format('%s %s en %s desde $%s/día. %s',
          recommended_car.brand,
          recommended_car.model,
          recommended_car.location_city,
          recommended_car.price_per_day::integer,
          CASE
            WHEN recommended_car.avg_rating >= 4.5 THEN '¡Muy bien valorado!'
            WHEN recommended_car.booking_count >= 5 THEN '¡Popular en tu zona!'
            ELSE '¡Disponible ahora!'
          END
        ),
        'car_recommendation',
        '/cars/' || recommended_car.id,
        jsonb_build_object(
          'car_id', recommended_car.id,
          'price', recommended_car.price_per_day,
          'rating', recommended_car.avg_rating
        )
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Car recommendations sent successfully';
END;
$$;


-- 6. TIPS PARA RENTERS (Quincenal)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_renter_tips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_rec RECORD;
  tip_index INTEGER;
  tips TEXT[] := ARRAY[
    '💡 Reserva con anticipación para obtener mejores precios y más opciones de autos.',
    '📱 Activa las notificaciones para enterarte de ofertas especiales en tu zona.',
    '⭐ Lee las reseñas antes de reservar. Los autos con 4.5+ estrellas garantizan buena experiencia.',
    '📍 Busca autos cerca de tu ubicación para ahorrar tiempo en la recogida.',
    '💰 Los fines de semana largos tienen alta demanda. ¡Reserva antes!',
    '📋 Ten tus documentos listos: DNI, licencia vigente y comprobante de domicilio.',
    '🔒 Revisa bien el auto antes de retirarlo y documenta cualquier daño existente.',
    '💳 Completa tu perfil al 100% para agilizar futuras reservas.'
  ];
BEGIN
  tip_index := (EXTRACT(doy FROM CURRENT_DATE)::integer % array_length(tips, 1)) + 1;

  -- Enviar a usuarios que han sido renters o están buscando autos
  FOR user_rec IN
    SELECT DISTINCT p.id
    FROM profiles p
    WHERE EXISTS (
      -- Ha hecho al menos una reserva como renter
      SELECT 1 FROM bookings b WHERE b.renter_id = p.id
    )
    AND NOT EXISTS (
      -- No recibió tip recientemente
      SELECT 1 FROM notifications n
      WHERE n.user_id = p.id
        AND n.type = 'renter_tip'
        AND n.created_at > NOW() - INTERVAL '13 days'
    )
    LIMIT 100
  LOOP
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      user_rec.id,
      '💡 Tip para tu próximo viaje',
      tips[tip_index],
      'renter_tip',
      '/marketplace',
      jsonb_build_object('tip_index', tip_index)
    );
  END LOOP;

  RAISE NOTICE 'Renter tips sent successfully (tip #%)', tip_index;
END;
$$;


-- 7. ALERTA DE BAJADA DE PRECIO (Para favoritos)
-- ============================================
-- Tabla de favoritos si no existe
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_car_id ON user_favorites(car_id);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their favorites" ON user_favorites;
CREATE POLICY "Users can manage their favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Función para notificar bajada de precio
CREATE OR REPLACE FUNCTION public.notify_price_drop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fav RECORD;
  price_diff NUMERIC;
  discount_pct INTEGER;
BEGIN
  -- Solo si el precio bajó
  IF NEW.price_per_day < OLD.price_per_day THEN
    price_diff := OLD.price_per_day - NEW.price_per_day;
    discount_pct := ((price_diff / OLD.price_per_day) * 100)::integer;

    -- Solo notificar si la bajada es significativa (>5%)
    IF discount_pct >= 5 THEN
      -- Notificar a todos los que tienen este auto en favoritos
      FOR fav IN
        SELECT uf.user_id
        FROM user_favorites uf
        WHERE uf.car_id = NEW.id
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = uf.user_id
              AND n.type = 'price_drop_alert'
              AND n.metadata->>'car_id' = NEW.id::text
              AND n.created_at > NOW() - INTERVAL '7 days'
          )
      LOOP
        INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
        VALUES (
          fav.user_id,
          '🏷️ ¡Bajó de precio!',
          format('%s %s ahora a $%s/día (-%s%%)',
            NEW.brand, NEW.model, NEW.price_per_day::integer, discount_pct),
          'price_drop_alert',
          '/cars/' || NEW.id,
          jsonb_build_object(
            'car_id', NEW.id,
            'old_price', OLD.price_per_day,
            'new_price', NEW.price_per_day,
            'discount_pct', discount_pct
          )
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_price_drop_notification ON cars;
CREATE TRIGGER trigger_price_drop_notification
  AFTER UPDATE OF price_per_day ON cars
  FOR EACH ROW
  WHEN (NEW.price_per_day < OLD.price_per_day)
  EXECUTE FUNCTION public.notify_price_drop();


-- 8. AUTO FAVORITO DISPONIBLE (Cuando se desbloquea)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_favorite_car_available()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fav RECORD;
BEGIN
  -- Buscar favoritos de autos que ahora están disponibles
  FOR fav IN
    SELECT
      uf.user_id,
      c.id as car_id,
      c.brand,
      c.model,
      c.price_per_day
    FROM user_favorites uf
    JOIN cars c ON c.id = uf.car_id
    WHERE c.status = 'active'
      -- Auto tiene disponibilidad próxima (no bloqueado próximos 7 días)
      AND NOT EXISTS (
        SELECT 1 FROM car_blocked_dates cbd
        WHERE cbd.car_id = c.id
          AND cbd.from_date <= CURRENT_DATE + INTERVAL '7 days'
          AND cbd.to_date >= CURRENT_DATE
      )
      AND NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.car_id = c.id
          AND b.status IN ('confirmed', 'in_progress')
          AND b.start_at <= CURRENT_DATE + INTERVAL '7 days'
          AND b.end_at >= CURRENT_DATE
      )
      -- No notificó recientemente
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = uf.user_id
          AND n.type = 'favorite_car_available'
          AND n.metadata->>'car_id' = c.id::text
          AND n.created_at > NOW() - INTERVAL '14 days'
      )
    LIMIT 50
  LOOP
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      fav.user_id,
      '❤️ Tu favorito está disponible',
      format('%s %s tiene fechas disponibles desde $%s/día',
        fav.brand, fav.model, fav.price_per_day::integer),
      'favorite_car_available',
      '/cars/' || fav.car_id,
      jsonb_build_object('car_id', fav.car_id)
    );
  END LOOP;

  RAISE NOTICE 'Favorite car available notifications sent successfully';
END;
$$;


-- ============================================
-- CONFIGURAR CRON JOBS ADICIONALES
-- ============================================

-- Autos cercanos: semanal (miércoles 10 AM)
SELECT cron.schedule(
  'nearby-cars-weekly',
  '0 10 * * 3',
  $$SELECT public.send_nearby_cars_notifications()$$
);

-- Vistas milestone: diario a las 11 AM
SELECT cron.schedule(
  'car-views-milestone-daily',
  '0 11 * * *',
  $$SELECT public.send_car_views_milestone_notification()$$
);

-- Recomendaciones: quincenal (días 7 y 21 de cada mes)
SELECT cron.schedule(
  'car-recommendations-biweekly',
  '0 10 7,21 * *',
  $$SELECT public.send_car_recommendations()$$
);

-- Tips para renters: quincenal (días 8 y 22)
SELECT cron.schedule(
  'renter-tips-biweekly',
  '0 10 8,22 * *',
  $$SELECT public.send_renter_tips()$$
);

-- Favoritos disponibles: semanal (viernes 10 AM)
SELECT cron.schedule(
  'favorite-available-weekly',
  '0 10 * * 5',
  $$SELECT public.send_favorite_car_available()$$
);


-- 9. NOTIFICACION REVISAR SOLICITUDES PENDIENTES (Para owners)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_pending_requests_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_rec RECORD;
  pending_count INTEGER;
  oldest_request TIMESTAMPTZ;
  hours_waiting INTEGER;
BEGIN
  -- Buscar owners con solicitudes pendientes
  FOR owner_rec IN
    SELECT
      c.owner_id,
      p.full_name,
      COUNT(DISTINCT b.id) as pending_count,
      MIN(b.created_at) as oldest_request
    FROM bookings b
    JOIN cars c ON c.id = b.car_id
    JOIN profiles p ON p.id = c.owner_id
    WHERE b.status = 'pending_owner_confirmation'
      AND b.created_at > NOW() - INTERVAL '48 hours'  -- Solo solicitudes de últimas 48h
    GROUP BY c.owner_id, p.full_name
    HAVING COUNT(DISTINCT b.id) > 0
  LOOP
    hours_waiting := EXTRACT(EPOCH FROM (NOW() - owner_rec.oldest_request)) / 3600;

    -- Notificar si pasaron más de 2 horas y no se notificó recientemente
    IF hours_waiting >= 2 AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = owner_rec.owner_id
        AND n.type = 'pending_requests_reminder'
        AND n.created_at > NOW() - INTERVAL '4 hours'
    ) THEN
      INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
      VALUES (
        owner_rec.owner_id,
        CASE
          WHEN owner_rec.pending_count = 1 THEN '📬 Tienes 1 solicitud pendiente'
          ELSE '📬 Tienes ' || owner_rec.pending_count || ' solicitudes pendientes'
        END,
        CASE
          WHEN hours_waiting >= 24 THEN '¡Llevan más de 24h esperando! Responde pronto para no perder la reserva.'
          WHEN hours_waiting >= 12 THEN 'Llevan ' || hours_waiting || 'h esperando. Los usuarios valoran respuestas rápidas.'
          ELSE 'Revisa y confirma las solicitudes de reserva.'
        END,
        'pending_requests_reminder',
        '/bookings?tab=requests',
        jsonb_build_object(
          'pending_count', owner_rec.pending_count,
          'hours_waiting', hours_waiting
        )
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Pending requests reminders sent successfully';
END;
$$;

-- Agregar tipo de notificación
DO $$
BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'pending_requests_reminder';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Cron: cada 4 horas
SELECT cron.schedule(
  'pending-requests-reminder',
  '0 */4 * * *',
  $$SELECT public.send_pending_requests_reminder()$$
);


-- 10. NOTIFICACION NUEVA SOLICITUD INMEDIATA (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_owner_new_booking_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  car_info RECORD;
  renter_info RECORD;
BEGIN
  -- Solo para nuevas reservas pendientes
  IF NEW.status = 'pending_owner_confirmation' THEN
    -- Obtener info del auto
    SELECT brand, model, owner_id INTO car_info
    FROM cars WHERE id = NEW.car_id;

    -- Obtener info del renter
    SELECT full_name INTO renter_info
    FROM profiles WHERE id = NEW.renter_id;

    -- Notificar al owner inmediatamente
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      car_info.owner_id,
      '🔔 Nueva solicitud de reserva',
      format('%s quiere reservar tu %s %s del %s al %s',
        COALESCE(renter_info.full_name, 'Un usuario'),
        car_info.brand,
        car_info.model,
        to_char(NEW.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM'),
        to_char(NEW.end_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM')
      ),
      'new_booking_for_owner',
      '/bookings/' || NEW.id,
      jsonb_build_object(
        'booking_id', NEW.id,
        'renter_name', renter_info.full_name,
        'car_brand', car_info.brand,
        'car_model', car_info.model
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_new_booking_notification ON bookings;
CREATE TRIGGER trigger_new_booking_notification
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'pending_owner_confirmation')
  EXECUTE FUNCTION public.notify_owner_new_booking_request();


-- ============================================
-- VERIFICAR TODOS LOS CRON JOBS
-- ============================================
SELECT jobname, schedule, active
FROM cron.job
ORDER BY jobname;
