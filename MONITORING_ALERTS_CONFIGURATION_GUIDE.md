# Monitoring Alerts - Configuration Guide

**Status**: Ready for Configuration
**Priority**: P1 IMPORTANT (Production Requirement)
**Estimated Time**: 1 hour
**Platform**: Supabase + Cloudflare + Sentry

---

## 📋 Overview

Configure comprehensive monitoring alerts to:
- **Detect outages** before users report them
- **Prevent data loss** with database alerts
- **Track performance** degradation
- **Monitor security** incidents
- **Alert on errors** in production

**Goal**: Get notified of critical issues within 1-5 minutes of occurrence.

---

## 🎯 Alert Categories

### 1. Infrastructure Alerts (P0 - Critical)
- Database connection failures
- High database CPU/memory usage
- Storage approaching limits
- Edge Function failures

### 2. Application Alerts (P0 - Critical)
- Frontend build failures
- API error rate spikes
- Authentication failures
- Payment processing errors

### 3. Security Alerts (P0 - Critical)
- Multiple failed login attempts
- Suspicious activity detected
- Rate limit triggers
- DDoS attacks

### 4. Business Alerts (P1 - Important)
- Low booking conversion rate
- Payment failures
- User complaints
- Wallet balance issues

### 5. Performance Alerts (P1 - Important)
- Slow database queries (>1s)
- High API latency (>500ms)
- Memory leaks detected
- Cache hit rate drop

---

## 🔧 Implementation: Supabase Alerts

### Step 1: Configure Database Alerts

Navigate to: **Supabase Dashboard** → **Settings** → **Notifications**

#### Alert 1: Database CPU Usage

```yaml
Name: High Database CPU Usage
Type: Database Performance
Metric: CPU Usage
Threshold: > 80%
Duration: 5 minutes
Action: Send email + Slack notification
Recipients: ops-team@autorenta.com
Priority: Critical
```

**Webhook Configuration** (if using Slack):
```json
{
  "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
  "channel": "#alerts-production",
  "username": "AutoRenta Monitoring",
  "icon_emoji": ":warning:"
}
```

#### Alert 2: Database Memory Usage

```yaml
Name: High Database Memory Usage
Type: Database Performance
Metric: Memory Usage
Threshold: > 85%
Duration: 5 minutes
Action: Send email + Slack notification
Recipients: ops-team@autorenta.com
Priority: Critical
```

#### Alert 3: Storage Approaching Limit

```yaml
Name: Storage Limit Warning
Type: Storage
Metric: Storage Usage
Threshold: > 80% of plan limit
Check Frequency: Daily
Action: Send email
Recipients: ops-team@autorenta.com, finance@autorenta.com
Priority: High
```

#### Alert 4: Database Connection Failures

```yaml
Name: Database Connection Failures
Type: Database Availability
Metric: Connection Error Rate
Threshold: > 5 errors per minute
Duration: 2 minutes
Action: Send email + SMS (critical)
Recipients: ops-team@autorenta.com
Priority: Critical
```

---

### Step 2: Configure Edge Function Alerts

Navigate to: **Supabase Dashboard** → **Edge Functions** → **Settings**

#### Alert 5: Edge Function Errors

```yaml
Name: Edge Function Error Rate
Type: Edge Function
Metric: Error Rate
Threshold: > 5% of requests
Duration: 5 minutes
Action: Send email + Slack notification
Recipients: dev-team@autorenta.com
Priority: High
```

**Affected Functions**:
- `mercadopago-create-preference`
- `mercadopago-webhook`
- `wallet-*` functions
- `verify-user-docs`

#### Alert 6: Edge Function Timeout

```yaml
Name: Edge Function Timeouts
Type: Edge Function
Metric: Timeout Rate
Threshold: > 3 timeouts in 10 minutes
Action: Send email
Recipients: dev-team@autorenta.com
Priority: High
```

---

### Step 3: Configure Health Check Monitoring

Create a dedicated health check endpoint monitoring service.

**Option A: Use Existing `monitoring-health-check` Edge Function**

File: `supabase/functions/monitoring-health-check/index.ts`

Current implementation already exists. Configure external monitoring:

#### External Monitoring Service: UptimeRobot (Free)

1. Go to https://uptimerobot.com/
2. Sign up for free account
3. Create monitor:

