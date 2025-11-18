# 🚀 Configuración de MercadoPago - AutoRenta

**Última actualización:** 2025-11-16
**Estado:** ✅ Producción activa

---

## 🔑 Credenciales y Tokens

### Credenciales de Producción

**País de operación:** Argentina (ARS)

**Public Key (Frontend):**
```
APP_USR-c2e7a3be-34d9-4731-b049-4e89abdd097e
```

**Access Token (Backend/Supabase):**
```
APP_USR-5481180656166782-102806-aeacc45719411021c85acca814b92ad9-202984680
```

**Client ID:**
```
5481180656166782
```

**Client Secret:**
```
igIjYgarnXFG3lz0BFat5h3haAeur7Qb
```

**MCP Server Token (para herramientas MCP):**
```
APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
```

### Configuración en Supabase

**Secrets configurados:**
- ✅ `MERCADOPAGO_ACCESS_TOKEN` - Token de producción
- ✅ `SUPABASE_URL` - Configurado automáticamente
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurado automáticamente

**Comando para actualizar token:**
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-5481180656166782-102806-aeacc45719411021c85acca814b92ad9-202984680" --project-ref pisqjmoklivzpwufhscx
```

### Configuración en Frontend

**Archivo:** `apps/web/src/environments/environment.ts`

```typescript
export const environment = {
  // ... otros configs
  mercadoPagoPublicKey: 'APP_USR-c2e7a3be-34d9-4731-b049-4e89abdd097e',
};
```

**Archivo:** `apps/web/.env.development.local`
```bash
NG_APP_MERCADOPAGO_PUBLIC_KEY=APP_USR-c2e7a3be-34d9-4731-b049-4e89abdd097e
```

---

## 🏗️ Arquitectura y Componentes

### Edge Functions Desplegadas

| Función | URL | Propósito | Estado |
|---------|-----|-----------|--------|
| `mercadopago-create-preference` | `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference` | Crear preferencias de depósito | ✅ Activo |
| `mercadopago-create-booking-preference` | `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference` | Crear preferencias de booking | ✅ Activo |
| `mercadopago-webhook` | `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook` | Procesar notificaciones IPN | ✅ Activo |
| `mercadopago-poll-pending-payments` | Cron job cada 3 min | Backup polling de pagos | ✅ Activo |
| `mp-create-preauth` | `supabase/functions/mp-create-preauth/` | Crear preautorizaciones | ✅ Activo |
| `mp-capture-preauth` | `supabase/functions/mp-capture-preauth/` | Capturar preautorizaciones | ✅ Activo |
| `mp-cancel-preauth` | `supabase/functions/mp-cancel-preauth/` | Cancelar preautorizaciones | ✅ Activo |

### Frontend (Angular)

**SDK instalado:**
```bash
npm install @mercadopago/sdk-react
```

**Script en `index.html`:**
```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

**Servicios principales:**
- `MercadoPagoService` - Creación de tokens de tarjeta
- `MarketplaceOnboardingService` - OAuth y vinculación de cuentas
- `WalletService` - Depósitos y transacciones
- `EncryptionService` - Encriptación AES-256-GCM de tokens OAuth

---

## 🔄 Flujos Operativos

### 1. Depósitos a Wallet

```
1. Usuario → WalletService.initiateDeposit()
   ↓
2. Se crea registro en wallet_transactions (status: pending)
   ↓
3. Frontend → mercadopago-create-preference (transaction_id, amount)
   ↓
4. Usuario redirigido a MercadoPago (init_point)
   ↓
5. Usuario completa pago
   ↓
6. MercadoPago → mercadopago-webhook (notificación IPN)
   ↓
7. Webhook valida HMAC → wallet_confirm_deposit_admin()
   ↓
8. Balance acreditado en wallet
```

**Backup:** Cron `mercadopago-poll-pending-payments` verifica cada 3 min si webhook no llegó.

### 2. Pagos de Booking

```
1. Usuario → BookingService.requestBooking()
   ↓
2. Se crea booking (status: pending)
   ↓
3. Frontend → mercadopago-create-booking-preference (booking_id, amount)
   ↓
4. Edge Function:
   - Obtiene datos del auto y owner
   - Usa OAuth token del owner si está disponible (split payments)
   - Crea preferencia con category_id: 'travel'
   ↓
5. Usuario redirigido a MercadoPago
   ↓
6. Usuario completa pago
   ↓
7. MercadoPago → mercadopago-webhook
   ↓
8. Webhook actualiza booking (status: confirmed)
```

### 3. Preautorizaciones (Card Holds)

```
1. PaymentAuthorizationService.authorizePayment()
   ↓
2. RPC create_payment_authorization()
   ↓
3. Edge Function mp-create-preauth → POST /v1/payments (capture=false)
   ↓
4. Webhook marca estado authorized/approved
   ↓
5. Captura: mp-capture-preauth → ledger wallet_ledger
   ↓
6. Cancelación: mp-cancel-preauth → libera fondos
```

### 4. OAuth (Marketplace Onboarding)

```
1. Usuario → MarketplaceOnboardingService.startOnboarding()
   ↓
2. Redirección a MercadoPago OAuth
   ↓
3. Usuario autoriza aplicación
   ↓
4. Callback → exchangeCodeForToken()
   ↓
5. Tokens encriptados con AES-256-GCM
   ↓
6. Guardados en profiles.mercadopago_access_token_encrypted
   ↓
7. Usado en split payments cuando está disponible
```

