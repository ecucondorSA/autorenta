-- ============================================================================
-- RATE LIMITING SYSTEM
-- Created: 2025-11-07
-- Purpose: Implement rate limiting to protect against DDoS and abuse
-- Related: Issue #114 P0 Blocker #3 - DDoS Protection
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Rate limit tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifier (can be user_id, IP address, or API key)
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user_id', 'ip_address', 'api_key', 'anonymous')),

  -- Endpoint tracking
  endpoint TEXT NOT NULL, -- e.g., '/wallet-deposit', '/create-preference', 'global'

  -- Request counts
  request_count INTEGER NOT NULL DEFAULT 1,

  -- Time window
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,

  -- Metadata
  first_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_rate_limit_identifier ON public.rate_limit_tracking(identifier, endpoint, window_end);
CREATE INDEX idx_rate_limit_window ON public.rate_limit_tracking(window_end);
CREATE INDEX idx_rate_limit_cleanup ON public.rate_limit_tracking(created_at) WHERE window_end < NOW();

-- Composite index for sliding window queries
CREATE INDEX idx_rate_limit_active_windows ON public.rate_limit_tracking(identifier, endpoint, window_start, window_end);

-- ============================================================================
-- SECTION 2: Additional rate limit configurations
-- ============================================================================

INSERT INTO public.platform_config (key, value, data_type, description, category, is_public)
VALUES
  -- Per-endpoint rate limits (per minute)
  ('limits.api.anonymous.per_minute', '10', 'number', 'API calls per minute for anonymous users', 'limits', false),
  ('limits.api.authenticated.per_minute', '100', 'number', 'API calls per minute for authenticated users', 'limits', false),
  ('limits.api.admin.per_minute', '500', 'number', 'API calls per minute for admin users', 'limits', false),

  -- File upload limits
  ('limits.uploads.per_hour', '10', 'number', 'File uploads per hour per user', 'limits', true),
  ('limits.uploads.max_size_mb', '10', 'number', 'Maximum file size in MB', 'limits', true),

  -- Webhook limits (per minute)
  ('limits.webhooks.per_minute', '1000', 'number', 'Webhook requests per minute', 'limits', false),

  -- Specific operation limits
  ('limits.wallet.deposits_per_hour', '5', 'number', 'Wallet deposits per hour per user', 'limits', true),
  ('limits.wallet.withdrawals_per_day', '3', 'number', 'Wallet withdrawals per day per user', 'limits', true),
  ('limits.bookings.per_day', '10', 'number', 'Booking requests per day per user', 'limits', true),
  ('limits.messages.per_minute', '20', 'number', 'Messages per minute per user', 'limits', true),

  -- Window sizes (in seconds)
  ('limits.window.minute', '60', 'number', 'Time window for per-minute limits (seconds)', 'limits', false),
  ('limits.window.hour', '3600', 'number', 'Time window for per-hour limits (seconds)', 'limits', false),
  ('limits.window.day', '86400', 'number', 'Time window for per-day limits (seconds)', 'limits', false)

ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECTION 3: Rate limiting function (sliding window algorithm)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'user_id',
  p_endpoint TEXT DEFAULT 'global',
  p_limit INTEGER DEFAULT 100,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_count INTEGER,
  limit_value INTEGER,
  window_reset_at TIMESTAMPTZ,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_count INTEGER;
  v_allowed BOOLEAN;
  v_retry_after INTEGER;
BEGIN
  -- Calculate sliding window
  v_window_end := NOW();
  v_window_start := v_window_end - (p_window_seconds || ' seconds')::INTERVAL;

  -- Count requests in current window (sliding window)
  SELECT COALESCE(SUM(request_count), 0)
  INTO v_current_count
  FROM public.rate_limit_tracking
  WHERE
    identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_end > v_window_start
    AND window_start <= v_window_end;

  -- Check if limit exceeded
  v_allowed := v_current_count < p_limit;

  -- Calculate retry_after (seconds until oldest request in window expires)
  IF NOT v_allowed THEN
    SELECT EXTRACT(EPOCH FROM (window_end - NOW()))::INTEGER
    INTO v_retry_after
    FROM public.rate_limit_tracking
    WHERE
      identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_end > v_window_start
    ORDER BY window_start ASC
    LIMIT 1;

    v_retry_after := GREATEST(v_retry_after, 1); -- At least 1 second
  ELSE
    v_retry_after := 0;
  END IF;

  -- Return result
  RETURN QUERY SELECT
    v_allowed,
    v_current_count,
    p_limit,
    v_window_start + (p_window_seconds || ' seconds')::INTERVAL,
    v_retry_after;
END;
$$;