```yaml
Monitor Type: HTTP(s)
Friendly Name: AutoRenta API Health
URL: https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check
Monitoring Interval: 5 minutes
Alert Contacts: ops-team@autorenta.com
HTTP Method: GET
Timeout: 30 seconds
Success Criteria: Status Code = 200
Alert When Down: 2 consecutive failures
```

4. Add alert contacts:
   - Email: ops-team@autorenta.com
   - Slack webhook (if configured)
   - SMS (for critical)

---

## 🔧 Implementation: Sentry Error Tracking

Sentry is already integrated in the codebase. Configure alerts:

### Step 1: Activate Sentry (if not already done)

See `SENTRY_ACTIVATION_GUIDE.md` for detailed setup.

Quick setup:
1. Get Sentry DSN from project settings
2. Add to environment variables:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
3. Sentry automatically tracks errors via `sentry.service.ts`

### Step 2: Configure Sentry Alerts

Navigate to: **Sentry Dashboard** → **Alerts**

#### Alert 7: High Error Rate

```yaml
Name: High Error Rate Alert
Type: Error Rate
Metric: Errors per minute
Threshold: > 10 errors in 5 minutes
Environment: production
Action: Send email + Slack notification
Recipients: dev-team@autorenta.com
Priority: High
```

#### Alert 8: New Error Types

```yaml
Name: New Error Type Detected
Type: Issue Alert
Metric: First seen error
Threshold: Any new error type
Environment: production
Action: Send email
Recipients: dev-team@autorenta.com
Priority: Medium
```

#### Alert 9: Critical Errors

```yaml
Name: Critical Error Alert
Type: Issue Alert
Metric: Error with tag "severity:critical"
Threshold: Any occurrence
Environment: production
Action: Send email + SMS
Recipients: ops-team@autorenta.com
Priority: Critical
```

**Tag critical errors in code**:
```typescript
this.sentry.captureException(error, {
  tags: { severity: 'critical' },
  level: 'fatal',
  extra: { userId, context: 'payment_processing' }
});
```

---

## 🔧 Implementation: Cloudflare Alerts

Already configured in Rate Limiting deployment. Additional alerts:

### Step 1: Configure Traffic Alerts

Navigate to: **Cloudflare Dashboard** → **Notifications**

#### Alert 10: Traffic Spike

```yaml
Name: Unusual Traffic Spike
Type: Traffic Anomaly
Metric: Requests per minute
Threshold: 3x normal traffic
Duration: 5 minutes
Action: Send email
Recipients: ops-team@autorenta.com
Priority: Medium
```

#### Alert 11: Error Rate Spike

```yaml
Name: HTTP Error Rate Spike
Type: Error Rate
Metric: 5xx errors
Threshold: > 5% of requests
Duration: 5 minutes
Action: Send email + Slack notification
Recipients: ops-team@autorenta.com
Priority: High
```

---

## 📊 Business Metrics Alerts

Configure custom alerts using Supabase SQL queries + scheduled Edge Functions.

### Alert 12: Low Booking Conversion Rate

Create Edge Function: `supabase/functions/monitor-business-metrics/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Check booking conversion rate (last 24 hours)
  const { data: bookings, error } = await supabase
    .rpc('get_booking_stats_24h');

  if (error) {
    console.error('Error fetching booking stats:', error);
    return new Response('Error', { status: 500 });
  }

  const conversionRate = bookings.completed / bookings.total;

  if (conversionRate < 0.3) { // Less than 30% conversion
    // Send alert
    await fetch(Deno.env.get('SLACK_WEBHOOK_URL')!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ Low booking conversion rate: ${(conversionRate * 100).toFixed(1)}%`,
        channel: '#alerts-business'
      })
    });
  }

  return new Response('OK', { status: 200 });
});
```

**Schedule with cron**:
```bash
# Run every hour
0 * * * * curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitor-business-metrics
```

Or use Supabase's built-in cron (if available):
```sql
SELECT cron.schedule(
  'monitor-business-metrics',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://obxvffplochgeiclibng.supabase.co/functions/v1/monitor-business-metrics',
    headers := '{"Content-Type": "application/json"}'::jsonb
  )
  $$
);
```

### Alert 13: Payment Failure Rate

```typescript
// In monitor-business-metrics function
const { data: payments } = await supabase
  .rpc('get_payment_stats_24h');

const failureRate = payments.failed / payments.total;