---

## 🔧 Configuración en MercadoPago Dashboard

### Webhook URL

**URL de producción:**
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook
```

**Eventos configurados:**
- ✅ `payment` (para depósitos y bookings)
- ✅ `money_request` (para retiros, si se implementa)

**Configuración:**
1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar aplicación
3. Ir a "Webhooks"
4. Agregar URL y seleccionar eventos

### URLs de Retorno

Configuradas automáticamente en cada preferencia:
- **Success:** `{origin}/wallet?status=success`
- **Failure:** `{origin}/wallet?status=failure`
- **Pending:** `{origin}/wallet?status=pending`

---

## 🧪 Testing

### Tarjetas Sandbox

**Mastercard (APRO):**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Vencimiento: `11/25`
- Titular: `APRO`

**Visa (APRO):**
- Número: `4509 9535 6623 3704`
- CVV: `123`
- Vencimiento: `11/25`

### Montos Recomendados

- ✅ $100 ARS - Aprobado
- ✅ $1,000 ARS - Aprobado
- ✅ $10,000 ARS - Aprobado
- ⚠️ > $100,000 ARS - Puede generar `cc_rejected_high_risk`

### Simular Webhook

```bash
curl -X POST \
  'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook?topic=payment&id=123456789'
```

---

## 📊 Monitoreo

### Logs de Edge Functions

```bash
# Logs de create-preference
npx supabase functions logs mercadopago-create-preference

# Logs de webhook
npx supabase functions logs mercadopago-webhook --tail

# Logs de booking preference
npx supabase functions logs mercadopago-create-booking-preference
```

### Verificar Transacciones

```sql
-- Depósitos recientes
SELECT id, type, amount, status, provider_transaction_id, created_at, completed_at
FROM wallet_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 10;

-- Bookings con pagos
SELECT id, car_id, renter_id, total_amount, status, mercadopago_preference_id, created_at
FROM bookings
WHERE mercadopago_preference_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Troubleshooting

### Error: "MERCADOPAGO_ACCESS_TOKEN not configured"

**Solución:**
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-5481180656166782-102806-aeacc45719411021c85acca814b92ad9-202984680" --project-ref pisqjmoklivzpwufhscx
```

### Error: "Invalid MercadoPago access token format"

**Causa:** Token no tiene formato correcto
**Solución:** Verificar que el token empiece con `APP_USR-`

### Error: "MercadoPago API error: 401"

**Causa:** Token inválido o expirado
**Solución:**
1. Verificar token en MercadoPago Dashboard
2. Regenerar token si es necesario
3. Actualizar secret en Supabase

### Webhook no se ejecuta

**Verificar:**
1. URL configurada correctamente en MP Dashboard
2. Función deployada: `npx supabase functions deploy mercadopago-webhook`
3. Eventos seleccionados (`payment` y `money_request`)
4. Logs de la función: `npx supabase functions logs mercadopago-webhook`

### Error: "cc_rejected_high_risk"

**Causa:** Monto muy alto o datos incompletos
**Solución:**
- Reducir monto de prueba
- Verificar que payer tiene `first_name`, `last_name`, `identification`
- Verificar que items tienen `category_id: 'travel'`

---

## 🔒 Seguridad

### Encriptación de Tokens OAuth

**Estado:** ✅ Implementado

Los tokens OAuth de MercadoPago se encriptan con **AES-256-GCM** antes de almacenarse:

- **Servicio:** `EncryptionService` (`apps/web/src/app/core/services/encryption.service.ts`)
- **Algoritmo:** AES-256-GCM (authenticated encryption)
- **Key Management:** Variable de entorno `NG_APP_ENCRYPTION_KEY`
- **Columnas:** `profiles.mercadopago_access_token_encrypted`, `profiles.mercadopago_refresh_token_encrypted`

### RLS Policies

Las tablas están protegidas por RLS:
- ✅ `wallet_transactions` - Solo usuarios ven sus propias transacciones
- ✅ `withdrawal_requests` - Solo usuarios ven sus propios retiros
- ✅ `bank_accounts` - Solo usuarios ven sus propias cuentas
- ✅ `profiles` - Solo usuarios ven su propio perfil

---

## 📝 Checklist de Configuración

- [x] Obtener Access Token de MercadoPago
- [x] Configurar secret en Supabase
- [x] Deploy Edge Functions
- [x] Configurar Public Key en frontend
- [x] Instalar SDK de MercadoPago
- [x] Configurar webhook URL en MercadoPago Dashboard
- [x] Testing en sandbox
- [x] Monitoreo de primeras transacciones

---

## 🎯 Estado Actual

**✅ Configuración completada:**
- Edge Functions desplegadas
- Credenciales configuradas
- Sistema de depósitos funcional
- Sistema de bookings funcional
- Preautorizaciones implementadas
- OAuth para split payments implementado
- Encriptación de tokens implementada

**Puntaje de calidad:** 85-90/100 puntos ✅

---

## 📚 Referencias

- [MercadoPago Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro)
- [MercadoPago Marketplace](https://www.mercadopago.com.ar/developers/es/docs/marketplace)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- Ver también:
  - `MERCADOPAGO_QUALITY_AUDIT.md` - Auditoría completa de calidad (85-90/100 puntos)
  - `MERCADOPAGO_OPERATIONS.md` - Flujos operativos, monitoreo y troubleshooting

