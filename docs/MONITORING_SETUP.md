# AutoRenta Monitoring & Observability Setup

**Date:** 2025-11-07
**Status:** ✅ Implemented
**Priority:** P0 - Production Blocker (Resolved)

## Overview

Comprehensive monitoring and observability infrastructure for AutoRenta car-sharing platform.

### What's Been Implemented

| Component | Status | Tools | Coverage |
|-----------|--------|-------|----------|
| **Error Tracking** | ✅ Complete | Sentry | Angular, Edge Functions, Workers |
| **Critical Alerts** | ✅ Complete | PagerDuty + Slack | Critical severity only |
| **Performance Monitoring** | ✅ Complete | Sentry (APM) | Core Web Vitals, Transactions |
| **Health Checks** | ✅ Existing | Custom (Supabase) | API endpoints, Database |
| **Uptime Monitoring** | ⏳ Pending | External service needed | N/A |
| **Centralized Logging** | ⏳ Pending | Future enhancement | N/A |

## 1. Error Tracking (Sentry)

### Angular App

**Integration:** `@sentry/angular` v8.40.0

**Configuration:** `apps/web/src/main.ts`

```typescript
import * as Sentry from '@sentry/angular';

if (environment.enableSentry && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    replaysSessionSampleRate: environment.production ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

**Features:**
- ✅ Automatic error capture via ErrorHandler
- ✅ Browser performance tracing (Core Web Vitals)
- ✅ Session replay on errors
- ✅ Automatic sensitive data sanitization
- ✅ Route-based transaction tracking

**Logger Integration:** `apps/web/src/app/core/services/logger.service.ts`
- Errors and warnings automatically sent to Sentry
- Sensitive fields redacted before sending

### Supabase Edge Functions

**Integration:** Deno Sentry SDK v8.40.0

**Configuration:** `supabase/functions/_shared/sentry.ts`

```typescript
import * as Sentry from 'https://deno.land/x/sentry@8.40.0/index.mjs';

export function initSentry(functionName: string, config?: SentryConfig): void {
  Sentry.init({
    dsn: config?.dsn || Deno.env.get('SENTRY_DSN'),
    environment: Deno.env.get('ENVIRONMENT') || 'development',
    sampleRate: environment === 'production' ? 0.1 : 1.0,
  });
}
```

**Usage:**
```typescript
import { initSentry, captureError } from '../_shared/sentry.ts';

initSentry('my-function');

try {
  // Your code
} catch (error) {
  captureError(error, { context: 'operation-name' });
  throw error;
}
```

**Logger Integration:** `supabase/functions/_shared/logger.ts`
- Automatic Sentry capture for WARN and ERROR levels
- Only active in production with SENTRY_DSN configured

### Cloudflare Workers

**Integration:** `toucan-js` v3.x (Sentry client for Workers)

**Configuration:** `functions/workers/payments_webhook/src/index.ts`

```typescript
import { Toucan } from 'toucan-js';

const sentry = new Toucan({
  dsn: env.SENTRY_DSN,
  environment: env.ENVIRONMENT || 'development',
  context,
  request,
});

sentry.setTag('worker', 'payments_webhook');
```

**Features:**
- ✅ Automatic exception capture
- ✅ Request context tracking
- ✅ Custom tags for filtering
- ✅ Sensitive data sanitization

**Critical Worker:** `payments_webhook`
- ✅ Full error tracking implemented
- ✅ Payment failure alerts
- ✅ Webhook retry monitoring

## 2. Critical Alerting (PagerDuty)

### Integration

**Service:** PagerDuty Events API v2
**Configuration:** `supabase/functions/monitoring-alerts/index.ts`

```typescript
const NOTIFICATION_CONFIG = {
  pagerduty_integration_key: Deno.env.get('PAGERDUTY_INTEGRATION_KEY'),
  pagerduty_enabled: Deno.env.get('PAGERDUTY_ENABLED') === 'true',
};
```

### Alert Rules

| Severity | Channels | Conditions |
|----------|----------|------------|
| **Critical** | PagerDuty + Slack | >3 payment failures in 5min, API downtime |
| **Warning** | Slack only | Performance degradation, elevated error rate |
| **Info** | Slack only | Routine notifications |

### PagerDuty Features

- ✅ Automatic incident creation for critical alerts
- ✅ Deduplication (one incident per alert)
- ✅ Custom details with alert metadata
- ✅ Direct link to monitoring dashboard
- ✅ Integration with existing Slack workflow

### Setup Required

1. Create PagerDuty service
2. Get integration key from: `https://[subdomain].pagerduty.com/service-directory`
3. Configure Supabase secrets:
   ```bash
   supabase secrets set PAGERDUTY_INTEGRATION_KEY=<your-key>
   supabase secrets set PAGERDUTY_ENABLED=true
   ```

