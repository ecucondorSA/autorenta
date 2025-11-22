-- ============================================================================
-- REAL-TIME ALERTING SYSTEM - Database Setup
-- AutoRenta P0 Production Monitoring
-- Issue #119 - Real-time Alerting with SLA Tracking
-- ============================================================================

-- ============================================================================
-- 1. SLA METRICS TRACKING TABLE
-- ============================================================================

-- Track SLA compliance for alerts (MTTD < 5min, MTTR < 30min)
CREATE TABLE IF NOT EXISTS monitoring_sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES monitoring_alerts(id) ON DELETE CASCADE,

  -- Detection metrics
  detection_time_ms BIGINT NOT NULL, -- Time from issue occurrence to alert creation
  notification_time_ms BIGINT NOT NULL, -- Time from alert creation to first notification

  -- Response metrics
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledgment_time_ms BIGINT, -- Time from notification to acknowledgment

  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_time_ms BIGINT, -- Time from notification to resolution

  -- Provider metrics
  providers_notified TEXT[] NOT NULL DEFAULT '{}',
  primary_provider TEXT,

  -- SLA compliance
  mttd_sla_met BOOLEAN GENERATED ALWAYS AS (detection_time_ms < 300000) STORED, -- < 5 minutes
  mttr_sla_met BOOLEAN GENERATED ALWAYS AS (
    CASE
      WHEN resolution_time_ms IS NULL THEN NULL
      ELSE resolution_time_ms < 1800000 -- < 30 minutes
    END
  ) STORED,

  -- False positive tracking
  is_false_positive BOOLEAN DEFAULT FALSE,
  false_positive_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sla_metrics_alert_id ON monitoring_sla_metrics(alert_id);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_created_at ON monitoring_sla_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_mttd_sla ON monitoring_sla_metrics(mttd_sla_met);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_mttr_sla ON monitoring_sla_metrics(mttr_sla_met);

-- Enable RLS
ALTER TABLE monitoring_sla_metrics ENABLE ROW LEVEL SECURITY;

-- Admin access policy
CREATE POLICY "Admin full access to SLA metrics"
  ON monitoring_sla_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. CUSTOM ALERT RULES TABLE
-- ============================================================================

-- Define custom alert rules for specific conditions
CREATE TABLE IF NOT EXISTS monitoring_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- 'threshold', 'spike', 'anomaly', 'composite'
  enabled BOOLEAN DEFAULT TRUE,

  -- Conditions
  metric_name TEXT NOT NULL, -- e.g., 'payment_failures', 'error_rate', 'api_response_time'
  threshold_value NUMERIC,
  time_window_minutes INTEGER DEFAULT 5,
  comparison_operator TEXT DEFAULT '>', -- '>', '<', '>=', '<=', '=='

  -- Spike detection (for rate-based alerts)
  spike_threshold_percent NUMERIC, -- e.g., 200 for 200% increase
  baseline_window_minutes INTEGER DEFAULT 60,

  -- Alert configuration
  alert_severity TEXT NOT NULL DEFAULT 'warning', -- 'critical', 'warning', 'info'
  alert_title TEXT NOT NULL,
  alert_message_template TEXT NOT NULL,

  -- Notification settings
  cooldown_minutes INTEGER DEFAULT 15, -- Minimum time between alerts
  max_alerts_per_hour INTEGER DEFAULT 4,

  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON monitoring_alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric ON monitoring_alert_rules(metric_name);

-- Enable RLS
ALTER TABLE monitoring_alert_rules ENABLE ROW LEVEL SECURITY;

-- Admin access policy
CREATE POLICY "Admin full access to alert rules"
  ON monitoring_alert_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 3. INSERT DEFAULT ALERT RULES
-- ============================================================================

-- P0 Critical Rules
INSERT INTO monitoring_alert_rules (
  rule_name, rule_type, metric_name, threshold_value, time_window_minutes,
  alert_severity, alert_title, alert_message_template, comparison_operator
) VALUES
  -- Payment Failures
  (
    'payment_failure_critical',
    'threshold',
    'payment_failures',
    3,
    5,
    'critical',
    'Payment System Failure',
    'Detected {value} payment failures in the last {time_window} minutes. Immediate attention required.',
    '>='
  ),

  -- Database Connection Issues
  (
    'database_connection_failure',
    'threshold',
    'database_connection_errors',
    1,
    1,
    'critical',
    'Database Connection Failure',
    'Database connection failed. System may be experiencing downtime.',
    '>='
  ),

  -- API Response Time Degradation
  (
    'api_response_degradation',
    'threshold',
    'api_p95_response_time_ms',
    3000,
    5,
    'critical',
    'API Performance Degradation',
    'API response time (P95) exceeded {threshold}ms: {value}ms. Users experiencing slowdowns.',
    '>'
  ),

  -- Authentication Spike (potential attack)
  (
    'auth_failure_spike',
    'spike',
    'auth_failures',
    300, -- 300% increase
    5,
    'critical',
    'Authentication Failure Spike Detected',
    'Unusual spike in authentication failures: {value} failures (baseline: {baseline}). Possible attack.',
    NULL
  ),

