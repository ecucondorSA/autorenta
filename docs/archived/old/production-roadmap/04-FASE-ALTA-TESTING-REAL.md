# 🧪 Fase 04: Testing Real con MercadoPago Sandbox

**Prioridad:** 🟠 ALTA  
**Duración estimada:** 5 días  
**Dependencias:** Fase 02 (Split Payment) + Fase 03 (Bugs) ✅  
**Bloqueante para:** Producción

---

## 📋 Índice

1. [Objetivo](#objetivo)
2. [Configuración de Sandbox](#configuración-de-sandbox)
3. [Escenarios de Testing](#escenarios-de-testing)
4. [Automatización](#automatización)
5. [Criterios de Éxito](#criterios-de-éxito)

---

## 🎯 Objetivo

Validar completamente la integración con MercadoPago usando **pagos reales en sandbox**, NO simulados.

**Diferencia clave:**
- ❌ **Simulado:** Mock de respuestas, datos inventados
- ✅ **Sandbox Real:** API real de MP, tarjetas de prueba, webhooks reales

**Meta:** 100% de confianza en el flujo de pagos y splits antes de producción.

---

## 🏗️ Configuración de Sandbox

### 1. Credenciales de Prueba

**Obtener Test Credentials:**
```bash
# Ya tienes:
MERCADOPAGO_TEST_ACCESS_TOKEN="TEST-xxxx..."
MERCADOPAGO_TEST_PUBLIC_KEY="TEST-xxxx..."
```

**Configurar en servicios:**
```bash
# GitHub Secrets
gh secret set MERCADOPAGO_TEST_ACCESS_TOKEN --body "TEST-xxxx..."
gh secret set MERCADOPAGO_TEST_PUBLIC_KEY --body "TEST-xxxx..."

# Supabase
supabase secrets set MERCADOPAGO_TEST_ACCESS_TOKEN="TEST-xxxx..."

# Cloudflare Worker
cd functions/workers/payments_webhook
echo "TEST-xxxx..." | wrangler secret put MERCADOPAGO_TEST_ACCESS_TOKEN
```

### 2. Cuentas de Prueba MercadoPago

**Crear Vendedor de Prueba (Locador):**
```bash
curl -X POST \
  'https://api.mercadopago.com/users/test_user' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-xxxx...' \
  -d '{
    "site_id": "MLA"
  }'
```

Respuesta:
```json
{
  "id": 123456789,
  "nickname": "TEST_USER_123456",
  "email": "test_user_123456@testuser.com",
  "password": "qatest1234",
  "site_id": "MLA"
}
```

**Crear Comprador de Prueba (Locatario):**
```bash
curl -X POST \
  'https://api.mercadopago.com/users/test_user' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TEST-xxxx...' \
  -d '{
    "site_id": "MLA"
  }'
```

### 3. Tarjetas de Prueba

**Tarjetas Válidas (Argentina):**

| Tarjeta | Número | CVV | Fecha |
|---------|--------|-----|-------|
| Visa | 4509 9535 6623 3704 | 123 | 11/25 |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 |
| Amex | 3711 803032 57522 | 1234 | 11/25 |

**Escenarios de Error:**

| Tipo | Tarjeta | Resultado |
|------|---------|-----------|
| Fondos insuficientes | 4013 5406 8274 6260 | `rejected` |
| Tarjeta inválida | 5031 4332 1540 6351 | `rejected` |
| Tarjeta expirada | 5031 7557 3453 0604 (01/20) | `rejected` |

### 4. Configurar Webhooks de Test

**URL de Webhook:**
```
https://autorenta-payments-webhook.workers.dev/webhooks/payments
```

**Configurar en MercadoPago:**
```bash
curl -X POST \
  'https://api.mercadopago.com/v1/webhooks' \
  -H 'Authorization: Bearer TEST-xxxx...' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://autorenta-payments-webhook.workers.dev/webhooks/payments",
    "events": [
      "payment.created",
      "payment.updated"
    ]
  }'
```

---

## 🧪 Escenarios de Testing

### Escenario 1: Pago Exitoso con Split Automático

**Objetivo:** Validar que el split se ejecuta correctamente.

**Setup:**
```typescript
// Datos de prueba
const booking = {
  carId: 'test-car-001',
  renterId: 'test-renter-001',
  ownerId: 'test-owner-001',
  totalAmount: 10000, // ARS 10,000
  dailyRate: 2000,
  numberOfDays: 5,
  platformFee: 1500, // 15%
  ownerAmount: 8500 // 85%
};

const ownerMPAccount = 'TEST_COLLECTOR_123456'; // Cuenta MP del locador
```

**Pasos:**
1. Usuario locatario inicia reserva
2. Se genera preference con split:
   ```json
   {
     "transaction_amount": 10000,
     "disbursements": [
       {
         "collector_id": "TEST_COLLECTOR_123456",
         "amount": 8500,
         "application_fee": 1500
       }
     ]
   }
   ```
3. Usuario paga con tarjeta de prueba Visa
4. Webhook notifica pago `approved`
5. Sistema procesa split automático

**Validaciones:**
```bash
# 1. Verificar pago en MP
curl -X GET \
  "https://api.mercadopago.com/v1/payments/${PAYMENT_ID}" \
  -H "Authorization: Bearer TEST-xxxx..."

# Esperado:
{
  "status": "approved",
  "transaction_amount": 10000,
  "marketplace_fee": 1500,
  "collector_id": "TEST_COLLECTOR_123456"
}

# 2. Verificar transacción en nuestra DB
psql $DATABASE_URL -c "
  SELECT 
    id, 
    type, 
    amount, 
    status, 
    mercadopago_payment_id
  FROM wallet_transactions
  WHERE booking_id = '${BOOKING_ID}'
"

# Esperado:
# - 1 transacción de depósito al locador: ARS 8,500
# - 1 transacción de platform_fee: ARS 1,500

# 3. Verificar balance de wallet del locador
psql $DATABASE_URL -c "
  SELECT * FROM wallet_get_balance('${OWNER_ID}'::uuid)
"

# Esperado: balance >= 8500
```

**Criterios de Éxito:**
- ✅ Pago aprobado en MP
- ✅ Split ejecutado (collector recibe 8500)
- ✅ Platform fee deducido (1500)
- ✅ Transacción registrada en wallet
- ✅ Balance de locador actualizado
- ✅ Booking cambia a `confirmed`

---

### Escenario 2: Pago Rechazado (Fondos Insuficientes)

**Setup:**
```typescript
// Usar tarjeta de fondos insuficientes
const testCard = {
  number: '4013540682746260',
  cvv: '123',
  expiry: '11/25'
};
```

**Pasos:**
1. Usuario inicia reserva
2. Intenta pagar con tarjeta sin fondos
3. MP rechaza el pago

**Validaciones:**
```bash
# Verificar estado del pago
curl -X GET \
  "https://api.mercadopago.com/v1/payments/${PAYMENT_ID}" \
  -H "Authorization: Bearer TEST-xxxx..."

# Esperado:
{
  "status": "rejected",
  "status_detail": "cc_rejected_insufficient_amount"
}

# Verificar que booking NO se confirmó
psql $DATABASE_URL -c "
  SELECT status FROM bookings WHERE id = '${BOOKING_ID}'
"

# Esperado: status = 'pending_payment'

# Verificar que NO hay transacción en wallet
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM wallet_transactions 
  WHERE booking_id = '${BOOKING_ID}'
"

# Esperado: 0
```

**Criterios de Éxito:**
- ✅ Pago rechazado por MP
- ✅ Booking queda en `pending_payment`
- ✅ No se crea transacción en wallet
- ✅ Usuario ve mensaje de error claro
- ✅ Puede reintentar pago

---

### Escenario 3: Pago Pendiente (Medio de Pago Offline)

**Setup:**
```typescript
// Crear preference con pago en efectivo
const preference = {
  items: [...],
  payment_methods: {
    excluded_payment_types: [
      { id: 'credit_card' },
      { id: 'debit_card' }
    ]
  }
};
```

**Pasos:**
1. Usuario selecciona "Pago en Rapipago/Pagofácil"
2. MP genera cupón de pago
3. Pago queda `pending`

**Validaciones:**
```bash
# Estado del pago
{
  "status": "pending",
  "status_detail": "pending_waiting_payment"
}

# Booking debe quedar en 'pending_payment'
# Cuando MP notifique pago aprobado, debe procesarse el split
```

**Criterios de Éxito:**
- ✅ Cupón se genera correctamente
- ✅ Booking queda en `pending_payment`
- ✅ Cuando se pague offline, webhook procesa split
- ✅ Sistema maneja correctamente delays de 24-48hs

---

### Escenario 4: Refund Completo

**Setup:**
```typescript
const approvedPayment = {
  id: 'PAYMENT_123',
  status: 'approved',
  transaction_amount: 10000
};
```

**Pasos:**
1. Admin o locador cancela booking
2. Sistema solicita refund a MP
3. MP procesa refund

**Código:**
```typescript
// apps/web/src/app/core/services/refund.service.ts

async processRefund(bookingId: string, reason: string): Promise<boolean> {
  // 1. Obtener booking
  const booking = await this.bookingService.getBookingById(bookingId);
  
  if (!booking.mercadopagoPaymentId) {
    throw new Error('No payment ID found');
  }
  
  // 2. Solicitar refund a MP
  const refundResponse = await this.http.post(
    `https://api.mercadopago.com/v1/payments/${booking.mercadopagoPaymentId}/refunds`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${this.mpToken}`
      }
    }
  ).toPromise();
  
  // 3. Actualizar booking
  await this.supabase
    .from('bookings')
    .update({
      status: 'refunded',
      refund_id: refundResponse.id,
      refund_processed_at: new Date().toISOString()
    })
    .eq('id', bookingId);
  
  // 4. Registrar transacción en wallet (negativa)
  await this.walletService.createTransaction({
    userId: booking.ownerId,
    type: 'refund',
    amount: -booking.totalAmount,
    bookingId: booking.id,
    mercadopagoRefundId: refundResponse.id
  });
  
  return true;
}
```

**Validaciones:**
```bash
# Verificar refund en MP
curl -X GET \
  "https://api.mercadopago.com/v1/payments/${PAYMENT_ID}/refunds" \
  -H "Authorization: Bearer TEST-xxxx..."

# Esperado:
[
  {
    "id": "REFUND_123",
    "payment_id": "PAYMENT_123",
    "amount": 10000,
    "status": "approved"
  }
]

# Verificar transacción negativa en wallet
psql $DATABASE_URL -c "
  SELECT * FROM wallet_transactions 
  WHERE booking_id = '${BOOKING_ID}' AND type = 'refund'
"

# Esperado: amount = -10000
```

**Criterios de Éxito:**
- ✅ Refund procesado en MP
- ✅ Dinero devuelto al comprador
- ✅ Transacción negativa en wallet del locador
- ✅ Booking marcado como `refunded`
- ✅ Email de confirmación enviado

---

### Escenario 5: Webhook Retry (Reintento Automático)

**Objetivo:** Validar que si webhook falla, MP lo reintenta.

**Simulación:**
```typescript
// Hacer que worker falle intencionalmente
// functions/workers/payments_webhook/src/index.ts

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Simular error en primeros intentos
    const attemptCount = request.headers.get('x-retry-count') || '0';
    
    if (parseInt(attemptCount) < 2) {
      return new Response('Temporary error', { status: 500 });
    }
    
    // Procesar normalmente en 3er intento
    return handleWebhook(request, env);
  }
}
```

**Validaciones:**
- ✅ MP reintenta webhook (3-5 veces)
- ✅ Worker procesa correctamente en retry
- ✅ No se duplican transacciones (idempotencia)
- ✅ Sistema maneja delays de reintentos

---

## 🤖 Automatización de Tests

### Suite de Tests E2E

```typescript
// tests/e2e/payment-flows.spec.ts

