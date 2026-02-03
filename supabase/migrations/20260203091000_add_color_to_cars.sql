-- ============================================================================
-- ADD: color column to cars table
-- Date: 2026-02-03
-- Reason: Form sends color field but column was missing
-- ============================================================================

ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS color TEXT;

COMMENT ON COLUMN public.cars.color IS 'Vehicle color (e.g., Blanco, Negro, Rojo)';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
