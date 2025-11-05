# PRD: Wallet Deposit Flow

**Document**: Product Requirements Document
**Feature**: Wallet Deposit with MercadoPago Integration
**Priority**: P0 (Critical - Enables All Payments)
**Status**: Approved
**Owner**: Product Team
**Created**: 2025-11-04
**Last Updated**: 2025-11-04

---

## 1. Overview

### 1.1 Feature Description
The wallet deposit flow allows users to add funds to their AutorentA wallet using MercadoPago. Users can deposit via credit/debit card or cash (Pago Fácil/Rapipago) and use the balance for instant booking payments without entering card details each time.

### 1.2 Problem Statement
Users need a way to:
- **Pre-load funds** for faster bookings (no card entry each time)
- **Use cash** for deposits (Argentina: 30%+ prefer cash)
- **See balance** instantly after deposit confirmation
- **Trust the system** with clear transaction history

Without wallet deposits, every booking requires card entry or MercadoPago redirect, adding friction and reducing conversion.

### 1.3 Success Criteria
- 40%+ of payments use wallet balance (vs MercadoPago direct)
- 95%+ deposit success rate (including webhook confirmation)
- <1% duplicate deposits (webhook idempotency working)
- <10 minutes average time from deposit initiation to balance update

---

## 2. User Story

> As a **registered user**, I want to **deposit funds into my wallet** so that I can **pay for bookings instantly without entering card details every time**.

**Additional Benefits**:
- Use cash for deposits (cash → wallet → booking)
- Build trust by seeing transaction history
- Faster checkout (1 click vs 5+ form fields)

---

## 3. Acceptance Criteria

- ✅ **AC1**: User can view current wallet balance on /wallet page
- ✅ **AC2**: User can initiate deposit by entering amount (minimum $500 ARS)
- ✅ **AC3**: System creates pending transaction record with unique ID
- ✅ **AC4**: System generates MercadoPago checkout URL (preference)
- ✅ **AC5**: User redirected to MercadoPago to complete payment
- ✅ **AC6**: User can pay via credit card, debit card, or cash (Pago Fácil)
- ✅ **AC7**: MercadoPago sends IPN webhook after payment confirmation
- ✅ **AC8**: Webhook validates payment signature and transaction ID
- ✅ **AC9**: Webhook calls `wallet_confirm_deposit()` to credit funds
- ✅ **AC10**: Duplicate webhooks do not duplicate balance (idempotency)
- ✅ **AC11**: Cash deposits marked as non-withdrawable
- ✅ **AC12**: User sees updated balance after returning from MercadoPago
- ✅ **AC13**: Transaction history shows all deposits with status and payment method

---

## 4. User Flow (Step-by-Step)

### 4.1 Happy Path: Credit Card Deposit

**Prerequisites**: User is logged in

1. **Navigate to Wallet** (`/wallet`)
   - **User action**: Clicks "Wallet" in navigation menu
   - **System response**: Loads wallet page
   - **UI state**:
     - Current balance displayed: "Saldo: $5,000"
     - "Depositar" button visible
     - Transaction history list (if any)

2. **Initiate Deposit**
   - **User action**: Clicks "Depositar" button
   - **System response**: Opens deposit modal/form
   - **UI state**:
     - Input field: "Monto a depositar (min. $500)"
     - Payment method info: "Tarjeta, débito, o efectivo"
     - "Continuar" button

3. **Enter Amount**
   - **User action**: Types amount (e.g., "$10,000")
   - **System response**: Validates amount (≥ $500, ≤ $100,000)
   - **UI state**:
     - Amount formatted: "$10,000"
     - Summary: "Vas a depositar $10,000 en tu wallet"
     - "Continuar" button enabled

