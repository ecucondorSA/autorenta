# PayPal Integration Deployment Checklist

## Pre-Deployment

- [ ] **Backup Production Database**
  ```bash
  pg_dump 'postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres' > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Review Migration Files**
  - Verify all migrations are in correct order
  - Check that data migration logic is correct
  - Confirm indexes are created

## Database Deployment

### Step 1: Run Migrations (Production)

```bash
# Connect to production database
psql 'postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres'

# Run migrations in order
\i supabase/migrations/20251106_refactor_payment_intents_to_provider_agnostic.sql
\i supabase/migrations/20251106_refactor_bookings_to_provider_agnostic.sql
\i supabase/migrations/20251106_add_paypal_provider_and_profile_columns.sql
\i supabase/migrations/20251106_create_platform_config_table.sql
\i supabase/migrations/20251106_create_payment_provider_config_table.sql
\i supabase/migrations/20251106_update_rpc_functions_for_multi_provider.sql
\i supabase/migrations/20251106_create_prepare_booking_payment_rpc.sql
```

### Step 2: Verify Data Migration

```sql
-- Check payment_intents migration
SELECT
  COUNT(*) as total,
  COUNT(provider_payment_id) as has_provider_id,
  COUNT(paypal_order_id) as has_paypal_id
FROM payment_intents;

-- Check bookings migration
SELECT
  COUNT(*) as total,
  COUNT(payment_preference_id) as has_preference_id,
  COUNT(payment_provider) as has_provider
FROM bookings;

-- Check platform fee config
SELECT * FROM get_platform_fee_percent('mercadopago');
SELECT * FROM get_platform_fee_percent('paypal');
-- Both should return 0.15
```

- [ ] **Verification passed** - All data migrated successfully

## PayPal Configuration

### Step 3: Create PayPal App

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Create new REST API app
3. Name: "AutoRenta Production" (or "AutoRenta Sandbox")
4. Copy **Client ID** and **Secret**

- [ ] **Client ID obtained**: `_______________________`
- [ ] **Secret obtained**: `_______________________`

### Step 4: Configure Webhook

1. In PayPal app settings, go to "Webhooks"
2. Create webhook with URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-webhook
   ```
3. Subscribe to events:
   - ✅ `CHECKOUT.ORDER.APPROVED`
   - ✅ `PAYMENT.CAPTURE.COMPLETED`
   - ✅ `PAYMENT.CAPTURE.DECLINED`
   - ✅ `PAYMENT.CAPTURE.DENIED`
   - ✅ `MERCHANT.ONBOARDING.COMPLETED`
4. Copy **Webhook ID**

- [ ] **Webhook ID obtained**: `_______________________`

### Step 5: Set Supabase Secrets

```bash
# Set PayPal credentials
supabase secrets set PAYPAL_CLIENT_ID=your_client_id_here
supabase secrets set PAYPAL_SECRET=your_secret_here
supabase secrets set PAYPAL_ENV=sandbox  # Change to 'live' for production
supabase secrets set PAYPAL_WEBHOOK_ID=your_webhook_id_here

# Optional: Partner Attribution ID (BN code)
supabase secrets set PAYPAL_PARTNER_ATTRIBUTION_ID=your_bn_code

# Optional: Custom return URLs
supabase secrets set PAYPAL_RETURN_URL=https://autorenta.com/checkout/success
supabase secrets set PAYPAL_CANCEL_URL=https://autorenta.com/checkout/cancel
```

- [ ] **Secrets configured in Supabase**

## Edge Functions Deployment

### Step 6: Deploy Edge Functions

```bash
# Deploy all PayPal Edge Functions
supabase functions deploy paypal-create-order
supabase functions deploy paypal-capture-order
supabase functions deploy paypal-webhook
supabase functions deploy paypal-create-deposit-order
```

- [ ] **paypal-create-order deployed**
- [ ] **paypal-capture-order deployed**
- [ ] **paypal-webhook deployed**
- [ ] **paypal-create-deposit-order deployed**

### Step 7: Test Edge Functions

```bash
# Test create order (requires valid booking_id and auth token)
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-order \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "YOUR_BOOKING_ID", "use_split_payment": false}'

# Expected response: { "success": true, "order_id": "...", "approval_url": "..." }
```

- [ ] **Edge Functions responding correctly**

## Frontend Updates (Optional for Phase 3)

### Step 8: Update TypeScript Types

```bash
cd apps/web
npx supabase gen types typescript --project-id obxvffplochgeiclibng > src/app/core/types/database.types.ts
```

- [ ] **TypeScript types regenerated**
- [ ] **No type errors in existing code**

## Testing

### Step 9: End-to-End Testing

#### Booking Payment Test (Sandbox)

1. **Create Test Booking**
   - [ ] Create booking in database
   - [ ] Note `booking_id`: `_______________________`

2. **Create PayPal Order**
   ```bash
   curl -X POST \
     https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-order \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "YOUR_BOOKING_ID", "use_split_payment": false}'
   ```
   - [ ] Order created successfully
   - [ ] `approval_url` received
   - [ ] `bookings.payment_preference_id` updated

3. **Approve Payment (Sandbox)**
   - [ ] Open `approval_url` in browser
   - [ ] Login with PayPal sandbox buyer account
   - [ ] Approve payment
   - [ ] Redirected to return URL

4. **Capture Order**
   ```bash
   curl -X POST \
     https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-capture-order \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"order_id": "YOUR_ORDER_ID"}'
   ```
   - [ ] Capture successful
   - [ ] `payment_intents.status` = 'captured'
   - [ ] `bookings.status` = 'confirmed'
   - [ ] `payments` record created

