# CLAUDE_PAYMENTS.md

Sistema de pagos de AutoRenta: MercadoPago, Wallet y Webhooks.

## Payment Architecture (CRITICAL - Updated Oct 2025)

**AutoRenta usa DIFERENTES sistemas de pago para desarrollo vs producción:**

### 🏭 PRODUCTION (Real Money - MercadoPago)

**Primary System**: Supabase Edge Functions

- **Webhook**: `supabase/functions/mercadopago-webhook/` (✅ DEPLOYED, ACTIVE)
- **Create Preference**: `supabase/functions/mercadopago-create-preference/` (✅ DEPLOYED)
- **Booking Preference**: `supabase/functions/mercadopago-create-booking-preference/` (✅ DEPLOYED)
- **Authentication**: `MERCADOPAGO_ACCESS_TOKEN` almacenado en Supabase secrets
- **URL**: `https://[PROJECT].supabase.co/functions/v1/mercadopago-webhook`
- **SDK**: SDK oficial de MercadoPago (importado vía Deno)
- **Signature Verification**: ✅ Habilitado (valida firmas MP)
- **Idempotency**: ✅ Manejado vía unicidad de transaction_id en DB

**Payment Flow (Production)**:
```
Usuario → Frontend → Supabase Edge Function (create-preference)
                ↓
          MercadoPago Checkout (pago real)
                ↓
          MercadoPago envía IPN webhook
                ↓
          Supabase Edge Function (mercadopago-webhook)
                ↓
          RPC wallet_confirm_deposit() → Acredita fondos
                ↓
          Usuario redirigido de vuelta a app
```

**Key Files**:
- `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts` (webhook handler)
- `/home/edu/autorenta/supabase/functions/mercadopago-create-preference/index.ts` (depósitos wallet)
- `/home/edu/autorenta/supabase/functions/mercadopago-create-booking-preference/index.ts` (bookings)

### 🧪 DEVELOPMENT (Mock Testing)

**Secondary System**: Cloudflare Worker (LOCAL ONLY)

- **Location**: `functions/workers/payments_webhook/`
- **Status**: ❌ NOT DEPLOYED to Cloudflare (solo dev local)
- **Purpose**: Mock webhooks para testing rápido sin MercadoPago
- **URL**: `http://localhost:8787/webhooks/payments` (wrangler dev)
- **Endpoint**: `POST /webhooks/payments`
- **Payload**: `{ provider: 'mock', booking_id: string, status: 'approved' | 'rejected' }`

**Mock Flow (Development Only)**:
```
Developer → Frontend → payments.service.ts::markAsPaid()
                     ↓
               Cloudflare Worker (local)
                     ↓
               Supabase DB (mock payment)
```

**Protection Against Accidental Production Use**:
```typescript
// apps/web/src/app/core/services/payments.service.ts:75
async markAsPaid(intentId: string): Promise<void> {
  if (environment.production) {
    throw new Error('markAsPaid() deprecado en producción.
                     El webhook de MercadoPago actualiza automáticamente.');
  }
  // ... lógica mock solo corre en dev
}
```

### ⚠️ IMPORTANT: Which System is Used?

| Environment | Payment System | Webhook URL | Token Required |
|-------------|----------------|-------------|----------------|
| **Production** | MercadoPago Real | Supabase Edge Function | ✅ En Supabase secrets |
| **Staging** | MercadoPago Sandbox | Supabase Edge Function | ✅ En Supabase secrets |
| **Development** | Mock (opcional) | Cloudflare Worker (local) | ❌ No necesario |

**Para verificar qué sistema está activo**:
```bash
# Check deployed Supabase functions
npx supabase functions list | grep mercadopago

# Check Cloudflare Worker (NO debería existir en producción)
wrangler secret list --name payments_webhook
```

### 🔐 Secrets Configuration

