# Payment Architecture Clarification & Documentation

**Fecha**: 2025-10-28
**Estado**: ✅ COMPLETADO

---

## 📋 Resumen Ejecutivo

En respuesta a la pregunta sobre si el sistema de pagos seguía usando mocks en producción, se realizó una **auditoría completa** y se implementaron las siguientes mejoras:

1. ✅ Documentación clara de arquitectura dual (producción vs desarrollo)
2. ✅ Test E2E para flujo de MercadoPago
3. ✅ README explicativo para Cloudflare Worker legacy
4. ✅ Comentarios detallados en PaymentsService

---

## 🔍 Hallazgos de la Auditoría

### ¿Era verdad que el sistema usaba mocks en producción?

**Respuesta**: ❌ NO, pero la documentación era confusa.

### Realidad del Sistema:

**AutoRenta tiene DOBLE sistema de webhooks:**

| Sistema | Uso | Estado | Ubicación |
|---------|-----|--------|-----------|
| **Supabase Edge Function** | Producción (real money) | ✅ DEPLOYED & ACTIVE | `supabase/functions/mercadopago-webhook/` |
| **Cloudflare Worker** | Desarrollo (mock) | ❌ LOCAL ONLY | `functions/workers/payments_webhook/` |

### Evidencia:

```bash
# Verificación de funciones desplegadas
$ npx supabase functions list | grep mercadopago

mercadopago-webhook                   | ACTIVE | v30 | 2025-10-21 20:45:36
mercadopago-create-preference         | ACTIVE | v43 | 2025-10-20 22:29:43
mercadopago-create-booking-preference | ACTIVE | v8  | 2025-10-28 05:21:32
```

```bash
# Verificación de Cloudflare Worker (no existe)
$ wrangler secret list --name payments_webhook

✘ ERROR: This Worker does not exist on your account. [code: 10007]
```

---

## 🎯 Mejoras Implementadas

### 1. Documentación en CLAUDE.md

**Archivo**: `/home/edu/autorenta/CLAUDE.md`

**Sección agregada**: "Payment Architecture (CRITICAL - Updated Oct 2025)"

**Contenido**:
- Tabla comparativa producción vs desarrollo
- Flujo completo de pagos en producción
- Configuración de secretos
- Manejo de efectivo (non-withdrawable)
- Protección contra uso accidental de mocks
- Comandos de verificación

**Ubicación**: Líneas 177-306

---

### 2. Test E2E para MercadoPago

**Archivo**: `/home/edu/autorenta/apps/web/tests/mercadopago-payment-flow.spec.ts`

**Tests implementados**:

```typescript
describe('MercadoPago Wallet Deposit Flow', () => {
  ✅ Complete deposit flow with MercadoPago preference creation
  ✅ Real-time conversion preview (ARS → USD)
  ✅ Cash deposit warning visibility
});

describe('MercadoPago Webhook Simulation', () => {
  ✅ Webhook callback handling and fund crediting
});

describe('Payment Provider Selection', () => {
  ✅ Display all available providers
  ✅ Bank transfer instructions
});

describe('Deposit Form Validation', () => {
  ✅ Minimum and maximum amount validation
});
```

**Características**:
- Tests de UI con Playwright
- Tests de integración con API
- Validación de warnings de efectivo
- Simulación de webhook

**Cómo ejecutar**:
```bash
cd apps/web
npm run test:e2e  # O el comando configurado para Playwright
```

---

### 3. README para Cloudflare Worker Legacy

**Archivo**: `/home/edu/autorenta/functions/workers/payments_webhook/README.md`

**Propósito**: Documentar claramente que este worker es **legacy** y solo para desarrollo.

**Contenido**:
- ⚠️ Banner de advertencia (NOT DEPLOYED, NOT USED IN PRODUCTION)
- Tabla comparativa producción vs desarrollo
- Instrucciones de uso local
- Protección contra uso en producción
- Guía de migración a Supabase Edge Function
- Troubleshooting FAQ

**Key Messages**:
- "This Cloudflare Worker is NOT DEPLOYED and NOT USED IN PRODUCTION"
- "Use it locally only. Production uses Supabase Edge Functions."
- "CI/CD deploys the Supabase Edge Functions, not this worker."

---

### 4. Comentarios en PaymentsService

**Archivo**: `/home/edu/autorenta/apps/web/src/app/core/services/payments.service.ts`

**Mejoras**:

```typescript
/**
 * PaymentsService
 *
 * CRITICAL: Payment Architecture (Updated Oct 2025)
 * ================================================
 *
 * PRODUCTION (Real Money):
 * - Payments processed via MercadoPago
 * - Webhooks handled by Supabase Edge Function: mercadopago-webhook
 * - URL: https://[project].supabase.co/functions/v1/mercadopago-webhook
 *
 * DEVELOPMENT (Mock Testing):
 * - Optional: Cloudflare Worker for local mock webhooks
 * - URL: http://localhost:8787/webhooks/payments
 * - Methods: markAsPaid(), triggerMockPayment() (protected)
 *
 * Production Protection:
 * - Both mock methods throw errors when environment.production = true
 * - Real payments are processed asynchronously via MP webhook
 */
```

