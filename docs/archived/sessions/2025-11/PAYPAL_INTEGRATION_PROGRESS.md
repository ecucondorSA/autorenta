# PayPal + MercadoPago Multi-Provider Integration
## Implementation Progress Report

**Date**: November 6, 2025
**Status**: **Phase 1-3 COMPLETED** (Database, RPC, Edge Functions)
**Next Steps**: Frontend Services & UI Components

---

## ✅ COMPLETED: Backend Foundation (Phases 1-3)

### Phase 1: Database Refactoring ✅ COMPLETED

#### Migrations Created:
1. **`20251106_refactor_payment_intents_to_provider_agnostic.sql`**
   - Renamed `mp_payment_id` → `provider_payment_id`
   - Renamed `mp_status` → `provider_status`
   - Renamed `mp_status_detail` → `provider_status_detail`
   - Added `paypal_order_id`, `paypal_capture_id` columns
   - Created indexes for performance

2. **`20251106_refactor_bookings_to_provider_agnostic.sql`**
   - Added `payment_provider` column (enum: mercadopago, paypal)
   - Renamed `mercadopago_preference_id` → `payment_preference_id`
   - Renamed `mercadopago_init_point` → `payment_init_point`
   - Renamed `mp_split_payment_id` → `provider_split_payment_id`
   - Renamed `mp_collector_id` → `provider_collector_id`

3. **`20251106_add_paypal_provider_and_profile_columns.sql`**
   - Added `'paypal'` to `payment_provider` enum
   - Added PayPal OAuth columns to `profiles`:
     - `paypal_merchant_id`, `paypal_connected`
     - `paypal_access_token`, `paypal_refresh_token`, `paypal_access_token_expires_at`
     - `paypal_account_type`, `paypal_partner_attribution_id`, `paypal_bn_code`
     - `paypal_primary_email`, `paypal_onboarding_completed_at`
     - `marketplace_approved_paypal`
   - Created `paypal_seller_onboarding` table for tracking onboarding status
   - Updated `payment_splits` table: added `provider` column, `provider_payee_identifier`

4. **`20251106_create_platform_config_table.sql`**
   - Created `platform_config` table for centralized configuration
   - **Fixed fee inconsistency**: Set platform fee to **15%** (was 10% in some places)
   - Added config values:
     - `platform_fee_percent`: 0.15 (15%)
     - `platform_fee_mercadopago`: 0.15
     - `platform_fee_paypal`: 0.15
     - `enable_split_payments_mercadopago`: TRUE
     - `enable_split_payments_paypal`: FALSE (requires Partner approval)
   - Created `get_platform_config()` RPC function
   - Created `get_platform_fee_percent(p_provider)` RPC function

5. **`20251106_create_payment_provider_config_table.sql`**
   - Created `payment_provider_config` table for provider-specific settings
   - Stores credentials, webhooks, feature flags per provider
   - Inserted templates for MercadoPago and PayPal (sandbox + production)
   - Created `get_payment_provider_config()` RPC function
   - Created `is_provider_feature_enabled()` RPC function

---

### Phase 2: RPC Function Abstraction ✅ COMPLETED

#### Migration: `20251106_update_rpc_functions_for_multi_provider.sql`

**Updated Functions**:

1. **`calculate_payment_split(p_total_amount, p_provider)`**
   - Now accepts `p_provider` parameter
   - Fetches platform fee from `platform_config` (15% default)
   - Returns: `total_amount`, `owner_amount`, `platform_fee`, `platform_fee_percent`

2. **`register_payment_split(p_booking_id, p_provider, p_provider_payment_id, p_total_amount_cents, p_currency)`**
   - Now accepts `p_provider` parameter instead of `p_mp_payment_id`
   - Dynamically gets payee identifier based on provider:
     - MercadoPago: `mercadopago_collector_id`
     - PayPal: `paypal_merchant_id`
   - Uses configurable 15% fee from `get_platform_fee_percent()`
   - Backward-compatible wrapper created for MercadoPago

3. **`validate_split_payment_amounts(p_booking_id, p_provider, ...)`**
   - NEW FUNCTION: Validates split amounts match expected values
   - Returns detailed validation result with error messages
   - Allows 1 cent rounding tolerance

