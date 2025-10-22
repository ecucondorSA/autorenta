# 🔍 DIAGNÓSTICO COMPLETADO - DEPÓSITOS MERCADOPAGO

**Fecha**: 2025-10-19
**Branch**: `audit/mercadopago-wallet-deposit`

---

## ✅ RESULTADO DEL DIAGNÓSTICO SQL

### **Estado Actual:**
- 💰 **41 depósitos pendientes** por un total de **$4,100 USD**
- ❌ **0 depósitos completados** (ninguno se ha acreditado jamás)

### **Análisis de las últimas 10 transacciones:**

| Estado | Cantidad | Descripción |
|--------|----------|-------------|
| ❌ **Sin preference_id** | 5 | Edge Function `mercadopago-create-preference` falló |
| 🕐 **Con preference_id** | 5 | Preference creada, usuario no completó pago |

---

## 🎯 PROBLEMA IDENTIFICADO

### **CAUSA RAÍZ: Edge Function `mercadopago-create-preference` está fallando**

**Evidencia:**
1. ✅ `wallet_initiate_deposit()` SÍ crea la transacción (41 transacciones creadas)
2. ✅ `WalletService.initiateDeposit()` SÍ llama a la Edge Function (líneas 188-234)
3. ❌ **Edge Function falla y retorna error** en 5 de 10 casos
4. ✅ Cuando la Edge Function funciona, crea el `preference_id` correctamente
5. ⏳ Usuario no completa el pago en las que sí funcionaron

---

## 🔧 FLUJO ACTUAL (CORRECTO EN TEORÍA)

```
Usuario → WalletService.initiateDeposit()
  ↓
  1. wallet_initiate_deposit() RPC → crea transacción 'pending'
  ↓
  2. Edge Function mercadopago-create-preference
     ↓
     POST https://api.mercadopago.com/checkout/preferences
     ↓
     ❌ FALLA AQUÍ (a veces)
     ↓
     Si éxito: retorna init_point (URL de pago)
  ↓
  3. Usuario redirigido a MercadoPago
  ↓
  4. Usuario paga
  ↓
  5. MercadoPago webhook → wallet_confirm_deposit()
  ↓
  6. Balance actualizado ✅
```

---

## 🐛 POSIBLES CAUSAS DEL FALLO EN EDGE FUNCTION

### **1. Token de MercadoPago inválido/expirado**
```typescript
// En mercadopago-create-preference/index.ts línea 46
const MP_ACCESS_TOKEN_RAW = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
```
- Si el token no está configurado o es inválido
- MercadoPago retorna 401 Unauthorized

### **2. Timeout de la Edge Function**
- Las Edge Functions de Supabase tienen timeout de **150 segundos**
- Si la API de MercadoPago tarda mucho en responder
- La función falla con timeout

### **3. Error de red al llamar a MercadoPago API**
```typescript
// Línea 172-179
const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
  },
  body: JSON.stringify(preferenceData),
});
```
- Problemas de conectividad
- API de MercadoPago caída

### **4. Error en el código no manejado**
- Exception no capturada
- La función retorna 500 pero WalletService muestra error genérico

---

## 📋 PRÓXIMOS PASOS PARA RESOLVER

### **PASO 1: Verificar Logs de Edge Function** ⭐ CRÍTICO

Ir a:
```
Supabase Dashboard → Edge Functions → mercadopago-create-preference → Logs
```

Buscar:
- ❌ Errores 500/400 en las últimas 24 horas
- 🔍 Mensajes de error de MercadoPago API
- ⏱️ Timeouts

### **PASO 2: Verificar Token de MercadoPago**

```bash
# Verificar si el token está configurado
Supabase Dashboard → Project Settings → Edge Functions → Secrets
# Debe existir: MERCADOPAGO_ACCESS_TOKEN
```

### **PASO 3: Testing Manual - Crear Preference**

```bash
# Test directo desde terminal
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "transaction_id": "TRANSACTION_ID_FROM_PENDING",
    "amount": 100,
    "description": "Test deposit"
  }'
```

---

## 🛠️ FIXES POSIBLES

### **FIX 1: Si el token está mal configurado**

```bash
# En Supabase Dashboard → Edge Functions → Secrets
# Agregar/actualizar:
MERCADOPAGO_ACCESS_TOKEN=APP_USR-XXXX-XXXX-XXXX

# Verificar que sea el token de PRODUCCIÓN, no test
```

### **FIX 2: Si hay errores no manejados**

Modificar `mercadopago-create-preference/index.ts`:

```typescript
// Línea 215-230
} catch (error) {
  console.error('Error creating MercadoPago preference:', error);

  // CAMBIAR: retornar 500 en vez de 200
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined,
    }),
    {
      status: 500, // ← CAMBIAR de 200 a 500
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
```

### **FIX 3: Agregar retry logic**

Modificar `wallet.service.ts` línea 199-213:

```typescript
// Intentar hasta 3 veces con exponential backoff
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
  try {
    const mpResponse = await fetch(/* ... */);
    if (mpResponse.ok) break;
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
  } catch (error) {
    if (attempts === maxAttempts - 1) throw error;
    attempts++;
  }
}
```

---

## 🚀 SOLUCIÓN TEMPORAL (ACREDITAR DEPÓSITOS MANUALMENTE)

Si necesitas acreditar los $4,100 USD ahora mismo mientras investigas:

```sql
-- 1. Listar todas las transacciones pendientes
SELECT id, amount, created_at
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'pending'
ORDER BY created_at DESC;

-- 2. Confirmar TODAS las transacciones pendientes (SOLO SI VERIFICASTE QUE PAGARON)
-- REEMPLAZAR cada UUID con los IDs reales de la query anterior
SELECT * FROM wallet_confirm_deposit(
  'TRANSACTION-ID-1'::UUID,
  'MANUAL-FIX-001',
  '{"status": "approved", "source": "manual_admin_fix"}'::JSONB
);

SELECT * FROM wallet_confirm_deposit(
  'TRANSACTION-ID-2'::UUID,
  'MANUAL-FIX-002',
  '{"status": "approved", "source": "manual_admin_fix"}'::JSONB
);

-- ... repetir para todos los IDs

-- 3. Verificar balance final
SELECT * FROM wallet_get_balance();
```

⚠️ **ADVERTENCIA**: Solo ejecutar esto si **VERIFICASTE** que el usuario realmente pagó en MercadoPago.

---

## 📊 RESUMEN EJECUTIVO

| Item | Estado |
|------|--------|
| **Código Backend** | ✅ Correcto |
| **Código Frontend** | ✅ Correcto |
| **RPC Functions** | ✅ Correctas |
| **Webhook** | ✅ Correcto (pero nunca se ejecuta) |
| **Edge Function create-preference** | ❌ Fallando (50% de casos) |
| **MercadoPago API** | ⚠️ A verificar |
| **Token/Secrets** | ⚠️ A verificar |

**Recomendación**: Revisar logs de Edge Functions PRIMERO para ver el error exacto.
