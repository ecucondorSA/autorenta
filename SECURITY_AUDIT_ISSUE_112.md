# AutoRenta Security Analysis Report - Issue #112

## Executive Summary

This report details a comprehensive security audit of the AutoRenta codebase, examining five key vulnerability areas:

1. **Exposed API Credentials/Secrets** - Risk Assessment
2. **Unencrypted PII (Personally Identifiable Information)** - HIGH RISK
3. **Rate Limiting Implementation** - PARTIAL
4. **Webhook Signature Verification** - GOOD
5. **Security Monitoring & Alerting** - INCOMPLETE

---

## 1. EXPOSED API CREDENTIALS / SECRETS

### Status: GOOD - No Hardcoded Secrets Found

**Findings:**
- ✅ No hardcoded API keys in source code (`.ts` files)
- ✅ All sensitive configuration uses environment variables
- ✅ `.env` files properly added to `.gitignore`
- ✅ No credentials found in comments or constants

**Evidence:**
- `/home/user/autorenta/.env.example` - Properly templated
- `/home/user/autorenta/apps/web/.env.example` - Properly templated
- No `sk_live_*`, `pk_live_*`, or similar patterns in TypeScript code
- MercadoPago tokens stored in `.env.example` as placeholders

**Secrets Management:**
```
Configured in GitHub Actions Secrets:
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY
- CF_API_TOKEN, CF_ACCOUNT_ID (Cloudflare)
- MAPBOX_ACCESS_TOKEN
```

**Recommendations:**
- ✅ Continue rotating secrets regularly
- ✅ Monitor for accidental commits via pre-commit hooks
- Implement secret scanning in CI/CD (e.g., `git-secrets`, `detect-secrets`)

---

## 2. UNENCRYPTED PII (PERSONALLY IDENTIFIABLE INFORMATION)

### Status: CRITICAL - Multiple Sensitive Fields Stored in Plaintext

**CRITICAL FINDINGS - Profiles Table:**

```sql
-- File: /home/user/autorenta/apps/web/database/expand-profiles-fixed.sql
-- Lines 42-61 (PII fields stored in PLAIN TEXT)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,                          -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,                       -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS gov_id_type TEXT,                    -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS gov_id_number TEXT,                  -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS driver_license_number TEXT,          -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS driver_license_country TEXT,         -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,          -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,                  -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,                  -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS city TEXT,                           -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS state TEXT,                          -- ⚠️ UNENCRYPTED
  ADD COLUMN IF NOT EXISTS postal_code TEXT;                    -- ⚠️ UNENCRYPTED
```

**CRITICAL FINDINGS - Bank Accounts Table:**

```sql
-- File: /home/user/autorenta/database/create-withdrawal-system.sql
-- Lines 22-49 (Banking PII stored in PLAIN TEXT)

CREATE TABLE IF NOT EXISTS bank_accounts (
  account_number TEXT NOT NULL,                                  -- ⚠️ UNENCRYPTED (CBU/CVU)
  account_holder_name TEXT NOT NULL,                             -- ⚠️ UNENCRYPTED
  account_holder_document TEXT NOT NULL,                         -- ⚠️ UNENCRYPTED (DNI/CUIT)
  bank_name TEXT,                                                -- ⚠️ UNENCRYPTED
  ...
);
```

**Also in Migrations:**
- `/home/user/autorenta/supabase/migrations/20251028_add_split_payment_system.sql` (Lines 88-99)
  - `account_number VARCHAR(50)` - UNENCRYPTED
  - `account_holder_name VARCHAR(200)` - UNENCRYPTED
  - `account_holder_id VARCHAR(20)` - UNENCRYPTED (DNI/CUIT)

