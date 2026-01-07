-- ============================================
-- SISTEMA COMPLETO DE NOTIFICACIONES AUTOMATICAS
-- ============================================

-- 1. RECORDATORIO DE RESERVA PROXIMA (24h y 2h antes)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking RECORD;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Recordatorio 24 horas antes (para reservas que inician mañana)
  FOR booking IN
    SELECT
      b.id,
      b.renter_id,
      b.owner_id,
      b.start_at,
      b.end_at,
      c.brand,
      c.model,
      c.location_city,
      p.full_name as renter_name
    FROM bookings b
    JOIN cars c ON c.id = b.car_id
    JOIN profiles p ON p.id = b.renter_id
    WHERE b.status = 'confirmed'
      AND b.start_at > NOW()
      AND b.start_at <= NOW() + INTERVAL '24 hours'
      AND b.start_at > NOW() + INTERVAL '23 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = b.renter_id
          AND n.type = 'booking_reminder_24h'
          AND n.metadata->>'booking_id' = b.id::text
      )
  LOOP
    -- Notificar al RENTER
    notification_title := '🚗 Tu viaje comienza mañana';
    notification_body := format(
      'Tu reserva del %s %s en %s comienza mañana a las %s. ¡Prepara tus documentos!',
      booking.brand,
      booking.model,
      booking.location_city,
      to_char(booking.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI')
    );

    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.renter_id,
      notification_title,
      notification_body,
      'booking_reminder_24h',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );

    -- Notificar al OWNER
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.owner_id,
      '📅 Reserva mañana',
      format('%s retirará tu %s %s mañana a las %s',
        booking.renter_name, booking.brand, booking.model,
        to_char(booking.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI')),
      'booking_reminder_24h',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );
  END LOOP;

  -- Recordatorio 2 horas antes
  FOR booking IN
    SELECT
      b.id,
      b.renter_id,
      b.owner_id,
      b.start_at,
      c.brand,
      c.model,
      c.location_city,
      c.location_address
    FROM bookings b
    JOIN cars c ON c.id = b.car_id
    WHERE b.status = 'confirmed'
      AND b.start_at > NOW()
      AND b.start_at <= NOW() + INTERVAL '2 hours'
      AND b.start_at > NOW() + INTERVAL '1 hour 50 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = b.renter_id
          AND n.type = 'booking_reminder_2h'
          AND n.metadata->>'booking_id' = b.id::text
      )
  LOOP
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.renter_id,
      '⏰ Tu viaje comienza en 2 horas',
      format('Retira el %s %s en %s. Dirección: %s',
        booking.brand, booking.model, booking.location_city,
        COALESCE(booking.location_address, 'Ver en la app')),
      'booking_reminder_2h',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );

    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.owner_id,
      '⏰ Entrega en 2 horas',
      format('Prepara tu %s %s para la entrega', booking.brand, booking.model),
      'booking_reminder_2h',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );
  END LOOP;

  RAISE NOTICE 'Booking reminders sent successfully';
END;
$$;


