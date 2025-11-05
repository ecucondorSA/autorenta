# MercadoPago Deposit Investigation Report

**Date**: 2025-10-20
**Payment ID (provided)**: 130624829514
**Transaction Time**: ~14:33 UTC
**Status**: 🔍 INVESTIGATING

---

## 🔍 INITIAL FINDINGS

### 1. Payment ID Verification

**Payment ID**: `130624829514`
**MercadoPago API Response**: ❌ **404 NOT FOUND**

```json
{
    "message": "Payment not found",
    "error": "not_found",
    "status": 404,
    "cause": [
        {
            "code": 2000,
            "description": "Payment not found"
        }
    ]
}
```

**Analysis**:
- El Payment ID proporcionado NO existe en MercadoPago
- Posibles causas:
  1. Payment ID incorrecto/typo
  2. Pago de prueba (sandbox) no visible en producción
  3. Payment ID es en realidad el external_reference

### 2. Database Transactions Found

Se encontraron **10 transacciones pendientes** de depósito en las últimas 24 horas:

| Transaction ID | User ID | Amount | Status | Created At |
|---------------|---------|--------|--------|------------|
| `1ef67259-3544-446a-bfdb-b7a8217ea994` | acc5fb2d... | $250 | pending | 2025-10-20 **15:08:41** UTC |
| `de0d1150-f237-4f42-95ef-1333cd9db21f` | acc5fb2d... | $250 | pending | 2025-10-20 **14:32:35** UTC ⭐ |
| `fe154559-bf87-4b6b-af52-8b81962537be` | acc5fb2d... | $250 | pending | 2025-10-20 **14:31:34** UTC |
| `00f2316a-fc90-40c6-b774-dcc662a61164` | acc5fb2d... | $250 | pending | 2025-10-20 **14:28:46** UTC |
| `3226d57d-ee67-4332-9aba-d84ec6ead870` | acc5fb2d... | $250 | pending | 2025-10-20 **14:04:57** UTC |
| ... | ... | ... | ... | ... |

**Nota**: La transacción más cercana a las 14:33 UTC es `de0d1150-f237-4f42-95ef-1333cd9db21f` (14:32:35 UTC).

### 3. Webhook Analysis

**Edge Function**: `mercadopago-webhook`
**URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`

**Expected Flow**:
1. MercadoPago sends `payment.created` → Function logs payment as pending
2. MercadoPago sends `payment.updated` (status=approved) → Function calls `wallet_confirm_deposit()`
3. Transaction status changes from `pending` → `completed`
4. User balance is credited

**Current Issue**:
- ✅ `payment.created` received (200 OK)
- ❌ `payment.updated` NOT received OR failed to process

---

## ⚠️ CRITICAL ISSUES IDENTIFIED

### Issue #1: Invalid Payment ID
**Problem**: Payment ID `130624829514` does not exist in MercadoPago API
**Impact**: Cannot verify payment status or reinject webhook
**Resolution Needed**: Obtain correct Payment ID or external_reference from MercadoPago dashboard

### Issue #2: No provider_transaction_id in Database
**Problem**: All pending transactions have `NULL` in `provider_transaction_id` column
**Impact**: Cannot correlate database transactions with MercadoPago payments
**Root Cause**: Webhook not processed successfully (either not received or failed)

### Issue #3: Multiple Pending Deposits
**Problem**: Same user has 5+ pending deposits in short timeframe
**Impact**: May indicate repeated payment attempts or webhook failures
**Action**: Need to identify which transaction corresponds to actual payment

---

## 📋 INFORMATION NEEDED FROM USER

Para continuar la investigación, necesito:

1. **External Reference** (transaction_id):
   - Aparece en MercadoPago como "Referencia externa"
   - Es el UUID de la transacción en nuestra DB
   - Ejemplo: `de0d1150-f237-4f42-95ef-1333cd9db21f`

2. **Correct Payment ID**:
   - Verificar en el dashboard de MercadoPago
   - Debe ser un número distinto a `130624829514`

3. **Screenshots from MercadoPago**:
   - Detalles del pago (status, amount, fecha)
   - External reference mostrado en MP

---

## 🔧 SCRIPTS CREATED FOR INVESTIGATION

### 1. `investigate-deposit.sh`
Investiga una transacción completa:
```bash
./investigate-deposit.sh <transaction_id>
```

**Features**:
- Busca transacción por Payment ID
- Lista todos los depósitos pendientes
- Verifica estado en MercadoPago API
- Muestra balance del usuario

### 2. `reinject-webhook.sh`
Reinyecta webhook manualmente si pago está aprobado:
```bash
./reinject-webhook.sh <payment_id>
```

**Features**:
- Simula webhook de MercadoPago
- Envía POST a Edge Function
- Muestra respuesta y logs

---

## 🎯 NEXT STEPS

### Step 1: Verify Payment Information
```bash
# User needs to provide:
# 1. Correct Payment ID from MercadoPago dashboard
# 2. External Reference (transaction_id)
```

### Step 2: Check Payment Status in MercadoPago
```bash
# Once we have correct payment_id:
curl -X GET "https://api.mercadopago.com/v1/payments/<PAYMENT_ID>" \
  -H "Authorization: Bearer APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"
