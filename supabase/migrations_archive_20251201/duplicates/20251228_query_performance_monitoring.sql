-- =============================================
-- QUERY PERFORMANCE MONITORING
-- Monitoreo de performance de queries SQL
-- =============================================

-- Tabla para almacenar métricas de queries lentas
CREATE TABLE IF NOT EXISTS query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación del query
  query_name TEXT NOT NULL, -- Nombre descriptivo (ej: 'get_available_cars')
  query_hash TEXT, -- Hash del query para agrupar variantes

  -- Métricas de tiempo
  execution_time_ms NUMERIC(10,2) NOT NULL,
  planning_time_ms NUMERIC(10,2),

  -- Contexto
  rows_returned INTEGER,
  rows_scanned INTEGER,

  -- Parámetros (sanitizados)
  params_summary JSONB, -- Resumen de parámetros sin PII

  -- Metadata
  caller_function TEXT, -- RPC o Edge Function que lo llamó
  user_id UUID, -- Para análisis por usuario (opcional)

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_query_perf_name_time
  ON query_performance_log(query_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_perf_slow
  ON query_performance_log(execution_time_ms DESC)
  WHERE execution_time_ms > 100;

CREATE INDEX IF NOT EXISTS idx_query_perf_created
  ON query_performance_log(created_at DESC);

-- RLS
ALTER TABLE query_performance_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read query performance"
  ON query_performance_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can insert query performance"
  ON query_performance_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- FUNCIONES DE MONITOREO
-- =============================================

-- Función para loguear performance de un query
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_name TEXT,
  p_execution_time_ms NUMERIC,
  p_rows_returned INTEGER DEFAULT NULL,
  p_caller_function TEXT DEFAULT NULL,
  p_params_summary JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Solo loguear queries que tarden más de 50ms
  IF p_execution_time_ms < 50 THEN
    RETURN NULL;
  END IF;

  INSERT INTO query_performance_log (
    query_name,
    execution_time_ms,
    rows_returned,
    caller_function,
    params_summary
  ) VALUES (
    p_query_name,
    p_execution_time_ms,
    p_rows_returned,
    p_caller_function,
    p_params_summary
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Función para obtener estadísticas de performance
CREATE OR REPLACE FUNCTION get_query_performance_stats(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  query_name TEXT,
  total_calls BIGINT,
  avg_time_ms NUMERIC,
  max_time_ms NUMERIC,
  min_time_ms NUMERIC,
  p95_time_ms NUMERIC,
  total_rows_returned BIGINT,
  slow_calls BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    query_name,
    COUNT(*) AS total_calls,
    ROUND(AVG(execution_time_ms), 2) AS avg_time_ms,
    MAX(execution_time_ms) AS max_time_ms,
    MIN(execution_time_ms) AS min_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) AS p95_time_ms,
    SUM(rows_returned) AS total_rows_returned,
    COUNT(*) FILTER (WHERE execution_time_ms > 500) AS slow_calls
  FROM query_performance_log
  WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY query_name
  ORDER BY avg_time_ms DESC;
$$;

-- Función para obtener queries más lentas
CREATE OR REPLACE FUNCTION get_slowest_queries(
  p_limit INTEGER DEFAULT 20,
  p_min_time_ms NUMERIC DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  query_name TEXT,
  execution_time_ms NUMERIC,
  rows_returned INTEGER,
  caller_function TEXT,
  params_summary JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    query_name,
    execution_time_ms,
    rows_returned,
    caller_function,
    params_summary,
    created_at
  FROM query_performance_log
  WHERE execution_time_ms >= p_min_time_ms
  ORDER BY execution_time_ms DESC
  LIMIT p_limit;
$$;

-- Función para análisis de tendencias
CREATE OR REPLACE FUNCTION get_query_performance_trends(
  p_query_name TEXT,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  hour_bucket TIMESTAMPTZ,
  call_count BIGINT,
  avg_time_ms NUMERIC,
  max_time_ms NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('hour', created_at) AS hour_bucket,
    COUNT(*) AS call_count,
    ROUND(AVG(execution_time_ms), 2) AS avg_time_ms,
    MAX(execution_time_ms) AS max_time_ms
  FROM query_performance_log
  WHERE query_name = p_query_name
    AND created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY date_trunc('hour', created_at)
  ORDER BY hour_bucket DESC;
$$;

-- =============================================
-- TRIGGERS PARA QUERIES CRÍTICAS
-- =============================================

-- Función para medir tiempo de ejecución de una función
CREATE OR REPLACE FUNCTION measure_execution_time(
  p_function_name TEXT,
  p_start_time TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_elapsed_ms NUMERIC;
BEGIN
  v_elapsed_ms := EXTRACT(EPOCH FROM (clock_timestamp() - p_start_time)) * 1000;

  -- Solo loguear si es significativo
  IF v_elapsed_ms > 50 THEN
    PERFORM log_query_performance(
      p_function_name,
      v_elapsed_ms,
      NULL,
      'auto_measure'
    );
  END IF;
END;
$$;

-- =============================================
-- LIMPIEZA AUTOMÁTICA
-- =============================================

-- Limpiar logs de performance antiguos (mantener 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM query_performance_log
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION log_query_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_slowest_queries TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_performance_trends TO authenticated;

-- Comentarios
COMMENT ON TABLE query_performance_log IS
  'Logs de performance de queries SQL para monitoreo y optimización';

COMMENT ON FUNCTION get_query_performance_stats IS
  'Obtiene estadísticas agregadas de performance por query';

COMMENT ON FUNCTION get_slowest_queries IS
  'Obtiene las queries más lentas para debugging';
