# 🔍 Wallet Debugging Guide - Balance no se actualiza

## Problema Reportado

Hiciste un depósito, el dinero llegó a tu cuenta bancaria/MercadoPago, pero el balance de la wallet en AutoRenta no se actualiza.

## Causa Raíz Probable

El balance se calcula desde la tabla `wallet_transactions`, pero **solo cuenta transacciones en estado `completed`**. Si tu transacción de depósito quedó en `pending` o `failed`, no aparecerá en el balance.

---

## 📊 Queries SQL para Debugging

Ejecuta estos queries en **Supabase SQL Editor** para diagnosticar el problema:

### 1. Ver tus transacciones de wallet

```sql
-- Ver TODAS tus transacciones (incluyendo pending)
SELECT
  id,
  type,
  status,
  amount,
  description,
  provider,
  provider_transaction_id,
  created_at,
  completed_at
FROM wallet_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

**¿Qué buscar?**
- ✅ **Status = 'completed'**: Transacción exitosa, debe aparecer en balance
- ⚠️  **Status = 'pending'**: Transacción NO completada, no aparece en balance
- ❌ **Status = 'failed'**: Transacción falló, no aparece en balance

### 2. Ver solo depósitos pendientes

```sql
-- Ver depósitos que NO se completaron
SELECT
  id,
  amount,
  status,
  provider,
  provider_transaction_id,
  description,
  created_at,
  completed_at
FROM wallet_transactions
WHERE user_id = auth.uid()
  AND type = 'deposit'
  AND status != 'completed'
ORDER BY created_at DESC;
```

**Si ves transacciones aquí**: Tu depósito se inició pero NO se confirmó.

### 3. Ver tu balance actual (lo que ve el frontend)

```sql
-- Ejecutar la misma RPC que usa el frontend
SELECT * FROM wallet_get_balance();
```

**Resultado esperado:**
```
available_balance | locked_balance | total_balance | currency
100.00            | 0.00           | 100.00        | USD
```

Si todo sale en 0.00, significa que NO hay transacciones `completed`.

### 4. Verificar cálculo manual del balance

```sql
-- Calcular balance manualmente (sin RPC)
SELECT
  -- Depósitos completados
  (SELECT COALESCE(SUM(amount), 0)
   FROM wallet_transactions
   WHERE user_id = auth.uid()
     AND type = 'deposit'
     AND status = 'completed') AS deposits_total,

  -- Balance disponible (deposits - charges)
  (SELECT COALESCE(
     SUM(CASE
       WHEN type IN ('deposit', 'refund', 'bonus') THEN amount
       WHEN type IN ('charge') THEN -amount
       ELSE 0
     END), 0)
   FROM wallet_transactions
   WHERE user_id = auth.uid()
     AND status = 'completed'
     AND type NOT IN ('lock', 'unlock')) AS available_balance,

  -- Balance bloqueado
  (SELECT COALESCE(
     SUM(CASE
       WHEN type = 'lock' THEN amount
       WHEN type = 'unlock' THEN -amount
       ELSE 0
     END), 0)
   FROM wallet_transactions
   WHERE user_id = auth.uid()
     AND status = 'completed'
     AND type IN ('lock', 'unlock')) AS locked_balance;
```

### 5. Buscar tu último depósito

```sql
-- Buscar el depósito más reciente con detalles completos
SELECT *
FROM wallet_transactions
WHERE user_id = auth.uid()
  AND type = 'deposit'
ORDER BY created_at DESC
LIMIT 1;
```

**Campos importantes:**
- `provider_transaction_id`: ID de MercadoPago
- `status`: pending/completed/failed
- `completed_at`: Fecha de confirmación (NULL si está pending)

---

## 🔧 Soluciones según el Diagnóstico

### Caso 1: Transacción está en `pending`

**Problema**: El webhook de MercadoPago no se ejecutó o falló.

**Solución Manual**:

```sql
-- SOLO EJECUTAR SI VERIFICASTE QUE EL PAGO FUE APROBADO EN MERCADOPAGO
-- Reemplaza 'transaction-id-aqui' con el ID de tu transacción

