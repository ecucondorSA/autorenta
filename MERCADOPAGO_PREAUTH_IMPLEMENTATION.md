# MercadoPago Preauthorization System - Complete Implementation Guide

**Status**: ✅ COMPLETE
**Date**: 2025-10-24
**Author**: Claude Code Assistant

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Details](#implementation-details)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Testing Guide](#testing-guide)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This document describes the complete implementation of MercadoPago preauthorization (card holds) for AutoRenta's booking system. A preauthorization allows us to hold funds on a customer's credit card without immediately charging them, providing a 7-day window to either capture or cancel the hold.

### Key Features

- **Hold Funds**: Authorize payment without charging (7-day hold)
- **Capture**: Convert hold to actual charge when booking is confirmed
- **Cancel**: Release hold if booking is cancelled
- **Webhook Integration**: Automatic status updates from MercadoPago
- **Ledger Accounting**: Double-entry bookkeeping in `wallet_ledger`
- **Expiry Handling**: Automatic expiry after 7 days

### Benefits

- **Better UX**: Users aren't charged until booking is confirmed
- **Fraud Protection**: Verify card validity without charging
- **Flexible Cancellation**: Easy to release funds if needed
- **Compliance**: Follows payment card industry best practices

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (Angular Components)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PaymentAuthorizationService                   │
│  - authorizePayment()   (create preauth)                       │
│  - captureAuthorization() (charge funds)                       │
│  - cancelAuthorization()  (release funds)                      │
└────────────┬──────────────────────┬─────────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐    ┌────────────────────────────┐
│  Edge Functions    │    │   Supabase Database       │
│                    │    │                            │
│  mp-create-preauth │◄───┤  payment_intents          │
│  mp-capture-preauth│    │  wallet_ledger            │
│  mp-cancel-preauth │    │  bookings                 │
└─────────┬──────────┘    └────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│      MercadoPago API                    │
│                                         │
│  POST /v1/payments (capture=false)     │
│  POST /v1/payments/{id}?capture=true   │
│  PUT  /v1/payments/{id} (cancel)       │
└─────────────┬───────────────────────────┘
              │
              ▼ (webhooks)
┌─────────────────────────────────────────┐
│   mercadopago-webhook                   │
│                                         │
│  - authorized  → update intent          │
│  - approved    → capture ledger         │
│  - cancelled   → release funds          │
│  - expired     → mark expired           │
└─────────────────────────────────────────┘
```

### Data Flow

#### 1. Create Preauthorization

```
User → PaymentAuthorizationService.authorizePayment()
  → RPC: create_payment_authorization() (creates intent in DB)
  → Edge Function: mp-create-preauth
    → MercadoPago API: POST /v1/payments (capture=false)
      → Returns: status='authorized', mp_payment_id
  → Update payment_intents: status='authorized', preauth_expires_at=(now+7d)
  → Return to user: authorizedPaymentId, expiresAt
```

#### 2. Capture Preauthorization

```
Admin/System → PaymentAuthorizationService.captureAuthorization()
  → Edge Function: mp-capture-preauth
    → MercadoPago API: POST /v1/payments/{id}?capture=true
      → Returns: status='approved'
  → Update payment_intents: status='captured'
  → RPC: capture_preauth()
    → Insert wallet_ledger: DEBIT renter, CREDIT owner
    → Update bookings: status='confirmed'
  → Return: success
```

#### 3. Cancel Preauthorization

```
User/Admin → PaymentAuthorizationService.cancelAuthorization()
  → Edge Function: mp-cancel-preauth
    → MercadoPago API: PUT /v1/payments/{id} {status: 'cancelled'}
      → Returns: status='cancelled'
  → Update payment_intents: status='cancelled'
  → RPC: cancel_preauth()
    → Update bookings: status='cancelled'
  → Return: success
```

#### 4. Webhook Events

```
MercadoPago → POST /functions/v1/mercadopago-webhook
  → Verify HMAC signature
  → Fetch payment data from MP API
  → Switch on status:
      - 'authorized'  → Update intent, no ledger yet
      - 'approved'    → Capture ledger entries
      - 'cancelled'   → Release funds, update booking
      - 'expired'     → Mark as expired
  → Return 200 OK
```

---

## Implementation Details

### Files Modified/Created

#### Edge Functions (Supabase)

1. **`supabase/functions/mp-create-preauth/index.ts`** (already existed)
   - Creates preauthorization with `capture: false`
   - Updates `payment_intents` with MP response
   - Sets `preauth_expires_at` to now + 7 days

2. **`supabase/functions/mp-capture-preauth/index.ts`** ✅ IMPLEMENTED
   - Validates intent is in 'authorized' state
   - Calls MercadoPago capture API
   - Updates `payment_intents` to 'captured'
   - Calls `capture_preauth()` RPC for ledger entries

3. **`supabase/functions/mp-cancel-preauth/index.ts`** ✅ IMPLEMENTED
   - Validates intent is in 'authorized' state
   - Calls MercadoPago cancel API
   - Updates `payment_intents` to 'cancelled'
   - Calls `cancel_preauth()` RPC to release funds

4. **`supabase/functions/mercadopago-webhook/index.ts`** ✅ UPDATED
   - Added handlers for preauth events:
     - `authorized` → Update intent
     - `approved` (from authorized) → Capture ledger
     - `cancelled` → Release funds
   - Uses existing HMAC validation

#### Database Migrations

5. **`supabase/migrations/20251024_preauth_capture_cancel_rpcs.sql`** ✅ CREATED
   - `capture_preauth(p_intent_id, p_booking_id)` - Capture RPC
   - `cancel_preauth(p_intent_id)` - Cancel RPC
   - Double-entry bookkeeping in `wallet_ledger`
   - Booking status updates

#### Frontend Services (Angular)

6. **`apps/web/src/app/core/services/payment-authorization.service.ts`** ✅ UPDATED
   - `captureAuthorization(authorizedPaymentId, amountArs?)` - NEW
   - `cancelAuthorization(authorizedPaymentId)` - UPDATED (was TODO)
   - Both methods call respective Edge Functions

---

## API Endpoints

### Create Preauthorization

**Endpoint**: `POST /functions/v1/mp-create-preauth`

**Headers**:
```
Authorization: Bearer {user_jwt_token}
Content-Type: application/json
```

**Body**:
```json
{
  "intent_id": "uuid",
  "user_id": "uuid",
  "booking_id": "uuid",
  "amount_ars": 10000,
  "amount_usd": 100,
  "card_token": "MERCADOPAGO_CARD_TOKEN",
  "payer_email": "user@example.com",
  "description": "Preautorización de garantía - AutoRenta",
  "external_reference": "booking_12345"
}
```

**Response**:
```json
{
  "success": true,
  "mp_payment_id": 123456789,
  "status": "authorized",
  "status_detail": "pending_capture",
  "intent_id": "uuid",
  "expires_at": "2025-10-31T00:00:00Z"
}
```

### Capture Preauthorization

**Endpoint**: `POST /functions/v1/mp-capture-preauth`

**Headers**:
```
Authorization: Bearer {user_jwt_token}
Content-Type: application/json
```

**Body**:
```json
{
  "intent_id": "uuid",
  "amount_ars": 10000  // Optional: partial capture
}
```

**Response**:
```json
{
  "success": true,
  "intent_id": "uuid",
  "mp_payment_id": 123456789,
  "status": "captured",
  "amount_captured_ars": 10000,
  "captured_at": "2025-10-24T12:00:00Z"
}
```

### Cancel Preauthorization

**Endpoint**: `POST /functions/v1/mp-cancel-preauth`

**Headers**:
```
Authorization: Bearer {user_jwt_token}
Content-Type: application/json
```

**Body**:
```json
{
  "intent_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "mp_payment_id": 123456789,
  "status": "cancelled",
  "status_detail": "cancelled_by_client",
  "intent_id": "uuid"
}
```

---

## Database Schema

### payment_intents Table

```sql
CREATE TABLE payment_intents (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  booking_id uuid REFERENCES bookings(id),

  mp_payment_id text UNIQUE,
  mp_status text,
  mp_status_detail text,

  intent_type text CHECK (intent_type IN ('preauth', 'charge', 'deposit')),

  amount_usd numeric(12, 2),
  amount_ars numeric(12, 2),
  amount_captured_ars numeric(12, 2),
  fx_rate numeric(12, 4),

  payment_method_id text,
  card_last4 text,
  card_holder_name text,

  is_preauth boolean DEFAULT false,
  preauth_expires_at timestamptz,

  status text CHECK (status IN (
    'pending', 'authorized', 'captured',
    'cancelled', 'expired', 'approved',
    'rejected', 'failed'
  )),

  created_at timestamptz DEFAULT now(),
  authorized_at timestamptz,
  captured_at timestamptz,
  cancelled_at timestamptz,
  expired_at timestamptz,

  metadata jsonb DEFAULT '{}'
);
```

### wallet_ledger Table

```sql
CREATE TABLE wallet_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  entry_type text CHECK (entry_type IN ('credit', 'debit')),
  amount_cents bigint,
  ref text,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

### RPC Functions

#### capture_preauth

```sql
CREATE FUNCTION capture_preauth(
  p_intent_id uuid,
  p_booking_id uuid DEFAULT NULL
) RETURNS jsonb;
```

**Logic**:
1. Validate intent is in 'captured' state
2. Get booking and extract renter/owner
3. Convert amount to cents
4. Insert DEBIT entry for renter
5. Insert CREDIT entry for owner
6. Update booking to 'confirmed'
7. Return success

#### cancel_preauth

```sql
CREATE FUNCTION cancel_preauth(
  p_intent_id uuid
) RETURNS jsonb;
```

**Logic**:
1. Validate intent is in 'cancelled' state
2. If booking exists, update to 'cancelled'
3. Release any locked funds (if implemented)
4. Return success

---

## Testing Guide

### Local Development Setup

1. **Start Services**:
```bash
# Terminal 1: Angular dev server
cd apps/web && npm run start

# Terminal 2: Supabase Edge Functions
supabase functions serve mp-create-preauth mp-capture-preauth mp-cancel-preauth mercadopago-webhook
```

2. **Apply Database Migration**:
```bash
# Option 1: Via Supabase CLI
supabase db reset

# Option 2: Direct SQL
psql $DATABASE_URL -f supabase/migrations/20251024_preauth_capture_cancel_rpcs.sql
```

3. **Set Environment Variables**:
```bash
# Supabase Edge Functions
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
supabase secrets set SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Test Cases

#### Test 1: Create Preauthorization

```bash
# Get user JWT from browser localStorage
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Create payment intent first
curl -X POST http://localhost:54321/rest/v1/rpc/create_payment_authorization \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{
    "p_user_id": "user-uuid",
    "p_booking_id": "booking-uuid",
    "p_amount_usd": 100,
    "p_amount_ars": 10000,
    "p_fx_rate": 100,
    "p_description": "Test preauth"
  }'

