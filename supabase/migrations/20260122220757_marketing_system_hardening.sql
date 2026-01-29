-- Migration: Marketing System Hardening
-- Purpose: Fix token expiration issues, add retry logic with backoff, dead letter queue
-- Created: 2026-01-22
--
-- Fixes:
-- 1. Token expiration detection and alerts
-- 2. Automatic retry with exponential backoff
-- 3. Dead letter queue for failed posts
-- 4. Better error tracking and monitoring

-- ============================================================================
-- 1. CREATE DEAD LETTER QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketing_content_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_queue_id UUID NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT,
  text_content TEXT,
  media_url TEXT,
  media_type TEXT,
  hashtags TEXT[],
  original_scheduled_for TIMESTAMPTZ,
  total_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  all_errors JSONB DEFAULT '[]'::jsonb,
  moved_to_dlq_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_marketing_dlq_platform ON public.marketing_content_dlq(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_dlq_moved_at ON public.marketing_content_dlq(moved_to_dlq_at);

COMMENT ON TABLE public.marketing_content_dlq IS
'Dead letter queue for marketing posts that failed after max retries.
Posts here need manual review/intervention.';

-- ============================================================================
-- 2. ADD RETRY COLUMNS TO QUEUE TABLE
-- ============================================================================
ALTER TABLE public.marketing_content_queue
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_history JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 3. CREATE TOKEN EXPIRATION CHECK FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_social_media_tokens()
RETURNS TABLE (
  platform TEXT,
  status TEXT,
  days_until_expiry INTEGER,
  last_error TEXT,
  action_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.platform::TEXT,
    CASE
      WHEN c.is_active = false THEN 'INACTIVE'
      WHEN c.token_expires_at IS NULL THEN 'NO_EXPIRY_SET'
      WHEN c.token_expires_at < now() THEN 'EXPIRED'
      WHEN c.token_expires_at < now() + interval '7 days' THEN 'EXPIRING_SOON'
      WHEN c.token_expires_at < now() + interval '30 days' THEN 'WARNING'
      ELSE 'OK'
    END as status,
    EXTRACT(DAY FROM (c.token_expires_at - now()))::INTEGER as days_until_expiry,
    c.last_error,
    CASE
      WHEN c.is_active = false THEN true
      WHEN c.token_expires_at IS NULL THEN true
      WHEN c.token_expires_at < now() + interval '7 days' THEN true
      ELSE false
    END as action_required
  FROM public.social_media_credentials c
  WHERE c.platform IN ('instagram', 'facebook')  -- Only active platforms
  ORDER BY
    CASE
      WHEN c.token_expires_at IS NULL THEN 1
      WHEN c.token_expires_at < now() THEN 0
      ELSE 2
    END,
    c.token_expires_at ASC;
END;
$$;

COMMENT ON FUNCTION public.check_social_media_tokens() IS
'Returns status of all social media tokens. Use to monitor expiration.
Status: EXPIRED, EXPIRING_SOON (<7 days), WARNING (<30 days), OK, INACTIVE, NO_EXPIRY_SET';

-- ============================================================================
-- 4. FUNCTION TO MOVE FAILED POSTS TO DLQ
-- ============================================================================
CREATE OR REPLACE FUNCTION public.move_to_marketing_dlq(p_queue_id UUID, p_error TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_record RECORD;
  v_dlq_id UUID;
  v_all_errors JSONB;
BEGIN
  -- Get the queue record
  SELECT * INTO v_queue_record
  FROM public.marketing_content_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item % not found', p_queue_id;
  END IF;

  -- Build error history
  v_all_errors := COALESCE(v_queue_record.error_history, '[]'::jsonb);
  v_all_errors := v_all_errors || jsonb_build_object(
    'error', p_error,
    'timestamp', now(),
    'attempt', v_queue_record.attempts
  );

  -- Insert into DLQ
  INSERT INTO public.marketing_content_dlq (
    original_queue_id,
    platform,
    content_type,
    text_content,
    media_url,
    media_type,
    hashtags,
    original_scheduled_for,
    total_attempts,
    last_error,
    all_errors,
    metadata
  ) VALUES (
    v_queue_record.id,
    v_queue_record.platform,
    v_queue_record.content_type,
    v_queue_record.text_content,
    v_queue_record.media_url,
    v_queue_record.media_type,
    v_queue_record.hashtags,
    v_queue_record.scheduled_for,
    v_queue_record.attempts,
    p_error,
    v_all_errors,
    v_queue_record.metadata
  )
  RETURNING id INTO v_dlq_id;

  -- Delete from main queue
  DELETE FROM public.marketing_content_queue WHERE id = p_queue_id;

  -- Log the move
  INSERT INTO public.social_publishing_scheduler_log (
    job_name,
    execution_time,
    status,
    campaigns_processed,
    campaigns_published,
    error_message
  ) VALUES (
    'move-to-dlq',
    now(),
    'info',
    1,
    0,
    format('Moved post %s to DLQ. Platform: %s, Error: %s', p_queue_id, v_queue_record.platform, p_error)
  );

  RETURN v_dlq_id;
END;
$$;

-- ============================================================================
-- 5. IMPROVED MARK_FAILED FUNCTION WITH RETRY LOGIC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_marketing_post_failed(
  p_queue_id UUID,
  p_error_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_attempts INTEGER;
  v_max_attempts INTEGER := 5;  -- Increased from 3 to 5
  v_error_history JSONB;
  v_next_retry TIMESTAMPTZ;
  v_backoff_minutes INTEGER;
BEGIN
  -- Get current state
  SELECT attempts, error_history
  INTO v_current_attempts, v_error_history
  FROM public.marketing_content_queue
  WHERE id = p_queue_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_current_attempts := COALESCE(v_current_attempts, 0) + 1;
  v_error_history := COALESCE(v_error_history, '[]'::jsonb);

  -- Add to error history
  v_error_history := v_error_history || jsonb_build_object(
    'error', p_error_message,
    'timestamp', now(),
    'attempt', v_current_attempts
  );

  IF v_current_attempts >= v_max_attempts THEN
    -- Move to DLQ after max attempts
    PERFORM public.move_to_marketing_dlq(p_queue_id, p_error_message);
  ELSE
    -- Calculate exponential backoff: 5, 15, 45, 135 minutes
    v_backoff_minutes := 5 * power(3, v_current_attempts - 1);
    v_next_retry := now() + (v_backoff_minutes || ' minutes')::interval;

    -- Update with retry info
    UPDATE public.marketing_content_queue
    SET
      status = 'pending',  -- Back to pending for retry
      attempts = v_current_attempts,
      error_message = p_error_message,
      error_history = v_error_history,
      last_error_at = now(),
      next_retry_at = v_next_retry
    WHERE id = p_queue_id;

    RAISE NOTICE 'Post % scheduled for retry at % (attempt %/%)',
      p_queue_id, v_next_retry, v_current_attempts, v_max_attempts;
  END IF;
END;
$$;

-- ============================================================================
-- 6. CREATE FUNCTION TO LOG TOKEN ISSUES TO SCHEDULER LOG
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_token_expiration_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
  v_expiring_soon_count INTEGER;
  v_platforms TEXT;
BEGIN
  -- Count expired and expiring tokens
  SELECT
    COUNT(*) FILTER (WHERE token_expires_at < now()),
    COUNT(*) FILTER (WHERE token_expires_at >= now() AND token_expires_at < now() + interval '7 days'),
    string_agg(
      CASE
        WHEN token_expires_at < now() THEN platform || ' (EXPIRED)'
        WHEN token_expires_at < now() + interval '7 days' THEN platform || ' (expires in ' ||
          EXTRACT(DAY FROM (token_expires_at - now()))::INTEGER || ' days)'
        ELSE NULL
      END,
      ', '
    )
  INTO v_expired_count, v_expiring_soon_count, v_platforms
  FROM public.social_media_credentials
  WHERE is_active = true
    AND platform IN ('instagram', 'facebook')
    AND token_expires_at < now() + interval '7 days';

  -- Log if there are issues
  IF v_expired_count > 0 OR v_expiring_soon_count > 0 THEN
    INSERT INTO public.social_publishing_scheduler_log (
      job_name,
      execution_time,
      status,
      campaigns_processed,
      campaigns_published,
      error_message
    ) VALUES (
      'token-expiration-check',
      now(),
      CASE WHEN v_expired_count > 0 THEN 'error' ELSE 'warning' END,
      v_expired_count + v_expiring_soon_count,
      0,
      format('TOKEN ALERT: %s expired, %s expiring soon. Platforms: %s',
        v_expired_count, v_expiring_soon_count, v_platforms)
    );

    -- Also mark credentials with issues
    UPDATE public.social_media_credentials
    SET
      last_error = 'Token expired or expiring soon - needs renewal',
      updated_at = now()
    WHERE is_active = true
      AND platform IN ('instagram', 'facebook')
      AND token_expires_at < now() + interval '7 days';
  END IF;
END;
$$;

-- ============================================================================
-- 7. CREATE RETRY CRON JOB (Every 30 minutes)
-- ============================================================================
-- First, ensure we have a function to process retries with backoff
CREATE OR REPLACE FUNCTION public.process_marketing_retries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_retry_count INTEGER;
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Count posts ready for retry
  SELECT COUNT(*)
  INTO v_retry_count
  FROM public.marketing_content_queue
  WHERE status = 'pending'
    AND next_retry_at IS NOT NULL
    AND next_retry_at <= now()
    AND attempts > 0
    AND attempts < 5;

  IF v_retry_count = 0 THEN
    RETURN;
  END IF;

  RAISE NOTICE 'Found % posts ready for retry', v_retry_count;

  -- Get Supabase URL and key
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_supabase_key := current_setting('app.supabase_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
    v_supabase_key := NULL;
  END;

  IF v_supabase_url IS NULL OR v_supabase_key IS NULL THEN
    RAISE WARNING 'Supabase URL or Key not set. Cannot process retries.';
    RETURN;
  END IF;

  -- Trigger the marketing scheduler to process these
  PERFORM http_post(
    (v_supabase_url || '/functions/v1/marketing-scheduler')::text,
    jsonb_build_object('max_posts', 5, 'retry_mode', true),
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || v_supabase_key,
      'Content-Type', 'application/json'
    )
  );

  -- Log the retry attempt
  INSERT INTO public.social_publishing_scheduler_log (
    job_name,
    execution_time,
    status,
    campaigns_processed,
    campaigns_published,
    error_message
  ) VALUES (
    'marketing-retry-processor',
    now(),
    'info',
    v_retry_count,
    0,
    format('Triggered retry for %s pending posts', v_retry_count)
  );
END;
$$;

-- Schedule retry processor every 30 minutes
SELECT cron.schedule(
  'process-marketing-retries',
  '*/30 * * * *',
  'SELECT public.process_marketing_retries()'
);

-- ============================================================================
-- 8. CREATE TOKEN CHECK CRON JOB (Daily at 08:00 UTC)
-- ============================================================================
SELECT cron.schedule(
  'check-token-expiration',
  '0 8 * * *',
  'SELECT public.log_token_expiration_alerts()'
);

-- ============================================================================
-- 9. CREATE VIEW FOR MARKETING HEALTH DASHBOARD
-- ============================================================================
CREATE OR REPLACE VIEW public.marketing_system_health AS
SELECT
  'Queue Status' as category,
  jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'published', COUNT(*) FILTER (WHERE status = 'published'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'with_retries', COUNT(*) FILTER (WHERE attempts > 0 AND status = 'pending')
  ) as metrics
FROM public.marketing_content_queue
UNION ALL
SELECT
  'DLQ Status' as category,
  jsonb_build_object(
    'total_in_dlq', COUNT(*),
    'unresolved', COUNT(*) FILTER (WHERE resolved_at IS NULL),
    'oldest_unresolved', MIN(moved_to_dlq_at) FILTER (WHERE resolved_at IS NULL)
  ) as metrics
FROM public.marketing_content_dlq
UNION ALL
SELECT
  'Token Status' as category,
  jsonb_build_object(
    'total_active', COUNT(*) FILTER (WHERE is_active = true),
    'expired', COUNT(*) FILTER (WHERE token_expires_at < now()),
    'expiring_7_days', COUNT(*) FILTER (WHERE token_expires_at BETWEEN now() AND now() + interval '7 days'),
    'healthy', COUNT(*) FILTER (WHERE token_expires_at > now() + interval '7 days')
  ) as metrics
FROM public.social_media_credentials
WHERE platform IN ('instagram', 'facebook');

COMMENT ON VIEW public.marketing_system_health IS
'Dashboard view showing overall health of the marketing automation system.
Check this regularly to monitor queue status, DLQ, and token health.';

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON public.marketing_content_dlq TO authenticated;
GRANT SELECT ON public.marketing_system_health TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_social_media_tokens() TO authenticated;

-- ============================================================================
-- 11. LOG THIS MIGRATION
-- ============================================================================
INSERT INTO public.social_publishing_scheduler_log (
  job_name,
  execution_time,
  status,
  campaigns_processed,
  campaigns_published,
  error_message
) VALUES (
  'system-hardening-migration',
  now(),
  'success',
  0,
  0,
  'Applied marketing system hardening: DLQ, exponential backoff (5 retries), token monitoring, health dashboard'
);
