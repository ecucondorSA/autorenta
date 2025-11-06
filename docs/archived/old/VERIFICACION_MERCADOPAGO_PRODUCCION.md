# 🔍 Verificación de Configuración MercadoPago - Producción

**Fecha**: 28 de Octubre 2025
**Scope**: Flujo completo de pagos MercadoPago en AutoRenta

---

## ✅ RESUMEN EJECUTIVO

| Categoría | Estado | Detalles |
|-----------|--------|----------|
| 1. Secretos configurados | ✅ PARCIAL | Falta `MERCADOPAGO_ACCESS_TOKEN` en Worker |
| 2. Flujo frontend | ⚠️ REQUIERE CAMBIOS | Usa `provider: 'mock'` forzado |
| 3. Webhook external_reference | ✅ CORRECTO | Edge Function usa `booking_id` |
| 4. Polling frontend | ❌ NO IMPLEMENTADO | No existe polling de estado |
| 5. Tests E2E | ⚠️ INCOMPLETO | Tests simulados, no usan sandbox MP |

---

## 1️⃣ SECRETOS DE MERCADOPAGO

### ✅ Supabase Edge Functions

```bash
$ npx supabase secrets list
```

**Configurados**:
- ✅ `MERCADOPAGO_ACCESS_TOKEN` - Configurado
- ✅ `SUPABASE_URL` - Configurado
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurado
- ✅ `APP_BASE_URL` - Configurado

### ⚠️ Cloudflare Worker (payments_webhook)

```bash
$ wrangler secret list
```

**Configurados**:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Configurado
- ❌ `MERCADOPAGO_ACCESS_TOKEN` - **FALTA**

**Archivo**: `/home/edu/autorenta/functions/workers/payments_webhook/wrangler.toml`
```toml
[vars]
SUPABASE_URL = "https://obxvffplochgeiclibng.supabase.co"
```

### 🔧 ACCIÓN REQUERIDA #1: Agregar secret al Worker

```bash
cd /home/edu/autorenta/functions/workers/payments_webhook

wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Pegar el mismo token que está en Supabase
```

### ⚠️ Frontend Environment Variables

**Archivo**: `/home/edu/autorenta/apps/web/src/environments/environment.base.ts`

**Variables definidas**:
- ✅ `paymentsWebhookUrl` - Mapeada desde `NG_APP_PAYMENTS_WEBHOOK_URL`
- ✅ `mercadopagoPublicKey` - Mapeada desde `NG_APP_MERCADOPAGO_PUBLIC_KEY`
- ⚠️ `mercadopagoClientId` - Definida pero no usada
- ⚠️ `mercadopagoClientSecret` - **PELIGRO**: No debería estar en frontend

### 🔧 ACCIÓN REQUERIDA #2: Configurar NG_APP_PAYMENTS_WEBHOOK_URL

**Producción**:
```bash
NG_APP_PAYMENTS_WEBHOOK_URL=https://autorenta-payments-webhook.workers.dev/webhooks/payments
```

**Deploy a Cloudflare Pages**:
```bash
# En Cloudflare Pages Dashboard > Settings > Environment Variables
NG_APP_PAYMENTS_WEBHOOK_URL = https://autorenta-payments-webhook.workers.dev/webhooks/payments
```

---

## 2️⃣ FLUJO DE PAGO EN FRONTEND

### 🔴 PROBLEMA CRÍTICO: provider: 'mock' forzado

**Archivo**: `/home/edu/autorenta/apps/web/src/app/core/services/payments.service.ts`

**Línea 76**:
```typescript
async markAsPaid(intentId: string): Promise<void> {
  const workerUrl = environment.paymentsWebhookUrl;
  if (!workerUrl) {
    throw new Error('paymentsWebhookUrl no configurado');
  }
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'mock',  // ❌ FORZADO A MOCK
      intent_id: intentId,
      status: 'approved'
    }),
  });
}
```

**Línea 107**:
```typescript
async triggerMockPayment(bookingId: string, status: 'approved' | 'rejected'): Promise<void> {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'mock',  // ❌ FORZADO A MOCK
      booking_id: bookingId,
      status
    }),
  });
}
```

### 🔧 ACCIÓN REQUERIDA #3: Eliminar métodos mock en producción

**Opción A - Deshabilitar métodos mock** (Recomendado para producción):