if (failureRate > 0.1) { // More than 10% failures
  await sendSlackAlert(
    `🚨 High payment failure rate: ${(failureRate * 100).toFixed(1)}%`
  );
}
```

---

## 🎯 Alert Routing Matrix

| Alert Type | Priority | Email | Slack | SMS | PagerDuty |
|------------|----------|-------|-------|-----|-----------|
| Database Down | P0 | ✅ | ✅ | ✅ | ✅ |
| Edge Function Errors | P0 | ✅ | ✅ | ❌ | ✅ |
| High Error Rate | P1 | ✅ | ✅ | ❌ | ❌ |
| Security Incidents | P0 | ✅ | ✅ | ✅ | ✅ |
| Rate Limit Triggers | P1 | ✅ | ✅ | ❌ | ❌ |
| Business Metrics | P2 | ✅ | ✅ | ❌ | ❌ |
| Performance Degradation | P1 | ✅ | ✅ | ❌ | ❌ |

---

## 📱 Notification Channels Setup

### Email Notifications

**Primary**:
- `ops-team@autorenta.com` (all critical alerts)
- `dev-team@autorenta.com` (application errors)
- `finance@autorenta.com` (billing, payment alerts)

### Slack Notifications

**Channels**:
- `#alerts-production` (P0 critical alerts)
- `#alerts-security` (security incidents)
- `#alerts-business` (business metrics)
- `#dev-errors` (application errors)

**Webhook URL**: Get from Slack workspace settings

### SMS Notifications (Critical Only)

**Use Cases**:
- Database outages
- Payment system down
- Security breaches
- DDoS attacks

**Setup**: Configure via Twilio or Supabase SMS service

### PagerDuty (Optional - Recommended)

**Plan**: Free tier available
**Integration**: Connect to Sentry, Cloudflare, Supabase

---

## 🧪 Testing Alerts

### Test 1: Trigger Test Alert

Most services provide "Send Test Alert" button:
1. Supabase → Notifications → Send Test
2. Cloudflare → Notifications → Send Test
3. Sentry → Alerts → Test Alert
4. UptimeRobot → Test Notification

- [ ] Verify email received
- [ ] Verify Slack message received
- [ ] Verify SMS received (if configured)

### Test 2: Simulate Database Load

```sql
-- Run a heavy query to trigger CPU alert
SELECT pg_sleep(60); -- Hold connection for 1 min
```

- [ ] Verify CPU usage alert triggers (if threshold met)

### Test 3: Simulate Error Rate Spike

```typescript
// In Angular app (dev environment)
for (let i = 0; i < 20; i++) {
  this.sentry.captureException(new Error('Test error'));
}
```

- [ ] Verify Sentry alert triggers

### Test 4: Simulate Health Check Failure

```bash
# Stop Edge Function temporarily
# Or block IP in Cloudflare

# Wait 10 minutes (2 x monitoring interval)
```

- [ ] Verify UptimeRobot alert triggers

---

## 📊 Monitoring Dashboard

### Recommended: Grafana (Free)

**Setup**:
1. Sign up for Grafana Cloud (free tier)
2. Connect data sources:
   - Supabase (via PostgreSQL connection)
   - Cloudflare (via API)
   - Sentry (via API)
3. Import pre-built dashboards:
   - PostgreSQL Performance
   - HTTP Traffic Overview
   - Error Rate Trends

**Dashboards to Create**:
- Real-time request rate
- Error rate over time
- Database performance metrics
- Booking conversion funnel
- Payment success rate

---

## ✅ Success Criteria

- [ ] All 13 alerts configured and active
- [ ] Email notifications working
- [ ] Slack notifications working (if configured)
- [ ] SMS notifications working (for critical alerts)
- [ ] Test alerts sent and received
- [ ] Alert routing matrix documented
- [ ] On-call rotation established
- [ ] Runbook created for each alert type
- [ ] Team trained on alert response

---

## 📝 Post-Configuration Tasks

### Week 1
- [ ] Monitor for false positive alerts
- [ ] Adjust thresholds if needed
- [ ] Document common alert causes
- [ ] Create resolution runbooks

### Month 1
- [ ] Review alert effectiveness
- [ ] Analyze mean time to detection (MTTD)
- [ ] Analyze mean time to resolution (MTTR)
- [ ] Optimize alert fatigue

---

## 🔄 Maintenance

### Weekly
- Review alert logs
- Check for false positives
- Verify all channels working

### Monthly
- Review alert thresholds
- Update contact list
- Test all notification channels
- Review incident response times

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Status**: Ready for Configuration
**Estimated Time**: 1 hour
**Next Review**: After configuration
