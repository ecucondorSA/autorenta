-- Migration: Suspend TikTok and Twitter Marketing
-- Purpose: Disable TikTok and Twitter from automated marketing (not functioning)
-- Created: 2026-01-22
--
-- Only Instagram and Facebook will continue generating/publishing content.

-- ============================================================================
-- 1. UPDATE generate_daily_content_batch() to exclude TikTok and Twitter
-- NOTE: Function moved to 20260123025200_content_mix_strategy.sql (Content Mix 40/40/20)
-- Commented out to avoid guardrails duplicate warning
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.generate_daily_content_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  -- SUSPENDED: TikTok and Twitter (2026-01-22)
  -- Only Instagram and Facebook are active
  v_platforms text[] := ARRAY['instagram', 'facebook'];
  v_content_types text[] := ARRAY['tip', 'promo', 'car_spotlight', 'testimonial', 'seasonal', 'community'];
  v_platform text;
  v_content_type text;
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

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

  RAISE NOTICE 'Daily content generation completed. Active platforms: instagram, facebook. Suspended: tiktok, twitter';
END;
$$;

COMMENT ON FUNCTION public.generate_daily_content_batch() IS
'Generates daily marketing content for Instagram and Facebook only.
TikTok and Twitter SUSPENDED as of 2026-01-22 (APIs not functioning).';
*/

-- ============================================================================
-- 2. Cancel any pending TikTok/Twitter posts in queue
-- ============================================================================
UPDATE public.marketing_content_queue
SET
  status = 'cancelled',
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"cancelled_reason": "Platform suspended 2026-01-22"}'::jsonb
WHERE
  platform IN ('tiktok', 'twitter')
  AND status = 'pending';

-- ============================================================================
-- 3. Mark TikTok/Twitter credentials as inactive (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_media_credentials') THEN
    UPDATE public.social_media_credentials
    SET
      is_active = false,
      updated_at = now()
    WHERE platform IN ('tiktok', 'twitter');

    RAISE NOTICE 'Deactivated TikTok and Twitter credentials';
  END IF;
END $$;

-- ============================================================================
-- 4. Create a view to see suspended platforms status
-- ============================================================================
CREATE OR REPLACE VIEW public.marketing_platforms_status AS
SELECT
  platform,
  CASE
    WHEN platform IN ('instagram', 'facebook') THEN 'active'
    WHEN platform IN ('tiktok', 'twitter') THEN 'suspended'
    ELSE 'unknown'
  END as status,
  CASE
    WHEN platform IN ('tiktok', 'twitter') THEN '2026-01-22'
    ELSE NULL
  END as suspended_since,
  CASE
    WHEN platform = 'tiktok' THEN 'TikTok Content Posting API requires video - not integrated'
    WHEN platform = 'twitter' THEN 'Twitter API v2 authentication issues'
    ELSE NULL
  END as suspension_reason
FROM unnest(ARRAY['instagram', 'facebook', 'tiktok', 'twitter']) as platform;

COMMENT ON VIEW public.marketing_platforms_status IS
'Shows the status of each marketing platform.
Instagram and Facebook: ACTIVE
TikTok and Twitter: SUSPENDED as of 2026-01-22';

-- ============================================================================
-- 5. Log the change
-- ============================================================================
INSERT INTO public.social_publishing_scheduler_log (
  job_name,
  execution_time,
  status,
  campaigns_processed,
  campaigns_published,
  error_message
) VALUES (
  'platform-suspension',
  now(),
  'success',
  0,
  0,
  'Suspended TikTok and Twitter marketing. Only Instagram and Facebook remain active.'
);
