# Flow: Payment Checkout

**Last Updated:** 2025-11-06
**Complexity:** HIGH (6 service dependencies)
**Critical Path:** YES

---

## Overview

This document traces the complete payment checkout flow from payment method selection through MercadoPago processing and booking confirmation. This flow handles three payment modes: wallet complete, credit card, and partial wallet+card splits.

---

## Entry Points

**Primary Route:** `/bookings/:bookingId/checkout`
**Component:** BookingCheckoutPage
**File:** `apps/web/src/app/features/bookings/checkout/booking-checkout.page.ts` (Lines 1-280)

**Alternative Route:** `/bookings/detail-payment?bookingId=...`
**Component:** BookingDetailPaymentPage
**File:** `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

---

## Payment Method Variations

### 1. Wallet Complete Payment

**When:** User wallet balance ≥ total booking amount

**Flow:**
```
User selects "Pay with Wallet"
  ↓
CheckoutPaymentService.processWalletPayment()
  ↓
RPC: wallet_lock_funds(bookingId, amount)
  ↓
Update booking: status='confirmed', payment_method='wallet'
  ↓
Success: Navigate to /bookings/{bookingId}?payment=success
```

**File:** `apps/web/src/app/core/services/checkout-payment.service.ts` (Lines 70-153)

**Database Operations:**
- `wallet_transactions`: INSERT lock transaction
- `user_wallets`: UPDATE locked_balance += amount
- `bookings`: UPDATE status='confirmed', payment_method='wallet'

### 2. Credit Card Payment (MercadoPago)

**When:** User selects credit/debit card

**Flow:**
```
User selects "Pay with Card"
  ↓
CheckoutPaymentService.processCreditCardPayment()
  ↓
PaymentsService.createIntent() → payment_intents INSERT
  ↓
MercadoPagoBookingGatewayService.createPreference()
  ↓
Edge Function: mercadopago-create-booking-preference
  ↓
MercadoPago API: POST /checkout/preferences
  ↓
Redirect user to MercadoPago checkout (init_point URL)
  ↓
User completes payment on MercadoPago
  ↓
MercadoPago sends IPN webhook
  ↓
Edge Function: mercadopago-webhook processes payment
  ↓
Update booking: status='confirmed', payment_provider='mercadopago'
  ↓
Redirect user back to app
```

**File:** `apps/web/src/app/core/services/checkout-payment.service.ts` (Lines 164-200)

### 3. Partial Wallet + Card Split (30/70)

**When:** User wallet balance < total amount AND >= 30%

**Flow:**
```
User balance check: 30% ≤ balance < 100%
  ↓
Split calculation:
  - Wallet portion: user balance (capped at total)
  - Card portion: remaining amount
  ↓
CheckoutPaymentService.processPartialWalletPayment()
  ↓
RPC: wallet_lock_funds(bookingId, walletPortion)
  ↓
Create MercadoPago preference for card portion
  ↓
Redirect to MercadoPago for remaining amount
  ↓
Webhook confirms card payment
  ↓