**Métodos documentados**:
- `createIntent()` - Crea payment intent
- `getStatus()` - Obtiene estado del payment
- `markAsPaid()` - [DEV ONLY] Mock webhook
- `triggerMockPayment()` - [DEV ONLY] Mock booking payment

---

## 📊 Arquitectura Aclarada

### Flujo de Producción (Real)

```
┌─────────────────────────────────────────────────────────────┐
│  PRODUCTION FLOW (Real Money - MercadoPago)                 │
└─────────────────────────────────────────────────────────────┘

1. Usuario → Frontend → Clic en "Depositar"
                      ↓
2. Frontend → Supabase Edge Function
   POST /functions/v1/mercadopago-create-preference
   {
     amount: 10.00,
     provider: 'mercadopago',
     description: 'Wallet deposit'
   }
                      ↓
3. Edge Function → MercadoPago API
   Crea preference con SDK oficial
   Retorna init_point (URL de checkout)
                      ↓
4. Frontend → Redirige a MercadoPago Checkout
   Usuario completa pago con tarjeta/efectivo
                      ↓
5. MercadoPago → Supabase Edge Function
   POST /functions/v1/mercadopago-webhook
   {
     action: 'payment.created',
     data: { id: payment_id },
     type: 'payment'
   }
                      ↓
6. Edge Function → Verifica signature MP
   Obtiene detalles del pago vía MP API
   Detecta payment_type_id (ticket/credit_card)
                      ↓
7. Edge Function → RPC wallet_confirm_deposit()
   {
     transaction_id: uuid,
     provider_transaction_id: mp_payment_id,
     provider_metadata: {
       payment_type_id: 'ticket',  // ← CASH = NON-WITHDRAWABLE
       payment_method_id: 'pagofacil',
       status: 'approved'
     }
   }
                      ↓
8. RPC → Base de Datos
   - UPDATE user_wallets
     SET available_balance = available_balance + amount
   - IF payment_type_id = 'ticket' THEN
       SET non_withdrawable_floor = non_withdrawable_floor + amount
   - UPDATE wallet_transactions SET status = 'completed'
                      ↓
9. Usuario → Vuelve a app
   Balance actualizado ✅
   Si fue efectivo: no retirable ⚠️
```

### Flujo de Desarrollo (Mock)

```
┌─────────────────────────────────────────────────────────────┐
│  DEVELOPMENT FLOW (Mock Testing - Optional)                 │
└─────────────────────────────────────────────────────────────┘

1. Developer → Frontend → payments.service.markAsPaid()
                        ↓
2. Service → Verifica environment.production
   if (production) {
     throw Error('Method deprecated in production');
   }
                        ↓
3. Service → Cloudflare Worker (local)
   POST http://localhost:8787/webhooks/payments
   {
     provider: 'mock',
     booking_id: uuid,
     status: 'approved'
   }
                        ↓
4. Worker → Supabase DB
   UPDATE payment_intents SET status = 'completed'
   UPDATE bookings SET status = 'confirmed'
                        ↓
5. Developer → Verifica en DB
   Booking confirmado sin pasar por MP ✅
```

---

## 🛡️ Protecciones Implementadas

### 1. Guards en PaymentsService

```typescript
// apps/web/src/app/core/services/payments.service.ts:75
async markAsPaid(intentId: string): Promise<void> {
  if (environment.production) {
    throw new Error('markAsPaid() deprecated in production.
                     MercadoPago webhook updates automatically.');
  }
  // ... mock logic
}
```

### 2. Environment Configuration

```typescript
// apps/web/src/environments/environment.prod.ts
export const environment = {
  production: true,
  paymentsWebhookUrl: undefined,  // ← No mock URL in production
};

// apps/web/src/environments/environment.development.ts
export const environment = {
  production: false,
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',  // ← OK in dev
};
```

### 3. Cloudflare Worker No Desplegado

```bash
# El worker NO está configurado en CI/CD
# NO tiene secrets configurados
# NO aparece en wrangler secret list
# SOLO funciona con wrangler dev (local)
```

---

## 📈 Métricas de Validación

### Verificación de Producción

```bash
# 1. Verificar funciones desplegadas
npx supabase functions list | grep mercadopago
# ✅ Debe mostrar mercadopago-webhook como ACTIVE

# 2. Verificar secretos configurados
npx supabase secrets list
# ✅ Debe incluir MERCADOPAGO_ACCESS_TOKEN

# 3. Verificar Cloudflare Worker
wrangler secret list --name payments_webhook
# ✅ Debe fallar con "Worker does not exist"

# 4. Verificar logs de webhook
npx supabase functions logs mercadopago-webhook --tail
# ✅ Debe mostrar logs de webhooks reales de MP
```