4. **Confirm Deposit**
   - **User action**: Clicks "Continuar"
   - **System response**:
     - Calls `wallet_initiate_deposit(amount: 10000, currency: 'ARS')`
     - RPC creates record in `wallet_transactions` table:
       ```sql
       INSERT INTO wallet_transactions (
         id, user_id, type, amount, status, created_at
       ) VALUES (
         'txn-uuid', 'user-uuid', 'deposit', 10000, 'pending', NOW()
       )
       ```
     - Returns `transaction_id`
   - **UI state**: Loading spinner ("Preparando pago...")

5. **Generate MercadoPago Preference**
   - **System action**:
     - Frontend calls Edge Function `mercadopago-create-preference`
     - Edge Function calls MercadoPago API:
       ```javascript
       POST /v1/checkout/preferences
       {
         external_reference: transaction_id,
         items: [{
           title: "Depósito AutorentA",
           quantity: 1,
           unit_price: 10000,
           currency_id: "ARS"
         }],
         back_urls: {
           success: "https://autorenta.com/wallet?status=success",
           failure: "https://autorenta.com/wallet?status=failure",
           pending: "https://autorenta.com/wallet?status=pending"
         },
         notification_url: "https://[project].supabase.co/functions/v1/mercadopago-webhook"
       }
       ```
     - MercadoPago returns:
       ```json
       {
         "id": "pref-123",
         "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123"
       }
       ```
   - **System response**: Returns `init_point` URL

6. **Redirect to MercadoPago**
   - **System action**: Redirects user to `init_point`
   - **UI state**: User sees MercadoPago hosted checkout page
   - **User sees**:
     - Title: "Depósito AutorentA"
     - Amount: "$10,000"
     - Payment options: Credit card, debit card, cash (Pago Fácil/Rapipago)

7. **Complete Payment (Credit Card)**
   - **User action**:
     - Selects "Tarjeta de crédito"
     - Enters card number, expiry, CVV, cardholder name
     - Clicks "Pagar"
   - **MercadoPago action**:
     - Validates card with bank
     - Processes payment
     - Generates payment ID
   - **UI state**: MercadoPago shows "Procesando..." then "¡Pago aprobado!"

8. **MercadoPago Sends Webhook**
   - **MercadoPago action**:
     - Sends IPN (Instant Payment Notification) to `notification_url`
     - POST request:
       ```
       POST https://[project].supabase.co/functions/v1/mercadopago-webhook
       {
         "id": 12345678,
         "type": "payment",
         "data": { "id": "12345678" }
       }
       ```
     - Includes `x-signature` and `x-request-id` headers for validation

9. **Webhook Processes Payment**
   - **Edge Function action**:
     - Receives webhook
     - Validates signature (prevents fake webhooks)
     - Fetches payment details from MercadoPago:
       ```javascript
       GET /v1/payments/12345678
       Response:
       {
         "id": 12345678,
         "status": "approved",
         "status_detail": "accredited",
         "external_reference": "txn-uuid",
         "transaction_amount": 10000,
         "payment_type_id": "credit_card",
         ...
       }
       ```
     - Calls RPC function:
       ```sql
       SELECT wallet_confirm_deposit(
         p_transaction_id := 'txn-uuid',
         p_payment_id := '12345678',
         p_payment_type := 'credit_card'
       );
       ```

10. **RPC Confirms Deposit**
    - **RPC function logic**:
      ```sql
      BEGIN
        -- Check transaction exists and is pending
        SELECT * FROM wallet_transactions WHERE id = p_transaction_id AND status = 'pending';

        -- Update transaction status
        UPDATE wallet_transactions SET
          status = 'completed',
          payment_id = p_payment_id,
          payment_type = p_payment_type,
          completed_at = NOW()
        WHERE id = p_transaction_id;

        -- Credit funds to wallet
        UPDATE user_wallets SET
          balance = balance + (SELECT amount FROM wallet_transactions WHERE id = p_transaction_id)
        WHERE user_id = (SELECT user_id FROM wallet_transactions WHERE id = p_transaction_id);

        -- If cash payment, mark as non-withdrawable
        IF p_payment_type = 'ticket' THEN
          UPDATE user_wallets SET
            non_withdrawable_floor = non_withdrawable_floor + (SELECT amount FROM wallet_transactions WHERE id = p_transaction_id)
          WHERE user_id = (SELECT user_id FROM wallet_transactions WHERE id = p_transaction_id);
        END IF;
      END;
      ```