**Supabase Secrets (Production)**:
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-***
npx supabase secrets set SUPABASE_URL=https://[project].supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=***
npx supabase secrets set MERCADOPAGO_APPLICATION_ID=***
npx supabase secrets set MERCADOPAGO_CLIENT_SECRET=***
npx supabase secrets set MERCADOPAGO_MARKETPLACE_ID=***
npx supabase secrets set MERCADOPAGO_PUBLIC_KEY=***
npx supabase secrets set MERCADOPAGO_OAUTH_REDIRECT_URI=***
npx supabase secrets set PLATFORM_MARGIN_PERCENT=15
```

**Cloudflare Secrets (Development - Optional)**:
```bash
# NO NECESARIO - Mock worker no valida pagos reales
# Solo configurar si quieres testear webhooks MP reales localmente
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 📊 Payment Types & Non-Withdrawable Cash

**MercadoPago payment_type_id values**:
- `'ticket'` → Pago Fácil/Rapipago (efectivo) → **NON-WITHDRAWABLE**
- `'credit_card'` → Tarjeta de crédito → Withdrawable
- `'debit_card'` → Tarjeta de débito → Withdrawable
- `'account_money'` → Balance MercadoPago → Withdrawable

**Cash Deposit Handling** (ver `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`):
- Depósitos en efectivo se acreditan normalmente a wallet
- Automáticamente marcados como non-withdrawable
- Tracked en `user_wallets.non_withdrawable_floor`
- Usuarios advertidos en UI antes de depositar
- Se pueden usar para bookings pero no retirar a banco

### 🧹 Legacy Code Cleanup

**Files to IGNORE (legacy mock system)**:
- `functions/workers/payments_webhook/` - Cloudflare Worker (no deployed)
- Métodos en `payments.service.ts` con production guards:
  - `markAsPaid()` - Lanza error en producción
  - `triggerMockPayment()` - Lanza error en producción

**Por qué mantener código mock?**:
- Habilita desarrollo local rápido
- No necesita hit MercadoPago sandbox para cada test
- Production guards previenen uso accidental
- Developers pueden testear flujos de pago offline

## Exchange Rate System (USD/ARS Conversion)

### Overview

AutoRenta obtiene cotizaciones de USD a ARS desde **Binance API (USDT/ARS)**, NO del "Dólar Tarjeta" oficial.

**Importante**: La cotización mostrada al usuario es:
```
Binance USDT/ARS + 10% margen operativo
```

**NO es el "Dólar Tarjeta" oficial** (que incluye:)
- Dólar Oficial de BCRA + 30% impuesto PAIS + 45% impuesto ganancias
- Aproximadamente **75% más caro** que USDT/ARS

### Fuente de Datos

**API Endpoint**: `https://api.binance.com/api/v3/ticker/price?symbol=USDTARS`

**Par**: USDT/ARS (Tether a Peso Argentino)

**Actualización**: Cada 15 minutos (triple sistema redundante):
1. GitHub Actions → Edge Function `sync-binance-rates`
2. PostgreSQL Cron → Edge Function `update-exchange-rates`
3. PostgreSQL Cron Direct → Llamada directa a Binance API

### Cálculo de Cotización

```
1. Obtener tasa base de Binance: 875.50 ARS/USD
2. Aplicar margen plataforma (10%): 875.50 × 1.10 = 963.05 ARS/USD
3. Guardar en DB como 'rate' (YA con margen)
4. Retornar sin multiplicar nuevamente
```

**⚠️ IMPORTANTE**: El campo `rate` en tabla `exchange_rates` YA contiene el margen del 10%.
**NO multiplicar por 1.1 nuevamente** en el frontend.

### Database Table

```sql
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair VARCHAR(20),              -- 'USDTARS', 'USDTBRL', etc
  source VARCHAR(50),            -- 'binance', 'manual_seed'
  binance_rate DECIMAL(10,2),    -- Tasa sin margen (Binance puro)
  margin_percent DECIMAL(5,2),   -- Margen aplicado (10)
  margin_absolute DECIMAL(10,2), -- Margen en ARS (963.05 - 875.50)
  rate DECIMAL(10,2),            -- Tasa final (binance + margen) ⭐
  volatility_24h DECIMAL(5,2),   -- Volatilidad (informativo)
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP,
  created_at TIMESTAMP
);
```

### Services

**ExchangeRateService** (`apps/web/src/app/core/services/exchange-rate.service.ts`):
- `getPlatformRate(pair)`: Retorna rate con margen (ya incluido en DB)
- `getBinanceRate()`: Retorna tasa base de Binance (sin margen)
- `convertUsdToArs(amount)`: Convierte USD → ARS
- `convertArsToUsd(amount)`: Convierte ARS → USD
- Cache: 60 segundos