**PII Fields at Risk:**
| Field | Location | Encryption | Risk Level |
|-------|----------|-----------|-----------|
| Phone Number | `profiles.phone` | ❌ Plaintext | HIGH |
| WhatsApp Number | `profiles.whatsapp` | ❌ Plaintext | HIGH |
| Gov ID Number | `profiles.gov_id_number` | ❌ Plaintext | CRITICAL |
| Driver License | `profiles.driver_license_number` | ❌ Plaintext | CRITICAL |
| Home Address | `profiles.address_*` | ❌ Plaintext | HIGH |
| Bank Account | `bank_accounts.account_number` | ❌ Plaintext | CRITICAL |
| Account Holder Name | `bank_accounts.account_holder_name` | ❌ Plaintext | CRITICAL |
| Account Holder ID | `bank_accounts.account_holder_document` | ❌ Plaintext | CRITICAL |

**What's Being Done Right:**
- ✅ Encryption service exists: `/home/user/autorenta/apps/web/src/app/core/services/encryption.service.ts`
- ✅ AES-256-GCM with PBKDF2 (100k iterations) - Good implementation
- ✅ Used for MercadoPago tokens: `mercadopago_access_token_encrypted`
- ✅ Proper IV + salt handling

**What's Missing:**
- ❌ Encryption service NOT applied to PII fields
- ❌ No database-level encryption (pgcrypto)
- ❌ No mention of field-level encryption in migrations

**Compliance Issues:**
- **GDPR**: Personal data must be protected by encryption (Article 32)
- **CCPA**: Requires reasonable security measures for PI
- **Argentina (PDPA)**: Local data protection law requires encryption
- **PCI-DSS**: If storing payment card data → requires encryption

---

## 3. RATE LIMITING IMPLEMENTATION

### Status: PARTIAL - Implemented on Webhooks, Missing on API Endpoints

**Rate Limiting IMPLEMENTED:**

✅ **MercadoPago Webhook** (`supabase/functions/mercadopago-webhook/index.ts`):
```typescript
// Lines 73-128
const RATE_LIMIT_MAX_REQUESTS = 100;      // 100 requests per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(clientIP: string): { allowed: boolean; remaining: number; resetAt: number }
// Returns 429 with Retry-After header when exceeded
```

✅ **PayPal Webhook** (`supabase/functions/paypal-webhook/index.ts`):
```typescript
// Lines 28-79
const RATE_LIMIT_MAX = 100;               // 100 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

// Proper rate limit store per IP with reset window
```

✅ **Phone Verification** (`apps/web/src/app/core/services/phone-verification.service.ts`):
- 3 OTP attempts per hour rate limiting
- `canSendOTP()` method with throttling

**Rate Limiting MISSING:**

❌ **No global API rate limiting** on:
- Booking creation endpoints
- Car listing endpoints
- Payment endpoints
- User profile endpoints

❌ **No request throttling middleware** in Angular interceptors

**Recommendations:**
- Add rate limiting decorator/middleware for all API endpoints
- Implement distributed rate limiting (Redis, Cloudflare KV)
- Add per-user rate limiting (not just per-IP)
- Rate limit authentication endpoints (login, registration)

---

## 4. WEBHOOK SIGNATURE VERIFICATION

### Status: GOOD - Proper Implementation for Critical Webhooks

**MercadoPago Webhook Verification:**

✅ **File**: `/home/user/autorenta/supabase/functions/mercadopago-webhook/index.ts`

**Verification Methods:**
1. **IP Whitelist** (Lines 62-103):
   ```typescript
   const MERCADOPAGO_IP_RANGES = [
     { start: ipToNumber('209.225.49.0'), end: ipToNumber('209.225.49.255') },
     { start: ipToNumber('216.33.197.0'), end: ipToNumber('216.33.197.255') },
     { start: ipToNumber('216.33.196.0'), end: ipToNumber('216.33.196.255') },
   ];
   ```
   - ✅ Proper CIDR range validation
   - ✅ Handles proxy headers (x-forwarded-for)

2. **HMAC Signature Verification** (Lines 229-340):
   ```typescript
   // x-signature: "ts=1704900000,v1=abc123def456..."
   // Manifest format: "id:{paymentId};request-id:{requestId};ts:{ts};"
   // HMAC-SHA256 validation against MP access token
   ```
   - ✅ HMAC-SHA256 signature validation
   - ✅ Timestamp validation (prevents replay attacks)
   - ✅ Request ID included in signature