```typescript
async markAsPaid(intentId: string): Promise<void> {
  throw new Error('markAsPaid() deprecado - usar flujo MercadoPago real');
}

async triggerMockPayment(bookingId: string, status: 'approved' | 'rejected'): Promise<void> {
  if (environment.production) {
    throw new Error('Mock payments no disponibles en producción');
  }
  // ... código mock solo en dev
}
```

**Opción B - Separar claramente mock vs real**:

```typescript
async markAsPaidMock(intentId: string): Promise<void> {
  if (environment.production) {
    throw new Error('Mock payments solo en desarrollo');
  }
  // ... código mock
}

// Agregar método para verificar estado (no forzar pago)
async getPaymentIntentStatus(intentId: string): Promise<PaymentIntent | null> {
  return this.getStatus(intentId);
}
```

### ✅ Flujo MercadoPago Real Implementado

**Archivo**: `/home/edu/autorenta/apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts`

**Línea 45-96**: Gateway correcto para crear preferencia
```typescript
createBookingPreference(bookingId: string): Observable<MercadoPagoPreferenceResponse> {
  // ✅ Llama a edge function correcta
  // ✅ Usa autenticación JWT
  // ✅ Retorna init_point para redirección
}
```

**Usado en**:
- `/home/edu/autorenta/apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`
- `/home/edu/autorenta/apps/web/src/app/features/bookings/checkout/services/checkout-payment.service.ts`

---

## 3️⃣ WEBHOOK Y EXTERNAL_REFERENCE

### ✅ Edge Function Configura external_reference Correctamente

**Archivo**: `/home/edu/autorenta/supabase/functions/mercadopago-create-booking-preference/index.ts`

**Línea 367**:
```typescript
const preference = {
  // ... otros campos
  external_reference: booking_id,  // ✅ CORRECTO
  // ...
}
```

### ✅ Worker Extrae booking_id de external_reference

**Archivo**: `/home/edu/autorenta/functions/workers/payments_webhook/src/index.ts`

**Línea 341**:
```typescript
const bookingId =
  paymentDetail.external_reference || paymentDetail.metadata?.booking_id;
```

**Línea 346**: Log para debugging
```typescript
console.error('Cannot resolve booking ID from payment', {
  paymentId,
  external_reference: paymentDetail.external_reference,
  metadata: paymentDetail.metadata,
});
```

### ✅ Normalización de Estados MP → DB

**Línea 84-101**: Mapeo de estados correcto
```typescript
const normalizeMPStatus = (status: string): { payment: string; booking: string } | null => {
  switch (status) {
    case 'approved':
      return { payment: 'completed', booking: 'confirmed' };
    case 'rejected':
    case 'cancelled':
      return { payment: 'failed', booking: 'cancelled' };
    case 'pending':
    case 'in_process':
      return { payment: 'pending', booking: 'pending' };
    case 'refunded':
    case 'charged_back':
      return { payment: 'refunded', booking: 'cancelled' };
    default:
      console.warn('Unknown MP status:', status);
      return null;
  }
};
```

---

## 4️⃣ POLLING DE ESTADO EN FRONTEND

### ❌ NO IMPLEMENTADO

**Archivos revisados**:
- ✅ `booking-success.page.ts` - Solo carga booking una vez
- ❌ No hay `setInterval` o polling de `payment_intent` status
- ❌ No hay "pantalla de espera" mientras webhook procesa

### 🔧 ACCIÓN REQUERIDA #4: Implementar Polling

**Ubicación sugerida**: `booking-success.page.ts`

**Implementación recomendada**:

```typescript
// booking-success.page.ts
export class BookingSuccessPage implements OnInit, OnDestroy {
  private pollingInterval?: number;
  private readonly MAX_POLL_ATTEMPTS = 40; // 40 * 3s = 2 min
  private pollAttempts = 0;

  readonly paymentStatus = signal<'pending' | 'completed' | 'failed' | 'timeout'>('pending');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
      return;
    }

    this.bookingId.set(id);
    this.loadBooking(id);

    // Iniciar polling solo si viene de MP (query param)
    const fromMP = this.route.snapshot.queryParamMap.get('from_mp');
    if (fromMP === 'true') {
      this.startPolling(id);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(bookingId: string): void {
    console.log('Starting payment status polling...');

    this.pollingInterval = window.setInterval(async () => {
      this.pollAttempts++;

      try {
        const booking = await this.bookingsService.getBookingById(bookingId);

        if (!booking) {
          throw new Error('Booking not found');
        }

        // Actualizar UI
        this.booking.set(booking);

        // Check si el pago se completó
        if (booking.status === 'confirmed') {
          this.paymentStatus.set('completed');
          this.stopPolling();
          return;
        }

        if (booking.status === 'cancelled') {
          this.paymentStatus.set('failed');
          this.stopPolling();
          return;
        }

        // Timeout después de 2 minutos
        if (this.pollAttempts >= this.MAX_POLL_ATTEMPTS) {
          console.warn('Payment polling timeout');
          this.paymentStatus.set('timeout');
          this.stopPolling();
        }

      } catch (error) {
        console.error('Error polling payment status:', error);
        // No detenemos el polling por un error aislado
      }
    }, 3000); // Poll cada 3 segundos
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }
}
```

