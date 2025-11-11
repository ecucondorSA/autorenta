-- Ver el valor exacto del Toyota Corolla sincronizado con FIPE
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year AS año,
  value_usd AS valor_usd,
  fipe_code AS codigo_fipe,
  fipe_last_sync AS ultima_sync,
  value_usd_source AS fuente,
  -- Calcular cuánto tiempo hace que se sincronizó
  NOW() - fipe_last_sync AS hace,
  -- Ver también el valor estimado previo (si lo tenía)
  estimated_value_usd AS valor_estimado_anterior
FROM cars
WHERE brand_text_backup ILIKE '%Toyota%'
  AND model_text_backup ILIKE '%Corolla%'
  AND location_country = 'BR'
  AND fipe_last_sync IS NOT NULL
ORDER BY fipe_last_sync DESC;
