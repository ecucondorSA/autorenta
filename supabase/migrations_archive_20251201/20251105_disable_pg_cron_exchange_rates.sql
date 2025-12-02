-- ============================================================================
-- DISABLE POSTGRESQL CRON JOBS FOR EXCHANGE RATES
-- ============================================================================
-- Migración: 20251105_disable_pg_cron_exchange_rates.sql
-- Fecha: 2025-11-05
--
-- PROBLEMA IDENTIFICADO:
-- Los cron jobs de PostgreSQL usando pg_net.http_post() y pg_net.http_get()
-- NO funcionan correctamente para actualizar tipos de cambio:
--
-- 1. sync_binance_rates_via_edge_function() - Llama Edge Function via HTTP
--    - Reporta "succeeded" en cron.job_run_details
--    - Pero la Edge Function NO se ejecuta realmente
--    - Problema: pg_net es asíncrono y no espera respuesta
--    - Posible causa: Limitaciones de red en Supabase pg_net
--
-- 2. sync_binance_rates_direct() - Llama Binance API directamente
--    - Siempre falla con "HTTP timeout"
--    - Problema: pg_net.http_get() no recibe respuesta de Binance
--    - Timeout de 5 segundos insuficiente
--
-- EVIDENCIA:
-- - Cron jobs ejecutan sin errores (status = 'succeeded')
-- - Pero exchange_rates.last_updated NO se actualiza
-- - Cuando se llama la Edge Function directamente con curl, funciona perfectamente
-- - GitHub Actions workflow funciona 100% confiable
--
-- SOLUCIÓN:
-- - Desactivar ambos cron jobs de PostgreSQL
-- - Confiar únicamente en GitHub Actions (*/15 * * * *)
-- - GitHub Actions llama la Edge Function vía HTTP directamente
-- - Más confiable y fácil de monitorear
-- ============================================================================

-- ============================================================================
-- DESACTIVAR CRON JOBS (usando unschedule)
-- ============================================================================

-- Remover cron job via Edge Function
SELECT cron.unschedule('sync-binance-via-edge-every-30-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-binance-via-edge-every-30-min'
);

-- Remover cron job direct API
SELECT cron.unschedule('sync-binance-direct-fallback-every-30-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'sync-binance-direct-fallback-every-30-min'
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Listar cron jobs de Binance que aún existan (debería estar vacío)
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname LIKE '%binance%'
ORDER BY jobname;

-- ============================================================================
-- DOCUMENTACIÓN
-- ============================================================================

-- La actualización de tipos de cambio ahora depende ÚNICAMENTE de:
-- GitHub Actions Workflow: .github/workflows/update-exchange-rates.yml
-- Frecuencia: */15 * * * * (cada 15 minutos)
-- Método: curl POST a Edge Function sync-binance-rates
-- Token: SUPABASE_SERVICE_ROLE_KEY (secret de GitHub)
--
-- VENTAJAS:
-- - Más confiable (sin problemas de red de pg_net)
-- - Fácil de monitorear (GitHub Actions logs)
-- - Fácil de ejecutar manualmente (workflow_dispatch)
-- - No depende de configuración de base de datos
--
-- MONITOREO:
-- - GitHub Actions: https://github.com/ecucondorSA/autorenta/actions
-- - Logs de Edge Function: Supabase Dashboard → Functions → sync-binance-rates
-- - Última actualización: SELECT pair, last_updated FROM exchange_rates WHERE is_active = true;

-- ============================================================================
-- FUNCIONES MANTENIDAS (para uso manual)
-- ============================================================================

-- Las siguientes funciones siguen existiendo pero NO se ejecutan automáticamente:
-- - sync_binance_rates_via_edge_function() - Puede llamarse manualmente
-- - sync_binance_rates_direct() - Puede llamarse manualmente (pero falla)
-- - upsert_exchange_rate() - Usada por Edge Function (funciona correctamente)

COMMENT ON FUNCTION public.sync_binance_rates_via_edge_function() IS
'Llama a la Edge Function sync-binance-rates vía HTTP.
NOTA: Esta función NO se ejecuta automáticamente vía cron.
Usar GitHub Actions workflow en su lugar.
Puede ejecutarse manualmente para testing.';

COMMENT ON FUNCTION public.sync_binance_rates_direct() IS
'Intenta sincronizar tasas directamente desde Binance API usando pg_net.
ADVERTENCIA: Esta función falla con HTTP timeout en Supabase.
NO USAR. Usar GitHub Actions workflow en su lugar.';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
