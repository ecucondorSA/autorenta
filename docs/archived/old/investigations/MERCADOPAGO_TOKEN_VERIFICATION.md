# 🔑 VERIFICACIÓN DE TOKEN MERCADOPAGO

**Fecha**: 2025-10-19
**Problema**: Edge Function `mercadopago-create-preference` fallando en 50% de casos
**Causa Probable**: Token de MercadoPago no configurado o inválido

---

## ⚠️ ACCIÓN CRÍTICA REQUERIDA

Debes verificar manualmente en **Supabase Dashboard** si el token de MercadoPago está configurado correctamente.

### PASO 1: Verificar Secret en Supabase Dashboard

1. **Ir a Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/obxvffplochgeiclibng
   ```

2. **Navegar a Edge Functions → Secrets**:
   ```
   Settings → Edge Functions → Secrets
   ```

3. **Verificar que existe el secret**:
   ```
   Nombre: MERCADOPAGO_ACCESS_TOKEN
   Valor: APP_USR-XXXX-XXXX-XXXX (debe comenzar con APP_USR-)
   ```

### PASO 2: Si el Secret NO existe o es inválido

**Obtener Token de Producción de MercadoPago**:

1. **Ir a MercadoPago Developers**:
   ```
   https://www.mercadopago.com.ar/developers/panel
   ```

2. **Navegar a Credenciales**:
   ```
   Tus integraciones → Credenciales → Producción
   ```

3. **Copiar Access Token de Producción**:
   ```
   Access Token: APP_USR-XXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXX
   ```
   ⚠️ **NO uses el token de TEST**, debe ser el de **PRODUCCIÓN**

**Configurar Secret en Supabase**:

```bash
# Opción 1: Vía Dashboard (recomendado)
1. Supabase Dashboard → Settings → Edge Functions → Secrets
2. Click "New Secret"
3. Name: MERCADOPAGO_ACCESS_TOKEN
4. Value: [PEGAR TOKEN DE PRODUCCIÓN]
5. Click "Save"

# Opción 2: Vía CLI (si tienes Supabase CLI instalado)
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-YOUR-PRODUCTION-TOKEN"
```

### PASO 3: Verificar Configuración

**Probar Edge Function manualmente**:

```bash
# Reemplazar con datos reales
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

**Respuesta esperada si está OK**:
```json
{
  "success": true,
  "preference_id": "202984680-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=XXXXX",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=XXXXX"
}
```

**Respuesta si falta el token**:
```json
{
  "error": "MERCADOPAGO_ACCESS_TOKEN environment variable not configured"
}
```

**Respuesta si el token es inválido**:
```json
{
  "error": "MercadoPago API error: {\"message\":\"invalid_credentials\",\"error\":\"unauthorized\",\"status\":401}"
}
```

---

## 🔍 VERIFICAR LOGS DE EDGE FUNCTION

Una vez configurado el token, verifica que la Edge Function funcione:

### Acceder a Logs en Supabase Dashboard

1. **Ir a Edge Functions → mercadopago-create-preference → Logs**:
   ```
   Supabase Dashboard → Edge Functions → mercadopago-create-preference → Logs
   ```

2. **Buscar errores recientes**:
   - ❌ `MERCADOPAGO_ACCESS_TOKEN environment variable not configured`
   - ❌ `MercadoPago API error: {"status":401}`
   - ❌ `MercadoPago API error: {"status":400}`
   - ✅ `MercadoPago API Response: {"id":"202984680-...","init_point":"https://..."}`

3. **Logs esperados si está OK**:
   ```
   MP_ACCESS_TOKEN from env: true
   MP_ACCESS_TOKEN after cleaning: true
   MP_ACCESS_TOKEN length: 77
   MP_ACCESS_TOKEN prefix: APP_USR-1234567...
   MP_ACCESS_TOKEN suffix: ...890abcdefg
   Creating preference with MercadoPago REST API...
   Preference data: {...}
   MercadoPago API Response: {"id":"202984680-...","init_point":"https://..."}
   ```

---