# Response: {"success": true, "intent_id": "uuid"}

# Create preauth via Edge Function
curl -X POST http://localhost:54321/functions/v1/mp-create-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "intent-uuid",
    "user_id": "user-uuid",
    "booking_id": "booking-uuid",
    "amount_ars": 10000,
    "amount_usd": 100,
    "card_token": "MERCADOPAGO_CARD_TOKEN",
    "payer_email": "test@test.com"
  }'

# Expected: {"success": true, "status": "authorized", "mp_payment_id": 123...}
```

#### Test 2: Capture Preauthorization

```bash
curl -X POST http://localhost:54321/functions/v1/mp-capture-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "intent-uuid",
    "amount_ars": 10000
  }'

# Expected: {"success": true, "status": "captured"}

# Verify in database
psql $DATABASE_URL -c "
  SELECT * FROM payment_intents WHERE id = 'intent-uuid';
  SELECT * FROM wallet_ledger WHERE ref = 'preauth-capture-intent-uuid' ORDER BY id;
"

# Should see:
# - payment_intents.status = 'captured'
# - 2 ledger entries: 1 debit (renter), 1 credit (owner)
```

#### Test 3: Cancel Preauthorization

```bash
curl -X POST http://localhost:54321/functions/v1/mp-cancel-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "intent-uuid"
  }'

