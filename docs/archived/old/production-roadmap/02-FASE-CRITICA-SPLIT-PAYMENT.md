# 💳 Fase 02: Split Payment Automático con MercadoPago

**Prioridad:** 🔴 P0 (BLOCKER)
**Tiempo estimado:** 5-7 días
**Impacto:** 55% → 70%
**Estado:** ⏳ Por implementar

---

## 🎯 Objetivo

Implementar split payment automático para que los locadores reciban su dinero directamente al confirmar una reserva.

## 🔴 Problema Actual - Análisis Detallado

### Estado actual del flujo de pagos:

1. **Usuario hace reserva y paga**
   - Dinero va 100% a la cuenta de la plataforma
   - No hay split automático

2. **Auto queda activo sin validar onboarding MP**
   - Archivo: `publish-car-v2.page.ts` líneas 1540-1563
   - Auto se marca como 'active' aunque locador no tenga cuenta MP
   - Resultado: Reservas generadas pero locador no puede cobrar

3. **Split manual en edge function**
   - Archivo: `mercadopago-create-booking-preference/index.ts` líneas 312-337
   - Código comentado o no funcional
   - No hay transferencia automática

### Impacto del problema:

- 🔴 Locadores NO reciben dinero automáticamente
- 🔴 Plataforma acumula fondos que debe distribuir manualmente
- 🔴 Riesgo legal y de compliance
- 🔴 Operación NO escalable
- 🔴 Modelo de negocio ROTO

### Ejemplo del flujo roto:

```
1. Locador publica auto ✅
2. Locador NO completa onboarding MP ❌
3. Auto queda 'active' ✅ (MAL)
4. Usuario reserva y paga $1000 ✅
5. Dinero va a plataforma 100% ❌
6. Locador espera su $900 (90%) ⏳
7. Split manual necesario ❌
8. Proceso NO escalable ❌
```

---

## ✅ Solución Propuesta

### Arquitectura del Split Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLUJO DE SPLIT PAYMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario paga reserva ($1000)                                │
│          ↓                                                       │
│  2. MercadoPago recibe pago                                     │
│          ↓                                                       │
│  3. Split automático:                                           │
│     ├─ Locador: $900 (90%) → Su cuenta MP                      │
│     └─ Plataforma: $100 (10%) → Cuenta principal               │
│          ↓                                                       │
│  4. Webhook confirma splits                                     │
│          ↓                                                       │
│  5. DB actualiza: booking.payment_status = 'completed'          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes necesarios:

1. **Onboarding MP obligatorio antes de activar auto**
2. **Marketplace de MercadoPago configurado**
3. **Split payment en preference creation**
4. **Webhook para confirmar transfers**
5. **Rollback en caso de error**

---

## 📝 Implementación Paso a Paso

### Paso 1: Validar Onboarding MP antes de activar auto

**Archivo:** `apps/web/src/app/features/cars/publish-car-v2.page.ts`

**ANTES (MAL ❌):**
```typescript
// Líneas 1540-1563
async publishCar() {
  // ... validaciones ...

  // Marca auto como activo SIN validar MP
  await this.supabase
    .from('cars')
    .update({ status: 'active' })
    .eq('id', carId);

  this.router.navigate(['/success']);
}
```

**DESPUÉS (BIEN ✅):**
```typescript
async publishCar() {
  // 1. Verificar onboarding MP
  const { data: ownerProfile } = await this.supabase
    .from('user_profiles')
    .select('mercadopago_collector_id, mp_onboarding_completed')
    .eq('user_id', this.userId)
    .single();

  if (!ownerProfile?.mp_onboarding_completed) {
    // Redirigir a completar onboarding
    this.showMPOnboardingModal();
    return;
  }

  if (!ownerProfile.mercadopago_collector_id) {
    throw new Error('Collector ID no encontrado');
  }

  // 2. Ahora sí, activar auto
  await this.supabase
    .from('cars')
    .update({
      status: 'active',
      owner_mp_collector_id: ownerProfile.mercadopago_collector_id
    })
    .eq('id', carId);

  this.router.navigate(['/success']);
}

private showMPOnboardingModal() {
  const modal = {
    title: '¡Casi listo!',
    message: 'Para recibir pagos, necesitas completar tu perfil de MercadoPago',
    buttons: [
      {
        text: 'Completar ahora',
        handler: () => this.startMPOnboarding()
      },
      {
        text: 'Después',
        role: 'cancel'
      }
    ]
  };
  // Mostrar modal...
}
```