## 🛠️ OTRAS VARIABLES DE ENTORNO A VERIFICAR

Además de `MERCADOPAGO_ACCESS_TOKEN`, verifica que estén configuradas:

```bash
# En Supabase Dashboard → Settings → Edge Functions → Secrets

✅ SUPABASE_URL
   Valor: https://obxvffplochgeiclibng.supabase.co

✅ SUPABASE_SERVICE_ROLE_KEY
   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieH... (largo)

✅ APP_BASE_URL
   Valor: https://autorenta-web.pages.dev (producción)
   O: http://localhost:4200 (desarrollo)

✅ MERCADOPAGO_ACCESS_TOKEN
   Valor: APP_USR-XXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXX
```

⚠️ **IMPORTANTE**: Las Edge Functions de Supabase tienen sus propios secrets, separados de las variables de entorno del proyecto Angular.

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] **Token existe en Supabase Edge Functions Secrets**
- [ ] **Token comienza con `APP_USR-`** (es de producción, no test)
- [ ] **Token tiene ~77 caracteres** de longitud
- [ ] **SUPABASE_URL está configurada**
- [ ] **SUPABASE_SERVICE_ROLE_KEY está configurada**
- [ ] **APP_BASE_URL está configurada**
- [ ] **Logs de Edge Function no muestran errores de token**
- [ ] **Test manual con curl retorna `success: true`**

---

## 🚀 PRÓXIMOS PASOS DESPUÉS DE CONFIGURAR TOKEN

Una vez que el token esté configurado correctamente:

### 1. Probar Depósito Real

1. Ir a `/wallet` en la aplicación
2. Click en "Depositar"
3. Ingresar monto (ej: 100 ARS)
4. Verificar que se abre checkout de MercadoPago (no URL simulada)
5. Completar pago
6. Verificar que el balance se actualiza

### 2. Verificar Webhook de MercadoPago

El webhook también necesita configuración en MercadoPago Dashboard:

```
MercadoPago Dashboard → Tus integraciones → Webhooks → Configurar

URL del webhook:
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

Eventos a suscribir:
✅ payment.created
✅ payment.updated
```

### 3. Acreditar Depósitos Pendientes

Si hay usuarios que ya pagaron pero no se acreditaron, puedes:

**Opción A - Verificar en MercadoPago primero**:
1. Ir a MercadoPago Dashboard → Ventas
2. Verificar qué pagos están "approved"
3. Buscar el `external_reference` (es el `transaction_id`)

**Opción B - Acreditar manualmente** (solo si verificaste que pagaron):
```sql
-- Reemplazar UUID con el transaction_id real
SELECT * FROM wallet_confirm_deposit(
  'TRANSACTION-UUID'::UUID,
  'MANUAL-FIX-001',
  '{"status": "approved", "source": "manual_fix"}'::JSONB
);

-- Verificar balance
SELECT * FROM wallet_get_balance();
```

---

## 📊 RESUMEN EJECUTIVO

| Item | Estado Antes | Acción Requerida |
|------|--------------|------------------|
| **MERCADOPAGO_ACCESS_TOKEN** | ⚠️ A verificar | Configurar en Supabase Secrets |
| **Token de Producción** | ⚠️ Desconocido | Obtener de MercadoPago Dashboard |
| **Logs de Edge Function** | ⚠️ A revisar | Verificar errores 401/500 |
| **Webhook URL** | ⚠️ A verificar | Configurar en MercadoPago |
| **41 depósitos pendientes** | ❌ $0 acreditados | Acreditar después de fix |

---

## 🔗 RECURSOS

- **Supabase Dashboard**: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- **MercadoPago Developers**: https://www.mercadopago.com.ar/developers/panel
- **Edge Function Code**: `supabase/functions/mercadopago-create-preference/index.ts`
- **Webhook Code**: `supabase/functions/mercadopago-webhook/index.ts`
- **Diagnóstico SQL**: `database/quick_diagnosis.sql`
- **Audit Completo**: `MERCADOPAGO_WALLET_AUDIT.md`
- **Resultados**: `DIAGNOSIS_RESULTS.md`