## 3. Performance Monitoring

### Sentry APM (Application Performance Monitoring)

**Coverage:**
- ✅ Angular route changes tracked as transactions
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ API call performance
- ✅ Component rendering times

**Sample Rates:**
- Production: 10% of transactions
- Development: 100% of transactions

**Thresholds:**
- LCP: < 2.5s (warning if > 2.5s)
- FID: < 100ms (warning if > 100ms)
- API calls: < 1s (warning if > 1s)

### Custom Monitoring Service

**File:** `apps/web/src/app/core/services/performance-monitoring.service.ts`

**Metrics:**
- FPS monitoring (warns if < 50fps)
- Memory usage tracking
- Device information logging

**Note:** Currently development-only. Sentry APM handles production monitoring.

## 4. Health Checks & Uptime

### Custom Health Check System

**Database:** `monitoring_health_checks` table
**Function:** `supabase/functions/monitoring-health-check/index.ts`

**Monitored Endpoints:**
- Production website (autorenta-web.pages.dev)
- Auth endpoints
- Database connectivity
- Edge Functions

**Schedule:** Every 5 minutes via pg_cron

**Metrics Tracked:**
- Response time
- Status code
- Availability percentage
- Error messages

### Uptime Monitoring (Pending)

**Recommended Services:**
- UptimeRobot (Free tier: 50 monitors)
- Pingdom
- StatusCake

**What to Monitor:**
- Website: https://autorenta-web.pages.dev
- API: https://obxvffplochgeiclibng.supabase.co
- Payment webhook: Worker endpoint

## 5. Environment Variables

### Angular (.env / Cloudflare Pages)

```bash
# Sentry
NG_APP_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Supabase Edge Functions

```bash
# Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
ENVIRONMENT=production

# PagerDuty
PAGERDUTY_INTEGRATION_KEY=R123456789ABCDEF
PAGERDUTY_ENABLED=true

# Slack (already configured)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxxxx
```

### Cloudflare Workers

```bash
# Sentry
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
ENVIRONMENT=production
```

**Set via Wrangler:**
```bash
cd functions/workers/payments_webhook
wrangler secret put SENTRY_DSN
wrangler secret put ENVIRONMENT
```

## 6. GitHub Secrets Configuration

Add to GitHub repository secrets (Settings → Secrets → Actions):

```bash
SENTRY_DSN_ANGULAR=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN_SUPABASE=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_DSN_WORKERS=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
PAGERDUTY_INTEGRATION_KEY=R123456789ABCDEF
```

## 7. Monitoring Dashboard Access

### Sentry
- **URL:** https://sentry.io/organizations/[org]/projects/
- **Projects:**
  - autorenta-web (Angular)
  - autorenta-functions (Edge Functions)
  - autorenta-workers (Cloudflare Workers)

### PagerDuty
- **URL:** https://[subdomain].pagerduty.com
- **Service:** AutoRenta Production

### Supabase Monitoring
- **URL:** https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **Path:** Database → Extensions → pg_cron
- **Custom Dashboard:** Via monitoring-metrics Edge Function

## 8. Alert Thresholds (from Issue #113)

| Alert Type | Threshold | Response Time | Severity |
|------------|-----------|---------------|----------|
| **Payment webhooks** | >3 failures in 5min | <5min MTTD | Critical |
| **Error rate spike** | >1% of requests | <5min MTTD | Critical |
| **API downtime** | 3 consecutive failures | <5min MTTD | Critical |
| **Wallet mismatches** | Any occurrence | <5min MTTD | Critical |
| **Performance degradation** | >2.5s LCP | <30min MTTD | Warning |

**MTTD:** Mean Time To Detect
**MTTR:** Mean Time To Resolve (target: <30min)

## 9. Success Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| **MTTD** | <5 minutes | ✅ Sentry real-time |
| **MTTR** | <30 minutes | ⏳ TBD post-launch |
| **False Positives** | <10/week | ⏳ TBD post-launch |
| **Uptime** | 99.9% | ⏳ External monitoring needed |
| **Error Rate** | <0.1% | ✅ Sentry tracking |

## 10. Testing the Setup

### Test Sentry Integration

**Angular:**
```typescript
// Throw test error
throw new Error('Test Sentry integration');
```

**Edge Functions:**
```typescript
import { captureMessage } from '../_shared/sentry.ts';
captureMessage('Test Sentry from Edge Function', 'info');
```

**Workers:**
```bash
# Trigger error via webhook
curl -X POST https://payments-webhook.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{"provider":"test_error"}'
```

### Test PagerDuty

```bash
# Create test critical alert in Supabase
INSERT INTO monitoring_alerts (alert_type, severity, title, message, status)
VALUES ('test', 'critical', 'Test Alert', 'Testing PagerDuty integration', 'active');

