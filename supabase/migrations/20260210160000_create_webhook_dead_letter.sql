-- Create webhook_dead_letter table for process-webhook-dlq Edge Function
-- DLQ with exponential backoff retry for failed webhook events

CREATE TABLE IF NOT EXISTS public.webhook_dead_letter (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  event_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 5,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'retrying', 'resolved', 'failed')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wdl_status_retry
  ON public.webhook_dead_letter(status, next_retry_at)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_wdl_event_id
  ON public.webhook_dead_letter(event_id);

ALTER TABLE public.webhook_dead_letter ENABLE ROW LEVEL SECURITY;
-- service_role only (no policies = no anon/auth access)

COMMENT ON TABLE public.webhook_dead_letter IS
  'Dead Letter Queue for failed webhooks. Processed by process-webhook-dlq Edge Function with exponential backoff.';
