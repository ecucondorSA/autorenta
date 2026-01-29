-- Tabla para debounce de mensajes WhatsApp
-- Almacena el timestamp del último mensaje por teléfono

CREATE TABLE IF NOT EXISTS public.whatsapp_debounce (
  phone TEXT PRIMARY KEY,
  last_timestamp BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para limpieza automática
CREATE INDEX IF NOT EXISTS idx_whatsapp_debounce_updated
ON whatsapp_debounce(updated_at);

-- Función para actualizar timestamp atómicamente y retornar si es el más nuevo
CREATE OR REPLACE FUNCTION public.whatsapp_debounce_set(
  p_phone TEXT,
  p_timestamp BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current BIGINT;
BEGIN
  -- Intentar insertar o actualizar
  INSERT INTO whatsapp_debounce (phone, last_timestamp, updated_at)
  VALUES (p_phone, p_timestamp, now())
  ON CONFLICT (phone) DO UPDATE
  SET last_timestamp = GREATEST(whatsapp_debounce.last_timestamp, EXCLUDED.last_timestamp),
      updated_at = now()
  RETURNING last_timestamp INTO v_current;

  -- Retorna true si nuestro timestamp es el actual (somos el más nuevo)
  RETURN v_current = p_timestamp;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un timestamp sigue siendo el último
CREATE OR REPLACE FUNCTION public.whatsapp_debounce_check(
  p_phone TEXT,
  p_timestamp BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current BIGINT;
BEGIN
  SELECT last_timestamp INTO v_current
  FROM whatsapp_debounce
  WHERE phone = p_phone;

  -- Retorna true si nuestro timestamp sigue siendo el último
  RETURN v_current IS NULL OR v_current = p_timestamp;
END;
$$ LANGUAGE plpgsql;

-- Limpiar registros viejos (más de 1 hora) - ejecutar con pg_cron
-- SELECT cron.schedule('cleanup-whatsapp-debounce', '*/30 * * * *',
--   $$DELETE FROM whatsapp_debounce WHERE updated_at < now() - interval '1 hour'$$);

COMMENT ON TABLE whatsapp_debounce IS 'Debounce para mensajes de WhatsApp - evita respuestas múltiples a ráfagas de mensajes';