Booking confirmed with both payment methods
```

**File:** `apps/web/src/app/core/services/checkout-payment.service.ts` (Lines 212-277)

---

## Service Layer Orchestration

### CheckoutPaymentService Dependencies

**File:** `apps/web/src/app/core/services/checkout-payment.service.ts`

```typescript
private readonly bookingsService = inject(BookingsService);
private readonly paymentsService = inject(PaymentsService);
private readonly mpGateway = inject(MercadoPagoBookingGatewayService);
private readonly riskCalculator = inject(RiskCalculatorService);
private readonly supabaseService = inject(SupabaseClientService);
private readonly logger = inject(LoggerService);
```

**Total Dependencies:** 6

### PaymentGatewayFactory

**File:** `apps/web/src/app/core/services/payment-gateway-factory.service.ts`

**Purpose:** Routes payment provider selection

```typescript
getGateway(provider: 'mercadopago' | 'paypal'): PaymentGateway {
  switch (provider) {
    case 'mercadopago':
      return this.mercadoPagoGateway;
    case 'paypal':
      return this.paypalGateway;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

---

## External API Integration - MercadoPago

### Edge Function: mercadopago-create-booking-preference

**File:** `supabase/functions/mercadopago-create-booking-preference/index.ts` (Lines 38-677)

#### Processing Steps (9 steps)

**Step 1: Validation (Lines 81-93)**
- Validate required fields: booking_id, amount
- Return 400 if missing

**Step 2: Authorization (Lines 99-168)**
- Extract JWT from Authorization header
- Verify user authenticated via `supabase.auth.getUser()`
- Fetch booking record
- **SECURITY:** Verify booking belongs to authenticated user
- Return 403 if ownership violation

**Step 3: Idempotency Check (Lines 186-209)**
- Check if preference_id already exists in booking metadata
- If exists: return existing init_point (avoid duplicate charges)

**Step 4: Exchange Rate Snapshot (Lines 211-217)**
- Fetch current FX rate for multimoneda support
- Store in booking for consistent pricing

**Step 5: Customer Creation (Lines 223-293)**
- Check if user has `mercadopago_customer_id`
- If not: Create customer via MercadoPago API
- Save customer_id to profiles table

**Step 6: Marketplace Split Calculation (Lines 295-308)**
- Calculate platform commission (e.g., 10%)
- Calculate owner payout (90%)
- **CRITICAL:** Uses marketplace_application_id for split

**Step 7: Preference Creation (Lines 310-407)**
```typescript
const preferenceData = {
  items: [{
    id: booking_id,
    title: `Reserva ${car.brand} ${car.model}`,
    quantity: 1,
    unit_price: totalAmount,
    currency_id: 'ARS'  // Argentina uses ARS
  }],
  back_urls: {
    success: `${APP_BASE_URL}/bookings/${booking_id}?payment=success`,
    failure: `${APP_BASE_URL}/bookings/${booking_id}?payment=failure`,
    pending: `${APP_BASE_URL}/bookings/${booking_id}?payment=pending`
  },
  auto_return: 'approved',
  external_reference: booking_id,
  notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
  marketplace: {
    application_fee: platformFee
  }
}
```

**Step 8: MercadoPago API Call (Lines 412-419)**
```typescript
POST https://api.mercadopago.com/checkout/preferences
Headers:
  Authorization: Bearer {MP_ACCESS_TOKEN}
  Content-Type: application/json
Body: preferenceData
```

**Step 9: Store Preference ID (Lines 431-443)**
- Update booking with preference_id and init_point
- Return init_point URL to frontend

---

## Webhook Processing - mercadopago-webhook

**File:** `supabase/functions/mercadopago-webhook/index.ts` (Lines 126-670)

### Security Layers

**Layer 1: IP Validation (Lines 160-183)**
- Check request IP against MercadoPago IP ranges
- Reject unauthorized IPs in production
- Allow all IPs in development

**Layer 2: Rate Limiting (Lines 189-215)**
- Max 100 requests per minute per IP
- Return 429 with Retry-After header if exceeded

**Layer 3: HMAC Signature Validation (Lines 266-342)**
```typescript
// Extract signature from headers
const xSignature = req.headers.get('x-signature');
const xRequestId = req.headers.get('x-request-id');

// Parse signature parts
const ts = signatureParts['ts'];
const hash = signatureParts['v1'];

// Calculate HMAC-SHA256
const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
const calculatedHash = await crypto.subtle.sign('HMAC', cryptoKey, manifest);

// Verify signature matches
if (calculatedHash !== hash) {
  return 403 Forbidden;
}
```

### Payment Processing Steps

**Step 1: Webhook Type Filter (Lines 352-361)**
- Only process `type === 'payment'`
- Ignore other webhook types (merchant_order, etc.)

**Step 2: Fetch Payment Details (Lines 368-431)**
```typescript
GET https://api.mercadopago.com/v1/payments/{paymentId}
Headers:
  Authorization: Bearer {MP_ACCESS_TOKEN}
```

**Step 3: Status Validation (Lines 640-654)**
- Only process `status === 'approved'`
- Ignore pending/rejected payments
- Return 200 for non-approved (idempotent)

**Step 4: Extract Reference (Lines 656-662)**
- Get booking_id from `external_reference` field
- This links payment back to booking

**Step 5: Update Booking (Lines 668-905)**
```typescript
UPDATE bookings
SET status = 'confirmed',
    payment_provider = 'mercadopago',
    payment_provider_id = paymentId,
    payment_status = 'approved',
    confirmed_at = NOW()
WHERE id = booking_id
```

**Step 6: Marketplace Split Validation**
- Verify `application_fee` matches expected platform commission
- Verify `collector` (car owner) receives correct amount
- Log discrepancies for manual review

---

## Database Operations

### Tables Modified

**1. bookings table**

Fields updated during payment:
- `status`: 'pending' → 'confirmed'
- `payment_method`: 'wallet' | 'card' | 'split'
- `payment_provider`: 'mercadopago' | 'paypal'
- `payment_provider_id`: External payment ID
- `payment_status`: 'approved' | 'pending' | 'rejected'
- `confirmed_at`: TIMESTAMPTZ

**2. payment_intents table**

Record created before payment:
- `booking_id`: UUID
- `amount`: NUMERIC
- `currency`: TEXT
- `status`: 'pending' → 'completed' | 'failed'
- `provider`: 'mercadopago'
- `provider_payment_id`: External ID after completion
- `metadata`: JSONB (preference_id, init_point)

**3. user_wallets table**

For wallet payments:
- `locked_balance`: Incremented during lock
- `available_balance`: Decremented after confirmation

**4. wallet_transactions table**

Records created:
- Type: 'lock' (when funds locked)
- Type: 'charge' (when booking confirmed)
- Type: 'unlock' (if booking cancelled)

---

## Success Paths

### Success: Wallet Complete

```
1. User: Clicks "Pay with Wallet"
2. Frontend: CheckoutPaymentService.processWalletPayment()
3. RPC: wallet_lock_funds(booking_id, amount)
4. Database: wallet_transactions INSERT, user_wallets UPDATE
5. Database: bookings UPDATE status='confirmed'
6. Frontend: Navigate to /bookings/{id}?payment=success
7. UI: Show "Payment Successful" message
```

### Success: Credit Card

```
1. User: Clicks "Pay with Card"
2. Frontend: Create payment intent
3. Edge Function: Create MercadoPago preference
4. MercadoPago API: Return init_point URL
5. Frontend: Redirect user to init_point
6. User: Completes payment on MercadoPago
7. MercadoPago: Sends IPN webhook
8. Edge Function: Validates and processes webhook
9. Database: bookings UPDATE status='confirmed'
10. MercadoPago: Redirects user back to app
11. Frontend: /bookings/{id}?payment=success
12. UI: Show "Payment Successful" message
```

### Success: Partial Wallet + Card

```
1. User: Automatically routed to split flow
2. Frontend: Lock wallet portion (30%)
3. Frontend: Create preference for card portion (70%)
4. MercadoPago: User pays remaining 70%
5. Webhook: Confirms card payment
6. Database: Charge wallet + update booking
7. Frontend: Redirect to success page
```

---

## Error Paths

### Error: Insufficient Wallet Balance

```
User: Clicks "Pay with Wallet"
  ↓
CheckoutPaymentService checks balance
  ↓
wallet_balance < booking.total_amount
  ↓
Error: "Saldo insuficiente. Deposita $XX o usa tarjeta."
  ↓
UI: Show deposit button + card payment option
```

### Error: Booking Not Found

```
CheckoutPaymentService.processPayment(bookingId)
  ↓
BookingsService.getBookingById(bookingId)
  ↓
Supabase query returns empty
  ↓
Error: "Reserva no encontrada"
  ↓
Navigate to /bookings list
```

### Error: MercadoPago API Failure

```
Edge Function: Create preference
  ↓
POST https://api.mercadopago.com/checkout/preferences
  ↓
Response: 500 Internal Server Error
  ↓
Edge Function: Throw error
  ↓
Frontend: Show "Error al procesar pago. Intenta nuevamente."
  ↓
User: Can retry payment
```

### Error: Invalid Webhook Signature

```
Webhook received
  ↓
HMAC signature validation
  ↓
Calculated hash ≠ provided hash
  ↓
Return 403 Forbidden
  ↓
MercadoPago: Retries webhook (exponential backoff)
```

---

## Critical Security Features

1. **Authorization:** JWT token validated before preference creation
2. **Ownership:** User can only pay for their own bookings
3. **Signature Validation:** HMAC-SHA256 verified on webhooks
4. **Rate Limiting:** Max 100 webhooks per minute per IP
5. **IP Validation:** Only authorized MercadoPago IPs accepted
6. **Idempotency:** Duplicate payments detected and ignored
7. **Status Validation:** Only "approved" payments processed
8. **RLS Policies:** Users can only view own bookings/payments

---

## File References

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| **UI Entry** | `apps/web/src/app/features/bookings/checkout/booking-checkout.page.ts` | 1-280 | Payment checkout page |
| **Service Orchestrator** | `apps/web/src/app/core/services/checkout-payment.service.ts` | 70-371 | Payment flow orchestration |
| **Payment Intent** | `apps/web/src/app/core/services/payments.service.ts` | 47-262 | Payment intent creation |
| **MercadoPago Gateway** | `apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts` | 43-94 | MercadoPago preference creation |
| **Edge Function: Preference** | `supabase/functions/mercadopago-create-booking-preference/index.ts` | 38-677 | Creates MercadoPago preference |
| **Edge Function: Webhook** | `supabase/functions/mercadopago-webhook/index.ts` | 126-670 | Processes MercadoPago IPN |
| **Wallet Operations** | `apps/web/src/app/core/services/wallet.service.ts` | 136-172 | Wallet lock/charge/unlock |

---

## Related Documentation

- **Booking Creation:** See `docs/flows/FLOW_BOOKING_CREATION.md`
- **Wallet Deposits:** See `docs/flows/FLOW_WALLET_DEPOSIT.md`
- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Boundaries:** See `docs/architecture/DOMAIN_BOUNDARIES.md`

---

**Last Verified:** 2025-11-06