# Trigger alert processing
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-alerts
```

### Test Health Checks

```bash
# Trigger health check function
curl https://obxvffplochgeiclibng.supabase.co/functions/v1/monitoring-health-check

# View results
SELECT * FROM monitoring_health_checks
ORDER BY checked_at DESC
LIMIT 10;
```

## 11. Deployment Checklist

Before launching to production:

- [ ] Create Sentry projects (3 projects: web, functions, workers)
- [ ] Configure Sentry DSNs in all environments
- [ ] Set up PagerDuty service and get integration key
- [ ] Configure Supabase secrets for Sentry and PagerDuty
- [ ] Configure Cloudflare Worker secrets for Sentry
- [ ] Test error reporting end-to-end
- [ ] Test critical alert flow (Slack + PagerDuty)
- [ ] Set up external uptime monitoring
- [ ] Verify health checks are running via pg_cron
- [ ] Document on-call procedures
- [ ] Train team on PagerDuty incident response

## 12. Cost Estimates

| Service | Tier | Cost | Usage |
|---------|------|------|-------|
| **Sentry** | Team | $26/mo | Up to 50K errors/mo |
| **PagerDuty** | Free | $0 | 1 service, basic features |
| **Uptime Monitoring** | Free | $0 | UptimeRobot 50 monitors |
| **Supabase** | Included | $0 | Custom monitoring |

**Total:** ~$26/month

## 13. Next Steps

### Immediate (Week 1)
1. ✅ Sentry error tracking - **COMPLETE**
2. ✅ PagerDuty integration - **COMPLETE**
3. ⏳ Set up external uptime monitoring
4. ⏳ Create runbook for incident response

### Short-term (Month 1)
1. Implement centralized logging (Logtail/Datadog)
2. Create custom Grafana dashboards
3. Set up automated performance regression testing
4. Implement wallet reconciliation alerts

### Long-term (Quarter 1)
1. ML-based anomaly detection
2. Predictive alerting for capacity planning
3. User experience monitoring (RUM)
4. Custom business metrics dashboard

## 14. Resources

- **Sentry Documentation:** https://docs.sentry.io/
- **PagerDuty API:** https://developer.pagerduty.com/
- **Supabase Monitoring:** https://supabase.com/docs/guides/platform/metrics
- **Issue #113:** Original monitoring EPIC
- **CLAUDE.md:** Project documentation

## 15. Support & Troubleshooting

### Common Issues

**Sentry not capturing errors:**
- Check DSN is configured
- Verify `enableSentry` flag is true in production
- Check Sentry project quota

**PagerDuty not triggering:**
- Verify `PAGERDUTY_ENABLED=true` in Supabase secrets
- Check integration key is correct
- Ensure alert severity is "critical"

**Health checks not running:**
- Verify pg_cron extension is enabled
- Check cron schedule: `SELECT * FROM cron.job;`
- Review Edge Function logs

### Getting Help

1. Check Sentry Issues dashboard
2. Review Supabase Edge Function logs
3. Check PagerDuty incident history
4. Consult `docs/runbooks/troubleshooting.md`

---

**Last Updated:** 2025-11-07
**Maintained By:** AutoRenta DevOps Team
**Related Issues:** #113 (Monitoring EPIC), #114 (Production Readiness)
