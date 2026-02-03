-- ============================================================================
-- MIGRATION FIX: Complete payment_retry_queue setup
-- Date: 2026-02-03
-- Purpose: Fix RLS policies and create missing functions
-- ============================================================================

-- 1. Create is_admin function if not exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- 2. Drop existing policies if they exist (from partial migration)
DROP POLICY IF EXISTS "Admins full access to retry queue" ON public.payment_retry_queue;
DROP POLICY IF EXISTS "Users can view their own retries" ON public.payment_retry_queue;
DROP POLICY IF EXISTS "Service role can manage retry queue" ON public.payment_retry_queue;

-- 3. Re-create RLS Policies
CREATE POLICY "Admins full access to retry queue"
  ON public.payment_retry_queue FOR ALL
  USING (public.is_admin());

CREATE POLICY "Users can view their own retries"
  ON public.payment_retry_queue FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage retry queue"
  ON public.payment_retry_queue FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_payment_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_retry_updated_at ON public.payment_retry_queue;
CREATE TRIGGER trg_payment_retry_updated_at
  BEFORE UPDATE ON public.payment_retry_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_retry_queue_updated_at();

-- 5. RPC: enqueue_payment_retry
CREATE OR REPLACE FUNCTION public.enqueue_payment_retry(
  p_payment_id UUID DEFAULT NULL,
  p_payment_intent_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_mp_payment_id TEXT DEFAULT NULL,
  p_amount_cents BIGINT DEFAULT NULL,
  p_reason TEXT DEFAULT 'rejected',
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_payment_method_id TEXT DEFAULT NULL,
  p_original_status TEXT DEFAULT NULL,
  p_original_status_detail TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry_id UUID;
  v_existing_retry UUID;
  v_user_id UUID;
  v_booking_id UUID;
  v_amount_cents BIGINT;
BEGIN
  -- Check for existing pending retry for same payment
  SELECT id INTO v_existing_retry
  FROM public.payment_retry_queue
  WHERE (mp_payment_id = p_mp_payment_id OR payment_id = p_payment_id OR payment_intent_id = p_payment_intent_id)
    AND status = 'pending'
  LIMIT 1;

  IF v_existing_retry IS NOT NULL THEN
    UPDATE public.payment_retry_queue
    SET last_error = p_error_message,
        last_error_code = p_error_code,
        updated_at = NOW()
    WHERE id = v_existing_retry;
    RETURN v_existing_retry;
  END IF;

  v_user_id := p_user_id;
  v_booking_id := p_booking_id;
  v_amount_cents := p_amount_cents;

  IF v_user_id IS NULL AND p_payment_id IS NOT NULL THEN
    SELECT p.user_id, p.booking_id, p.amount_cents
    INTO v_user_id, v_booking_id, v_amount_cents
    FROM public.payments p
    WHERE p.id = p_payment_id;
  END IF;

  IF v_user_id IS NULL AND p_payment_intent_id IS NOT NULL THEN
    SELECT pi.user_id, pi.booking_id, pi.amount_cents
    INTO v_user_id, v_booking_id, v_amount_cents
    FROM public.payment_intents pi
    WHERE pi.id = p_payment_intent_id;
  END IF;

  IF v_user_id IS NULL AND v_booking_id IS NOT NULL THEN
    SELECT b.renter_id INTO v_user_id
    FROM public.bookings b
    WHERE b.id = v_booking_id;
  END IF;

  INSERT INTO public.payment_retry_queue (
    payment_id, payment_intent_id, booking_id, user_id, mp_payment_id,
    amount_cents, payment_method_id, attempt, next_retry_at,
    retry_interval_minutes, status, reason, last_error, last_error_code,
    original_status, original_status_detail
  ) VALUES (
    p_payment_id, p_payment_intent_id, COALESCE(p_booking_id, v_booking_id),
    v_user_id, p_mp_payment_id, COALESCE(p_amount_cents, v_amount_cents, 0),
    p_payment_method_id, 0, NOW() + INTERVAL '1 hour', 60, 'pending',
    p_reason, p_error_message, p_error_code, p_original_status, p_original_status_detail
  )
  RETURNING id INTO v_retry_id;

  RETURN v_retry_id;
END;
$$;

-- 6. RPC: get_pending_retries
CREATE OR REPLACE FUNCTION public.get_pending_retries(p_limit INTEGER DEFAULT 50)
RETURNS SETOF public.payment_retry_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.payment_retry_queue
  WHERE status = 'pending'
    AND next_retry_at <= NOW()
    AND attempt < max_attempts
  ORDER BY next_retry_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- 7. RPC: update_retry_result
CREATE OR REPLACE FUNCTION public.update_retry_result(
  p_retry_id UUID,
  p_success BOOLEAN,
  p_new_payment_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retry RECORD;
  v_next_interval INTEGER;
BEGIN
  SELECT * INTO v_retry
  FROM public.payment_retry_queue
  WHERE id = p_retry_id
  FOR UPDATE;

  IF v_retry IS NULL THEN
    RETURN jsonb_build_object('error', 'Retry not found');
  END IF;

  IF p_success THEN
    UPDATE public.payment_retry_queue
    SET status = 'success',
        successful_payment_id = p_new_payment_id,
        successful_at = NOW(),
        attempt = attempt + 1
    WHERE id = p_retry_id;

    RETURN jsonb_build_object('success', true, 'status', 'success', 'payment_id', p_new_payment_id);
  ELSE
    v_next_interval := CASE v_retry.attempt
      WHEN 0 THEN 60
      WHEN 1 THEN 1440
      ELSE 2880
    END;

    IF v_retry.attempt + 1 >= v_retry.max_attempts THEN
      UPDATE public.payment_retry_queue
      SET status = 'exhausted', attempt = attempt + 1,
          last_error = p_error_message, last_error_code = p_error_code
      WHERE id = p_retry_id;

      RETURN jsonb_build_object('success', false, 'status', 'exhausted', 'message', 'All retry attempts exhausted');
    ELSE
      UPDATE public.payment_retry_queue
      SET attempt = attempt + 1,
          next_retry_at = NOW() + (v_next_interval || ' minutes')::INTERVAL,
          retry_interval_minutes = v_next_interval,
          last_error = p_error_message, last_error_code = p_error_code,
          status = 'pending'
      WHERE id = p_retry_id;

      RETURN jsonb_build_object('success', false, 'status', 'pending',
        'next_retry_at', NOW() + (v_next_interval || ' minutes')::INTERVAL,
        'attempt', v_retry.attempt + 1);
    END IF;
  END IF;
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_payment_retry TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_retries TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_retry_result TO authenticated;