**Migración DB necesaria:**
```sql
-- Agregar columna para collector_id en cars
ALTER TABLE cars
ADD COLUMN owner_mp_collector_id VARCHAR(255);

-- Agregar índice
CREATE INDEX idx_cars_mp_collector
ON cars(owner_mp_collector_id);
```

---

### Paso 2: Configurar Marketplace en MercadoPago

**Documentación:** https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments/split-payments-marketplace

**Pasos en dashboard MP:**

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Configuración" → "Marketplace"
4. Activar "Split de pagos"
5. Configurar:
   - Comisión de plataforma: 10%
   - Modo: Automático
   - Transferencia: Inmediata

**Guardar credenciales:**
```bash
# En .env.local
MERCADOPAGO_MARKETPLACE_ID=tu-marketplace-id
MERCADOPAGO_APPLICATION_ID=tu-app-id
```

---

### Paso 3: Implementar Split en Preference Creation

**Archivo:** `supabase/functions/mercadopago-create-booking-preference/index.ts`

**ANTES (MAL ❌):**
```typescript
// Líneas 312-337
const preference = {
  items: [{
    title: `Reserva ${car.brand} ${car.model}`,
    quantity: 1,
    unit_price: totalAmount
  }],
  back_urls: {
    success: `${frontendUrl}/booking-success`,
    failure: `${frontendUrl}/booking-failure`
  }
  // NO HAY SPLIT ❌
};
```

**DESPUÉS (BIEN ✅):**
```typescript
// Obtener collector_id del dueño del auto
const { data: car } = await supabaseAdmin
  .from('cars')
  .select(`
    *,
    owner:user_profiles!owner_id(
      mercadopago_collector_id,
      mp_onboarding_completed
    )
  `)
  .eq('id', carId)
  .single();

if (!car.owner?.mp_onboarding_completed) {
  return new Response(
    JSON.stringify({ error: 'Owner must complete MP onboarding' }),
    { status: 400 }
  );
}

const collectorId = car.owner.mercadopago_collector_id;
const platformFee = totalAmount * 0.10; // 10%
const ownerAmount = totalAmount - platformFee;

const preference = {
  items: [{
    title: `Reserva ${car.brand} ${car.model}`,
    quantity: 1,
    unit_price: totalAmount
  }],
  back_urls: {
    success: `${frontendUrl}/booking-success`,
    failure: `${frontendUrl}/booking-failure`
  },

  // ✅ SPLIT PAYMENT
  marketplace: Deno.env.get('MERCADOPAGO_MARKETPLACE_ID'),
  marketplace_fee: platformFee,

  // ✅ DINERO VA AL LOCADOR
  collector_id: collectorId,

  // ✅ METADATA para tracking
  metadata: {
    booking_id: bookingId,
    car_id: carId,
    owner_id: car.owner_id,
    split_amount_owner: ownerAmount,
    split_amount_platform: platformFee
  },

  notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
};

console.log('Split payment preference:', {
  total: totalAmount,
  owner: ownerAmount,
  platform: platformFee,
  collector: collectorId
});

const mpClient = new MercadoPagoConfig({
  accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
});
const preferenceClient = new Preference(mpClient);

const response = await preferenceClient.create({ body: preference });
```

---

### Paso 4: Webhook para Confirmar Splits

**Archivo:** `supabase/functions/mercadopago-webhook/index.ts`

**Agregar validación de split:**