11. **User Redirected Back**
    - **MercadoPago action**: Redirects user to `back_urls.success`
    - **URL**: `https://autorenta.com/wallet?status=success`
    - **System response**:
      - Frontend detects `?status=success` query param
      - Refreshes wallet balance (calls `wallet_get_balance()`)
    - **UI state**:
      - Success toast: "¡Depósito exitoso! Tu saldo fue actualizado."
      - Balance updated: "Saldo: $15,000" (was $5,000)
      - New transaction in history:
        ```
        ✅ Depósito - Tarjeta de crédito
        $10,000
        Hace 1 minuto
        ```

12. **View Transaction History**
    - **User action**: Scrolls down on /wallet page
    - **System response**: Displays all transactions (deposits, withdrawals, payments)
    - **UI state**:
      ```
      Historial

      ✅ Depósito - Tarjeta de crédito
      $10,000
      04/11/2025 14:30

      💰 Pago de reserva - Auto Toyota Corolla
      -$8,500
      03/11/2025 10:15

      ✅ Depósito - Efectivo (Pago Fácil)
      $5,000 (No retirable)
      01/11/2025 09:00
      ```

### 4.2 Alternative Flow: Cash Payment (Pago Fácil)

**Steps 1-7**: Same as credit card flow

8. **Complete Payment (Cash)**
   - **User action**:
     - Selects "Efectivo" (Pago Fácil or Rapipago)
     - MercadoPago shows barcode and payment code
     - User screenshots/saves payment code
   - **User goes to** Pago Fácil location (pharmacy, kiosk)
   - **User pays** cash at counter
   - **Pago Fácil clerk** scans barcode, collects cash
   - **Payment confirmed** (typically within 1-2 hours, can be up to 3 business days)

9-10. **Webhook Processes Payment** (Same as credit card)
    - Payment type: `ticket` instead of `credit_card`
    - Funds marked as **non-withdrawable**

11. **User Notified**
    - **System action**: (If implemented) Send push notification or email
    - **Message**: "Tu depósito de $10,000 fue confirmado. ¡Saldo actualizado!"
    - **User returns to /wallet**: Sees updated balance

**Key Difference**:
- Cash deposits cannot be withdrawn back to bank account
- Shown in UI: "$10,000 (No retirable)"
- Can still be used for bookings

### 4.3 Alternative Flow: Payment Pending

**Steps 1-7**: Same as happy path

8. **Payment Pending** (e.g., bank requires 3DS validation)
   - **MercadoPago**: Payment status = "in_process"
   - **User redirected to**: `back_urls.pending`
   - **UI state**:
     - Info message: "Tu pago está siendo procesado. Te notificaremos cuando esté confirmado."
     - Transaction status: "Pendiente"

9. **Webhook Arrives Later**
   - When payment confirmed by bank (could be minutes to hours)
   - Webhook updates transaction and balance
   - User notified

### 4.4 Alternative Flow: Payment Rejected

**Steps 1-7**: Same as happy path

8. **Payment Rejected** (card declined, insufficient funds, etc.)
   - **MercadoPago**: Payment status = "rejected"
   - **User redirected to**: `back_urls.failure`
   - **UI state**:
     - Error message: "Tu pago no pudo ser procesado. Por favor intenta nuevamente con otro método de pago."
     - Transaction status: "Rechazado"
     - "Intentar de nuevo" button

9. **User Retries**
   - Clicks "Intentar de nuevo"
   - New transaction created
   - Redirected to MercadoPago again

---

## 5. Edge Cases

### 5.1 Edge Case 1: Duplicate Webhook (Idempotency)

**Description**: MercadoPago sends the same IPN multiple times (common issue).

