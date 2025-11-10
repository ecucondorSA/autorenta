# Sentry Integration Guide

**Status**: ✅ Implemented (Angular), 🟡 Partial (Edge Functions), 🔴 Pending (Workers)
**Date**: 2025-11-07
**Issue**: #113-1 (Error Tracking)

---

## Overview

This guide covers the complete Sentry integration for all AutoRenta services:
- ✅ Angular Frontend (COMPLETED)
- 🟡 Supabase Edge Functions (UTILITY CREATED)
- 🔴 Cloudflare Workers (PENDING)

---

## 1. Angular Frontend Integration

### ✅ Status: COMPLETED

### Files Modified:
- `apps/web/src/environments/environment.base.ts` - Added Sentry config
- `apps/web/src/environments/environment.ts` - Added production DSN
- `apps/web/src/app/core/services/sentry.service.ts` - NEW: Sentry initialization
- `apps/web/src/app/core/services/logger.service.ts` - Updated to use Sentry
- `apps/web/src/app/app.config.ts` - Added Sentry Error Handler
- `apps/web/src/main.ts` - Initialize Sentry on bootstrap

### Configuration:

#### Environment Variables:
```bash
# Production (Cloudflare Pages)
NG_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NG_APP_SENTRY_ENVIRONMENT=production
```

#### Features Enabled:
- ✅ Global error handler
- ✅ Performance monitoring (10% sampling)
- ✅ Session replay (10% sampling, 100% on errors)
- ✅ Breadcrumbs for debugging
- ✅ Sensitive data filtering
- ✅ Source maps support

### Usage:

#### Automatic Error Capture:
```typescript
// All unhandled errors are automatically captured
throw new Error('This will be sent to Sentry');
```

#### Manual Error Capture:
```typescript
import { LoggerService } from '@core/services/logger.service';

constructor(private logger: LoggerService) {}

try {
  // Your code
} catch (error) {
  this.logger.error('Operation failed', 'ServiceName', error);
}
```

#### Performance Monitoring:
```typescript
import { LoggerService } from '@core/services/logger.service';

constructor(private logger: LoggerService) {}

const start = performance.now();
// ... operation
const duration = performance.now() - start;
this.logger.logPerformance('operationName', duration);
```

---

## 2. Supabase Edge Functions Integration

### 🟡 Status: UTILITY CREATED (needs per-function integration)

### Files Created:
- `supabase/functions/_shared/sentry.ts` - Sentry utility for Edge Functions

### Configuration:

#### Environment Variables (Supabase):
```bash
# Set via Supabase CLI or Dashboard
supabase secrets set SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
supabase secrets set SENTRY_ENVIRONMENT="production"
supabase secrets set SENTRY_TRACES_SAMPLE_RATE="0.1"
```

### Usage:

#### Option 1: Wrap Handler (Recommended):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withSentry } from '../_shared/sentry.ts';

serve(withSentry('function-name', async (req: Request) => {
  // Your function logic
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}));
```

#### Option 2: Manual Integration:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { initSentry, captureError, startTransaction } from '../_shared/sentry.ts';

initSentry('function-name');

serve(async (req: Request) => {
  const transaction = startTransaction('function-name');

  try {
    // Your function logic
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    captureError(error, {
      tags: { function: 'function-name' },
      level: 'error',
    });
    throw error;
  } finally {
    transaction?.finish();
  }
});
```

### Priority Functions to Update:

**P0 (Critical)**:
1. `mercadopago-webhook` - Payment processing
2. `mercadopago-create-preference` - Payment creation
3. `wallet-confirm-deposit` - Wallet operations
4. `wallet-split-payment` - Payment distribution

**P1 (High)**:
5. `monitoring-health-check` - Health checks
6. `monitoring-alerts` - Alert processing
7. `process-withdrawal` - Withdrawal processing
8. `paypal-create-order` - PayPal integration

**P2 (Medium)**:
9. All other Edge Functions

---

## 3. Cloudflare Workers Integration

### 🔴 Status: PENDING

### Workers to Update:
1. `payments_webhook` (P0)
2. `ai-car-generator` (P1)
3. `doc-verifier` (P1)
4. `mercadopago-oauth-redirect` (P2)

### Implementation Plan:

#### Install Sentry:
```bash
cd functions/workers/payments_webhook
npm install --save @sentry/node @sentry/tracing
```

#### Configuration:
```typescript
import * as Sentry from '@sentry/node';
import { Toucan } from 'toucan-js'; // Cloudflare-specific Sentry client

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const sentry = new Toucan({
      dsn: env.SENTRY_DSN,
      context: ctx,
      request,
      environment: env.ENVIRONMENT || 'production',
      tracesSampleRate: 0.1,
    });

    try {
      // Your worker logic
      return new Response('OK');
    } catch (error) {
      sentry.captureException(error);
      throw error;
    }
  }
};
```

#### Environment Variables (Cloudflare):
```bash
# Set via wrangler or Cloudflare Dashboard
wrangler secret put SENTRY_DSN
# Enter: https://your-sentry-dsn@sentry.io/project-id
```

---

## 4. Sentry Project Setup

