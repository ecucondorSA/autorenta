# Flow: Wallet Deposit

**Last Updated:** 2025-11-06
**Complexity:** MEDIUM (2 service dependencies, external API integration)
**Critical Path:** YES (Payment system)

---

## Overview

This document traces the complete wallet deposit flow from UI initiation through MercadoPago payment and funds being credited to the user's wallet. The flow includes special handling for cash vs card deposits (non-withdrawable floor logic).

---

## Entry Point

**Component:** WalletPage
**File:** `apps/web/src/app/features/wallet/wallet.page.ts` (Lines 70-535)
**Method:** `openDepositModal()` (Lines 281-283)
**Trigger:** User clicks "Depositar" button

### Deposit Modal Component

**File:** `apps/web/src/app/shared/components/deposit-modal/deposit-modal.component.ts` (Lines 1-288)

**User Inputs:**
- `arsAmount` (Signal, Line 33): Amount in Argentine pesos
- `provider` (Signal, Line 43): Selected payment provider ('mercadopago')
- `depositType` (Signal, Line 45): 'protected_credit' or 'withdrawable'

**Currency Conversion (Lines 97-115):**
```typescript
async loadExchangeRate(): Promise<void> {
  const rate = await this.exchangeRateService.getPlatformRate();
  this.platformRate.set(rate);
}

updateConversionPreview(ars: number): Promise<void> {
  const usd = Math.round((ars / this.platformRate()) * 100) / 100;
  this.usdAmount.set(usd);
}
```

**Validation:**
- Minimum deposit: $10 USD / $100 ARS
- Maximum deposit: $5,000 USD
- Double-click protection (2-second cooldown)

---

## Service Layer Flow

### Step 1: WalletService.initiateDeposit()

**File:** `apps/web/src/app/core/services/wallet.service.ts` (Lines 136-172)

```typescript
initiateDeposit(params: InitiateDepositParams): Observable<Response> {
  // 1. Call RPC: wallet_initiate_deposit
  return from(
    this.supabase.rpc('wallet_initiate_deposit', {
      p_amount: params.amount,
      p_provider: params.provider ?? 'mercadopago',
      p_description: params.description,
      p_allow_withdrawal: params.allowWithdrawal ?? false
    })
  ).pipe(
    // 2. If successful, create MercadoPago preference
    switchMap((response) => {
      if (params.provider === 'mercadopago') {
        return from(
          this.createMercadoPagoPreference(
            result.transaction_id,
            params.amount,
            params.description
          )
        );
      }
      return from(Promise.resolve(result));
    })
  );
}
```

### Step 2: createMercadoPagoPreference()

**File:** `apps/web/src/app/core/services/wallet.service.ts` (Lines 174-201)

```typescript
private async createMercadoPagoPreference(
  transactionId: string,
  amount: number,
  description: string
): Promise<void> {
  // Get auth token
  const { data: { session } } = await this.supabase.auth.getSession();

  // Call Edge Function
  const response = await this.supabase.functions.invoke(
    'mercadopago-create-preference',
    {
      body: { transaction_id: transactionId, amount, description },
      headers: { Authorization: `Bearer ${session.access_token}` }
    }
  );

  if (error) throw error;
}
```

---

## Database Layer: RPC Functions

### RPC 1: wallet_initiate_deposit()

**File:** `apps/web/database/wallet/rpc_wallet_initiate_deposit.sql` (Lines 13-170)

**Parameters:**
- `p_amount`: NUMERIC (USD amount)
- `p_provider`: TEXT ('mercadopago')
- `p_description`: TEXT
- `p_allow_withdrawal`: BOOLEAN (cash vs card flag)

**Execution:**

```sql
-- 1. Get authenticated user
v_user_id := auth.uid();

-- 2. Validate amount
IF p_amount < 10 THEN
  RAISE EXCEPTION 'El depósito mínimo es $10 USD';
END IF;

-- 3. Ensure profile exists
INSERT INTO profiles (id, full_name)
VALUES (v_user_id, ...)
ON CONFLICT (id) DO NOTHING;

-- 4. Create pending transaction
INSERT INTO wallet_transactions (
  id, user_id, type, status, amount, currency,
  provider, description, is_withdrawable
) VALUES (
  gen_random_uuid(), v_user_id, 'deposit', 'pending',
  p_amount, 'USD', p_provider, p_description, p_allow_withdrawal
) RETURNING id INTO v_transaction_id;

-- 5. Return transaction details
RETURN QUERY SELECT
  v_transaction_id,
  TRUE AS success,
  'Depósito iniciado...' AS message,
  p_provider,
  NULL AS payment_url,
  'pending'::TEXT,
  p_allow_withdrawal;
```