**Expected behavior**:
- First webhook: Processes normally, credits funds
- Second webhook: Detects duplicate (`transaction_id` already "completed"), returns 200 OK without action
- Third+ webhook: Same as second

**Implementation**:
```typescript
// In webhook handler
const transaction = await supabase
  .from('wallet_transactions')
  .select('*')
  .eq('id', transactionId)
  .single();

if (transaction.status === 'completed') {
  console.log('Duplicate webhook, transaction already processed');
  return new Response('OK', { status: 200 }); // Return 200 to stop retries
}

// Otherwise, process normally
```

**Error message**: None (silently handled)

### 5.2 Edge Case 2: Webhook Arrives Before User Returns

**Description**: Webhook processes payment before user is redirected back from MercadoPago.

**Expected behavior**:
- Webhook credits funds immediately
- User redirected back 5 seconds later
- Frontend refreshes balance, sees updated amount
- User sees success message

**No issue** - this is actually ideal! User sees balance already updated.

### 5.3 Edge Case 3: Webhook Never Arrives (Rare)

**Description**: MercadoPago payment succeeds but webhook fails (network issue, server down).

**Expected behavior**:
- Transaction remains in "pending" status
- User returns to /wallet, sees "Depósito pendiente"
- After 10 minutes, system runs cron job to check pending transactions:
  ```sql
  -- Cron job runs every 10 minutes
  SELECT * FROM wallet_transactions
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes';

  -- For each pending transaction:
  -- 1. Fetch payment status from MercadoPago API
  -- 2. If approved: call wallet_confirm_deposit()
  -- 3. If rejected: update status to 'failed'
  ```

**Manual recovery**:
- User contacts support
- Support checks MercadoPago payment ID
- Support manually calls RPC function to credit funds

**Error message**:
```
Tu depósito está siendo verificado. Si no se acredita en 1 hora,
contacta a soporte con este código: TXN-UUID
```

### 5.4 Edge Case 4: Minimum Amount Not Met

**Description**: User tries to deposit less than $500 ARS.

**Expected behavior**:
- "Continuar" button disabled
- Error message shown below input field

**Error message**:
```
El monto mínimo de depósito es $500.
```

**Validation**:
```typescript
// Client-side
if (amount < 500) {
  setError('El monto mínimo de depósito es $500');
  return;
}

// Server-side (RPC function)
IF p_amount < 500 THEN
  RAISE EXCEPTION 'Minimum deposit amount is 500 ARS';
END IF;
```

### 5.5 Edge Case 5: Maximum Amount Exceeded

**Description**: User tries to deposit more than $100,000 ARS (security limit).

**Expected behavior**:
- Error message shown
- User can split into multiple deposits

**Error message**:
```
El monto máximo de depósito es $100,000.
Si necesitas depositar más, realiza múltiples depósitos.
```

### 5.6 Edge Case 6: User Closes Window Before Redirect

**Description**: User closes browser after clicking "Continuar" but before MercadoPago redirect.

**Expected behavior**:
- Transaction created in "pending" status
- When user returns to /wallet, sees:
  ```
  Depósito pendiente
  $10,000
  Hace 5 minutos

  [Botón: Completar pago]
  ```
- Clicking "Completar pago" retrieves preference and redirects to MercadoPago

**Implementation**:
```typescript
// On /wallet page load
const pendingDeposit = await supabase
  .from('wallet_transactions')
  .select('*')
  .eq('status', 'pending')
  .eq('type', 'deposit')
  .single();

if (pendingDeposit) {
  // Show "Complete payment" button
  // Re-use existing preference if <24 hours old
}
```

---

## 6. Technical Implementation

### 6.1 Frontend Components

**Components involved**:
- `wallet.page.ts` - Main wallet page (balance, deposit button, transaction history)
- `wallet-deposit-modal.component.ts` - Deposit amount input modal
- `wallet-transaction-list.component.ts` - Transaction history list

**Key Files**:
- `apps/web/src/app/features/wallet/wallet.page.ts`
- `apps/web/src/app/features/wallet/components/wallet-deposit-modal.component.ts`