### Create Sentry Project:

1. Go to https://sentry.io/
2. Create new project: "AutoRenta"
3. Select platform: "Angular" (create separate projects for different platforms if needed)
4. Get DSN from Settings > Client Keys (DSN)

### Recommended Project Structure:

#### Option A: Single Project (Recommended for MVP):
- **Project**: "AutoRenta"
- **Environments**: production, development
- **Tags**: Use tags to filter by service (web, edge-function, worker)

#### Option B: Multiple Projects (for scale):
- **Project 1**: "AutoRenta Web" (Angular)
- **Project 2**: "AutoRenta Functions" (Edge Functions)
- **Project 3**: "AutoRenta Workers" (Cloudflare Workers)

### Configure Alerts:

1. **Critical Errors**:
   - Condition: Error rate >1% OR >10 errors in 5 minutes
   - Action: Send to PagerDuty + Slack
   - Priority: P0

2. **Performance Degradation**:
   - Condition: p95 latency >1000ms for 5 minutes
   - Action: Send to Slack
   - Priority: P1

3. **Error Spikes**:
   - Condition: >50 errors in 10 minutes
   - Action: Send to Slack + Email
   - Priority: P1

---

## 5. Testing

### Test Angular Integration:

```typescript
// In browser console
throw new Error('Test Sentry integration');
```

### Test Edge Function:

```bash
# Trigger an error in Edge Function
curl -X POST "https://obxvffplochgeiclibng.supabase.co/functions/v1/test-function" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"trigger_error": true}'
```

### Test Cloudflare Worker:

```bash
# Trigger an error in Worker
curl -X POST "https://your-worker.autorentar.workers.dev/test-error"
```

### Verify in Sentry:

1. Go to Sentry Dashboard
2. Navigate to Issues
3. Check for test errors
4. Verify context (environment, tags, breadcrumbs)

---

## 6. Best Practices

### Sensitive Data:
- ✅ All sensitive data is filtered before sending to Sentry
- ✅ Tokens, passwords, API keys are redacted
- ✅ PII is masked in session replays

### Performance:
- Use sampling (10% for production)
- Enable session replay only on errors
- Set breadcrumb limits

### Error Grouping:
- Use consistent error messages
- Include context in error messages
- Use custom fingerprinting for similar errors

### Release Tracking:
- Tag releases with version numbers
- Deploy source maps for Angular
- Track commits per release

---

## 7. Monitoring & Alerts

### Key Metrics to Track:

1. **Error Rate**: Errors per minute/hour
2. **Crash-Free Rate**: % of sessions without crashes
3. **Response Time**: p50, p95, p99 latencies
4. **Apdex Score**: User satisfaction metric
5. **Custom Metrics**: Business-specific metrics

### Recommended Dashboards:

1. **Executive Dashboard**:
   - Error rate (24h)
   - Crash-free rate (7d)
   - Top errors by frequency
   - Top errors by user impact

2. **Engineering Dashboard**:
   - Errors by service
   - Performance by endpoint
   - Release comparison
   - Error trends

---

## 8. Cost Optimization

### Free Tier Limits:
- 5,000 errors/month
- 10,000 performance units/month

### Optimization Tips:
1. Use sampling (10-20% for production)
2. Filter out noisy errors (`ignoreErrors`)
3. Limit breadcrumbs
4. Use session replay sparingly
5. Set proper rate limits

---

## 9. Next Steps

### Immediate (This Week):
- [ ] Get Sentry DSN and configure production environment
- [ ] Test Angular integration in production
- [ ] Update critical Edge Functions (mercadopago-webhook, wallet functions)
- [ ] Update critical Cloudflare Workers (payments_webhook)

### Short-term (Next Week):
- [ ] Configure Sentry alerts
- [ ] Set up PagerDuty integration
- [ ] Update remaining Edge Functions
- [ ] Create Sentry dashboards

### Long-term (Next Month):
- [ ] Implement custom metrics
- [ ] Set up release tracking
- [ ] Configure source maps for all services
- [ ] Train team on Sentry usage

---

## 10. Troubleshooting

### Sentry Not Capturing Errors:

1. Check DSN is configured: `console.log(environment.sentryDsn)`
2. Verify Sentry is initialized: Check browser console for "Sentry initialized"
3. Check network tab for Sentry requests
4. Verify error isn't in `ignoreErrors` list

### High Error Volume:

1. Check for error loops
2. Verify sampling rate
3. Add problematic errors to `ignoreErrors`
4. Investigate root cause

### Missing Context:

1. Verify user context is set
2. Check breadcrumbs are enabled
3. Add custom context with `Sentry.setContext()`
4. Enable session replay

---

## 11. References

- **Sentry Docs**: https://docs.sentry.io/
- **Angular Integration**: https://docs.sentry.io/platforms/javascript/guides/angular/
- **Deno Integration**: https://docs.sentry.io/platforms/javascript/guides/deno/
- **Cloudflare Workers**: https://docs.sentry.io/platforms/javascript/guides/cloudflare-workers/

---

**Last Updated**: 2025-11-07
**Issue**: #113-1
**Status**: 🟡 Partial Implementation
