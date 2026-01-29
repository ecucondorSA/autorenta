-- ============================================================================
-- MIGRATION: Create vehicle_pricing_models table for value estimation
-- Date: 2025-11-11
-- Purpose: Reference data for estimating vehicle values by make/model/year
-- Impact: Enables automatic value_usd estimation for cars without manual value
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create vehicle_pricing_models table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_pricing_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER NOT NULL, -- Use 9999 for current/future models
  base_value_usd INTEGER NOT NULL, -- Reference market value in USD
  category_id UUID NOT NULL REFERENCES public.vehicle_categories(id),
  confidence_level TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low', 'estimated'
  data_source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'api', 'estimated', 'ml'
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure year range is valid
  CONSTRAINT check_year_range CHECK (year_to >= year_from),

  -- Ensure positive value
  CONSTRAINT check_positive_value CHECK (base_value_usd > 0)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_brand ON public.vehicle_pricing_models(brand);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_model ON public.vehicle_pricing_models(model);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_brand_model ON public.vehicle_pricing_models(brand, model);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_year_range ON public.vehicle_pricing_models(year_from, year_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_category ON public.vehicle_pricing_models(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_pricing_models_active ON public.vehicle_pricing_models(active) WHERE active = true;

-- Add comments
COMMENT ON TABLE public.vehicle_pricing_models IS 'Reference valuations for vehicle make/model/year combinations';
COMMENT ON COLUMN public.vehicle_pricing_models.base_value_usd IS 'Market value in USD for this model in the given year range';
COMMENT ON COLUMN public.vehicle_pricing_models.confidence_level IS 'Data quality: high (verified), medium (estimated), low (placeholder)';
COMMENT ON COLUMN public.vehicle_pricing_models.data_source IS 'Source of valuation: manual, api (external service), estimated, ml (machine learning)';

-- ============================================================================
-- 2. Seed popular models in Argentina (Economy Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Fiat Uno
('Fiat', 'Uno', 2015, 2018, 6000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Popular entry-level city car'),
('Fiat', 'Uno', 2019, 2021, 7500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Updated generation'),
('Fiat', 'Uno', 2022, 9999, 9000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Current model'),

-- Chevrolet Onix
('Chevrolet', 'Onix', 2015, 2019, 8000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Best-seller compact'),
('Chevrolet', 'Onix', 2020, 2022, 12000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'New generation'),
('Chevrolet', 'Onix', 2023, 9999, 15000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'high', 'manual', 'Current model, verified pricing'),

-- Renault Kwid
('Renault', 'Kwid', 2017, 2020, 7000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Ultra-compact, budget'),
('Renault', 'Kwid', 2021, 9999, 9500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Facelift'),

-- Ford Ka
('Ford', 'Ka', 2015, 2018, 7500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Discontinued but popular used'),
('Ford', 'Ka', 2019, 2021, 9000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Final years'),

-- Volkswagen Gol
('Volkswagen', 'Gol', 2015, 2019, 8500, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Classic economy car'),
('Volkswagen', 'Gol', 2020, 9999, 11000, (SELECT id FROM vehicle_categories WHERE code = 'economy'), 'medium', 'manual', 'Later generation');

-- ============================================================================
-- 3. Seed popular models in Argentina (Standard Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Toyota Corolla
('Toyota', 'Corolla', 2015, 2018, 14000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'Reliable sedan, high demand'),
('Toyota', 'Corolla', 2019, 2021, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'TNGA platform'),
('Toyota', 'Corolla', 2022, 9999, 22000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', 'Hybrid available'),

-- Honda Civic
('Honda', 'Civic', 2015, 2018, 15000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Sporty sedan'),
('Honda', 'Civic', 2019, 2021, 19000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', '10th generation'),
('Honda', 'Civic', 2022, 9999, 24000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'high', 'manual', '11th generation'),

-- Volkswagen Golf
('Volkswagen', 'Golf', 2015, 2018, 16000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Premium hatchback'),
('Volkswagen', 'Golf', 2019, 2022, 20000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'MK7.5'),
('Volkswagen', 'Golf', 2023, 9999, 25000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'MK8'),

-- Peugeot 308
('Peugeot', '308', 2015, 2019, 12000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'French sedan'),
('Peugeot', '308', 2020, 9999, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'New design'),

-- Chevrolet Cruze
('Chevrolet', 'Cruze', 2015, 2019, 13000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Mid-size sedan'),
('Chevrolet', 'Cruze', 2020, 9999, 18000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Refreshed'),

-- Nissan Versa
('Nissan', 'Versa', 2015, 2019, 11000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'Affordable sedan'),
('Nissan', 'Versa', 2020, 9999, 14000, (SELECT id FROM vehicle_categories WHERE code = 'standard'), 'medium', 'manual', 'New generation');

-- ============================================================================
-- 4. Seed popular models in Argentina (Premium Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Toyota RAV4
('Toyota', 'RAV4', 2015, 2018, 22000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Best-selling SUV'),
('Toyota', 'RAV4', 2019, 2021, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', '5th generation'),
('Toyota', 'RAV4', 2022, 9999, 35000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Hybrid Prime available'),

-- Honda CR-V
('Honda', 'CR-V', 2015, 2018, 20000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Family SUV'),
('Honda', 'CR-V', 2019, 2022, 27000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Turbo engine'),
('Honda', 'CR-V', 2023, 9999, 33000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Hybrid option'),

-- Jeep Compass
('Jeep', 'Compass', 2017, 2020, 24000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Off-road capable'),
('Jeep', 'Compass', 2021, 9999, 30000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Refreshed design'),

-- Volkswagen Tiguan
('Volkswagen', 'Tiguan', 2017, 2021, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Premium SUV'),
('Volkswagen', 'Tiguan', 2022, 9999, 35000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Updated tech'),

-- Hyundai Tucson
('Hyundai', 'Tucson', 2016, 2020, 20000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Value SUV'),
('Hyundai', 'Tucson', 2021, 9999, 28000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'Radical redesign'),

-- Hyundai Creta
('Hyundai', 'Creta', 2017, 2021, 18000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'medium', 'manual', 'Compact SUV'),
('Hyundai', 'Creta', 2022, 9999, 25000, (SELECT id FROM vehicle_categories WHERE code = 'premium'), 'high', 'manual', 'New generation');

-- ============================================================================
-- 5. Seed popular models in Argentina (Luxury Category)
-- ============================================================================

INSERT INTO public.vehicle_pricing_models (brand, model, year_from, year_to, base_value_usd, category_id, confidence_level, data_source, notes) VALUES
-- Mercedes-Benz C-Class
('Mercedes-Benz', 'C-Class', 2015, 2018, 35000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Entry luxury sedan'),
('Mercedes-Benz', 'C-Class', 2019, 2021, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'W205 facelift'),
('Mercedes-Benz', 'C-Class', 2022, 9999, 55000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'W206 new generation'),

-- BMW Serie 3
('BMW', '3 Series', 2015, 2018, 38000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Sports sedan'),
('BMW', '3 Series', 2019, 2022, 45000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'G20 generation'),
('BMW', '3 Series', 2023, 9999, 58000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Updated tech'),

-- Audi A4
('Audi', 'A4', 2016, 2019, 36000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Tech-focused luxury'),
('Audi', 'A4', 2020, 9999, 48000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'B9 facelift'),

-- Tesla Model 3
('Tesla', 'Model 3', 2019, 2021, 45000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'high', 'manual', 'Electric sedan'),
('Tesla', 'Model 3', 2022, 9999, 48000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'high', 'manual', 'Highland refresh'),

-- Volvo S60
('Volvo', 'S60', 2019, 9999, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Scandinavian luxury'),

-- Mercedes-Benz GLC
('Mercedes-Benz', 'GLC', 2016, 2019, 42000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Luxury SUV'),
('Mercedes-Benz', 'GLC', 2020, 9999, 55000, (SELECT id FROM vehicle_categories WHERE code = 'luxury'), 'medium', 'manual', 'Updated platform');

-- ============================================================================
-- 6. Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_pricing_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vehicle_pricing_models_updated_at
  BEFORE UPDATE ON public.vehicle_pricing_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_pricing_models_updated_at();

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count models by category
-- SELECT
--   c.name_es AS category,
--   COUNT(*) AS model_count,
--   MIN(base_value_usd) AS min_value,
--   AVG(base_value_usd)::INTEGER AS avg_value,
--   MAX(base_value_usd) AS max_value
-- FROM vehicle_pricing_models vpm
-- JOIN vehicle_categories c ON vpm.category_id = c.id
-- GROUP BY c.name_es, c.display_order
-- ORDER BY c.display_order;

-- Find pricing for specific car
-- SELECT brand, model, year_from, year_to, base_value_usd,
--        (SELECT name_es FROM vehicle_categories WHERE id = category_id) AS category
-- FROM vehicle_pricing_models
-- WHERE brand ILIKE '%Toyota%' AND model ILIKE '%Corolla%'
-- ORDER BY year_from DESC;

-- Test depreciation calculation (5 year old Corolla 2019)
-- WITH car AS (
--   SELECT base_value_usd,
--          (SELECT depreciation_rate_annual FROM vehicle_categories WHERE id = category_id) AS dep_rate
--   FROM vehicle_pricing_models
--   WHERE brand = 'Toyota' AND model = 'Corolla' AND year_from <= 2019 AND year_to >= 2019
-- )
-- SELECT
--   base_value_usd AS original_value,
--   dep_rate AS annual_depreciation,
--   (EXTRACT(YEAR FROM NOW()) - 2019)::INTEGER AS years_old,
--   (base_value_usd * POWER(1 - dep_rate, EXTRACT(YEAR FROM NOW()) - 2019))::INTEGER AS current_estimated_value
-- FROM car;