**HTML Template**:

```html
<!-- booking-success.page.html -->
<ion-content>
  @if (paymentStatus() === 'pending') {
    <div class="payment-processing">
      <ion-spinner name="crescent"></ion-spinner>
      <h2>Verificando tu pago...</h2>
      <p>Esto puede tomar unos segundos</p>
    </div>
  }

  @if (paymentStatus() === 'completed') {
    <div class="payment-success">
      <ion-icon name="checkmark-circle" color="success"></ion-icon>
      <h2>¡Tu reserva está confirmada!</h2>
      <!-- Detalles de booking -->
    </div>
  }

  @if (paymentStatus() === 'timeout') {
    <div class="payment-timeout">
      <ion-icon name="time-outline" color="warning"></ion-icon>
      <h2>Estamos procesando tu pago</h2>
      <p>Te notificaremos por email cuando se confirme</p>
      <ion-button routerLink="/bookings">Ver mis reservas</ion-button>
    </div>
  }
</ion-content>
```

---

## 5️⃣ TESTS E2E

### ⚠️ Tests Simulan Flujo, No Usan Sandbox Real

**Archivo**: `/home/edu/autorenta/tests/renter/booking/payment-card.spec.ts`

**Línea 78**:
```typescript
// Simular pago exitoso en MercadoPago
await simulateMercadoPagoCallback(page, 'approved');
```

**Problema**: Función `simulateMercadoPagoCallback` no está implementada.

### 🔧 ACCIÓN REQUERIDA #5: Implementar Tests con Sandbox

**Opción A - Mock del callback**:

