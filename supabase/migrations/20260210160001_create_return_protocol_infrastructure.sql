-- Create return protocol infrastructure for return-protocol-scheduler Edge Function
-- Handles overdue booking escalation: yellow alert → orange alert → suspension → police → legal

-- =================================================================
-- 1. ADD COLUMNS TO BOOKINGS
-- =================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'return_status') THEN
    ALTER TABLE public.bookings ADD COLUMN return_status text NOT NULL DEFAULT 'pending'
      CHECK (return_status IN ('pending', 'overdue', 'returned', 'escalated'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'actual_return_at') THEN
    ALTER TABLE public.bookings ADD COLUMN actual_return_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'overdue_hours') THEN
    ALTER TABLE public.bookings ADD COLUMN overdue_hours numeric DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_return_status
  ON public.bookings(return_status)
  WHERE return_status = 'overdue';

-- =================================================================
-- 2. RETURN PROTOCOL EVENTS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.return_protocol_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('yellow_alert', 'orange_alert', 'user_suspension', 'police_report', 'legal_escalation')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'executed', 'cancelled', 'failed')),
  scheduled_for timestamptz NOT NULL,
  executed_at timestamptz,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpe_scheduled
  ON public.return_protocol_events(status, scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_rpe_booking
  ON public.return_protocol_events(booking_id);

ALTER TABLE public.return_protocol_events ENABLE ROW LEVEL SECURITY;
-- service_role only

-- =================================================================
-- 3. CRON EXECUTION LOGS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.cron_execution_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  result jsonb,
  error_message text,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_job
  ON public.cron_execution_logs(job_name, created_at DESC);

ALTER TABLE public.cron_execution_logs ENABLE ROW LEVEL SECURITY;
-- service_role only

-- =================================================================
-- 4. start_return_protocol(booking_id) RPC
-- =================================================================

CREATE OR REPLACE FUNCTION public.start_return_protocol(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_at timestamptz;
BEGIN
  -- Get booking end time
  SELECT end_at INTO v_end_at
  FROM bookings WHERE id = p_booking_id;

  IF v_end_at IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  -- Skip if protocol already started
  IF EXISTS (SELECT 1 FROM return_protocol_events WHERE booking_id = p_booking_id) THEN
    RETURN;
  END IF;

  -- Schedule escalation events based on overdue time from end_at
  -- T+2h: Yellow alert (push + email to renter)
  INSERT INTO return_protocol_events (booking_id, event_type, scheduled_for)
  VALUES (p_booking_id, 'yellow_alert', v_end_at + INTERVAL '2 hours');

  -- T+6h: Orange alert (automated call attempt)
  INSERT INTO return_protocol_events (booking_id, event_type, scheduled_for)
  VALUES (p_booking_id, 'orange_alert', v_end_at + INTERVAL '6 hours');

  -- T+12h: User suspension
  INSERT INTO return_protocol_events (booking_id, event_type, scheduled_for)
  VALUES (p_booking_id, 'user_suspension', v_end_at + INTERVAL '12 hours');

  -- T+24h: Police report generation + Insurance notification
  INSERT INTO return_protocol_events (booking_id, event_type, scheduled_for)
  VALUES (p_booking_id, 'police_report', v_end_at + INTERVAL '24 hours');

  -- T+48h: Legal escalation
  INSERT INTO return_protocol_events (booking_id, event_type, scheduled_for)
  VALUES (p_booking_id, 'legal_escalation', v_end_at + INTERVAL '48 hours');
END;
$$;

-- =================================================================
-- 5. execute_protocol_event(event_id) RPC
-- =================================================================

CREATE OR REPLACE FUNCTION public.execute_protocol_event(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
BEGIN
  -- Get event details
  SELECT * INTO v_event
  FROM return_protocol_events
  WHERE id = p_event_id AND status = 'scheduled';

  IF v_event IS NULL THEN
    RETURN; -- Already executed or cancelled
  END IF;

  -- Mark as executed (actual notification delivery handled by Edge Function or triggers)
  UPDATE return_protocol_events
  SET status = 'executed',
      executed_at = now(),
      result = jsonb_build_object(
        'event_type', v_event.event_type,
        'booking_id', v_event.booking_id,
        'executed_at', now()::text
      )
  WHERE id = p_event_id;

  -- Apply side effects based on event type
  CASE v_event.event_type
    WHEN 'user_suspension' THEN
      -- Mark booking as escalated
      UPDATE bookings
      SET return_status = 'escalated', updated_at = now()
      WHERE id = v_event.booking_id;
    ELSE
      -- Other events are notification-only (handled externally)
      NULL;
  END CASE;
END;
$$;

COMMENT ON TABLE public.return_protocol_events IS
  'Scheduled escalation events for overdue bookings. Managed by return-protocol-scheduler Edge Function.';
COMMENT ON TABLE public.cron_execution_logs IS
  'Execution log for cron jobs. Used by Edge Functions for audit trail.';
