-- 2025-11-17: Añadir columna event_id y índice único a mp_webhook_logs
-- Se añade la columna event_id (x-request-id) para soportar deduplicación
-- y se crea un índice único sobre event_id (siempre que no haya valores duplicados existentes).

ALTER TABLE IF EXISTS mp_webhook_logs
  ADD COLUMN IF NOT EXISTS event_id TEXT;

-- Índice único para deduplicación; si existen filas duplicadas esto fallará y deberemos
-- limpiar datos manualmente antes de aplicar. El índice se crea sólo si no existe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_webhook_logs_event_id_unique ON mp_webhook_logs (event_id);