# Expected: {"success": true, "status": "cancelled"}

# Verify in database
psql $DATABASE_URL -c "
  SELECT status, cancelled_at FROM payment_intents WHERE id = 'intent-uuid';
  SELECT status FROM bookings WHERE id = 'booking-uuid';
"

# Should see:
# - payment_intents.status = 'cancelled'
# - bookings.status = 'cancelled'
```

#### Test 4: Webhook Events

```bash
# Simulate MercadoPago webhook
curl -X POST http://localhost:54321/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": 12345,
    "live_mode": false,
    "type": "payment",
    "date_created": "2025-10-24T12:00:00Z",
    "user_id": 123,
    "api_version": "v1",
    "action": "payment.updated",
    "data": {
      "id": "123456789"
    }
  }'

# Edge Function will fetch payment details from MP API
# and process accordingly
```

### End-to-End Test Flow

```typescript
// 1. Create preauth
const authResult = await paymentAuthService.authorizePayment({
  userId: user.id,
  amountUsd: 100,
  amountArs: 10000,
  fxRate: 100,
  cardToken: 'MP_CARD_TOKEN',
  payerEmail: user.email,
  bookingId: booking.id,
}).toPromise();

expect(authResult.ok).toBe(true);
const intentId = authResult.authorizedPaymentId;

