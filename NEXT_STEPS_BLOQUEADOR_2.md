# 🚀 NEXT STEPS - BLOQUEADOR #2 SETUP SECRETS

**Current Status**: 70% Production Ready
**Blocked By**: Missing secrets configuration
**Time Required**: 1.5-2 hours
**Impact**: Unlock payment processing, payment splits, revenue flow

---

## 📋 What Needs to Be Done

You are ONE STEP away from unlocking the entire payment system. The infrastructure is built, code is written, but secrets need to be configured in 2 places.

### Three Secrets Required

1. **SUPABASE_URL**
   - What it is: Your Supabase project URL
   - Current Value: `https://obxvffplochgeiclibng.supabase.co`
   - Where it goes: Cloudflare Workers + Supabase Edge Functions

2. **SUPABASE_SERVICE_ROLE_KEY**
   - What it is: Admin-level Supabase key (service role)
   - Current Value: Has access to entire database
   - Where it goes: Cloudflare Workers + Supabase Edge Functions
   - ⚠️ SENSITIVE: Keep private, only in secrets, never commit

3. **MERCADOPAGO_ACCESS_TOKEN**
   - What it is: Your MercadoPago seller API token
   - Current Value: Ask your MercadoPago dashboard
   - Where it goes: Cloudflare Workers + Supabase Edge Functions
   - ⚠️ SENSITIVE: Never commit to git

---

## ✅ Step-by-Step Instructions

### STEP 1: Get Secrets from Current Environment (5 min)

Your secrets are already in your development environment:

```bash
# Extract current secrets
grep "SUPABASE_URL\|SUPABASE_SERVICE_ROLE_KEY\|MERCADOPAGO" \
  /home/edu/autorenta/.env.test

# Expected output:
# SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# MERCADOPAGO_ACCESS_TOKEN=... (if set, otherwise from dashboard)
```

Copy these values. You'll need them for the next steps.

---

### STEP 2: Configure Cloudflare Workers Secrets (30 min)

Cloudflare Workers runs the payment webhook logic. It needs 3 secrets.

#### 2a. Install Wrangler (if not already done)
```bash
npm install -g wrangler
# or if using project wrangler:
npx wrangler secret --help
```

#### 2b. Set Secrets via Wrangler CLI

Navigate to workers directory:
```bash
cd /home/edu/autorenta/functions/workers/payments_webhook
```

Set each secret:
```bash
# Set Supabase URL
wrangler secret put SUPABASE_URL
# When prompted, paste: https://obxvffplochgeiclibng.supabase.co

# Set Supabase Service Role Key
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Set MercadoPago Token
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# When prompted, paste your token from MercadoPago dashboard
```

#### 2c. Verify Secrets Were Set
```bash
wrangler secret list
# Should show:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# MERCADOPAGO_ACCESS_TOKEN
```

---

### STEP 3: Configure Supabase Edge Functions Secrets (30 min)

Supabase Edge Functions handle payment processing and webhooks. They need the same 3 secrets.

#### 3a. Using Supabase CLI

```bash
# From project root
npx supabase secrets set SUPABASE_URL="https://obxvffplochgeiclibng.supabase.co"

npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="your-token-here"
```

#### 3b. OR Using Supabase Dashboard (Alternative)

If CLI doesn't work:

1. Go to https://app.supabase.com
2. Select your project: `obxvffplochgeiclibng`
3. Navigate to: Settings → Functions → Secrets
4. Click "Add new secret"
5. Add each of the 3 secrets above

#### 3c. Verify Secrets in Supabase
```bash
npx supabase secrets list
# Should show all 3 secrets
```

---

### STEP 4: Deploy Edge Functions (20 min)

Now deploy the functions with the secrets in place:

```bash
# From project root
npx supabase functions deploy mercadopago-webhook
npx supabase functions deploy mercadopago-create-preference
npx supabase functions deploy mercadopago-create-booking-preference
npx supabase functions deploy process-payment-split

# Verify deployment
npx supabase functions list
```

Expected output:
```
Functions in obxvffplochgeiclibng:
✅ mercadopago-webhook (Deployed)
✅ mercadopago-create-preference (Deployed)
✅ mercadopago-create-booking-preference (Deployed)
✅ process-payment-split (Deployed)
```

---

### STEP 5: Configure MercadoPago Webhook (30 min)

MercadoPago needs to know where to send payment notifications.

#### 5a. Get Your Webhook URL

Your deployed Edge Function URL is:
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

#### 5b. Configure in MercadoPago Dashboard

