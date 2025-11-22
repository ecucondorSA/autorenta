-- =====================================================
-- Migración: Añadir campo value_usd a tabla cars
-- Elimina estimación hardcodeada del valor del vehículo
-- =====================================================

-- 1. Añadir columna value_usd (nullable inicialmente)
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS value_usd NUMERIC;

-- 2. Comentar la columna
COMMENT ON COLUMN cars.value_usd IS 
'Valor real del vehículo en USD. Usado para cálculos de seguro y garantía. Debe ser actualizado por el propietario al crear/editar el vehículo.';

-- 3. Poblar valores iniciales usando la fórmula actual
-- Solo para autos que no tienen value_usd definido
UPDATE cars 
SET value_usd = CASE 
  WHEN currency = 'ARS' THEN ROUND((price_per_day / 1000) * 300)
  ELSE ROUND(price_per_day * 300)
END
WHERE value_usd IS NULL;

-- 4. Hacer el campo NOT NULL para futuros registros
-- (Comentado por ahora para no romper creación de autos)
-- Descomentar cuando el admin panel esté actualizado
-- ALTER TABLE cars ALTER COLUMN value_usd SET NOT NULL;

-- 5. Añadir constraint de validación (valor debe ser positivo y razonable)
ALTER TABLE cars 
ADD CONSTRAINT cars_value_usd_check 
CHECK (value_usd IS NULL OR (value_usd > 0 AND value_usd < 1000000));

-- =====================================================
-- Verificación
-- =====================================================

-- Ver distribución de valores
SELECT 
  COUNT(*) as total_cars,
  COUNT(value_usd) as with_value_usd,
  ROUND(AVG(value_usd), 2) as avg_value_usd,
  ROUND(MIN(value_usd), 2) as min_value_usd,
  ROUND(MAX(value_usd), 2) as max_value_usd
FROM cars;

-- Ver ejemplos de autos con sus valores
SELECT 
  id,
  make,
  model,
  price_per_day,
  currency,
  value_usd,
  CASE 
    WHEN currency = 'ARS' THEN ROUND((price_per_day / 1000) * 300)
    ELSE ROUND(price_per_day * 300)
  END as estimated_value
FROM cars
LIMIT 10;