**PayPal Webhook Verification:**

✅ **File**: `/home/user/autorenta/supabase/functions/paypal-webhook/index.ts`

**Verification Methods:**
1. **PayPal Signature Verification** (Lines 109-149):
   ```typescript
   const isValid = await verifyPayPalWebhookSignature(
     paypalConfig,
     accessToken,
     webhookId,
     headers,
     event
   );
   ```
   - ✅ Uses PayPal SDK for signature validation
   - ✅ Proper webhook ID configuration

2. **Idempotency Check** (Lines 91-103):
   ```typescript
   const processedEvents = new Set<string>();
   if (processedEvents.has(event.id)) {
     return { status: 'already_processed' };
   }
   ```
   - ✅ Prevents duplicate processing

3. **Rate Limiting** (Lines 56-79):
   - ✅ 100 requests/minute per IP

**Issues Found:**

⚠️ **MercadoPago Signature Validation** (Line 276-280):
```typescript
if (xSignature && xRequestId) {
  // ... validate HMAC
} else {
  // No warning if signature is missing!
  // Webhook still processed
}
```
**Risk**: If MP accidentally sends unsigned webhook (dev mode), it would be accepted

✅ **Mitigated by**: IP whitelist and proper signature format checks

**Recommendations:**
- Log warning when signature is missing (done ✅)
- Consider requiring signature in production (currently optional)
- Implement webhook event versioning/deprecation strategy

---

## 5. SECURITY MONITORING & ALERTING

### Status: INCOMPLETE - Framework Exists but Not Fully Enabled

**Sentry Integration:**

⚠️ **LoggerService** (`apps/web/src/app/core/services/logger.service.ts`):
```typescript
// Lines 207-240 - Sentry integration is COMMENTED OUT!
private sendToSentry(level: ..., message: string, data?: unknown): void {
  // This is a placeholder for Sentry integration
  // In production, initialize Sentry in main.ts:
  // import * as Sentry from "@sentry/angular";
  // Sentry.init({...});
  //
  // Then uncomment below:
  /*
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(...);  // <-- COMMENTED OUT
  }
  */
}
```

**Current Logging Capabilities:**
- ✅ Structured logging service exists
- ✅ Data sanitization for PII (Lines 131-189):
  ```typescript
  const sensitiveFields = [
    'password', 'token', 'access_token', 'refresh_token',
    'mercadopago_token', 'mercadopago_access_token',
    'apiKey', 'api_key', 'secretKey', 'secret_key',
    'creditCard', 'credit_card', 'cvv', 'ssn'
  ];
  ```
  ✅ Proper redaction implementation

- ✅ Log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- ✅ Child logger pattern for context prefix
- ❌ **NOT SENDING TO SENTRY IN PRODUCTION**

**What's Being Logged:**
- ✅ LoggerService in `apps/web/src/app/core/services/logger.service.ts`
- ✅ Payment webhook logging in Edge Functions
- ✅ Security events (unauthorized IP access, rate limit exceeded)

**What's Missing:**
- ❌ Sentry not initialized in main.ts
- ❌ No error reporting to external service
- ❌ No alerting rules configured
- ❌ No anomaly detection
- ❌ No user-facing security incidents monitoring

**Security Events That SHOULD Be Monitored:**
- ❌ Failed authentication attempts (brute force detection)
- ❌ Unauthorized API access
- ❌ Unusual payment patterns
- ❌ Data access anomalies
- ✅ Webhook failures (logged)
- ✅ Rate limit exceeded (logged)

**Recommendations:**
1. **Enable Sentry Integration**:
   - Uncomment Sentry initialization in main.ts
   - Configure Sentry project URL in environment variables
   - Set appropriate sample rate (10-20% in production)