#### Migration: `20251106_create_prepare_booking_payment_rpc.sql`

**New Functions**:

1. **`prepare_booking_payment(p_booking_id, p_provider, p_use_split_payment)`**
   - **Key Innovation**: Extracts split payment logic from Edge Functions into reusable RPC
   - Returns comprehensive JSONB with:
     - Booking details (id, dates, total, currency)
     - Car details (id, model, brand, owner_id)
     - Owner details (id, email, provider credentials, marketplace approval status)
     - Renter details (id, email, full_name)
     - Payment calculation (total_cents, platform_fee_cents, owner_amount_cents, split validation)
     - Metadata (external_reference, statement_descriptor, notification_url_base)
   - Validates provider-specific requirements:
     - MercadoPago: checks `mercadopago_collector_id`, `marketplace_approved`
     - PayPal: checks `paypal_merchant_id`, `marketplace_approved_paypal`
   - Returns split errors if requirements not met

2. **`get_owner_payment_credentials(p_owner_id, p_provider)`**
   - Returns owner's payment credentials for a specific provider
   - Used for validating split payment eligibility

---

### Phase 3: Supabase Edge Functions ✅ COMPLETED

#### Shared Utilities

**File**: `supabase/functions/_shared/paypal-api.ts`

**Key Features**:
- `getPayPalAccessToken()` - OAuth 2.0 token generation
- `paypalFetch()` - Authenticated API requests with idempotency support
- `createPayPalOrder()` - Create PayPal Orders API v2 order
- `capturePayPalOrder()` - Capture order (complete payment)
- `getPayPalOrder()` - Get order details
- `verifyPayPalWebhookSignature()` - Webhook signature verification via PayPal API
- `getApprovalUrl()` - Extract approval URL from order links
- `centsToPayPalAmount()`, `payPalAmountToCents()` - Currency conversion helpers

**TypeScript Interfaces**:
- `PayPalConfig`, `PayPalOrderRequest`, `PayPalPurchaseUnit`, `PayPalOrder`, `PayPalCaptureResponse`

---

#### Edge Function 1: `paypal-create-order`

**Location**: `supabase/functions/paypal-create-order/index.ts`

**Purpose**: Create PayPal order for booking payments with marketplace split support

**Flow**:
1. Authenticate user via JWT
2. Validate booking ownership (renter must be authenticated user)
3. Call `prepare_booking_payment()` RPC to get payment data + split validation
4. Convert currency ARS → USD using `exchange_rates` table (fallback: 1015 ARS/USD)
5. Get PayPal access token
6. Build PayPal order request:
   - Basic order with booking details
   - If split enabled: add `payment_instruction` with `platform_fees` and `disbursement_mode`
   - Set `payee.merchant_id` to owner's `paypal_merchant_id`
7. Create order with idempotency key
8. Update `bookings` table with `payment_preference_id` (order ID)
9. Create `payment_intents` record
10. Return approval URL for user to complete payment

**Split Payment Support**:
- Checks `payment.split_enabled` from RPC
- Uses `INSTANT` disbursement mode (configurable via `platform_config`)
- Adds 15% platform fee to `payment_instruction.platform_fees`
- Sets `payee.merchant_id` for receiving funds