-- 2. VENCIMIENTO DE DOCUMENTOS (7, 3, 1 días antes)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_document_expiry_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc RECORD;
  days_until_expiry INTEGER;
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Verificar licencias de conducir por vencer
  FOR doc IN
    SELECT
      p.id as user_id,
      p.full_name,
      p.driver_license_expiry,
      (p.driver_license_expiry::date - CURRENT_DATE) as days_left
    FROM profiles p
    WHERE p.driver_license_expiry IS NOT NULL
      AND p.driver_license_expiry::date >= CURRENT_DATE
      AND p.driver_license_expiry::date <= CURRENT_DATE + INTERVAL '7 days'
  LOOP
    days_until_expiry := doc.days_left;

    -- Solo notificar en días específicos: 7, 3, 1
    IF days_until_expiry NOT IN (7, 3, 1, 0) THEN
      CONTINUE;
    END IF;

    -- Verificar que no se haya enviado ya esta notificación
    IF EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = doc.user_id
        AND n.type = 'document_expiry_license'
        AND n.metadata->>'days_left' = days_until_expiry::text
        AND n.created_at > NOW() - INTERVAL '20 hours'
    ) THEN
      CONTINUE;
    END IF;

    IF days_until_expiry = 0 THEN
      notification_title := '🚨 Tu licencia venció HOY';
      notification_body := 'Tu licencia de conducir venció hoy. No podrás realizar reservas hasta renovarla.';
    ELSIF days_until_expiry = 1 THEN
      notification_title := '⚠️ Tu licencia vence MAÑANA';
      notification_body := 'Renueva tu licencia de conducir antes de que venza para no perder reservas.';
    ELSIF days_until_expiry = 3 THEN
      notification_title := '📋 Tu licencia vence en 3 días';
      notification_body := 'Recuerda renovar tu licencia de conducir pronto.';
    ELSE
      notification_title := '📋 Tu licencia vence en 7 días';
      notification_body := 'Tu licencia de conducir vence la próxima semana. Planifica su renovación.';
    END IF;

    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      doc.user_id,
      notification_title,
      notification_body,
      'document_expiry_license',
      '/profile/verification',
      jsonb_build_object('days_left', days_until_expiry, 'document_type', 'license')
    );
  END LOOP;

  -- Verificar verificaciones de perfil (DNI) por vencer (si aplica)
  -- La mayoría de DNIs no vencen, pero podemos verificar si el documento fue subido hace mucho

  RAISE NOTICE 'Document expiry reminders sent successfully';
END;
$$;


-- 3. OWNERS SIN ACTIVIDAD (Semanal)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_inactive_owner_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner RECORD;
BEGIN
  -- Buscar owners con autos publicados pero sin reservas en 14+ días
  FOR owner IN
    SELECT DISTINCT
      c.owner_id,
      p.full_name,
      COUNT(DISTINCT c.id) as car_count,
      MAX(b.created_at) as last_booking_date,
      EXTRACT(days FROM NOW() - MAX(b.created_at))::integer as days_since_booking
    FROM cars c
    JOIN profiles p ON p.id = c.owner_id
    LEFT JOIN bookings b ON b.car_id = c.id AND b.status NOT IN ('cancelled', 'rejected')
    WHERE c.status = 'active'
    GROUP BY c.owner_id, p.full_name
    HAVING (
      MAX(b.created_at) IS NULL
      OR MAX(b.created_at) < NOW() - INTERVAL '14 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = c.owner_id
        AND n.type = 'owner_inactive_reminder'
        AND n.created_at > NOW() - INTERVAL '6 days'
    )
  LOOP
    IF owner.last_booking_date IS NULL THEN
      INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
      VALUES (
        owner.owner_id,
        '🚗 ¡Tu auto te está esperando!',
        format('Tienes %s auto(s) publicado(s) sin reservas aún. Optimiza tu precio o mejora tus fotos para atraer más clientes.', owner.car_count),
        'owner_inactive_reminder',
        '/cars/my',
        jsonb_build_object('car_count', owner.car_count, 'days_inactive', 0)
      );
    ELSE
      INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
      VALUES (
        owner.owner_id,
        '📊 Han pasado ' || owner.days_since_booking || ' días sin reservas',
        'Considera ajustar tu precio o aumentar la disponibilidad de tu calendario para recibir más solicitudes.',
        'owner_inactive_reminder',
        '/cars/my',
        jsonb_build_object('car_count', owner.car_count, 'days_inactive', owner.days_since_booking)
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Inactive owner reminders sent successfully';
END;
$$;


-- 4. TIPS DE OPTIMIZACION (Quincenal)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_optimization_tips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner RECORD;
  tip_index INTEGER;
  tips TEXT[] := ARRAY[
    '💡 Los autos con 5+ fotos de calidad reciben 3x más reservas. ¿Ya subiste todas las fotos?',
    '📸 Las fotos con buena iluminación aumentan las reservas un 40%. Considera actualizar tus imágenes.',
    '💰 Los precios competitivos generan más reservas. Revisa los precios de autos similares en tu zona.',
    '📅 Mantén tu calendario actualizado. Los autos con disponibilidad clara reciben más consultas.',
    '⭐ Responde rápido a las consultas. Los owners que responden en <1h tienen 2x más reservas.',
    '🎯 Completa tu perfil al 100%. Los perfiles verificados generan más confianza.',
    '🚗 Ofrece extras como GPS o sillas para niños. Pueden aumentar tus ganancias un 15%.',
    '📍 Una ubicación céntrica o cerca de aeropuertos/terminales atrae más clientes.'
  ];
BEGIN
  -- Seleccionar un tip diferente cada vez basado en el día del año
  tip_index := (EXTRACT(doy FROM CURRENT_DATE)::integer % array_length(tips, 1)) + 1;

  -- Enviar tip a owners activos que no recibieron tip recientemente
  FOR owner IN
    SELECT DISTINCT c.owner_id
    FROM cars c
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = c.owner_id
          AND n.type = 'optimization_tip'
          AND n.created_at > NOW() - INTERVAL '13 days'
      )
    LIMIT 100  -- Limitar para no sobrecargar
  LOOP
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      owner.owner_id,
      '🎯 Tip para aumentar tus reservas',
      tips[tip_index],
      'optimization_tip',
      '/cars/my',
      jsonb_build_object('tip_index', tip_index)
    );
  END LOOP;

  RAISE NOTICE 'Optimization tips sent successfully (tip #%)', tip_index;