5. **Verify Webhook**
   - [ ] Check Supabase logs for webhook event
   - [ ] `PAYMENT.CAPTURE.COMPLETED` event received
   - [ ] Webhook processed successfully
   - [ ] No duplicate processing

#### Wallet Deposit Test (Sandbox)

1. **Create Wallet Transaction**
   - [ ] Create pending transaction in `wallet_transactions`
   - [ ] Note `transaction_id`: `_______________________`

2. **Create Deposit Order**
   ```bash
   curl -X POST \
     https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-deposit-order \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount_usd": 50.00, "transaction_id": "YOUR_TRANSACTION_ID"}'
   ```
   - [ ] Order created successfully
   - [ ] Approval URL received

3. **Complete Deposit**
   - [ ] Open approval URL, approve payment
   - [ ] Webhook processed
   - [ ] Wallet balance increased

### Step 10: Split Payment Testing (Requires Onboarded Seller)

**Prerequisites**:
- [ ] Seller completed PayPal onboarding
- [ ] `profiles.paypal_merchant_id` is set
- [ ] `profiles.marketplace_approved_paypal = TRUE`
- [ ] `platform_config.enable_split_payments_paypal = TRUE`

**Test Flow**:
1. **Create Order with Split**
   ```bash
   curl -X POST \
     https://obxvffplochgeiclibng.supabase.co/functions/v1/paypal-create-order \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"booking_id": "YOUR_BOOKING_ID", "use_split_payment": true}'
   ```
   - [ ] Order created with `payment_instruction.platform_fees`
   - [ ] Payee set to seller's `merchant_id`

2. **Complete Payment**
   - [ ] Approve and capture order
   - [ ] Verify `payment_splits` record created
   - [ ] Verify split amounts: 85% owner, 15% platform

3. **Verify Funds Distribution**
   - [ ] Check seller PayPal account (85% received)
   - [ ] Check platform PayPal account (15% received)

## Monitoring

### Step 11: Set Up Monitoring

- [ ] **Webhook Logs**: Monitor Supabase function logs for PayPal webhook events
- [ ] **Error Tracking**: Check `payment_issues` table for split payment errors
- [ ] **Rate Limiting**: Monitor webhook rate limit hits
- [ ] **Payment Success Rate**: Track `payment_intents.status` distribution

### Monitoring Queries

```sql
-- Check recent PayPal payments
SELECT
  booking_id,
  provider_payment_id,
  amount,
  currency,
  status,
  created_at
FROM payments
WHERE provider = 'paypal'
ORDER BY created_at DESC
LIMIT 10;

-- Check payment issues
SELECT
  issue_type,
  severity,
  COUNT(*) as count
FROM payment_issues
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY issue_type, severity;

-- Check split payments
SELECT
  ps.booking_id,
  ps.provider,
  ps.total_amount_cents / 100.0 as total,
  ps.platform_fee_cents / 100.0 as platform_fee,
  ps.owner_amount_cents / 100.0 as owner_amount,
  ps.status,
  ps.validated_at
FROM payment_splits ps
WHERE ps.provider = 'paypal'
ORDER BY ps.created_at DESC
LIMIT 10;
```

## Rollback Plan

### If Issues Occur:

1. **Disable PayPal Edge Functions**
   ```bash
   # Remove functions or set PAYPAL_ENV to disabled state
   ```

2. **Revert Database Changes** (if critical)
   ```bash
   psql 'postgresql://...' < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Fallback to MercadoPago Only**
   - Set `enable_split_payments_paypal = FALSE` in `platform_config`
   - Hide PayPal option in frontend

## Production Readiness

### Before Going Live:

- [ ] **Change `PAYPAL_ENV` from sandbox to live**
- [ ] **Update PayPal credentials to production keys**
- [ ] **Update webhook URL to production Edge Function**
- [ ] **Test with real (small) transactions**
- [ ] **Set up monitoring alerts**
- [ ] **Document support procedures**
- [ ] **Train support team on PayPal flow**

### Legal/Compliance:

- [ ] **Terms of Service updated** to mention PayPal
- [ ] **Privacy Policy updated** (PayPal data handling)
- [ ] **PayPal Partner Agreement reviewed** (if using marketplaces)
- [ ] **Fees disclosed to users** (PayPal transaction fees)

## Post-Deployment

- [ ] **Monitor webhook logs** for 24 hours
- [ ] **Check error rates** in Supabase dashboard
- [ ] **Verify split payments** working correctly
- [ ] **User feedback** on PayPal experience
- [ ] **Performance metrics** (payment completion rate)

---

## Quick Reference

### Useful Commands

```bash
# Check Edge Function logs
supabase functions logs paypal-webhook

# Check secrets
supabase secrets list

# Restart Edge Functions
supabase functions deploy paypal-webhook

# Connect to database
psql 'postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres'
```

### Key Endpoints

- **Create Order**: `POST /functions/v1/paypal-create-order`
- **Capture Order**: `POST /functions/v1/paypal-capture-order`
- **Webhook**: `POST /functions/v1/paypal-webhook`
- **Deposit**: `POST /functions/v1/paypal-create-deposit-order`

### Support Contacts

- PayPal Support: [PayPal Developer Support](https://developer.paypal.com/support/)
- Supabase Support: [Supabase Support](https://supabase.com/support)

---

**Date**: November 6, 2025
**Status**: Ready for Deployment
**Next Step**: Run database migrations
