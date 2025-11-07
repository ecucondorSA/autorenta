# Logging Code Examples - Current Patterns

## Quick Reference: How Logging is Currently Used

### Edge Functions - Logger Patterns

**Good Pattern (Using createChildLogger):**
```typescript
// From: supabase/functions/mercadopago-webhook/index.ts
import { createChildLogger } from '../_shared/logger.ts';

const log = createChildLogger('MercadoPagoWebhook');

// Usage
log.info('Payment processed', { paymentId: '123' });
log.error('Payment failed', error);
log.warn('Rate limit exceeded', { ip: clientIp });
```

**Bad Pattern (Raw console.log):**
```typescript
// From: supabase/functions/mercadopago-webhook/index.ts
console.log('Webhook validation:', {
  type: webhookPayload.type,
  action: webhookPayload.action,
});

console.error('HMAC validation FAILED', {
  receivedHash: receivedHash,
  calculatedHash: calculatedHash,
});

console.warn('⚠️ Unauthorized IP attempt:', {
  ip: clientIp,
});
```

**With Trace ID (Best Practice):**
```typescript
import { fromRequest, withTraceId } from '../_shared/logger.ts';

// Extract trace ID from request headers
const log = fromRequest(request);

// Or create with explicit trace ID
const log = withTraceId('req-abc-123');

log.info('Processing payment', { amount: 1000 });
// Output: {"level":"INFO", "timestamp":"...", "trace_id":"req-abc-123", ...}
```

---

### Workers - Logger Patterns

**Typical Usage (payments_webhook):**
```typescript
// From: functions/workers/payments_webhook/src/index.ts
import { fromRequest } from '../logger';

// Create logger from request (auto-extracts/generates trace ID)
const log = fromRequest(request, 'payments-webhook');

// Or use default logger
import { logger, withTraceId } from '../logger';
const log = withTraceId('req-custom-id', 'doc-verifier');
```