**Environment Variables Required**:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_SECRET`
- `PAYPAL_ENV` (sandbox | live)
- `PAYPAL_PARTNER_ATTRIBUTION_ID` (BN code, optional)
- `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` (optional)

---

#### Edge Function 2: `paypal-capture-order`

**Location**: `supabase/functions/paypal-capture-order/index.ts`

**Purpose**: Capture PayPal order after user approval (complete payment)

**Flow**:
1. Authenticate user via JWT
2. Validate order belongs to user (query `bookings` by `payment_preference_id`)
3. Check idempotency: if already captured, return existing capture ID
4. Get PayPal access token
5. Verify order status is `APPROVED` (via `getPayPalOrder()`)
6. Capture order with idempotency key
7. Extract capture ID and amount from response
8. Update `payment_intents`:
   - Set `paypal_capture_id`, `provider_payment_id`
   - Set `status` to `'captured'`
9. Update `bookings.status` to `'confirmed'`
10. Create `payments` record
11. Return capture details

**Idempotency**:
- Checks `payment_intents` for existing capture
- Uses `PayPal-Request-Id` header for API-level idempotency

---

#### Edge Function 3: `paypal-webhook` ⭐ CRITICAL

**Location**: `supabase/functions/paypal-webhook/index.ts`

**Purpose**: Handle PayPal webhook events (order approval, payment capture, merchant onboarding)

**Security Features**:
1. **Rate Limiting**: 100 requests/minute per IP (in-memory sliding window)
2. **Webhook Signature Verification**: Uses PayPal's `/v1/notifications/verify-webhook-signature` API
3. **Idempotency**: Tracks processed event IDs in-memory cache (max 10,000 events)

**Supported Events**:

1. **`CHECKOUT.ORDER.APPROVED`**
   - User approved order, ready to capture
   - Updates `payment_intents.status` to `'authorized'`

2. **`PAYMENT.CAPTURE.COMPLETED`** ⭐ MAIN EVENT
   - Payment was captured successfully
   - Flow:
     - Find booking by `payment_preference_id` (order ID)
     - Check idempotency (skip if already processed)
     - Update `payment_intents` with capture ID
     - Create `payments` record
     - Update `bookings.status` to `'confirmed'`
     - **Process split payment** if `provider_collector_id` exists:
       - Call `register_payment_split()` RPC
       - Log to `payment_issues` if split registration fails

3. **`PAYMENT.CAPTURE.DECLINED` / `PAYMENT.CAPTURE.DENIED`**
   - Payment capture failed
   - Updates `payment_intents.status` to `'failed'`

4. **`MERCHANT.ONBOARDING.COMPLETED`**
   - Seller completed PayPal onboarding via Partner Referrals API
   - Updates `paypal_seller_onboarding` record
   - Updates `profiles`:
     - Set `paypal_merchant_id`, `paypal_connected = TRUE`
     - Set `marketplace_approved_paypal = TRUE` (auto-approve for MVP)

**Environment Variables Required**:
- `PAYPAL_WEBHOOK_ID` (webhook ID from PayPal Dashboard)
- `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` (for signature verification)
- `PAYPAL_ENV`

**Rate Limiting Details**:
- Storage: In-memory Map (per-instance, resets on redeploy)
- Limit: 100 requests per minute per IP
- Response: 429 Too Many Requests

---

#### Edge Function 4: `paypal-create-deposit-order`

**Location**: `supabase/functions/paypal-create-deposit-order/index.ts`

**Purpose**: Create PayPal order for wallet deposits (no split payment)

**Flow**:
1. Authenticate user via JWT
2. Validate `wallet_transactions` record exists and is `pending`
3. Get PayPal access token
4. Build PayPal order request:
   - Reference ID: `transaction_id`
   - Custom ID: `wallet_deposit_{transaction_id}`
   - Amount: USD (no conversion needed)
5. Create order with idempotency key
6. Update `wallet_transactions` with `provider_transaction_id`
7. Create `payment_intents` record with `intent_type = 'deposit'`
8. Return approval URL

**Differences from Booking Order**:
- No split payment support
- `intent_type = 'deposit'` instead of `'charge'`
- References `wallet_transactions` instead of `bookings`

---

## 📊 Database Schema Changes Summary

### Tables Modified:
- ✅ `payment_intents` - Renamed MP columns, added PayPal columns
- ✅ `bookings` - Added provider column, renamed payment columns
- ✅ `payment_splits` - Added provider support
- ✅ `profiles` - Added PayPal OAuth columns

### Tables Created:
- ✅ `platform_config` - Centralized platform configuration
- ✅ `payment_provider_config` - Provider-specific configuration
- ✅ `paypal_seller_onboarding` - Tracks PayPal onboarding process

### Enums Updated:
- ✅ `payment_provider` - Added `'paypal'` value
- ✅ `wallet_payment_provider` - Added `'paypal'` value (if exists)

### RPC Functions Created/Updated:
- ✅ `calculate_payment_split()` - Now provider-agnostic, uses 15% fee
- ✅ `register_payment_split()` - Now accepts provider parameter
- ✅ `validate_split_payment_amounts()` - NEW: Validates split calculations
- ✅ `prepare_booking_payment()` - NEW: Centralizes payment preparation logic
- ✅ `get_owner_payment_credentials()` - NEW: Gets owner credentials by provider
- ✅ `get_platform_config()` - NEW: Gets config value by key
- ✅ `get_platform_fee_percent()` - NEW: Gets fee by provider (defaults 15%)
- ✅ `get_payment_provider_config()` - NEW: Gets provider configuration
- ✅ `is_provider_feature_enabled()` - NEW: Checks feature flag by provider

---

## 🔧 Configuration Management

### Platform Config (`platform_config` table)

**Key Values**:
```sql
platform_fee_percent = 0.15 (15%)
platform_fee_mercadopago = 0.15
platform_fee_paypal = 0.15
enable_split_payments_mercadopago = TRUE
enable_split_payments_paypal = FALSE  -- Requires Partner approval
require_seller_verification_for_split = TRUE
fx_margin_percent = 0.20 (20% over Binance)
default_currency = 'ARS'
supported_currencies = ["ARS", "USD"]
paypal_environment = 'sandbox'
paypal_disbursement_mode = 'INSTANT'
```

### Provider Config (`payment_provider_config` table)

**Inserted Templates**:
- MercadoPago (sandbox + production)
- PayPal (sandbox + production)

**Feature Flags** (PayPal):
```json
{
  "split_payments_enabled": false,  // Requires Partner approval
  "wallet_deposits_enabled": true,
  "booking_payments_enabled": true,
  "advanced_card_payments": false,
  "venmo_enabled": false
}
```

---

## 🚀 Deployment Guide

### Step 1: Run Migrations

```bash
# Connect to Supabase database
psql 'postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

