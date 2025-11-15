# MERCADOPAGO WALLET DEPOSIT - VERTICAL STACK AUDIT

**Fecha**: 2025-10-19
**Problema**: Usuario realizó 1 pago de depósito, pero el balance sigue en $0.00
**Branch**: `audit/mercadopago-wallet-deposit`

---

## STACK COMPLETO

```
┌─────────────────────────────────────────┐
│  LAYER 1: UI (Wallet Page)              │
│  Status: ✅ Funcionando                  │
│  Files: wallet.page.ts:185               │
│  Notes: Muestra "41 depósitos pendientes"│
│         Balance: $0.00                   │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 2: Frontend Service               │
│  Status: ✅ Funcionando                  │
│  Files: wallet.service.ts:42             │
│  Notes: Llama wallet_get_balance()       │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 3: RPC wallet_get_balance()       │
│  Status: ✅ Funcionando                  │
│  Files: rpc_wallet_get_balance.sql:34    │
│  Notes: Calcula SUM de deposits          │
│         WHERE status = 'completed'       │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 4: Tabla wallet_transactions      │
│  Status: ⚠️ VERIFICAR                    │
│  Files: table_wallet_transactions.sql    │
│  Notes: Verificar si transacción existe  │
│         y status = 'completed'           │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 5: RPC wallet_confirm_deposit()   │
│  Status: ⚠️ VERIFICAR                    │
│  Files: rpc_wallet_initiate_deposit.sql:137│
│  Notes: Debe actualizar status a         │
│         'completed' al recibir webhook   │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 6: Edge Function Webhook          │
│  Status: ⚠️ VERIFICAR                    │
│  Files: mercadopago-webhook/index.ts:185 │
│  Notes: Debe llamar wallet_confirm_deposit│
│         al recibir pago aprobado         │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 7: MercadoPago IPN                │
│  Status: ⚠️ VERIFICAR                    │
│  Notes: Debe enviar POST al webhook      │
│         cuando pago sea aprobado         │
└─────────────────────────────────────────┘
```

---

## ANÁLISIS DEL FLUJO

### ✅ DISEÑO CORRECTO

1. **wallet_initiate_deposit()** (línea 12-116)
   - Crea transacción con status='pending'
   - Genera transaction_id UUID
   - Retorna payment_url (simulada)

2. **wallet_confirm_deposit()** (línea 137-186)
   - Busca transacción WHERE status='pending'
   - Actualiza status='completed'
   - Actualiza completed_at=NOW()
   - Retorna nuevo balance

3. **wallet_get_balance()** (línea 32-46)
   - Calcula SUM de transacciones
   - Filtra WHERE status='completed'
   - Cuenta deposits (+), charges (-)

### ⚠️ PUNTOS CRÍTICOS A VERIFICAR

#### 1. ¿El webhook de MercadoPago está llegando?
- **URL del webhook**: ¿Está configurada en MercadoPago?
- **Logs de Supabase**: Verificar logs del Edge Function
- **Network logs**: Verificar si MercadoPago envía POST

#### 2. ¿La transacción se creó correctamente?
```sql
-- Verificar transacciones pendientes
SELECT
  id,
  user_id,
  type,
  status,
  amount,
  created_at,
  provider_metadata
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
ORDER BY created_at DESC
LIMIT 10;
```

#### 3. ¿El webhook procesó el pago?
```sql
-- Verificar transacciones completadas
SELECT
  id,
  user_id,
  type,
  status,
  amount,
  provider_transaction_id,
  created_at,
  completed_at,
  provider_metadata
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;
```

#### 4. ¿El balance se está calculando correctamente?
```sql
-- Simular cálculo de balance manualmente
SELECT
  user_id,
  type,
  status,
  SUM(CASE
    WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
    WHEN type IN ('charge') THEN -amount
    ELSE 0
  END) AS calculated_balance
FROM wallet_transactions
WHERE user_id = auth.uid()
  AND status = 'completed'
  AND type NOT IN ('lock', 'unlock')
GROUP BY user_id, type, status;
```

---

## POSIBLES CAUSAS DEL PROBLEMA

### CAUSA 1: Webhook no configurado
**Síntoma**: 41 depósitos pendientes
**Diagnóstico**: Las transacciones se crean pero nunca se completan
**Fix**: Configurar webhook URL en MercadoPago dashboard

### CAUSA 2: Webhook fallando
**Síntoma**: Transacciones quedan en 'pending'
**Diagnóstico**: El webhook recibe la notificación pero falla al procesar
**Fix**: Revisar logs de Supabase Edge Functions

### CAUSA 3: external_reference incorrecto
**Síntoma**: Webhook recibe pago pero no encuentra la transacción
**Diagnóstico**: El webhook busca por transaction_id en external_reference
**Fix**: Verificar que create-preference envíe el transaction_id correcto

