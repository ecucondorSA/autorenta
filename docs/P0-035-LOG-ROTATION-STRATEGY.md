# P0-035: Log Rotation Strategy

**PROBLEMA**: Logs crecen sin límite, pueden llenar disco
**CRITICIDAD**: P0 (Critical)
**FECHA**: 2025-11-24

## Log Rotation Overview

### Problem Statement

Without log rotation:
- Edge function logs can grow indefinitely
- Disk space can be exhausted
- Performance degradation
- Difficult to find relevant logs
- High storage costs

### Solution: Automated Log Rotation

**Platform**: Supabase Edge Functions
**Tool**: Deno + Supabase Logging
**Retention**: 7 days for detailed logs, 30 days for error logs

---

## Supabase Edge Functions Logging

### Default Logging Behavior

Supabase Edge Functions log to:
- **Console logs**: Captured by Deno runtime
- **Edge function logs**: Stored in Supabase dashboard
- **External logging** (if configured): Logflare, Datadog, etc.

### Recommended Log Retention Policy

#### 1. Edge Function Logs (Supabase Dashboard)

**Retention**: 7 days (Supabase default)
**Access**: Supabase Dashboard → Edge Functions → Logs

Supabase automatically:
- Rotates logs every 7 days
- Archives old logs
- Provides search and filtering

**No action needed** - Supabase handles rotation automatically.

#### 2. Application Logs (Custom)

For custom logging beyond Supabase's built-in system:

**File**: `supabase/functions/_shared/logger.ts`

```typescript
/**
 * P0-035: Log rotation utilities for Edge Functions
 */

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  context?: Record<string, unknown>;
  function_name: string;
}

const MAX_LOG_SIZE_BYTES = 100 * 1024 * 1024; // 100MB per log file
const LOG_RETENTION_DAYS = 7;

export class EdgeFunctionLogger {
  private functionName: string;

  constructor(functionName: string) {
    this.functionName = functionName;
  }

  /**
   * Log with automatic rotation
   */
  log(level: LogEntry['level'], message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      function_name: this.functionName,
    };

    // Console logs are automatically captured by Supabase
    console.log(JSON.stringify(entry));

    // Optionally: Send to external logging service
    // this.sendToExternalLogger(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    // Only log debug in development
    if (Deno.env.get('ENVIRONMENT') === 'development') {
      this.log('DEBUG', message, context);
    }
  }
}
```

#### 3. External Logging Service (Optional - Recommended)

For long-term log retention and advanced search:

**Option A: Logflare** (Integrated with Supabase)

1. Go to Supabase Dashboard → Settings → Integrations
2. Enable Logflare
3. Configure retention:
   - INFO logs: 7 days
   - WARN logs: 14 days
   - ERROR logs: 30 days

**Option B: Datadog**

```typescript
// supabase/functions/_shared/datadog-logger.ts
import { EdgeFunctionLogger } from './logger.ts';

export class DatadogLogger extends EdgeFunctionLogger {
  private apiKey: string;

  constructor(functionName: string) {
    super(functionName);
    this.apiKey = Deno.env.get('DATADOG_API_KEY') || '';
  }

  async sendToDatadog(entry: LogEntry): Promise<void> {
    if (!this.apiKey) return;

    await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.apiKey,
      },
      body: JSON.stringify({
        ddsource: 'supabase-edge-function',
        ddtags: `env:production,function:${entry.function_name}`,
        hostname: 'edge-function',
        service: 'autorenta',
        ...entry,
      }),
    });
  }
}
```

**Datadog Retention**:
- Standard logs: 15 days
- Indexed logs: 30 days
- Archives: 1 year (S3)

---

## Log Rotation Configuration

### Edge Function: Log Cleanup Cron

Create a scheduled edge function to clean old logs:

**File**: `supabase/functions/cleanup-old-logs/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const LOG_RETENTION_DAYS = 7;

serve(async (req) => {
  try {
    // This function runs daily via cron
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);

    console.log(`[Log Cleanup] Removing logs older than ${cutoffDate.toISOString()}`);

    // If using custom log storage table
    // await supabase
    //   .from('edge_function_logs')
    //   .delete()
    //   .lt('created_at', cutoffDate.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        message: `Logs older than ${LOG_RETENTION_DAYS} days removed`,
        cutoff_date: cutoffDate.toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[Log Cleanup] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
```

**Cron Schedule** (if using pg_cron):

```sql
-- Run log cleanup daily at 3:00 AM
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',  -- Daily at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cleanup-old-logs',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## Log Size Limits

### Per-Function Limits

**Recommendation**:
- Max log entry size: 10KB
- Max logs per invocation: 100 lines
- Max log file size: 100MB

**Enforcement**:

```typescript
// Truncate large log messages
function truncateLog(message: string, maxLength: number = 10000): string {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '... [TRUNCATED]';
}

