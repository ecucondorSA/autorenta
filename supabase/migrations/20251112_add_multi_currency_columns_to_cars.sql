-- ============================================================================
-- MIGRATION: Add multi-currency columns to cars table
-- Date: 2025-11-12
-- Purpose: Store vehicle values in multiple currencies (BRL, USD, ARS)
--
-- Why:
-- - FIPE returns prices in BRL (Brazilian Real)
-- - We convert to USD for international comparison
-- - We convert to ARS (Argentine Peso) for local pricing
-- - Storing all 3 allows:
--   * Showing prices in user's preferred currency
--   * Tracking exchange rate changes over time
--   * Comparing FIPE original price vs converted prices
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add currency columns to cars table
-- ============================================================================

-- Add value_brl column (original FIPE price in Brazilian Reals)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS value_brl INTEGER;

-- Add value_ars column (converted price in Argentine Pesos)
ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS value_ars INTEGER;

COMMENT ON COLUMN public.cars.value_brl IS
'Vehicle value in Brazilian Reals (BRL). Original price from FIPE API.';

COMMENT ON COLUMN public.cars.value_ars IS
'Vehicle value in Argentine Pesos (ARS). Converted from USD using Binance rates.';

COMMENT ON COLUMN public.cars.value_usd IS
'Vehicle value in US Dollars (USD). Converted from BRL using Binance rates or manually set by owner.';

-- ============================================================================
-- Create indexes for currency queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cars_value_brl ON public.cars(value_brl) WHERE value_brl IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cars_value_ars ON public.cars(value_ars) WHERE value_ars IS NOT NULL;

-- ============================================================================
-- Helper function: Get car price in specific currency
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_car_price_in_currency(
  p_car_id UUID,
  p_currency TEXT DEFAULT 'ARS'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_price INTEGER;
BEGIN
  CASE UPPER(p_currency)
    WHEN 'BRL' THEN
      SELECT value_brl INTO v_price FROM public.cars WHERE id = p_car_id;
    WHEN 'USD' THEN
      SELECT value_usd INTO v_price FROM public.cars WHERE id = p_car_id;
    WHEN 'ARS' THEN
      SELECT value_ars INTO v_price FROM public.cars WHERE id = p_car_id;
    ELSE
      -- Default to USD if currency not recognized
      SELECT value_usd INTO v_price FROM public.cars WHERE id = p_car_id;
  END CASE;

  RETURN v_price;
END;
$$;

COMMENT ON FUNCTION public.get_car_price_in_currency IS
'Returns car price in specified currency (BRL, USD, or ARS). Defaults to ARS if not specified.';

-- ============================================================================
-- View: Cars with all currency values
-- ============================================================================

CREATE OR REPLACE VIEW public.cars_multi_currency AS
SELECT
  c.id,
  c.brand_text_backup,
  c.model_text_backup,
  c.year,
  c.location_country,
  c.value_brl,
  c.value_usd,
  c.value_ars,
  c.value_usd_source,
  c.fipe_code,
  c.fipe_last_sync,
  CASE
    WHEN c.value_brl IS NOT NULL AND c.value_usd IS NOT NULL THEN
      -- Calculate implied BRL/USD rate from stored values
      ROUND(c.value_usd::NUMERIC / c.value_brl::NUMERIC, 4)
    ELSE NULL
  END AS implied_brl_usd_rate,
  CASE
    WHEN c.value_usd IS NOT NULL AND c.value_ars IS NOT NULL THEN
      -- Calculate implied USD/ARS rate from stored values
      ROUND(c.value_ars::NUMERIC / c.value_usd::NUMERIC, 2)
    ELSE NULL
  END AS implied_usd_ars_rate
FROM public.cars c;

COMMENT ON VIEW public.cars_multi_currency IS
'Shows all cars with prices in multiple currencies and implied exchange rates used during conversion.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View schema changes
-- \d+ cars

-- Test helper function
-- SELECT get_car_price_in_currency('some-car-uuid', 'ARS');
-- SELECT get_car_price_in_currency('some-car-uuid', 'USD');
-- SELECT get_car_price_in_currency('some-car-uuid', 'BRL');

-- View multi-currency data
-- SELECT * FROM cars_multi_currency WHERE value_brl IS NOT NULL LIMIT 10;

-- Check implied exchange rates
-- SELECT
--   model_text_backup,
--   year,
--   value_brl,
--   value_usd,
--   value_ars,
--   implied_brl_usd_rate,
--   implied_usd_ars_rate,
--   fipe_last_sync
-- FROM cars_multi_currency
-- WHERE value_brl IS NOT NULL
-- ORDER BY fipe_last_sync DESC
-- LIMIT 10;