// 2. Wait for authorization (webhook or polling)
await delay(5000);

// 3. Verify authorization status
const authStatus = await paymentAuthService
  .getAuthorizationStatus(intentId)
  .toPromise();

expect(authStatus.status).toBe('authorized');

// 4. Capture preauth
const captureResult = await paymentAuthService
  .captureAuthorization(intentId)
  .toPromise();

expect(captureResult.ok).toBe(true);

// 5. Verify ledger entries
const ledgerEntries = await supabase
  .from('wallet_ledger')
  .select('*')
  .eq('ref', `preauth-capture-${intentId}`);

expect(ledgerEntries.data.length).toBe(2); // debit + credit

// 6. Verify booking confirmed
const booking = await supabase
  .from('bookings')
  .select('status')
  .eq('id', booking.id)
  .single();

expect(booking.data.status).toBe('confirmed');
```

---

## Deployment

### Edge Functions Deployment

```bash
# Deploy all preauth functions
supabase functions deploy mp-create-preauth --project-ref obxvffplochgeiclibng
supabase functions deploy mp-capture-preauth --project-ref obxvffplochgeiclibng
supabase functions deploy mp-cancel-preauth --project-ref obxvffplochgeiclibng
supabase functions deploy mercadopago-webhook --project-ref obxvffplochgeiclibng

# Verify deployment
supabase functions list --project-ref obxvffplochgeiclibng
```

### Database Migration Deployment

```bash
# Apply to production
supabase db push --db-url $PRODUCTION_DB_URL

# Or via psql
PGPASSWORD=$PROD_PASSWORD psql \
  "postgresql://postgres:$PROD_PASSWORD@$PROD_HOST:6543/postgres" \
  -f supabase/migrations/20251024_preauth_capture_cancel_rpcs.sql
```

### Environment Variables (Production)

Set via Supabase Dashboard:
- `MERCADOPAGO_ACCESS_TOKEN` - Production access token
- `SUPABASE_URL` - https://obxvffplochgeiclibng.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### Webhook URL Configuration

Configure in MercadoPago dashboard:
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

---

## Troubleshooting

### Common Issues

#### 1. "Intent not found or not authorized"

**Cause**: Trying to capture/cancel an intent that isn't in 'authorized' state.

**Solution**:
```sql
-- Check intent status
SELECT id, status, mp_payment_id FROM payment_intents WHERE id = 'intent-uuid';

-- If status is 'pending', wait for webhook or check MP API
-- If status is 'failed', check metadata for error details
```

#### 2. "MercadoPago API capture error"

**Cause**: MP API returned error (expired, already captured, insufficient funds).

**Solution**:
- Check `payment_intents.metadata.mp_capture_error`
- Verify payment still exists in MP dashboard
- Check if preauth expired (7 days limit)

#### 3. "Error creating wallet ledger entries"

**Cause**: RPC `capture_preauth` failed (missing booking, car, or owner).

**Solution**:
```sql
-- Verify booking exists
SELECT * FROM bookings WHERE id = 'booking-uuid';