SELECT * FROM wallet_confirm_deposit(
  p_transaction_id := 'transaction-id-aqui',
  p_provider_transaction_id := 'mp-transaction-id-aqui', -- ID de MercadoPago
  p_provider_status := 'approved'
);
```

**Después de ejecutar**:
1. Verifica el status de la transacción (debería cambiar a `completed`)
2. Refresca la página de wallet en el frontend
3. El balance debería actualizarse

### Caso 2: No hay ninguna transacción

**Problema**: El depósito nunca se inició en AutoRenta.

**Pasos**:
1. ¿Completaste el flujo de depósito en MercadoPago?
2. ¿Te redirigió de vuelta a AutoRenta?
3. ¿Viste algún error en la consola del navegador?

**Solución**: Intenta crear un nuevo depósito desde la página de wallet.

### Caso 3: Transacción en `failed`

**Problema**: El webhook o la confirmación fallaron.

**Solución**:
1. Verifica en MercadoPago que el pago fue aprobado
2. Si fue aprobado, usa la solución manual del Caso 1
3. Si no fue aprobado, crea un nuevo depósito

---

## 🧪 Testing en Desarrollo (Local)

Si estás en desarrollo local, puedes simular la confirmación del webhook:

```bash
# Endpoint del webhook local
curl -X POST http://localhost:54321/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "action": "payment.updated",
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

---

## 📋 Checklist de Debugging

Ejecuta este checklist en orden:

- [ ] **Query 1**: ¿Ves tu transacción de depósito?
  - ✅ SÍ → Continúa al siguiente paso
  - ❌ NO → El depósito no se inició en AutoRenta, intenta de nuevo

- [ ] **Query 1**: ¿Cuál es el `status` de la transacción?
  - ✅ `completed` → Balance debería estar bien, verifica Query 3
  - ⚠️  `pending` → Ve a **Solución Caso 1**
  - ❌ `failed` → Ve a **Solución Caso 3**

- [ ] **Query 3**: ¿El balance muestra tu depósito?
  - ✅ SÍ → Problema solucionado
  - ❌ NO → Ejecuta Query 4 para verificar cálculo manual

- [ ] **Frontend**: ¿El frontend muestra el balance correcto?
  - ✅ SÍ → Todo funciona
  - ❌ NO → Refresca la página (F5), verifica errores en consola del navegador

---

## 🚨 Logs de Supabase

Para ver logs del Edge Function webhook:

1. Ve a **Supabase Dashboard** > **Edge Functions** > **mercadopago-webhook**
2. Click en **Logs**
3. Busca logs cercanos a la fecha de tu depósito
4. Busca errores como:
   ```
   Error al confirmar depósito
   RPC call to wallet_confirm_deposit failed
   ```

---

## 🔄 RPC Function para Confirmar Depósito Manual

Si necesitas confirmar manualmente un depósito que quedó en `pending`:

```sql
-- FUNCIÓN: wallet_confirm_deposit
-- SOLO USAR SI EL PAGO FUE APROBADO EN MERCADOPAGO

SELECT * FROM wallet_confirm_deposit(
  p_transaction_id := 'uuid-de-transaccion',
  p_provider_transaction_id := 'id-de-mercadopago',
  p_provider_status := 'approved'
);
```

**Parámetros:**
- `p_transaction_id`: UUID de wallet_transactions (Query 1)
- `p_provider_transaction_id`: ID de MercadoPago (aparece en Query 1)
- `p_provider_status`: `'approved'` si el pago fue exitoso

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Depósito confirmado exitosamente",
  "transaction_id": "uuid",
  "new_balance": 100.00
}
```

---

## 💡 Debugging del Frontend (Browser Console)

Abre las herramientas de desarrollo del navegador (F12) y ejecuta:

```javascript
// Ver el balance que está leyendo el frontend
console.log('Balance:', window.location);

// Forzar refresh del balance
// (Esto depende de cómo esté implementado el componente)
```

---

## 📞 Información para Soporte

Si ninguna solución funciona, recolecta esta información:

```sql
-- Query completo para enviar a soporte
SELECT
  'USER INFO' as section,
  auth.uid() as user_id,
  auth.email() as email
UNION ALL
SELECT
  'BALANCE INFO' as section,
  available_balance::text,
  locked_balance::text
FROM wallet_get_balance()
UNION ALL
SELECT
  'TRANSACTIONS' as section,
  type::text,
  status::text
FROM wallet_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Resultado Esperado

Después de aplicar las soluciones, deberías ver:

1. **En Supabase SQL Editor** (Query 3):
   ```
   available_balance: 100.00
   locked_balance: 0.00
   total_balance: 100.00
   ```

2. **En AutoRenta Frontend** (Wallet Page):
   ```
   Balance Disponible: $100.00
   Balance Total: $100.00
   ```

3. **En Transaction History**:
   - Depósito aparece con status "Completado"
   - Fecha de completado visible

---

**Última actualización:** 2025-10-18
**Autor:** Claude Code
