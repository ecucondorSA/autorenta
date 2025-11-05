# Claude CLI Task: Complete MercadoPago Preauthorization System

## Context
This task completes the MercadoPago preauthorization implementation for AutoRenta. Read `WARP.md` and `CLAUDE.md` first to understand the project architecture.

## Current Status (from WARP.md)

**✅ Already Implemented:**
- Database table `payment_intents` with all required fields
- RPC function `create_payment_authorization()`
- Edge Function `mp-create-preauth` (creates authorization with `capture: false`)
- Frontend service `PaymentAuthorizationService` (creates and queries preauths)

**❌ TODO (Your Tasks):**

### Task 1: Create Edge Function `mp-capture-preauth`

**Location:** `supabase/functions/mp-capture-preauth/index.ts`

**Functionality:**
1. Accept request body: `{ intent_id: string, amount_ars?: number }`
2. Query `payment_intents` table to get:
   - `mp_payment_id` (MercadoPago payment ID)
   - `user_id`, `booking_id`, `amount_ars`, `amount_usd`
   - Verify status is `'authorized'`
3. Call MercadoPago API:
   ```typescript
   POST https://api.mercadopago.com/v1/payments/{mp_payment_id}?capture=true
   Headers:
     Authorization: Bearer {MERCADOPAGO_ACCESS_TOKEN}
     Content-Type: application/json
   Body: { transaction_amount: amount_ars } // optional partial capture
   ```
4. Update `payment_intents`:
   ```typescript
   status: 'captured',
   captured_at: now(),
   amount_captured_ars: captured_amount,
   mp_status: response.status
   ```
5. Call RPC `capture_preauth()` (you'll create this in Task 4) to:
   - Create `wallet_ledger` entries (debit from renter, credit to owner)
   - Update booking status if applicable

**Error Handling:**
- If payment not found or not authorized → 404
- If MercadoPago API fails → Update intent to 'failed' with error details
- If already captured → 409 Conflict

**Reference:** See `supabase/functions/mp-create-preauth/index.ts` for structure

---

### Task 2: Create Edge Function `mp-cancel-preauth`

**Location:** `supabase/functions/mp-cancel-preauth/index.ts`

**Functionality:**
1. Accept request body: `{ intent_id: string, reason?: string }`
2. Query `payment_intents` to get `mp_payment_id`
   - Verify status is `'authorized'`
3. Call MercadoPago API:
   ```typescript
   PUT https://api.mercadopago.com/v1/payments/{mp_payment_id}
   Headers:
     Authorization: Bearer {MERCADOPAGO_ACCESS_TOKEN}
     Content-Type: application/json
   Body: { status: 'cancelled' }
   ```
4. Update `payment_intents`:
   ```typescript
   status: 'cancelled',
   cancelled_at: now(),
   metadata: { ...existing, cancellation_reason: reason }
   ```
5. Call RPC `cancel_preauth()` to release any locked funds

**Error Handling:**
- If payment not found or not authorized → 404
- If MercadoPago API fails → Log error but still update local status
- If already cancelled/expired → 409 Conflict

---

### Task 3: Update Webhook for Preauth Events

**Location:** `supabase/functions/mercadopago-webhook/index.ts`

**Modifications:**
1. Add handling for payment events where `metadata.type === 'preauth'`
2. Map MercadoPago statuses to `payment_intents` statuses:
   ```typescript
   MP Status → DB Status
   'authorized' → 'authorized'
   'approved' → 'captured' (if capture=true called)
   'cancelled' → 'cancelled'
   'expired' → 'expired'
   'rejected' → 'rejected'
   ```
3. Update `payment_intents` table based on webhook data
4. For 'captured' events, call `capture_preauth()` RPC if not already processed
5. Add idempotency check using `mp_payment_id` to prevent duplicate processing

**Reference:** See current webhook implementation in the file

---

### Task 4: Create Database Migration with RPCs

**Location:** `supabase/migrations/20251024_preauth_capture_cancel_rpcs.sql`

**Functions to Create:**

#### 4.1: `capture_preauth()`
```sql
CREATE OR REPLACE FUNCTION public.capture_preauth(
  p_intent_id uuid,
  p_amount_captured_ars numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent record;
  v_debit_id uuid;
  v_credit_id uuid;
BEGIN
  -- Get intent details
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE id = p_intent_id
  AND status = 'captured';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intent not found or not captured');
  END IF;
  
  -- Create wallet_ledger entries (double-entry)
  -- Debit from renter
  INSERT INTO wallet_ledger (
    user_id,
    kind,
    amount_ars,
    amount_usd,
    balance_after_ars,
    balance_after_usd,
    ref,
    metadata
  ) VALUES (
    v_intent.user_id,
    'preauth_capture_debit',
    -p_amount_captured_ars,
    -v_intent.amount_usd,
    (SELECT balance_ars FROM user_wallets WHERE user_id = v_intent.user_id) - p_amount_captured_ars,
    (SELECT balance_usd FROM user_wallets WHERE user_id = v_intent.user_id) - v_intent.amount_usd,
    'capture_' || p_intent_id::text,
    jsonb_build_object(
      'intent_id', p_intent_id,
      'booking_id', v_intent.booking_id,
      'mp_payment_id', v_intent.mp_payment_id
    )
  ) RETURNING id INTO v_debit_id;
  
  -- Credit to owner (get from booking)
  -- TODO: Implement based on your bookings table structure
  
  -- Update user_wallets
  UPDATE user_wallets
  SET balance_ars = balance_ars - p_amount_captured_ars,
      balance_usd = balance_usd - v_intent.amount_usd
  WHERE user_id = v_intent.user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'debit_id', v_debit_id,
    'credit_id', v_credit_id
  );
END;
$$;
```

#### 4.2: `cancel_preauth()`
```sql
CREATE OR REPLACE FUNCTION public.cancel_preauth(
  p_intent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent record;
BEGIN
  -- Get intent details
  SELECT * INTO v_intent
  FROM payment_intents
  WHERE id = p_intent_id
  AND status = 'cancelled';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intent not found or not cancelled');
  END IF;
  
  -- Release any locked funds if applicable
  -- Check if funds were locked in user_wallets
  UPDATE user_wallets
  SET locked_funds_ars = GREATEST(0, locked_funds_ars - v_intent.amount_ars),
      locked_funds_usd = GREATEST(0, locked_funds_usd - v_intent.amount_usd)
  WHERE user_id = v_intent.user_id
  AND locked_funds_ars >= v_intent.amount_ars;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
```

**RLS Policies:**
```sql
-- Service role can execute these functions (for webhooks)
-- Users can call via Edge Functions (which use service role)
```

---

### Task 5: Update Frontend Service

**Location:** `apps/web/src/app/core/services/payment-authorization.service.ts`

**Add Methods:**

```typescript
/**
 * Captures a preauthorization (charges the held funds)
 */
captureAuthorization(
  authorizedPaymentId: string,
  amountArs?: number
): Observable<{ ok: boolean; error?: string }> {
  return from(
    (async () => {
      const session = await this.authService.ensureSession();
      if (!session?.access_token) {
        throw new Error('No session token');
      }

      const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/mp-capture-preauth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent_id: authorizedPaymentId,
            amount_ars: amountArs,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al capturar la autorización');
      }

      const data = await response.json();
      return { ok: data.success, error: data.error };
    })()
  ).pipe(
    catchError((error) => {
      console.error('Error in captureAuthorization:', error);
      return of({ ok: false, error: error.message });
    })
  );
}

/**
 * Cancels a preauthorization (releases the held funds)
 * Updates the existing cancelAuthorization to call the new Edge Function
 */
cancelAuthorization(
  authorizedPaymentId: string,
  reason?: string
): Observable<{ ok: boolean; error?: string }> {
  return from(
    (async () => {
      const session = await this.authService.ensureSession();
      if (!session?.access_token) {
        throw new Error('No session token');
      }

      const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/mp-cancel-preauth`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            intent_id: authorizedPaymentId,
            reason: reason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cancelar la autorización');
      }

      const data = await response.json();
      return { ok: data.success, error: data.error };
    })()
  ).pipe(
    catchError((error) => {
      console.error('Error in cancelAuthorization:', error);
      return of({ ok: false, error: error.message });
    })
  );
}
```

---

## Testing Instructions

After implementation, test the full flow:

### 1. Test Capture Flow
```bash
# Terminal 1: Start Edge Function
supabase functions serve mp-capture-preauth

