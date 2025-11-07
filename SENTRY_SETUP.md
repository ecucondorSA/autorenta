# Sentry Error Tracking Setup Guide

Complete setup guide for Sentry error tracking across all AutoRenta services.

## Overview

AutoRenta uses Sentry for comprehensive error tracking and performance monitoring across three layers:

1. **Frontend (Angular)** - Browser errors and performance monitoring
2. **Backend (Supabase Edge Functions)** - Deno runtime errors
3. **Workers (Cloudflare)** - Worker errors and webhook failures

## Quick Start

### 1. Create Sentry Account and Project

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new organization: `autorenta`
3. Create projects:
   - `autorenta-web` (Angular frontend)
   - `autorenta-functions` (Supabase Edge Functions)
   - `autorenta-workers` (Cloudflare Workers)

### 2. Get DSN and Tokens

For each project:
- **DSN**: Project Settings → Client Keys (DSN)
- **Auth Token**: User Settings → Auth Tokens → Create New Token
  - Scopes needed: `project:releases`, `project:write`, `org:read`

## Environment Variables Configuration

### Angular Frontend (Cloudflare Pages)

Configure in Cloudflare Pages dashboard (Settings → Environment Variables):

```bash
# Sentry Configuration
NG_APP_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
NG_APP_SENTRY_ENVIRONMENT=production
```

For development (`.env.development.local`):

```bash
# Sentry Configuration (optional for development)
NG_APP_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
NG_APP_SENTRY_ENVIRONMENT=development
```

### Supabase Edge Functions

Configure via Supabase CLI or Dashboard (Project Settings → Edge Functions → Secrets):

```bash
# Set via CLI
supabase secrets set SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
supabase secrets set ENVIRONMENT=production

# Or via Dashboard
# Navigate to: Project Settings → Edge Functions → Add Secret
```

### Cloudflare Workers

Configure via wrangler CLI or Cloudflare Dashboard:

```bash
# Set via wrangler CLI
cd functions/workers/payments_webhook
wrangler secret put SENTRY_DSN
wrangler secret put ENVIRONMENT

# Or via Cloudflare Dashboard
# Navigate to: Workers & Pages → [Worker] → Settings → Variables → Add Variable
```

## GitHub Secrets Configuration

For CI/CD pipeline (Settings → Secrets and variables → Actions):

```bash
# Required for source map uploads
SENTRY_AUTH_TOKEN=sntrys_[your-auth-token]

# Optional (defaults are set)
SENTRY_ORG=autorenta
SENTRY_PROJECT=autorenta-web
```

## Features Enabled

### Frontend (Angular)

- ✅ Error capture (100%)
- ✅ Performance monitoring (10% sample rate)
- ✅ Session replay (10% of sessions, 100% of errors)
- ✅ Source map uploads (hidden in production)
- ✅ User context tracking
- ✅ Breadcrumbs (navigation, http, console)

**Configuration**: `apps/web/src/main.ts:13-47`

### Backend (Supabase Edge Functions)

- ✅ Error capture (100%)
- ✅ Performance monitoring (10% sample rate)
- ✅ Breadcrumbs (console, fetch)
- ✅ User context tracking
- ✅ Sensitive data sanitization

**Shared Utility**: `supabase/functions/_shared/sentry.ts`

**Usage Example**:
```typescript
import { initSentry, captureError, addBreadcrumb } from '../_shared/sentry.ts';

// Initialize at function start
initSentry('my-function-name');

// Capture errors
try {
  // ... your code
} catch (error) {
  captureError(error, {
    context: { userId: '123' },
    tags: { action: 'process-payment' }
  });
  throw error;
}

// Add breadcrumbs for debugging
addBreadcrumb('Processing payment', 'payment', { amount: 1000 });
```

### Workers (Cloudflare)

- ✅ Error capture (100%)
- ✅ Performance monitoring (10% sample rate)
- ✅ Request/response breadcrumbs
- ✅ Sensitive data sanitization

**Shared Utility**: `functions/workers/payments_webhook/src/sentry.ts`

**Usage Example**:
```typescript
import { withSentry, captureError } from './sentry';

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withSentry(request, env, ctx, async () => {
      // Your handler code
      try {
        // ... logic
      } catch (error) {
        captureError(error, { tags: { action: 'webhook' } });
        throw error;
      }
    });
  },
};
```

## Source Maps

### Angular

Source maps are automatically uploaded during CI/CD:

1. **Build**: Source maps generated with `hidden: true` (not accessible to users)
2. **Upload**: `apps/web/scripts/upload-sourcemaps.sh` uploads to Sentry
3. **CI/CD**: `.github/workflows/build-and-deploy.yml:40-47` runs upload step

