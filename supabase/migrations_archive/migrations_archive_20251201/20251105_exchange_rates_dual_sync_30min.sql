-- ============================================================================
-- SISTEMA DUAL DE SINCRONIZACIÓN DE TASAS DE CAMBIO - 30 MINUTOS
-- ============================================================================
-- Migración: 20251105_exchange_rates_dual_sync_30min.sql
--
-- OBJETIVO:
--   Implementar sistema triple redundante para actualización de tipos de cambio:
--   1. GitHub Actions (*/30) → Edge Function (cada 30 min, minutos 00 y 30)
--   2. PostgreSQL Cron HTTP (7,37) → Edge Function (offset +7 min)
--   3. PostgreSQL Cron Direct (22,52) → Binance API directa (fallback +15 min)
--
-- BENEFICIOS:
--   - Triple redundancia: Si un sistema falla, otros continúan
--   - Detección rápida: Máximo 15 min sin actualización = alerta
--   - Sin race conditions: Offsets escalonados evitan escrituras simultáneas
--   - Alta disponibilidad: 99.9% uptime esperado
-- ============================================================================

-- ============================================================================
-- PASO 1: Actualizar función via Edge Function con token correcto
-- ============================================================================
-- La función actual puede tener token NULL, actualizamos con token hardcodeado

CREATE OR REPLACE FUNCTION public.sync_binance_rates_via_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_response_id bigint;
BEGIN
  v_function_url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/sync-binance-rates';

  -- Token via settings/vault (NO hardcodear secretos)
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE WARNING 'service_role_key no configurada; abortando sync via Edge Function';
    RETURN;
  END IF;

  SELECT INTO v_response_id
    net.http_post(
      url := v_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := '{}'::jsonb
    );

  RAISE NOTICE 'Binance rates sync via Edge Function initiated. Response ID: %', v_response_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error syncing Binance rates via Edge Function: % %', SQLERRM, SQLSTATE;
END;
$$;

COMMENT ON FUNCTION public.sync_binance_rates_via_edge_function() IS
'Llama a la Edge Function sync-binance-rates vía HTTP para actualizar tasas de cambio.
Parte del sistema dual con sync_binance_rates_direct() como fallback.
Ejecutado por GitHub Actions (cada 30 min) y PostgreSQL cron (7,37 min con offset).';

-- ============================================================================
-- PASO 2: Desactivar cron job anterior de 15 minutos
-- ============================================================================

UPDATE cron.job
SET active = false
WHERE jobname IN ('sync-binance-rates-every-15-min', 'sync-binance-direct-every-15-min');

-- ============================================================================
-- PASO 3: Crear cron job primario - Edge Function cada 30 min (offset +7)
-- ============================================================================
-- Offset +7 minutos respecto a GitHub Actions para evitar conflictos
-- GitHub Actions: 00, 30 → PostgreSQL: 07, 37

-- Eliminar si existe
SELECT cron.unschedule('sync-binance-via-edge-every-30-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-binance-via-edge-every-30-min'
);

-- Crear nuevo job
SELECT cron.schedule(
  'sync-binance-via-edge-every-30-min',
  '7,37 * * * *',  -- Minutos 7 y 37 de cada hora (offset +7 de GitHub Actions)
  $$SELECT public.sync_binance_rates_via_edge_function();$$
);

-- ============================================================================
-- PASO 4: Crear cron job fallback - Sync directo cada 30 min (offset +22)
-- ============================================================================
-- Fallback con sync directo a Binance API sin Edge Function
-- Ejecuta +15 min después del sync via Edge Function
-- GitHub: 00,30 → Edge cron: 07,37 → Direct fallback: 22,52

-- Eliminar si existe
SELECT cron.unschedule('sync-binance-direct-fallback-every-30-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-binance-direct-fallback-every-30-min'
);

-- Crear job de fallback
SELECT cron.schedule(
  'sync-binance-direct-fallback-every-30-min',
  '22,52 * * * *',  -- Minutos 22 y 52 de cada hora (offset +15 de via-edge)
  $$SELECT public.sync_binance_rates_direct();$$
);

-- ============================================================================
-- PASO 5: Verificación de configuración
-- ============================================================================

-- Mostrar jobs activos relacionados con Binance
SELECT
  jobid,
  jobname,
  schedule,
  active,
  CASE
    WHEN jobname LIKE '%30-min%' THEN '✅ ACTIVO'
    WHEN jobname LIKE '%15-min%' THEN '❌ DESACTIVADO'
    ELSE 'DESCONOCIDO'
  END as estado
FROM cron.job
WHERE jobname LIKE '%binance%'
ORDER BY jobname;

-- ============================================================================
-- PASO 6: Crear tabla de monitoreo (opcional)
-- ============================================================================

-- Tabla para rastrear sincronizaciones y detectar fallos
CREATE TABLE IF NOT EXISTS exchange_rate_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_method text NOT NULL CHECK (sync_method IN ('github_actions', 'cron_edge_function', 'cron_direct', 'manual')),
  pair text NOT NULL,
  binance_rate numeric,
  platform_rate numeric,
  success boolean NOT NULL,
  error_message text,
  execution_time_ms integer,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON exchange_rate_sync_log(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_success ON exchange_rate_sync_log(success, synced_at DESC);

COMMENT ON TABLE exchange_rate_sync_log IS
'Registro de todas las sincronizaciones de tipos de cambio.
Útil para monitoreo, alertas y debugging.';

-- ============================================================================
-- PASO 7: Ejecutar sincronización inmediata para verificar
-- ============================================================================

-- Ejecutar ambos métodos para poblar datos
SELECT public.sync_binance_rates_via_edge_function();
-- Esperar 2 segundos para evitar race condition
SELECT pg_sleep(2);
SELECT public.sync_binance_rates_direct();

-- ============================================================================
-- PASO 8: Verificar última actualización
-- ============================================================================

SELECT
  pair,
  binance_rate,
  platform_rate,
  margin_percent,
  last_updated,
  EXTRACT(EPOCH FROM (now() - last_updated)) / 60 AS minutes_ago,
  is_active
FROM exchange_rates
WHERE is_active = true
ORDER BY pair;

-- ============================================================================
-- NOTAS DE OPERACIÓN
-- ============================================================================

-- Ver historial de ejecuciones del cron job primario:
-- SELECT jobid, runid, status, return_message, start_time, end_time
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-binance-via-edge-every-30-min')
-- ORDER BY start_time DESC LIMIT 10;

-- Ver historial del cron job fallback:
-- SELECT jobid, runid, status, return_message, start_time, end_time
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'sync-binance-direct-fallback-every-30-min')
-- ORDER BY start_time DESC LIMIT 10;

-- Desactivar temporalmente el sistema:
-- UPDATE cron.job SET active = false WHERE jobname LIKE '%binance%30-min%';

-- Reactivar:
-- UPDATE cron.job SET active = true WHERE jobname LIKE '%binance%30-min%';

-- Monitorear última actualización (alerta si > 60 min):
-- SELECT
--   pair,
--   last_updated,
--   EXTRACT(EPOCH FROM (now() - last_updated)) / 60 AS minutes_since_update,
--   CASE
--     WHEN EXTRACT(EPOCH FROM (now() - last_updated)) > 3600 THEN '🚨 ALERTA: >60 min sin actualizar'
--     WHEN EXTRACT(EPOCH FROM (now() - last_updated)) > 1800 THEN '⚠️ WARNING: >30 min sin actualizar'
--     ELSE '✅ OK'
--   END AS status
-- FROM exchange_rates
-- WHERE is_active = true;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
