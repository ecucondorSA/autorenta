-- Create monitoring tables for realtime-alerting Edge Function
-- Supports: fraud detection alerts, system alerts, SLA tracking
-- Referenced by: realtime-alerting Edge Function, fraud-detection-alerts workflow

-- =================================================================
-- 1. MAIN ALERTS TABLE
-- =================================================================

CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('critical', 'high', 'warning', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'acknowledged', 'resolved')),
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status
  ON public.monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity
  ON public.monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at
  ON public.monitoring_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type_status
  ON public.monitoring_alerts(alert_type, status);

-- =================================================================
-- 2. NOTIFICATION HISTORY
-- =================================================================

CREATE TABLE IF NOT EXISTS public.monitoring_alert_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES public.monitoring_alerts(id) ON DELETE CASCADE,
  notification_channel text NOT NULL,
  notification_status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_notif_alert_id
  ON public.monitoring_alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_notif_created_at
  ON public.monitoring_alert_notifications(created_at DESC);

-- =================================================================
-- 3. SLA METRICS
-- =================================================================

CREATE TABLE IF NOT EXISTS public.monitoring_sla_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES public.monitoring_alerts(id) ON DELETE CASCADE,
  detection_time_ms bigint,
  notification_time_ms bigint,
  providers_notified text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_sla_alert_id
  ON public.monitoring_sla_metrics(alert_id);

-- =================================================================
-- 4. RLS (service_role only — no user access needed)
-- =================================================================

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_sla_metrics ENABLE ROW LEVEL SECURITY;

-- No policies = anon/authenticated have NO access
-- service_role bypasses RLS by default

-- =================================================================
-- 5. AUTO-CLEANUP: resolve old alerts after 7 days
-- =================================================================

COMMENT ON TABLE public.monitoring_alerts IS
  'Real-time alerting system. Alerts inserted by fraud detection or system monitors, routed to providers by realtime-alerting Edge Function.';
