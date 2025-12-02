-- Migración: Agregar flag para marcar autos que necesitan re-validación FIPE
-- Fecha: 2025-11-13
-- Propósito: Identificar y trackear autos sin validación FIPE para re-procesamiento

-- ============================================================================
-- 1. AGREGAR COLUMNA DE VALIDACIÓN PENDIENTE
-- ============================================================================

-- Agregar columna para marcar autos que necesitan re-validación
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS fipe_validation_pending BOOLEAN DEFAULT false;

-- Agregar comentario explicativo
COMMENT ON COLUMN cars.fipe_validation_pending IS
  'Flag que indica si el auto necesita re-validación de precio FIPE. ' ||
  'Se marca como true cuando el valor fue ingresado manualmente o falló la validación inicial. ' ||
  'Se usa para ejecutar procesos batch de re-validación automática.';

-- ============================================================================
-- 2. CREAR ÍNDICE PARA BÚSQUEDAS EFICIENTES
-- ============================================================================

-- Índice parcial: solo para autos pendientes de validación
CREATE INDEX IF NOT EXISTS idx_cars_fipe_validation_pending
ON cars(fipe_validation_pending)
WHERE fipe_validation_pending = true;

-- Índice compuesto para queries de batch processing
CREATE INDEX IF NOT EXISTS idx_cars_fipe_pending_status
ON cars(fipe_validation_pending, status, created_at)
WHERE fipe_validation_pending = true
  AND status IN ('active', 'pending');

-- ============================================================================
-- 3. MARCAR AUTOS EXISTENTES SIN VALIDACIÓN FIPE
-- ============================================================================

-- Marcar automáticamente todos los autos que:
-- - Tienen valor manual (sin FIPE)
-- - No tienen código FIPE
-- - No tienen fuente de valor definida
UPDATE cars
SET
  fipe_validation_pending = true,
  updated_at = NOW()
WHERE (
  value_usd_source = 'manual'
  OR value_usd_source IS NULL
  OR fipe_code IS NULL
  OR fipe_code = ''
)
AND status IN ('active', 'pending', 'draft')
AND fipe_validation_pending IS DISTINCT FROM true; -- Solo actualizar si cambió

-- ============================================================================
-- 4. CREAR VISTA DE DASHBOARD PARA MONITOREO
-- ============================================================================

