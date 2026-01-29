-- ============================================================================
-- MIGRATION: Fix vehicle_categories RLS policy
-- Date: 2025-11-12
-- Purpose: Enable public read access to vehicle_categories for pricing
-- Impact: Fixes "No categories available" error in publish form
-- ============================================================================

BEGIN;

-- ============================================================================
-- Create RLS policy for public read access to active categories
-- ============================================================================

-- Allow anyone (authenticated or anonymous) to read active categories
CREATE POLICY "Anyone can view active vehicle categories"
  ON public.vehicle_categories
  FOR SELECT
  USING (active = true);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test query (should return 4 categories)
-- SELECT id, code, name_es, active FROM vehicle_categories WHERE active = true ORDER BY display_order;






