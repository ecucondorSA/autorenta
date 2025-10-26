-- =====================================================
-- CONFIGURACIÓN CRON JOBS PARA SUPABASE
-- Procesos contables automáticos periódicos
-- =====================================================

-- Habilitar extensión pg_cron si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- JOB 1: Cierre Diario (23:59 todos los días)
-- =====================================================

SELECT cron.schedule(
  'accounting-daily-close',
  '59 23 * * *',
  $$
  SELECT * FROM accounting_daily_close();
  $$
);

COMMENT ON SCHEMA cron IS 'Job: accounting-daily-close - Cierre contable diario a las 23:59';

-- =====================================================
-- JOB 2: Reconciliación Wallet (cada 6 horas)
-- =====================================================

SELECT cron.schedule(
  'accounting-wallet-reconciliation',
  '0 */6 * * *',
  $$
  -- Ejecutar reconciliación
  WITH recon AS (
    SELECT * FROM accounting_wallet_reconciliation()
  )
  -- Si hay discrepancia, registrar alerta
  INSERT INTO system_alerts (type, severity, message, metadata)
  SELECT 
    'accounting_discrepancy',
    CASE 
      WHEN difference < 1 THEN 'warning'
      WHEN difference < 10 THEN 'high'
      ELSE 'critical'
    END,
    'Discrepancia en reconciliación wallet: ' || difference::text,
    jsonb_build_object(
      'accounting_balance', accounting_balance,
      'wallet_balance', wallet_balance,
      'difference', difference
    )
  FROM recon
  WHERE status = 'discrepancy';
  $$
);

-- =====================================================
-- JOB 3: Auditoría de Integridad (lunes 2am)
-- =====================================================

SELECT cron.schedule(
  'accounting-integrity-audit',
  '0 2 * * 1',
  $$
  -- Ejecutar auditoría
  WITH audit AS (
    SELECT * FROM accounting_integrity_audit()
  )
  -- Registrar fallos
  INSERT INTO system_alerts (type, severity, message, metadata)
  SELECT 
    'accounting_integrity_failure',
    'critical',
    'Fallo en auditoría: ' || check_name,
    jsonb_build_object(
      'check_name', check_name,
      'details', details
    )
  FROM audit
  WHERE passed = FALSE;
  $$
);

-- =====================================================
-- JOB 4: Expirar Provisiones FGO antiguas (mensual)
-- =====================================================

SELECT cron.schedule(
  'accounting-expire-old-provisions',
  '0 3 1 * *',
  $$
  -- Liberar provisiones de bookings completados hace más de 90 días
  WITH old_bookings AS (
    SELECT id 
    FROM bookings 
    WHERE status = 'completed' 
      AND updated_at < NOW() - INTERVAL '90 days'
  )
  SELECT accounting_release_fgo_provision(id)
  FROM old_bookings;
  $$
);

-- =====================================================
-- JOB 5: Cierre Mensual Automático (día 1 a las 3am)
-- =====================================================

SELECT cron.schedule(
  'accounting-monthly-close',
  '0 3 1 * *',
  $$
  SELECT accounting_monthly_close(
    EXTRACT(YEAR FROM (CURRENT_DATE - INTERVAL '1 month'))::INTEGER,
    EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '1 month'))::INTEGER
  );
  $$
);

-- =====================================================
-- TABLA: Alertas del Sistema (crear si no existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_alerts_type ON system_alerts(type);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved ON system_alerts(resolved);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at DESC);

COMMENT ON TABLE system_alerts IS 'Alertas generadas por procesos automáticos del sistema';

-- =====================================================
-- FUNCIÓN: Ver estado de jobs programados
-- =====================================================

CREATE OR REPLACE FUNCTION accounting_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jobname::TEXT,
    schedule::TEXT,
    last_run_start_time,
    CASE 
      WHEN schedule ~ '^\d+' THEN 
        last_run_start_time + 
        (schedule || ' minutes')::INTERVAL
      ELSE 
        NULL
    END as next_run,
    CASE 
      WHEN last_run_status = 'succeeded' THEN 'OK'
      WHEN last_run_status = 'failed' THEN 'FAILED'
      ELSE 'UNKNOWN'
    END::TEXT
  FROM cron.job_run_details
  WHERE jobname LIKE 'accounting%'
  ORDER BY last_run_start_time DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Resumen de Alertas No Resueltas
-- =====================================================

CREATE OR REPLACE VIEW accounting_active_alerts AS
SELECT
  type,
  severity,
  COUNT(*) as alert_count,
  MAX(created_at) as latest_alert,
  MIN(created_at) as oldest_alert
FROM system_alerts
WHERE resolved = FALSE
  AND type LIKE 'accounting%'
GROUP BY type, severity
ORDER BY 
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END,
  alert_count DESC;

-- =====================================================
-- FUNCIÓN: Resolver alerta manualmente
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_alert(
  p_alert_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE system_alerts
  SET 
    resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    metadata = COALESCE(metadata, '{}'::jsonb) || 
               jsonb_build_object('resolution_notes', p_resolution_notes)
  WHERE id = p_alert_id
    AND resolved = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERMISOS
-- =====================================================

-- Solo admins pueden ver alertas
CREATE POLICY system_alerts_admin_only
  ON system_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver jobs programados
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE 'accounting%';

-- Ver último estado de ejecución
SELECT * FROM accounting_cron_status();

-- Ver alertas activas
SELECT * FROM accounting_active_alerts;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON FUNCTION accounting_cron_status IS 'Muestra el estado de los jobs contables programados';
COMMENT ON FUNCTION resolve_alert IS 'Marca una alerta como resuelta con notas opcionales';
COMMENT ON VIEW accounting_active_alerts IS 'Resumen de alertas contables no resueltas';