-- P1 Warning Rules

  -- Error Rate Spike
  (
    'error_rate_spike',
    'threshold',
    'error_count',
    10,
    5,
    'warning',
    'Error Rate Spike',
    'Detected {value} errors in the last {time_window} minutes.',
    '>='
  ),

  -- API Degradation Warning
  (
    'api_response_warning',
    'threshold',
    'api_p95_response_time_ms',
    1500,
    5,
    'warning',
    'API Response Time Warning',
    'API response time (P95) elevated: {value}ms (threshold: {threshold}ms).',
    '>'
  ),

  -- Memory Usage Warning
  (
    'memory_usage_high',
    'threshold',
    'memory_usage_percent',
    85,
    10,
    'warning',
    'High Memory Usage',
    'Memory usage at {value}% (threshold: {threshold}%). May need scaling.',
    '>'
  )
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- 4. SLA METRICS FUNCTIONS
-- ============================================================================

-- Function to get SLA compliance summary
CREATE OR REPLACE FUNCTION monitoring_get_sla_summary(
  time_range_hours INT DEFAULT 24
)
RETURNS TABLE (
  total_alerts BIGINT,
  mttd_compliant BIGINT,
  mttr_compliant BIGINT,
  mttd_compliance_rate NUMERIC,
  mttr_compliance_rate NUMERIC,
  avg_detection_time_ms NUMERIC,
  avg_resolution_time_ms NUMERIC,
  false_positive_count BIGINT,
  false_positive_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_alerts,
    COUNT(*) FILTER (WHERE mttd_sla_met = true)::BIGINT AS mttd_compliant,
    COUNT(*) FILTER (WHERE mttr_sla_met = true)::BIGINT AS mttr_compliant,
    ROUND(
      (COUNT(*) FILTER (WHERE mttd_sla_met = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
      2
    ) AS mttd_compliance_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE mttr_sla_met = true)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE resolution_time_ms IS NOT NULL), 0) * 100),
      2
    ) AS mttr_compliance_rate,
    ROUND(AVG(detection_time_ms), 2) AS avg_detection_time_ms,
    ROUND(AVG(resolution_time_ms), 2) AS avg_resolution_time_ms,
    COUNT(*) FILTER (WHERE is_false_positive = true)::BIGINT AS false_positive_count,
    ROUND(
      (COUNT(*) FILTER (WHERE is_false_positive = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
      2
    ) AS false_positive_rate
  FROM monitoring_sla_metrics
  WHERE created_at >= NOW() - (time_range_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acknowledge alert and track MTTR
CREATE OR REPLACE FUNCTION monitoring_acknowledge_alert(
  p_alert_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_notification_time TIMESTAMPTZ;
  v_ack_time_ms BIGINT;
BEGIN
  -- Update SLA metrics
  SELECT created_at INTO v_notification_time
  FROM monitoring_alert_notifications
  WHERE alert_id = p_alert_id
  ORDER BY created_at ASC
  LIMIT 1;

  v_ack_time_ms := EXTRACT(EPOCH FROM (NOW() - v_notification_time)) * 1000;

  UPDATE monitoring_sla_metrics
  SET
    acknowledged_at = NOW(),
    acknowledged_by = p_user_id,
    acknowledgment_time_ms = v_ack_time_ms,
    updated_at = NOW()
  WHERE alert_id = p_alert_id;

  -- Update alert status
  UPDATE monitoring_alerts
  SET status = 'acknowledged'
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve alert and complete SLA tracking
CREATE OR REPLACE FUNCTION monitoring_resolve_alert(
  p_alert_id UUID,
  p_user_id UUID,
  p_is_false_positive BOOLEAN DEFAULT FALSE,
  p_false_positive_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_notification_time TIMESTAMPTZ;
  v_resolution_time_ms BIGINT;
BEGIN
  -- Get first notification time
  SELECT created_at INTO v_notification_time
  FROM monitoring_alert_notifications
  WHERE alert_id = p_alert_id
  ORDER BY created_at ASC
  LIMIT 1;

  v_resolution_time_ms := EXTRACT(EPOCH FROM (NOW() - v_notification_time)) * 1000;

  -- Update SLA metrics
  UPDATE monitoring_sla_metrics
  SET
    resolved_at = NOW(),
    resolved_by = p_user_id,
    resolution_time_ms = v_resolution_time_ms,
    is_false_positive = p_is_false_positive,
    false_positive_reason = p_false_positive_reason,
    updated_at = NOW()
  WHERE alert_id = p_alert_id;

  -- Update alert status
  UPDATE monitoring_alerts
  SET status = 'resolved'
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. ALERT RULE EVALUATION FUNCTION
-- ============================================================================

-- Function to evaluate alert rules and create alerts if needed
CREATE OR REPLACE FUNCTION monitoring_evaluate_alert_rules()
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  triggered BOOLEAN,
  alert_id UUID
) AS $$
DECLARE
  v_rule RECORD;
  v_metric_value NUMERIC;
  v_should_trigger BOOLEAN;
  v_new_alert_id UUID;
BEGIN
  -- Loop through all enabled rules
  FOR v_rule IN
    SELECT * FROM monitoring_alert_rules WHERE enabled = true
  LOOP
    -- Check cooldown period
    IF v_rule.last_triggered_at IS NOT NULL AND
       v_rule.last_triggered_at > NOW() - (v_rule.cooldown_minutes || ' minutes')::INTERVAL
    THEN
      CONTINUE; -- Skip this rule due to cooldown
    END IF;

    -- Get current metric value (simplified - in production, query actual metrics)
    -- This would be replaced with actual metric queries from monitoring_performance_metrics
    v_metric_value := 0;

    -- Evaluate rule based on type
    v_should_trigger := FALSE;

    IF v_rule.rule_type = 'threshold' THEN
      -- Threshold-based rule
      CASE v_rule.comparison_operator
        WHEN '>' THEN v_should_trigger := v_metric_value > v_rule.threshold_value;
        WHEN '>=' THEN v_should_trigger := v_metric_value >= v_rule.threshold_value;
        WHEN '<' THEN v_should_trigger := v_metric_value < v_rule.threshold_value;
        WHEN '<=' THEN v_should_trigger := v_metric_value <= v_rule.threshold_value;
        WHEN '==' THEN v_should_trigger := v_metric_value = v_rule.threshold_value;
      END CASE;
    END IF;

    -- If rule triggered, create alert
    IF v_should_trigger THEN
      INSERT INTO monitoring_alerts (
        alert_type,
        severity,
        title,
        message,
        status,
        metadata
      ) VALUES (
        v_rule.metric_name,
        v_rule.alert_severity::TEXT,
        v_rule.alert_title,
        REPLACE(REPLACE(
          v_rule.alert_message_template,
          '{value}', v_metric_value::TEXT
        ), '{threshold}', v_rule.threshold_value::TEXT),
        'active',
        jsonb_build_object(
          'rule_id', v_rule.id,
          'rule_name', v_rule.rule_name,
          'metric_value', v_metric_value
        )
      )
      RETURNING id INTO v_new_alert_id;

      -- Update last triggered time
      UPDATE monitoring_alert_rules
      SET last_triggered_at = NOW()
      WHERE id = v_rule.id;

      RETURN QUERY SELECT v_rule.id, v_rule.rule_name, TRUE, v_new_alert_id;
    ELSE
      RETURN QUERY SELECT v_rule.id, v_rule.rule_name, FALSE, NULL::UUID;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION monitoring_get_sla_summary TO service_role;
GRANT EXECUTE ON FUNCTION monitoring_acknowledge_alert TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION monitoring_resolve_alert TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION monitoring_evaluate_alert_rules TO service_role;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE monitoring_sla_metrics IS 'SLA compliance tracking for alerts (MTTD < 5min, MTTR < 30min)';
COMMENT ON TABLE monitoring_alert_rules IS 'Custom alert rules for automated monitoring';
COMMENT ON FUNCTION monitoring_get_sla_summary IS 'Get SLA compliance summary for specified time range';
COMMENT ON FUNCTION monitoring_acknowledge_alert IS 'Acknowledge an alert and start MTTR tracking';
COMMENT ON FUNCTION monitoring_resolve_alert IS 'Resolve an alert and calculate final SLA metrics';
COMMENT ON FUNCTION monitoring_evaluate_alert_rules IS 'Evaluate all active alert rules and create alerts if needed';
