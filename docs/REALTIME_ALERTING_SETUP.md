# Real-time Alerting System - Setup Guide

**Status**: ✅ Complete
**Issue**: #119 - Real-time Alerting Setup (PagerDuty/Opsgenie)
**Date**: 2025-11-07
**Priority**: P0 (Production Blocker)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Sentry Integration](#sentry-integration)
6. [PagerDuty Setup](#pagerduty-setup)
7. [Opsgenie Setup](#opsgenie-setup)
8. [Testing](#testing)
9. [Monitoring & Metrics](#monitoring--metrics)
10. [Troubleshooting](#troubleshooting)

---

## Overview

AutoRenta's real-time alerting system provides comprehensive monitoring and alerting across multiple channels:

### Key Features

✅ **Multi-Provider Alerting**
- PagerDuty for P0 critical alerts
- Opsgenie for P1 warnings
- Slack for all alerts
- Sentry integration for error tracking

✅ **SLA Compliance Tracking**
- MTTD (Mean Time To Detect): <5 minutes
- MTTR (Mean Time To Respond): <30 minutes
- False Positive Rate: <5%

✅ **Custom Alert Rules**
- Payment failures
- API degradation
- Database connection issues
- Authentication spikes
- Error rate spikes

✅ **On-Call Management**
- Escalation policies
- Weekly rotations
- Incident runbooks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AutoRenta Platform                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Frontend   │  │ Edge Functions│  │  Database    │         │
│  │   (Sentry)   │  │ (Health Checks)│  │  (Metrics)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                   │
│         └─────────────────┴──────────────────┘                   │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Monitoring Alert Rules       │
            │  (Database Triggers)          │
            └───────────────┬───────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Realtime Alerting Function   │
            │  (Multi-Provider Routing)     │
            └───────────────┬───────────────┘
                            │
         ┌──────────────────┼──────────────────┬──────────────┐
         │                  │                  │              │
         ▼                  ▼                  ▼              ▼
┌────────────────┐ ┌────────────────┐ ┌────────────┐ ┌─────────────┐
│  PagerDuty     │ │    Opsgenie    │ │   Slack    │ │   Sentry    │
│  (P0 Critical) │ │  (P1 Warnings) │ │  (All)     │ │  (Errors)   │
└────────────────┘ └────────────────┘ └────────────┘ └─────────────┘
         │                  │                  │              │
         └──────────────────┴──────────────────┴──────────────┘
                            │
                            ▼
                ┌──────────────────────────┐
                │   On-Call Engineers      │
                │   (Mobile/Email/SMS)     │
                └──────────────────────────┘
```

---

## Installation

### Step 1: Install Dependencies

```bash
cd /home/user/autorenta

# Install Sentry in Angular app
cd apps/web
npm install @sentry/angular@^8.42.0

# Back to root
cd ../..
```

### Step 2: Deploy Database Schema

```bash
# Apply SLA tracking and alert rules schema
supabase db execute -f database/realtime_alerting_setup.sql
```

### Step 3: Deploy Edge Functions

```bash
# Deploy enhanced alerting function
supabase functions deploy realtime-alerting

# Deploy existing monitoring functions (if not already deployed)
supabase functions deploy monitoring-health-check
supabase functions deploy monitoring-metrics
```

### Step 4: Setup Cron Jobs

Run this SQL in Supabase Dashboard (SQL Editor):

```sql
-- Health checks every 5 minutes
SELECT cron.schedule(
  'monitoring-health-check-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alert processing every 2 minutes
SELECT cron.schedule(
  'realtime-alerting-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/realtime-alerting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Alert rule evaluation every 10 minutes
SELECT cron.schedule(
  'alert-rules-evaluation-every-10min',
  '*/10 * * * *',
  $$
  SELECT monitoring_evaluate_alert_rules();
  $$
);
```

---

## Configuration

### Environment Variables

#### Angular Application

Add to Cloudflare Pages environment variables:

```bash
# Sentry Configuration
NG_APP_SENTRY_DSN=https://xxxxx@xxxxxx.ingest.sentry.io/xxxxxx
NG_APP_SENTRY_ENVIRONMENT=production
```

#### Supabase Edge Functions

Configure secrets:

```bash
# Sentry
supabase secrets set SENTRY_WEBHOOK_URL="https://sentry.io/api/hooks/xxxxx"

# Slack
supabase secrets set SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# PagerDuty
supabase secrets set PAGERDUTY_INTEGRATION_KEY="your-integration-key-here"

# Opsgenie
supabase secrets set OPSGENIE_API_KEY="your-api-key-here"

# Production URL (for health checks)
supabase secrets set PRODUCTION_URL="https://autorentar.com"
```

---

## Sentry Integration

### Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Create new project: "autorenta-web"
3. Platform: Angular
4. Copy DSN

### Step 2: Configure Sentry

DSN is already configured in:
- `apps/web/src/main.ts` (initialization)
- `apps/web/src/app/core/services/logger.service.ts` (logging integration)
- `apps/web/src/environments/environment.ts` (configuration)

### Step 3: Set Environment Variable

```bash
# In Cloudflare Pages dashboard
NG_APP_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
```

### Step 4: Configure Alert Rules in Sentry

1. Go to Sentry Project Settings > Alerts
2. Create alert rule: "High Error Rate"
   - Metric: Error count
   - Threshold: > 10 errors in 5 minutes
   - Actions: Webhook → Supabase realtime-alerting function

3. Create alert rule: "New Error Type"
   - Condition: First seen
   - Actions: Webhook → Supabase realtime-alerting function

### Step 5: Test Sentry Integration

```typescript
// In your app, trigger a test error
import * as Sentry from '@sentry/angular';

Sentry.captureException(new Error('Test Sentry integration'));
```

---

## PagerDuty Setup

### Step 1: Create PagerDuty Account

1. Sign up at https://www.pagerduty.com/
2. Choose plan (Free trial or paid)

### Step 2: Create Service

1. Services > Service Directory > New Service
2. Name: "AutoRenta Production"
3. Integration Type: "Events API V2"
4. Escalation Policy: Create new (see below)
5. Copy **Integration Key**

### Step 3: Configure Escalation Policy

**Escalation Policy**: "AutoRenta On-Call"

```
Level 1: Primary On-Call Engineer
  - Notify immediately
  - Escalate after: 15 minutes

Level 2: Backup On-Call Engineer
  - Notify if not acknowledged
  - Escalate after: 15 minutes

Level 3: Engineering Manager
  - Notify if not resolved
  - Escalate after: 30 minutes
```

### Step 4: Create Schedules

1. People > On-Call Schedules > New Schedule
2. Name: "AutoRenta Primary On-Call"
3. Rotation: Weekly
4. Start: Monday 9:00 AM ART
5. Add team members

Repeat for "AutoRenta Backup On-Call"

### Step 5: Configure in Supabase

```bash
supabase secrets set PAGERDUTY_INTEGRATION_KEY="your-integration-key"
```

### Step 6: Test PagerDuty Integration

```bash
# Trigger test alert
curl -X POST "https://obxvffplochgeiclibng.supabase.co/functions/v1/realtime-alerting" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## Opsgenie Setup

### Step 1: Create Opsgenie Account

1. Sign up at https://www.atlassian.com/software/opsgenie
2. Choose plan (Free trial or Standard)

### Step 2: Create Team

1. Teams > Create Team
2. Name: "AutoRenta Platform"
3. Add members

### Step 3: Create Integration

1. Settings > Integrations > Add Integration
2. Select: "API"
3. Name: "AutoRenta Monitoring"
4. Copy **API Key**

### Step 4: Configure Escalation

1. Teams > AutoRenta Platform > Escalations
2. Create new escalation:

```
Name: AutoRenta Critical Alerts

Step 1: Notify Primary On-Call
  - Wait: 5 minutes

Step 2: Notify Backup On-Call
  - Wait: 15 minutes

Step 3: Notify Engineering Manager
```

### Step 5: Configure in Supabase

```bash
supabase secrets set OPSGENIE_API_KEY="your-api-key"
```

### Step 6: Test Opsgenie Integration

Opsgenie will receive P1 warning alerts automatically via the routing rules in `realtime-alerting` function.

---

## Testing

### Test 1: End-to-End Alert Flow

```bash
# 1. Create test alert via SQL
psql $DATABASE_URL <<EOF
INSERT INTO monitoring_alerts (
  alert_type,
  severity,
  title,
  message,
  status
) VALUES (
  'payment_failure',
  'critical',
  'TEST: Payment Failure Alert',
  'This is a test alert for end-to-end testing',
  'active'
);
EOF

# 2. Wait 2 minutes for cron job to trigger

# 3. Verify in PagerDuty, Slack, Sentry
```

### Test 2: SLA Metrics

```bash
# Get SLA summary
curl "https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-metrics?action=sla_summary" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

Expected response:
```json
{
  "total_alerts": 1,
  "mttd_compliant": 1,
  "mttr_compliant": 0,
  "mttd_compliance_rate": 100.00,
  "avg_detection_time_ms": 120000
}
```

### Test 3: Alert Rules Evaluation

```bash
# Trigger alert rule evaluation
psql $DATABASE_URL -c "SELECT * FROM monitoring_evaluate_alert_rules();"
```

### Test 4: Sentry Error Tracking

```bash
# Deploy and test in browser console
window['Sentry'].captureException(new Error('Test error from console'));
```

Check Sentry dashboard for error.

---

## Monitoring & Metrics

### Real-time Dashboards

**Monitoring Dashboard**: https://autorentar.com/admin/monitoring

**Metrics Available**:
- Active alerts
- Alert trends (last 24h)
- SLA compliance rate
- MTTD/MTTR averages
- False positive rate
- Provider health status

### SLA Compliance Query

```sql
-- Get last 7 days SLA compliance
SELECT * FROM monitoring_get_sla_summary(168); -- 168 hours = 7 days
```

### Alert Rule Performance

```sql
-- See which rules are triggering most
SELECT
  rule_name,
  COUNT(*) as trigger_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_sec
FROM monitoring_alerts a
JOIN monitoring_alert_rules r ON (a.metadata->>'rule_id')::UUID = r.id
WHERE a.created_at > NOW() - INTERVAL '7 days'
GROUP BY rule_name
ORDER BY trigger_count DESC;
```

### Provider Success Rates

```sql
-- Check notification success rate by provider
SELECT
  notification_channel,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE notification_status = 'sent') as successful,
  ROUND(
    COUNT(*) FILTER (WHERE notification_status = 'sent')::NUMERIC / COUNT(*) * 100,
    2
  ) as success_rate
FROM monitoring_alert_notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY notification_channel;
```

---

## Troubleshooting

### Issue: Alerts not being sent

**Symptoms**: Alerts created but no notifications received

**Diagnosis**:
```bash
# Check if cron job is running
psql $DATABASE_URL -c "SELECT * FROM cron.job WHERE jobname LIKE '%alerting%';"

# Check Edge Function logs
# Supabase Dashboard > Edge Functions > realtime-alerting > Logs

# Check for failed notifications
psql $DATABASE_URL -c "
  SELECT * FROM monitoring_alert_notifications
  WHERE notification_status = 'failed'
  ORDER BY created_at DESC
  LIMIT 10;
"
```

**Fix**:
1. Verify secrets are set: `supabase secrets list`
2. Test webhook URLs manually
3. Check Edge Function deployment: `supabase functions deploy realtime-alerting`

### Issue: High false positive rate

**Symptoms**: Too many alerts, >5% marked as false positives

**Diagnosis**:
```sql
SELECT
  alert_type,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE is_false_positive = true) as false_positives,
  ROUND(
    COUNT(*) FILTER (WHERE is_false_positive = true)::NUMERIC / COUNT(*) * 100,
    2
  ) as false_positive_rate
FROM monitoring_sla_metrics m
JOIN monitoring_alerts a ON m.alert_id = a.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY alert_type
HAVING COUNT(*) FILTER (WHERE is_false_positive = true) > 0
ORDER BY false_positive_rate DESC;
```

**Fix**:
1. Adjust alert rule thresholds
2. Increase cooldown period
3. Use spike detection instead of absolute thresholds

```sql
-- Example: Increase error threshold
UPDATE monitoring_alert_rules
SET threshold_value = 20  -- was 10
WHERE rule_name = 'error_rate_spike';
```

### Issue: MTTR SLA not met

**Symptoms**: Resolution time > 30 minutes consistently

**Diagnosis**:
```sql
SELECT
  alert_type,
  AVG(resolution_time_ms) / 1000 / 60 as avg_resolution_minutes,
  COUNT(*) FILTER (WHERE mttr_sla_met = false) as sla_violations
FROM monitoring_sla_metrics m
JOIN monitoring_alerts a ON m.alert_id = a.id
WHERE m.created_at > NOW() - INTERVAL '7 days'
  AND resolution_time_ms IS NOT NULL
GROUP BY alert_type
ORDER BY avg_resolution_minutes DESC;
```

**Fix**:
1. Review runbooks - ensure they're clear and actionable
2. Conduct incident drills
3. Add pre-built mitigation scripts
4. Check escalation policy - may need faster escalation

### Issue: Sentry not capturing errors

**Diagnosis**:
```bash
# Check if Sentry is initialized
# Browser console:
window['Sentry']

# Check environment variable
echo $NG_APP_SENTRY_DSN
```

**Fix**:
1. Verify `NG_APP_SENTRY_DSN` is set in Cloudflare Pages
2. Redeploy application
3. Check browser console for Sentry errors
4. Verify Sentry project quota not exceeded

---

## Success Metrics

### Deployment Checklist

- [ ] Sentry integrated and capturing errors
- [ ] PagerDuty configured with escalation policy
- [ ] Opsgenie configured for P1 alerts
- [ ] Slack notifications working
- [ ] Database schema deployed
- [ ] Edge Functions deployed
- [ ] Cron jobs configured and running
- [ ] Alert rules configured
- [ ] On-call rotation documented
- [ ] Runbooks created for all alert types
- [ ] Team trained on procedures
- [ ] Incident drill completed

### Target SLAs (After 30 Days)

- ✅ MTTD: < 5 minutes (90% compliance)
- ✅ MTTR: < 30 minutes (80% compliance)
- ✅ False Positive Rate: < 5%
- ✅ Alert Delivery: < 1 minute
- ✅ Provider Uptime: > 99.5%

---

## Related Documentation

- [On-Call Rotation](./runbooks/on-call-rotation.md)
- [Alert Response Runbooks](./runbooks/)
- [Monitoring System](./MONITORING_SYSTEM.md)
- [Production Readiness](./PRODUCTION_READINESS_AUDIT_2025-11-07.md)

---

**Document Owner**: Platform Engineering
**Last Updated**: 2025-11-07
**Next Review**: 2025-12-07