```typescript
async function handlePaymentNotification(paymentId: string) {
  // ... código existente ...

  // ✅ Verificar que el split se ejecutó
  const mpClient = new MercadoPagoConfig({
    accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
  });
  const paymentClient = new Payment(mpClient);

  const payment = await paymentClient.get({ id: paymentId });

  // Validar split
  if (payment.collector_id !== expectedCollectorId) {
    console.error('Split payment error: wrong collector', {
      expected: expectedCollectorId,
      received: payment.collector_id
    });

    // Marcar para revisión manual
    await supabaseAdmin
      .from('payment_issues')
      .insert({
        booking_id: bookingId,
        payment_id: paymentId,
        issue_type: 'split_collector_mismatch',
        details: { expected: expectedCollectorId, received: payment.collector_id }
      });
  }

  // Validar monto del split
  const platformFee = payment.transaction_details?.total_paid_amount! * 0.10;
  const ownerAmount = payment.transaction_details?.total_paid_amount! - platformFee;

  console.log('Split validated:', {
    total: payment.transaction_details?.total_paid_amount,
    owner: ownerAmount,
    platform: platformFee
  });

  // Actualizar booking con info de split
  await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'completed',
      payment_split_owner: ownerAmount,
      payment_split_platform: platformFee,
      payment_split_validated_at: new Date().toISOString()
    })
    .eq('id', bookingId);
}
```

---

### Paso 5: Tabla para Tracking de Splits

**Migración:** `supabase/migrations/[timestamp]_add_payment_splits.sql`

```sql
-- Tabla para tracking de splits
CREATE TABLE payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  payment_id VARCHAR(255) NOT NULL,

  -- Montos
  total_amount DECIMAL(10,2) NOT NULL,
  owner_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL,

  -- IDs de MercadoPago
  collector_id VARCHAR(255) NOT NULL,
  marketplace_id VARCHAR(255),

  -- Estado
  status VARCHAR(50) DEFAULT 'pending',
  validated_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_payment_splits_booking ON payment_splits(booking_id);
CREATE INDEX idx_payment_splits_payment ON payment_splits(payment_id);
CREATE INDEX idx_payment_splits_status ON payment_splits(status);

-- Trigger para updated_at
CREATE TRIGGER update_payment_splits_updated_at
BEFORE UPDATE ON payment_splits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla para issues
CREATE TABLE payment_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  payment_id VARCHAR(255),

  issue_type VARCHAR(100) NOT NULL,
  details JSONB,

  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_issues_unresolved
ON payment_issues(booking_id)
WHERE resolved = FALSE;
```

---

### Paso 6: Agregar Columnas a Bookings

```sql
-- Agregar tracking de splits a bookings
ALTER TABLE bookings
ADD COLUMN payment_split_owner DECIMAL(10,2),
ADD COLUMN payment_split_platform DECIMAL(10,2),
ADD COLUMN payment_split_validated_at TIMESTAMPTZ;
```

---

### Paso 7: Script de Validación de Splits

**Crear:** `scripts/validate-splits.sh`

```bash
#!/bin/bash

echo "🔍 Validando splits de pagos..."

# Buscar bookings pagados sin split validado
psql "$DATABASE_URL" << 'SQL'
SELECT
  b.id,
  b.total_price,
  b.payment_status,
  b.payment_split_validated_at,
  c.owner_mp_collector_id,
  up.email as owner_email
FROM bookings b
JOIN cars c ON b.car_id = c.id
JOIN user_profiles up ON c.owner_id = up.user_id
WHERE b.payment_status = 'completed'
  AND b.payment_split_validated_at IS NULL
ORDER BY b.created_at DESC
LIMIT 10;
SQL

echo ""
echo "⚠️  Bookings sin split validado encontrados arriba"
```

---

### Paso 8: Dashboard para Monitoreo de Splits

**Crear vista en Supabase:**

```sql
-- Vista para dashboard de splits
CREATE VIEW payment_splits_dashboard AS
SELECT
  DATE(ps.created_at) as date,
  COUNT(*) as total_splits,
  COUNT(*) FILTER (WHERE ps.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE ps.status = 'pending') as pending,
  COUNT(*) FILTER (WHERE ps.status = 'failed') as failed,
  SUM(ps.total_amount) as total_amount,
  SUM(ps.owner_amount) as total_to_owners,
  SUM(ps.platform_fee) as total_platform_fees
FROM payment_splits ps
GROUP BY DATE(ps.created_at)
ORDER BY date DESC;
```

---

### Paso 9: Rollback en Caso de Error

