# AUTORENTA PAYMENT CHECKOUT FLOW - COMPLETE TRACE
**Updated: 2025-11-06 | Comprehensive Analysis**

---

## TABLE OF CONTENTS
1. [Entry Points](#entry-points)
2. [UI Layer - Component Flow](#ui-layer---component-flow)
3. [Service Layer - Orchestration](#service-layer---orchestration)
4. [Payment Methods & Variations](#payment-methods--variations)
5. [Database Operations](#database-operations)
6. [External APIs - MercadoPago](#external-apis---mercadopago)
7. [Webhook Handling](#webhook-handling)
8. [Success & Error Paths](#success--error-paths)
9. [Database Schema](#database-schema)

---

## ENTRY POINTS

### Route Definition
```
/bookings/:bookingId/checkout
```

### Component
```
File: /home/user/autorenta/apps/web/src/app/features/bookings/pages/booking-checkout/booking-checkout.page.ts
Lines: 1-280
```

### Alternative: Booking Detail Payment Page
```
File: /home/user/autorenta/apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts
Lines: 1-100+
Purpose: Full payment page with additional options (wallet, card, split payment)
```

---

## UI LAYER - COMPONENT FLOW

### 1. BOOKING CHECKOUT PAGE (Primary Entry)

**File:** `/home/user/autorenta/apps/web/src/app/features/bookings/pages/booking-checkout/booking-checkout.page.ts`

#### Key Signals (Angular Standalone):
```typescript
// Line 49-99
bookingId = signal<string>('');              // Booking ID from route params
booking = signal<any>(null);                 // Booking details from DB
selectedProvider = signal<PaymentProvider>('mercadopago');  // MercadoPago | PayPal
amountInProviderCurrency = signal<number>(0); // Amount in provider's currency (ARS/USD)
providerCurrency = signal<string>('ARS');    // ARS for MercadoPago, USD for PayPal
isLoading = signal<boolean>(true);           // Initial data loading
isProcessingPayment = signal<boolean>(false); // Payment processing state
mercadoPagoPreferenceId = signal<string>(''); // MP preference ID
mercadoPagoInitPoint = signal<string>('');   // MP checkout URL
```

#### Lifecycle (ngOnInit):
```typescript
// Line 131-151
1. Extract bookingId from route params (line 133)
2. Validate bookingId exists (line 134-138)
3. Call loadBooking() (line 143)
4. Handle errors
5. Set isLoading to false (line 149)
```

#### loadBooking() Method:
```typescript
// Line 158-175
1. Call BookingsService.getBookingById(bookingId) ← DATABASE QUERY
2. Validate booking exists (line 163-164)
3. Validate booking.status === 'pending' (line 168-171)
   - Only pending bookings can be paid
4. Store booking in signal (line 174)
```

#### Provider Selection:
```typescript
// Line 180-194: handleProviderChange()
- Receives event from PaymentProviderSelectorComponent
- Updates selectedProvider signal
- Updates amountInProviderCurrency (includes currency conversion if needed)
- Updates providerCurrency
- Clears previous MercadoPago preference (idempotency)
```

#### Payment Button Click Handlers:

**MercadoPago Payment:**
```typescript
// Line 199-230: handleMercadoPagoPayment()
1. Check if button is enabled (line 200)
2. Set isProcessingPayment = true (line 202)
3. Create gateway via factory (line 206)
   ↓ PaymentGatewayFactory.createBookingGateway('mercadopago')
4. Call gateway.createBookingPreference(bookingId, true) (line 209-210)
   ↓ MercadoPagoBookingGatewayService.createBookingPreference()
5. Validate response has success, init_point (line 213-215)
6. Store preference_id in signal (line 217)
7. Store init_point in signal (line 218)
8. REDIRECT to MercadoPago checkout (line 221)
   ↓ window.location.href = init_point
9. On error: Set error message, set isProcessingPayment = false (line 222-228)
```

**PayPal Payment:**
```typescript
// Line 235-249: handlePayPalApprove()
- Receives PayPal orderId and captureId
- Navigate to confirmation page with query params
```

### 2. PAYMENT PROVIDER SELECTOR COMPONENT

**File:** `/home/user/autorenta/apps/web/src/app/shared/components/payment-provider-selector/payment-provider-selector.component.ts`

#### Purpose:
- Display available payment providers (MercadoPago, PayPal)
- Show currency and exchange rates
- Allow user selection

#### Inputs:
```typescript
@Input() amount: number;           // Booking amount
@Input() currency: 'USD'|'ARS';    // Original currency
@Input() defaultProvider: PaymentProvider;
```

#### Outputs:
```typescript
@Output() providerChange = EventEmitter<{
  provider: PaymentProvider;
  amountInProviderCurrency: number;
  providerCurrency: string;
}>();
```

---

## SERVICE LAYER - ORCHESTRATION

### 1. PAYMENT GATEWAY FACTORY

**File:** `/home/user/autorenta/apps/web/src/app/core/services/payment-gateway.factory.ts`

```typescript
createBookingGateway(provider: PaymentProvider): PaymentGateway {
  switch (provider) {
    case 'mercadopago':
      return inject(MercadoPagoBookingGatewayService);
    case 'paypal':
      return inject(PayPalBookingGatewayService);
  }
}
```

### 2. MERCADOPAGO BOOKING GATEWAY SERVICE

**File:** `/home/user/autorenta/apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts`

#### createBookingPreference():
```typescript
// Line 43-49
Input: bookingId: string, useSplitPayment?: boolean
Returns: Observable<MercadoPagoPreferenceResponse>

1. Convert to promise using from()
2. Call _createPreference(bookingId, useSplitPayment)
3. Catch errors with formatError()
```

#### _createPreference() Implementation:
```typescript
// Line 54-94
1. Get Supabase client (line 55)
2. Get session/token (line 58-60)
3. Get Supabase URL (line 67)
4. Build Edge Function URL: 
   ${supabaseUrl}/functions/v1/mercadopago-create-booking-preference
5. Fetch POST request with:
   - Headers: Authorization Bearer token
   - Body: { booking_id: bookingId }
6. Validate response.ok (line 80)
7. Parse response as MercadoPagoPreferenceResponse (line 87)
8. Validate data.success && data.init_point (line 89-91)
9. Return { preference_id, init_point, amount_ars, amount_usd, exchange_rate }
```

### 3. CHECKOUT PAYMENT SERVICE

**File:** `/home/user/autorenta/apps/web/src/app/core/services/checkout-payment.service.ts`

#### Purpose:
Orchestrates complete payment processing with three payment flow variations.

#### Three Payment Flows:

**Flow 1: Wallet Complete Payment**
```typescript
// Line 70-153: processWalletPayment()

Input:
  - bookingId: string
  - totalCents: number (booking total in cents)
  - securityCreditCents: number (security deposit in cents)

Process:
1. Get wallet balance (line 84)
   ↓ RPC: wallet_get_balance(p_user_id)
2. Validate balance >= totalCents + securityCreditCents (line 86-94)
3. Lock wallet funds (line 99)
   ↓ RPC: wallet_lock_funds(p_user_id, p_booking_id, p_amount_cents)
4. Update booking to 'confirmed' (line 106-111)
   ↓ BookingsService.updateBooking()
5. Create payment intent (line 117-125)
   ↓ PaymentsService.createPaymentIntentWithDetails()
6. Return success response (line 133-137)

Error Handling (Rollback):
- If any step fails, call rollbackTransaction() (line 141-150)
- Unlock funds if locked (line 351)
- Revert booking to 'pending' if updated (line 360)
```

**Flow 2: Credit Card Payment**
```typescript
// Line 164-200: processCreditCardPayment()

Input:
  - bookingId: string
  - totalCents: number (ignored in card flow)

Process:
1. Update booking to 'pending_payment' (line 173-176)
   ↓ BookingsService.updateBooking()
2. Create MercadoPago preference (line 183)
   ↓ MercadoPagoBookingGatewayService.createBookingPreference()
3. Extract init_point from response (line 186)
4. Return with mercadoPagoInitPoint (line 186-191)
5. Frontend redirects to init_point (MercadoPago checkout)

After Payment:
- MercadoPago webhook confirms payment
- Updates payment_intents table
- Updates booking to 'confirmed'
```

**Flow 3: Partial Wallet + Card (30/70 Split)**
```typescript
// Line 212-277: processPartialWalletPayment()

Input:
  - bookingId: string
  - totalCents: number
  - securityCreditCents: number

Process:
1. Calculate partial amount: 30% of totalCents (line 224)
2. Get wallet balance (line 227)
3. Validate balance >= partialCents + securityCreditCents (line 229-236)
4. Lock partial funds in wallet (line 242)
5. Update booking to 'pending_payment' (line 249-253)
   (Note: payment_method = 'partial_wallet')
6. Create MercadoPago preference for remaining 70% (line 260)
7. Return init_point for user to redirect to MercadoPago
8. User completes card payment for remaining 70%
9. Webhook confirms payment and completes transaction

Error Handling:
- Rollback on any failure (line 271-275)
```

#### Private Helper Methods:
```typescript
// Line 282-297: getWalletBalance()
- Calls RPC: wallet_get_balance(p_user_id)
- Returns balance in cents

// Line 302-317: lockWalletFunds()
- Calls RPC: wallet_lock_funds()
- Locks funds for booking

// Line 322-339: unlockWalletFunds()
- Calls RPC: wallet_unlock_funds()
- Used for rollback

// Line 344-371: rollbackTransaction()
- Unlocks any locked funds
- Reverts booking to 'pending'
```

### 4. BOOKINGS SERVICE

**File:** `/home/user/autorenta/apps/web/src/app/core/services/bookings.service.ts`

#### getBookingById():
```typescript
// Line 133-206
1. Query 'my_bookings' view with booking ID (line 134-138)
2. Load car details if car_id exists (line 150-168)
3. Load insurance coverage if exists (line 170-203)
4. Return full booking with relationships
```

#### updateBooking():
```typescript
// Line 223-233
Input: bookingId: string, updates: Partial<Booking>

1. Update bookings table with partial data (line 224-228)
2. Return updated booking
```

#### Common Fields Updated During Checkout:
- `status`: 'pending' → 'pending_payment' → 'confirmed'
- `payment_method`: 'wallet' | 'credit_card' | 'partial_wallet'

### 5. PAYMENTS SERVICE

**File:** `/home/user/autorenta/apps/web/src/app/core/services/payments.service.ts`

#### createIntent():
```typescript
// Line 47-99
Input: bookingId: string
Returns: Promise<PaymentIntent>

1. Query booking (line 49-53)
   - Get: id, total_amount, currency, renter_id
2. Get current FX rate USD→ARS (line 66)
3. Calculate amounts:
   - If ARS: use directly, calculate USD equivalent
   - If USD: convert to ARS using FX rate
4. Insert into payment_intents table (line 77-91)
   - status: 'pending'
   - intent_type: 'booking'
5. Return PaymentIntent with id, amount_usd, amount_ars, fx_rate
```

#### createPaymentIntentWithDetails():
```typescript
// Line 179-196
Input: {
  booking_id: string
  payment_method: string
  amount_cents: number
  status: string
}

1. Insert into payment_intents (line 185-191)
   - provider: determined from payment_method
   - status: from input
2. Return inserted PaymentIntent
```

### 6. RISK CALCULATOR SERVICE

**File:** `/home/user/autorenta/apps/web/src/app/core/services/risk-calculator.service.ts`

#### Purpose:
Calculate guarantees (holds and security credits) based on vehicle value and payment method.

#### Key Calculations:
```typescript
- Franchise (USD): Based on vehicle value
  - ≤$10K: $1000
  - ≤$20K: $1500
  - ≤$40K: $2000
  - >$40K: $2500

- Hold/Guarantee (ARS): For card payments
  - 35% of rollover deductible
  - Minimum per bucket (economy/standard/premium/luxury)
  - Converted to ARS using FX rate

- Security Credit (USD): For wallet payments
  - ≤$20K vehicle: $300
  - >$20K vehicle: $500
```

---

## PAYMENT METHODS & VARIATIONS

### Method 1: Wallet Complete
- **Precondition:** User has sufficient wallet balance
- **Process:** Lock wallet funds → Update booking → Create intent → Confirm immediately
- **Status Flow:** pending → confirmed (immediate)
- **DB Operations:**
  - wallet_lock_funds()
  - bookings.update(status='confirmed', payment_method='wallet')
  - payment_intents.insert(status='succeeded')

### Method 2: Credit Card (MercadoPago)
- **Precondition:** User selects card payment
- **Process:** Create MP preference → Redirect to checkout → User completes payment → Webhook confirms
- **Status Flow:** pending → pending_payment → confirmed (async)
- **DB Operations:**
  - bookings.update(status='pending_payment', payment_method='credit_card')
  - bookings.update(mercadopago_preference_id, mercadopago_init_point)
  - payment_intents.insert(status='pending')
  - [After webhook] payment_intents.update(status='approved')

### Method 3: Partial Wallet + Card (30/70)
- **Precondition:** User has some wallet balance (≥30%)
- **Process:** Lock 30% → Create MP preference for 70% → User pays remainder → Webhook confirms
- **Status Flow:** pending → pending_payment → confirmed (async)
- **DB Operations:**
  - wallet_lock_funds(30% of total)
  - bookings.update(status='pending_payment', payment_method='partial_wallet')
  - payment_intents.insert(status='pending')
  - [After webhook] payment_intents.update(status='approved')
  - wallet_confirm_deposit() for remaining 70% payment

### Method 4: PayPal
- **Precondition:** User selects PayPal option
- **Process:** PayPal button handles entire flow → Payment captured → Navigate to confirmation
- **Status Flow:** pending → [PayPal handles] → confirmation page
- **Note:** Not deeply integrated with MercadoPago path (parallel flow)

---

## DATABASE OPERATIONS

### Tables Modified During Checkout

#### 1. bookings
```sql
UPDATE bookings SET
  status = 'pending_payment' | 'confirmed',
  payment_method = 'wallet' | 'credit_card' | 'partial_wallet' | 'paypal',
  payment_provider = 'mercadopago' | 'paypal',
  payment_preference_id = (MP preference_id),
  payment_init_point = (MP init_point),
  updated_at = NOW()
WHERE id = booking_id;
```

#### 2. payment_intents
```sql
INSERT INTO payment_intents (
  booking_id,
  user_id,
  intent_type,
  amount_usd,
  amount_ars,
  fx_rate,
  status,
  provider,
  description
) VALUES (
  booking_id,
  renter_id,
  'booking',
  amount_usd,
  amount_ars,
  fx_rate,
  'pending',
  'mercadopago',
  'Pago de reserva...'
);
```

#### 3. wallet_transactions (via RPC)
```sql
-- RPC: wallet_lock_funds()
INSERT INTO wallet_transactions (
  user_id,
  transaction_type,
  amount_cents,
  booking_id,
  status,
  description
) VALUES (
  user_id,
  'lock',
  amount_cents,
  booking_id,
  'locked',
  'Fondos bloqueados para pago'
);

-- Also updates user_wallets.locked_cents
UPDATE user_wallets SET
  locked_cents = locked_cents + amount_cents
WHERE user_id = user_id;
```

#### 4. profiles
```sql
-- Stores MercadoPago customer_id
UPDATE profiles SET
  mercadopago_customer_id = customer_id
WHERE id = renter_id;
```

### RPC Functions Called

| RPC | Called By | Purpose |
|-----|-----------|---------|
| `wallet_get_balance()` | CheckoutPaymentService | Get current wallet balance |
| `wallet_lock_funds()` | CheckoutPaymentService | Lock funds for booking (wallet or partial) |
| `wallet_unlock_funds()` | CheckoutPaymentService | Unlock funds on error (rollback) |
| `calculate_payment_split()` | MP Preference Edge Function | Calculate 85/15 split for marketplace |
| `pricing_recalculate()` | BookingsService | Recalculate pricing after booking creation |
| `request_booking()` | BookingsService.requestBooking() | Create initial booking in 'pending' status |

---

## EXTERNAL APIS - MERCADOPAGO

### Edge Function: mercadopago-create-booking-preference

**File:** `/home/user/autorenta/supabase/functions/mercadopago-create-booking-preference/index.ts`

**URL Pattern:** `${supabaseUrl}/functions/v1/mercadopago-create-booking-preference`

#### Request
```http
POST /mercadopago-create-booking-preference
Authorization: Bearer {user_auth_token}
Content-Type: application/json

{
  "booking_id": "uuid",
  "use_split_payment": boolean (optional)
}
```

#### Processing Steps (Lines 38-677):

**1. Validation (Lines 44-122)**
```
- Verify MP_ACCESS_TOKEN configured
- Validate HTTP method is POST
- Extract and validate booking_id
- Check Authorization header
- Verify user is authenticated via JWT
```

**2. Authorization & Ownership Check (Lines 125-173)**
```typescript
- Query bookings table with car relationship
- Verify booking.renter_id === authenticated_user_id
  - SECURITY: Prevents cross-user payment hijacking
- Validate booking.status === 'pending'
  - Prevents double-payment on confirmed bookings
```

**3. Exchange Rate & Amount Conversion (Lines 195-254)**
```typescript
- Query exchange_rates table (USDTARS pair)
- If booking in ARS: use directly
- If booking in USD: multiply by FX rate to get ARS
- Validate amount: 100 ≤ amount ≤ 10,000,000 ARS
```

**4. Idempotency Check (Lines 257-298)**
```typescript
- Check if booking.mercadopago_preference_id exists
- If exists, verify preference is still valid via MP API
- Return existing preference if valid (idempotent)
- Otherwise create new preference
```

**5. Customer Creation (Lines 300-382)**
```typescript
- Get user profile from DB
- Extract:
  - full_name
  - email
  - phone
  - dni / gov_id_number
- POST to MercadoPago Customers API
  - If successful: save customer_id in profiles
  - If fails: continue without customer_id
```

**6. Marketplace Split Decision (Lines 400-489)**
```typescript
- Check ENABLE_SPLIT_PAYMENTS env var
- Check if use_split_payment flag set
- Check owner.marketplace_approved flag
- Check owner has mercadopago_collector_id

Decision Tree:
  If (ENABLED && flag && approved && collector_id):
    → Enable split payments (85% owner, 15% platform)
  If (!ENABLED && flag requested):
    → Warn but continue without split
  If (normal payment):
    → All payment methods allowed
  If (flag set but owner not approved):
    → Return OWNER_ONBOARDING_REQUIRED error (409)
```

**7. Preference Creation (Lines 491-662)**
```typescript
POST to https://api.mercadopago.com/checkout/preferences

Request Body:
{
  items: [{
    id: booking_id,
    title: "Alquiler de {carTitle}",
    description: "...",
    quantity: 1,
    unit_price: amountARS,
    currency_id: 'ARS',
    picture_url: (car first photo)
  }],
  
  back_urls: {
    success: "${APP_BASE_URL}/bookings/success/{booking_id}?from_mp=true&payment=success",
    failure: "${APP_BASE_URL}/bookings/success/{booking_id}?from_mp=true&payment=failure",
    pending: "${APP_BASE_URL}/bookings/success/{booking_id}?from_mp=true&payment=pending"
  },
  
  auto_return: 'approved',
  external_reference: booking_id,
  notification_url: "${SUPABASE_URL}/functions/v1/mercadopago-webhook",
  
  payment_methods: (conditional)
    If split:
      excluded_payment_types: [credit_card, debit_card, ticket, bank_transfer, atm]
      installments: 1  (account money only)
    Else:
      excluded_payment_types: []
      installments: 12
  
  payer: {
    email: user_email,
    first_name: first_name,
    last_name: last_name,
    phone: { area_code, number },
    identification: { type: 'DNI', number: dni },
    id: mercadopago_customer_id (if exists)
  },
  
  marketplace: (if split enabled)
    marketplace: MP_MARKETPLACE_ID,
    marketplace_fee: platformFee,
    collector_id: owner.mercadopago_collector_id
}
```

**8. Preference Storage (Lines 638-645)**
```typescript
UPDATE bookings SET
  mercadopago_preference_id = mpData.id,
  mercadopago_init_point = mpData.init_point
WHERE id = booking_id;
```

**9. Response (Lines 648-662)**
```json
{
  "success": true,
  "preference_id": "mp_pref_id",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/...",
  "amount_ars": 50000,
  "amount_usd": 50,
  "exchange_rate": 1000
}
```

### MercadoPago Preference Checkout

**What Happens Next:**
1. Frontend receives init_point URL
2. Frontend redirects user to init_point (line 221 in booking-checkout.page.ts)
3. User lands on MercadoPago checkout page
4. User selects payment method (card, cash, account money, etc.)
5. User completes payment
6. MercadoPago sends webhook notification

---

## WEBHOOK HANDLING

### Edge Function: mercadopago-webhook

**File:** `/home/user/autorenta/supabase/functions/mercadopago-webhook/index.ts`

**URL:** `${supabaseUrl}/functions/v1/mercadopago-webhook`

**MercadoPago → Webhook Flow:**
```
1. User completes payment on MercadoPago
2. MercadoPago payment status changes
3. MercadoPago sends IPN notification POST request
4. Edge Function receives webhook (lines 126-670)
5. Edge Function processes and updates DB
```

#### Webhook Processing Steps (Lines 126-670):

**1. HTTP Method Validation (Lines 145-153)**
```
- Only POST allowed
- Return 405 if not POST
```

**2. Environment Setup (Lines 133-143)**
```
- Get MP_ACCESS_TOKEN
- Get SUPABASE_URL and SERVICE_KEY
- Get ENVIRONMENT for IP validation
```

**3. IP Validation (Lines 156-183)** [Security]
```typescript
- Extract x-forwarded-for header
- Check if IP in MercadoPago authorized ranges
  - 209.225.49.0/24
  - 216.33.197.0/24
  - 216.33.196.0/24
- In production: reject if not authorized
- In development: allow if HMAC valid
```

**4. Rate Limiting (Lines 185-215)** [Security]
```
- Track by IP
- Max 100 requests per minute
- Return 429 if exceeded
```

**5. HMAC Validation (Lines 224-349)** [Security - CRITICAL]
```typescript
- Extract x-signature header
- Extract x-request-id header
- Parse signature: ts=, v1=
- Build manifest: "id:{paymentId};request-id:{xRequestId};ts:{ts};"
- Calculate HMAC-SHA256(manifest, MP_ACCESS_TOKEN)
- Compare calculated vs provided hash
- Reject (403) if mismatch
```

#### Remaining Processing (Lines 350+)
[Continues in next section - file is 670 lines]

**Key Integration Points:**
- Validates payment data
- Updates payment_intents table
- Calls wallet_confirm_deposit() RPC
- Updates booking to 'confirmed'
- Handles idempotency via transaction_id

---

## SUCCESS & ERROR PATHS

### Success Path: Wallet Complete Payment

```
User clicks "Pay with Wallet" button
    ↓
BookingCheckoutPage.handleWalletPayment()
    ↓
CheckoutPaymentService.processWalletPayment()
    ↓
1. checkoutPaymentService.getWalletBalance()
   └→ wallet_get_balance() RPC ✅
    ↓
2. checkoutPaymentService.lockWalletFunds()
   └→ wallet_lock_funds() RPC ✅
    ↓
3. bookingsService.updateBooking(status='confirmed')
   └→ bookings.update() ✅
    ↓
4. paymentsService.createPaymentIntentWithDetails(status='succeeded')
   └→ payment_intents.insert() ✅
    ↓
map() → Return PaymentResult {success: true}
    ↓
Show success message
Navigate to booking details / confirmation
```

### Success Path: Credit Card Payment

```
User clicks "Pay with Card" button
    ↓
BookingCheckoutPage.handleMercadoPagoPayment()
    ↓
MercadoPagoBookingGatewayService.createBookingPreference()
    ↓
Fetch POST /mercadopago-create-booking-preference (Edge Function)
    ├→ Validate ownership & booking status
    ├→ Get exchange rate
    ├→ Check idempotency (existing preference?)
    ├→ Create/get MercadoPago customer
    ├→ Determine payment methods
    ├→ Create preference in MercadoPago API
    └→ Store preference_id in bookings table ✅
    ↓
Response: {success: true, init_point, preference_id}
    ↓
Frontend redirects to init_point
    ↓
User lands on MercadoPago checkout page
User selects payment method (card, cash, etc.)
User completes payment ✅
    ↓
MercadoPago sends IPN POST notification webhook
    ↓
/mercadopago-webhook Edge Function receives webhook
    ├→ Validate IP, rate limit, HMAC signature
    ├→ Extract payment ID from webhook
    ├→ Query MercadoPago Payment API
    ├→ Get payment status, payment_type_id
    ├→ If status='approved':
    │   ├→ wallet_confirm_deposit() RPC
    │   ├→ bookings.update(status='confirmed')
    │   └→ payment_intents.update(status='approved')
    └→ Return 200 OK ✅
    ↓
Frontend polling detects booking.status='confirmed'
Display success message & booking details
```

### Error Path: Insufficient Wallet Balance

```
User clicks "Pay with Wallet"
    ↓
CheckoutPaymentService.processWalletPayment()
    ↓
1. getWalletBalance() → Returns balance < required
    ↓
2. switchMap() → throwError('Balance insuficiente...')
    ↓
catchError() handler triggered
    ↓
rollbackTransaction() (but nothing was locked yet)
    ↓
throwError() → Re-throw with rollback message
    ↓
Observable error caught in component
    ↓
Set error signal: "Error al procesar el pago"
User sees error message on payment page
User can try alternative payment method (card)
```

### Error Path: Booking Not Found

```
User navigates to /bookings/{invalid_id}/checkout
    ↓
BookingCheckoutPage.ngOnInit()
    ↓
loadBooking()
    ↓
BookingsService.getBookingById() → Returns null
    ↓
if (!bookingData) → throw Error('Booking no encontrado')
    ↓
Caught in ngOnInit catch block
    ↓
error.set('Booking no encontrado')
    ↓
Template shows error container with error message
User can navigate back
```

### Error Path: MercadoPago API Failure

```
User clicks "Pay with Card"
    ↓
Edge Function creates preference
    ↓
MercadoPago API returns error (connectivity, validation, etc.)
    ↓
mpResponse.ok === false
    ↓
errorData = await mpResponse.json()
    ↓
throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`)
    ↓
Catch block (line 663-676)
    ↓
Return Response {
  status: 500,
  body: {
    error: error.message,
    details: error.stack
  }
}
    ↓
Frontend receives 500 response
    ↓
catchError() in gateway service
    ↓
Set error signal in component
    ↓
User sees: "Error procesando pago con MercadoPago"
User can retry or try different method
```

### Error Path: Webhook Signature Invalid

```
Potential attacker sends forged webhook
    ↓
/mercadopago-webhook receives POST
    ↓
Extract x-signature and x-request-id
    ↓
Build manifest and calculate HMAC
    ↓
calculatedHash !== receivedHash
    ↓
HMAC validation FAILED
    ↓
Return Response {
  status: 403,
  body: {
    error: 'Invalid webhook signature',
    code: 'INVALID_HMAC'
  }
}
    ↓
Webhook rejected, DB not updated
    ↓
Booking remains in 'pending_payment' state
    ↓
User sees pending status, can retry payment
```

---

## DATABASE SCHEMA

### Key Tables

#### bookings
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  car_id UUID NOT NULL,
  renter_id UUID NOT NULL,
  
  -- Dates
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Status & Payment
  status booking_status ('pending'|'confirmed'|'in_progress'|...) 
  payment_method TEXT ('wallet'|'credit_card'|'partial_wallet'),
  payment_provider payment_provider ('mercadopago'|'paypal'),
  
  -- MercadoPago / Provider Fields
  payment_preference_id TEXT,        -- MP preference_id
  payment_init_point TEXT,           -- MP checkout URL
  provider_split_payment_id TEXT,    -- Split payment ID
  provider_collector_id TEXT,        -- Collector ID for split
  
  -- Pricing
  total_amount NUMERIC(10,2),
  currency TEXT ('ARS'|'USD'),
  
  -- Wallet
  wallet_status TEXT ('available'|'locked'),
  wallet_lock_transaction_id UUID,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### payment_intents
```sql
CREATE TABLE payment_intents (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  intent_type TEXT ('booking'|'deposit'|...),
  
  -- Amount
  amount_usd NUMERIC(10,2),
  amount_ars NUMERIC(10,2),
  amount_cents INT,
  
  -- Status
  status payment_status ('pending'|'approved'|'rejected'|...),
  
  -- Provider
  provider payment_provider,
  provider_intent_id TEXT,     -- MP payment_id
  provider_reference TEXT,
  
  -- Data
  fx_rate NUMERIC(10,2),
  description TEXT,
  is_preauth BOOLEAN,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### user_wallets
```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  
  -- Balance
  balance_cents BIGINT NOT NULL DEFAULT 0,
  locked_cents BIGINT NOT NULL DEFAULT 0,
  
  -- Non-withdrawable (cash deposits)
  non_withdrawable_floor NUMERIC(10,2) DEFAULT 0,
  
  -- Metadata
  last_deposit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### wallet_transactions
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  transaction_type TEXT (
    'deposit'|'withdrawal'|'payment'|'refund'|'lock'|'unlock'
  ),
  
  amount_cents BIGINT NOT NULL,
  status TEXT ('pending'|'confirmed'|'failed'|'locked'|'released'),
  
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payment_intents(id),
  
  description TEXT,
  meta JSONB,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### exchange_rates
```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  pair TEXT ('USDTARS', etc.),
  
  spot_rate NUMERIC(10,4),
  platform_rate NUMERIC(10,4),
  
  is_active BOOLEAN DEFAULT true,
  
  last_updated TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  source TEXT ('binance'|'mercadopago'|...),
  
  created_at TIMESTAMPTZ
);
```

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Document
  dni TEXT,
  gov_id_number TEXT,
  gov_id_type TEXT,
  
  -- MercadoPago
  mercadopago_customer_id TEXT,
  mercadopago_collector_id TEXT,
  marketplace_approved BOOLEAN,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## SUMMARY: KEY FILES & LINE NUMBERS

| Component | File | Key Methods | Lines |
|-----------|------|-------------|-------|
| **UI Layer** | booking-checkout.page.ts | ngOnInit, loadBooking, handleMercadoPagoPayment, handleProviderChange | 1-280 |
| | booking-detail-payment.page.ts | (comprehensive payment page) | 1-100+ |
| **Gateway Factory** | payment-gateway.factory.ts | createBookingGateway | N/A |
| **MercadoPago Gateway** | mercadopago-booking-gateway.service.ts | createBookingPreference, _createPreference | 43-94 |
| | mercadopago-booking.gateway.ts | createPreference, parseEdgeError | 27-105 |
| **Checkout Service** | checkout-payment.service.ts | processWalletPayment, processCreditCardPayment, processPartialWalletPayment, rollbackTransaction | 70-371 |
| **Bookings Service** | bookings.service.ts | getBookingById, updateBooking | 133-233 |
| **Payments Service** | payments.service.ts | createIntent, createPaymentIntentWithDetails, processPayment | 47-262 |
| **Risk Calculator** | risk-calculator.service.ts | calculateRisk | 58-80+ |
| **Edge Function** | mercadopago-create-booking-preference/index.ts | Complete preference creation | 38-677 |
| **Webhook** | mercadopago-webhook/index.ts | Webhook receipt & processing | 126-670 |
| **Database** | 20251106_refactor_bookings_to_provider_agnostic.sql | Schema refactoring | N/A |

---

## EXECUTION FLOW SUMMARY

```
[START] User on Checkout Page
  ↓
[LOAD] Get booking details from DB
  ↓
[SELECT] User chooses payment provider (MercadoPago/PayPal)
  ↓
[BRANCH] Split into two flows:

FLOW A: WALLET COMPLETE PAYMENT
  ├→ Get wallet balance
  ├→ Lock funds in wallet
  ├→ Update booking to 'confirmed'
  ├→ Create payment_intent with status='succeeded'
  └→ [END] Success - show confirmation

FLOW B: CREDIT CARD PAYMENT
  ├→ Call Edge Function: mercadopago-create-booking-preference
  │   ├→ Validate ownership & status
  │   ├→ Get/create customer
  │   ├→ Create MercadoPago preference
  │   └→ Return init_point URL
  ├→ Redirect to MercadoPago checkout
  ├→ User completes payment on MercadoPago
  ├→ MercadoPago sends webhook
  ├→ Edge Function: mercadopago-webhook receives
  │   ├→ Validate signature
  │   ├→ Get payment details
  │   ├→ Update payment_intents
  │   ├→ Update booking to 'confirmed'
  │   └→ Return 200 OK
  ├→ Frontend detects status='confirmed' via polling
  └→ [END] Success - show confirmation

FLOW C: PARTIAL WALLET + CARD (30/70)
  ├→ Lock 30% in wallet
  ├→ Create MP preference for remaining 70%
  ├→ Redirect to MercadoPago
  ├→ User pays 70% with card
  ├→ Webhook confirms payment
  ├→ Update booking to 'confirmed'
  └→ [END] Success - show confirmation

[ERROR] At any point:
  ├→ Rollback wallet locks
  ├→ Revert booking status
  ├→ Show error message to user
  └→ [END] User can retry or try alternative
```

---

**Document Generated:** 2025-11-06
**Analysis Scope:** Complete payment flow from UI to completion
**Technologies:** Angular 17, Supabase, MercadoPago API, Deno Edge Functions