# Terminal 2: Test with curl
TOKEN="..." # Get from browser localStorage
curl -X POST http://localhost:54321/functions/v1/mp-capture-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"intent_id":"YOUR_INTENT_ID"}'

# Verify in DB
psql ... -c "SELECT * FROM payment_intents WHERE id='YOUR_INTENT_ID';"
psql ... -c "SELECT * FROM wallet_ledger WHERE metadata->>'intent_id' = 'YOUR_INTENT_ID';"
```

### 2. Test Cancel Flow
```bash
# Terminal 1: Start Edge Function
supabase functions serve mp-cancel-preauth

# Terminal 2: Test with curl
curl -X POST http://localhost:54321/functions/v1/mp-cancel-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"intent_id":"YOUR_INTENT_ID","reason":"User requested cancellation"}'

# Verify in DB
psql ... -c "SELECT * FROM payment_intents WHERE id='YOUR_INTENT_ID';"
```

### 3. Deploy to Production
```bash
# Deploy Edge Functions
supabase functions deploy mp-capture-preauth --project-ref obxvffplochgeiclibng
supabase functions deploy mp-cancel-preauth --project-ref obxvffplochgeiclibng

# Apply migration
supabase db push

# Deploy frontend
cd apps/web && npm run deploy:pages
```

---

## Key Conventions to Follow (from CLAUDE.md)

1. **Vertical Stack Debugging**: Test each layer independently
   - Edge Function logic
   - Database RPCs
   - Frontend service calls
   - UI integration

2. **Error Handling**: Always catch and log errors at each layer

3. **Idempotency**: Use `mp_payment_id` or `intent_id` as idempotency keys

4. **RLS Policies**: Ensure service role can update `payment_intents`

5. **TypeScript Types**: Use existing types from `database.types.ts`

---

## How to Run This Task with Claude CLI

```bash
cd /home/edu/autorenta
claude "Implement the MercadoPago preauthorization system following the instructions in CLAUDE_PREAUTH_TASK.md. Read WARP.md and CLAUDE.md first for context."
```

Or in interactive mode:
```bash
claude
> Implement the tasks in CLAUDE_PREAUTH_TASK.md
```

---

**Expected Outcome:**
Complete MercadoPago preauthorization system with capture, cancel, webhook integration, and frontend UI ready for production use.