**Edge function:** `supabase/functions/mercadopago-refund/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { MercadoPagoConfig, Refund } from 'mercadopago';

serve(async (req) => {
  const { paymentId, reason } = await req.json();

  const mpClient = new MercadoPagoConfig({
    accessToken: Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
  });
  const refundClient = new Refund(mpClient);

  try {
    // Crear refund
    const refund = await refundClient.create({
      body: { payment_id: paymentId }
    });

    console.log('Refund created:', refund.id);

    // Actualizar booking
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_id: refund.id,
        refund_reason: reason
      })
      .eq('payment_id', paymentId);

    return new Response(
      JSON.stringify({ success: true, refund_id: refund.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Refund error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

---

### Paso 10: Tests del Flujo Completo

**Crear:** `apps/web/src/app/features/bookings/__tests__/split-payment.spec.ts`

```typescript
describe('Split Payment Flow', () => {
  it('should not allow publishing car without MP onboarding', async () => {
    // Mock user without MP onboarding
    const result = await publishCar(carId);
    expect(result.error).toContain('complete MP onboarding');
  });

  it('should create preference with split', async () => {
    const preference = await createBookingPreference({
      carId: 'test-car',
      totalAmount: 1000
    });

    expect(preference.marketplace_fee).toBe(100); // 10%
    expect(preference.collector_id).toBeDefined();
  });

  it('should validate split in webhook', async () => {
    const webhook = await handleMPWebhook({
      type: 'payment',
      data: { id: 'test-payment' }
    });

    expect(webhook.split_validated).toBe(true);
  });
});
```

---

## 🧪 Testing y Validación

### Test en Sandbox de MercadoPago

```bash
# 1. Configurar credenciales de TEST
MERCADOPAGO_TEST_ACCESS_TOKEN=TEST-xxxxx

# 2. Crear preference de test
curl -X POST "http://localhost:54321/functions/v1/mercadopago-create-booking-preference" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "test-123",
    "carId": "test-car",
    "totalAmount": 1000
  }'

# 3. Usar tarjeta de test
# Tarjeta: 5031 7557 3453 0604
# CVV: 123
# Fecha: 11/25

# 4. Verificar split en MP dashboard
# https://www.mercadopago.com.ar/developers/panel/credentials/test
```

---

## 🚨 Troubleshooting

### Problema 1: Collector ID inválido

**Error:** `Invalid collector_id`

**Solución:**
```sql
-- Verificar collector IDs
SELECT
  up.email,
  up.mercadopago_collector_id,
  up.mp_onboarding_completed
FROM user_profiles up
WHERE mp_onboarding_completed = TRUE
  AND (mercadopago_collector_id IS NULL
       OR mercadopago_collector_id = '');
```

### Problema 2: Split no se ejecuta

**Error:** Dinero va 100% a plataforma

**Solución:**
```typescript
// Verificar en logs de edge function
console.log('Preference body:', JSON.stringify(preference, null, 2));

// Verificar respuesta de MP
console.log('MP response:', JSON.stringify(response, null, 2));
```

### Problema 3: Webhook no confirma split

**Solución:**
```bash
# Ver logs de webhook
supabase functions logs mercadopago-webhook --tail

# Verificar notificationURL está configurada
# En MP dashboard → Webhooks
```

---

## ✅ Checklist de Completitud

- [ ] Validación de onboarding MP antes de activar auto
- [ ] Migración DB con owner_mp_collector_id
- [ ] Marketplace configurado en MP dashboard
- [ ] Split implementado en preference creation
- [ ] Webhook validando splits
- [ ] Tabla payment_splits creada
- [ ] Columnas agregadas a bookings
- [ ] Script de validación funciona
- [ ] Dashboard de monitoreo creado
- [ ] Refund edge function implementada
- [ ] Tests E2E pasando
- [ ] Test en sandbox exitoso
- [ ] Documentación actualizada

---

## 📚 Referencias

- [MP Split Payments](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/split-payments)
- [MP Marketplace](https://www.mercadopago.com.ar/developers/es/docs/marketplace/checkout-pro/introduction)
- [MP Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)

---

**Estimación:** 5-7 días
**Prioridad:** 🔴 P0
**Risk:** Crítico - modelo de negocio
