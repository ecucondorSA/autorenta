-- Migration: Fix Social Media Cron Logic
-- Purpose: Remove the 1-minute window restriction that causes missed posts
-- Date: 2026-01-19

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Redefine the function with the FIX
CREATE OR REPLACE FUNCTION public.publish_scheduled_campaigns()
RETURNS void AS $$
DECLARE
  v_campaign RECORD;
  v_supabase_url TEXT := current_setting('app.supabase_url', TRUE);
  v_supabase_key TEXT := current_setting('app.supabase_key', TRUE);
  v_url TEXT;
BEGIN
  -- Validate configuration
  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Missing app.supabase_url or app.supabase_key settings. Cron job cannot call Edge Function.';
    RETURN;
  END IF;

  -- Construct URL
  v_url := v_supabase_url || '/functions/v1/publish-to-social-media';

  -- Loop through ALL pending scheduled campaigns in the past
  -- Removing the "AND scheduled_for > now() - interval '1 minute'" restriction
  FOR v_campaign IN
    SELECT
      id,
      name,
      title,
      description_content,
      image_url,
      cta_text,
      cta_url,
      platforms,
      scheduled_for
    FROM public.campaign_schedules
    WHERE
      status = 'scheduled'
      AND is_scheduled = true
      AND scheduled_for <= now()
    ORDER BY scheduled_for ASC
  LOOP
    RAISE NOTICE 'Publishing campaign: % (Scheduled for: %)', v_campaign.name, v_campaign.scheduled_for;

    -- Optimistic locking: Update status to publishing immediately
    UPDATE public.campaign_schedules
    SET status = 'publishing'
    WHERE id = v_campaign.id;

    -- Call Edge Function
    PERFORM
      http_post(
        v_url,
        jsonb_build_object(
          'campaignId', v_campaign.id::text,
          'title', v_campaign.title,
          'description', v_campaign.description_content,
          'imageUrl', v_campaign.image_url,
          'ctaText', v_campaign.cta_text,
          'ctaUrl', v_campaign.cta_url,
          'platforms', v_campaign.platforms
        ),
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer ' || v_supabase_key,
          'Content-Type', 'application/json'
        )
      );

    RAISE NOTICE 'Campaign % triggered successfully', v_campaign.name;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Refresh the view to ensure it matches the logic
CREATE OR REPLACE VIEW public.upcoming_scheduled_campaigns AS
SELECT
  id,
  name,
  title,
  scheduled_for,
  platforms,
  status,
  (scheduled_for - now())::text as time_until_publish
FROM public.campaign_schedules
WHERE
  status = 'scheduled'
  AND is_scheduled = true
  AND scheduled_for > now()
ORDER BY scheduled_for ASC;