```

### Step 3: If Payment is Approved, Reinject Webhook
```bash
# If payment status = "approved":
./reinject-webhook.sh <correct_payment_id>
```

### Step 4: Verify Transaction Completed
```bash
# Check if transaction changed from pending to completed:
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT * FROM wallet_transactions WHERE id = '<transaction_id>'::uuid;"
```

### Step 5: Check User Balance
```bash
# Verify balance was credited:
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT * FROM wallet_get_balance('<user_id>'::uuid);"
```

### Step 6: Convert to Withdrawable (if needed)
```bash
# If is_withdrawable = false:
PGPASSWORD="ECUCONDOR08122023" psql \
  "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -c "SELECT wallet_convert_to_withdrawable('<transaction_id>'::uuid, 'Liberar depósito MercadoPago');"
```

---

## 📊 SUSPECTED TRANSACTIONS

Based on timestamp proximity (14:33 UTC), the most likely transaction is:

**Transaction ID**: `de0d1150-f237-4f42-95ef-1333cd9db21f`
**User ID**: `acc5fb2d-5ba5-492c-9abd-711a13a3b4ff`
**Created**: 2025-10-20 14:32:35 UTC (1 minute before payment time)
**Amount**: $250.00
**Status**: pending
**is_withdrawable**: false

**To investigate this specific transaction**:
```bash
./investigate-deposit.sh de0d1150-f237-4f42-95ef-1333cd9db21f
```

---

## 🚨 IMMEDIATE ACTION REQUIRED

1. **Verify Payment ID**: Go to MercadoPago dashboard and get correct payment ID
2. **Find External Reference**: Look for "Referencia externa" in MercadoPago payment details
3. **Provide Both Values**: Reply with:
   ```
   Payment ID: <real_payment_id>
   External Reference: <transaction_uuid>
   ```

Once we have correct information, we can:
- ✅ Verify payment status
- ✅ Reinject webhook if approved
- ✅ Confirm deposit and credit user balance
- ✅ Convert to withdrawable if needed

---

## 📞 CONTACTS & RESOURCES

- **Supabase Dashboard**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **Edge Function Logs**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/logs/edge-functions
- **MercadoPago Dashboard**: https://www.mercadopago.com.ar/developers/panel
- **Webhook URL**: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

---

**Status**: ⏸️ PAUSED - Waiting for correct payment information
**Next Update**: After receiving correct Payment ID and External Reference
**Investigation Time**: ~15 minutes
**Scripts Created**: 2 (investigate-deposit.sh, reinject-webhook.sh)
