# Cloudflare Logpush Setup Guide

**Part of Issue #120 - Centralized Logging Infrastructure**

Cloudflare Logpush enables you to send logs from Cloudflare Workers to external storage for long-term retention and analysis.

## Prerequisites

- **Cloudflare Account Plan**: Logpush requires a **Workers Paid plan** ($5/month minimum)
- **Destination Storage**: Choose one of:
  - Amazon S3
  - Google Cloud Storage
  - Azure Blob Storage
  - Cloudflare R2 (recommended - no egress fees)
  - Supabase Storage
  - HTTP endpoint (generic)

## Supported Log Fields

Our structured logger outputs the following fields:

```json
{
  "level": "INFO|WARN|ERROR|DEBUG",
  "timestamp": "2025-11-07T10:30:45.123Z",
  "service": "worker",
  "worker": "payments-webhook",
  "trace_id": "req-abc123-xyz",
  "message": "Payment processed successfully",
  "context": "PaymentProcessor",
  "data": { /* structured data */ },
  "error": { /* error details */ },
  "metadata": { /* custom metadata */ }
}
```

## Option 1: Cloudflare R2 (Recommended)

### Why R2?
- **No egress fees** (unlike S3)
- **Native Cloudflare integration**
- **S3-compatible API**
- **$0.015/GB/month storage**

### Setup Steps

#### 1. Create R2 Bucket

```bash
# Using Wrangler CLI
wrangler r2 bucket create autorenta-worker-logs

# Or via Cloudflare Dashboard:
# Dashboard → R2 → Create Bucket → "autorenta-worker-logs"
```

#### 2. Create Logpush Job

```bash
# Configure Logpush to R2
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "autorenta-worker-logs",
    "destination_conf": "r2://autorenta-worker-logs/logs/{DATE}",
    "dataset": "workers_trace_events",
    "logpull_options": "fields=EventTimestampMs,Outcome,ScriptName,Logs,Exceptions&timestamps=rfc3339",
    "enabled": true
  }'
```

**Field Descriptions:**
- `EventTimestampMs`: Timestamp when event occurred
- `Outcome`: Request outcome (ok, exception, exceeded_cpu, etc.)
- `ScriptName`: Worker name (e.g., "payments_webhook")
- `Logs`: Array of console.log outputs (our JSON logs)
- `Exceptions`: Array of uncaught exceptions

#### 3. Verify Logpush Job

```bash
# List all Logpush jobs
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}"

# Get specific job details
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs/{job_id}" \
  -H "Authorization: Bearer {api_token}"
```

#### 4. Access Logs

```bash
# List log files
wrangler r2 object list autorenta-worker-logs

# Download a specific log file
wrangler r2 object get autorenta-worker-logs/logs/2025-11-07/payments_webhook.log
```

## Option 2: Amazon S3

### Setup Steps

#### 1. Create S3 Bucket

```bash
aws s3 mb s3://autorenta-worker-logs --region us-east-1
```

#### 2. Configure IAM Policy