1. Log in to MercadoPago: https://www.mercadopago.com.ar/account/dashboard
2. Go to: Settings → API Keys & OAuth
3. Find: Webhook Configuration
4. Add Notification URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
   ```
5. Select events to listen:
   - ✅ payment.created
   - ✅ payment.updated
   - ✅ payment.cancelled

#### 5c. Test Webhook
```bash
# MercadoPago provides a test button in dashboard
# Click "Test" to verify webhook is receiving notifications
```

---

### STEP 6: Test End-to-End (30 min)

Now test the entire payment flow:

#### 6a. Test Payment Intent Creation
```bash
# 1. Start dev server
npm run start  # from apps/web

# 2. Go to http://localhost:4200
# 3. Create a test booking
# 4. Click "Depositar" (deposit)
# 5. You should see MercadoPago checkout
```

#### 6b. Test Payment Processing
```bash
# In another terminal:
# Monitor payment intents (check Supabase dashboard)
# or run:

node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://obxvffplochgeiclibng.supabase.co', 'YOUR_SERVICE_KEY');
setInterval(async () => {
  const { data } = await s.from('payment_intents').select('*').order('created_at', { ascending: false }).limit(1);
  console.log(data?.[0]);
}, 2000);
"
```

#### 6c. Watch for Webhook Calls
In Supabase dashboard, watch Edge Function logs:
- Go to Edge Functions → mercadopago-webhook
- Filter logs by timestamp
- Should see incoming webhook notifications

#### 6d. Verify Payment Split
Once payment completes:
1. Check `payment_splits` table (should have new row)
2. Check `user_wallets` (locador's balance should increase)
3. Check `wallet_transactions` (should have 2 entries: deposit + payout)

---

## ⚠️ Troubleshooting

### Problem: "Secret not found" in Edge Function
**Solution**:
- Verify secret was set: `npx supabase secrets list`
- Redeploy function: `npx supabase functions deploy mercadopago-webhook`
- Wait 30 seconds for deployment to complete

### Problem: "Invalid signature" from webhook
**Solution**:
- MercadoPago token is invalid or expired
- Check token in MercadoPago dashboard
- Update secret: `wrangler secret put MERCADOPAGO_ACCESS_TOKEN`
- Redeploy: `npm run deploy:workers`

### Problem: Webhook not being called
**Solution**:
- Check webhook URL in MercadoPago is correct
- Verify URL in MercadoPago matches: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
- Click "Test" button in MercadoPago to send test webhook
- Check Supabase logs for errors

### Problem: Payment not completing
**Solution**:
- Check payment_intents status: `SELECT * FROM payment_intents WHERE id = '...';`
- Check Edge Function logs for errors
- Verify secrets are correct in both Cloudflare and Supabase
- Test with sandbox MercadoPago first (if available)

---

## 📊 Success Criteria

When you've successfully completed Bloqueador #2:

✅ All 3 secrets configured in Cloudflare Workers
✅ All 3 secrets configured in Supabase Edge Functions
✅ All 4 Edge Functions deployed successfully
✅ MercadoPago webhook configured and tested
✅ Test payment completes end-to-end
✅ payment_intents status changes to 'completed'
✅ payment_splits table populated with split data
✅ user_wallets updated with payment amounts

**Result**: Production Readiness: 70% → 75% ✅

---

## 🎯 Next After This

Once Bloqueador #2 is complete:

1. **Bloqueador #3**: E2E payment testing
2. **Unit Tests**: Split payment logic
3. **CI/CD Setup**: GitHub Actions
4. **Deuda Técnica Phase 1**: High-priority fixes
5. **Final Validation**: Prepare for go-live

---

## 📞 Quick Reference

| Component | Status | Action |
|-----------|--------|--------|
| Code | ✅ Done | Nothing needed |
| Secrets (Cloudflare) | ⏳ TODO | Set via `wrangler secret put` |
| Secrets (Supabase) | ⏳ TODO | Set via `npx supabase secrets set` |
| Deploy Functions | ⏳ TODO | Run `npx supabase functions deploy` |
| MercadoPago Webhook | ⏳ TODO | Configure in dashboard |
| End-to-End Test | ⏳ TODO | Test payment flow |

---

## 🚀 Start Now!

Ready to proceed? Begin with **STEP 1** above. Total time: 1.5-2 hours.

Once done, you'll unlock:
- ✅ Payment processing
- ✅ Payment splits (revenue distribution)
- ✅ Payout requests for locadores
- ✅ Complete wallet system

**Estimated Production Readiness after**: 75% (up from 70%)

---

Generated: 29 Octubre 2025
Status: 🔴 BLOQUEADOR #2 - ACTION REQUIRED