**Manual Upload**:
```bash
cd apps/web
npm run build
SENTRY_AUTH_TOKEN=your-token npm run sentry:sourcemaps
```

### Cloudflare Workers

Workers use inline source maps (no upload needed).

### Supabase Edge Functions

Deno runtime provides stack traces directly (no source maps needed).

## Verification

### Test Error Capture

#### Angular
```typescript
// In browser console or component
throw new Error('Test Sentry error capture');
```

#### Edge Function
```typescript
import { captureMessage } from '../_shared/sentry.ts';

initSentry('test-function');
captureMessage('Test message from Edge Function', 'info');
```

#### Cloudflare Worker
```bash
# Send test request that triggers error
curl -X POST https://your-worker.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

### Check Sentry Dashboard

1. Go to [sentry.io](https://sentry.io)
2. Select your project
3. Check **Issues** tab for captured errors
4. Check **Performance** tab for transactions
5. Check **Replays** tab for session replays (Angular only)

## Success Metrics

✅ **100% error capture rate** - All uncaught errors sent to Sentry
✅ **<5 minutes detection time** - Critical errors detected within 5 minutes
✅ **100% stack trace readability** - Source maps working correctly
✅ **<1% false positive rate** - Minimal noise from expected errors

## Cost Considerations

### Free Tier (Recommended for MVP)
- **5,000 errors/month** - Sufficient for MVP stage
- **10,000 performance units/month**
- **500 replay sessions/month**
- **90-day retention**

### Team Plan ($26/month if exceeded)
- **50,000 errors/month**
- **100,000 performance units/month**
- **5,000 replay sessions/month**
- **90-day retention**

**Monitor usage**: Sentry Dashboard → Usage & Billing

## Troubleshooting

### Source Maps Not Working

**Symptom**: Stack traces show minified code

**Solutions**:
1. Check SENTRY_AUTH_TOKEN is set in GitHub Secrets
2. Verify source maps uploaded: Check Sentry → Releases → [Release] → Artifacts
3. Check upload script logs in CI/CD workflow
4. Verify `sourceMap: { hidden: true }` in `angular.json`

### No Errors Captured

**Symptom**: Errors not appearing in Sentry

**Solutions**:
1. Check DSN is correctly set:
   - Angular: `NG_APP_SENTRY_DSN` in Cloudflare Pages
   - Edge Functions: `SENTRY_DSN` in Supabase Secrets
   - Workers: `SENTRY_DSN` in Cloudflare Worker Secrets
2. Check console logs for "Sentry initialized" message
3. Verify no ad blockers blocking Sentry requests
4. Check network tab for Sentry API calls

### Performance Impact

**Symptom**: Concerns about Sentry overhead

**Info**:
- Error capture: <1ms overhead
- Performance monitoring: ~2-5ms overhead (10% sampled)
- Session replay: ~10-20kb/min bandwidth (10% sampled)

**Optimization**:
- Reduce `tracesSampleRate` to 0.05 (5%)
- Reduce `replaysSessionSampleRate` to 0.05 (5%)
- Keep `replaysOnErrorSampleRate` at 1.0 (100% errors)

## Security Best Practices

### Sensitive Data Sanitization

All Sentry integrations automatically sanitize:
- Passwords
- Tokens (access_token, refresh_token, etc.)
- API keys
- Credit card data
- SSN
- Authorization headers

**Implementation**:
- Angular: `main.ts:36-42` (beforeSend hook)
- Edge Functions: `_shared/sentry.ts:104-115` (beforeSend hook)
- Workers: `payments_webhook/src/sentry.ts:96-102` (beforeSend hook)

### User Privacy

- User IDs are anonymized (hashed UUID)
- Email addresses not captured by default
- PII (Personally Identifiable Information) redacted

## Monitoring & Alerts

### Recommended Alerts

1. **Error Spike**: >50 errors in 15 minutes
2. **Critical Error**: Any error in checkout/payment flow
3. **Performance Degradation**: P95 latency >2 seconds
4. **High Memory Usage**: >500MB in Edge Functions

**Setup**: Sentry → Alerts → Create Alert Rule

### Slack Integration (Optional)

1. Go to Sentry → Settings → Integrations
2. Install Slack integration
3. Configure alert routing to `#engineering-alerts` channel

## Support

For issues or questions:
1. Check [Sentry Docs](https://docs.sentry.io)
2. Review `CLAUDE.md` troubleshooting section
3. Contact @engineering team in Slack

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
**Status**: ✅ Production Ready