**FxService** (`apps/web/src/app/core/services/fx.service.ts`):
- `getFxSnapshot()`: Obtiene snapshot para UI (7 días TTL)
- `revalidateFxSnapshot()`: Valida si necesita actualización
- `convert()`: Convierte usando snapshot

### UI Disclosure

**Booking Detail Payment** muestra:
```
Cotización del día (Binance USDT/ARS + 10%)
1 USD = $ 963.05 ARS
```

**Legal Disclaimer** (agregado al componente):
```
⚠️ Nota sobre Cotización: La cotización mostrada se obtiene del mercado
USDT/ARS en Binance con un margen operativo del 10%. No refleja el "Dólar
Tarjeta" oficial (que incluye impuestos PAIS y Ganancias). El monto a
bloquear en su tarjeta será calculado por su banco según su tipo de cambio vigente.
```

### Validation & Testing

**Bug Fix (Nov 2025)**: Se removió doble margen en:
- `ExchangeRateService.getPlatformRate()` - Línea 58
- `ExchangeRateService.getLastKnownPlatformRate()` - Línea 167
- `FxService.getFxSnapshot()` - Línea 55

El código estaba multiplicando por 1.1 dos veces resultando en 21% margen en lugar de 10%.

## Wallet System

### Database Tables

**user_wallets**: Balance de usuario y fondos bloqueados (una fila por usuario)
```sql
CREATE TABLE user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance DECIMAL(10,2) DEFAULT 0,
  locked_balance DECIMAL(10,2) DEFAULT 0,
  non_withdrawable_floor DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**wallet_transactions**: Todas las operaciones de wallet
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50), -- 'deposit', 'withdrawal', 'payment', 'lock', 'unlock'
  amount DECIMAL(10,2),
  status VARCHAR(20), -- 'pending', 'completed', 'failed'
  payment_type_id VARCHAR(50), -- 'ticket', 'credit_card', etc.
  is_withdrawable BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Wallet Flow

**Flow completo de depósito**:
1. Usuario hace click en "Depositar" → Frontend llama `wallet_initiate_deposit()`
2. RPC crea transacción pending → Retorna transaction_id
3. Frontend llama Edge Function `mercadopago-create-preference` con transaction_id
4. Edge Function crea preference → Retorna init_point (checkout URL)
5. Usuario redirigido a MercadoPago → Completa pago
6. MercadoPago envía IPN → Llama Edge Function `mercadopago-webhook`
7. Webhook verifica pago → Llama `wallet_confirm_deposit()`
8. RPC actualiza status de transacción → Acredita fondos a user wallet
9. Usuario redirigido de vuelta → Balance actualizado

### Key Implementation Details

- ✅ **Currency**: Siempre ARS (requerido por MercadoPago Argentina)
- ✅ **Idempotency**: Webhook maneja notificaciones duplicadas de forma segura
- ✅ **Token cleaning**: Access token es trimmed y sanitized
- ✅ **No auto_return**: No funciona con localhost HTTP
- ✅ **Logging**: Logs de debug extensivos para troubleshooting
- ✅ **Hardcoded fallback**: Token tiene fallback para desarrollo local
- ✅ **RLS**: Todas las operaciones protegidas por Row Level Security

### RPC Functions

**wallet_initiate_deposit(amount DECIMAL, metadata JSONB)**
```sql
-- Crea transacción de depósito pending
-- Returns: transaction_id UUID
```

**wallet_confirm_deposit(transaction_id UUID, payment_data JSONB)**
```sql
-- Confirma depósito y acredita fondos
-- Marca como non-withdrawable si payment_type_id = 'ticket'
-- Returns: updated transaction
```

**wallet_get_balance(user_id UUID)**
```sql
-- Retorna balance disponible y bloqueado
-- Returns: { balance, locked_balance, available_balance }
```

**wallet_lock_funds(user_id UUID, amount DECIMAL, booking_id UUID)**
```sql
-- Bloquea fondos para booking
-- Mueve de balance a locked_balance
-- Returns: success boolean
```

**wallet_unlock_funds(user_id UUID, amount DECIMAL, booking_id UUID)**
```sql
-- Desbloquea fondos después de booking
-- Mueve de locked_balance a balance
-- Returns: success boolean
```

## Edge Functions

### mercadopago-webhook

**Location**: `supabase/functions/mercadopago-webhook/index.ts`

**Purpose**: Procesa notificaciones IPN de MercadoPago

**Flow**:
1. Recibe POST request de MercadoPago con payment_id
2. Valida firma (si está habilitada)
3. Obtiene detalles de pago de MercadoPago API
4. Si `status = 'approved'`:
   - Llama `wallet_confirm_deposit()`
   - Marca transacción como completed
   - Acredita fondos a wallet
5. Si `status = 'rejected'` o `'cancelled'`:
   - Actualiza transacción a failed
6. Retorna 200 OK (MercadoPago reintentos si ≠200)

**Idempotency**: Usa transaction_id unique constraint para prevenir doble acreditación

### mercadopago-create-preference

**Location**: `supabase/functions/mercadopago-create-preference/index.ts`

**Purpose**: Crea preference de MercadoPago para depósitos de wallet

**Input**:
```json
{
  "transaction_id": "uuid",
  "amount": 1000,
  "description": "Depósito a wallet AutoRenta"
}
```

**Output**:
```json
{
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "preference_id": "123456789-abcd-1234-..."
}
```

**Configuration**:
- Currency: ARS (hardcoded)
- back_urls: success, failure, pending
- notification_url: webhook URL
- auto_return: false (no funciona con localhost)

### mercadopago-create-booking-preference

**Location**: `supabase/functions/mercadopago-create-booking-preference/index.ts`

**Purpose**: Crea preference de MercadoPago para pagos de bookings

**Similar a create-preference** pero:
- Incluye split payment a locador
- Calcula platform margin (15%)
- Vincula con booking_id en metadata

## Testing Payment Flows

### Local Development (Mock)

```bash
# Terminal 1: Start Angular dev server
npm run dev:web

