-- ============================================================================
-- FIX: Corregir value_usd_source para autos brasileños sin valor
-- ============================================================================

-- Antes de ejecutar, ver cuántos autos serán afectados:
SELECT COUNT(*) AS autos_a_corregir
FROM cars
WHERE location_country = 'BR'
  AND value_usd IS NULL
  AND value_usd_source = 'owner_manual';

-- Corregir el source para permitir FIPE sync
UPDATE cars
SET value_usd_source = NULL  -- Permitir que FIPE lo actualice
WHERE location_country = 'BR'
  AND value_usd IS NULL
  AND value_usd_source = 'owner_manual';

-- Verificar el cambio
SELECT
  brand_text_backup AS marca,
  model_text_backup AS modelo,
  year,
  value_usd,
  value_usd_source,
  'Listo para FIPE sync' AS estado
FROM cars
WHERE location_country = 'BR'
  AND value_usd IS NULL;
