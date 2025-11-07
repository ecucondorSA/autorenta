# Sub-Issues: EPIC #112 & #113

## EPIC #112: 🔒 Security Hardening for Production

### [#112-1] 🔐 Secrets Management & Credential Rotation
**Parent:** #112
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Audit codebase for exposed API keys, tokens, and credentials
- [ ] Implement environment-based secret management (use Cloudflare Secrets for Workers, Supabase Secrets for Edge Functions)
- [ ] Rotate all existing credentials (GitHub, Supabase, MercadoPago, Cloudflare tokens)
- [ ] Add pre-commit hook to prevent credential commits (detect API keys, tokens, passwords)
- [ ] Document secret rotation procedures in runbook
- [ ] Zero exposed credentials in repository scan

#### Technical Details
- Use `GITHUB_TOKEN` scanning to detect exposed tokens
- Implement `.env.example` with placeholder values only
- Configure Husky pre-commit hooks to block credential patterns
- Update CI/CD to use GitHub Secrets + Cloudflare Vault

---

### [#112-2] 🔒 Data Encryption Implementation
**Parent:** #112
**Priority:** P0 | **Effort:** 4 days
**Dependencies:** #112-1

#### Acceptance Criteria
- [ ] Identify all PII fields (phone, email, ID documents, bank accounts, addresses)
- [ ] Implement encryption for sensitive columns in PostgreSQL
- [ ] Create migration script for encrypting existing data
- [ ] Implement decryption in application layer (Angular + Edge Functions)
- [ ] Document encryption key rotation procedures
- [ ] 100% encryption coverage for PII data

#### Technical Details
- Use `pgcrypto` extension or `pgsodium` for PostgreSQL encryption
- Encrypt fields: `users.phone`, `users.email`, `documents.*`, `payment_methods.*`
- Store encryption keys in Cloudflare Secrets / Supabase Vault
- Add encryption/decryption helpers in Supabase Edge Functions
- Update API responses to decrypt data on-the-fly

#### Scope
```sql
-- Fields to encrypt
users: phone, email
drivers_profile: license_number, id_number
documents: document_url, metadata
payment_methods: account_number, routing_number
wallets: encrypted_balance (optional)
```

---

### [#112-3] 🚦 Rate Limiting & Request Throttling
**Parent:** #112
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Implement rate limiting on API endpoints (Edge Functions)
- [ ] Configure rate limits: 100 req/min per user, 1000 req/min per IP
- [ ] Add rate limit headers to responses (X-RateLimit-*)
- [ ] Implement graceful degradation (429 Too Many Requests)
- [ ] Test impact on legitimate users (<0.1% false positives)
- [ ] Document rate limit thresholds in API docs

#### Technical Details
- Use Cloudflare Durable Objects or Redis for distributed rate limiting
- Implement sliding window algorithm
- Different limits for authenticated vs. anonymous users
- Whitelist internal services (admin dashboard, webhooks)
- Add metrics to track rate limit violations

#### Rate Limit Tiers
```
Anonymous users: 10 requests/minute
Authenticated users: 100 requests/minute
API keys (internal): Unlimited (with monitoring)
Webhook endpoints: 1000 requests/minute
File uploads: 10 files/hour per user
```

---

### [#112-4] 🔐 Webhook Signature Verification
**Parent:** #112
**Priority:** P0 | **Effort:** 2 days
**Dependencies:** #112-1

#### Acceptance Criteria
- [ ] Verify MercadoPago webhook signatures (HMAC-SHA256)
- [ ] Verify PayPal webhook signatures
- [ ] Add webhook signature validation middleware
- [ ] Reject invalid signatures with 401 Unauthorized
- [ ] Add audit logging for signature verification attempts
- [ ] Document webhook security in runbook

#### Technical Details
- Store webhook secrets in Cloudflare Secrets
- Implement signature verification in `payments_webhook` Worker
- For MercadoPago: Verify `x-signature` header against request body
- For PayPal: Verify `PayPal-Transmission-Sig` header
- Add test cases for tampered/missing signatures

---

