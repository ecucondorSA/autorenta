-- Migration: Schedule Daily Content Generation Batch
-- Purpose: Automatically generate 3-4 daily social media posts per platform
-- Created: 2026-01-19

-- 1. Create the generation function
-- NOTE: Function moved to 20260123025200_content_mix_strategy.sql (Content Mix 40/40/20)
-- Commented out to avoid guardrails duplicate warning
/*
CREATE OR REPLACE FUNCTION public.generate_daily_content_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_platforms text[] := ARRAY['tiktok', 'instagram', 'facebook', 'twitter'];
  v_content_types text[] := ARRAY['tip', 'promo', 'car_spotlight', 'testimonial', 'seasonal', 'community'];
  v_platform text;
  v_content_type text;
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Get secrets (assuming they are set in GUCs or we might need to rely on service_role being available implicitly if we use internal networking, but http extension usually needs full URL)
  -- Fallback to standard Supabase Env Vars if app. settings aren't there, though GUCs are session-local.
  -- In a real cron job, GUCs might not be set. We typically hardcode or use vault.
  -- However, for this fix, we will assume the previous pattern (using current_setting) works because it was used in 20260116161000.
  
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  -- Safety check: if variables are missing, we can't proceed.
  -- In a production cron, you often need to store these in a `secrets` table or use `vault`.
  -- Assuming the previous migration established a pattern or that these settings are set globally in postgres config.
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Key not set. Cannot generate content.';
    RETURN;
  END IF;

  FOREACH v_platform IN ARRAY v_platforms LOOP
    -- Pick random content type
    v_content_type := v_content_types[floor(random() * array_length(v_content_types, 1) + 1)];
    
    RAISE NOTICE 'Generating daily batch for % (Type: %)', v_platform, v_content_type;

    -- Call generate-marketing-content Edge Function
    PERFORM
      http_post(
        (v_supabase_url || '/functions/v1/generate-marketing-content')::text,
        jsonb_build_object(
          'platform', v_platform,
          'content_type', v_content_type,
          'batch_mode', true,
          'save_to_db', true,
          'language', 'es',
          'generate_image', true
        ),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer ' || v_supabase_key,
          'Content-Type', 'application/json'
        )
      );
  END LOOP;
END;
$$;
*/

-- 2. Schedule the cron job (Daily at 06:00 UTC)
-- This ensures posts are generated early in the day for the 09:00, 12:00, 19:00 slots.
SELECT cron.schedule(
  'generate-daily-marketing-content',
  '0 6 * * *',
  'SELECT public.generate_daily_content_batch()'
);

COMMENT ON FUNCTION public.generate_daily_content_batch() IS 'Triggers the generate-marketing-content Edge Function in batch mode for all platforms.';
