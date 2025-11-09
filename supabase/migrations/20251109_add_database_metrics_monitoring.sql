-- ============================================================================
-- Migration: Add automatic database metrics monitoring
-- ============================================================================
-- Date: 2025-11-09
-- Purpose: Automatically monitor database metrics (CPU, Memory, Storage, Connections)
-- Related: Issue #1 - Día 1: Seguridad y Deployment Crítico
-- ============================================================================

-- ============================================================================
-- PART 1: Function to check database metrics and create alerts
-- ============================================================================

CREATE OR REPLACE FUNCTION monitoring_check_database_metrics()
RETURNS void AS $$
DECLARE
  v_db_size_bytes BIGINT;
  v_db_size_mb NUMERIC;
  v_active_connections INTEGER;
  v_max_connections INTEGER;
  v_connection_percent NUMERIC;
  v_storage_total_bytes BIGINT;
  v_storage_total_mb NUMERIC;
  v_alert_id UUID;
BEGIN
  -- Get database size
  SELECT pg_database_size('postgres') INTO v_db_size_bytes;
  v_db_size_mb := ROUND(v_db_size_bytes / 1024.0 / 1024.0, 2);

  -- Get connection metrics
  SELECT 
    (SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres'),
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')
  INTO v_active_connections, v_max_connections;
  
  v_connection_percent := ROUND(
    (v_active_connections::numeric / v_max_connections::numeric) * 100, 
    2
  );

  -- Get total storage (public schema)
  SELECT COALESCE(SUM(pg_total_relation_size('public.'||tablename)), 0)
  INTO v_storage_total_bytes
  FROM pg_tables
  WHERE schemaname = 'public';
  
  v_storage_total_mb := ROUND(v_storage_total_bytes / 1024.0 / 1024.0, 2);

  -- Check connection usage > 80%
  IF v_connection_percent > 80 THEN
    -- Check if alert already exists
    IF NOT EXISTS (
      SELECT 1 FROM monitoring_alerts 
      WHERE alert_type = 'database_connections_high' 
      AND status = 'active'
    ) THEN
      SELECT monitoring_create_alert(
        'database_connections_high',
        'warning',
        'Database Connections High',
        format('Active connections: %s/%s (%.2f%%)', 
          v_active_connections, v_max_connections, v_connection_percent),
        jsonb_build_object(
          'active_connections', v_active_connections,
          'max_connections', v_max_connections,
          'usage_percent', v_connection_percent
        )
      ) INTO v_alert_id;
    END IF;
  ELSE
    -- Resolve existing alert if usage drops below 70%
    IF v_connection_percent < 70 THEN
      UPDATE monitoring_alerts
      SET status = 'resolved', resolved_at = NOW()
      WHERE alert_type = 'database_connections_high' AND status = 'active';
    END IF;
  END IF;

  -- Log metrics (for tracking over time)
  INSERT INTO monitoring_performance_metrics (metric_name, metric_value, metric_unit, resource_name)
  VALUES 
    ('database_size_mb', v_db_size_mb, 'MB', 'database'),
    ('database_connections_percent', v_connection_percent, 'percentage', 'database'),
    ('database_storage_mb', v_storage_total_mb, 'MB', 'public_schema')
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Create cron job to check metrics every 15 minutes
-- ============================================================================

-- Remove existing job if present
SELECT cron.unschedule('monitoring-database-metrics-every-15min') 
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'monitoring-database-metrics-every-15min'
);

-- Create new job
SELECT cron.schedule(
    'monitoring-database-metrics-every-15min',
    '*/15 * * * *', -- Every 15 minutes
    $$
    SELECT monitoring_check_database_metrics();
    $$
);

-- ============================================================================
-- PART 3: Comments
-- ============================================================================

COMMENT ON FUNCTION monitoring_check_database_metrics() IS 
'Checks database metrics (connections, storage) and creates alerts if thresholds exceeded. Runs every 15 minutes via cron.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test function manually:
-- SELECT monitoring_check_database_metrics();

-- Verify cron job:
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'monitoring-database-metrics-every-15min';

-- Check recent metrics:
-- SELECT * FROM monitoring_performance_metrics 
-- WHERE metric_name LIKE 'database_%' 
-- ORDER BY recorded_at DESC LIMIT 10;

-- Check active alerts:
-- SELECT * FROM monitoring_alerts 
-- WHERE alert_type LIKE 'database_%' AND status = 'active';