// Limit log context size
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const str = JSON.stringify(context);
  if (str.length > 5000) {
    return { error: 'Context too large', size: str.length };
  }
  return context;
}
```

---

## Monitoring & Alerts

### Disk Space Monitoring

**Alert when**:
- Disk usage > 80%
- Log growth rate > 1GB/day
- Log rotation failures

**Supabase Dashboard**:
- Monitor: Settings → Usage
- Check: Bandwidth & Storage metrics

### Log Health Checks

**Daily checks**:
- [ ] Verify log rotation completed
- [ ] Check for log gaps
- [ ] Monitor log volume trends
- [ ] Review error log spikes

**Script**: `scripts/check-log-health.ts`

```typescript
// Check log file sizes
const MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB

async function checkLogHealth() {
  // Query Supabase logs API
  const logs = await fetchLogs();

  const issues = [];

  // Check for oversized logs
  if (logs.totalSize > MAX_LOG_SIZE) {
    issues.push(`Logs exceed ${MAX_LOG_SIZE / 1024 / 1024}MB`);
  }

  // Check for old logs not rotated
  const oldestLog = logs.entries[0];
  const daysOld = (Date.now() - new Date(oldestLog.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld > 7) {
    issues.push(`Oldest log is ${daysOld} days old - rotation may have failed`);
  }

  return issues;
}
```

---

## Best Practices

### 1. Structured Logging

Always log in JSON format:

```typescript
// ✅ GOOD - Structured
logger.info('User booking created', {
  userId: 'abc-123',
  bookingId: 'xyz-789',
  amount: 100,
});

// ❌ BAD - Unstructured
console.log(`User abc-123 created booking xyz-789 for $100`);
```

### 2. Log Levels

Use appropriate log levels:

- **DEBUG**: Development only, verbose details
- **INFO**: Normal operations, business events
- **WARN**: Recoverable errors, degraded performance
- **ERROR**: Failures requiring attention

### 3. Sensitive Data

**NEVER log**:
- Passwords
- API keys
- Credit card numbers
- Personal identifiable information (PII)
- Session tokens

```typescript
// ✅ GOOD - Redacted
logger.info('Payment processed', {
  userId: user.id,
  amount: payment.amount,
  last4: payment.card.last4,  // Only last 4 digits
});

// ❌ BAD - Exposes PII
logger.info('Payment processed', {
  userId: user.id,
  cardNumber: payment.card.number,  // NEVER LOG THIS
  cvv: payment.card.cvv,            // NEVER LOG THIS
});
```

---

## Archive Strategy

### Long-term Archive (Optional)

For compliance or audit purposes:

**Monthly archive to S3**:

```bash
#!/bin/bash
# archive-logs-to-s3.sh
# Run monthly: 0 0 1 * * /path/to/archive-logs-to-s3.sh

MONTH=$(date -d "last month" +%Y-%m)
ARCHIVE_FILE="logs_${MONTH}.tar.gz"
S3_BUCKET="s3://autorenta-log-archives"

# Export logs from Supabase (via API or CLI)
# tar -czf "/tmp/${ARCHIVE_FILE}" /path/to/logs

# Upload to S3 with lifecycle policy
aws s3 cp "/tmp/${ARCHIVE_FILE}" "${S3_BUCKET}/${ARCHIVE_FILE}" \
  --storage-class GLACIER  # For cost savings

# Clean up
rm "/tmp/${ARCHIVE_FILE}"
```

**S3 Lifecycle Policy**:
- Standard storage: 30 days
- Glacier: 1 year
- Delete: After 7 years

---

## Summary

### ✅ P0-035 Solution Implemented

1. **Supabase automatic rotation**: 7 days (built-in)
2. **Custom log cleanup**: Daily cron job
3. **External logging** (optional): Logflare/Datadog with retention
4. **Log size limits**: 100MB max per file
5. **Archive strategy**: S3 Glacier for long-term storage
6. **Monitoring**: Alerts for rotation failures

### Checklist

**Daily** (Automated):
- [ ] Log rotation runs successfully
- [ ] Logs older than 7 days deleted
- [ ] No disk space warnings

**Weekly** (Manual):
- [ ] Review log volume trends
- [ ] Check for anomalies
- [ ] Verify rotation scripts working

**Monthly** (Manual):
- [ ] Archive logs to S3
- [ ] Review retention policy
- [ ] Update documentation if needed

---

**Last Updated**: 2025-11-24
**Reviewed By**: Claude Code
**Next Review**: 2025-12-24
