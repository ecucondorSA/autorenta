-- ============================================================================
-- TRIGGER: Notificaciones automáticas para nuevos mensajes de chat
-- ============================================================================
-- Fecha: 2025-10-27
-- Propósito: Crear notificación en la tabla 'notifications' cuando un usuario
--            recibe un nuevo mensaje de chat.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_booking_car_title TEXT;
BEGIN
  -- Obtener nombre del remitente desde user_profiles
  SELECT full_name INTO v_sender_name
  FROM public.user_profiles
  WHERE id = NEW.sender_id
  LIMIT 1;

  -- Si no hay nombre, usar email del auth.users
  IF v_sender_name IS NULL THEN
    SELECT email INTO v_sender_name
    FROM auth.users
    WHERE id = NEW.sender_id;
  END IF;

  -- Si hay booking_id, obtener info del auto para contexto
  IF NEW.booking_id IS NOT NULL THEN
    SELECT c.title INTO v_booking_car_title
    FROM public.bookings b
    JOIN public.cars c ON c.id = b.car_id
    WHERE b.id = NEW.booking_id
    LIMIT 1;
  END IF;

  -- Crear notificación para el destinatario
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    cta_link,
    type,
    metadata
  )
  VALUES (
    NEW.recipient_id,
    'Nuevo mensaje',
    CASE
      WHEN v_booking_car_title IS NOT NULL THEN
        COALESCE(v_sender_name, 'Un usuario') || ' te envió un mensaje sobre ' || v_booking_car_title
      ELSE
        COALESCE(v_sender_name, 'Un usuario') || ' te envió un mensaje'
    END,
    CASE
      WHEN NEW.booking_id IS NOT NULL THEN '/bookings/' || NEW.booking_id
      WHEN NEW.car_id IS NOT NULL THEN '/cars/' || NEW.car_id
      ELSE NULL
    END,
    'new_chat_message',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', v_sender_name,
      'booking_id', NEW.booking_id,
      'car_id', NEW.car_id,
      'preview', LEFT(NEW.body, 100)
    )
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREAR TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_notify_new_chat_message ON public.messages;

CREATE TRIGGER trigger_notify_new_chat_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_chat_message();

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON FUNCTION public.notify_new_chat_message() IS
'Trigger function que crea una notificación en la tabla notifications cuando 
se inserta un nuevo mensaje en la tabla messages. Incluye información del 
remitente y contexto del booking/car.';

-- ============================================================================
-- TESTING
-- ============================================================================

-- Para probar, insertar un mensaje de prueba:
-- INSERT INTO messages (sender_id, recipient_id, booking_id, body)
-- VALUES (
--   'user-sender-uuid',
--   'user-recipient-uuid',
--   'booking-uuid',
--   'Hola, ¿está disponible el auto?'
-- );
--
-- Luego verificar:
-- SELECT * FROM notifications WHERE user_id = 'user-recipient-uuid' ORDER BY created_at DESC LIMIT 1;

-- ============================================================================
-- ROLLBACK (en caso necesario)
-- ============================================================================

-- DROP TRIGGER IF EXISTS trigger_notify_new_chat_message ON public.messages;
-- DROP FUNCTION IF EXISTS public.notify_new_chat_message();