---

## Edge Function: mercadopago-create-preference

**File:** `supabase/functions/mercadopago-create-preference/index.ts` (Lines 38-472)

### Processing Steps

**Step 1: Authorization (Lines 99-168)**
```typescript
// Verify JWT token
const { data: { user } } = await supabase.auth.getUser(authToken);

// Verify transaction exists and belongs to user
const { data: transaction } = await supabase
  .from('wallet_transactions')
  .select('*')
  .eq('id', transaction_id)
  .eq('status', 'pending')
  .single();

// SECURITY: Verify ownership
if (transaction.user_id !== user.id) {
  return 403 Forbidden;
}
```

**Step 2: Idempotency Check (Lines 186-209)**
```typescript
// If preference already exists, return it
if (transaction.provider_metadata?.preference_id) {
  return {
    success: true,
    init_point: transaction.provider_metadata.init_point,
    message: 'Using existing preference'
  };
}
```

**Step 3: Customer Creation (Lines 223-293)**
```typescript
// Create MercadoPago customer if doesn't exist
if (!profile?.mercadopago_customer_id) {
  const customerResponse = await fetch(
    'https://api.mercadopago.com/v1/customers',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        email, first_name, last_name, phone, identification
      })
    }
  );
  
  customerId = customer.id;
  
  // Save to profile
  await supabase.from('profiles')
    .update({ mercadopago_customer_id: customerId })
    .eq('id', user.id);
}
```

**Step 4: Build Preference (Lines 310-358)**
```typescript
const preferenceData = {
  items: [{
    id: transaction_id,
    title: description || 'Depósito a Wallet - AutoRenta',
    quantity: 1,
    unit_price: amount,
    currency_id: 'ARS'  // CRITICAL: Argentina uses ARS
  }],
  back_urls: {
    success: `${APP_BASE_URL}/wallet?payment=success&transaction_id=...`,
    failure: `${APP_BASE_URL}/wallet?payment=failure&transaction_id=...`,
    pending: `${APP_BASE_URL}/wallet?payment=pending&transaction_id=...`
  },
  external_reference: transaction_id,
  notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
  statement_descriptor: 'AUTORENTAR'
};
```

**Step 5: Call MercadoPago API (Lines 412-419)**
```typescript
const mpResponse = await fetch(
  'https://api.mercadopago.com/checkout/preferences',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
    },
    body: JSON.stringify(preferenceData)
  }
);

const mpData = await mpResponse.json();
```

**Step 6: Store Preference ID (Lines 431-443)**
```typescript
await supabase.from('wallet_transactions')
  .update({
    provider_metadata: {
      preference_id: mpData.id,
      init_point: mpData.init_point
    }
  })
  .eq('id', transaction_id);

return {
  success: true,
  preference_id: mpData.id,
  init_point: mpData.init_point
};
```

---

## User Payment Flow

**External:** MercadoPago hosted checkout page

### Payment Options

| Payment Type | payment_type_id | Withdrawable? |
|--------------|-----------------|---------------|
| Credit Card | `credit_card` | ✅ YES |
| Debit Card | `debit_card` | ✅ YES |
| Cash (Pago Fácil) | `ticket` | ❌ NO |
| Account Money | `account_money` | ✅ YES |

**Key Field:** `payment_type_id` determines if funds are withdrawable

---

## Webhook Processing: mercadopago-webhook

**File:** `supabase/functions/mercadopago-webhook/index.ts` (Lines 38-1007)

### Security Validation

**1. IP Validation (Lines 160-183)**
- Check against MercadoPago IP ranges
- Reject unauthorized IPs in production

**2. Rate Limiting (Lines 189-215)**
- Max 100 requests per minute per IP

**3. HMAC Signature (Lines 266-342)**
```typescript
// Calculate HMAC-SHA256
const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`;
const calculatedHash = await crypto.subtle.sign('HMAC', cryptoKey, manifest);

// Verify
if (calculatedHash !== hash) {
  return 403 Forbidden;
}
```

### Payment Processing

**Step 1: Fetch Payment Details (Lines 368-431)**
```typescript
const mpResponse = await fetch(
  `https://api.mercadopago.com/v1/payments/${paymentId}`,
  {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
  }
);

