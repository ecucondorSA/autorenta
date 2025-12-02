-- ============================================
-- MIGRATION: Configure Payout Monitoring Cron Job
-- Date: 2025-11-13
-- Purpose: Ejecutar monitor-pending-payouts cada hora
-- ============================================

-- Habilitar pg_cron extension (si no está habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar job existente si existe (para re-deployment)
SELECT cron.unschedule('monitor-pending-payouts-hourly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'
);

-- Crear cron job para ejecutar cada hora
-- Formato: minuto hora día mes día_semana
-- '0 * * * *' = cada hora en el minuto 0
SELECT cron.schedule(
  'monitor-pending-payouts-hourly', -- nombre del job
  '0 * * * *',                       -- cada hora
  $$
  SELECT net.http_post(
    url := 'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitor-pending-payouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificar que el job fue creado
SELECT jobid, schedule, command, nodename, nodeport, database, username, active
FROM cron.job
WHERE jobname = 'monitor-pending-payouts-hourly';

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
--
-- El cron job necesita el service_role_key para autenticarse.
-- Este debe estar configurado como database setting:
--
-- ALTER DATABASE postgres SET app.settings.service_role_key TO 'your-service-role-key';
--
-- O usando Supabase Vault (más seguro):
-- ALTER DATABASE postgres SET app.settings.service_role_key TO 'vault://service_role_key';
--
-- Para ejecutar esta configuración, ejecuta desde la consola SQL de Supabase:
--
-- SELECT vault.create_secret('your-actual-service-role-key', 'service_role_key');
-- ALTER DATABASE postgres SET app.settings.service_role_key TO 'vault://service_role_key';
--
-- ============================================

-- Tabla para logging de ejecuciones del cron (opcional pero útil)
CREATE TABLE IF NOT EXISTS cron_execution_log (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT,
  response JSONB,
  error TEXT
);

-- Función para loggear ejecuciones
CREATE OR REPLACE FUNCTION log_cron_execution(
  p_job_name TEXT,
  p_status TEXT,
  p_response JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO cron_execution_log (job_name, status, response, error)
  VALUES (p_job_name, p_status, p_response, p_error);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON cron_execution_log TO authenticated;
GRANT EXECUTE ON FUNCTION log_cron_execution TO service_role;

-- ============================================
-- TESTING
-- ============================================

-- Para probar manualmente el job:
-- SELECT cron.schedule_in_database(
--   'test-monitor-payouts',
--   '* * * * *',  -- cada minuto (solo para test)
--   $$SELECT net.http_post('https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/monitor-pending-payouts', ...)$$,
--   'postgres'
-- );

-- Para ver el historial de ejecuciones del cron:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly')
-- ORDER BY start_time DESC LIMIT 10;

-- Para ejecutar inmediatamente (sin esperar a la hora):
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'),
--   schedule := '* * * * *'  -- cambia a cada minuto temporalmente
-- );
-- -- Espera 1 minuto
-- -- Luego restaura:
-- SELECT cron.alter_job(
--   job_id := (SELECT jobid FROM cron.job WHERE jobname = 'monitor-pending-payouts-hourly'),
--   schedule := '0 * * * *'  -- vuelve a cada hora
-- );

COMMENT ON TABLE cron_execution_log IS 'Log de ejecuciones del cron job de monitoring';
