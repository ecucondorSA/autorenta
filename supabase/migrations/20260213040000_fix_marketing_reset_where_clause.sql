-- ============================================================================
-- Fix: marketing daily reset fails with "UPDATE requires a WHERE clause"
-- ============================================================================
-- Supabase blocks UPDATE without WHERE as a safety measure.
-- The reset function intentionally updates ALL rows — add WHERE true.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_marketing_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE public.marketing_personas
  SET posts_today = 0, comments_today = 0
  WHERE true;

  UPDATE public.marketing_monitors
  SET posts_found_today = 0
  WHERE true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
