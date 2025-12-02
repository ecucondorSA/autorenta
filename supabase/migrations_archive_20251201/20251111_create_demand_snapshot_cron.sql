-- ============================================================================
-- MIGRATION: Create Cron Job for Dynamic Pricing Demand Snapshots
-- Date: 2025-11-11
-- Purpose: Schedule automatic updates of demand snapshots every 15 minutes
-- Impact: Enables real-time surge pricing based on current demand
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Enable pg_cron extension (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. Create wrapper function to update all active regions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_all_demand_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region RECORD;
  v_updated_count INT := 0;
  v_error_count INT := 0;
BEGIN
  -- Loop through all active pricing regions
  FOR v_region IN
    SELECT id, name
    FROM public.pricing_regions
    WHERE active = true
  LOOP
    BEGIN
      -- Update demand snapshot for this region
      PERFORM public.update_demand_snapshot(v_region.id);
      v_updated_count := v_updated_count + 1;

      -- Log success (optional, for debugging)
      RAISE NOTICE 'Updated demand snapshot for region: % (id: %)', v_region.name, v_region.id;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other regions
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Failed to update demand snapshot for region % (id: %): %',
        v_region.name, v_region.id, SQLERRM;
    END;
  END LOOP;

  -- Log summary
  RAISE NOTICE 'Demand snapshot update complete: % successful, % errors',
    v_updated_count, v_error_count;
END;
$$;

-- ============================================================================
-- 3. Add function comment
-- ============================================================================

COMMENT ON FUNCTION public.update_all_demand_snapshots() IS
  'Wrapper function that updates demand snapshots for all active pricing regions. Called by cron job every 15 minutes to enable real-time surge pricing.';

-- ============================================================================
-- 4. Grant execute permissions to service role only
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_all_demand_snapshots() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_demand_snapshot(UUID) TO service_role;

-- ============================================================================
-- 5. Schedule cron job to run every 15 minutes
-- ============================================================================

-- Remove existing job if it exists (to avoid duplicates on re-runs)
SELECT cron.unschedule('update-demand-snapshots-every-15min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'update-demand-snapshots-every-15min'
);

-- Schedule new job
SELECT cron.schedule(
  'update-demand-snapshots-every-15min',  -- Job name
  '*/15 * * * *',                          -- Every 15 minutes (cron syntax)
  $$ SELECT public.update_all_demand_snapshots(); $$  -- SQL to execute
);

-- ============================================================================
-- 6. Create monitoring table for cron job health
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_cron_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  regions_updated INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for health monitoring queries
CREATE INDEX IF NOT EXISTS idx_pricing_cron_health_job_time
ON public.pricing_cron_health(job_name, last_run_at DESC);

-- ============================================================================
-- 7. Update wrapper function to log health status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_all_demand_snapshots()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region RECORD;
  v_updated_count INT := 0;
  v_error_count INT := 0;
  v_start_time TIMESTAMPTZ;
  v_duration_ms INT;
  v_error_msg TEXT := NULL;
BEGIN
  v_start_time := clock_timestamp();

  -- Loop through all active pricing regions
  FOR v_region IN
    SELECT id, name
    FROM public.pricing_regions
    WHERE active = true
  LOOP
    BEGIN
      -- Update demand snapshot for this region
      PERFORM public.update_demand_snapshot(v_region.id);
      v_updated_count := v_updated_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_error_msg := COALESCE(v_error_msg || '; ', '') ||
        format('Region %s: %s', v_region.name, SQLERRM);
      RAISE WARNING 'Failed to update demand snapshot for region % (id: %): %',
        v_region.name, v_region.id, SQLERRM;
    END;
  END LOOP;

  -- Calculate duration
  v_duration_ms := EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INT;

  -- Log health status
  INSERT INTO public.pricing_cron_health (
    job_name,
    last_run_at,
    status,
    regions_updated,
    error_message,
    duration_ms
  ) VALUES (
    'update-demand-snapshots-every-15min',
    v_start_time,
    CASE WHEN v_error_count = 0 THEN 'success' ELSE 'error' END,
    v_updated_count,
    v_error_msg,
    v_duration_ms
  );

  -- Clean up old health logs (keep last 7 days)
  DELETE FROM public.pricing_cron_health
  WHERE created_at < NOW() - INTERVAL '7 days';

END;
$$;

-- ============================================================================
-- 8. Enable RLS on health table
-- ============================================================================

ALTER TABLE public.pricing_cron_health ENABLE ROW LEVEL SECURITY;

-- Allow admins to read health status
CREATE POLICY "Admins can read cron health"
ON public.pricing_cron_health FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Grant select to authenticated users (admins only via RLS)
GRANT SELECT ON public.pricing_cron_health TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check if cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'update-demand-snapshots-every-15min';

-- Manually trigger the job (for testing)
-- SELECT public.update_all_demand_snapshots();

-- Check latest demand snapshots
-- SELECT
--   pr.name AS region,
--   pds.timestamp,
--   pds.available_cars,
--   pds.active_bookings,
--   pds.pending_requests,
--   pds.demand_ratio,
--   pds.surge_factor
-- FROM public.pricing_demand_snapshots pds
-- JOIN public.pricing_regions pr ON pds.region_id = pr.id
-- ORDER BY pr.name, pds.timestamp DESC;

-- Check cron job health
-- SELECT
--   last_run_at,
--   status,
--   regions_updated,
--   duration_ms,
--   error_message
-- FROM public.pricing_cron_health
-- ORDER BY last_run_at DESC
-- LIMIT 10;

-- Expected cron schedule:
-- - Runs at: :00, :15, :30, :45 of every hour
-- - Example times: 10:00, 10:15, 10:30, 10:45, 11:00, etc.

-- Monitor cron execution (pg_cron logs)
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-demand-snapshots-every-15min')
-- ORDER BY start_time DESC
-- LIMIT 20;
