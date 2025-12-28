# AutoRenta - Webhooks Documentation

**Last Updated:** 2025-12-28

This document describes all incoming webhooks handled by AutoRenta and their configuration.

---

## Overview

| Provider | Endpoint | Purpose |
|----------|----------|---------|
| MercadoPago | `/functions/v1/mercadopago-webhook` | Payment status updates, preauth lifecycle |
| PayPal | `/functions/v1/paypal-webhook` | Order completion, payment capture |
| Internal | `/functions/v1/incident-webhook` | System incident notifications |

---

## MercadoPago Webhook

### Endpoint
```
POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/mercadopago-webhook
```

### Configuration in MercadoPago Dashboard
1. Go to: `MercadoPago Dashboard > Your Integration > Webhooks`
2. Add webhook URL: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/mercadopago-webhook`
3. Select events: `payment`

### Supported Event Types

| Event Type | Action | Description |
|------------|--------|-------------|
| `payment` | `payment.created` | Payment created |
| `payment` | `payment.updated` | Payment status changed |

### Payment Status Mapping

| MP Status | AutoRenta Action |
|-----------|------------------|
| `approved` | Confirm booking, credit wallet deposit |
| `authorized` | Update preauth intent to authorized |
| `pending` | No action (wait for update) |
| `in_process` | No action (wait for update) |
| `rejected` | Log failure, no confirmation |
| `cancelled` | Cancel preauth, release locked funds |
| `refunded` | Process refund (future) |
| `charged_back` | Log chargeback issue (future) |

### Security Features

#### 1. IP Whitelist
Authorized MercadoPago IP ranges:
```
209.225.49.0/24
216.33.197.0/24
216.33.196.0/24
```

#### 2. HMAC Signature Verification
```
Header: x-signature
Format: ts={timestamp},v1={hmac_hash}

Manifest: id:{payment_id};request-id:{x-request-id};ts:{timestamp};
Algorithm: HMAC-SHA256
Key: MERCADOPAGO_ACCESS_TOKEN
```

#### 3. Rate Limiting
- **Limit:** 100 requests/minute per IP
- **Strategy:** Database-backed sliding window
- **Fail Mode:** FAIL-CLOSED (returns 503 if rate limiter unavailable)

#### 4. Idempotency
- Uses `x-request-id` as unique event ID
- Stored in `mp_webhook_logs` table with UNIQUE constraint
- Duplicate webhooks return 200 OK silently

### Payload Format
```json
{
  "id": 123456789,
  "live_mode": true,
  "type": "payment",
  "date_created": "2025-12-28T10:00:00.000-03:00",
  "user_id": 12345678,
  "api_version": "v1",
  "action": "payment.created",
  "data": {
    "id": "987654321"
  }
}
```

### Query Parameters
```
?data.id={payment_id}&type=payment
```

### Response Codes

| Code | Meaning | MP Action |
|------|---------|-----------|
| 200 | Success | Mark delivered |
| 400 | Invalid payload | No retry |
| 401 | Missing headers | No retry |
| 403 | Invalid signature/IP | No retry |
| 429 | Rate limited | Retry later |
| 500 | Internal error | Retry (1h, 2h, 4h, 8h...) |
| 502 | MP API unavailable | Retry |
| 503 | Rate limiter error | Retry (60s) |

### Retry Policy (MercadoPago)
- Immediate retry on 5xx
- Exponential backoff: 1h, 2h, 4h, 8h
- Maximum 12 retries in 24 hours

### Flows Handled

#### 1. Wallet Deposit
```
1. User initiates deposit via Checkout Bricks
2. MP creates payment → webhook with action=payment.created
3. User completes payment → webhook with status=approved
4. Webhook calls wallet_confirm_deposit_admin RPC
5. Funds credited to user wallet
```

#### 2. Booking Payment
```
1. User pays for booking via Checkout Bricks
2. MP creates payment → webhook
3. Payment approved → webhook with status=approved
4. If marketplace split:
   → validate_and_confirm_split_payment RPC
   → Validates collector_id, amount, fee
   → Confirms booking atomically
5. If regular payment:
   → Update booking status to confirmed
```

#### 3. Preauthorization (Hold)
```
1. Create preauth → mp_payment_id stored in payment_intents
2. Webhook receives status=authorized
   → Update payment_intents.status = authorized
3. Capture preauth (later):
   → Webhook receives status=approved
   → Update payment_intents.status = captured
   → Execute capture_preauth RPC for ledger
4. Cancel preauth:
   → Webhook receives status=cancelled
   → Execute cancel_preauth RPC
   → Release locked funds
