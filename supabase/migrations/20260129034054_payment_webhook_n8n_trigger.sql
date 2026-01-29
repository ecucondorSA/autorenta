-- ============================================
-- Migration: Payment Webhook n8n Trigger
-- Purpose: Create trigger on mp_webhook_logs to notify n8n
--          when payment events are processed
-- Note: Does NOT modify FROZEN mercadopago-webhook function
-- ============================================

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to notify n8n of payment events
CREATE OR REPLACE FUNCTION public.notify_n8n_payment_event()
RETURNS TRIGGER AS $$
DECLARE
  n8n_url TEXT;
  payload JSONB;
BEGIN
  -- Get n8n webhook URL from app settings or use default
  n8n_url := COALESCE(
    current_setting('app.n8n_payment_webhook_url', true),
    'http://host.docker.internal:5678/webhook/payment-event'
  );

  -- Only process certain payment topics
  IF NEW.topic NOT IN ('payment', 'merchant_order', 'preapproval') THEN
    RETURN NEW;
  END IF;

  -- Build payload
  payload := jsonb_build_object(
    'event_type', 'payment_webhook_processed',
    'timestamp', NOW(),
    'webhook_log_id', NEW.id,
    'topic', NEW.topic,
    'action', NEW.action,
    'external_reference', NEW.external_reference,
    'payment_id', NEW.payment_id,
    'status', NEW.status,
    'status_detail', NEW.status_detail,
    'payment_type', NEW.payment_type,
    'transaction_amount', NEW.transaction_amount,
    'currency_id', NEW.currency_id,
    'booking_id', NEW.booking_id,
    'processed_at', NEW.processed_at,
    'raw_data', NEW.raw_data
  );

  -- Send async HTTP request to n8n
  -- Using pg_net for non-blocking webhook calls
  PERFORM net.http_post(
    url := n8n_url,
    body := payload::TEXT,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Source', 'supabase-trigger'
    )::JSONB
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'notify_n8n_payment_event error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on mp_webhook_logs
DROP TRIGGER IF EXISTS trigger_notify_n8n_payment ON public.mp_webhook_logs;

CREATE TRIGGER trigger_notify_n8n_payment
  AFTER INSERT OR UPDATE ON public.mp_webhook_logs
  FOR EACH ROW
  WHEN (NEW.processed_at IS NOT NULL)
  EXECUTE FUNCTION public.notify_n8n_payment_event();

-- Add comment for documentation
COMMENT ON FUNCTION public.notify_n8n_payment_event() IS
'Notifies n8n when a payment webhook is processed. Used for:
- Payment failure workflows
- Retry logic
- Owner transfer notifications
Does not modify the FROZEN mercadopago-webhook function.';

COMMENT ON TRIGGER trigger_notify_n8n_payment ON public.mp_webhook_logs IS
'Trigger to notify n8n after payment webhook processing. Fires only when processed_at is set.';

-- Create table for failed payment tracking (for n8n retry workflow)
CREATE TABLE IF NOT EXISTS public.payment_failure_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id)
);

-- Enable RLS
ALTER TABLE public.payment_failure_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Service role full access on payment_failure_tracking"
  ON public.payment_failure_tracking
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view own payment failures"
  ON public.payment_failure_tracking
  FOR SELECT
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE renter_id = auth.uid() OR owner_id = auth.uid()
    )
  );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_payment_failure_tracking_status
  ON public.payment_failure_tracking(status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_payment_failure_tracking_booking
  ON public.payment_failure_tracking(booking_id);

-- Function to track payment failure (called from n8n or edge function)
CREATE OR REPLACE FUNCTION public.track_payment_failure(
  p_payment_id TEXT,
  p_booking_id UUID,
  p_failure_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.payment_failure_tracking (payment_id, booking_id, failure_reason)
  VALUES (p_payment_id, p_booking_id, p_failure_reason)
  ON CONFLICT (payment_id) DO UPDATE SET
    failure_reason = EXCLUDED.failure_reason,
    retry_count = payment_failure_tracking.retry_count + 1,
    last_retry_at = NOW(),
    next_retry_at = NOW() + INTERVAL '30 minutes' * POWER(2, payment_failure_tracking.retry_count),
    status = 'retrying',
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark payment failure as resolved
CREATE OR REPLACE FUNCTION public.resolve_payment_failure(p_payment_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.payment_failure_tracking
  SET status = 'resolved', updated_at = NOW()
  WHERE payment_id = p_payment_id AND status != 'resolved';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.notify_n8n_payment_event() TO service_role;
GRANT EXECUTE ON FUNCTION public.track_payment_failure(TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_payment_failure(TEXT) TO service_role;