2. **Add Security Event Monitoring**:
   - Track failed login attempts per user/IP
   - Monitor unusual payment patterns
   - Alert on mass data exports
   - Track sensitive field access

3. **Implement Alerting Rules**:
   - Alert on >5 failed logins in 5 minutes
   - Alert on >10 rate limit violations per IP
   - Alert on webhook verification failures
   - Alert on RLS policy violations (if possible)

4. **Distributed Tracing**:
   - Trace payment flows end-to-end
   - Trace user onboarding flow
   - Monitor Edge Function performance

---

## SUMMARY OF VULNERABILITIES

| # | Category | Issue | Severity | Status |
|---|----------|-------|----------|--------|
| 1 | Secrets | Exposed API credentials | LOW | ✅ GOOD |
| 2a | PII | Unencrypted phone numbers | HIGH | ❌ CRITICAL |
| 2b | PII | Unencrypted gov ID numbers | CRITICAL | ❌ CRITICAL |
| 2c | PII | Unencrypted bank account data | CRITICAL | ❌ CRITICAL |
| 2d | PII | Unencrypted home addresses | HIGH | ❌ CRITICAL |
| 3 | Rate Limiting | Missing on API endpoints | MEDIUM | ❌ NEEDS WORK |
| 4 | Webhooks | Signature verification | LOW | ✅ GOOD |
| 5 | Monitoring | Sentry not enabled | MEDIUM | ❌ INCOMPLETE |

---

## RECOMMENDED REMEDIATION PLAN

### Phase 1: CRITICAL (Do Immediately)
1. **Encrypt PII in Database**:
   - Add encryption to: phone, gov_id_number, driver_license_number, addresses
   - Encrypt banking information: account_number, account_holder_name, account_holder_document
   - Use Supabase pgcrypto or EncryptionService wrapper

2. **Implement Field-Level Encryption**:
   - Create encryption RPC functions
   - Migrate existing unencrypted data
   - Update queries to use encryption/decryption

3. **Enable Sentry**:
   - Uncomment Sentry initialization
   - Configure Sentry project
   - Test error reporting

### Phase 2: HIGH (Within 2 weeks)
1. **Implement Global Rate Limiting**:
   - Add middleware/decorator for API endpoints
   - Implement distributed rate limiting (Cloudflare KV)
   - Add per-user rate limiting

2. **Add Security Event Monitoring**:
   - Monitor failed authentication attempts
   - Monitor unusual payment patterns
   - Configure alerting rules

### Phase 3: MEDIUM (Within 1 month)
1. **Database Audit Logging**:
   - Track access to sensitive fields
   - Monitor data exports
   - Implement data retention policies

2. **Security Headers**:
   - Add CSP, X-Frame-Options, X-Content-Type headers
   - Implement HSTS
   - Add security-focused logging

---

## FILES TO REVIEW/UPDATE

```
CRITICAL:
  ❌ /home/user/autorenta/apps/web/database/expand-profiles-fixed.sql
  ❌ /home/user/autorenta/database/create-withdrawal-system.sql
  ❌ /home/user/autorenta/supabase/migrations/20251028_add_split_payment_system.sql

IMPORTANT:
  ❌ /home/user/autorenta/apps/web/src/app/core/services/logger.service.ts
  ❌ /home/user/autorenta/apps/web/src/main.ts (enable Sentry)

OPTIONAL:
  ✅ /home/user/autorenta/supabase/functions/mercadopago-webhook/index.ts
  ✅ /home/user/autorenta/supabase/functions/paypal-webhook/index.ts
  ✅ /home/user/autorenta/apps/web/src/app/core/services/encryption.service.ts
```

---

## References

- [GDPR Article 32 - Security](https://gdpr-info.eu/art-32-gdpr/)
- [CCPA Data Protection](https://oag.ca.gov/privacy/ccpa)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [OWASP Sensitive Data Exposure](https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure)
- [NIST Guidelines on Encryption](https://csrc.nist.gov/publications/detail/fips/140/2/final)