```

---

## PayPal Webhook

### Endpoint
```
POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/paypal-webhook
```

### Configuration in PayPal Developer Dashboard
1. Go to: `PayPal Developer > My Apps & Credentials > [Your App] > Webhooks`
2. Add webhook URL: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/paypal-webhook`
3. Select events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DECLINED`
   - `MERCHANT.ONBOARDING.COMPLETED`

### Supported Events

| Event | Description | Action |
|-------|-------------|--------|
| `CHECKOUT.ORDER.APPROVED` | User approved order | Update intent to authorized |
| `PAYMENT.CAPTURE.COMPLETED` | Payment captured | Confirm booking, process split |
| `PAYMENT.CAPTURE.DECLINED` | Capture failed | Mark intent as failed |
| `PAYMENT.CAPTURE.DENIED` | Capture denied | Mark intent as failed |
| `MERCHANT.ONBOARDING.COMPLETED` | Seller onboarding done | Update profile with merchant ID |

### Security Features

#### 1. Signature Verification
- Uses PayPal's webhook signature verification API
- Verifies: `paypal-transmission-id`, `paypal-transmission-time`, `paypal-cert-url`, `paypal-auth-algo`, `paypal-transmission-sig`

#### 2. Rate Limiting
- **Limit:** 100 requests/minute per IP
- **Strategy:** In-memory sliding window

#### 3. Idempotency
- Uses `event.id` as unique identifier
- Stored in memory (per-instance cache)
- Maximum 10,000 events cached

### Environment Variables Required
```
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_ENV=sandbox|live
```

### Payload Format
```json
{
  "id": "WH-XXXXX",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "event_version": "1.0",
  "create_time": "2025-12-28T10:00:00Z",
  "resource_type": "capture",
  "resource": {
    "id": "CAPTURE_ID",
    "status": "COMPLETED",
    "amount": {
      "value": "100.00",
      "currency_code": "USD"
    },
    "supplementary_data": {
      "related_ids": {
        "order_id": "ORDER_ID"
      }
    }
  },
  "summary": "Payment completed for order"
}
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 403 | Invalid signature |
| 429 | Rate limited |
| 500 | Internal error |

---

## Incident Webhook

### Endpoint
```
POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/incident-webhook
```

### Purpose
Internal webhook for system monitoring and alerting.

### Events
- Circuit breaker state changes
- Rate limit threshold alerts
- System health checks

---

## Database Tables

### mp_webhook_logs
Stores all MercadoPago webhook events for debugging and idempotency.

```sql
CREATE TABLE mp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE,              -- x-request-id (idempotency key)
  webhook_type TEXT,                 -- 'payment'
  resource_type TEXT,                -- 'payment'
  resource_id TEXT,                  -- payment ID
  payment_id TEXT,                   -- same as resource_id for payments
  booking_id UUID,                   -- linked booking (if applicable)
  payload JSONB,                     -- full webhook payload
  ip_address TEXT,                   -- source IP
  user_agent TEXT,
  received_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mp_webhook_logs_event_id ON mp_webhook_logs(event_id);
CREATE INDEX idx_mp_webhook_logs_payment_id ON mp_webhook_logs(payment_id);
CREATE INDEX idx_mp_webhook_logs_booking_id ON mp_webhook_logs(booking_id);
```

### payment_issues
Logs payment validation failures for manual review.

```sql
CREATE TABLE payment_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  transaction_id UUID,
  provider_payment_id TEXT,
  issue_type TEXT,                   -- 'amount_mismatch', 'split_validation_failed', etc.
  severity TEXT,                     -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  metadata JSONB,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Monitoring & Debugging

### View Recent Webhooks
```sql
SELECT
  event_id,
  webhook_type,
  payment_id,
  processed,
  processing_error,
  received_at
FROM mp_webhook_logs
ORDER BY received_at DESC
LIMIT 20;
```

### Find Unprocessed Webhooks
```sql
SELECT *
FROM mp_webhook_logs
WHERE processed = FALSE
  AND received_at > NOW() - INTERVAL '24 hours'
ORDER BY received_at;
```

### View Payment Issues
```sql
SELECT
  issue_type,
  severity,
  description,
  booking_id,
  detected_at
FROM payment_issues
WHERE resolved_at IS NULL
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END,
  detected_at DESC;
```

### Check Rate Limit Status
```sql
SELECT
  identifier,
  request_count,
  window_start,
  window_end
FROM rate_limit_log
WHERE endpoint = 'mercadopago-webhook'
  AND window_end > NOW()
ORDER BY request_count DESC
LIMIT 10;
```

---

## Troubleshooting

### Webhook Not Received
1. Check MP dashboard for delivery status
2. Verify endpoint URL is correct
3. Check Supabase Edge Function logs: `supabase functions logs mercadopago-webhook --follow`
4. Verify IP whitelist (production only)

### Invalid Signature
1. Verify `MERCADOPAGO_ACCESS_TOKEN` is correct and not stale
2. Check for whitespace in token
3. Verify `x-signature` and `x-request-id` headers present

### Payment Not Confirmed
1. Check `mp_webhook_logs` for processing error
2. Verify booking exists and is in `pending` status
3. Check `payment_issues` for validation failures
4. Verify amount matches expected (within 1 cent tolerance)

### Rate Limit Exceeded
1. Check for webhook replay attack
2. Verify MP is not sending duplicate notifications
3. Increase rate limit temporarily if legitimate traffic spike

---

## Testing

### Simulate MercadoPago Webhook (Development)
```bash
curl -X POST \
  'https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/mercadopago-webhook?data.id=123&type=payment' \
  -H 'Content-Type: application/json' \
  -H 'x-signature: ts=1704067200,v1=VALID_HMAC_HERE' \
  -H 'x-request-id: test-event-001' \
  -d '{
    "id": 123,
    "type": "payment",
    "action": "payment.created",
    "data": {"id": "123456789"}
  }'
```

### Test PayPal Webhook (Sandbox)
Use PayPal Developer Dashboard's webhook simulator.

---

## Related Documentation

- [CI/CD Workflow](./CI_CD_WORKFLOW.md)
- [Incident Runbook](./INCIDENT_RUNBOOK.md)
- [Postman Collection](./postman/AutoRenta-Edge-Functions.postman_collection.json)

---

*Documentation generated by Claude Code*