END;
$$;


-- 5. NOTIFICACION FIN DE RESERVA (para review)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_booking_completion_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking RECORD;
BEGIN
  -- Reservas que terminaron hace 1 hora y no tienen review
  FOR booking IN
    SELECT
      b.id,
      b.renter_id,
      b.owner_id,
      b.end_at,
      c.brand,
      c.model,
      p_renter.full_name as renter_name,
      p_owner.full_name as owner_name
    FROM bookings b
    JOIN cars c ON c.id = b.car_id
    JOIN profiles p_renter ON p_renter.id = b.renter_id
    JOIN profiles p_owner ON p_owner.id = b.owner_id
    WHERE b.status = 'in_progress'
      AND b.end_at < NOW()
      AND b.end_at > NOW() - INTERVAL '2 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = b.renter_id
          AND n.type = 'booking_ended_review'
          AND n.metadata->>'booking_id' = b.id::text
      )
  LOOP
    -- Notificar al RENTER para que deje review
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.renter_id,
      '⭐ ¿Cómo estuvo tu viaje?',
      format('Tu reserva del %s %s ha finalizado. Dejá tu reseña para ayudar a otros usuarios.',
        booking.brand, booking.model),
      'booking_ended_review',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );

    -- Notificar al OWNER
    INSERT INTO notifications (user_id, title, body, type, cta_link, metadata)
    VALUES (
      booking.owner_id,
      '✅ Reserva finalizada',
      format('La reserva de %s ha terminado. Confirma la devolución y deja tu reseña.', booking.renter_name),
      'booking_ended_review',
      '/bookings/' || booking.id,
      jsonb_build_object('booking_id', booking.id)
    );
  END LOOP;

  RAISE NOTICE 'Booking completion reminders sent successfully';
END;
$$;


-- ============================================
-- CONFIGURAR CRON JOBS
-- ============================================

-- Recordatorios de reserva: cada 30 minutos
SELECT cron.schedule(
  'booking-reminders-every-30min',
  '*/30 * * * *',
  $$SELECT public.send_booking_reminders()$$
);

-- Vencimiento documentos: diario a las 10 AM
SELECT cron.schedule(
  'document-expiry-daily',
  '0 10 * * *',
  $$SELECT public.send_document_expiry_reminders()$$
);

-- Owners inactivos: semanal (lunes 11 AM)
SELECT cron.schedule(
  'inactive-owners-weekly',
  '0 11 * * 1',
  $$SELECT public.send_inactive_owner_reminders()$$
);

-- Tips de optimización: quincenal (1 y 15 de cada mes, 10 AM)
SELECT cron.schedule(
  'optimization-tips-biweekly',
  '0 10 1,15 * *',
  $$SELECT public.send_optimization_tips()$$
);

-- Fin de reserva/review: cada hora
SELECT cron.schedule(
  'booking-completion-hourly',
  '0 * * * *',
  $$SELECT public.send_booking_completion_reminders()$$
);


-- ============================================
-- VERIFICAR CRON JOBS CREADOS
-- ============================================
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE '%booking%'
   OR jobname LIKE '%document%'
   OR jobname LIKE '%inactive%'
   OR jobname LIKE '%optimization%'
ORDER BY jobname;