-- Vista con estadísticas de cobertura FIPE
CREATE OR REPLACE VIEW fipe_validation_dashboard AS
SELECT
  -- Totales generales
  COUNT(*) as total_autos_activos,
  COUNT(*) FILTER (WHERE fipe_validation_pending = true) as pendientes_validacion,
  COUNT(*) FILTER (WHERE value_usd_source = 'fipe') as validados_fipe,
  COUNT(*) FILTER (WHERE value_usd_source = 'manual') as valor_manual,
  COUNT(*) FILTER (WHERE fipe_code IS NOT NULL) as con_codigo_fipe,

  -- Porcentajes de cobertura
  ROUND(
    COUNT(*) FILTER (WHERE value_usd_source = 'fipe') * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as porcentaje_validados_fipe,

  ROUND(
    COUNT(*) FILTER (WHERE fipe_validation_pending = true) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as porcentaje_pendientes,

  -- Estadísticas de valores
  ROUND(AVG(value_usd) FILTER (WHERE value_usd_source = 'fipe')) as promedio_usd_fipe,
  ROUND(AVG(value_usd) FILTER (WHERE value_usd_source = 'manual')) as promedio_usd_manual,
  ROUND(AVG(value_usd)) as promedio_usd_general,

  -- Información temporal
  MAX(fipe_last_sync) as ultima_sync_fipe,
  COUNT(*) FILTER (
    WHERE fipe_last_sync > NOW() - INTERVAL '7 days'
  ) as sincronizados_ultima_semana,
  COUNT(*) FILTER (
    WHERE fipe_last_sync > NOW() - INTERVAL '30 days'
  ) as sincronizados_ultimo_mes,

  -- Distribución por status
  COUNT(*) FILTER (WHERE status = 'active') as activos,
  COUNT(*) FILTER (WHERE status = 'pending') as pendientes,
  COUNT(*) FILTER (WHERE status = 'draft') as borradores,

  -- Información de antigüedad
  MIN(created_at) as auto_mas_antiguo,
  MAX(created_at) as auto_mas_reciente
FROM cars
WHERE status IN ('active', 'pending', 'draft');

-- Agregar comentario a la vista
COMMENT ON VIEW fipe_validation_dashboard IS
  'Dashboard de monitoreo de cobertura y estado de validación FIPE. ' ||
  'Muestra estadísticas completas de autos validados, pendientes y valores promedio.';

-- ============================================================================
-- 5. VISTA DETALLADA: AUTOS PENDIENTES DE VALIDACIÓN
-- ============================================================================

-- Vista para inspeccionar autos específicos que necesitan validación
CREATE OR REPLACE VIEW fipe_pending_validation_details AS
SELECT
  c.id,
  c.brand_text_backup as marca,
  c.model_text_backup as modelo,
  c.year as año,
  c.value_usd,
  c.value_usd_source as fuente_valor,
  c.fipe_code,
  c.fipe_last_sync as ultimo_intento_sync,
  c.status,
  c.country as pais,
  c.created_at as fecha_creacion,
  c.updated_at as fecha_actualizacion,
  -- Calcular días desde creación
  EXTRACT(DAY FROM NOW() - c.created_at)::INTEGER as dias_desde_creacion,
  -- Calcular días desde último intento de sync
  CASE
    WHEN c.fipe_last_sync IS NOT NULL
    THEN EXTRACT(DAY FROM NOW() - c.fipe_last_sync)::INTEGER
    ELSE NULL
  END as dias_desde_ultimo_intento,
  -- Usuario que publicó
  p.full_name as publicado_por,
  p.email as email_publicador
FROM cars c
LEFT JOIN profiles p ON c.owner_id = p.id
WHERE c.fipe_validation_pending = true
  AND c.status IN ('active', 'pending', 'draft')
ORDER BY
  c.created_at DESC;

-- Comentario de la vista
COMMENT ON VIEW fipe_pending_validation_details IS
  'Vista detallada de autos pendientes de validación FIPE con información del publicador. ' ||
  'Útil para debugging y análisis manual de casos problemáticos.';

-- ============================================================================
-- 6. FUNCIÓN HELPER: OBTENER ESTADÍSTICAS POR MARCA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_fipe_validation_stats_by_brand()
RETURNS TABLE(
  marca TEXT,
  total_autos BIGINT,
  validados_fipe BIGINT,
  pendientes_validacion BIGINT,
  porcentaje_validados NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    brand_text_backup as marca,
    COUNT(*) as total_autos,
    COUNT(*) FILTER (WHERE value_usd_source = 'fipe') as validados_fipe,
    COUNT(*) FILTER (WHERE fipe_validation_pending = true) as pendientes_validacion,
    ROUND(
      COUNT(*) FILTER (WHERE value_usd_source = 'fipe') * 100.0 / NULLIF(COUNT(*), 0),
      2
    ) as porcentaje_validados
  FROM cars
  WHERE status IN ('active', 'pending')
    AND brand_text_backup IS NOT NULL
  GROUP BY brand_text_backup
  ORDER BY total_autos DESC;
$$;

-- Comentario de la función
COMMENT ON FUNCTION get_fipe_validation_stats_by_brand IS
  'Retorna estadísticas de validación FIPE agrupadas por marca. ' ||
  'Útil para identificar qué marcas tienen mejor cobertura en FIPE.';

-- ============================================================================
-- 7. RESULTADO Y VERIFICACIÓN
-- ============================================================================

-- Mostrar resumen de la migración
DO $$
DECLARE
  v_total_cars INTEGER;
  v_pending INTEGER;
  v_percentage NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE fipe_validation_pending = true)
  INTO v_total_cars, v_pending
  FROM cars
  WHERE status IN ('active', 'pending', 'draft');

  IF v_total_cars > 0 THEN
    v_percentage := ROUND(v_pending * 100.0 / v_total_cars, 2);
  ELSE
    v_percentage := 0;
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: fipe_validation_pending';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total de autos: %', v_total_cars;
  RAISE NOTICE 'Pendientes de validación: % (%% del total)', v_pending, v_percentage;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Vistas creadas:';
  RAISE NOTICE '  - fipe_validation_dashboard (estadísticas generales)';
  RAISE NOTICE '  - fipe_pending_validation_details (detalles de pendientes)';
  RAISE NOTICE 'Funciones creadas:';
  RAISE NOTICE '  - get_fipe_validation_stats_by_brand() (stats por marca)';
  RAISE NOTICE '================================================';
END $$;

-- Query de verificación (comentada, descomentar para ejecutar manualmente)
-- SELECT * FROM fipe_validation_dashboard;
-- SELECT * FROM fipe_pending_validation_details LIMIT 10;
-- SELECT * FROM get_fipe_validation_stats_by_brand();
