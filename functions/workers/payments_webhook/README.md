# Payment Webhook Worker (LEGACY - Development Only)

⚠️ **STATUS**: This Cloudflare Worker is **NOT DEPLOYED** and **NOT USED IN PRODUCTION**

## Purpose

This worker provides a **mock webhook endpoint** for local development and testing. It allows developers to simulate payment webhooks without hitting MercadoPago's API.

## Production vs Development

| Aspect | Production | Development (This Worker) |
|--------|-----------|---------------------------|
| **System** | Supabase Edge Functions | Cloudflare Worker (local) |
| **Location** | `supabase/functions/mercadopago-webhook/` | `functions/workers/payments_webhook/` |
| **Status** | ✅ DEPLOYED & ACTIVE | ❌ LOCAL ONLY (not deployed) |
| **URL** | `https://[project].supabase.co/functions/v1/mercadopago-webhook` | `http://localhost:8787/webhooks/payments` |
| **Authentication** | MP Access Token in Supabase secrets | Not required (mock) |
| **Validation** | ✅ Signature verification | ❌ No validation |
| **Real Money** | ✅ Yes | ❌ No (simulated) |

## Why This Worker Exists

1. **Rapid Local Testing**: Test payment flows without external API calls
2. **Offline Development**: Work without internet or MP sandbox access
3. **Fast Iteration**: No need to wait for real webhook callbacks
4. **Deterministic Testing**: Control exact webhook payloads

## How to Use (Development Only)

### 1. Start the Worker Locally

```bash
cd functions/workers/payments_webhook
npm install
npm run dev
```

The worker will start at `http://localhost:8787/webhooks/payments`

### 2. Configure Frontend Environment

```typescript
// apps/web/src/environments/environment.development.ts
export const environment = {
  production: false,
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments'
};
```

### 3. Trigger Mock Webhook from Frontend

```typescript
// Only available in development
await paymentsService.markAsPaid(paymentIntentId);

// Or for bookings
await paymentsService.triggerMockPayment(bookingId, 'approved');
```

### 4. Mock Webhook Payload

```bash
curl -X POST http://localhost:8787/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mock",
    "booking_id": "booking-uuid",
    "status": "approved"
  }'
```

## Production Protection

The frontend service has guards to prevent accidental use in production:

```typescript
// apps/web/src/app/core/services/payments.service.ts
async markAsPaid(intentId: string): Promise<void> {
  if (environment.production) {
    throw new Error('markAsPaid() is deprecated in production.
                     MercadoPago webhook updates automatically.');
  }
  // ... mock logic only in development
}
```

## What This Worker Does

1. Receives POST request with mock payment data
2. Updates `payment_intents` table in Supabase
3. Updates related `bookings` or `wallet_transactions`
4. Returns success response

**It does NOT**:
- Validate real payments
- Call MercadoPago API
- Verify signatures
- Handle real money

## Migration to Production

If you need to test the REAL payment flow:

1. **Use Supabase Edge Function**: Already deployed and active
2. **MercadoPago Sandbox**: Use test credentials
3. **Local Tunnel**: Expose local Supabase function via ngrok/cloudflared

```bash
# Example: Expose local Supabase function
npx supabase functions serve mercadopago-webhook --env-file .env.local

# In another terminal, create tunnel
cloudflared tunnel --url http://localhost:54321/functions/v1/mercadopago-webhook
```

## Deployment (Not Recommended)

This worker is intentionally **NOT deployed** to Cloudflare. If you deploy it:

```bash
# Set required secrets (only for testing MP webhooks locally)
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Deploy
npm run deploy
```

**However**, you should use the Supabase Edge Function instead for any real testing.

## Files in This Directory

- `src/index.ts` - Main webhook handler (mock implementation)
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript configuration

## Related Documentation

- Production payment architecture: `/home/edu/autorenta/CLAUDE.md` (Payment Architecture section)
- Supabase webhook: `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts`
- Cash deposits fix: `/home/edu/autorenta/CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`

## Troubleshooting

**Q: Should I deploy this worker?**
A: No. Use it locally only. Production uses Supabase Edge Functions.

**Q: Why does `wrangler secret list` fail?**
A: The worker is not deployed, so no secrets exist. This is expected.

**Q: Can I test real MercadoPago with this?**
A: No. This is a mock. Use the Supabase Edge Function for real MP testing.

**Q: Is this worker used in CI/CD?**
A: No. CI/CD deploys the Supabase Edge Functions, not this worker.

---

**Last Updated**: October 2025
**Status**: Legacy development tool, not production infrastructure