import { test, expect } from '@playwright/test';

test.describe('MercadoPago Real Sandbox Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login como test user
    await page.goto('http://localhost:4200/login');
    await page.fill('[name="email"]', 'test-renter@autorenta.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/home');
  });
  
  test('Complete booking flow with successful payment', async ({ page }) => {
    // 1. Seleccionar auto
    await page.goto('http://localhost:4200/cars');
    await page.click('.car-card:first-child');
    
    // 2. Seleccionar fechas
    await page.fill('[name="startDate"]', '2025-11-01');
    await page.fill('[name="endDate"]', '2025-11-05');
    await page.click('button:has-text("Reservar")');
    
    // 3. Completar checkout
    await page.waitForURL('**/checkout');
    await page.click('button:has-text("Continuar al pago")');
    
    // 4. Pagar en MercadoPago
    await page.waitForURL('**/mercadopago.com/**');
    
    // Fill card details (Visa test card)
    await page.fill('[data-checkout="cardNumber"]', '4509953566233704');
    await page.fill('[data-checkout="securityCode"]', '123');
    await page.fill('[data-checkout="cardExpirationMonth"]', '11');
    await page.fill('[data-checkout="cardExpirationYear"]', '25');
    await page.fill('[data-checkout="cardholderName"]', 'APRO TEST');
    await page.fill('[data-checkout="docNumber"]', '12345678');
    
    await page.click('[data-checkout="submit"]');
    
    // 5. Validar redirección a success
    await page.waitForURL('**/booking-success', { timeout: 60000 });
    
    // 6. Validar datos mostrados
    await expect(page.locator('h1')).toContainText('Reserva Confirmada');
    await expect(page.locator('.car-name')).not.toContainText('Vehículo'); // Debe mostrar nombre real
    
    // 7. Validar en backend
    const bookingId = new URL(page.url()).searchParams.get('bookingId');
    expect(bookingId).toBeTruthy();
    
    // Verificar en DB (vía API de test)
    const response = await page.request.get(`http://localhost:4200/api/test/booking/${bookingId}`);
    const booking = await response.json();
    
    expect(booking.status).toBe('confirmed');
    expect(booking.mercadopagoPaymentId).toBeTruthy();
    
    // Verificar transacción en wallet
    const walletResponse = await page.request.get(`http://localhost:4200/api/test/wallet-transaction/${bookingId}`);
    const transaction = await walletResponse.json();
    
    expect(transaction).toBeTruthy();
    expect(transaction.type).toBe('rental_payment');
    expect(transaction.status).toBe('completed');
  });
  
  test('Rejected payment - insufficient funds', async ({ page, context }) => {
    // Similar flow pero con tarjeta rechazada
    await page.fill('[data-checkout="cardNumber"]', '4013540682746260');
    // ...
    
    await expect(page.locator('.error-message')).toContainText('fondos insuficientes');
    
    // Verificar que booking sigue pending
    const bookingId = await page.locator('[data-booking-id]').textContent();
    const response = await page.request.get(`http://localhost:4200/api/test/booking/${bookingId}`);
    const booking = await response.json();
    
    expect(booking.status).toBe('pending_payment');
  });
  
  test('Payment webhook processing', async ({ page, request }) => {
    // 1. Crear pago manualmente via API de MP
    const paymentResponse = await request.post('https://api.mercadopago.com/v1/payments', {
      headers: {
        'Authorization': 'Bearer TEST-xxxx...',
        'Content-Type': 'application/json'
      },
      data: {
        transaction_amount: 10000,
        token: 'card_token_test',
        description: 'Test booking',
        external_reference: 'test-booking-123',
        disbursements: [{
          collector_id: 'TEST_COLLECTOR_123',
          amount: 8500,
          application_fee: 1500
        }]
      }
    });
    
    const payment = await paymentResponse.json();
    
    // 2. Simular webhook manualmente
    await request.post('http://localhost:8787/webhooks/payments', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        action: 'payment.updated',
        data: {
          id: payment.id
        }
      }
    });
    
    // 3. Esperar procesamiento
    await page.waitForTimeout(5000);
    
    // 4. Validar que booking se confirmó
    const dbCheck = await request.get(`http://localhost:4200/api/test/booking/test-booking-123`);
    const booking = await dbCheck.json();
    
    expect(booking.status).toBe('confirmed');
  });
});
```

### Script de Validación Automática

```bash
#!/bin/bash
# tests/scripts/validate-mp-sandbox.sh