```typescript
async function simulateMercadoPagoCallback(
  page: Page,
  status: 'approved' | 'rejected'
): Promise<void> {
  // Obtener payment_id del URL de MP
  const mpUrl = page.url();
  const paymentId = new URL(mpUrl).searchParams.get('payment_id');

  if (!paymentId) {
    throw new Error('No payment_id in MP URL');
  }

  // Llamar directamente al webhook con datos mock
  const webhookUrl = 'http://localhost:8787/webhooks/payments';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'payment.updated',
      data: { id: paymentId },
      type: 'payment'
    })
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  // Esperar un momento para que el webhook procese
  await page.waitForTimeout(2000);

  // Navegar manualmente a success page
  // En producción, MP redirige automáticamente
  const bookingId = await getBookingIdFromMP(page);
  await page.goto(`http://localhost:4200/bookings/success/${bookingId}?from_mp=true`);
}
```

**Opción B - Usar Sandbox Real de MercadoPago**:

```typescript
test('Debe completar pago en sandbox de MercadoPago', async ({ page }) => {
  // ... setup

  // Redirige a MP
  await page.waitForURL(/mercadopago\.com|mpago\.la/);

  // Completar formulario de MP con tarjeta de test
  await page.fill('[data-testid="card-number"]', '5031 7557 3453 0604'); // Mastercard test
  await page.fill('[data-testid="card-expiration"]', '11/25');
  await page.fill('[data-testid="card-cvv"]', '123');
  await page.fill('[data-testid="card-holder"]', 'APRO'); // APRO = approved

  // Submit
  await page.click('[data-testid="submit-button"]');

  // MP redirige automáticamente a success_url
  await page.waitForURL(/\/bookings\/success\/.+/);

  // Polling debería detectar el pago
  await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible({ timeout: 10000 });
});
```

**Variables de entorno para tests**:

```bash
# .env.test
NG_APP_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxx
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx
```

---

## 📊 CHECKLIST DE IMPLEMENTACIÓN

### ⚠️ Prioridad Alta (Bloqueantes)

- [ ] **#1**: Agregar `MERCADOPAGO_ACCESS_TOKEN` al Worker
  ```bash
  cd functions/workers/payments_webhook
  wrangler secret put MERCADOPAGO_ACCESS_TOKEN
  ```

- [ ] **#2**: Configurar `NG_APP_PAYMENTS_WEBHOOK_URL` en producción
  ```bash
  # Cloudflare Pages Dashboard
  NG_APP_PAYMENTS_WEBHOOK_URL = https://autorenta-payments-webhook.workers.dev/webhooks/payments
  ```

- [ ] **#3**: Eliminar/deshabilitar métodos mock en `PaymentsService`
  - Deprecar `markAsPaid()` en producción
  - Separar `triggerMockPayment()` solo para QA

- [ ] **#4**: Implementar polling en `booking-success.page.ts`
  - Agregar `setInterval` cada 3 segundos
  - Max 40 intentos (2 minutos)
  - UI para estados: pending, completed, failed, timeout

### ✅ Prioridad Media (Mejoras)

- [ ] **#5**: Tests E2E con sandbox de MercadoPago
  - Implementar `simulateMercadoPagoCallback()`
  - O usar tarjetas de test reales en sandbox

- [ ] **#6**: Endpoint GET `/payment-intents/:id/status`
  - Para polling más eficiente desde frontend
  - Evitar cargar booking completo cada 3s

- [ ] **#7**: Remover `mercadopagoClientSecret` del frontend
  - **SEGURIDAD**: Secretos no deben estar en código cliente
  - Mover a edge function si es necesario

### 🎯 Prioridad Baja (Nice to Have)

- [ ] **#8**: Retry logic en webhook
  - Si la actualización de booking falla, reintentar
  - Usar KV namespace para idempotencia (ya está configurado)

- [ ] **#9**: Notificaciones de estado
  - Email cuando pago se confirme
  - Push notification si está implementado

- [ ] **#10**: Monitoring y alerts
  - Cloudflare Analytics en Worker
  - Sentry para errores en webhook

---

## 🚀 COMANDOS RÁPIDOS

### Verificar configuración actual

```bash
# Secrets de Supabase
npx supabase secrets list

# Secrets del Worker
cd functions/workers/payments_webhook
wrangler secret list

# Ver wrangler.toml
cat wrangler.toml
```

### Agregar secretos faltantes

```bash
# Worker
cd functions/workers/payments_webhook
wrangler secret put MERCADOPAGO_ACCESS_TOKEN

# Edge Functions (si falta algo)
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-xxxxx"
```

### Deploy de cambios

```bash
# Worker
cd functions/workers/payments_webhook
npm run build
npm run deploy

# Edge Functions
npx supabase functions deploy mercadopago-create-booking-preference
npx supabase functions deploy mercadopago-webhook

# Frontend
cd apps/web
npm run build
npm run deploy:pages
```

### Tests E2E

```bash
# Con worker local
cd functions/workers/payments_webhook
npm run dev  # Puerto 8787

# En otra terminal
npm run test:e2e
npm run test:e2e:card   # Solo pago con tarjeta
```

---

## 📚 ARCHIVOS CLAVE

### Frontend
- `apps/web/src/app/core/services/payments.service.ts` - ⚠️ Requiere cambios
- `apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts` - ✅ OK
- `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts` - ⚠️ Agregar polling

### Backend
- `supabase/functions/mercadopago-create-booking-preference/index.ts` - ✅ OK (external_reference)
- `functions/workers/payments_webhook/src/index.ts` - ⚠️ Falta secret
- `functions/workers/payments_webhook/wrangler.toml` - ⚠️ Falta MERCADOPAGO_ACCESS_TOKEN

### Tests
- `tests/renter/booking/payment-card.spec.ts` - ⚠️ Función `simulateMercadoPagoCallback` no implementada
- `tests/renter/booking/success-page.spec.ts` - ⚠️ No valida polling

---

## 🎯 PRÓXIMOS PASOS

1. **Implementar cambios críticos** (#1-#4)
2. **Deploy a staging** y probar flujo completo
3. **Ejecutar tests E2E** en staging
4. **Deploy a producción** con monitoreo activo
5. **Verificar primer pago real** con tarjeta de test
6. **Implementar mejoras** (#5-#10) según prioridad

---

**Última actualización**: 28 de Octubre 2025
**Revisado por**: Claude Code 2.0.28
**Status**: ⚠️ Requiere cambios antes de producción