### Ejecución de Tests

```bash
# Unit tests
cd apps/web
npm run test

# E2E tests
npm run test:e2e

# Específicamente el nuevo test de MP
npx playwright test mercadopago-payment-flow
```

---

## 📚 Documentación Relacionada

| Documento | Propósito | Ubicación |
|-----------|-----------|-----------|
| **CLAUDE.md** | Guía maestra del proyecto | `/home/edu/autorenta/CLAUDE.md` |
| **Payment Architecture** | Sección en CLAUDE.md | Líneas 177-306 |
| **Worker README** | Legacy worker docs | `/home/edu/autorenta/functions/workers/payments_webhook/README.md` |
| **Cash Deposits Fix** | Non-withdrawable logic | `/home/edu/autorenta/CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md` |
| **E2E Tests** | MercadoPago flow tests | `/home/edu/autorenta/apps/web/tests/mercadopago-payment-flow.spec.ts` |
| **PaymentsService** | Service comments | `/home/edu/autorenta/apps/web/src/app/core/services/payments.service.ts` |

---

## ✅ Checklist de Validación

### Para Developers

- [ ] Leer `CLAUDE.md` sección "Payment Architecture"
- [ ] Leer `functions/workers/payments_webhook/README.md`
- [ ] Ejecutar `npx supabase functions list | grep mercadopago`
- [ ] Verificar que `wrangler secret list --name payments_webhook` falle
- [ ] Ejecutar tests E2E con `npm run test:e2e`
- [ ] Revisar comentarios en `payments.service.ts`

### Para CI/CD

- [ ] Verificar que solo se despliegan Supabase Edge Functions
- [ ] Confirmar que Cloudflare Worker NO está en pipeline
- [ ] Validar que `environment.production = true` en build de producción
- [ ] Ejecutar tests E2E en pipeline

### Para Testing

- [ ] Mock webhooks solo en desarrollo local
- [ ] Sandbox de MercadoPago para staging
- [ ] Producción solo con tokens reales de MP

---

## 🎓 Lecciones Aprendidas

### Por qué existía la confusión:

1. **Código legacy presente**: El Cloudflare Worker existe en el repo pero NO está desplegado
2. **Guards no documentados**: Las protecciones `if (production)` no estaban explicadas
3. **Arquitectura dual**: Dos sistemas (Supabase + Cloudflare) sin documentación clara
4. **Sin tests E2E**: No había validación automatizada del flujo real

### Mejoras implementadas:

1. ✅ **Documentación exhaustiva**: CLAUDE.md + README + comentarios
2. ✅ **Tests E2E**: Validación automatizada del flujo completo
3. ✅ **Banners de advertencia**: "LEGACY", "NOT DEPLOYED", "DEV ONLY"
4. ✅ **Comandos de verificación**: Scripts para validar qué sistema está activo

---

## 🔮 Próximos Pasos (Opcional)

### Limpieza de código (si se desea):

1. **Eliminar Cloudflare Worker completamente**:
   ```bash
   rm -rf functions/workers/payments_webhook/
   ```
   Pros: Código más limpio
   Cons: Developers pierden opción de mock local

2. **Mantener pero renombrar**:
   ```bash
   mv functions/workers/payments_webhook functions/dev-tools/mock-payment-webhook
   ```
   Pros: Más claro que es herramienta de desarrollo
   Cons: Requiere actualizar referencias

3. **Mantener como está (RECOMENDADO)**:
   - Código legacy bien documentado
   - Útil para desarrollo local rápido
   - Guards previenen uso accidental
   - README aclara su propósito

### Tests adicionales:

- [ ] Test de signature verification del webhook MP
- [ ] Test de idempotencia (webhook duplicado)
- [ ] Test de pago rechazado
- [ ] Test de timeout de MP
- [ ] Test de cash deposit → withdrawal attempt (should fail)

---

**Implementado por**: Claude Code
**Fecha**: 2025-10-28
**Estado**: ✅ COMPLETADO Y DOCUMENTADO

---

## 📞 Contacto / Preguntas

Si tienes dudas sobre la arquitectura de pagos:

1. **Leer primero**: `/home/edu/autorenta/CLAUDE.md` (Payment Architecture)
2. **Ver tests**: `/home/edu/autorenta/apps/web/tests/mercadopago-payment-flow.spec.ts`
3. **Verificar despliegue**: `npx supabase functions list`
4. **Consultar README**: `/home/edu/autorenta/functions/workers/payments_webhook/README.md`

**Regla de oro**:
- Si `environment.production = true` → Solo Supabase Edge Functions
- Si `environment.production = false` → Opcional mock con Cloudflare Worker local