# Run migrations in order:
\i supabase/migrations/20251106_refactor_payment_intents_to_provider_agnostic.sql
\i supabase/migrations/20251106_refactor_bookings_to_provider_agnostic.sql
\i supabase/migrations/20251106_add_paypal_provider_and_profile_columns.sql
\i supabase/migrations/20251106_create_platform_config_table.sql
\i supabase/migrations/20251106_create_payment_provider_config_table.sql
\i supabase/migrations/20251106_update_rpc_functions_for_multi_provider.sql
\i supabase/migrations/20251106_create_prepare_booking_payment_rpc.sql
```

**IMPORTANT**: Verify data migration completed successfully before dropping old columns:
```sql
-- Check that data was migrated
SELECT COUNT(*) FROM payment_intents WHERE provider_payment_id IS NOT NULL;
SELECT COUNT(*) FROM bookings WHERE payment_preference_id IS NOT NULL;
```

### Step 2: Configure PayPal Credentials

#### A. Get PayPal Sandbox Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Create a REST API app
3. Copy Client ID and Secret

#### B. Configure Supabase Secrets

```bash
# Set environment variables in Supabase Dashboard or via CLI
supabase secrets set PAYPAL_CLIENT_ID=your_client_id
supabase secrets set PAYPAL_SECRET=your_secret
supabase secrets set PAYPAL_ENV=sandbox
supabase secrets set PAYPAL_PARTNER_ATTRIBUTION_ID=your_bn_code  # Optional
```

#### C. Configure Webhook

1. In PayPal Dashboard, go to Webhooks
2. Create webhook pointing to: `https://your-project.supabase.co/functions/v1/paypal-webhook`
3. Subscribe to events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DECLINED`
   - `PAYMENT.CAPTURE.DENIED`
   - `MERCHANT.ONBOARDING.COMPLETED`
4. Copy Webhook ID and set:
```bash
supabase secrets set PAYPAL_WEBHOOK_ID=your_webhook_id
```

### Step 3: Deploy Edge Functions

```bash
# Deploy all PayPal Edge Functions
supabase functions deploy paypal-create-order
supabase functions deploy paypal-capture-order
supabase functions deploy paypal-webhook
supabase functions deploy paypal-create-deposit-order
```

### Step 4: Update Frontend Types (PENDING)

TypeScript types need to be regenerated from database schema:
```bash
npx supabase gen types typescript --project-id obxvffplochgeiclibng > apps/web/src/app/core/types/database.types.ts
```

---

## 🧪 Testing Checklist

### Backend Testing (Edge Functions)

**PayPal Sandbox Testing**:
1. ✅ Create booking order (`paypal-create-order`)
   - Test with `use_split_payment = false`
   - Test with `use_split_payment = true` (requires onboarded seller)
   - Verify order created in PayPal Sandbox
   - Verify `booking.payment_preference_id` updated

2. ✅ Approve order in PayPal Sandbox
   - Open `approval_url` in browser
   - Login with sandbox buyer account
   - Approve payment
   - Verify webhook event received (`CHECKOUT.ORDER.APPROVED`)

3. ✅ Capture order (`paypal-capture-order`)
   - Call with `order_id` from step 1
   - Verify capture successful
   - Verify `payment_intents.paypal_capture_id` set
   - Verify `bookings.status = 'confirmed'`

4. ✅ Webhook handling (`paypal-webhook`)
   - Test `PAYMENT.CAPTURE.COMPLETED` event
   - Verify split payment registered (if enabled)
   - Verify `payments` record created
   - Test idempotency (send same event twice)

5. ✅ Wallet deposit (`paypal-create-deposit-order`)
   - Create wallet transaction
   - Create deposit order
   - Complete payment in sandbox
   - Verify wallet balance increased

### Database Testing

```sql
-- Verify platform fee is 15% everywhere
SELECT get_platform_fee_percent('mercadopago');  -- Should return 0.15
SELECT get_platform_fee_percent('paypal');  -- Should return 0.15

