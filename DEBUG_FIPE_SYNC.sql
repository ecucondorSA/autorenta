-- ============================================================================
-- Debug: Por qué el auto brasileño fue "skipped"
-- ============================================================================

-- 1. Ver el Toyota Corolla brasileño y todos sus campos
SELECT
  id,
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year AS año,
  location_country AS pais,
  value_usd,
  estimated_value_usd,
  value_usd_source AS fuente_valor,
  fipe_code,
  fipe_last_sync,
  created_at
FROM cars
WHERE brand_text_backup ILIKE '%Toyota%'
  AND model_text_backup ILIKE '%Corolla%'
  AND location_country = 'BR';

-- 2. Ver TODOS los autos brasileños con sus estados
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year,
  value_usd,
  value_usd_source,
  fipe_last_sync,
  CASE
    WHEN value_usd IS NOT NULL THEN '✅ Tiene value_usd (skip por owner)'
    WHEN fipe_last_sync IS NOT NULL AND fipe_last_sync > NOW() - INTERVAL '30 days' THEN '✅ Sync reciente (skip por fresh)'
    WHEN value_usd IS NULL AND fipe_last_sync IS NULL THEN '❓ Candidato para sync'
    ELSE '❓ Estado desconocido'
  END AS razon_skip
FROM cars
WHERE location_country = 'BR'
ORDER BY created_at DESC;

-- 3. Contar autos brasileños por razón de skip
SELECT
  CASE
    WHEN value_usd IS NOT NULL THEN 'tiene_value_usd'
    WHEN fipe_last_sync IS NOT NULL AND fipe_last_sync > NOW() - INTERVAL '30 days' THEN 'sync_reciente'
    WHEN value_usd IS NULL AND fipe_last_sync IS NULL THEN 'candidato_sync'
    ELSE 'otro'
  END AS estado,
  COUNT(*) AS cantidad
FROM cars
WHERE location_country = 'BR'
GROUP BY
  CASE
    WHEN value_usd IS NOT NULL THEN 'tiene_value_usd'
    WHEN fipe_last_sync IS NOT NULL AND fipe_last_sync > NOW() - INTERVAL '30 days' THEN 'sync_reciente'
    WHEN value_usd IS NULL AND fipe_last_sync IS NULL THEN 'candidato_sync'
    ELSE 'otro'
  END;

-- 4. Si el problema es que value_usd_source está en 'owner_manual' pero value_usd es NULL,
--    podemos arreglarlo cambiando el source a 'estimated'
-- SOLO ejecutar si confirmas que ese es el problema:
-- UPDATE cars
-- SET value_usd_source = 'estimated'
-- WHERE location_country = 'BR'
--   AND value_usd IS NULL
--   AND value_usd_source = 'owner_manual';