### [#112-5] 🔐 Database Row-Level Security (RLS) Audit
**Parent:** #112
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Audit all RLS policies on sensitive tables
- [ ] Ensure users can only access their own data
- [ ] Test RLS policies for privilege escalation vulnerabilities
- [ ] Document RLS policy matrix in architecture file
- [ ] Enable RLS on all user-related tables
- [ ] 100% RLS policy coverage

#### Tables to Audit
```
Users (auth.users + public.users)
Bookings
Wallets
Payment Methods
Documents
Driver Profiles
Car Listings
Messages
Ratings
```

#### RLS Policy Template
```sql
CREATE POLICY "Users can view own record"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

---

### [#112-6] 📋 Security Monitoring & Incident Response
**Parent:** #112
**Priority:** P1 | **Effort:** 2 days
**Dependencies:** #112-1 through #112-5

#### Acceptance Criteria
- [ ] Set up continuous credential scanning (GitGuardian or similar)
- [ ] Create security incident response runbook
- [ ] Document security audit procedures
- [ ] Configure Supabase security alerts
- [ ] Add security headers (CSP, X-Frame-Options, etc.)
- [ ] Document compliance requirements (GDPR, PCI-DSS, Argentina DPA)

#### Technical Details
- Add security headers via Cloudflare Workers / Edge Functions
- Enable audit logs in Supabase and Cloudflare
- Create incident response checklist
- Document breach notification procedures

---

## EPIC #113: 📊 Monitoring & Observability Infrastructure

### [#113-1] 📊 Error Tracking (Sentry Implementation)
**Parent:** #113
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Install and configure Sentry for Angular frontend
- [ ] Configure Sentry for Supabase Edge Functions
- [ ] Configure Sentry for Cloudflare Workers
- [ ] Set up source maps for production builds
- [ ] Create Sentry alerts for critical errors
- [ ] Test error capturing with sample errors
- [ ] Document error investigation procedures

#### Technical Details
```typescript
// Angular: sentry-init.ts
import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  tracesSampleRate: 0.1,
});
```

- Edge Functions: Add Sentry SDK to deno.json
- Workers: Add `@sentry/node` via npm
- Capture unhandled promise rejections
- Include user context (user_id) in error reports

---

### [#113-2] 🚨 Real-time Alerting (PagerDuty Integration)
**Parent:** #113
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** #113-1

#### Acceptance Criteria
- [ ] Set up PagerDuty account and API integration
- [ ] Create incident escalation policies
- [ ] Configure alert rules for critical events
- [ ] Test incident creation and on-call routing
- [ ] Document alert response procedures
- [ ] Target: <10 false positives per week

#### Critical Alert Rules
```
1. Payment webhook failure rate >3 in 5 minutes → PAGE
2. Error rate >1% of requests → PAGE
3. API response time >2s (p99) → WARN
4. Database connection pool exhausted → PAGE
5. Wallet balance mismatch (any) → PAGE
6. Storage quota >80% → WARN
7. Edge Function failures >5 in 10 min → PAGE
```

#### Technical Details
- Sentry → PagerDuty integration for critical errors
- Custom webhook from Edge Functions for business metrics
- On-call escalation: Engineer → Lead → Manager
- Include runbook links in incident details

---

### [#113-3] 📝 Centralized Logging Infrastructure
**Parent:** #113
**Priority:** P0 | **Effort:** 4 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Set up centralized logging (Cloud Logging / LogTail / Cloudflare Logpush)
- [ ] Configure log shipping from Edge Functions
- [ ] Configure log shipping from Cloudflare Workers
- [ ] Configure Angular error/debug logs
- [ ] Create log retention policies (30 days dev, 90 days prod)
- [ ] Implement structured logging format (JSON)
- [ ] Create dashboard for log querying

#### Structured Log Format
```json
{
  "timestamp": "2025-11-07T10:30:00Z",
  "level": "ERROR",
  "service": "payment-webhook",
  "user_id": "uuid",
  "request_id": "correlation-id",
  "message": "Payment webhook processing failed",
  "error": {
    "type": "MercadopagoError",
    "code": "INVALID_SIGNATURE",
    "stack": "..."
  },
  "context": {
    "booking_id": "uuid",
    "amount": 10000
  }
}
```

#### Services to Log
- Supabase Edge Functions (all)
- Cloudflare Workers (payments_webhook, ai-car-generator, etc.)
- Angular application (errors, significant events)
- Database operations (slow queries, connection issues)

---

### [#113-4] 📈 Performance Monitoring (APM)
**Parent:** #113
**Priority:** P0 | **Effort:** 3 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Set up APM tool (Datadog, New Relic, or self-hosted Grafana + Prometheus)
- [ ] Monitor API endpoint response times
- [ ] Monitor database query performance
- [ ] Monitor Edge Function execution time
- [ ] Create performance dashboards
- [ ] Set performance baselines and alerts
- [ ] Target: p99 response time <500ms

#### Key Metrics
```
Frontend:
  - Page load time (target: <2s)
  - Time to interactive (target: <3s)
  - API call latency (target: <500ms)

