-- ============================================================================
-- AUTO-SYNC BINANCE EXCHANGE RATES EVERY 15 MINUTES
-- ============================================================================
-- Migración para configurar actualización automática de tasas de cambio desde Binance
-- Frecuencia: Cada 15 minutos
-- Edge Function: sync-binance-rates
-- ============================================================================

-- Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensión pg_net para hacer HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- FUNCIÓN: sync_binance_rates_via_edge_function
-- ============================================================================
-- Llama a la Edge Function sync-binance-rates para actualizar tasas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_binance_rates_via_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_response_id bigint;
BEGIN
  -- URL de tu proyecto Supabase + Edge Function
  -- IMPORTANTE: Reemplazar con tu URL real
  v_function_url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/sync-binance-rates';

  -- Service role key desde variables de entorno
  -- NOTA: En producción, la función ya tiene acceso al service role key
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Hacer request HTTP POST a la Edge Function usando pg_net
  SELECT INTO v_response_id
    net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(v_service_role_key, '')
      ),
      body := '{}'::jsonb
    );

  -- Log del request
  RAISE NOTICE 'Binance rates sync initiated. Response ID: %', v_response_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE WARNING 'Error syncing Binance rates: % %', SQLERRM, SQLSTATE;
END;
$$;

-- ============================================================================
-- COMENTARIO DE LA FUNCIÓN
-- ============================================================================

COMMENT ON FUNCTION public.sync_binance_rates_via_edge_function() IS
'Llama a la Edge Function sync-binance-rates para actualizar tasas de cambio desde Binance API.
Se ejecuta automáticamente cada 15 minutos via pg_cron.';

-- ============================================================================
-- CONFIGURAR CRON JOB: Cada 15 minutos
-- ============================================================================

-- Primero, eliminar cualquier job existente con el mismo nombre
SELECT cron.unschedule('sync-binance-rates-every-15-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-binance-rates-every-15-min'
);

-- Crear nuevo cron job: cada 15 minutos
SELECT cron.schedule(
  'sync-binance-rates-every-15-min',     -- Nombre del job
  '*/15 * * * *',                        -- Cron expression (cada 15 minutos)
  $$SELECT public.sync_binance_rates_via_edge_function();$$
);

-- ============================================================================
-- VERIFICACIÓN: Mostrar jobs activos
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname = 'sync-binance-rates-every-15-min';

-- ============================================================================
-- TRIGGER INICIAL: Ejecutar inmediatamente
-- ============================================================================

-- Ejecutar una vez al momento de la migración para poblar datos
SELECT public.sync_binance_rates_via_edge_function();

-- ============================================================================
-- NOTAS DE USO
-- ============================================================================

-- Ver historial de ejecuciones:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-binance-rates-every-15-min')
-- ORDER BY start_time DESC LIMIT 10;

-- Desactivar temporalmente:
-- UPDATE cron.job SET active = false WHERE jobname = 'sync-binance-rates-every-15-min';

-- Reactivar:
-- UPDATE cron.job SET active = true WHERE jobname = 'sync-binance-rates-every-15-min';

-- Eliminar por completo:
-- SELECT cron.unschedule('sync-binance-rates-every-15-min');

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
