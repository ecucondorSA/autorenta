-- ============================================================================
-- MIGRATION: Add uses_dynamic_pricing to cars table
-- Date: 2025-11-11
-- Purpose: Allow car owners to opt-in to dynamic pricing
-- Impact: Cars can choose between fixed pricing or dynamic pricing
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
  'True if car owner opted-in to dynamic pricing. False = fixed price_per_day. Requires valid region_id to use dynamic pricing.';

-- ============================================================================
-- 4. Add validation constraint (optional but recommended)
-- ============================================================================

-- If uses_dynamic_pricing is true, region_id must be set
ALTER TABLE public.cars
ADD CONSTRAINT check_dynamic_pricing_requires_region
CHECK (
  uses_dynamic_pricing = false OR
  (uses_dynamic_pricing = true AND region_id IS NOT NULL)
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check column was added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'cars' AND column_name = 'uses_dynamic_pricing';

-- Check constraint exists
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.cars'::regclass
--   AND conname = 'check_dynamic_pricing_requires_region';

-- Test constraint (should fail - no region_id)
-- UPDATE cars SET uses_dynamic_pricing = true WHERE region_id IS NULL LIMIT 1;
-- Expected: ERROR - violates check constraint "check_dynamic_pricing_requires_region"

-- Test valid update
-- UPDATE cars SET uses_dynamic_pricing = true WHERE region_id IS NOT NULL LIMIT 1;
-- Expected: SUCCESS

-- Count cars using dynamic pricing
-- SELECT
--   uses_dynamic_pricing,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE region_id IS NOT NULL) as with_region
-- FROM public.cars
-- GROUP BY uses_dynamic_pricing;
