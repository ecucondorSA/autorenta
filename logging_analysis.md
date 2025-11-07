# Logging Patterns Analysis - AutoRenta Codebase

## Executive Summary

The codebase currently has **centralized logger implementations already in place** for Edge Functions and Workers, with a basic Angular logger. However, there are **inconsistent usage patterns** with many direct `console.*` calls still present across all services.

---

## 1. Console Statement Count by Service Type

### Edge Functions (supabase/functions/)
- **Total console statements: 233+** occurrences across 20 files
- **Key files with console usage:**
  - `mercadopago-webhook/index.ts`: 51 statements
  - `mercadopago-oauth-callback/index.ts`: 27 statements
  - `mercadopago-create-booking-preference/index.ts`: 20 statements
  - `mercadopago-poll-pending-payments/index.ts`: 17 statements
  - `_shared/sentry.ts`: 4 statements
  - Other payment functions: 7-15 statements each

**Pattern observed:** Mixture of raw `console.log/warn/error` and some use of `createChildLogger()`

### Cloudflare Workers (functions/workers/)
- **Total console statements: 610+** occurrences (including compiled code)
- **Source files with console usage:**
  - `payments_webhook/src/index.ts`: 19 statements
  - `payments_webhook/src/sentry.ts`: 6 statements
  - `logger.ts`: 7 statements (internal logging utility)
  - `doc-verifier/src/index.ts`: 20 statements
  - `ai-car-generator/src/index.ts`: 10 statements

**Pattern observed:** Mostly raw `console.log/error/warn` calls, with some Sentry integration

### Angular Frontend (apps/web/src/)
- **Total console statements: 92+** occurrences across 20 files
- **Key files with console usage:**
  - Various component files: 1-10 statements each
  - `main.ts`: 3 statements (Sentry initialization)
  - `sentry.config.ts`: 3 statements
  - `car-availability.service.ts`: 8 statements (with "[CarAvailability]" prefix pattern)
  - Component files: Scattered error logging

**Pattern observed:** Inconsistent - some components use Sentry, others use raw console calls

---

## 2. Existing Logger Implementations

### Edge Functions Logger
**Location:** `/home/user/autorenta/supabase/functions/_shared/logger.ts`

**Features:**
- Structured JSON logging for production
- Human-readable logging for development
- Log levels: DEBUG, INFO, WARN, ERROR
- Automatic sensitive data sanitization (20+ sensitive keys)
- Trace ID support for request correlation
- Child logger support with context
- ISO 8601 timestamps
- Format: `req-{timestamp}-{random}` for trace IDs

**Key Functions:**
- `logger` - default instance
- `withTraceId(traceId?)` - logger with trace ID
- `fromRequest(request)` - extracts trace ID from headers
- `createChildLogger(context)` - fixed context logger
- `generateTraceId()` - generates new trace ID
- `extractTraceId(headers)` - extracts from X-Trace-Id, X-Request-Id, X-Correlation-Id

**Sensitive Keys Redacted:**
- password, token, access_token, refresh_token, secret, api_key, apiKey
- authorization, creditCard, cvv, ssn
- mp_access_token, mp_refresh_token, mercadopago_access_token

### Workers Logger
**Location:** `/home/user/autorenta/functions/workers/logger.ts`

**Features:**
- Nearly identical to Edge Functions logger
- Structured JSON logging for production
- Log levels: DEBUG, INFO, WARN, ERROR
- Trace ID support with header extraction
- Automatic sensitive data sanitization
- Child logger pattern

**Key Functions:**
- `logger` - default instance
- `withTraceId(traceId?, workerName?)` - with worker name support
- `fromRequest(request, workerName?)` - enhanced with worker identification
- Similar sanitization capabilities

### Angular LoggerService
**Location:** `/home/user/autorenta/apps/web/src/app/core/services/logger.service.ts`

**Features:**
- Trace ID support with generation
- Sensitive data sanitization (34+ fields)
- Sentry integration with capture context
- Five log levels: debug, info, warn, error, critical
- Action and performance logging
- ChildLogger pattern with fixed context
- Human-readable console output in dev, Sentry in prod

**Log Methods:**
- `debug(message, context?, data?)` - dev only
- `info(message, context?, data?)` - dev only
- `warn(message, context?, error?)` - prod: Sentry
- `error(message, context?, error?)` - always Sentry
- `critical(message, context?, error?)` - highest priority, Sentry
- `logAction(action, metadata?)` - user behavior tracking
- `logPerformance(operation, durationMs, metadata?)` - slow operation detection

**Sensitive Fields Redacted:**
- password, token, access_token, refresh_token, secret, api_key, apiKey
- authorization, creditCard, credit_card, cvv, ssn
- mp_access_token_encrypted, mp_refresh_token_encrypted, mercadopago_token
- encryptionKey, encryption_key

### Sentry Integration (3 implementations)
**Edge Functions:** `/home/user/autorenta/supabase/functions/_shared/sentry.ts`
**Workers:** `/home/user/autorenta/functions/workers/payments_webhook/src/sentry.ts`
**Angular:** `/home/user/autorenta/apps/web/src/app/core/config/sentry.config.ts`

**Features:**
- Environment-based initialization
- Automatic sensitive data filtering
- Transaction tracking for performance
- Breadcrumb tracking for debugging
- User context support

---

## 3. Current Logging Patterns

### Structured vs Unstructured

**Structured Logging (Implemented):**
- JSON output in production across all three logger implementations
- Consistent field structure: level, timestamp, service, function/worker, trace_id, message, context, data
- Ready for log aggregation systems

