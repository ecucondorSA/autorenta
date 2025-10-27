-- Migración: Sistema de Precios Estandarizados Basados en Valor USD
-- Fecha: 2025-10-27
-- Autor: Sistema Autorentar

-- 1. Agregar nuevas columnas a la tabla cars
ALTER TABLE cars 
ADD COLUMN IF NOT EXISTS value_usd INTEGER,
ADD COLUMN IF NOT EXISTS daily_rate_percentage DECIMAL(5,4) DEFAULT 0.0030,
ADD COLUMN IF NOT EXISTS pricing_strategy VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS price_override_ars INTEGER,
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ DEFAULT NOW();

-- 2. Crear índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_cars_value_usd ON cars(value_usd);
CREATE INDEX IF NOT EXISTS idx_cars_pricing_strategy ON cars(pricing_strategy);
CREATE INDEX IF NOT EXISTS idx_cars_last_price_update ON cars(last_price_update);

-- 3. Agregar comentarios explicativos
COMMENT ON COLUMN cars.value_usd IS 'Valor de mercado del vehículo en USD (fijo)';
COMMENT ON COLUMN cars.daily_rate_percentage IS 'Porcentaje diario del valor (0.0030 = 0.30%)';
COMMENT ON COLUMN cars.pricing_strategy IS 'Estrategia: economy, standard, premium';
COMMENT ON COLUMN cars.price_override_ars IS 'Precio manual en ARS (NULL = automático)';
COMMENT ON COLUMN cars.last_price_update IS 'Última actualización automática de precio';

-- 4. Establecer valores iniciales para autos existentes basados en precio actual
-- Fórmula inversa: value_usd = (price_per_day_ars / fx_rate) / daily_rate_percentage
-- Usando FX actual: 1745.64 ARS/USD y 0.30% diario

-- Chevrolet Cruze 2025: Precio actual 34,000 ARS/día
UPDATE cars 
SET 
  value_usd = 18000,
  daily_rate_percentage = 0.0030,
  pricing_strategy = 'standard',
  last_price_update = NOW()
WHERE model ILIKE '%cruze%' AND year >= 2023;

-- Chevrolet Onix 2023: Precio actual 38,000 ARS/día
UPDATE cars 
SET 
  value_usd = 15000,
  daily_rate_percentage = 0.0035,
  pricing_strategy = 'economy',
  last_price_update = NOW()
WHERE model ILIKE '%onix%';

-- Nissan Versa 2021: Precio actual 42,000 ARS/día
UPDATE cars 
SET 
  value_usd = 14000,
  daily_rate_percentage = 0.0040,
  pricing_strategy = 'economy',
  last_price_update = NOW()
WHERE model ILIKE '%versa%';

-- Renault Sandero Stepway: Precio actual 58,000 ARS/día
UPDATE cars 
SET 
  value_usd = 19000,
  daily_rate_percentage = 0.0032,
  pricing_strategy = 'standard',
  last_price_update = NOW()
WHERE model ILIKE '%sandero%';

-- Hyundai Creta 2022: Precio actual 65,000 ARS/día
UPDATE cars 
SET 
  value_usd = 25000,
  daily_rate_percentage = 0.0028,
  pricing_strategy = 'standard',
  last_price_update = NOW()
WHERE model ILIKE '%creta%' AND year = 2022;

-- Hyundai Creta 2025: Precio actual 75,000 ARS/día
UPDATE cars 
SET 
  value_usd = 32000,
  daily_rate_percentage = 0.0026,
  pricing_strategy = 'premium',
  last_price_update = NOW()
WHERE model ILIKE '%creta%' AND year >= 2025;

-- 5. Crear función para calcular precio automático
CREATE OR REPLACE FUNCTION calculate_daily_price_ars(
  p_value_usd INTEGER,
  p_daily_rate_percentage DECIMAL,
  p_vehicle_year INTEGER,
  p_fx_rate DECIMAL DEFAULT 1745.64
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_age INTEGER;
  v_age_discount DECIMAL;
  v_base_rate_usd DECIMAL;
  v_adjusted_rate_usd DECIMAL;
  v_daily_rate_ars INTEGER;
BEGIN
  -- Calcular antigüedad
  v_age := EXTRACT(YEAR FROM CURRENT_DATE) - p_vehicle_year;
  
  -- Descuento por antigüedad (5% por año, máximo 30%)
  v_age_discount := LEAST(v_age * 0.05, 0.30);
  
  -- Tasa base en USD
  v_base_rate_usd := p_value_usd * p_daily_rate_percentage;
  
  -- Ajustar por antigüedad
  v_adjusted_rate_usd := v_base_rate_usd * (1 - v_age_discount);
  
  -- Convertir a ARS y redondear
  v_daily_rate_ars := ROUND(v_adjusted_rate_usd * p_fx_rate);
  
  RETURN v_daily_rate_ars;
END;
$$;

COMMENT ON FUNCTION calculate_daily_price_ars IS 'Calcula precio diario en ARS basado en valor USD y FX actual';

-- 6. Crear vista para precios calculados vs actuales
CREATE OR REPLACE VIEW v_car_pricing_analysis AS
SELECT 
  c.id,
  c.title,
  c.brand,
  c.model,
  c.year,
  c.value_usd,
  c.daily_rate_percentage,
  c.pricing_strategy,
  c.price_per_day AS current_price_ars,
  c.price_override_ars,
  c.last_price_update,
  calculate_daily_price_ars(
    c.value_usd, 
    c.daily_rate_percentage, 
    c.year,
    (SELECT platform_rate FROM exchange_rates WHERE pair = 'USDTARS' AND is_active = true LIMIT 1)
  ) AS calculated_price_ars,
  CASE 
    WHEN c.price_override_ars IS NOT NULL THEN 'manual'
    WHEN c.value_usd IS NULL THEN 'legacy'
    ELSE 'automatic'
  END AS pricing_mode,
  ABS(c.price_per_day - calculate_daily_price_ars(
    c.value_usd, 
    c.daily_rate_percentage, 
    c.year,
    (SELECT platform_rate FROM exchange_rates WHERE pair = 'USDTARS' AND is_active = true LIMIT 1)
  )) AS price_difference_ars
FROM cars c
WHERE c.status != 'deleted';

COMMENT ON VIEW v_car_pricing_analysis IS 'Análisis de precios: actual vs calculado automáticamente';

-- 7. Verificar resultados
SELECT 
  title,
  value_usd,
  daily_rate_percentage,
  price_per_day AS current_price,
  calculated_price_ars AS suggested_price,
  price_difference_ars AS difference
FROM v_car_pricing_analysis
ORDER BY value_usd DESC;
