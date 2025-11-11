-- ============================================================================
-- Verificar estado del Toyota Corolla después del sync
-- ============================================================================

SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year,
  value_usd,
  estimated_value_usd,
  value_usd_source,
  fipe_code,
  fipe_last_sync,
  updated_at,
  CASE
    WHEN fipe_last_sync > NOW() - INTERVAL '5 minutes' THEN '✅ Sync reciente'
    WHEN value_usd IS NOT NULL THEN '✅ Tiene valor'
    ELSE '❌ No sincronizado'
  END AS estado_sync
FROM cars
WHERE brand_text_backup ILIKE '%Toyota%'
  AND model_text_backup ILIKE '%Corolla%'
  AND location_country = 'BR';
