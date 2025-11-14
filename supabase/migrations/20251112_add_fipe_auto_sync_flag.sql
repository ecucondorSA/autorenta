-- ============================================================================
-- MIGRATION: Add FIPE auto-sync flag to cars table
-- Date: 2025-11-12
-- Purpose: Allow users to enable/disable automatic FIPE value synchronization
--
-- Why:
-- - Some users may want to manually set prices instead of auto-syncing from FIPE
-- - Enables future cron job to only sync cars with this flag enabled
-- - Gives users control over their vehicle pricing strategy
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add auto-sync flag to cars table
-- ============================================================================

ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS value_auto_sync_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.cars.value_auto_sync_enabled IS
'When enabled, the vehicle value will be automatically synced with FIPE API daily. When disabled, owner must manually update prices.';

-- ============================================================================
-- Create index for cron job queries
-- ============================================================================

-- Index to efficiently find cars that need auto-sync
CREATE INDEX IF NOT EXISTS idx_cars_auto_sync_enabled
ON public.cars(value_auto_sync_enabled)
WHERE value_auto_sync_enabled = true AND status = 'active';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View schema changes
-- \d+ cars

-- Count cars with auto-sync enabled
-- SELECT COUNT(*) FROM public.cars WHERE value_auto_sync_enabled = true;

-- View cars that would be auto-synced (for cron job preview)
-- SELECT
--   id,
--   brand_text_backup,
--   model_text_backup,
--   year,
--   value_usd,
--   value_brl,
--   fipe_last_sync,
--   value_auto_sync_enabled
-- FROM public.cars
-- WHERE value_auto_sync_enabled = true
--   AND status = 'active'
-- ORDER BY fipe_last_sync ASC NULLS FIRST
-- LIMIT 10;