# Terminal 2: Start mock payment webhook worker
npm run dev:worker

# Terminal 3: Trigger mock payment
curl -X POST http://localhost:8787/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mock",
    "booking_id": "uuid-here",
    "status": "approved"
  }'
```

### Production Testing (Sandbox)

```bash
# Usar MercadoPago test credentials
# https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/test-cards

# Test credit card: 5031 7557 3453 0604
# CVV: 123
# Exp: 11/25
# Name: APRO (para approval)
```

### Webhook Testing

```bash
# Ver logs en Supabase Dashboard
# Functions > mercadopago-webhook > Logs

# O vía CLI
npx supabase functions logs mercadopago-webhook --tail
```

## Common Issues

### 1. Webhook no recibe notificaciones

**Posibles causas**:
- URL de webhook incorrecta en preference
- MercadoPago no puede alcanzar URL (localhost, firewall)
- Signature verification fallando

**Debug**:
```bash
# Check webhook URL en preference
curl -X GET "https://api.mercadopago.com/checkout/preferences/{preference_id}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Ver logs de webhook
npx supabase functions logs mercadopago-webhook --tail
```

### 2. Doble acreditación de fondos

**Causa**: MercadoPago envía múltiples notificaciones IPN

**Solución**: Idempotency implementada vía unique constraint en transaction_id

### 3. Token inválido o expirado

**Síntomas**: 401 Unauthorized de MercadoPago API

**Solución**:
```bash
# Rotar access token
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-new-token
```

### 4. Pagos en efectivo no se marcan como non-withdrawable

**Causa**: payment_type_id no reconocido

**Verificar**:
```sql
-- Check payment_type_id en transacciones
SELECT id, payment_type_id, is_withdrawable
FROM wallet_transactions
WHERE type = 'deposit'
ORDER BY created_at DESC
LIMIT 10;
```

## Documentation References

- **Wallet System**: `WALLET_SYSTEM_DOCUMENTATION.md` - Guía completa del sistema
- **Cash Deposits**: `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md` - Fix de efectivo
- **MercadoPago Docs**: https://www.mercadopago.com.ar/developers/es/docs
- **Architecture**: [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)
