# MercadoPago Transfer Automation - Technical Documentation

## Overview

This document covers the technical challenges and solutions for automating MercadoPago transfers via browser automation (Playwright).

## Key Challenges

### 1. Amount Input Field (React Component)

The amount input field (`#amount-field-input`) is a **controlled React component** that does NOT accept standard Playwright typing methods.

#### What DOESN'T work:
```javascript
// These methods will NOT update the display value:
await page.fill('#amount-field-input', '100');
await page.type('#amount-field-input', '100');
input.value = '100'; // Direct value assignment
document.execCommand('insertText', false, '100');
```

#### The Problem:
- The field displays `$0` by default
- React controls the state internally
- Standard DOM events don't trigger React state updates
- The component ignores `input.value` changes

#### The Solution:
**Access React's internal `onChange` handler directly:**

```javascript
// Step 1: Find the React fiber and onChange handler
const input = document.getElementById('amount-field-input');
const reactKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
let current = input[reactKey];
let onChange = null;

for (let i = 0; i < 15 && current; i++) {
  if (current.memoizedProps && current.memoizedProps.onChange) {
    onChange = current.memoizedProps.onChange;
    break;
  }
  current = current.return;
}

// Step 2: IMPORTANT - Build the value incrementally
// DO NOT set '100' directly - it will only show '1'
// You must simulate typing: 1 → 10 → 100
if (onChange) {
  onChange({ target: { value: '1' } });   // Shows $1
  onChange({ target: { value: '10' } });  // Shows $10
  onChange({ target: { value: '100' } }); // Shows $100
}
```

#### Critical Note:
**You CANNOT delete the initial `0` and set `100` directly.** The component will reset. You must:
1. Call onChange with `'1'` (overwrites the 0)
2. Call onChange with `'10'` (adds first 0)
3. Call onChange with `'100'` (adds second 0)

### 2. Security Verification (QR Code)

MercadoPago requires **QR code verification** for transfers as a security measure.

#### Flow:
1. User fills transfer details (recipient, amount)
2. User clicks "Transferir"
3. MercadoPago shows QR code
4. User must scan with MercadoPago mobile app
5. Transfer is approved

#### Automation Limitation:
**This step CANNOT be automated** - requires physical phone with MercadoPago app.

**Options:**
- Manual approval for each transfer
- Use API if available (MercadoPago API doesn't support outgoing transfers)
- Accept this as a security feature

### 3. Session Persistence

MercadoPago sessions are stored in browser profile:
```
~/.mercadopago-browser-profile/
```

However, QR login is still required periodically.

## Complete Transfer Flow

### Selectors Reference

| Step | Selector | Notes |
|------|----------|-------|
| Home → Transfer | `text=Transferir` | Button on home page |
| New recipient | `text=Con CBU, CVU o alias` | Opens alias input |
| Alias input | First visible `input` | Standard input works |
| Continue | `text=Continuar` | After entering alias |
| Confirm account | `text=Confirmar cuenta` | After recipient found |
| Amount input | `#amount-field-input` | **Use React hack** |
| Continue | `text=Continuar` | After amount |
| Execute transfer | `text=Transferir` | Final confirmation |
| QR verification | - | Manual scan required |

### Code Example: Complete Transfer

```javascript
async function transferToAlias(alias, amount) {
  // 1. Navigate to transfer
  await page.click('text=Transferir');

  // 2. Select "Con CBU, CVU o alias"
  await page.click('text=Con CBU, CVU o alias');

  // 3. Enter alias
  await page.fill('input', alias);
  await page.click('text=Continuar');

  // 4. Confirm account
  await page.click('text=Confirmar cuenta');

  // 5. Enter amount (using React hack)
  await page.evaluate((amt) => {
    const input = document.getElementById('amount-field-input');
    const reactKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
    let current = input[reactKey];
    let onChange = null;

    for (let i = 0; i < 15 && current; i++) {
      if (current.memoizedProps?.onChange) {
        onChange = current.memoizedProps.onChange;
        break;
      }
      current = current.return;
    }

    if (onChange) {
      // Build incrementally
      let value = '';
      for (const digit of amt.toString()) {
        value += digit;
        onChange({ target: { value } });
      }
    }
  }, amount);

  // 6. Continue
  await page.click('text=Continuar');

  // 7. Execute transfer (will show QR)
  await page.click('text=Transferir');

  // 8. QR verification - manual step required
  console.log('Please scan QR code with MercadoPago app');
}
```

## Integration with Binance P2P

### Workflow:
1. **Binance MCP** detects new BUY order
2. Extracts seller's CVU/Alias from order details
3. Inserts order to Supabase `p2p_orders` with `mp_transfer_status = 'pending'`
4. **MercadoPago MCP** queries pending orders
5. Executes transfer for each pending order
6. **Manual step**: User scans QR to approve
7. Updates `mp_transfer_status = 'completed'` in Supabase
8. **Binance MCP** marks payment as sent

### Database Schema:
```sql
-- p2p_orders columns for MercadoPago
payment_cvu         TEXT    -- CVU from Binance order
payment_alias       TEXT    -- Alias alternative
payment_holder      TEXT    -- Account holder name
mp_transfer_status  TEXT    -- pending | processing | completed | failed
mp_transfer_id      TEXT    -- Transfer ID from MP
mp_transfer_at      TIMESTAMPTZ
```

## Troubleshooting

### Amount shows $0 after setting:
- You're not using the React onChange hack
- Or not building the value incrementally

### Amount shows wrong value (e.g., $1 instead of $100):
- Each call to onChange only processes ONE change
- Call onChange multiple times: '1' → '10' → '100'

### Transfer button doesn't work:
- MercadoPago may be showing a loading state
- Wait and retry with JavaScript click

### Session expired:
- Re-login required
- QR code authentication needed

## Files

- `server.js` - MCP server with Playwright
- `package.json` - Dependencies
- Browser profile: `~/.mercadopago-browser-profile/`

## Date: 2025-12-04