-- Test prepare_booking_payment function
SELECT prepare_booking_payment(
  'your_booking_id',
  'paypal'::payment_provider,
  TRUE  -- use_split_payment
);

-- Verify split payment calculation
SELECT * FROM calculate_payment_split(1500.00, 'paypal');
-- Should return: total=1500, owner=1275, platform_fee=225, fee_percent=0.15
```

### Split Payment Testing

**Prerequisites**:
1. Seller must complete PayPal onboarding (Partner Referrals API)
2. `profiles.paypal_merchant_id` must be set
3. `profiles.marketplace_approved_paypal = TRUE`
4. `platform_config.enable_split_payments_paypal = TRUE`

**Test Flow**:
1. Create order with `use_split_payment = true`
2. Verify `payment_instruction.platform_fees` in PayPal order
3. Complete payment
4. Verify `payment_splits` record created
5. Verify owner receives 85% in their PayPal account
6. Verify platform receives 15% in platform PayPal account

---

## 📋 REMAINING WORK (Phases 4-5)

### Phase 4: Frontend Services (Angular)

**PENDING - To be implemented next:**

1. **Create `PaymentGateway` interface** (`apps/web/src/app/core/interfaces/payment-gateway.interface.ts`)
   ```typescript
   export interface PaymentGateway {
     readonly provider: 'mercadopago' | 'paypal';
     createBookingPreference(bookingId: string): Observable<PreferenceResponse>;
     redirectToCheckout(checkoutUrl: string): void;
     isPreferenceValid(preferenceId: string): Promise<boolean>;
   }
   ```

2. **Create `PaymentGatewayFactory`** (`apps/web/src/app/core/services/payment-gateway.factory.ts`)
   - Dynamically creates gateway instance based on selected provider

3. **Create `PayPalBookingGatewayService`** (implements `PaymentGateway`)
   - `createBookingPreference()` → calls `/paypal-create-order`
   - `captureOrder()` → calls `/paypal-capture-order`
   - `redirectToCheckout()` → redirects to PayPal approval URL

4. **Update `MercadoPagoBookingGatewayService`** to implement `PaymentGateway` interface

5. **Update `PaymentsService`**
   - Add `createIntentWithProvider(bookingId, provider)` method
   - Add provider selection support

6. **Create `PayPalWalletGatewayService`**
   - `createDepositOrder()` → calls `/paypal-create-deposit-order`
   - `verifyDeposit()` → checks deposit status

7. **Update `WalletService`**
   - Update `initiateDeposit()` to accept `provider` parameter
   - Support both MercadoPago and PayPal

### Phase 5: UI Components (Angular)

**PENDING - To be implemented next:**

1. **Create `paypal-button` component**
   - Integrates PayPal JS SDK
   - Renders PayPal Smart Payment Buttons
   - Handles approval flow

2. **Update `payment-method-selector` component**
   - Add PayPal option
   - Show currency indicator (USD for PayPal, ARS for MercadoPago)
   - Display provider logos

3. **Update `deposit-modal` component**
   - Add provider selection dropdown
   - Show currency conversion preview (ARS ↔ USD)

4. **Update `checkout.page.ts`**
   - Add provider selection UI before payment
   - Save selection in `CheckoutStateService`
   - Use `PaymentGatewayFactory` to get correct gateway

### Phase 6: Testing & Documentation

**PENDING**:
1. E2E tests for multi-provider checkout
2. Unit tests for new services
3. Update user documentation
4. Create seller onboarding guide

---

## 🔒 Security Considerations

### Implemented:
✅ Webhook signature verification (PayPal API)
✅ Rate limiting (100 req/min per IP)
✅ Idempotency tracking (event IDs)
✅ JWT authentication on all Edge Functions
✅ RLS policies on sensitive tables
✅ Service role-only access to `payment_provider_config`

### To Implement:
- [ ] IP whitelisting for webhooks (similar to MercadoPago)
- [ ] Secrets encryption in `payment_provider_config`
- [ ] Audit logging for split payment changes
- [ ] 2FA for seller onboarding

---

## 💰 Cost Considerations

### PayPal Fees (Per Transaction):
- Standard: 2.9% + $0.30 USD
- Marketplace split payments: Additional 2% for each additional receiver
- **Example**: $100 booking with 15% split
  - Renter pays: $100
  - PayPal takes: ~$3.20 (2.9% + $0.30)
  - Platform fee: $15 (configured 15%)
  - Owner receives: ~$81.80

### MercadoPago Fees (For Comparison):
- Argentina: 3.99% + $2 ARS (standard)
- Marketplace split: Additional fees apply

---

## 🎯 Next Immediate Steps

1. **Deploy migrations to production database** ⚠️ HIGH PRIORITY
   - Backup database first!
   - Run migrations in transaction
   - Verify data integrity

2. **Configure PayPal sandbox credentials** ⚠️ REQUIRED FOR TESTING
   - Create PayPal Developer account
   - Get Client ID and Secret
   - Configure webhook

3. **Deploy Edge Functions** ⚠️ REQUIRED FOR TESTING
   - Deploy all 4 PayPal functions
   - Test in Supabase Dashboard

4. **Update Frontend TypeScript types** ⚠️ BLOCKS FRONTEND WORK
   - Regenerate types from database
   - Fix any type errors in existing code

5. **Implement Phase 4 (Frontend Services)** 🔜 NEXT PHASE
   - Start with `PaymentGateway` interface
   - Then implement `PayPalBookingGatewayService`

---

## 📞 Support & Troubleshooting

### Common Issues:

**Issue**: Migrations fail with "enum value already exists"
**Solution**: Use `IF NOT EXISTS` clause (already included in migrations)

**Issue**: PayPal webhook signature verification fails
**Solution**:
1. Verify `PAYPAL_WEBHOOK_ID` matches webhook in dashboard
2. Check that webhook events are subscribed
3. Verify PayPal credentials are correct

**Issue**: Split payment not working
**Solution**:
1. Verify `enable_split_payments_paypal = TRUE` in `platform_config`
2. Verify seller has `paypal_merchant_id` set
3. Verify seller has `marketplace_approved_paypal = TRUE`
4. Check PayPal account has Partner/Marketplace approval

---

## 📚 Resources

- [PayPal Orders API v2 Documentation](https://developer.paypal.com/docs/api/orders/v2/)
- [PayPal Webhooks Documentation](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
- [PayPal Marketplaces Documentation](https://developer.paypal.com/docs/marketplaces/)
- [PayPal Partner Referrals API](https://developer.paypal.com/docs/marketplaces/partners/partner-referrals/)

---

**Generated**: November 6, 2025
**Author**: Claude Code (Anthropic)
**Project**: AutoRenta Multi-Provider Payment Integration
