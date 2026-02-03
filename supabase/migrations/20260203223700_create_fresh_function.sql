-- Create function with a fresh name to bypass PostgREST cache issues
-- This is a workaround for the stubborn schema cache

CREATE OR REPLACE FUNCTION public.fetch_payment_retries(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  payment_id UUID,
  payment_intent_id UUID,
  booking_id UUID,
  user_id UUID,
  mp_payment_id TEXT,
  amount_cents BIGINT,
  currency TEXT,
  payment_method_id TEXT,
  card_last4 TEXT,
  attempt INTEGER,
  max_attempts INTEGER,
  next_retry_at TIMESTAMPTZ,
  retry_interval_minutes INTEGER,
  status TEXT,
  last_error TEXT,
  last_error_code TEXT,
  reason TEXT,
  original_status TEXT,
  original_status_detail TEXT,
  successful_payment_id TEXT,
  successful_at TIMESTAMPTZ,
  user_notified_count INTEGER,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, payment_id, payment_intent_id, booking_id, user_id,
    mp_payment_id, amount_cents, currency, payment_method_id, card_last4,
    attempt, max_attempts, next_retry_at, retry_interval_minutes, status,
    last_error, last_error_code, reason, original_status, original_status_detail,
    successful_payment_id, successful_at, user_notified_count, last_notified_at,
    created_at, updated_at
  FROM public.payment_retry_queue
  WHERE status = 'pending'
    AND next_retry_at <= NOW()
    AND attempt < max_attempts
  ORDER BY next_retry_at ASC
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fetch_payment_retries(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.fetch_payment_retries(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_payment_retries(INTEGER) TO service_role;

COMMENT ON FUNCTION public.fetch_payment_retries(INTEGER) IS 'Fetch pending payment retries for processing';
