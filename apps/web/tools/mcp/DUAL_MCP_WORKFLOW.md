# Dual MCP P2P Automation Workflow

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Coordinator)                       │
│                         Table: p2p_orders                           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       │                       ▼
┌───────────────────┐           │           ┌───────────────────┐
│  BINANCE MCP      │           │           │  MERCADOPAGO MCP  │
│  (playwright)     │           │           │  (playwright)     │
│                   │           │           │                   │
│  Profile:         │           │           │  Profile:         │
│  ~/.binance-      │◄──────────┴──────────►│  ~/.mercadopago-  │
│  browser-profile  │     Polling/Events    │  browser-profile  │
└───────────────────┘                       └───────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────┐                   ┌───────────────────┐
│  p2p.binance.com  │                   │  mercadopago.com  │
│  Orders Page      │                   │  Transfers Page   │
└───────────────────┘                   └───────────────────┘
```

## Flow: SELL Order (User buys USDT from us)

### Step 1: Binance MCP detects new order

```
1. Poll orders page: https://p2p.binance.com/en/fiatOrder?tab=1
2. Detect new SELL order with status "To Pay" (pending)
3. Extract order data:
   - order_number
   - amount_fiat (ARS to receive)
   - amount_crypto (USDT to release)
   - counterparty name
4. Click order to open detail
5. Extract payment data:
   - payment_cvu (22 digit CVU)
   - payment_alias (alternative)
   - payment_holder (name)
6. INSERT into p2p_orders with:
   - status: 'awaiting_transfer'
   - mp_transfer_status: 'pending'
```

### Step 2: MercadoPago MCP executes transfer

```
1. Query Supabase for orders WHERE mp_transfer_status = 'pending'
2. For each order:
   a. Navigate to: https://www.mercadopago.com.ar/transfer
   b. Enter payment_cvu or payment_alias
   c. Enter amount_fiat
   d. Confirm transfer
   e. Capture transfer ID from confirmation
3. UPDATE p2p_orders SET:
   - mp_transfer_status: 'completed'
   - mp_transfer_id: 'MP-xxx'
   - mp_transfer_at: NOW()
```

### Step 3: Binance MCP releases crypto

```
1. Query Supabase for orders WHERE mp_transfer_status = 'completed' AND binance_status != 'completed'
2. For each order:
   a. Navigate to order detail
   b. Wait for "Payment Received" confirmation (or mark manually)
   c. Click "Release Crypto" button
   d. Confirm release
3. UPDATE p2p_orders SET:
   - binance_status: 'completed'
   - binance_released_at: NOW()
   - status: 'completed'
```

## Database Schema

```sql
-- p2p_orders table columns for MercadoPago integration
payment_cvu          TEXT    -- CVU del comprador
payment_alias        TEXT    -- Alias alternativo
payment_holder       TEXT    -- Nombre del titular
mp_transfer_status   TEXT    -- pending | processing | completed | failed
mp_transfer_id       TEXT    -- ID de transferencia MP
mp_transfer_at       TIMESTAMPTZ  -- Timestamp de transferencia
binance_released_at  TIMESTAMPTZ  -- Timestamp de liberación crypto
```

## Status Flow

```
Order Detected → awaiting_transfer
                      ↓
              MercadoPago Transfer
                      ↓
         mp_transfer_status = completed
                      ↓
              Binance Release
                      ↓
          binance_status = completed
                      ↓
               status = completed
```

## MCP Configuration

### binance-p2p-mcp
```bash
# ~/.claude.json
claude mcp add binance-p2p node /home/edu/autorenta/apps/web/tools/binance-p2p-mcp/server.js
```

### mercadopago-streaming
```bash
claude mcp add mercadopago-streaming node /home/edu/autorenta/apps/web/tools/mercadopago-mcp/server.js
```

## Browser Profiles

| MCP | Profile Directory | Purpose |
|-----|------------------|---------|
| binance-p2p | ~/.binance-browser-profile | Persistent Binance login |
| mercadopago-streaming | ~/.mercadopago-browser-profile | Persistent MP login |

## Security Considerations

1. **Never commit credentials** - Browser profiles contain session tokens
2. **Use 2FA** - Both Binance and MercadoPago should have 2FA enabled
3. **Monitor transfers** - Set up alerts for large transfers
4. **Rate limiting** - Avoid too frequent polling to prevent detection

## Commands Reference

### Extract Orders from Binance
```javascript
// Run in Binance orders page
const orders = await page.evaluate(() => {
  const rows = document.querySelectorAll('table tbody tr');
  return Array.from(rows).map(row => ({
    order_number: row.querySelector('a')?.textContent?.match(/\d{19,20}/)?.[0],
    // ... extract other fields
  }));
});
```

### Execute MP Transfer
```javascript
// Run in MercadoPago transfer page
await page.fill('input[name="cvu"]', order.payment_cvu);
await page.fill('input[name="amount"]', order.amount_fiat.toString());
await page.click('button[type="submit"]');
```

## Monitoring

Query pending orders:
```sql
SELECT order_number, amount_fiat, counterparty, mp_transfer_status
FROM p2p_orders
WHERE status != 'completed'
ORDER BY created_at DESC;
```

## Important Findings (2025-12-04)

### Payment Data Visibility
- **CVU/Alias only visible during PENDING orders** - Once completed, only the payment method name shows
- **BUY orders**: We pay the seller → Need seller's CVU/Alias (shown in order detail during pending)
- **SELL orders**: Buyer pays us → They need OUR CVU/Alias (we provide it)

### Order Detail Page Structure
When clicking an order number, we get:
- Order summary: amount_fiat, price, crypto_amount, fee
- Payment method: Just the name (e.g., "Mercadopago")
- Chat history: May contain CVU/Alias if shared in conversation

### Key URLs
- Orders list: `https://p2p.binance.com/en/fiatOrder?tab=1`
- Order detail: `https://c2c.binance.com/en/fiatOrderDetail?orderNo={order_number}&createdAt={timestamp}`

### Extraction Strategy for Pending Orders
```javascript
// For BUY orders (we pay seller), extract seller payment details from order page
// The payment details section should show CVU/Alias when order is pending

// Selector patterns to try:
// - Look for 22-digit CVU: /\d{22}/
// - Look for alias pattern: /[a-zA-Z0-9.-]+\.mp/
// - Check payment method expandable section
```

## TODO
- [ ] Implement Telegram notifications for new orders
- [ ] Add retry logic for failed transfers
- [ ] Create admin dashboard for order monitoring
- [ ] Add exchange rate tracking
- [ ] Test with a PENDING order to capture CVU/Alias extraction selectors
- [ ] Login to MercadoPago MCP and test transfer flow