const paymentData = await mpResponse.json();
```

**Step 2: Status Check (Lines 640-654)**
```typescript
if (paymentData.status !== 'approved') {
  return { success: true, message: 'Payment not approved yet' };
}
```

**Step 3: Determine Transaction Type (Lines 668-918)**
```typescript
// Check if it's a wallet deposit (not booking)
const { data: transaction } = await supabase
  .from('wallet_transactions')
  .select('*')
  .eq('id', reference_id)
  .eq('type', 'deposit')
  .single();

if (transaction) {
  // Process wallet deposit
  await confirmWalletDeposit(transaction, paymentData);
}
```

**Step 4: Idempotency Check (Lines 908-918)**
```typescript
if (transaction.status === 'completed') {
  return { success: true, message: 'Already completed' };
}
```

**Step 5: Call Confirmation RPC (Lines 923-946)**
```typescript
const { data: confirmResult } = await supabase.rpc(
  'wallet_confirm_deposit_admin',
  {
    p_user_id: transaction.user_id,
    p_transaction_id: transaction.id,
    p_provider_transaction_id: paymentData.id.toString(),
    p_provider_metadata: {
      id: paymentData.id,
      status: paymentData.status,
      payment_type_id: paymentData.payment_type_id,  // CRITICAL
      transaction_amount: paymentData.transaction_amount,
      date_approved: paymentData.date_approved
    }
  }
);
```

---

## Database: wallet_confirm_deposit_admin() RPC

**File:** `apps/web/database/wallet/rpc_wallet_confirm_deposit_admin.sql` (Lines 11-126)

### CRITICAL: Cash vs Card Detection

**Step 1: Extract Payment Type (Lines 188-196)**
```sql
-- Extract payment_type_id from metadata
v_payment_type := p_provider_metadata->>'payment_type_id';

-- Payments in cash (ticket) are NOT withdrawable
v_is_withdrawable := COALESCE(
  v_transaction.is_withdrawable AND (v_payment_type != 'ticket'),
  v_transaction.is_withdrawable,
  TRUE
);
```

**Mapping:**
- `payment_type_id = 'ticket'` → `v_is_withdrawable = FALSE`
- `payment_type_id = 'credit_card'` → `v_is_withdrawable = TRUE`

**Step 2: Update Transaction (Lines 198-209)**
```sql
UPDATE wallet_transactions
SET
  status = 'completed',
  provider_transaction_id = p_provider_transaction_id,
  provider_metadata = provider_metadata || p_provider_metadata || jsonb_build_object(
    'confirmed_at', NOW(),
    'is_cash_deposit', (v_payment_type = 'ticket')
  ),
  completed_at = NOW(),
  is_withdrawable = v_is_withdrawable
WHERE id = p_transaction_id;
```

**Step 3: Ensure Wallet Exists (Lines 211-214)**
```sql
INSERT INTO user_wallets (user_id, currency)
VALUES (p_user_id, 'USD')
ON CONFLICT (user_id) DO NOTHING;
```

**Step 4: CRITICAL - Update non_withdrawable_floor for Cash (Lines 216-225)**
```sql
-- If cash deposit, increment non_withdrawable_floor
IF NOT v_is_withdrawable THEN
  UPDATE user_wallets
  SET
    non_withdrawable_floor = non_withdrawable_floor + v_transaction.amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END IF;
```

**This is the key operation:** Cash deposits are added to `non_withdrawable_floor`, making them available for bookings but not for withdrawal to bank.

**Step 5: Calculate Updated Balances (Lines 227-236)**
```sql
SELECT
  available_balance,
  locked_balance,
  non_withdrawable_floor
INTO v_available, v_locked, v_floor
FROM user_wallets
WHERE user_id = p_user_id;

v_withdrawable := GREATEST(0, v_available - v_floor);
```

---

## Balance Calculation Logic

### wallet_get_balance() RPC

**File:** `apps/web/database/wallet/rpc_wallet_get_balance.sql` (Lines 13-91)

**Formula:**
```sql
-- Available = deposits + refunds + bonuses - charges
available_balance = SUM(
  CASE
    WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
    WHEN type IN ('charge') THEN -amount
  END
)

-- Locked = locks - unlocks
locked_balance = SUM(
  CASE
    WHEN type = 'lock' THEN amount
    WHEN type = 'unlock' THEN -amount
  END
)

-- Non-withdrawable = floor from user_wallets
non_withdrawable_floor = user_wallets.non_withdrawable_floor