Create an IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::autorenta-worker-logs/*"
    }
  ]
}
```

#### 3. Create Logpush Job

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "autorenta-worker-logs-s3",
    "destination_conf": "s3://autorenta-worker-logs/logs/{DATE}?region=us-east-1&access_key_id={access_key}&secret_access_key={secret_key}",
    "dataset": "workers_trace_events",
    "logpull_options": "fields=EventTimestampMs,Outcome,ScriptName,Logs,Exceptions&timestamps=rfc3339",
    "enabled": true
  }'
```

## Option 3: Supabase Storage

Store logs directly in your Supabase project's storage.

### Setup Steps

#### 1. Create Supabase Bucket

```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('worker-logs', 'worker-logs', false);
```

#### 2. Configure RLS Policy

```sql
-- Allow service role to write logs
CREATE POLICY "Service role can write worker logs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'worker-logs');

-- Allow admins to read logs
CREATE POLICY "Admins can read worker logs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'worker-logs' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

#### 3. Create HTTP Endpoint Worker

Since Supabase doesn't support direct Logpush, create a Cloudflare Worker to receive logs and forward to Supabase Storage:

```typescript
// functions/workers/logpush-forwarder/src/index.ts
import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Verify request is from Cloudflare Logpush
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${env.LOGPUSH_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const logs = await request.json();

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const timestamp = new Date().toISOString();
    const filename = `logs/${timestamp.split('T')[0]}/worker-logs-${Date.now()}.json`;

    await supabase.storage
      .from('worker-logs')
      .upload(filename, JSON.stringify(logs, null, 2), {
        contentType: 'application/json',
      });

    return new Response('OK', { status: 200 });
  },
};
```

#### 4. Configure Logpush to HTTP Endpoint

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "autorenta-worker-logs-supabase",
    "destination_conf": "https://logpush-forwarder.your-domain.workers.dev?header_Authorization=Bearer%20{logpush_secret}",
    "dataset": "workers_trace_events",
    "logpull_options": "fields=EventTimestampMs,Outcome,ScriptName,Logs,Exceptions&timestamps=rfc3339",
    "enabled": true
  }'
```

## Log Retention Policies

Configure lifecycle policies based on your storage choice:

### R2 Lifecycle Rules

```bash
# Via Wrangler (when supported) or Dashboard
# R2 → autorenta-worker-logs → Lifecycle Rules

# Example policy (configure via Dashboard):
# - Delete DEBUG logs after 7 days
# - Delete INFO logs after 30 days
# - Delete WARN logs after 90 days
# - Keep ERROR logs for 365 days
# - Archive after 90 days (move to Glacier)
```

### S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "Id": "Delete debug logs after 7 days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 7
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

Apply via AWS CLI:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket autorenta-worker-logs \
  --lifecycle-configuration file://lifecycle-policy.json
```

## Searching and Querying Logs

### Using AWS Athena (for S3)

```sql
-- Create table for log queries
CREATE EXTERNAL TABLE worker_logs (
  EventTimestampMs BIGINT,
  Outcome STRING,
  ScriptName STRING,
  Logs ARRAY<STRUCT<level:STRING, message:STRING, timestamp:STRING, trace_id:STRING, data:STRING>>,
  Exceptions ARRAY<STRING>
)
STORED AS JSON
LOCATION 's3://autorenta-worker-logs/logs/';

-- Query logs
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

### Using Supabase SQL (for Supabase Storage)

```sql
-- Download and query logs (requires custom function)
-- TODO: Implement log search function
```

### Using Cloudflare Logpull API (No Logpush required)

For immediate querying without Logpush:

```bash
# Get logs from last hour
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/logs/received?start=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)&end=$(date -u +%Y-%m-%dT%H:%M:%SZ)&fields=EventTimestampMs,Outcome,ScriptName,Logs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json"
```

**Note:** Logpull API only retains logs for **72 hours**. Use Logpush for long-term retention.

## Cost Estimates

### R2 (Recommended)
- **Storage**: $0.015/GB/month
- **Class A Operations** (writes): $4.50 per million
- **Class B Operations** (reads): $0.36 per million
- **Egress**: FREE (within Cloudflare)

**Example**: 10GB logs/month, 1M writes = $0.15 + $4.50 = **~$4.65/month**

### S3
- **Storage**: $0.023/GB/month (Standard)
- **PUT requests**: $0.005 per 1,000
- **Egress**: $0.09/GB (to internet)

**Example**: 10GB logs/month, 1M writes = $0.23 + $5.00 + $0.90 = **~$6.13/month**

### Supabase Storage
- **Free tier**: 1GB storage
- **Pro**: $25/month (includes 100GB storage)

## Monitoring Logpush Health

```bash
# Check job status
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs/{job_id}" \
  -H "Authorization: Bearer {api_token}"

# Check for errors
# Look for "enabled": true and "last_error": null
```

## Troubleshooting

### Logs not appearing in destination

1. **Check job status**:
   ```bash
   curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs/{job_id}"
   ```

2. **Verify credentials**: Ensure destination credentials are correct

3. **Check bucket permissions**: Ensure Cloudflare can write to destination

4. **Wait for batching**: Logs are batched and sent every 30 seconds to 5 minutes

### Invalid JSON in logs

- Ensure your logger always outputs valid JSON
- Check for unescaped characters in log messages

### Missing trace IDs

- Ensure trace ID interceptor is registered in app.config.ts
- Verify `fromRequest()` is called in Workers/Edge Functions

## Next Steps

1. Choose a storage destination (R2 recommended for cost)
2. Create Logpush job using the appropriate API call
3. Verify logs are being written (wait 5-10 minutes)
4. Set up log retention policies
5. Configure log search/analysis tools

## References

- [Cloudflare Logpush Documentation](https://developers.cloudflare.com/logs/get-started/enable-destinations/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Workers Trace Events Dataset](https://developers.cloudflare.com/logs/reference/log-fields/account/workers_trace_events/)
