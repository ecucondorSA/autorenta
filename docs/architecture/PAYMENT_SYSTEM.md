# 🔄 API: Sistema Híbrido de Pagos - MercadoPago

**Fecha:** 2025-10-28
**Versión:** 1.0
**Estado:** ✅ Desplegado en Producción

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [API Reference](#api-reference)
4. [Modos de Pago](#modos-de-pago)
5. [Configuración](#configuración)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Validaciones y Errores](#validaciones-y-errores)
8. [Webhook Integration](#webhook-integration)
9. [Testing](#testing)

---

## 🎯 Resumen Ejecutivo

AutoRenta implementa un **sistema híbrido de pagos** que soporta dos flujos:

### **A. Pago Tradicional (Predeterminado)** ✅
- **Medios:** Tarjetas de crédito/débito, efectivo, todos los métodos
- **Split:** NO automático
- **Flujo:** Todo va a la cuenta de la plataforma → Payout manual al dueño
- **Ventaja:** Máxima conversión (todos los usuarios pueden pagar)

### **B. Pago con Cuenta MercadoPago (Opcional)** 💰
- **Medios:** SOLO saldo de cuenta MercadoPago
- **Split:** SÍ automático (dueño y plataforma reciben dinero directo)
- **Flujo:** Split instantáneo entre cuentas MP
- **Ventaja:** Sin necesidad de payouts manuales
- **Limitación:** Usuario DEBE tener saldo en su cuenta MP

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular)                           │
│  User selecciona modo de pago:                                  │
│  [●] Tarjeta/Efectivo (tradicional)                            │
│  [ ] Cuenta MercadoPago (split, 5% descuento)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         SUPABASE EDGE FUNCTION                                  │
│  mercadopago-create-booking-preference                          │
│                                                                 │
│  POST /functions/v1/mercadopago-create-booking-preference      │
│  Body: { booking_id, use_split_payment?: boolean }             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ if (use_split_payment && ENABLE_SPLIT_PAYMENTS) {    │     │
│  │   ✅ Crear preference CON marketplace_fee            │     │
│  │   ✅ Restringir payment_methods a account_money      │     │
│  │   ✅ Validar que dueño tenga collector_id            │     │
│  │ } else {                                              │     │
│  │   ✅ Crear preference SIN marketplace_fee            │     │
│  │   ✅ Aceptar TODOS los payment_methods               │     │
│  │ }                                                     │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              MERCADOPAGO API                                    │
│  POST /checkout/preferences                                     │
│  Response: { id, init_point }                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER COMPLETES PAYMENT                             │
│                                                                 │
│  Modo Tradicional:                                              │
│  → Usuario paga con tarjeta                                     │
│  → Todo va a cuenta de AutoRenta                                │
│  → Booking marcado como pagado                                  │
│  → AutoRenta transfiere al dueño después                        │
│                                                                 │
│  Modo Split:                                                    │
│  → Usuario paga con saldo MP                                    │
│  → MercadoPago divide automáticamente:                          │
│    • 90% → Dueño del auto                                       │
│    • 10% → AutoRenta                                            │
│  → Booking marcado como pagado                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         WEBHOOK VALIDATION                                      │
│  mercadopago-webhook                                            │
│                                                                 │
│  if (isMarketplaceSplit) {                                      │
│    ✅ Validar collector_id                                      │
│    ✅ Validar montos del split                                  │
│    ✅ Registrar en payment_splits                               │
│    ❌ Registrar issues si algo falla                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Reference

### **Edge Function: `mercadopago-create-booking-preference`**

**URL (Production):**
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference
```

**Method:** `POST`

**Authentication:** Bearer token (Supabase Auth JWT)

**Headers:**
```http
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  booking_id: string;           // UUID del booking (requerido)
  use_split_payment?: boolean;  // Opcional: true = split, false/undefined = tradicional
}
```

**Response (Success):**
```typescript
{
  preference_id: string;    // ID de la preferencia creada en MP
  init_point: string;       // URL del checkout de MercadoPago
  payment_mode: 'split' | 'traditional';  // Modo usado
}
```

**Response (Error):**
```typescript
{
  error: string;            // Mensaje de error
  details?: any;            // Detalles adicionales
}
```

**Status Codes:**
- `200 OK` - Preferencia creada exitosamente
- `400 Bad Request` - Datos inválidos (falta booking_id, usuario no autenticado)
- `404 Not Found` - Booking no encontrado
- `403 Forbidden` - Usuario no es el locatario del booking
- `422 Unprocessable Entity` - Split solicitado pero dueño no tiene collector_id
- `500 Internal Server Error` - Error de MercadoPago o Supabase

---

## 💳 Modos de Pago

### **Modo 1: Tradicional (Default)**

**Características:**
```typescript
{
  use_split_payment: false,  // O no enviar el parámetro

  // Preference generada:
  marketplace_fee: undefined,
  collector_id: undefined,

  payment_methods: {
    excluded_payment_methods: [],
    excluded_payment_types: [],
    installments: 12  // Hasta 12 cuotas
  }
}
```

**Métodos de pago aceptados:**
- ✅ Tarjetas de crédito (hasta 12 cuotas)
- ✅ Tarjetas de débito
- ✅ Efectivo (Rapipago, Pago Fácil)
- ✅ Transferencias bancarias
- ✅ Saldo de cuenta MercadoPago

**Flujo de dinero:**
```
Usuario → MercadoPago → Cuenta AutoRenta (100%)
                        ↓
              AutoRenta transfiere al dueño
              (después del alquiler)
```

**Cuándo usar:**
- Por defecto para todos los bookings
- Usuarios sin saldo en cuenta MP
- Máxima conversión

---

### **Modo 2: Split Payment (Opcional)**

**Características:**
```typescript
{
  use_split_payment: true,

  // Preference generada:
  marketplace: "5481180656166782",           // Application ID
  marketplace_fee: 1000.00,                  // 10% en ARS (ej: de $10,000)
  collector_id: "202984680",                 // ID del dueño del auto

  payment_methods: {
    excluded_payment_types: [
      { id: 'credit_card' },
      { id: 'debit_card' },
      { id: 'ticket' },
      { id: 'bank_transfer' },
      { id: 'atm' }
    ],
    installments: 1  // Solo 1 cuota
  }
}
```

**Método de pago aceptado:**
- ✅ SOLO saldo de cuenta MercadoPago

**Métodos EXCLUIDOS:**
- ❌ Tarjetas de crédito/débito
- ❌ Efectivo
- ❌ Transferencias bancarias

**Flujo de dinero:**
```
Usuario (con saldo MP) → MercadoPago split automático:
                         ├─ 90% → Dueño del auto (directo)
                         └─ 10% → AutoRenta (directo)
```

**Requisitos:**
1. `MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=true` en config
2. Dueño del auto DEBE tener `mercadopago_collector_id` configurado
3. Usuario DEBE tener saldo en su cuenta MP

**Cuándo usar:**
- Usuario explícitamente elige "Pagar con cuenta MP"
- Ofrecer descuento como incentivo (ej: 5% off)
- Usuario tiene saldo suficiente en MP

---

## ⚙️ Configuración

### **Variables de Entorno**

**En `.env.local` y Supabase Secrets:**
```bash
# Credenciales de MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-5481180656166782-102806-***
MERCADOPAGO_PUBLIC_KEY=APP_USR-c2e7a3be-34d9-4731-b049-4e89abdd097e
MERCADOPAGO_APPLICATION_ID=5481180656166782
MERCADOPAGO_MARKETPLACE_ID=202984680

# Feature flags
MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=false  # ⚠️ false por defecto
MERCADOPAGO_SPLIT_DISCOUNT_PERCENTAGE=5  # Descuento opcional para incentivar
```

### **Habilitar Split Payments**

**Paso 1: Configurar en Dashboard de MercadoPago**
1. Login a https://www.mercadopago.com.ar/developers/panel/app/5481180656166782
2. Ir a "Configuración" → "Modelo de negocio"
3. Seleccionar "Marketplace"
4. Activar "Procesar pagos como marketplace"

**Paso 2: Actualizar Variables de Entorno**
```bash
# Local
echo "MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=true" >> .env.local

# Supabase
npx supabase secrets set MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=true \
  --project-ref obxvffplochgeiclibng
```

**Paso 3: Redesplegar Edge Function**
```bash
npx supabase functions deploy mercadopago-create-booking-preference \
  --project-ref obxvffplochgeiclibng
```

### **Deshabilitar Split Payments**

```bash
# Cambiar flag a false
npx supabase secrets set MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=false

# Redesplegar
npx supabase functions deploy mercadopago-create-booking-preference
```

---

## 🧪 Ejemplos de Uso

### **Frontend: Checkout Component**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

interface CheckoutOptions {
  booking_id: string;
  paymentMode: 'traditional' | 'split';
}

async function createPaymentPreference(
  supabase: SupabaseClient,
  options: CheckoutOptions
): Promise<string> {
  // Determinar si usar split
  const use_split_payment = options.paymentMode === 'split';

  // Llamar a Edge Function
  const { data, error } = await supabase.functions.invoke(
    'mercadopago-create-booking-preference',
    {
      body: {
        booking_id: options.booking_id,
        use_split_payment,
      },
    }
  );

  if (error) {
    throw new Error(`Error creando preference: ${error.message}`);
  }

  // Redirigir a checkout de MercadoPago
  const { init_point, payment_mode } = data;
  console.log(`Preference creada en modo: ${payment_mode}`);

  return init_point;
}

// Uso en componente Angular
@Component({...})
export class CheckoutComponent {
  paymentOptions = [
    {
      id: 'traditional',
      name: 'Tarjeta de crédito/débito o efectivo',
      description: 'Todos los medios de pago aceptados',
      mode: 'traditional' as const,
    },
    {
      id: 'mp_account',
      name: 'Cuenta de MercadoPago',
      description: 'Pago instantáneo con 5% de descuento',
      mode: 'split' as const,
      requiresBalance: true,
      discount: 5,
    },
  ];

  selectedMode: 'traditional' | 'split' = 'traditional';

  async onCheckout(): Promise<void> {
    const init_point = await createPaymentPreference(this.supabase, {
      booking_id: this.booking.id,
      paymentMode: this.selectedMode,
    });

    // Redirigir a MercadoPago
    window.location.href = init_point;
  }
}
```

### **Frontend: UI del Checkout**

```html
<!-- checkout.component.html -->
<div class="payment-options">
  <h2>Selecciona tu método de pago</h2>

  <!-- Opción A: Tradicional -->
  <label class="payment-card">
    <input
      type="radio"
      name="payment_mode"
      value="traditional"
      [(ngModel)]="selectedMode"
      checked
    />
    <div class="content">
      <h3>💳 Tarjeta de crédito/débito o efectivo</h3>
      <p>Todos los medios de pago aceptados</p>
      <span class="badge">Hasta 12 cuotas</span>
    </div>
    <div class="price">{{ totalAmount | currency:'ARS' }}</div>
  </label>

  <!-- Opción B: Split con descuento -->
  <label class="payment-card discount">
    <input
      type="radio"
      name="payment_mode"
      value="split"
      [(ngModel)]="selectedMode"
    />
    <div class="content">
      <h3>💰 Cuenta de MercadoPago</h3>
      <p>Pago instantáneo con split automático</p>
      <span class="badge green">5% de descuento</span>
      <span class="warning" *ngIf="selectedMode === 'split'">
        ⚠️ Requiere saldo en tu cuenta de MercadoPago
      </span>
    </div>
    <div class="price">
      <span class="original">{{ totalAmount | currency:'ARS' }}</span>
      <span class="discounted">{{ discountedAmount | currency:'ARS' }}</span>
    </div>
  </label>

  <button
    class="btn-primary"
    (click)="onCheckout()"
    [disabled]="!selectedMode"
  >
    Continuar al pago
  </button>
</div>
```

### **Backend: Validar Collector ID del Dueño**

```typescript
// Antes de crear preference, verificar que dueño tenga collector_id
const { data: car, error: carError } = await supabase
  .from('cars')
  .select(`
    owner_id,
    profiles!cars_owner_id_fkey(mercadopago_collector_id)
  `)
  .eq('id', booking.car_id)
  .single();

if (use_split_payment && !car.profiles.mercadopago_collector_id) {
  return new Response(
    JSON.stringify({
      error: 'Split payment no disponible',
      details: 'El dueño del auto no ha vinculado su cuenta de MercadoPago',
    }),
    { status: 422 }
  );
}
```

---

## ⚠️ Validaciones y Errores

### **Validaciones de Request**

| Validación | Error | Status |
|------------|-------|--------|
| Usuario no autenticado | `error: 'No autorizado'` | 401 |
| booking_id faltante | `error: 'booking_id requerido'` | 400 |
| Booking no encontrado | `error: 'Booking no encontrado'` | 404 |
| Usuario no es el locatario | `error: 'No autorizado para este booking'` | 403 |
| Split solicitado pero dueño sin collector_id | `error: 'Split payment no disponible'` | 422 |
| Split habilitado pero flag=false | Se crea en modo tradicional | 200 |

### **Errores de MercadoPago**

```typescript
// Manejo de errores de MP
try {
  const preference = await mercadopago.preferences.create(preferenceData);
} catch (error: any) {
  console.error('[MP Error]', error.message);

  if (error.status === 400) {
    return new Response(
      JSON.stringify({
        error: 'Datos inválidos para MercadoPago',
        details: error.message,
      }),
      { status: 400 }
    );
  }

  if (error.status === 401) {
    return new Response(
      JSON.stringify({
        error: 'Credenciales de MercadoPago inválidas',
      }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      error: 'Error creando preference en MercadoPago',
      details: error.message,
    }),
    { status: 500 }
  );
}
```

### **Validaciones del Webhook**

Ver `supabase/functions/mercadopago-webhook/index.ts` (lines 548-747):

- ✅ Valida que `collector_id` coincida con el dueño del auto
- ✅ Valida que `owner_amount + platform_fee = total_amount`
- ✅ Registra issues en `payment_issues` si hay discrepancias
- ✅ Marca payment como validado o sospechoso

---

## 🔔 Webhook Integration

### **Eventos Procesados**

El webhook `mercadopago-webhook` detecta automáticamente si un pago es split o tradicional:

```typescript
const isMarketplaceSplit = !!(
  paymentData.marketplace &&
  paymentData.marketplace_fee
);

if (isMarketplaceSplit) {
  // Validar split payment
  await validateSplitPayment(paymentData, booking);

  // Registrar en payment_splits
  await supabase.rpc('register_payment_split', {
    p_booking_id: booking.id,
    p_payment_id: paymentData.id.toString(),
    p_total_amount_cents: totalAmountCents,
    p_owner_amount_cents: ownerAmountCents,
    p_platform_fee_cents: platformFeeCents,
    p_currency: paymentData.currency_id,
    p_collector_id: paymentData.collector_id.toString(),
    p_marketplace_id: paymentData.marketplace,
  });
} else {
  // Pago tradicional, registrar normalmente
  console.log('[Payment] Modo tradicional, no hay split');
}
```

### **Tabla: payment_splits**

```sql
CREATE TABLE payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  owner_amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'ARS',
  collector_id VARCHAR(255) NOT NULL,
  marketplace_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  validated_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Tabla: payment_issues**

```sql
CREATE TABLE payment_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  payment_id VARCHAR(255),
  issue_type VARCHAR(100) NOT NULL,  -- 'split_collector_mismatch', 'split_amount_mismatch'
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  severity VARCHAR(20) DEFAULT 'medium',
  priority INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing

### **Test 1: Modo Tradicional**

```bash
# Crear preference en modo tradicional
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "123e4567-e89b-12d3-a456-426614174000"
  }'

# Response esperada:
{
  "preference_id": "123456789-abc-def",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "payment_mode": "traditional"
}
```

**Verificar:**
- ✅ Aceptar pago con tarjeta de crédito
- ✅ Aceptar pago con efectivo
- ✅ No debe tener `marketplace_fee` en la preference

### **Test 2: Modo Split**

```bash
# Habilitar split payments primero
npx supabase secrets set MERCADOPAGO_ENABLE_SPLIT_PAYMENTS=true

# Crear preference en modo split
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "use_split_payment": true
  }'

# Response esperada:
{
  "preference_id": "123456789-abc-def",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "payment_mode": "split"
}
```

**Verificar:**
- ✅ SOLO aceptar pago con saldo de cuenta MP
- ✅ Rechazar tarjetas de crédito/débito
- ✅ Preference debe tener `marketplace_fee` configurado
- ✅ Webhook registra split en `payment_splits`

### **Test 3: Split Sin Collector ID**

```bash
# Usuario sin collector_id configurado
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-booking-preference \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "use_split_payment": true
  }'

# Response esperada:
{
  "error": "Split payment no disponible",
  "details": "El dueño del auto no ha vinculado su cuenta de MercadoPago"
}
# Status: 422
```

### **Test 4: Webhook Validation**

```bash
# Simular IPN de MercadoPago con split
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "123456789" }
  }'

# Verificar en DB:
# 1. payment_splits tiene registro
SELECT * FROM payment_splits WHERE payment_id = '123456789';

# 2. payment_issues NO tiene registros (si todo OK)
SELECT * FROM payment_issues WHERE payment_id = '123456789';

# 3. Booking marcado como pagado
SELECT status FROM bookings WHERE id = 'booking-uuid';
```

---

## 📊 Monitoreo y Métricas

### **Queries de Análisis**

**Distribución de modos de pago:**
```sql
SELECT
  CASE
    WHEN ps.id IS NOT NULL THEN 'split'
    ELSE 'traditional'
  END as payment_mode,
  COUNT(*) as count,
  SUM(p.amount) as total_revenue
FROM payments p
LEFT JOIN payment_splits ps ON ps.payment_id = p.provider_payment_id
WHERE p.status = 'success'
GROUP BY payment_mode;
```

**Issues de split payments:**
```sql
SELECT
  issue_type,
  COUNT(*) as count,
  AVG((details->>'difference')::float) as avg_difference
FROM payment_issues
WHERE resolved = false
GROUP BY issue_type
ORDER BY count DESC;
```

**Conversión por modo:**
```sql
-- Tasa de conversión split vs tradicional
WITH payment_modes AS (
  SELECT
    b.id,
    CASE
      WHEN ps.id IS NOT NULL THEN 'split'
      ELSE 'traditional'
    END as mode,
    CASE WHEN p.status = 'success' THEN 1 ELSE 0 END as converted
  FROM bookings b
  LEFT JOIN payments p ON p.booking_id = b.id
  LEFT JOIN payment_splits ps ON ps.booking_id = b.id
)
SELECT
  mode,
  COUNT(*) as attempts,
  SUM(converted) as conversions,
  ROUND(100.0 * SUM(converted) / COUNT(*), 2) as conversion_rate
FROM payment_modes
GROUP BY mode;
```

---

## 🔒 Seguridad

### **Consideraciones de Seguridad**

1. **JWT Validation**: Todos los requests requieren JWT válido de Supabase Auth
2. **RLS Policies**: Usuarios solo pueden crear preferences para sus propios bookings
3. **Webhook Signature**: El webhook valida firmas HMAC de MercadoPago
4. **Collector ID Validation**: Se verifica que collector_id coincida con dueño del auto
5. **Amount Validation**: Se valida que montos del split sumen correctamente

### **Variables Sensibles**

```bash
# NUNCA commitear estas variables
MERCADOPAGO_ACCESS_TOKEN=***
MERCADOPAGO_CLIENT_SECRET=***
SUPABASE_SERVICE_ROLE_KEY=***
```

**Usar Supabase Secrets:**
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=***
```

---

## 📚 Referencias

- **Edge Function Source**: `/home/edu/autorenta/supabase/functions/mercadopago-create-booking-preference/index.ts`
- **Webhook Source**: `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts`
- **SQL Migrations**: `/home/edu/autorenta/supabase/migrations/20251028_add_payment_splits_tracking.sql`
- **Limitación de Split Payments**: `/home/edu/autorenta/docs/CRITICAL_SPLIT_PAYMENTS_LIMITATION.md`
- **Configuración de Producción**: `/home/edu/autorenta/docs/PRODUCTION_CREDENTIALS_CONFIGURED.md`

---

**Última actualización:** 2025-10-28
**Autor:** Claude Code
**Versión:** 1.0