Backend:
  - API endpoint response times (p50, p95, p99)
  - Database query duration
  - Edge Function execution time
  - Worker cold start time

Payment System:
  - Webhook processing latency
  - Preference creation time
  - Payment confirmation latency
```

#### Technical Details
- Use Sentry Performance Monitoring (included)
- Add custom metrics via Cloudflare Analytics Engine
- Monitor Supabase query performance via dashboard
- Create alerts for performance degradation (>10% increase)

---

### [#113-5] 🔍 Uptime & External Monitoring
**Parent:** #113
**Priority:** P0 | **Effort:** 2 days
**Dependencies:** None

#### Acceptance Criteria
- [ ] Set up uptime monitoring (UptimeRobot, Healthchecks.io, etc.)
- [ ] Configure synthetic monitoring for critical paths
- [ ] Create status page (Cachify or StatusPage.io)
- [ ] Monitor payment provider endpoints
- [ ] Test failover and incident communication
- [ ] Target: 99.9% uptime (31 minutes down/month max)

#### Monitoring Points
```
1. Web application (GET / - should return 200)
2. API health endpoint (GET /api/health)
3. Payment webhook (test POST to payment endpoint)
4. Database connectivity (SELECT 1 from health_check table)
5. Storage availability (test file upload)
6. MercadoPago API availability
```

#### Status Page
- Display component status (Web, API, Payment System, Storage)
- Show incident history
- Include support contact information
- Auto-update from monitoring system

---

### [#113-6] 📊 Custom Dashboards & Metrics
**Parent:** #113
**Priority:** P1 | **Effort:** 3 days
**Dependencies:** #113-1 through #113-5

#### Acceptance Criteria
- [ ] Create admin dashboard with key metrics
- [ ] Implement payment metrics dashboard (daily revenue, failed payments, etc.)
- [ ] Create system health dashboard
- [ ] Implement user activity metrics
- [ ] Set up anomaly detection alerts
- [ ] Create data export capabilities

#### Key Dashboards

**Executive Dashboard:**
- Daily revenue (ARS)
- Active bookings
- Payment success rate
- System uptime %
- Top issues by impact

**Payment Dashboard:**
- Transaction volume by provider
- Failed/retried transactions
- Refund rate
- Average processing time
- Revenue breakdown (platform vs. drivers)

**System Health Dashboard:**
- API response times (p50, p95, p99)
- Error rate by service
- Database performance
- Worker execution times
- Storage usage
- Queue depths (webhooks, jobs, etc.)

**User Metrics Dashboard:**
- New users (daily/weekly)
- Active users
- Signup to booking conversion
- User retention rates
- Geographic distribution
- Device breakdown

---

## Creation Instructions

To create these issues on GitHub, use the following template for each:

```
Title: [#XXX-Y] Issue Name
Parent: Issue #112 or #113
Priority: P0 or P1
Effort: X days
Dependencies: (if any)

Description: [Include full acceptance criteria and technical details from above]
Labels: epic-child, phase-1, production-blocker, security/monitoring
Milestone: Production Readiness
Assignee: (assign to relevant team member)
```

Or copy-paste the markdown above directly into GitHub issue creation.

---

**Generated:** 2025-11-07
**For:** Issue #112 & #113 Sub-task Creation