-- Withdrawable = available - non_withdrawable_floor
withdrawable_balance = GREATEST(0, available_balance - non_withdrawable_floor)
```

**Example:**
```
Available Balance: $500
Non-Withdrawable Floor: $200 (from cash deposits)

→ Withdrawable: $300
→ Non-Withdrawable: $200
```

---

## Cash vs Card Handling Comparison

| Aspect | Cash (Pago Fácil) | Card (Credit/Debit) |
|--------|-------------------|-------------------|
| **payment_type_id** | `'ticket'` | `'credit_card'` or `'debit_card'` |
| **is_withdrawable** | FALSE | TRUE |
| **non_withdrawable_floor** | Incremented | Not changed |
| **available_balance** | Includes amount | Includes amount |
| **withdrawable_balance** | Reduced | Full amount |
| **Use for bookings** | ✅ Yes | ✅ Yes |
| **Withdraw to bank** | ❌ No | ✅ Yes |
| **UI Label** | "Crédito permanente" | "Saldo retirable" |

---

## Success Path

```
1. User: Clicks "Depositar" → Opens modal
2. User: Enters $100 USD / ~$175,000 ARS
3. User: Selects provider "MercadoPago"
4. User: Clicks "Continuar"
5. Frontend: WalletService.initiateDeposit()
6. RPC: wallet_initiate_deposit() → Creates pending transaction
7. Edge Function: mercadopago-create-preference → Creates customer, builds preference
8. MercadoPago API: Returns init_point URL
9. Frontend: Redirects user to MercadoPago checkout
10. User: Selects payment method (e.g., cash)
11. User: Gets barcode → Goes to Pago Fácil → Pays cash
12. Pago Fácil: Confirms to MercadoPago
13. MercadoPago: Sends IPN webhook
14. Edge Function: Validates signature, fetches payment details
15. RPC: wallet_confirm_deposit_admin() → Detects cash (payment_type_id='ticket')
16. Database: Increments non_withdrawable_floor by $100
17. Database: Updates transaction status='completed'
18. Frontend: User redirected to /wallet?payment=success
19. UI: Shows "Saldo disponible: $100 (No retirable)"
```

---

## Error Paths

### Error: Insufficient Amount
```
User enters $5 USD
→ Validation fails: "El depósito mínimo es $10 USD"
→ Modal shows error message
```

### Error: Ownership Violation
```
User tampers with transaction_id in request
→ Edge Function fetches transaction
→ transaction.user_id ≠ authenticated_user_id
→ Return 403 Forbidden: "This transaction does not belong to you"
```

### Error: MercadoPago API Failure
```
Edge Function calls MercadoPago API
→ API returns 500 error
→ Edge Function throws error
→ Frontend shows: "Error al crear preferencia. Intenta de nuevo."
```

### Error: Invalid Webhook Signature
```
Webhook received with tampered signature
→ HMAC validation fails
→ Return 403 Forbidden
→ MercadoPago retries with correct signature
```

---

## File References

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| **UI Entry** | `apps/web/src/app/features/wallet/wallet.page.ts` | 70-535 | Wallet page |
| **Deposit Modal** | `apps/web/src/app/shared/components/deposit-modal/deposit-modal.component.ts` | 1-288 | Deposit form |
| **WalletService** | `apps/web/src/app/core/services/wallet.service.ts` | 136-201 | Deposit initiation |
| **RPC: Initiate** | `apps/web/database/wallet/rpc_wallet_initiate_deposit.sql` | 13-170 | Creates pending transaction |
| **RPC: Confirm** | `apps/web/database/wallet/rpc_wallet_confirm_deposit_admin.sql` | 11-126 | Credits funds (cash detection) |
| **RPC: Balance** | `apps/web/database/wallet/rpc_wallet_get_balance.sql` | 13-91 | Calculates balance breakdown |
| **Edge: Preference** | `supabase/functions/mercadopago-create-preference/index.ts` | 38-472 | Creates MP preference |
| **Edge: Webhook** | `supabase/functions/mercadopago-webhook/index.ts` | 38-1007 | Processes MP webhook |
| **Cash Fix Migration** | `supabase/migrations/20251028_fix_non_withdrawable_cash_deposits.sql` | 1-564 | Cash deposit logic |

---

## Related Documentation

- **Payment Checkout:** See `docs/flows/FLOW_PAYMENT_CHECKOUT.md`
- **Booking Creation:** See `docs/flows/FLOW_BOOKING_CREATION.md`
- **Wallet System Guide:** See `WALLET_SYSTEM_DOCUMENTATION.md`

---

**Last Verified:** 2025-11-06