### 6.2 Backend Services

**Services involved**:
- `wallet.service.ts` - `getBalance()`, `initiateDeposit()`, `getTransactions()`

**Key Methods**:
```typescript
// wallet.service.ts
async getBalance(): Promise<number>
async initiateDeposit(amount: number): Promise<{ transaction_id: string }>
async getTransactions(): Promise<WalletTransaction[]>
```

### 6.3 Database Operations

**Tables affected**:
- `wallet_transactions` - CREATE deposit record, UPDATE status
- `user_wallets` - UPDATE balance, UPDATE non_withdrawable_floor (if cash)

**Schema**:
```sql
-- wallet_transactions
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'payment', 'refund')),
  amount DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_id TEXT, -- MercadoPago payment ID
  payment_type TEXT, -- 'credit_card', 'debit_card', 'ticket', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- user_wallets
CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  balance DECIMAL(10,2) DEFAULT 0,
  non_withdrawable_floor DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6.4 RPC Functions / Edge Functions

**RPC Functions**:

```sql
-- Initiate deposit
CREATE OR REPLACE FUNCTION wallet_initiate_deposit(
  p_amount DECIMAL,
  p_currency TEXT DEFAULT 'ARS'
) RETURNS TABLE(transaction_id UUID) AS $$
BEGIN
  -- Validate amount
  IF p_amount < 500 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Amount must be between 500 and 100000';
  END IF;

  -- Create pending transaction
  INSERT INTO wallet_transactions (id, user_id, type, amount, status)
  VALUES (gen_random_uuid(), auth.uid(), 'deposit', p_amount, 'pending')
  RETURNING id INTO transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirm deposit (called by webhook)