**Unstructured Logging (Current Reality):**
- Direct `console.log/warn/error` calls without structure
- Inconsistent message formats
- Some files use "[Service]" prefix pattern (e.g., "[CarAvailability]")
- Most logging lacks correlation context

### Example Patterns Found

**Edge Functions:**
```typescript
// Raw console (not using logger)
console.log('Webhook validation:', { ... });
console.error('HMAC validation FAILED', { ... });
console.warn('⚠️ Unauthorized IP attempt:', { ... });

// Using logger (good pattern)
const log = createChildLogger('MercadoPagoWebhook');
log.info('Payment processed', { paymentId: '123' });
```

**Workers:**
```typescript
// Mostly raw console with some structure
console.log('Processing payment...', { paymentId });
console.error('Payment failed:', error);
```

**Angular:**
```typescript
// Inconsistent - some raw console
console.error('[CarAvailability] Error checking availability:', error);

// Some using LoggerService
this.logger.error('Operation failed', 'ServiceName', error);

// Some using Sentry directly
Sentry.captureException(error);
```

---

## 4. Trace ID & Correlation ID Implementations

### Current Implementation Status

**Edge Functions Logger:**
- Trace ID format: `req-{timestamp}-{random}`
- Header extraction from: X-Trace-Id, X-Request-Id, X-Correlation-Id
- Generation: `generateTraceId()` function
- Extraction: `extractTraceId(headers)` function
- Included in all log entries with field `trace_id`

**Workers Logger:**
- Same trace ID format and generation as Edge Functions
- Same header extraction logic
- Included in log entries

**Angular LoggerService:**
- Trace ID format: Same `req-{timestamp}-{random}`
- Manual generation: `generateTraceId()`
- Manual setting: `setTraceId(traceId)`
- Not automatically propagated in HTTP requests (opportunity for improvement)

### Missing: Request Correlation Chain
- **Not propagated** in HTTP headers between frontend and backend
- **Not attached** to Supabase calls
- **No mechanism** to pass correlation IDs from browser → Edge Functions → Workers

---

## 5. Summary Statistics

| Service Type | Files | Total Statements | Logger Util | Sentry | Pattern |
|---|---|---|---|---|---|
| Edge Functions | 45+ | 233+ | ✅ Full | ✅ Yes | Mixed (50% structured, 50% raw) |
| Workers | 13 | 610+ (with compiled) | ✅ Full | ✅ Yes | Mostly unstructured raw console |
| Angular | 100+ | 92+ | ✅ Full | ✅ Yes | Inconsistent usage |
| **Total** | **158+** | **935+** | **3 impls** | **3 impls** | **Needs standardization** |

---

## 6. Recommendations for Centralized Logging Implementation

### High Priority
1. **Standardize usage across all services**
   - Enforce logger utility usage in all new code
   - Migrate existing raw console calls to logger utilities
   - Create linting rules to flag direct console usage

2. **Request correlation propagation**
   - Propagate trace ID from browser → Edge Function requests (header: X-Trace-Id)
   - Include trace ID in Supabase RLS context
   - Include trace ID in Worker response headers

3. **Unified log schema**
   - Align Angular log output format with backend (same field names)
   - Ensure all logs contain: timestamp, level, service, trace_id, context, message, data
   - Standard error field format (name, message, stack)

4. **Production filtering**
   - Currently: DEBUG/INFO filtered in production ✅
   - Verify: Only WARN/ERROR/CRITICAL sent to Sentry across all services
   - Add: Log level environment variable for override

### Medium Priority
5. **Enhanced context support**
   - Add user_id to all log entries in production
   - Add booking_id/payment_id to relevant logs
   - Support metadata fields for custom dimensions

6. **Performance monitoring**
   - Extend Angular `logPerformance()` to Edge Functions/Workers
   - Track and alert on slow operations (>1000ms threshold)
   - Measure function execution time

7. **Breadcrumb tracking**
   - Implement breadcrumb pattern in Edge Functions (currently in Workers/Angular)
   - Use for debugging complex flows (payment processing, booking lifecycle)

### Lower Priority
8. **Log aggregation setup**
   - Document Cloudflare Logpush configuration
   - Set up Sentry project integration
   - Define retention policies

---

## 7. File Locations Reference

**Logger Utilities:**
- `/home/user/autorenta/supabase/functions/_shared/logger.ts`
- `/home/user/autorenta/functions/workers/logger.ts`
- `/home/user/autorenta/apps/web/src/app/core/services/logger.service.ts`

**Sentry Integrations:**
- `/home/user/autorenta/supabase/functions/_shared/sentry.ts`
- `/home/user/autorenta/functions/workers/payments_webhook/src/sentry.ts`
- `/home/user/autorenta/apps/web/src/app/core/config/sentry.config.ts`

**Key Functions with Logging:**
- `/home/user/autorenta/supabase/functions/mercadopago-webhook/index.ts` (51 statements - good for refactoring)
- `/home/user/autorenta/functions/workers/payments_webhook/src/index.ts` (19 statements)
- `/home/user/autorenta/apps/web/src/app/core/services/car-availability.service.ts` (8 statements with prefix pattern)

---

## Conclusion

AutoRenta has **excellent foundational logging infrastructure** in place with:
- Three complete logger implementations (Edge Functions, Workers, Angular)
- Sentry error tracking on all tiers
- Trace ID and correlation ID support
- Sensitive data sanitization

However, the **main gap is inconsistent adoption**. Many files still use raw console calls instead of the logger utilities. The priority should be:

1. Create a migration plan to standardize logger usage
2. Implement request correlation propagation (X-Trace-Id header chain)
3. Enforce logger usage through linting/code reviews
4. Document best practices and provide examples

This will maximize the ROI of the existing infrastructure and enable comprehensive observability across the entire stack.