-- ============================================================================
-- SECTION 4: Function to record rate limit request
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_rate_limit_request(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'user_id',
  p_endpoint TEXT DEFAULT 'global',
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  v_window_start := NOW();
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

  -- Insert or update tracking record
  INSERT INTO public.rate_limit_tracking (
    identifier,
    identifier_type,
    endpoint,
    request_count,
    window_start,
    window_end,
    last_request_at
  )
  VALUES (
    p_identifier,
    p_identifier_type,
    p_endpoint,
    1,
    v_window_start,
    v_window_end,
    NOW()
  )
  ON CONFLICT (identifier, endpoint, window_start, window_end)
  WHERE identifier = p_identifier AND endpoint = p_endpoint
  DO UPDATE SET
    request_count = rate_limit_tracking.request_count + 1,
    last_request_at = NOW();
END;
$$;

-- ============================================================================
-- SECTION 5: Cleanup function for expired rate limit records
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_tracking()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.rate_limit_tracking
  WHERE window_end < (NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- SECTION 6: Helper function to get rate limit for user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_rate_limit(
  p_user_id UUID DEFAULT NULL,
  p_endpoint TEXT DEFAULT 'global'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_limit INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- If no user_id, use anonymous limit
  IF p_user_id IS NULL THEN
    RETURN config_get_number('limits.api.anonymous.per_minute')::INTEGER;
  END IF;

  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = p_user_id;

  -- Return appropriate limit
  IF v_is_admin THEN
    RETURN config_get_number('limits.api.admin.per_minute')::INTEGER;
  ELSE
    RETURN config_get_number('limits.api.authenticated.per_minute')::INTEGER;
  END IF;
END;
$$;

-- ============================================================================
-- SECTION 7: Combined function to check and record rate limit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
  p_identifier TEXT DEFAULT NULL,
  p_endpoint TEXT DEFAULT 'global',
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_count INTEGER,
  limit_value INTEGER,
  window_reset_at TIMESTAMPTZ,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_identifier TEXT;
  v_identifier_type TEXT;
  v_limit INTEGER;
  v_result RECORD;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Determine identifier and type
  IF p_identifier IS NOT NULL THEN
    v_identifier := p_identifier;
    v_identifier_type := 'ip_address'; -- Assume IP if explicitly provided
  ELSIF v_user_id IS NOT NULL THEN
    v_identifier := v_user_id::TEXT;
    v_identifier_type := 'user_id';
  ELSE
    v_identifier := 'anonymous';
    v_identifier_type := 'anonymous';
  END IF;

  -- Get appropriate rate limit for user
  v_limit := get_user_rate_limit(v_user_id, p_endpoint);

  -- Check rate limit
  SELECT * INTO v_result
  FROM check_rate_limit(
    v_identifier,
    v_identifier_type,
    p_endpoint,
    v_limit,
    p_window_seconds
  );

  -- If allowed, record the request
  IF v_result.allowed THEN
    PERFORM record_rate_limit_request(
      v_identifier,
      v_identifier_type,
      p_endpoint,
      p_window_seconds
    );
  END IF;

  -- Return result
  RETURN QUERY SELECT
    v_result.allowed,
    v_result.current_count,
    v_result.limit_value,
    v_result.window_reset_at,
    v_result.retry_after_seconds;
END;
$$;

-- ============================================================================
-- SECTION 8: RLS Policies
-- ============================================================================

ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can view rate limit tracking
CREATE POLICY "Only admins can view rate limit tracking"
ON public.rate_limit_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- No direct INSERT/UPDATE/DELETE by users
CREATE POLICY "No direct modifications to rate limit tracking"
ON public.rate_limit_tracking FOR ALL
USING (false);

-- ============================================================================
-- SECTION 9: Grant permissions
-- ============================================================================

GRANT SELECT ON public.rate_limit_tracking TO authenticated;
GRANT ALL ON public.rate_limit_tracking TO service_role;

GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_rate_limit_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit_tracking TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit TO authenticated;

-- ============================================================================
-- SECTION 10: Comments
-- ============================================================================

COMMENT ON TABLE public.rate_limit_tracking IS 'Tracks API rate limits using sliding window algorithm';
COMMENT ON FUNCTION public.check_rate_limit IS 'Check if rate limit is exceeded (sliding window)';
COMMENT ON FUNCTION public.record_rate_limit_request IS 'Record a rate limit request';
COMMENT ON FUNCTION public.cleanup_rate_limit_tracking IS 'Cleanup expired rate limit records (run via cron)';
COMMENT ON FUNCTION public.get_user_rate_limit IS 'Get rate limit for user based on role';
COMMENT ON FUNCTION public.enforce_rate_limit IS 'Check and record rate limit in one call';

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Test rate limit check:
-- SELECT * FROM enforce_rate_limit(endpoint := 'test-endpoint');

-- Test multiple requests:
-- DO $$
-- BEGIN
--   FOR i IN 1..105 LOOP
--     PERFORM enforce_rate_limit(endpoint := 'test-loop');
--   END LOOP;
-- END $$;
--
-- SELECT * FROM enforce_rate_limit(endpoint := 'test-loop');

-- View rate limit tracking:
-- SELECT * FROM rate_limit_tracking ORDER BY created_at DESC LIMIT 10;

-- Cleanup old records:
-- SELECT cleanup_rate_limit_tracking();

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS public.enforce_rate_limit(TEXT, TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.get_user_rate_limit(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.cleanup_rate_limit_tracking();
-- DROP FUNCTION IF EXISTS public.record_rate_limit_request(TEXT, TEXT, TEXT, INTEGER);
-- DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, TEXT, TEXT, INTEGER, INTEGER);
-- DROP TABLE IF EXISTS public.rate_limit_tracking CASCADE;

COMMIT;
