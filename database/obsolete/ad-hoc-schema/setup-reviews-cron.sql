-- ============================================
-- CONFIGURACIÓN DE CRON JOBS PARA REVIEWS
-- Requiere extensión pg_cron
-- ============================================

-- Habilitar extensión pg_cron (solo si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- CRON JOB 1: Publicar reviews pendientes
-- Ejecuta diariamente a medianoche
-- ============================================

SELECT cron.schedule(
  'publish-pending-reviews-daily',
  '0 0 * * *', -- A medianoche todos los días
  $$
    SELECT publish_pending_reviews();
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Cron jobs para publicación automática de reviews';

-- ============================================
-- CRON JOB 2: Actualizar stats de usuarios
-- Ejecuta cada hora
-- ============================================

SELECT cron.schedule(
  'update-all-user-stats',
  '0 * * * *', -- Cada hora en punto
  $$
    DO $$
    DECLARE
      user_record RECORD;
    BEGIN
      FOR user_record IN
        SELECT DISTINCT user_id
        FROM user_stats
        WHERE updated_at < now() - INTERVAL '1 hour'
        LIMIT 100 -- Procesar por lotes
      LOOP
        PERFORM update_user_stats(user_record.user_id);
      END LOOP;
    END $$;
  $$
);

-- ============================================
-- CRON JOB 3: Limpiar reviews flaggeadas
-- Ejecuta semanalmente
-- ============================================

SELECT cron.schedule(
  'cleanup-flagged-reviews',
  '0 2 * * 0', -- Domingos a las 2am
  $$
    -- Ocultar reviews flaggeadas múltiples veces
    UPDATE reviews
    SET
      is_visible = false,
      status = 'hidden',
      moderation_status = 'rejected'
    WHERE is_flagged = true
    AND moderation_status = 'pending'
    AND flagged_at < now() - INTERVAL '7 days';
  $$
);

-- ============================================
-- VER CRON JOBS ACTIVOS
-- ============================================

-- Query para ver los cron jobs configurados
SELECT
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE jobname LIKE '%review%'
ORDER BY jobid;

-- ============================================
-- DESACTIVAR/ACTIVAR CRON JOBS
-- ============================================

-- Desactivar un job específico
-- SELECT cron.unschedule('publish-pending-reviews-daily');

-- Reactivar
-- SELECT cron.schedule(...); -- mismo comando de arriba

-- ============================================
-- ALTERNATIVA: Supabase Edge Functions
-- Si pg_cron no está disponible
-- ============================================

/*
-- Crear Edge Function para ejecutar via HTTP (cron externo)

// Archivo: supabase/functions/publish-pending-reviews/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseClient.rpc('publish_pending_reviews')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, published_count: data }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Configurar cron externo (ej: cron-job.org, EasyCron) para llamar a:
// POST https://your-project.supabase.co/functions/v1/publish-pending-reviews
// Header: Authorization: Bearer YOUR_ANON_KEY

*/

-- ============================================
-- LOGS Y MONITOREO
-- ============================================

-- Tabla para logs de cron jobs
CREATE TABLE IF NOT EXISTS cron_logs (
  id bigserial PRIMARY KEY,
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  message text,
  executed_at timestamptz DEFAULT now()
);

-- Función para registrar ejecución
CREATE OR REPLACE FUNCTION log_cron_execution(
  p_job_name text,
  p_status text,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cron_logs (job_name, status, message)
  VALUES (p_job_name, p_status, p_message);

  -- Limpiar logs antiguos (mantener solo últimos 30 días)
  DELETE FROM cron_logs
  WHERE executed_at < now() - INTERVAL '30 days';
END;
$$;

-- ============================================
-- TESTING MANUAL
-- ============================================

-- Ejecutar manualmente la publicación de reviews pendientes
SELECT publish_pending_reviews();

-- Ver reviews pendientes próximas a expirar
SELECT
  r.id,
  r.booking_id,
  r.reviewer_id,
  r.created_at,
  b.end_date,
  b.end_date + INTERVAL '14 days' - now() as time_until_publish
FROM reviews r
INNER JOIN bookings b ON r.booking_id = b.id
WHERE r.status = 'pending'
AND now() > b.end_date + INTERVAL '13 days'
ORDER BY b.end_date;

-- ============================================
-- SETUP COMPLETADO
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Cron jobs configurados para sistema de reviews';
  RAISE NOTICE '⏰ publish-pending-reviews-daily: Diario a medianoche';
  RAISE NOTICE '📊 update-all-user-stats: Cada hora';
  RAISE NOTICE '🧹 cleanup-flagged-reviews: Semanal (domingos 2am)';
END $$;
