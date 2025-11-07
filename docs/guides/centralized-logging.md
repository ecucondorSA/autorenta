# Centralized Logging System

**Status**: ✅ Implemented (Issue #120)
**Last Updated**: 2025-11-07
**Version**: 1.0

## Overview

AutoRenta's centralized logging system provides unified, searchable, structured logs across all services with cross-service correlation via trace IDs.

### Key Features

✅ **Structured JSON Logging** - Consistent format across all services
✅ **Trace ID Correlation** - Track requests across Angular → Worker → Edge Function
✅ **Automatic PII Redaction** - 20+ sensitive fields auto-redacted
✅ **Level-based Filtering** - DEBUG/INFO filtered in production
✅ **Sentry Integration** - Errors automatically reported
✅ **ESLint Enforcement** - Raw `console.*` usage blocked

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Request Flow with Trace ID                  │
└─────────────────────────────────────────────────────────────────┘

User Browser
    │
    ├─→ [Angular App]
    │      ├─ LoggerService
    │      ├─ X-Trace-Id: req-abc123 (generated)
    │      └─ Logs → Console + Sentry
    │
    ├─→ HTTP Request (X-Trace-Id: req-abc123)
    │
    ├─→ [Cloudflare Worker]
    │      ├─ Logger (fromRequest)
    │      ├─ Extracts X-Trace-Id: req-abc123
    │      ├─ Logs → Cloudflare Logpush → R2/S3
    │      └─ Forwards request with X-Trace-Id
    │
    └─→ [Supabase Edge Function]
           ├─ Logger (fromRequest)
           ├─ Extracts X-Trace-Id: req-abc123
           └─ Logs → Supabase stdout (JSON)

All logs for this request share trace_id: "req-abc123"
```

## Log Format

All services output structured JSON logs with this schema:

```typescript
interface LogEntry {
  level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
  timestamp: string;          // ISO 8601: "2025-11-07T10:30:45.123Z"
  service: string;            // "worker" | "edge-function" | "angular"
  worker?: string;            // "payments-webhook" (Workers only)
  function?: string;          // "mercadopago-webhook" (Edge Functions only)
  trace_id?: string;          // "req-abc123-xyz"
  message: string;            // Human-readable message
  context?: string;           // Function/class name
  data?: Record<string, any>; // Structured data
  error?: {                   // Error details
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>; // Custom fields
}
```

### Example Log Entry

```json
{
  "level": "INFO",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "service": "worker",
  "worker": "payments-webhook",
  "trace_id": "req-abc123-xyz",
  "message": "Payment processed successfully",
  "context": "PaymentProcessor",
  "data": {
    "paymentId": "123456",
    "amount": 10000,
    "status": "approved"
  }
}
```

## Usage by Service

### Angular Frontend

**Logger**: `LoggerService` (`apps/web/src/app/core/services/logger.service.ts`)

#### Basic Usage

```typescript
import { inject } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';

export class MyComponent {
  private logger = inject(LoggerService);

  ngOnInit() {
    this.logger.info('Component initialized');
  }

  onError(error: Error) {
    this.logger.error('Failed to load data', 'MyComponent', error);
  }
}
```

#### Child Logger (Recommended)

```typescript
export class CarService {
  private logger = inject(LoggerService).createChildLogger('CarService');

  loadCars() {
    this.logger.info('Loading cars'); // Auto-prefixed: [CarService]
    this.logger.debug('Cache miss', { cacheKey: 'cars-all' });
  }
}
```

#### Trace ID (Automatic)

The `traceIdInterceptor` automatically adds `X-Trace-Id` header to all HTTP requests:

```typescript
// apps/web/src/app/app.config.ts
provideHttpClient(
  withInterceptors([
    traceIdInterceptor,  // ← Adds X-Trace-Id to all requests
    SupabaseAuthInterceptor,
    httpErrorInterceptor
  ])
)
```

#### Log Levels

```typescript
logger.debug('Detailed info for development');   // Hidden in production
logger.info('General information');               // Hidden in production
logger.warn('Warning - potential issue');         // Sent to Sentry
logger.error('Error occurred', error);            // Sent to Sentry
logger.critical('Critical system failure', error); // Sent to Sentry + Alert
```

### Supabase Edge Functions

**Logger**: `logger` (`supabase/functions/_shared/logger.ts`)

#### Basic Usage

```typescript
import { logger, fromRequest } from '../_shared/logger.ts';

serve(async (req) => {
  // Create logger from request (auto-extracts trace ID)
  const log = fromRequest(req);

  log.info('Request received', { path: req.url });

  try {
    const result = await processPayment();
    log.info('Payment processed', result);
    return new Response(JSON.stringify(result));
  } catch (error) {
    log.error('Payment failed', error);
    throw error;
  }
});
```

#### Child Logger

```typescript
serve(async (req) => {
  const log = fromRequest(req);

  // Create child logger for specific context
  const paymentLog = log.child('PaymentProcessor');
  paymentLog.info('Processing payment', { amount: 1000 });

  const walletLog = log.child('WalletService');
  walletLog.info('Crediting wallet', { userId: '123' });
});
```

#### Manual Trace ID

```typescript
import { logger, generateTraceId, withTraceId } from '../_shared/logger.ts';

// Generate trace ID
const traceId = generateTraceId(); // "req-abc123-xyz"

// Create logger with trace ID
const log = withTraceId(traceId);
log.info('Background job started');
```

### Cloudflare Workers

**Logger**: `logger` (`functions/workers/logger.ts`)

#### Basic Usage

```typescript
import { fromRequest } from '../../logger';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Create logger from request (auto-extracts trace ID)
    const log = fromRequest(request, 'payments-webhook');

    log.info('Webhook received', {
      method: request.method,
      url: request.url,
    });

    try {
      const result = await handleWebhook(request, log);
      log.info('Webhook processed successfully');
      return new Response(JSON.stringify(result));
    } catch (error) {
      log.error('Webhook processing failed', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
```

#### Passing Logger to Functions

```typescript
async function handleWebhook(request: Request, log: Logger) {
  log.info('Validating signature');

  if (!isValidSignature(request)) {
    log.warn('Invalid signature detected');
    throw new Error('Invalid signature');
  }

  // Create child logger for sub-tasks
  const paymentLog = log.child('PaymentProcessor');
  paymentLog.info('Processing payment');
}
```

## Trace ID Propagation

Trace IDs enable tracking a single request across all services.

### Flow Example

```typescript
// 1. Angular: Generate trace ID
// (Automatic via traceIdInterceptor)
const traceId = logger.generateTraceId(); // "req-abc123-xyz"

// 2. Angular: Add to HTTP request header
// (Automatic via traceIdInterceptor)
headers: { 'X-Trace-Id': 'req-abc123-xyz' }

// 3. Worker: Extract trace ID from request
const log = fromRequest(request, 'worker-name');
// Automatically extracts: X-Trace-Id, X-Request-Id, or X-Correlation-Id

// 4. Worker: Forward to Edge Function
const response = await fetch(edgeFunctionUrl, {
  headers: {
    'X-Trace-Id': log.getTraceId() // Pass along trace ID
  }
});

// 5. Edge Function: Extract trace ID
const log = fromRequest(req);
// All logs now have trace_id: "req-abc123-xyz"
```

### Searching by Trace ID

```bash
# Cloudflare Logpush (R2/S3)
aws s3 cp s3://autorenta-worker-logs/logs/2025-11-07/ - --recursive | \
  jq 'select(.Logs[].trace_id == "req-abc123-xyz")'

# Supabase Logs
supabase functions logs mercadopago-webhook | grep "req-abc123"

# Sentry (Angular errors)
# Filter by: trace_id:"req-abc123-xyz"
```

## Sensitive Data Redaction

All loggers automatically redact 20+ sensitive fields:

```typescript
const SENSITIVE_KEYS = [
  'password', 'token', 'access_token', 'refresh_token',
  'secret', 'api_key', 'apiKey', 'authorization',
  'creditCard', 'cvv', 'ssn', 'mp_access_token',
  'mp_refresh_token', 'mercadopago_access_token',
  'supabase_service_role_key', 'encryptionKey', 'privateKey'
];
```

**Example**:

```typescript
// Input
log.info('User authenticated', {
  userId: '123',
  password: 'secret123',
  token: 'xyz-token',
  email: 'user@example.com'
});

// Output
{
  "message": "User authenticated",
  "data": {
    "userId": "123",
    "password": "[REDACTED]",
    "token": "[REDACTED]",
    "email": "user@example.com"  // ← Email NOT redacted (not in list)
  }
}
```

**Add custom sensitive keys**:

```typescript
// In logger.ts
private readonly SENSITIVE_KEYS = [
  ...SENSITIVE_KEYS,
  'customSecret',
  'internalApiKey'
];
```

## Production vs Development

### Development Mode

```typescript
// All log levels output
logger.debug('Cache hit');      // ✅ Logged
logger.info('Request received'); // ✅ Logged
logger.warn('Slow query');       // ✅ Logged
logger.error('DB error');        // ✅ Logged

// Output format: Human-readable
// [DEBUG] [req-abc12] [MyService] Cache hit { key: 'cars-all' }
```

### Production Mode

```typescript
// Only WARN and ERROR output
logger.debug('Cache hit');      // ❌ Filtered out
logger.info('Request received'); // ❌ Filtered out
logger.warn('Slow query');       // ✅ Logged + Sentry
logger.error('DB error');        // ✅ Logged + Sentry

// Output format: JSON
{
  "level": "ERROR",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "message": "DB error",
  "trace_id": "req-abc12-xyz",
  ...
}
```

**Configuration**:

```typescript
// Edge Functions: Auto-detected via Deno.env.get('ENVIRONMENT')
this.isProduction = Deno.env.get('ENVIRONMENT') === 'production';

// Workers: Auto-detected via ENVIRONMENT global
this.isProduction = typeof ENVIRONMENT !== 'undefined' && ENVIRONMENT === 'production';

// Angular: Auto-detected via environment.production
private readonly isDevelopment = !environment.production;
```

## ESLint Enforcement

Raw `console.*` usage is blocked via ESLint rules:

```javascript
// eslint.config.mjs (Angular)
rules: {
  'no-console': ['error', { allow: [] }] // ← No console.* allowed
}

// .eslintrc.json (Edge Functions & Workers)
"rules": {
  "no-console": ["error", { "allow": [] }]
}
```

**Exceptions**:
- Test files: `console.*` allowed for debugging
- One-time scripts: Disable ESLint with `// eslint-disable-next-line no-console`

## Log Storage & Retention

### Supabase Edge Functions

- **Storage**: Supabase stdout (managed by Supabase)
- **Retention**: 7 days (Supabase default)
- **Access**: `supabase functions logs <function-name>`

### Cloudflare Workers

- **Storage**: Cloudflare Logpush → R2/S3 (see [setup guide](../runbooks/cloudflare-logpush-setup.md))
- **Retention**: Configurable via bucket lifecycle rules
- **Access**: Download from R2/S3 or query via Athena/SQL

### Angular Frontend

- **Storage**: Sentry (errors only)
- **Retention**: 90 days (Sentry default, configurable)
- **Access**: Sentry dashboard

### Retention Policy

| Level | Retention | Archive After | Cost (R2) |
|-------|-----------|---------------|-----------|
| DEBUG | 7 days | Delete | $0.01/month |
| INFO | 30 days | 90 days | $0.02/month |
| WARN | 90 days | 180 days | $0.01/month |
| ERROR | 365 days | 730 days | $0.03/month |

See: [Log Retention Policy](../runbooks/log-retention-policy.md)

## Searching & Querying Logs

### Supabase Logs (Real-time)

```bash
# Tail logs
supabase functions logs mercadopago-webhook --tail

# Filter by time range
supabase functions logs mercadopago-webhook --since 2025-11-07T10:00:00Z

# Grep for specific trace ID
supabase functions logs mercadopago-webhook | grep "req-abc123"
```

### Cloudflare Logs (Historical)

#### Using jq (JSON query)

```bash
# Download logs from R2
wrangler r2 object get autorenta-worker-logs/logs/2025-11-07/payments-webhook.log > logs.json

# Query by trace ID
jq '.[] | select(.Logs[].trace_id == "req-abc123-xyz")' logs.json

# Query by log level
jq '.[] | select(.Logs[].level == "ERROR")' logs.json

# Query by time range
jq '.[] | select(.EventTimestampMs > 1699358400000)' logs.json
```

#### Using AWS Athena (for S3)

```sql
-- Create external table
CREATE EXTERNAL TABLE worker_logs (
  EventTimestampMs BIGINT,
  Outcome STRING,
  ScriptName STRING,
  Logs ARRAY<STRUCT<level:STRING, message:STRING, trace_id:STRING, data:STRING>>
)
STORED AS JSON
LOCATION 's3://autorenta-worker-logs/logs/';

-- Query ERROR logs from last 24 hours
SELECT
  from_unixtime(EventTimestampMs/1000) as timestamp,
  ScriptName,
  log.level,
  log.message,
  log.trace_id,
  log.data
FROM worker_logs
CROSS JOIN UNNEST(Logs) AS t(log)
WHERE log.level = 'ERROR'
  AND from_unixtime(EventTimestampMs/1000) > current_timestamp - interval '1' day
ORDER BY timestamp DESC;
```

### Sentry (Angular Errors)

```
# Search by trace ID
trace_id:"req-abc123-xyz"

# Search by user ID
user.id:"user-uuid"

# Search by error type
error.type:"TypeError"

# Search by time range
timestamp:[2025-11-07T00:00:00 TO 2025-11-07T23:59:59]
```

## Troubleshooting

### No logs appearing

**Angular**:
```typescript
// Check logger is injected
private logger = inject(LoggerService);

// Check log level
this.logger.debug('Test'); // Hidden in production!
this.logger.error('Test'); // Should always appear
```

**Edge Functions**:
```bash
# Check function logs
supabase functions logs <function-name> --tail

# Verify logger import
import { fromRequest } from '../_shared/logger.ts';
```

**Workers**:
```bash
# Check Logpush job status
wrangler tail <worker-name>

# Verify logger import
import { fromRequest } from '../../logger';
```

### Trace ID not propagating

**Check Angular interceptor**:
```typescript
// apps/web/src/app/app.config.ts
provideHttpClient(
  withInterceptors([
    traceIdInterceptor,  // ← Must be first!
    ...
  ])
)
```

**Check request headers**:
```typescript
// Worker
const log = fromRequest(request, 'worker-name');
console.log(log.getTraceId()); // Should print trace ID

// Edge Function
const log = fromRequest(req);
console.log(log.getTraceId()); // Should print trace ID
```

### Logs not in JSON format

**Check environment**:
```typescript
// Edge Functions
console.log(Deno.env.get('ENVIRONMENT')); // Should be "production"

// Workers
console.log(ENVIRONMENT); // Should be "production"

// Angular
console.log(environment.production); // Should be true
```

### ESLint errors on console usage

**Fix**: Replace `console.*` with logger:
```typescript
// ❌ Before
console.log('User loaded', user);

// ✅ After
this.logger.info('User loaded', { userId: user.id });
```

**Temporary bypass** (not recommended):
```typescript
// eslint-disable-next-line no-console
console.log('Debug info');
```

## Migration Checklist

Migration status for all services:

### Angular
- [x] LoggerService created
- [x] ESLint rule added
- [x] Trace ID interceptor registered
- [x] High-priority services migrated:
  - [x] car-availability.service.ts (8 statements)
  - [ ] Other services (on-demand migration)

### Supabase Edge Functions
- [x] Logger utility created
- [x] ESLint rule added
- [x] High-priority functions migrated:
  - [x] mercadopago-webhook (51 statements)
  - [ ] Other functions (on-demand migration)

### Cloudflare Workers
- [x] Logger utility created
- [x] ESLint rule added
- [x] High-priority workers migrated:
  - [x] payments_webhook (19 statements)
  - [ ] Other workers (on-demand migration)

### Infrastructure
- [ ] Cloudflare Logpush configured (see [setup guide](../runbooks/cloudflare-logpush-setup.md))
- [ ] R2 lifecycle rules configured
- [ ] Monitoring dashboards created
- [ ] Team training completed

## Best Practices

### DO ✅

```typescript
// Use child loggers for context
const log = logger.child('PaymentService');

// Include structured data
log.info('Payment processed', { paymentId, amount, status });

// Use appropriate log levels
log.error('Payment failed', error); // Not log.info()

// Pass logger to functions
async function processPayment(paymentId: string, log: Logger) {
  log.info('Processing payment', { paymentId });
}
```

### DON'T ❌

```typescript
// Don't use raw console
console.log('Payment processed'); // ESLint error!

// Don't log sensitive data manually
log.info('User password', { password: 'secret' }); // Auto-redacted, but still bad practice

// Don't use template strings for structured data
log.info(`Payment ${id} processed`); // Use: log.info('Payment processed', { id })

// Don't log in loops without sampling
for (const item of items) {
  log.debug('Processing item', item); // Consider sampling: if (i % 100 === 0)
}
```

## Performance Considerations

### Log Sampling

For high-frequency logs, use sampling:

```typescript
// Log 10% of requests
if (Math.random() < 0.1) {
  log.info('Request processed', { requestId });
}

// Log every 100th iteration
if (i % 100 === 0) {
  log.debug('Processing batch', { current: i, total });
}
```

### Async Logging (Future)

For better performance, consider async logging:

```typescript
// TODO: Implement async logger queue
// Logs buffered in memory and flushed every 1s
```

## References

- **Runbooks**:
  - [Cloudflare Logpush Setup](../runbooks/cloudflare-logpush-setup.md)
  - [Log Retention Policy](../runbooks/log-retention-policy.md)
- **Source Code**:
  - Angular: `apps/web/src/app/core/services/logger.service.ts`
  - Edge Functions: `supabase/functions/_shared/logger.ts`
  - Workers: `functions/workers/logger.ts`
- **ESLint Configs**:
  - Angular: `apps/web/eslint.config.mjs`
  - Edge Functions: `supabase/functions/.eslintrc.json`
  - Workers: `functions/workers/.eslintrc.json`

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Search Sentry for similar errors
3. Contact DevOps team in #infrastructure Slack channel