CREATE OR REPLACE FUNCTION wallet_confirm_deposit(
  p_transaction_id UUID,
  p_payment_id TEXT,
  p_payment_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_amount DECIMAL;
  v_user_id UUID;
BEGIN
  -- Get transaction details
  SELECT amount, user_id INTO v_amount, v_user_id
  FROM wallet_transactions
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE NOTICE 'Transaction not found or already processed';
    RETURN FALSE; -- Idempotency: already processed
  END IF;

  -- Update transaction
  UPDATE wallet_transactions SET
    status = 'completed',
    payment_id = p_payment_id,
    payment_type = p_payment_type,
    completed_at = NOW()
  WHERE id = p_transaction_id;

  -- Credit wallet
  UPDATE user_wallets SET
    balance = balance + v_amount,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- If cash payment, mark as non-withdrawable
  IF p_payment_type = 'ticket' THEN
    UPDATE user_wallets SET
      non_withdrawable_floor = non_withdrawable_floor + v_amount
    WHERE user_id = v_user_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Edge Functions**:

```typescript
// supabase/functions/mercadopago-create-preference/index.ts
Deno.serve(async (req) => {
  const { transaction_id, amount } = await req.json();

  const preference = {
    external_reference: transaction_id,
    items: [{
      title: "Depósito AutorentA",
      quantity: 1,
      unit_price: amount,
      currency_id: "ARS"
    }],
    back_urls: {
      success: `${Deno.env.get('APP_BASE_URL')}/wallet?status=success`,
      failure: `${Deno.env.get('APP_BASE_URL')}/wallet?status=failure`,
      pending: `${Deno.env.get('APP_BASE_URL')}/wallet?status=pending`
    },
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preference)
  });

  const data = await response.json();
  return new Response(JSON.stringify({ init_point: data.init_point }));
});
```

```typescript
// supabase/functions/mercadopago-webhook/index.ts
Deno.serve(async (req) => {
  const body = await req.json();
  const paymentId = body.data.id;

  // Fetch payment details
  const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')}` }
  }).then(r => r.json());

  if (payment.status === 'approved') {
    // Call RPC to confirm deposit
    await supabase.rpc('wallet_confirm_deposit', {
      p_transaction_id: payment.external_reference,
      p_payment_id: payment.id.toString(),
      p_payment_type: payment.payment_type_id
    });
  }

  return new Response('OK', { status: 200 });
});
```

### 6.5 External APIs

**MercadoPago API**:
- `POST /v1/checkout/preferences` - Create payment preference
- `GET /v1/payments/{id}` - Fetch payment details (in webhook)
- IPN Webhook - Receives payment notifications

**Authentication**: Bearer token (`MERCADOPAGO_ACCESS_TOKEN`)

**Required Secrets**:
```bash
# In Supabase
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
APP_BASE_URL=https://autorenta.com
```

---

## 7. Test Scenarios

### 7.1 Happy Path Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| **T1** | Successful deposit with credit card | 1. Login<br>2. Go to /wallet<br>3. Click "Depositar"<br>4. Enter $10,000<br>5. Pay with card<br>6. Webhook processes | Balance updated from $5,000 to $15,000<br>Transaction status: "completed"<br>Success message shown |
| **T2** | Successful deposit with cash | 1. Login<br>2. Deposit $10,000<br>3. Select "Efectivo"<br>4. Get payment code<br>5. Pay at Pago Fácil<br>6. Webhook arrives | Balance updated<br>Funds marked "No retirable"<br>Transaction type: "ticket" |
| **T3** | View transaction history | 1. Login<br>2. Go to /wallet<br>3. Scroll to history | All transactions shown:<br>- Deposits<br>- Withdrawals<br>- Payments<br>With dates, amounts, status |

### 7.2 Edge Case Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| **E1** | Duplicate webhook | 1. Create deposit<br>2. Send webhook #1<br>3. Send webhook #2 (same payment_id) | Webhook #1: Credits funds<br>Webhook #2: Returns 200 OK, no duplicate credit |
| **E2** | Minimum amount validation | 1. Try to deposit $400 | Error: "Monto mínimo es $500"<br>"Continuar" button disabled |
| **E3** | Maximum amount validation | 1. Try to deposit $150,000 | Error: "Monto máximo es $100,000" |
| **E4** | Payment rejected | 1. Deposit $10,000<br>2. Use declined card | MercadoPago shows error<br>Transaction status: "failed"<br>Balance unchanged |
| **E5** | Webhook never arrives | 1. Deposit $10,000<br>2. Payment succeeds<br>3. Webhook blocked<br>4. Wait 10 min | Cron job detects pending transaction<br>Fetches status from MP API<br>Confirms deposit |

### 7.3 Assertions (Playwright)

```typescript
// T1: Successful deposit
await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('$15,000');
await expect(page.locator('[data-testid="latest-transaction"]')).toContainText('Depósito');
await expect(page.locator('[data-testid="latest-transaction"]')).toContainText('$10,000');

// E1: Duplicate webhook (backend test)
const transaction = await supabase
  .from('wallet_transactions')
  .select('*')
  .eq('payment_id', '12345')
  .single();
expect(transaction.status).toBe('completed');

const wallet = await supabase
  .from('user_wallets')
  .select('balance')
  .eq('user_id', userId)
  .single();
expect(wallet.balance).toBe(15000); // Not 25000 (duplicated)

// E2: Minimum validation
const errorMsg = page.locator('[role="alert"]');
await expect(errorMsg).toContainText(/monto mínimo/i);
await expect(page.locator('button:has-text("Continuar")')).toBeDisabled();
```

---

## 8. Dependencies

### 8.1 Technical Dependencies

**Services that must be available**:
- [x] Supabase Auth
- [x] Supabase Database (`wallet_transactions`, `user_wallets`)
- [x] Supabase RPC Functions (`wallet_initiate_deposit`, `wallet_confirm_deposit`)
- [x] Supabase Edge Functions (`mercadopago-create-preference`, `mercadopago-webhook`)
- [x] MercadoPago API

**Configuration**:
- [x] MercadoPago credentials in Supabase secrets
- [x] Webhook URL configured in MercadoPago dashboard

### 8.2 Feature Dependencies

**Required**:
- [x] User authentication system
- [x] MercadoPago integration (preferences, webhooks)

**Optional**:
- [ ] Push notifications (for delayed webhook confirmations)
- [ ] Email notifications

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

- [x] Only authenticated users can deposit
- [x] Users can only view their own transactions (RLS)
- [x] Webhook validates MercadoPago signature (prevents fake webhooks)

**RLS Policies**:
```sql
-- Users can only view own transactions
CREATE POLICY "Users view own transactions" ON wallet_transactions
FOR SELECT USING (auth.uid() = user_id);

