# Log Retention Policy

**Part of Issue #120 - Centralized Logging Infrastructure**

This document defines the retention periods, archival strategies, and compliance requirements for AutoRenta's centralized logging system.

## Retention Periods by Log Level

| Log Level | Retention Period | Archive After | Rationale |
|-----------|------------------|---------------|-----------|
| **DEBUG** | 7 days | N/A (Delete) | High volume, low long-term value |
| **INFO** | 30 days | 90 days | Operational insights, archive for audits |
| **WARN** | 90 days | 180 days | Potential issues, useful for trend analysis |
| **ERROR** | 365 days | 730 days | Critical for debugging, compliance, root cause analysis |
| **CRITICAL** | 730 days | Indefinite | Security incidents, system failures |

## Retention by Service

### Edge Functions (Supabase)

**Storage**: Supabase logs (stdout) are retained by Supabase for **7 days** by default.

**Solution**: Logs are automatically output as structured JSON to stdout, which Supabase captures.

**Configuration**:
- **Production**: Only WARN and ERROR logs (filter in logger.ts)
- **Development**: All levels

**Access**:
```bash
# View real-time logs
supabase functions logs mercadopago-webhook --tail

# View historical logs (last 7 days)
supabase functions logs mercadopago-webhook --since 2025-11-01
```

**Recommendations**:
1. Enable Supabase Log Drains (when available) for long-term storage
2. Or, implement custom Edge Function to forward logs to R2/S3
3. Or, use Sentry for error aggregation (already implemented)

### Cloudflare Workers

**Storage**: Cloudflare Logpush to R2/S3 (see [Cloudflare Logpush Setup](./cloudflare-logpush-setup.md))

**Configuration**:
```bash
# Logpush sends logs every 30s-5min to external storage
# Configure lifecycle rules on R2/S3 bucket
```

**Lifecycle Policy** (R2/S3):
```json
{
  "Rules": [
    {
      "Id": "Delete DEBUG logs after 7 days",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/", "Tag": { "Key": "level", "Value": "DEBUG" } },
      "Expiration": { "Days": 7 }
    },
    {
      "Id": "Archive INFO logs after 30 days, delete after 90",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/", "Tag": { "Key": "level", "Value": "INFO" } },
      "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
      "Expiration": { "Days": 90 }
    },
    {
      "Id": "Archive WARN logs after 90 days, delete after 180",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/", "Tag": { "Key": "level", "Value": "WARN" } },
      "Transitions": [{ "Days": 90, "StorageClass": "GLACIER" }],
      "Expiration": { "Days": 180 }
    },
    {
      "Id": "Archive ERROR logs after 365 days, delete after 730",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/", "Tag": { "Key": "level", "Value": "ERROR" } },
      "Transitions": [{ "Days": 365, "StorageClass": "GLACIER" }],
      "Expiration": { "Days": 730 }
    },
    {
      "Id": "Archive CRITICAL logs indefinitely",
      "Status": "Enabled",
      "Filter": { "Prefix": "logs/", "Tag": { "Key": "level", "Value": "CRITICAL" } },
      "Transitions": [{ "Days": 730, "StorageClass": "DEEP_ARCHIVE" }]
    }
  ]
}
```

### Angular Frontend

**Storage**: Client-side logs are NOT persisted by default.

**Solutions**:
1. **Sentry Breadcrumbs** (already implemented): Captures last 100 events before error
2. **Error Logs Only**: Only ERROR and CRITICAL logs sent to Sentry
3. **No DEBUG/INFO in Production**: Filtered out via LoggerService

**Configuration**:
```typescript
// apps/web/src/app/core/services/logger.service.ts
private readonly isDevelopment = !environment.production;

// Production: Only WARN/ERROR/CRITICAL
if (!this.isDevelopment && level < LogLevel.WARN) {
  return; // Skip DEBUG/INFO in production
}
```

## Compliance Requirements

### GDPR Compliance

**User Data in Logs**:
- ✅ **Automatic PII Redaction**: Logger automatically redacts sensitive fields (see below)
- ✅ **User ID Logging**: User IDs logged for debugging, but can be deleted on user request
- ✅ **Right to Erasure**: Logs containing user data can be deleted within retention period

**Sensitive Keys Auto-Redacted**:
```typescript
// Automatically redacted in all loggers:
[
  'password', 'token', 'access_token', 'refresh_token', 'secret',
  'api_key', 'apiKey', 'authorization', 'creditCard', 'cvv', 'ssn',
  'mp_access_token', 'mp_refresh_token', 'mercadopago_access_token',
  'supabase_service_role_key', 'encryptionKey', 'privateKey'
]
```

**Example**:
```typescript
// Input:
log.info('User logged in', {
  userId: '123',
  password: 'secret123',
  token: 'abc-xyz'
});

// Output:
{
  "message": "User logged in",
  "data": {
    "userId": "123",
    "password": "[REDACTED]",
    "token": "[REDACTED]"
  }
}
```

### Payment Card Industry (PCI-DSS)

**Requirements**:
- ❌ **NO credit card numbers** in logs (enforced by auto-redaction)
- ❌ **NO CVV codes** in logs (enforced by auto-redaction)
- ✅ **Payment IDs only**: Use MercadoPago payment IDs, never raw card data

