-- ============================================================================
-- MONITORING SYSTEM - Database Setup
-- AutoRenta Production Monitoring Infrastructure
-- ============================================================================

-- ============================================================================
-- 1. HEALTH CHECKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name TEXT NOT NULL,
    check_type TEXT NOT NULL, -- 'endpoint', 'database', 'worker', 'edge_function'
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
    response_time_ms INTEGER,
    http_status INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON monitoring_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_check_name ON monitoring_health_checks(check_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON monitoring_health_checks(status);

-- ============================================================================
-- 2. PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL, -- 'page_load_time', 'api_response_time', 'error_rate'
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT NOT NULL, -- 'ms', 'count', 'percentage'
    resource_name TEXT, -- 'endpoint_path', 'component_name'
    metadata JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON monitoring_performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON monitoring_performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_resource ON monitoring_performance_metrics(resource_name);

-- ============================================================================
-- 3. ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL, -- 'health_check_failed', 'performance_degradation', 'error_spike'
    severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'acknowledged'
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active alerts
CREATE INDEX IF NOT EXISTS idx_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON monitoring_alerts(created_at DESC);

-- ============================================================================
-- 4. ALERT NOTIFICATIONS TABLE (track sent notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS monitoring_alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES monitoring_alerts(id) ON DELETE CASCADE,
    notification_channel TEXT NOT NULL, -- 'slack', 'email', 'webhook'
    notification_status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_alert_id ON monitoring_alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON monitoring_alert_notifications(notification_status);

-- ============================================================================
-- 5. RLS POLICIES (Only service role can write, authenticated users can read)
-- ============================================================================

-- Health checks: Service role writes, authenticated users read
ALTER TABLE monitoring_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage health checks"
    ON monitoring_health_checks
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read health checks"
    ON monitoring_health_checks
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Performance metrics: Service role writes, authenticated users read
ALTER TABLE monitoring_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage performance metrics"
    ON monitoring_performance_metrics
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read performance metrics"
    ON monitoring_performance_metrics
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Alerts: Service role writes, authenticated users read
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage alerts"
    ON monitoring_alerts
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read alerts"
    ON monitoring_alerts
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Notifications: Service role only
ALTER TABLE monitoring_alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notifications"
    ON monitoring_alert_notifications
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to create alert
CREATE OR REPLACE FUNCTION monitoring_create_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO monitoring_alerts (alert_type, severity, title, message, metadata)
    VALUES (p_alert_type, p_severity, p_title, p_message, p_metadata)
    RETURNING id INTO v_alert_id;
    
    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent health check summary
CREATE OR REPLACE FUNCTION monitoring_get_health_summary(
    p_hours INTEGER DEFAULT 1
) RETURNS TABLE (
    check_name TEXT,
    total_checks BIGINT,
    healthy_count BIGINT,
    degraded_count BIGINT,
    down_count BIGINT,
    avg_response_time_ms NUMERIC,
    last_check_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hc.check_name,
        COUNT(*)::BIGINT as total_checks,
        COUNT(*) FILTER (WHERE hc.status = 'healthy')::BIGINT as healthy_count,
        COUNT(*) FILTER (WHERE hc.status = 'degraded')::BIGINT as degraded_count,
        COUNT(*) FILTER (WHERE hc.status = 'down')::BIGINT as down_count,
        AVG(hc.response_time_ms)::NUMERIC as avg_response_time_ms,
        MAX(hc.checked_at) as last_check_at
    FROM monitoring_health_checks hc
    WHERE hc.checked_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY hc.check_name
    ORDER BY hc.check_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active alerts
CREATE OR REPLACE FUNCTION monitoring_get_active_alerts()
RETURNS TABLE (
    id UUID,
    alert_type TEXT,
    severity TEXT,
    title TEXT,
    message TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.alert_type,
        a.severity,
        a.title,
        a.message,
        a.created_at
    FROM monitoring_alerts a
    WHERE a.status = 'active'
    ORDER BY 
        CASE a.severity
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            WHEN 'info' THEN 3
        END,
        a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CLEANUP FUNCTION (remove old data)
-- ============================================================================

-- Function to cleanup old monitoring data (keep last 30 days)
CREATE OR REPLACE FUNCTION monitoring_cleanup_old_data()
RETURNS TABLE (
    deleted_health_checks BIGINT,
    deleted_performance_metrics BIGINT,
    deleted_alerts BIGINT
) AS $$
DECLARE
    v_deleted_health BIGINT;
    v_deleted_metrics BIGINT;
    v_deleted_alerts BIGINT;
BEGIN
    -- Delete health checks older than 30 days
    DELETE FROM monitoring_health_checks
    WHERE checked_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_health = ROW_COUNT;
    
    -- Delete performance metrics older than 30 days
    DELETE FROM monitoring_performance_metrics
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_metrics = ROW_COUNT;
    
    -- Delete resolved alerts older than 90 days
    DELETE FROM monitoring_alerts
    WHERE status = 'resolved' AND resolved_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_alerts = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_health, v_deleted_metrics, v_deleted_alerts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE monitoring_health_checks IS 'Stores results of health check executions';
COMMENT ON TABLE monitoring_performance_metrics IS 'Stores performance metrics (response times, error rates, etc.)';
COMMENT ON TABLE monitoring_alerts IS 'Stores active and resolved alerts';
COMMENT ON TABLE monitoring_alert_notifications IS 'Tracks notification deliveries for alerts';







