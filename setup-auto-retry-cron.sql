-- =====================================================
-- CRON JOB: Retry Failed Deposits Automáticamente
-- =====================================================
-- Ejecuta cada 5 minutos el retry de depósitos pendientes
-- Esto asegura que TODOS los pagos se procesen eventualmente
-- incluso si el webhook de MercadoPago falla
-- =====================================================

-- PASO 1: Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- PASO 2: Crear función wrapper para llamar Edge Function
CREATE OR REPLACE FUNCTION trigger_retry_failed_deposits()
RETURNS void AS $$
DECLARE
  v_service_role_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';
  v_url TEXT := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-retry-failed-deposits';
  v_response TEXT;
BEGIN
  -- Llamar Edge Function usando net.http_post
  SELECT content::text INTO v_response
  FROM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  );

  -- Log del resultado
  RAISE NOTICE 'Retry function executed: %', v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 3: Eliminar job anterior si existe
SELECT cron.unschedule('retry-failed-deposits-every-5min');

-- PASO 4: Programar ejecución cada 5 minutos
SELECT cron.schedule(
  'retry-failed-deposits-every-5min',  -- Nombre del job
  '*/5 * * * *',                        -- Cada 5 minutos
  $$SELECT trigger_retry_failed_deposits()$$
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver todos los cron jobs:
SELECT * FROM cron.job;

-- Ver historial de ejecuciones (últimas 20):
SELECT
  jobid,
  runid,
  job_pid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- =====================================================
-- MONITOREO
-- =====================================================

-- Query para ver cuántos depósitos se procesan automáticamente:
SELECT
  DATE_TRUNC('hour', completed_at) as hour,
  COUNT(*) as deposits_completed,
  SUM(amount) as total_amount
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
  AND completed_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', completed_at)
ORDER BY hour DESC;

-- =====================================================
-- DESACTIVAR (si es necesario)
-- =====================================================

-- Para desactivar el cron job:
-- SELECT cron.unschedule('retry-failed-deposits-every-5min');