set -e

echo "🧪 Validando integración MercadoPago Sandbox..."
echo ""

# Cargar variables de test
source .env.test

# 1. Verificar credenciales
echo "1️⃣  Verificando credenciales..."
MP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $MERCADOPAGO_TEST_ACCESS_TOKEN" \
  https://api.mercadopago.com/v1/payment_methods)

if [ "$MP_STATUS" != "200" ]; then
  echo "❌ Credenciales inválidas"
  exit 1
fi
echo "✅ Credenciales válidas"
echo ""

# 2. Crear pago de prueba
echo "2️⃣  Creando pago de prueba..."
PAYMENT_RESPONSE=$(curl -s -X POST \
  https://api.mercadopago.com/v1/payments \
  -H "Authorization: Bearer $MERCADOPAGO_TEST_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_amount": 100,
    "description": "Test payment",
    "payment_method_id": "visa",
    "payer": {
      "email": "test@test.com"
    },
    "token": "test_token",
    "external_reference": "test-ref-'$(date +%s)'"
  }')

PAYMENT_ID=$(echo $PAYMENT_RESPONSE | jq -r '.id')
echo "✅ Pago creado: $PAYMENT_ID"
echo ""

# 3. Verificar webhook recibido
echo "3️⃣  Verificando webhook..."
sleep 5

