-- ===============================================
-- 📬 SISTEMA DE MENSAJERÍA - FIX
-- ===============================================
-- Arregla la tabla de mensajes y sus políticas RLS

-- 1. Crear tabla de mensajes si no existe
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: debe tener booking_id O car_id (no ambos)
  CONSTRAINT messages_reference_check CHECK (
    (booking_id IS NOT NULL AND car_id IS NULL) OR
    (booking_id IS NULL AND car_id IS NOT NULL)
  )
);

-- 2. Habilitar RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;

-- 4. Políticas RLS: Los usuarios pueden ver mensajes donde son sender o recipient
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id
  );

-- 5. Políticas RLS: Los usuarios pueden insertar mensajes donde son sender
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
  );

-- 6. Políticas RLS: Los usuarios pueden actualizar mensajes donde son recipient (para marcar como leído)
CREATE POLICY "messages_update_policy" ON public.messages
  FOR UPDATE
  USING (
    auth.uid() = recipient_id
  )
  WITH CHECK (
    auth.uid() = recipient_id
  );

-- 7. Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_car_id ON public.messages(car_id) WHERE car_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 8. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON public.messages;
CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- 9. Función para obtener conversaciones del usuario
CREATE OR REPLACE FUNCTION get_user_conversations(user_id UUID)
RETURNS TABLE (
  conversation_id TEXT,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  car_id UUID,
  car_brand TEXT,
  car_model TEXT,
  car_year INT,
  booking_id UUID,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_messages AS (
    SELECT DISTINCT ON (
      COALESCE(m.booking_id::TEXT, m.car_id::TEXT),
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END
    )
      m.id,
      m.booking_id,
      m.car_id,
      m.sender_id,
      m.recipient_id,
      m.body,
      m.created_at,
      m.read_at,
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END as other_user
    FROM messages m
    WHERE m.sender_id = user_id OR m.recipient_id = user_id
    ORDER BY 
      COALESCE(m.booking_id::TEXT, m.car_id::TEXT),
      CASE 
        WHEN m.sender_id = user_id THEN m.recipient_id
        ELSE m.sender_id
      END,
      m.created_at DESC
  )
  SELECT
    COALESCE(lm.booking_id::TEXT, lm.car_id::TEXT) || '_' || lm.other_user::TEXT as conversation_id,
    lm.other_user as other_user_id,
    COALESCE(p.full_name, 'Usuario') as other_user_name,
    p.avatar_url as other_user_avatar,
    lm.car_id,
    c.brand as car_brand,
    c.model as car_model,
    c.year as car_year,
    lm.booking_id,
    lm.body as last_message,
    lm.created_at as last_message_at,
    (
      SELECT COUNT(*)
      FROM messages m2
      WHERE m2.recipient_id = user_id
        AND m2.sender_id = lm.other_user
        AND (
          (m2.booking_id = lm.booking_id AND lm.booking_id IS NOT NULL) OR
          (m2.car_id = lm.car_id AND lm.car_id IS NOT NULL)
        )
        AND m2.read_at IS NULL
    ) as unread_count
  FROM latest_messages lm
  LEFT JOIN profiles p ON p.id = lm.other_user
  LEFT JOIN cars c ON c.id = lm.car_id
  ORDER BY lm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Habilitar realtime para mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

COMMENT ON TABLE public.messages IS 'Mensajes entre usuarios (booking o car)';
COMMENT ON FUNCTION get_user_conversations(UUID) IS 'Obtiene todas las conversaciones de un usuario con conteo de no leídos';
