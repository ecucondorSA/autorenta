# Sentry Error Tracking & Performance Monitoring

Complete guide for Sentry setup in AutoRenta (Issues #118 and #122).

## Overview

AutoRenta uses Sentry for:
- **Error Tracking**: Capture and monitor application errors
- **Performance Monitoring (APM)**: Track Core Web Vitals, API response times, and slow operations
- **Real User Monitoring**: Monitor actual user experience metrics

## Implementation

### Frontend (Angular)

#### Packages Installed
```bash
npm install @sentry/angular @sentry/browser
```

#### Configuration Files

1. **Environment Configuration** (`src/environments/environment.base.ts`)
   - Added `sentryDsn`, `sentryEnvironment`, `sentryTracesSampleRate`
   - Production: DSN configured via `NG_APP_SENTRY_DSN`
   - Development: Empty DSN (disabled by default)

2. **Sentry Initialization** (`src/app/core/config/sentry.config.ts`)
   - Browser tracing integration
   - HTTP request instrumentation
   - Core Web Vitals tracking (LCP, FID, CLS)
   - Console error capture
   - Performance profiling (10% sample rate)

3. **Main Entry Point** (`src/main.ts`)
   - Sentry initialized BEFORE Angular bootstrapping
   - Ensures all errors are captured from app start

4. **Error Handler** (`src/app/app.config.ts`)
   - `Sentry.createErrorHandler()` catches uncaught exceptions
   - `Sentry.TraceService` tracks Angular Router navigation

5. **Logger Service** (`src/app/core/services/logger.service.ts`)
   - Updated to use Sentry SDK
   - Automatically sends errors/warnings to Sentry in production
   - Sanitizes sensitive data (tokens, passwords, etc.)

6. **Performance Monitoring** (`src/app/core/services/performance-monitoring.service.ts`)
   - Sends Core Web Vitals to Sentry
   - Tracks slow operations (>100ms)
   - Reports performance degradations

#### Source Maps

Production builds now include source maps for better error debugging:
```json
// angular.json
{
  "configurations": {
    "production": {
      "sourceMap": {
        "scripts": true,
        "styles": true,
        "vendor": true
      }
    }
  }
}
```

### Backend (Supabase Edge Functions - Deno)

#### Custom Sentry Integration

Created lightweight Sentry integration for Deno (`supabase/functions/_shared/sentry.ts`):

**Features:**
- Error capture with stack traces
- Message logging (info, warning, error, fatal)
- Performance measurement for slow operations
- No external dependencies (uses native Deno APIs)

**Usage Example:**
```typescript
import { initSentry, captureError, measureOperation } from '../_shared/sentry.ts';

// Initialize Sentry for your function
initSentry({
  functionName: 'my-function',
  environment: Deno.env.get('ENVIRONMENT') || 'production',
});

// Capture errors
try {
  // Your code
} catch (error) {
  await captureError(error, {
    tags: { function: 'my-function' },
    extra: { context: 'additional info' }
  });
  throw error;
}

// Measure operations
await measureOperation('database-query', async () => {
  // Your async operation
});
```

## Environment Variables

### Frontend (Cloudflare Pages)

Set in Cloudflare Pages dashboard → Settings → Environment Variables:

```bash
# Required for production
NG_APP_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>

# Optional
NG_APP_SENTRY_ENVIRONMENT=production  # Auto-set based on production flag
```

### Backend (Supabase Edge Functions)

Set in Supabase dashboard → Edge Functions → Secrets:

```bash
# Required for error tracking
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>

# Optional
ENVIRONMENT=production  # or staging, development
```

## Getting the Sentry DSN

1. Sign up at https://sentry.io
2. Create a new project (JavaScript/Angular for frontend, Node.js for backend)
3. Copy the DSN from Settings → Projects → [Your Project] → Client Keys (DSN)

## Features Implemented

### ✅ Error Tracking (Issue #118)

**Frontend:**
- Uncaught exceptions captured automatically
- Manual error logging via `LoggerService`
- Stack traces with source map support
- Breadcrumbs for user actions
- Sensitive data sanitization

**Backend:**
- Error capture with stack traces
- Function-specific tagging
- Performance tracking for slow operations

### ✅ Performance Monitoring (Issue #122)

**Core Web Vitals:**
- ✅ LCP (Largest Contentful Paint) - Target: <2.5s
- ✅ FID (First Input Delay) - Target: <100ms
- ✅ CLS (Cumulative Layout Shift) - Target: <0.1

**API Performance:**
- ✅ HTTP request tracing (fetch & XHR)
- ✅ Response time tracking
- ✅ Failed request monitoring (4xx, 5xx)
- ✅ 10% transaction sampling (configurable)

**Database Performance:**
- ✅ Slow operation detection (>100ms frontend, >2s backend)
- ✅ Automatic alerting for slow queries

**Edge Function Performance:**
- ✅ Cold start monitoring (via measureOperation)
- ✅ Operation duration tracking
- ✅ Performance degradation alerts

## Testing

### Development Testing

Sentry is **disabled by default** in development to reduce noise. To test:

1. Set the Sentry DSN:
   ```bash
   export NG_APP_SENTRY_DSN="https://..."
   ```

2. Enable test mode in browser console:
   ```javascript
   localStorage.setItem('sentry-test-mode', 'true');
   ```

3. Trigger a test error:
   ```javascript
   throw new Error('Test error for Sentry');
   ```

4. Check Sentry dashboard for the error

### Production Testing

1. Deploy to staging/production
2. Verify errors appear in Sentry dashboard
3. Check performance metrics are being tracked
4. Verify source maps resolve correctly

## Monitoring Dashboards

### Recommended Sentry Views

1. **Issues → All Unresolved**: Active errors needing attention
2. **Performance → Web Vitals**: Core Web Vitals dashboard
3. **Performance → Transactions**: API endpoint performance
4. **Performance → Trends**: P50, P95, P99 response times
5. **Alerts**: Configure alerts for:
   - Error rate spikes
   - LCP > 2.5s
   - FID > 100ms
   - CLS > 0.1
   - P95 response time > 5s

## Best Practices

### For Developers

1. **Don't log sensitive data**: LoggerService sanitizes automatically
2. **Use structured logging**: Add context to errors
   ```typescript
   this.logger.error('Payment failed', 'PaymentService', error);
   ```
3. **Add breadcrumbs**: Help debug issues
   ```typescript
   Sentry.addBreadcrumb({
     message: 'User clicked checkout',
     category: 'user-action',
     level: 'info',
   });
   ```

### For Operations

1. **Set up alerts**: Don't wait for users to report issues
2. **Review daily**: Check Sentry dashboard for new issues
3. **Triage quickly**: Assign and resolve issues promptly
4. **Track trends**: Monitor performance over time
5. **Set release tags**: Track errors by deployment

## Troubleshooting

### Sentry not capturing errors

1. Check DSN is set correctly
2. Verify DSN has correct format: `https://<key>@<org>.ingest.sentry.io/<project>`
3. Check browser console for Sentry initialization message
4. Ensure error occurred after Sentry initialization

### Source maps not working

1. Verify source maps are enabled in `angular.json`
2. Check build output includes `.map` files
3. Ensure source maps are uploaded to Sentry (future enhancement)

### Performance metrics not appearing

1. Verify `tracesSampleRate` is > 0 (default: 0.1 = 10%)
2. Check transaction limits in Sentry plan
3. Ensure performance monitoring is enabled in Sentry project settings

## Future Enhancements

- [ ] Automatic source map upload via Sentry CLI
- [ ] Release tracking with git commit SHA
- [ ] User session replay
- [ ] Custom dashboard for AutoRenta-specific metrics
- [ ] Integration with GitHub issues
- [ ] Slack alerts for critical errors

## Related Documentation

- [Sentry Angular Documentation](https://docs.sentry.io/platforms/javascript/guides/angular/)
- [Sentry Deno Documentation](https://docs.sentry.io/platforms/javascript/guides/deno/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/issues/)

## Acceptance Criteria Status

### Issue #118: Error Tracking

- ✅ Frontend: Sentry SDK installed and configured
- ✅ Backend: Custom Sentry integration for Deno
- ✅ Error Handler: Global exception handler configured
- ✅ Source Maps: Enabled for production builds
- ✅ Dashboard: Ready for verification after deployment

### Issue #122: Performance Monitoring

- ✅ Core Web Vitals: LCP, FID, CLS tracking enabled
- ✅ API Performance: HTTP instrumentation configured
- ✅ Response Times: P50, P95, P99 tracking enabled
- ✅ Slow Endpoints: >2s threshold detection
- ✅ Database Performance: Slow query detection (>100ms)
- ✅ Degradation Alerts: Ready to configure in Sentry dashboard

## Support

For questions or issues with Sentry integration:
1. Check this documentation first
2. Review Sentry logs in dashboard
3. Check browser console for errors
4. Contact DevOps team for Sentry account issues
