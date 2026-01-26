-- ✅ P0-024 FIX: Payment Webhook Retry Queue
--
-- Problem: If webhook fails 3 times, payment not processed and no manual review queue
-- Solution: Create retry queue table for failed webhooks
--
-- Created: 2025-11-24
-- Migration: 20251124_webhook_retry_queue.sql

-- Create webhook retry queue table
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook identification
  event_id TEXT NOT NULL, -- From x-request-id header
  mp_payment_id TEXT, -- MercadoPago payment ID

  -- Webhook data
  webhook_type TEXT NOT NULL, -- 'payment', 'merchant_order', etc.
  payload JSONB NOT NULL, -- Full webhook payload
  headers JSONB, -- Request headers for debugging

  -- Retry metadata
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ, -- When to retry next (exponential backoff)

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'retrying', 'succeeded', 'failed', 'manual_review'

  -- Error tracking
  last_error_message TEXT,
  last_error_details JSONB,
  error_history JSONB DEFAULT '[]'::JSONB, -- Array of error objects

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_status ON webhook_retry_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_next_retry ON webhook_retry_queue(next_retry_at)
WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_event_id ON webhook_retry_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_retry_queue_mp_payment_id ON webhook_retry_queue(mp_payment_id);

-- RLS Policies
ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view retry queue
CREATE POLICY webhook_retry_queue_admin_select ON webhook_retry_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role_name = 'admin'
    )
  );

-- Only service role can insert/update
CREATE POLICY webhook_retry_queue_service_all ON webhook_retry_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to add webhook to retry queue
CREATE OR REPLACE FUNCTION add_webhook_to_retry_queue(
  p_event_id TEXT,
  p_mp_payment_id TEXT,
  p_webhook_type TEXT,
  p_payload JSONB,
  p_headers JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_queue_id UUID;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Calculate next retry time (start with 5 minutes)
  v_next_retry := NOW() + INTERVAL '5 minutes';

  -- Insert into retry queue
  INSERT INTO webhook_retry_queue (
    event_id,
    mp_payment_id,
    webhook_type,
    payload,
    headers,
    status,
    retry_count,
    next_retry_at,
    last_error_message,
    last_error_details,
    error_history
  ) VALUES (
    p_event_id,
    p_mp_payment_id,
    p_webhook_type,
    p_payload,
    p_headers,
    'pending',
    0,
    v_next_retry,
    p_error_message,
    p_error_details,
    CASE
      WHEN p_error_message IS NOT NULL
      THEN jsonb_build_array(
        jsonb_build_object(
          'message', p_error_message,
          'details', p_error_details,
          'timestamp', NOW()
        )
      )
      ELSE '[]'::JSONB
    END
  )
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Function to update retry attempt
CREATE OR REPLACE FUNCTION update_webhook_retry_attempt(
  p_queue_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_retry INTEGER;
  v_max_retries INTEGER;
  v_next_retry TIMESTAMPTZ;
  v_new_status TEXT;
BEGIN
  -- Get current retry count
  SELECT retry_count, max_retries
  INTO v_current_retry, v_max_retries
  FROM webhook_retry_queue
  WHERE id = p_queue_id;

  IF p_success THEN
    -- Success - mark as succeeded
    UPDATE webhook_retry_queue
    SET
      status = 'succeeded',
      resolved_at = NOW(),
      updated_at = NOW()
    WHERE id = p_queue_id;
  ELSE
    -- Failed - increment retry count
    v_current_retry := v_current_retry + 1;

    -- Calculate next retry with exponential backoff
    -- 5 min, 10 min, 20 min, 40 min, 80 min (max ~1.3 hours)
    v_next_retry := NOW() + (INTERVAL '5 minutes' * POWER(2, v_current_retry));

    -- Determine new status
    IF v_current_retry >= v_max_retries THEN
      v_new_status := 'manual_review';
      v_next_retry := NULL; -- No more automatic retries
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Update retry queue
    UPDATE webhook_retry_queue
    SET
      retry_count = v_current_retry,
      status = v_new_status,
      last_retry_at = NOW(),
      next_retry_at = v_next_retry,
      last_error_message = p_error_message,
      last_error_details = p_error_details,
      error_history = error_history || jsonb_build_array(
        jsonb_build_object(
          'message', p_error_message,
          'details', p_error_details,
          'timestamp', NOW(),
          'retry_attempt', v_current_retry
        )
      ),
      updated_at = NOW()
    WHERE id = p_queue_id;
  END IF;
END;
$$;

-- Function to get pending retries
CREATE OR REPLACE FUNCTION get_pending_webhook_retries()
RETURNS TABLE (
  id UUID,
  event_id TEXT,
  mp_payment_id TEXT,
  webhook_type TEXT,
  payload JSONB,
  retry_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    event_id,
    mp_payment_id,
    webhook_type,
    payload,
    retry_count
  FROM webhook_retry_queue
  WHERE status IN ('pending', 'retrying')
    AND next_retry_at <= NOW()
  ORDER BY next_retry_at ASC
  LIMIT 100;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_webhook_to_retry_queue TO service_role;
GRANT EXECUTE ON FUNCTION update_webhook_retry_attempt TO service_role;
GRANT EXECUTE ON FUNCTION get_pending_webhook_retries TO service_role;

COMMENT ON TABLE webhook_retry_queue IS
'✅ P0-024: Retry queue for failed payment webhooks. Provides exponential backoff and manual review queue.';

COMMENT ON FUNCTION add_webhook_to_retry_queue IS
'✅ P0-024: Adds a failed webhook to the retry queue with exponential backoff scheduling.';

COMMENT ON FUNCTION update_webhook_retry_attempt IS
'✅ P0-024: Updates retry status after an attempt. Implements exponential backoff.';

COMMENT ON FUNCTION get_pending_webhook_retries IS
'✅ P0-024: Gets webhooks that are ready for retry (background job can call this).';
