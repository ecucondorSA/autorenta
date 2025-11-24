-- ============================================================================
-- MIGRATION 1: Drop Duplicate Indexes
-- ============================================================================
-- Date: 2025-11-24
-- Risk Level: LOW
-- Impact: Storage savings, slightly faster writes
-- Time Estimate: < 1 minute
-- ============================================================================

-- Issue 1: Table public.cars has identical indexes
-- Affected indexes: idx_cars_dynamic_pricing, idx_cars_uses_dynamic_pricing
-- Resolution: Drop idx_cars_uses_dynamic_pricing (keep the older one)
DROP INDEX IF EXISTS public.idx_cars_uses_dynamic_pricing;

-- Issue 2: Table public.payment_splits has identical indexes  
-- Affected indexes: idx_payment_splits_created, idx_payment_splits_created_at
-- Resolution: Drop idx_payment_splits_created_at (keep the older one)
DROP INDEX IF EXISTS public.idx_payment_splits_created_at;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify:
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND (indexname IN ('idx_cars_dynamic_pricing', 'idx_cars_uses_dynamic_pricing',
                   'idx_payment_splits_created', 'idx_payment_splits_created_at'))
ORDER BY tablename, indexname;

-- Expected: Only idx_cars_dynamic_pricing and idx_payment_splits_created should appear
