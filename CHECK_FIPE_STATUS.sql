-- ============================================================================
-- Verificar estado de autos brasileños para FIPE sync
-- ============================================================================

-- 1. Ver cuántos autos brasileños hay
SELECT
  'Total autos brasileños' AS metrica,
  COUNT(*) AS cantidad
FROM cars
WHERE location_country = 'BR';

-- 2. Ver autos brasileños y su estado de valuación
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year AS año,
  value_usd,
  estimated_value_usd,
  value_usd_source AS fuente,
  fipe_code,
  fipe_last_sync,
  CASE
    WHEN value_usd IS NOT NULL THEN 'Con valor manual'
    WHEN fipe_last_sync IS NOT NULL THEN 'Sincronizado con FIPE'
    WHEN estimated_value_usd IS NOT NULL THEN 'Valor estimado'
    ELSE 'Sin valor'
  END AS estado
FROM cars
WHERE location_country = 'BR'
ORDER BY fipe_last_sync DESC NULLS LAST
LIMIT 10;

-- 3. Contar autos brasileños por estado de valuación
SELECT
  CASE
    WHEN value_usd IS NOT NULL THEN 'value_usd_manual'
    WHEN fipe_last_sync IS NOT NULL THEN 'fipe_synced'
    WHEN estimated_value_usd IS NOT NULL THEN 'estimated'
    ELSE 'no_value'
  END AS estado,
  COUNT(*) AS cantidad
FROM cars
WHERE location_country = 'BR'
GROUP BY
  CASE
    WHEN value_usd IS NOT NULL THEN 'value_usd_manual'
    WHEN fipe_last_sync IS NOT NULL THEN 'fipe_synced'
    WHEN estimated_value_usd IS NOT NULL THEN 'estimated'
    ELSE 'no_value'
  END;

-- 4. Ver autos candidatos para FIPE sync (sin value_usd)
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year AS año,
  estimated_value_usd,
  value_usd_source,
  'Candidato para FIPE' AS nota
FROM cars
WHERE location_country = 'BR'
  AND value_usd IS NULL
  AND (fipe_last_sync IS NULL OR fipe_last_sync < NOW() - INTERVAL '30 days')
LIMIT 5;

-- 5. Ver el último sync exitoso (si existe)
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year,
  value_usd,
  fipe_code,
  fipe_last_sync,
  'Último sync exitoso' AS nota
FROM cars
WHERE location_country = 'BR'
  AND fipe_last_sync IS NOT NULL
ORDER BY fipe_last_sync DESC
LIMIT 3;
