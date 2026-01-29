-- ============================================================================
-- MIGRATION: Add uses_dynamic_pricing to cars table (v2 - sin region_id)
-- Date: 2025-11-11
-- Purpose: Allow car owners to opt-in to dynamic pricing
-- Impact: Cars can choose between fixed pricing or dynamic pricing
-- Note: Version 2 sin constraint de region_id (campo no existe en schema actual)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add uses_dynamic_pricing column
-- ============================================================================

ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS uses_dynamic_pricing BOOLEAN DEFAULT false;

-- ============================================================================
-- 2. Add index for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cars_uses_dynamic_pricing
ON public.cars(uses_dynamic_pricing)
WHERE uses_dynamic_pricing = true;

-- ============================================================================
-- 3. Add column comment
-- ============================================================================

COMMENT ON COLUMN public.cars.uses_dynamic_pricing IS
  'True if car owner opted-in to dynamic pricing. False = fixed price_per_day. NOTE: Dynamic pricing requires valid region mapping (to be implemented).';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check column was added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'cars' AND column_name = 'uses_dynamic_pricing';

-- Test update (should succeed)
-- UPDATE cars SET uses_dynamic_pricing = true WHERE id = (SELECT id FROM cars LIMIT 1);

-- Count cars using dynamic pricing
-- SELECT
--   uses_dynamic_pricing,
--   COUNT(*) as count
-- FROM public.cars
-- GROUP BY uses_dynamic_pricing;