### CAUSA 4: Permisos RLS
**Síntoma**: wallet_confirm_deposit falla por permisos
**Diagnóstico**: La función tiene SECURITY DEFINER pero falta GRANT
**Fix**: Verificar GRANT EXECUTE ON FUNCTION

---

## DIAGNÓSTICO EJECUTADO

### ✅ CÓDIGO REVISADO Y VALIDADO

1. **mercadopago-create-preference** (línea 157)
   - ✅ `external_reference: transaction_id` está correcto
   - ✅ `notification_url` configurada correctamente
   - ✅ `back_urls` configuradas con transaction_id

2. **mercadopago-webhook** (línea 125-185)
   - ✅ Obtiene paymentId del webhook
   - ✅ Consulta API de MP con SDK oficial
   - ✅ Verifica status === 'approved'
   - ✅ Obtiene transaction_id de external_reference
   - ✅ Llama a wallet_confirm_deposit()

3. **wallet_confirm_deposit** (línea 137-186)
   - ✅ Busca transacción WHERE status='pending'
   - ✅ Actualiza status='completed'
   - ✅ Actualiza completed_at=NOW()

4. **wallet_get_balance** (línea 32-46)
   - ✅ Calcula SUM WHERE status='completed'
   - ✅ Filtra type IN ('deposit', 'refund', 'bonus')

### 🔍 PRÓXIMOS PASOS DE DIAGNÓSTICO

#### PASO 1: Ejecutar Script SQL Diagnóstico

```bash
# En Supabase Dashboard → SQL Editor:
# Copiar y ejecutar: database/diagnostic_wallet_deposits.sql
```

Este script verificará:
- ✅ Cuántas transacciones están en 'pending' vs 'completed'
- ✅ Si las transacciones tienen `preference_id` (create-preference funcionó)
- ✅ Si las transacciones tienen `payment_status` en metadata (webhook llegó)
- ✅ Si hay errores o duplicados

#### PASO 2: Verificar Logs de Edge Functions

```bash
# En Supabase Dashboard:
# 1. Edge Functions → mercadopago-webhook → Logs
# 2. Buscar logs de las últimas 24 horas
# 3. Verificar si hay llamadas POST recibidas
# 4. Verificar errores en el procesamiento
```

#### PASO 3: Verificar Configuración de MercadoPago

```bash
# En MercadoPago Dashboard:
# 1. Tus integraciones → Configuración
# 2. Webhooks → Verificar URL configurada
# 3. URL debe ser: https://YOUR_PROJECT.supabase.co/functions/v1/mercadopago-webhook
# 4. Eventos: payment.created, payment.updated
```

#### PASO 4: Testing Manual

```sql
-- Simular webhook manualmente (reemplazar UUIDs con valores reales)
SELECT * FROM wallet_confirm_deposit(
  'TRANSACTION_ID_FROM_PENDING'::UUID,
  'TEST-PAYMENT-123',
  '{"status": "approved", "payment_method_id": "visa"}'::JSONB
);

-- Verificar que el balance aumentó
SELECT * FROM wallet_get_balance();
```

## POSIBLES FIXES

### FIX 1: Si webhook nunca llega

**Problema**: MercadoPago no está enviando notificaciones

**Solución**:
1. Configurar webhook URL en MercadoPago Dashboard
2. Verificar que la URL es accesible públicamente
3. Verificar que no hay CORS o autenticación bloqueando

### FIX 2: Si webhook falla silenciosamente

**Problema**: Webhook recibe notificación pero no procesa

**Solución**:
```typescript
// En mercadopago-webhook/index.ts línea 223-238
// Cambiar status 200 en error a 500 para ver errores en logs de MP
return new Response(
  JSON.stringify({ success: false, error: error.message }),
  { status: 500 } // ← Cambiar de 200 a 500
);
```

### FIX 3: Si wallet_confirm_deposit falla por permisos

**Problema**: RLS policy bloqueando actualización

**Solución**:
```sql
-- Verificar que la función tiene SECURITY DEFINER
-- Ya está en línea 186:
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar GRANT a service_role
-- Ya está en línea 188:
-- GRANT EXECUTE ON FUNCTION wallet_confirm_deposit(UUID, TEXT, JSONB) TO service_role;
```

---

## DOCUMENTACIÓN RELACIONADA

- `WALLET_SYSTEM_DOCUMENTATION.md` - Documentación completa del sistema
- `apps/web/database/wallet/` - Todos los SQL files
- `supabase/functions/mercadopago-webhook/` - Edge Function
- `supabase/functions/mercadopago-create-preference/` - Creación de pago