-- Users can only view own wallet
CREATE POLICY "Users view own wallet" ON user_wallets
FOR SELECT USING (auth.uid() = user_id);
```

### 9.2 Data Validation

**Input validation**:
- [x] Amount: 500 ≤ amount ≤ 100,000
- [x] Currency: Must be 'ARS' (hardcoded)
- [x] Transaction ID: Must be valid UUID
- [x] Payment ID: Validated against MercadoPago API

**Webhook signature validation**:
```typescript
// Verify webhook is from MercadoPago
const signature = req.headers.get('x-signature');
const requestId = req.headers.get('x-request-id');

// Validate signature (prevents fake webhooks)
if (!validateSignature(signature, requestId, body)) {
  return new Response('Invalid signature', { status: 401 });
}
```

### 9.3 Idempotency

**Prevention of duplicate credits**:
- Transaction status checked before processing
- If already "completed", webhook returns 200 OK without action
- Unique constraint on `payment_id` (optional additional safeguard)

---

## 10. Performance Considerations

### 10.1 Expected Load

- **Deposits per day**: 30-50
- **Webhooks per day**: 30-50
- **Peak concurrent deposits**: 10

### 10.2 Optimization Requirements

- [x] Deposit initiation < 500ms
- [x] MercadoPago preference creation < 1s
- [x] Webhook processing < 2s
- [x] Balance refresh < 200ms

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Deposit success rate** | 95% | (Completed deposits / Initiated deposits) × 100 |
| **Wallet usage rate** | 40% | (Wallet payments / Total payments) × 100 |
| **Duplicate deposits** | <1% | Count of duplicate `payment_id` in 30 days |
| **Webhook latency** | <10 min | Time from payment to balance update |

---

## 12. Rollout Plan

**Phase 1**: Internal testing (1 week)
**Phase 2**: Beta with 20 users (1 week)
**Phase 3**: Full release

---

## 13. Open Questions

1. **Should we support international cards?**
   - **Owner**: Product Team
   - **Current**: Only Argentina cards work

2. **What's the withdrawal fee?**
   - **Owner**: Finance Team
   - **Current**: Withdrawals not implemented yet

---

## 14. Appendix

### 14.1 Related Documents

- [CLAUDE.md - Wallet System](../../CLAUDE.md#wallet-system)
- [Booking Flow PRD](./booking-flow-locatario.md)
- [TestSprite Integration Spec](../implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)

### 14.2 MercadoPago Payment Types

| `payment_type_id` | Description | Withdrawable |
|-------------------|-------------|--------------|
| `credit_card` | Credit card | ✅ Yes |
| `debit_card` | Debit card | ✅ Yes |
| `account_money` | MercadoPago balance | ✅ Yes |
| `ticket` | Cash (Pago Fácil/Rapipago) | ❌ No |

---

## 15. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-04 | Claude Code | Initial PRD |

---

## 16. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Product Owner** | [Pending] | [ ] | [ ] |
| **Tech Lead** | [Pending] | [ ] | [ ] |
| **QA Lead** | [Pending] | [ ] | [ ] |

**Status**: 🟡 Draft

---

**End of PRD: Wallet Deposit Flow**

---

## Usage with TestSprite

```bash
npx @testsprite/testsprite-mcp@latest generate-tests \
  --prd docs/prd/wallet-deposit-flow.md \
  --output tests/e2e/wallet-deposit.spec.ts
```
