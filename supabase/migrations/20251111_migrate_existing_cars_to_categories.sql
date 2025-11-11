-- ============================================================================
-- MIGRATION: Migrate existing cars to vehicle categories
-- Date: 2025-11-11
-- Purpose: Classify all existing cars into categories and estimate missing values
-- Impact: Populates category_id and estimated_value_usd for all cars
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Classify cars WITH value_usd into categories
-- ============================================================================

-- Economy: < $10,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'economy'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd < 10000
  AND category_id IS NULL;

-- Standard: $10,000 - $20,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'standard'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 10000
  AND value_usd < 20000
  AND category_id IS NULL;

-- Premium: $20,000 - $35,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'premium'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 20000
  AND value_usd < 35000
  AND category_id IS NULL;

-- Luxury: >= $35,000 USD
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'luxury'),
  value_usd_source = 'owner_manual'
WHERE
  value_usd IS NOT NULL
  AND value_usd >= 35000
  AND category_id IS NULL;

-- ============================================================================
-- 2. Estimate values for cars WITHOUT value_usd
-- ============================================================================

-- Create temporary table to store estimates
CREATE TEMP TABLE temp_car_estimates AS
SELECT
  c.id AS car_id,
  c.brand_text_backup,
  c.model_text_backup,
  c.year,
  e.estimated_value,
  e.category_id,
  e.data_source
FROM public.cars c
CROSS JOIN LATERAL public.estimate_vehicle_value_usd(
  c.brand_text_backup,
  c.model_text_backup,
  c.year
) e
WHERE
  c.value_usd IS NULL
  AND c.estimated_value_usd IS NULL;

-- Update cars with estimates
UPDATE public.cars c
SET
  estimated_value_usd = e.estimated_value,
  category_id = e.category_id,
  value_usd_source = e.data_source
FROM temp_car_estimates e
WHERE c.id = e.car_id;

-- ============================================================================
-- 3. Fallback for any remaining cars without category
-- ============================================================================

-- If any cars still don't have category (edge cases), default to standard
UPDATE public.cars
SET
  category_id = (SELECT id FROM vehicle_categories WHERE code = 'standard'),
  estimated_value_usd = COALESCE(estimated_value_usd, 15000), -- Default $15k
  value_usd_source = COALESCE(value_usd_source, 'estimated')
WHERE category_id IS NULL;

-- ============================================================================
-- 4. Verification and summary
-- ============================================================================

DO $$
DECLARE
  v_total_cars INTEGER;
  v_with_owner_value INTEGER;
  v_with_estimated_value INTEGER;
  v_economy INTEGER;
  v_standard INTEGER;
  v_premium INTEGER;
  v_luxury INTEGER;
BEGIN
  -- Count totals
  SELECT COUNT(*) INTO v_total_cars FROM public.cars;
  SELECT COUNT(*) INTO v_with_owner_value FROM public.cars WHERE value_usd IS NOT NULL;
  SELECT COUNT(*) INTO v_with_estimated_value FROM public.cars WHERE estimated_value_usd IS NOT NULL;

  -- Count by category
  SELECT COUNT(*) INTO v_economy
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'economy';

  SELECT COUNT(*) INTO v_standard
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'standard';

  SELECT COUNT(*) INTO v_premium
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'premium';

  SELECT COUNT(*) INTO v_luxury
  FROM public.cars c
  JOIN vehicle_categories vc ON c.category_id = vc.id
  WHERE vc.code = 'luxury';

  -- Log summary
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Total cars processed: %', v_total_cars;
  RAISE NOTICE 'Cars with owner-provided value: %', v_with_owner_value;
  RAISE NOTICE 'Cars with estimated value: %', v_with_estimated_value;
  RAISE NOTICE '';
  RAISE NOTICE 'Distribution by category:';
  RAISE NOTICE '  Economy: % (%.1f%%)', v_economy, (v_economy::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Standard: % (%.1f%%)', v_standard, (v_standard::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Premium: % (%.1f%%)', v_premium, (v_premium::FLOAT / v_total_cars * 100);
  RAISE NOTICE '  Luxury: % (%.1f%%)', v_luxury, (v_luxury::FLOAT / v_total_cars * 100);
END $$;

-- ============================================================================
-- 5. Create NOT NULL constraint (now that all cars have category_id)
-- ============================================================================

-- Make category_id required for all future cars
ALTER TABLE public.cars
ALTER COLUMN category_id SET NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View distribution by category
-- SELECT
--   vc.name_es AS category,
--   COUNT(*) AS car_count,
--   MIN(COALESCE(c.value_usd, c.estimated_value_usd)) AS min_value,
--   AVG(COALESCE(c.value_usd, c.estimated_value_usd))::INTEGER AS avg_value,
--   MAX(COALESCE(c.value_usd, c.estimated_value_usd)) AS max_value,
--   SUM(CASE WHEN c.value_usd IS NOT NULL THEN 1 ELSE 0 END) AS with_owner_value,
--   SUM(CASE WHEN c.estimated_value_usd IS NOT NULL THEN 1 ELSE 0 END) AS with_estimated_value
-- FROM public.cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- GROUP BY vc.name_es, vc.display_order
-- ORDER BY vc.display_order;

-- Check for any cars without category (should be 0)
-- SELECT COUNT(*) AS cars_without_category
-- FROM public.cars
-- WHERE category_id IS NULL;

-- Sample cars by category
-- SELECT
--   vc.name_es AS category,
--   c.brand_text_backup,
--   c.model_text_backup,
--   c.year,
--   c.value_usd AS owner_value,
--   c.estimated_value_usd,
--   COALESCE(c.value_usd, c.estimated_value_usd) AS effective_value,
--   c.value_usd_source
-- FROM public.cars c
-- JOIN vehicle_categories vc ON c.category_id = vc.id
-- ORDER BY vc.display_order, RANDOM()
-- LIMIT 20;