WEBHOOK_LOG=$(psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM webhook_logs 
  WHERE payment_id = '$PAYMENT_ID'
" -t)

if [ "$WEBHOOK_LOG" -gt 0 ]; then
  echo "✅ Webhook recibido y procesado"
else
  echo "⚠️  Webhook no recibido (verificar configuración)"
fi
echo ""

# 4. Test de split payment
echo "4️⃣  Testeando split payment..."
# ... código para crear booking con split

echo ""
echo "✅ Validación completa"
```

---

## ✅ Criterios de Éxito

### Fase 04 Completa Cuando:

1. **Todos los Escenarios Pasan**
   - ✅ Pago exitoso con split
   - ✅ Pago rechazado manejado correctamente
   - ✅ Pagos pendientes procesados
   - ✅ Refunds funcionan
   - ✅ Webhooks con retry funcionan

2. **Tests Automatizados**
   - ✅ Suite E2E completa
   - ✅ 100% de coverage en flujos de pago
   - ✅ Tests pasan consistentemente

3. **Documentación**
   - ✅ Manual de testing
   - ✅ Casos de prueba documentados
   - ✅ Troubleshooting guide

4. **Confianza en Producción**
   - ✅ 50+ pagos de prueba exitosos
   - ✅ Zero errores no manejados
   - ✅ Monitoreo funcionando

---

## 📊 Métricas

**Target:**
- Pagos exitosos: >95%
- Webhooks procesados: 100%
- Tiempo de confirmación: <3 min
- Splits correctos: 100%

---

## 🔄 Siguiente Fase

**→ Fase 05: Infraestructura y Deployments**

- Staging environment
- CI/CD pipelines
- Monitoring y alertas
- Backups automatizados

---

**Última actualización:** 2025-10-28  
**Estado:** 🟠 Pendiente de implementación