**Validation**:
```bash
# Audit logs for PCI violations (run quarterly)
grep -r "creditCard\|cvv\|card_number" logs/ && echo "❌ PCI VIOLATION FOUND" || echo "✅ No PCI violations"
```

### SOC 2 (Future)

For SOC 2 compliance, retain logs for **minimum 1 year**:
- ✅ ERROR logs: 365 days (compliant)
- ✅ WARN logs: 90 days (extend to 365 for full compliance)
- ✅ Access logs: Implement via API logging (TODO)

## Log Storage Costs

### Current Estimates (10,000 requests/day)

**Edge Functions (Supabase)**:
- Free (included in Supabase plan)
- Logs auto-delete after 7 days

**Cloudflare Workers (with Logpush to R2)**:
- **DEBUG**: ~100 MB/day × 7 days = 700 MB → $0.01/month
- **INFO**: ~50 MB/day × 30 days = 1.5 GB → $0.02/month
- **WARN**: ~10 MB/day × 90 days = 900 MB → $0.01/month
- **ERROR**: ~5 MB/day × 365 days = 1.8 GB → $0.03/month
- **Write operations**: 10k requests/day × 30 days = 300k writes → $1.35/month

**Total**: ~$1.42/month (R2 storage + writes)

### Scaling Estimates (100,000 requests/day)

- **Storage**: 5 GB/month → $0.08/month
- **Write operations**: 3M writes/month → $13.50/month

**Total**: ~$13.58/month

### Cost Optimization

1. **Filter DEBUG logs in production** (already implemented)
   - Reduces volume by ~60%
   - Savings: ~$8/month at 100k req/day

2. **Use sampling for INFO logs**:
   ```typescript
   // Log 10% of INFO, 100% of WARN/ERROR
   if (level === LogLevel.INFO && Math.random() > 0.1) return;
   ```
   - Savings: ~$5/month at 100k req/day

3. **Compress logs before storage**:
   - R2 supports gzip compression
   - Savings: 50-70% storage costs

## Archival Strategy

### Cold Storage Tiers

| Tier | Use Case | Cost (R2) | Retrieval Time |
|------|----------|-----------|----------------|
| **Hot** (Standard) | Active logs (0-30 days) | $0.015/GB/month | Instant |
| **Infrequent Access** | Archived logs (30-180 days) | $0.01/GB/month | <1 minute |
| **Glacier** (S3 only) | Long-term archive (180+ days) | $0.004/GB/month | 3-5 hours |
| **Deep Archive** (S3 only) | Compliance archive (730+ days) | $0.00099/GB/month | 12-48 hours |

**Note**: R2 doesn't have Glacier tiers yet. Use S3 for deep archival if needed.

### Restore Procedure

**From R2**:
```bash
# Download archived logs
wrangler r2 object get autorenta-worker-logs/logs/2025-01-15/worker-logs.json.gz

# Decompress
gunzip worker-logs.json.gz

# Query
jq '.[] | select(.level == "ERROR")' worker-logs.json
```

**From S3 Glacier**:
```bash
# Initiate restore (takes 3-5 hours)
aws s3api restore-object \
  --bucket autorenta-worker-logs \
  --key logs/2025-01-15/worker-logs.json.gz \
  --restore-request Days=7,GlacierJobParameters={Tier=Expedited}

# Download after restore completes
aws s3 cp s3://autorenta-worker-logs/logs/2025-01-15/worker-logs.json.gz .
```

## Audit and Review Process

### Monthly Review

**What**: Verify log retention policies are working
**When**: First Monday of each month
**Who**: DevOps/Platform team

**Checklist**:
- [ ] Verify DEBUG logs deleted after 7 days
- [ ] Verify INFO logs archived after 30 days
- [ ] Verify ERROR logs retained for 365 days
- [ ] Check storage costs vs budget
- [ ] Review PII redaction (sample 100 logs)
- [ ] Verify Logpush job health (no errors)

**Command**:
```bash
# Check R2 bucket size by date
wrangler r2 object list autorenta-worker-logs --prefix logs/

# Verify oldest log date
wrangler r2 object list autorenta-worker-logs --prefix logs/ | head -1

# Verify newest log date
wrangler r2 object list autorenta-worker-logs --prefix logs/ | tail -1
```

### Quarterly Audit

**What**: Compliance and security audit
**When**: End of each quarter
**Who**: Security team + Legal

**Checklist**:
- [ ] Run PCI-DSS violation scan (grep for card data)
- [ ] Verify GDPR compliance (PII redaction)
- [ ] Review user deletion requests and log cleanup
- [ ] Audit access logs (who accessed what)
- [ ] Generate compliance report for management

## Implementation Checklist

- [x] Logger utilities created (Edge Functions, Workers, Angular)
- [x] ESLint rules enforce logger usage
- [x] Trace ID propagation implemented
- [ ] Cloudflare Logpush configured (see [setup guide](./cloudflare-logpush-setup.md))
- [ ] R2 bucket lifecycle rules configured
- [ ] Supabase log drain configured (when available)
- [ ] Monthly review process scheduled
- [ ] Quarterly audit process scheduled
- [ ] Team training on log search and analysis

## References

- [Cloudflare Logpush Setup Guide](./cloudflare-logpush-setup.md)
- [Centralized Logging Documentation](../guides/centralized-logging.md)
- [GDPR Compliance](https://gdpr.eu/)
- [PCI-DSS Requirements](https://www.pcisecuritystandards.org/)