-- Verify car has owner
SELECT b.id, c.owner_id
FROM bookings b
JOIN cars c ON c.id = b.car_id
WHERE b.id = 'booking-uuid';
```

#### 4. Webhook not being called

**Cause**: Webhook URL not configured in MercadoPago or HMAC validation failing.

**Solution**:
- Verify webhook URL in MP dashboard
- Check Edge Function logs: `supabase functions logs mercadopago-webhook`
- Disable HMAC validation temporarily for testing (line 184 in webhook)

### Debugging Commands

```bash
# View Edge Function logs
supabase functions logs mp-capture-preauth --project-ref obxvffplochgeiclibng
supabase functions logs mp-cancel-preauth --project-ref obxvffplochgeiclibng
supabase functions logs mercadopago-webhook --project-ref obxvffplochgeiclibng

# Check payment intent status
psql $DB_URL -c "
  SELECT
    id,
    status,
    mp_payment_id,
    mp_status,
    authorized_at,
    captured_at,
    preauth_expires_at
  FROM payment_intents
  WHERE booking_id = 'booking-uuid';
"

# Check ledger entries
psql $DB_URL -c "
  SELECT
    id,
    user_id,
    entry_type,
    amount_cents / 100.0 as amount_ars,
    ref,
    description,
    created_at
  FROM wallet_ledger
  WHERE ref LIKE 'preauth-capture-%'
  ORDER BY created_at DESC
  LIMIT 10;
"

# Check MercadoPago payment status directly
curl -X GET https://api.mercadopago.com/v1/payments/123456789 \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN"
```

### Health Checks

```sql
-- Count preauths by status
SELECT status, COUNT(*)
FROM payment_intents
WHERE is_preauth = true
GROUP BY status;

-- Find expired preauths that weren't marked
SELECT id, preauth_expires_at
FROM payment_intents
WHERE is_preauth = true
  AND status = 'authorized'
  AND preauth_expires_at < now();

-- Verify ledger balance integrity
SELECT
  user_id,
  SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END) -
  SUM(CASE WHEN entry_type = 'debit' THEN amount_cents ELSE 0 END) as balance_cents
FROM wallet_ledger
GROUP BY user_id
HAVING SUM(CASE WHEN entry_type = 'credit' THEN amount_cents ELSE 0 END) -
       SUM(CASE WHEN entry_type = 'debit' THEN amount_cents ELSE 0 END) < 0;
-- Should return empty (no negative balances)
```

---

## Next Steps

### TODO Items

1. **Expiry Monitoring Cron Job**
   - Create Edge Function `expire-preauths`
   - Run daily to mark expired preauths
   - Query: `preauth_expires_at < now() AND status = 'authorized'`

2. **Admin UI**
   - Booking detail page: Show preauth status
   - Add "Capture" button for authorized preauths
   - Add "Cancel" button for authorized preauths
   - Show expiry countdown

3. **Email Notifications**
   - Send email when preauth is created
   - Send email when preauth is captured
   - Send email when preauth is about to expire (6 days)
   - Send email when preauth expires

4. **Monitoring & Alerts**
   - Alert when capture fails
   - Alert when webhook HMAC validation fails
   - Dashboard for preauth success/failure rates

5. **Unit Tests**
   - Test Edge Functions with mock MP API
   - Test RPC functions with sample data
   - Test webhook handlers

6. **E2E Tests**
   - Full flow: create → capture → verify
   - Full flow: create → cancel → verify
   - Full flow: create → wait 7 days → verify expiry

---

## References

- **MercadoPago Payments API**: https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post
- **Preauthorizations Guide**: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/payment-management/capture-authorized-payment
- **WARP.md**: Complete architecture guide
- **CLAUDE.md**: Development patterns and conventions

---

**Implementation Complete**: All core functionality has been implemented. The system is ready for testing and deployment.