**Raw Console Pattern (What we're trying to avoid):**
```typescript
console.log('Validating document:', documentId);
console.error('Document validation failed:', error.message);
```

---

### Angular - LoggerService Patterns

**Good Pattern (Using LoggerService):**
```typescript
import { LoggerService } from '@core/services/logger.service';

export class PaymentService {
  private logger = inject(LoggerService);

  processPayment(booking: Booking) {
    try {
      this.logger.info('Processing payment', 'PaymentService', { bookingId: booking.id });
      // ... payment logic
    } catch (error) {
      this.logger.error('Payment failed', 'PaymentService', error);
    }
  }
}
```

**Good Pattern (Using ChildLogger for cleaner code):**
```typescript
export class CarAvailabilityService {
  private logger = inject(LoggerService).createChildLogger('CarAvailability');

  async checkAvailability(carId: string, dates: DateRange) {
    try {
      this.logger.info('Checking availability', { carId });
      // ... logic
    } catch (error) {
      this.logger.error('Error checking availability', error);
      // Output: [ERROR] [CarAvailability] Error checking availability ...
    }
  }
}
```

**Bad Pattern (Raw console.error):**
```typescript
// From: apps/web/src/app/core/services/car-availability.service.ts
console.error('[CarAvailability] Exception in getBlockedDates:', error);
console.error('[CarAvailability] Error checking availability:', error);

// This pattern tries to mimic what ChildLogger does but manually!
```

---

## Log Output Examples

### Development Mode

**Edge Functions (human-readable):**
```
INFO [req-abc] [MercadoPagoWebhook] Payment processed 
  { data: { paymentId: 123 } }
ERROR [req-def] [PaymentWebhook] Payment failed 
  { error: { name: 'PaymentError', message: 'Invalid amount' } }
```

**Angular (console output):**
```
[INFO] [req-abc] [PaymentService] Processing payment { bookingId: 'b123' }
[ERROR] [req-def] [PaymentService] Payment failed Error: Network timeout
```

### Production Mode (JSON)

**Edge Functions:**
```json
{
  "level": "INFO",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "service": "edge-function",
  "function": "mercadopago-webhook",
  "trace_id": "req-abc-123",
  "message": "Payment processed",
  "context": "MercadoPagoWebhook",
  "data": { "paymentId": "123" }
}
```

**Workers:**
```json
{
  "level": "ERROR",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "service": "worker",
  "worker": "payments-webhook",
  "trace_id": "req-def-456",
  "message": "Payment failed",
  "context": "PaymentProcessor",
  "error": {
    "name": "Error",
    "message": "Invalid amount",
    "stack": "Error: Invalid amount\n  at ..."
  }
}
```

**Angular (via Sentry):**
```
Sentry Event:
- Level: error
- Message: Payment failed
- Context: PaymentService
- Extra: { data: { ... } }
- Trace ID: req-abc-123
```

---

## Sensitive Data Redaction Examples

### What Gets Redacted

**Good - Automatic redaction:**
```typescript
const log = logger.child('Auth');

log.info('User authenticated', {
  userId: 'user123',
  access_token: 'mp_token_abc123...',  // -> '[REDACTED]'
  refresh_token: 'refresh_xyz...',     // -> '[REDACTED]'
  password: 'secret123',                // -> '[REDACTED]'
});

// Output: { userId: 'user123', access_token: '[REDACTED]', ... }
```

**Sensitive Keys Automatically Redacted (20+):**
```
password, token, access_token, refresh_token, secret, api_key, apiKey,
authorization, creditCard, cvv, ssn, mp_access_token, mp_refresh_token,
mercadopago_access_token, supabase_service_role_key, encryptionKey, etc.
```

---

## Trace ID & Correlation

### Current Implementation

**Format:**
```
req-{timestamp-base36}-{random-7-chars}
Example: req-2k4r8m2d-a1b2c3d
```

**Header Names Supported:**
```
X-Trace-Id
X-Request-Id
X-Correlation-Id
```

**Example Flow (Currently Not Fully Implemented):**
```
Browser Request:
  POST /api/payments
  
  ❌ Not propagating X-Trace-Id from browser to backend
  
Edge Function:
  Generates trace_id: req-abc-123
  log.info('Processing payment')
  ✅ Includes trace_id in logs
  
Worker:
  ❌ No trace_id received from Edge Function
  Logs independently without correlation
```

---

## Usage Statistics by File

### Top Console.log Users

**mercadopago-webhook/index.ts** (51 statements)
```
Needs refactoring - should use:
const log = fromRequest(request);
```

**payments_webhook/src/index.ts** (19 statements)
```
Already has logger import, but raw console still mixed in
```

**car-availability.service.ts** (8 statements)
```
Using manual prefix pattern [CarAvailability] - should migrate to ChildLogger
```

---

## Sentry Integration

### Edge Functions (withSentry wrapper)
```typescript
import { withSentry } from '../_shared/sentry.ts';

const handler = async (req: Request) => {
  // your code
};

export const wrappedHandler = withSentry('function-name', handler);
```

### Workers (withSentry wrapper)
```typescript
import { withSentry } from './sentry';

export default {
  async fetch(request, env, ctx) {
    return withSentry(request, env, ctx, async () => {
      // your code
    });
  },
};
```

### Angular (Built-in to config)
```typescript
// From app.config.ts
initializeSentry(); // Configured at bootstrap

// Usage
this.logger.error('Payment failed', 'PaymentService', error);
// Automatically captures in Sentry
```

---

## Anti-Patterns to Avoid

### 1. Raw console without context
```typescript
// ❌ BAD
console.log('Processing payment');
console.error(error);

// ✅ GOOD
const log = fromRequest(request);
log.info('Processing payment', { amount: 1000 });
log.error('Payment failed', error);
```

### 2. Manual context prefixes
```typescript
// ❌ BAD (manual prefix)
console.error('[PaymentService] Error:', error.message);

// ✅ GOOD (automatic via ChildLogger)
const logger = createChildLogger('PaymentService');
logger.error('Error', error);
```

### 3. Logging sensitive data
```typescript
// ❌ BAD
console.log('User credentials:', { email, password, token });

// ✅ GOOD - Logger auto-redacts
logger.info('User login', { email }); // password/token auto-redacted
```

### 4. Missing trace IDs
```typescript
// ❌ BAD
logger.info('Processing'); // No correlation possible

// ✅ GOOD
const log = fromRequest(request);
log.info('Processing'); // Has trace_id automatically
```

### 5. Inconsistent levels
```typescript
// ❌ BAD
console.log('Error: ' + error.message); // Wrong level
console.warn('Processing started'); // Wrong level

// ✅ GOOD
log.error('Error occurred', error);
log.info('Processing started', { operation });
```

---

## Current vs Ideal State

### Current State
```
✅ Logger utilities exist for all 3 services
✅ Sentry integration on all layers
✅ Trace ID support implemented
✅ Sensitive data redaction
❌ Inconsistent adoption (~50% using logger utilities)
❌ No correlation propagation between layers
❌ Raw console calls still prevalent
```

### Ideal State (Target)
```
✅ 100% logger utility usage
✅ Trace IDs propagated browser → backend → workers
✅ Consistent structured log output across all services
✅ Automatic user/booking/payment context in logs
✅ Performance monitoring on all operations
✅ Automated linting to prevent console.log
```

