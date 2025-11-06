# Bonus-Malus System - Monitoring & Alerts Setup

**Version:** 1.0
**Date:** November 2025
**System:** AutoRenta Platform
**Module:** Driver Risk Classification & Pricing

---

## Table of Contents

1. [Overview](#overview)
2. [Key Metrics](#key-metrics)
3. [Dashboards](#dashboards)
4. [Alerts](#alerts)
5. [Logging](#logging)
6. [Performance Monitoring](#performance-monitoring)
7. [Business Intelligence](#business-intelligence)
8. [Troubleshooting Monitors](#troubleshooting-monitors)

---

## Overview

### Purpose

Comprehensive monitoring and alerting system for the Bonus-Malus module to:
- **Track** system health and performance
- **Alert** team of critical issues
- **Analyze** business metrics and trends
- **Optimize** pricing and risk strategies

### Monitoring Stack

- **Database:** PostgreSQL + pg_stat_statements
- **Application:** Supabase Logs + worker_logs table
- **Cron Jobs:** cron.job_run_details
- **Business Metrics:** Custom views and dashboards
- **Alerts:** Database triggers + edge function notifications

---

## Key Metrics

### 1. Driver Class Distribution

**Metric:** Percentage of users in each class (0-10)

**Query:**
```sql
SELECT
    class,
    COUNT(*) as driver_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM driver_risk_profile
GROUP BY class
ORDER BY class;
```

**Target Distribution:**
- Class 0-2: 10-15% (excellent drivers)
- Class 3-4: 20-25% (good drivers)
- Class 5: 30-40% (base/new users)
- Class 6-7: 15-20% (risky drivers)
- Class 8-10: 5-10% (high risk)

**Alert Triggers:**
- ⚠️ Class 8-10 > 15% → Risk concentration alert
- ⚠️ Class 0-2 < 5% → Low retention of good drivers

---

### 2. Average Driver Score

**Metric:** Platform-wide average telemetry score

**Query:**
```sql
SELECT
    ROUND(AVG(driver_score), 2) as avg_score,
    MIN(driver_score) as min_score,
    MAX(driver_score) as max_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY driver_score) as median_score
FROM driver_risk_profile;
```

**Targets:**
- Average score: 60-70
- Median score: 65+
- % below 40: < 10%

**Alert Triggers:**
- ⚠️ Avg score < 55 → Platform-wide driving quality issue
- ⚠️ Median score < 60 → Investigate telemetry accuracy

---

### 3. Protection Credit Utilization

**Metric:** CP usage rate and breakage

**Query:**
```sql
WITH cp_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE protection_credit_cents > 0) as active_cp_users,
        COUNT(*) as total_users,
        SUM(protection_credit_cents) FILTER (WHERE protection_credit_cents > 0) as total_cp_cents,
        COUNT(*) FILTER (WHERE protection_credit_expires_at < NOW() AND protection_credit_cents > 0) as expired_cp
    FROM user_wallets
)
SELECT
    active_cp_users,
    total_users,
    ROUND(active_cp_users * 100.0 / NULLIF(total_users, 0), 2) as cp_coverage_pct,
    ROUND(total_cp_cents / 100.0, 2) as total_cp_usd,
    expired_cp,
    ROUND(expired_cp * 100.0 / NULLIF(active_cp_users, 0), 2) as expiration_rate_pct
FROM cp_stats;
```

**Targets:**
- CP coverage: 80%+ of active users
- Breakage rate: 5-15% (some unused CP is expected)
- Average CP balance: $200-$300 USD

**Alert Triggers:**
- ⚠️ CP coverage < 70% → Issuance issues
- ⚠️ Breakage rate > 25% → Low engagement/value perception

---

### 4. Bonus Protector Sales

**Metric:** Protector adoption and revenue

**Query:**
```sql
SELECT
    protection_level,
    COUNT(*) as units_sold,
    SUM(price_paid_cents) / 100.0 as total_revenue_usd,
    AVG(price_paid_cents) / 100.0 as avg_price_usd,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') as currently_active,
    COUNT(*) FILTER (WHERE status = 'USED') as protections_used
FROM driver_protection_addons
WHERE addon_type = 'BONUS_PROTECTOR'
GROUP BY protection_level
ORDER BY protection_level;
```

**Targets:**
- Adoption rate: 15-25% of active users
- Level distribution: 40% L1, 40% L2, 20% L3
- Usage rate: 30-50% (not too high = good drivers, not too low = perceived value)

**Alert Triggers:**
- ⚠️ Adoption < 10% → Marketing/UX issue
- ⚠️ Usage rate > 70% → Classes increasing too fast

---

### 5. Claim Impact on Classes

**Metric:** Average class increase per claim

**Query:**
```sql
WITH claim_impacts AS (
    SELECT
        bc.severity,
        AVG(drp_after.class - drp_before.class) as avg_class_increase
    FROM booking_claims bc
    INNER JOIN bookings b ON bc.booking_id = b.id
    LEFT JOIN LATERAL (
        SELECT class FROM driver_risk_profile
        WHERE user_id = b.renter_id
        LIMIT 1
    ) drp_before ON true
    LEFT JOIN LATERAL (
        SELECT class FROM driver_risk_profile
        WHERE user_id = b.renter_id
        AND last_class_update > bc.created_at
        LIMIT 1
    ) drp_after ON true
    WHERE bc.with_fault = TRUE
    AND bc.created_at > NOW() - INTERVAL '6 months'
    GROUP BY bc.severity
)
SELECT * FROM claim_impacts ORDER BY severity;
```

**Expected Increases:**
- Severity 1 (leve): +1.0 classes
- Severity 2 (moderado): +2.0 classes
- Severity 3 (grave): +3.0 classes

**Alert Triggers:**
- ⚠️ Actual increase ≠ expected → Logic error in update_driver_class_on_event

---

### 6. Cron Job Health

**Metric:** Cron job success rate

**Query:**
```sql
SELECT
    jobname,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'succeeded') as successful_runs,
    ROUND(COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / COUNT(*), 2) as success_rate,
    MAX(end_time) as last_run,
    EXTRACT(EPOCH FROM (NOW() - MAX(end_time))) / 3600 as hours_since_last_run
FROM cron.job_run_details
WHERE jobname LIKE '%driver%'
   OR jobname LIKE '%bonus%'
   OR jobname LIKE '%protect%'
GROUP BY jobname
ORDER BY success_rate ASC;
```

**Targets:**
- Success rate: 95%+
- Hours since last run: < expected schedule interval * 1.5

**Alert Triggers:**
- ⚠️ Success rate < 90% → Job failing repeatedly
- ⚠️ Hours since last run > 2x interval → Job not running

---

## Dashboards

### Admin Dashboard - Bonus-Malus Overview

**Location:** `/admin/bonus-malus-dashboard`

**Widgets:**

1. **Class Distribution Chart**
   - Bar chart: Class (X-axis) vs Count (Y-axis)
   - Color-coded: Green (0-2), Blue (3-4), Gray (5), Orange (6-7), Red (8-10)

2. **CP Utilization Gauge**
   - Percentage of users with active CP
   - Donut chart: Used vs Available

3. **Telemetry Score Histogram**
   - Distribution of driver scores
   - Highlight median and average

4. **Protector Sales Funnel**
   - L1 → L2 → L3 adoption rates
   - Revenue by level

5. **Recent Alerts Table**
   - Last 10 alerts from monitoring system
   - Severity (Critical, Warning, Info)

**SQL View:**
```sql
CREATE OR REPLACE VIEW bonus_malus_dashboard_stats AS
SELECT
    (SELECT json_build_object(
        'class', class,
        'count', COUNT(*),
        'percentage', ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)
    ) FROM driver_risk_profile GROUP BY class) as class_distribution,
    (SELECT json_build_object(
        'avg_score', ROUND(AVG(driver_score), 2),
        'median_score', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY driver_score)
    ) FROM driver_risk_profile) as telemetry_stats,
    (SELECT json_build_object(
        'active_cp_users', COUNT(*) FILTER (WHERE protection_credit_cents > 0),
        'total_users', COUNT(*),
        'coverage_pct', ROUND(COUNT(*) FILTER (WHERE protection_credit_cents > 0) * 100.0 / COUNT(*), 2)
    ) FROM user_wallets) as cp_stats,
    (SELECT json_build_object(
        'total_sold', COUNT(*),
        'revenue_usd', SUM(price_paid_cents) / 100.0,
        'currently_active', COUNT(*) FILTER (WHERE status = 'ACTIVE')
    ) FROM driver_protection_addons WHERE addon_type = 'BONUS_PROTECTOR') as protector_stats;
```

---

### Weekly Report - Email Digest

**Recipients:** Product Manager, CTO, Finance

**Metrics Included:**
- New users enrolled in bonus-malus
- Average class movement (+/- X classes)
- Revenue from Protector sales
- CP breakage recognized
- Top 10 drivers (by class + score)
- Bottom 10 drivers (class 9-10 with low score)

**SQL for Weekly Report:**
```sql
CREATE OR REPLACE FUNCTION generate_weekly_bonus_malus_report()
RETURNS TABLE(
    report_section TEXT,
    metric_name TEXT,
    current_value TEXT,
    prev_week_value TEXT,
    change_pct DECIMAL
) AS $$
BEGIN
    -- New profiles created this week
    RETURN QUERY
    SELECT
        'Enrollment' as report_section,
        'New Driver Profiles' as metric_name,
        (SELECT COUNT(*)::TEXT FROM driver_risk_profile WHERE created_at > NOW() - INTERVAL '7 days'),
        (SELECT COUNT(*)::TEXT FROM driver_risk_profile WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'),
        ROUND(((SELECT COUNT(*) FROM driver_risk_profile WHERE created_at > NOW() - INTERVAL '7 days')::DECIMAL /
               NULLIF((SELECT COUNT(*) FROM driver_risk_profile WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'), 0) - 1) * 100, 2);

    -- Protector sales
    RETURN QUERY
    SELECT
        'Revenue' as report_section,
        'Protector Sales (USD)' as metric_name,
        (SELECT (SUM(price_paid_cents) / 100.0)::TEXT FROM driver_protection_addons WHERE purchased_at > NOW() - INTERVAL '7 days'),
        (SELECT (SUM(price_paid_cents) / 100.0)::TEXT FROM driver_protection_addons WHERE purchased_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'),
        ROUND(((SELECT SUM(price_paid_cents) FROM driver_protection_addons WHERE purchased_at > NOW() - INTERVAL '7 days')::DECIMAL /
               NULLIF((SELECT SUM(price_paid_cents) FROM driver_protection_addons WHERE purchased_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'), 0) - 1) * 100, 2);

    -- CP breakage
    RETURN QUERY
    SELECT
        'Revenue' as report_section,
        'CP Breakage (USD)' as metric_name,
        (SELECT (SUM(amount_cents) / 100.0)::TEXT FROM wallet_transactions WHERE is_protection_credit = TRUE AND protection_credit_reference_type = 'BREAKAGE' AND created_at > NOW() - INTERVAL '7 days'),
        (SELECT (SUM(amount_cents) / 100.0)::TEXT FROM wallet_transactions WHERE is_protection_credit = TRUE AND protection_credit_reference_type = 'BREAKAGE' AND created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'),
        NULL;
END;
$$ LANGUAGE plpgsql;
```

---

## Alerts

### Alert System Architecture

```
Database Trigger → Insert into alerts table → Edge Function → Notification Service
                                                              ├─ Email (critical)
                                                              ├─ Slack (warning)
                                                              └─ SMS (urgent)
```

### Alert Table Schema

```sql
CREATE TABLE IF NOT EXISTS bonus_malus_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    details JSONB,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_severity_triggered ON bonus_malus_alerts(severity, triggered_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON bonus_malus_alerts(triggered_at DESC) WHERE acknowledged_at IS NULL;
```

### Alert Triggers

#### 1. High-Risk Class Alert

**Trigger:** User reaches class 8, 9, or 10

```sql
CREATE OR REPLACE FUNCTION trigger_high_risk_class_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.class >= 8 AND (OLD.class IS NULL OR OLD.class < 8) THEN
        INSERT INTO bonus_malus_alerts (alert_type, severity, message, details)
        VALUES (
            'HIGH_RISK_DRIVER',
            'WARNING',
            'Driver reached high-risk class: ' || NEW.class,
            jsonb_build_object(
                'user_id', NEW.user_id,
                'class', NEW.class,
                'driver_score', NEW.driver_score,
                'claims_with_fault', NEW.claims_with_fault
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_high_risk_class
AFTER UPDATE ON driver_risk_profile
FOR EACH ROW
EXECUTE FUNCTION trigger_high_risk_class_alert();
```

#### 2. CP Low Balance Alert

**Trigger:** User's CP drops below $50 USD

```sql
CREATE OR REPLACE FUNCTION trigger_cp_low_balance_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.protection_credit_cents < 5000 AND (OLD.protection_credit_cents IS NULL OR OLD.protection_credit_cents >= 5000) THEN
        INSERT INTO bonus_malus_alerts (alert_type, severity, message, details)
        VALUES (
            'CP_LOW_BALANCE',
            'INFO',
            'User CP balance below $50 USD',
            jsonb_build_object(
                'user_id', NEW.user_id,
                'balance_cents', NEW.protection_credit_cents,
                'balance_usd', NEW.protection_credit_cents / 100.0,
                'expires_at', NEW.protection_credit_expires_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_cp_low_balance
AFTER UPDATE ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION trigger_cp_low_balance_alert();
```

#### 3. Cron Job Failure Alert

**Trigger:** Bonus-malus cron job fails 3 times in a row

```sql
CREATE OR REPLACE FUNCTION trigger_cron_failure_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_failures INT;
BEGIN
    IF NEW.status = 'failed' AND NEW.jobname LIKE '%driver%' OR NEW.jobname LIKE '%bonus%' THEN
        SELECT COUNT(*) INTO v_failures
        FROM cron.job_run_details
        WHERE jobname = NEW.jobname
        AND status = 'failed'
        AND start_time > NOW() - INTERVAL '24 hours';

        IF v_failures >= 3 THEN
            INSERT INTO bonus_malus_alerts (alert_type, severity, message, details)
            VALUES (
                'CRON_JOB_FAILURE',
                'CRITICAL',
                'Cron job failed 3+ times: ' || NEW.jobname,
                jsonb_build_object(
                    'jobname', NEW.jobname,
                    'failures', v_failures,
                    'last_error', NEW.return_message
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_cron_failure
AFTER INSERT ON cron.job_run_details
FOR EACH ROW
EXECUTE FUNCTION trigger_cron_failure_alert();
```

---

## Logging

### Application Logs

All bonus-malus operations log to `worker_logs` table:

```sql
SELECT * FROM worker_logs
WHERE service LIKE 'cron_%'
   OR service LIKE '%bonus%'
   OR service LIKE '%driver%'
ORDER BY created_at DESC
LIMIT 100;
```

**Log Levels:**
- **INFO:** Normal operations (class updates, CP issuance)
- **WARNING:** Non-critical issues (CP near expiry, low score)
- **ERROR:** Failures (RPC errors, data inconsistencies)

### Audit Trail

All accounting entries provide full audit trail:

```sql
SELECT
    aje.entry_number,
    aje.entry_date,
    aje.transaction_type,
    aje.description,
    al.account_id,
    aa.code,
    aa.name,
    al.debit_amount,
    al.credit_amount
FROM accounting_journal_entries aje
INNER JOIN accounting_ledger al ON aje.id = al.journal_entry_id
INNER JOIN accounting_accounts aa ON al.account_id = aa.id
WHERE aje.transaction_type IN (
    'PROTECTION_CREDIT_ISSUANCE',
    'PROTECTION_CREDIT_CONSUMPTION',
    'PROTECTION_CREDIT_BREAKAGE',
    'BONUS_PROTECTOR_SALE'
)
ORDER BY aje.entry_date DESC;
```

---

## Performance Monitoring

### Slow Query Detection

Monitor RPC function execution times:

```sql
SELECT
    funcname,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_ms,
    ROUND(mean_exec_time::numeric, 2) as avg_ms,
    ROUND(max_exec_time::numeric, 2) as max_ms
FROM pg_stat_user_functions
WHERE funcname LIKE '%driver%'
   OR funcname LIKE '%protection%'
   OR funcname LIKE '%bonus%'
ORDER BY total_exec_time DESC;
```

**Targets:**
- Average execution: < 100ms for profile queries
- Average execution: < 500ms for updates
- Max execution: < 2000ms (2s)

**Alert Triggers:**
- ⚠️ Avg execution > 200ms → Query optimization needed
- ⚠️ Max execution > 5000ms → Investigate outliers

---

### Table Size Monitoring

Track table growth:

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE tablename IN (
    'driver_risk_profile',
    'driver_telemetry',
    'driver_protection_addons',
    'booking_claims',
    'accounting_journal_entries'
)
ORDER BY size_bytes DESC;
```

**Expected Growth:**
- driver_risk_profile: ~1KB per user (slow growth)
- driver_telemetry: ~500 bytes per trip (fast growth)
- accounting_journal_entries: ~200 bytes per entry (moderate growth)

**Alert Triggers:**
- ⚠️ driver_telemetry > 10GB → Consider partitioning by month

---

## Business Intelligence

### Revenue Attribution

Track bonus-malus revenue streams:

```sql
WITH revenue_streams AS (
    SELECT
        'Protector Sales' as stream,
        SUM(debit_amount) as revenue_usd
    FROM accounting_ledger
    WHERE account_id = (SELECT id FROM accounting_accounts WHERE code = '4104')
    AND entry_date > NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT
        'CP Breakage' as stream,
        SUM(credit_amount) as revenue_usd
    FROM accounting_ledger
    WHERE account_id = (SELECT id FROM accounting_accounts WHERE code = '4203')
    AND entry_date > NOW() - INTERVAL '30 days'

    UNION ALL

    SELECT
        'CP Consumption' as stream,
        SUM(credit_amount) as revenue_usd
    FROM accounting_ledger
    WHERE account_id = (SELECT id FROM accounting_accounts WHERE code = '4103')
    AND entry_date > NOW() - INTERVAL '30 days'
)
SELECT
    stream,
    ROUND(revenue_usd, 2) as revenue_usd,
    ROUND(revenue_usd * 100.0 / SUM(revenue_usd) OVER (), 2) as percentage
FROM revenue_streams
ORDER BY revenue_usd DESC;
```

### Cohort Analysis

Track class progression by cohort:

```sql
SELECT
    TO_CHAR(drp.created_at, 'YYYY-MM') as cohort_month,
    COUNT(*) as users,
    ROUND(AVG(drp.class), 2) as avg_class_now,
    ROUND(AVG(CASE WHEN drp.created_at > NOW() - INTERVAL '30 days' THEN 5 ELSE drp.class END), 2) as avg_class_at_start,
    ROUND(AVG(drp.class) - 5, 2) as avg_class_change
FROM driver_risk_profile drp
WHERE drp.created_at > NOW() - INTERVAL '6 months'
GROUP BY cohort_month
ORDER BY cohort_month DESC;
```

---

## Troubleshooting Monitors

### Data Inconsistency Checks

**Check 1: Driver profile without wallet**
```sql
SELECT drp.user_id
FROM driver_risk_profile drp
LEFT JOIN user_wallets uw ON drp.user_id = uw.user_id
WHERE uw.user_id IS NULL;
```

**Check 2: CP without transaction record**
```sql
SELECT uw.user_id, uw.protection_credit_cents
FROM user_wallets uw
WHERE uw.protection_credit_cents > 0
AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt
    WHERE wt.user_id = uw.user_id
    AND wt.is_protection_credit = TRUE
    AND wt.protection_credit_reference_type = 'ISSUANCE'
);
```

**Check 3: Classes out of valid range**
```sql
SELECT user_id, class
FROM driver_risk_profile
WHERE class < 0 OR class > 10;
```

---

## Implementation Checklist

- [ ] Install pg_stat_statements extension
- [ ] Create bonus_malus_alerts table
- [ ] Configure alert triggers (3 triggers)
- [ ] Set up admin dashboard view
- [ ] Create weekly report function
- [ ] Schedule weekly report email (cron)
- [ ] Configure Slack webhook for critical alerts
- [ ] Test all alert triggers
- [ ] Document alert response procedures
- [ ] Train support team on dashboard

---

**Last Updated:** November 2025
**Version:** 1.0
**Author:** AutoRenta DevOps Team
