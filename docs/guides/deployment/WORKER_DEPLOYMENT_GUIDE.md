# 🚀 WORKER DE PAGOS - GUÍA DE DEPLOYMENT

**Fecha**: 2025-10-28
**Worker**: `autorenta-payments-webhook`
**Versión**: 2.0 (con soporte para Mercado Pago real)

---

## 📋 RESUMEN DE CAMBIOS

### ✅ Funcionalidades Implementadas:

1. **Soporte Dual de Providers**
   - ✅ Mock (para desarrollo)
   - ✅ Mercado Pago (para producción)

2. **Handlers Separados**
   - `processMockWebhook()` - Procesa pagos mock
   - `processMercadoPagoWebhook()` - Procesa webhooks reales de MP

3. **Idempotencia**
   - Usa Cloudflare KV para evitar procesar el mismo webhook dos veces
   - Keys diferentes para mock y MP: `webhook:mock:...` y `webhook:mp:...`

4. **Normalización de Estados**
   - `normalizeMockStatus()` - approved/rejected → DB states
   - `normalizeMPStatus()` - Todos los estados de MP → DB states

5. **Logging Completo**
   - Logs detallados en cada paso
   - Errores específicos para debugging

---

## 🛠️ PREREQUISITOS

Antes de desplegar, asegúrate de tener:

1. **Wrangler CLI** instalado
   ```bash
   npm install -g wrangler
   # o
   pnpm add -g wrangler
   ```

2. **Cuenta de Cloudflare** con acceso a Workers

3. **Credenciales de Supabase**
   - URL del proyecto
   - Service Role Key (desde Dashboard → Settings → API)

4. **KV Namespace** ya creado (ver `wrangler.toml`)

---

## 📦 PASO 1: BUILD DEL WORKER

```bash
cd /home/edu/autorenta/functions/workers/payments_webhook

# Instalar dependencias
npm install

# Build TypeScript → JavaScript
npm run build

# Verificar que dist/index.js existe
ls -lah dist/
```

**Output esperado**:
```
dist/
├── index.js
└── index.js.map
```

---

## 🔐 PASO 2: CONFIGURAR SECRETOS

Los secretos se guardan de forma segura en Cloudflare y NO en el código:

```bash
# SUPABASE_URL
wrangler secret put SUPABASE_URL
# Cuando pregunte, ingresar: https://obxvffplochgeiclibng.supabase.co

# SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Cuando pregunte, ingresar el service role key desde Supabase Dashboard
```

**⚠️ IMPORTANTE**: El service role key es SECRETO y otorga acceso total a tu DB. Nunca lo compartas ni lo commitees.

---

## 🚀 PASO 3: DEPLOY A PRODUCCIÓN

```bash
# Deploy con wrangler
wrangler deploy

# Output esperado:
# ✨ Success! Uploaded 1 file
# 🌎 Published to https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev
```

**URL del Worker**:
```
https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments
```

---

## ✅ PASO 4: VERIFICAR DEPLOYMENT

### Test 1: Webhook Mock

```bash
# Enviar webhook mock de prueba
curl -X POST https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mock",
    "booking_id": "TEST-BOOKING-ID",
    "status": "approved"
  }'
```

**Respuesta esperada**:
```json
{
  "message": "Mock payment processed",
  "result": {
    "paymentStatus": "completed",
    "bookingStatus": "confirmed"
  }
}
```

### Test 2: Webhook Mercado Pago

```bash
# Simular webhook de MP
curl -X POST https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mercadopago",
    "action": "payment.created",
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

**Respuesta esperada** (si no existe payment_intent):
```json
{
  "message": "Payment intent not found"
}
```

**Respuesta esperada** (si existe payment_intent):
```json
{
  "message": "Mercado Pago payment processed",
  "result": {
    "paymentId": "123456789",
    "bookingId": "uuid-de-booking",
    "paymentStatus": "completed",
    "bookingStatus": "confirmed"
  }
}
```

---

## 📊 PASO 5: MONITOREO

### Ver Logs en Tiempo Real

```bash
# Tail logs del worker
wrangler tail

# Filtrar solo errores
wrangler tail --status error
```

### Dashboard de Cloudflare

1. Ir a https://dash.cloudflare.com
2. Workers & Pages → autorenta-payments-webhook
3. Ver métricas:
   - Requests por segundo
   - Errores
   - Latencia
   - Invocaciones exitosas

### Logs de Debugging

El worker loguea:
```
✅ Processing mock webhook for booking: BOOKING-ID
✅ Processing Mercado Pago webhook: { action, type, paymentId }
✅ MP payment processed successfully: { paymentId, bookingId, status }
⚠️  Payment intent not found for payment ID: 123456789
❌ Payments update failed: { error }
```

---

## 🔄 PASO 6: INTEGRAR CON MERCADO PAGO

### 6.1: Configurar Webhook en MP Dashboard

1. Ir a https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar tu aplicación
3. Ir a "Webhooks" o "Notificaciones IPN"
4. Agregar URL:
   ```
   https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments
   ```
5. Seleccionar eventos a recibir:
   - ✅ `payment.created`
   - ✅ `payment.updated`
   - ✅ `payment.approved`

### 6.2: Configurar Edge Function para Crear Pagos

Tu Edge Function de Mercado Pago debe incluir el `notification_url`:

```typescript
// apps/web/supabase/functions/mercadopago-create-booking-preference/index.ts
const preference = {
  items: [{ ... }],
  payer: { ... },
  back_urls: { ... },

  // ✅ AGREGAR ESTO:
  notification_url: 'https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments',

  metadata: {
    booking_id: bookingId,
    provider: 'mercadopago' // ← IMPORTANTE para el worker
  }
};
```

### 6.3: Verificar Flujo Completo

```
Usuario crea booking
    ↓
Edge function crea preference en MP
    ↓
Usuario paga en checkout de MP
    ↓
MP envía webhook a worker
    ↓
Worker busca payment_intent por provider_payment_id
    ↓
Worker actualiza payments, bookings, payment_intents
    ↓
✅ Booking confirmado automáticamente
```

---

## 🧪 TESTING COMPLETO

### Test 1: Mock End-to-End

```bash
# 1. Crear booking de prueba en Supabase
# 2. Enviar webhook mock
curl -X POST https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mock",
    "booking_id": "BOOKING-ID-REAL",
    "status": "approved"
  }'

# 3. Verificar en Supabase que:
#    - payments.status = 'completed'
#    - bookings.status = 'confirmed'
#    - payment_intents.status = 'completed'
```

### Test 2: Mercado Pago Sandbox

```bash
# 1. Crear payment en sandbox de MP
# 2. Obtener payment ID
# 3. Crear payment_intent en Supabase con ese ID
# 4. Simular webhook de MP

curl -X POST https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "mercadopago",
    "action": "payment.created",
    "type": "payment",
    "data": {
      "id": "PAYMENT-ID-DE-SANDBOX"
    }
  }'

# 5. Verificar actualización en Supabase
```

### Test 3: Idempotencia

```bash
# Enviar el mismo webhook 3 veces
for i in {1..3}; do
  curl -X POST https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments \
    -H "Content-Type: application/json" \
    -d '{
      "provider": "mock",
      "booking_id": "SAME-BOOKING-ID",
      "status": "approved"
    }'
  echo "\nRequest $i"
done

# Primera: "Mock payment processed"
# Segunda: "Already processed"
# Tercera: "Already processed"
```

---

## 🚨 TROUBLESHOOTING

### Error: "Supabase admin credentials are missing"

**Causa**: Secretos no configurados

**Solución**:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Error: "Payment intent not found"

**Causa**: No existe un payment_intent con ese provider_payment_id

**Solución**:
- Verificar que el Edge Function guardó el payment_intent
- Verificar que el payment ID en el webhook coincide con el de la DB
- Logs:
  ```sql
  SELECT * FROM payment_intents WHERE provider_payment_id = 'PAYMENT-ID';
  ```

### Error: "Payments update failed"

**Causa**: RLS policy bloqueando actualización

**Solución**:
- Verificar que el worker usa SERVICE_ROLE_KEY (bypasea RLS)
- Verificar que la key es correcta:
  ```bash
  wrangler secret list
  ```

### Webhook no llega desde Mercado Pago

**Causa**: URL mal configurada o worker caído

**Solución**:
1. Verificar que el worker está activo:
   ```bash
   curl https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments
   # Debe retornar 404 (GET no soportado)
   ```

2. Verificar configuración en MP Dashboard
3. Probar con webhook de prueba de MP

---

## 📈 MÉTRICAS DE ÉXITO

Después del deployment, monitorear:

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| **Uptime** | 99.9% | - |
| **Latencia p95** | <500ms | - |
| **Error rate** | <1% | - |
| **Webhooks procesados** | 100% | - |
| **Idempotencia** | 0 duplicados | - |

---

## 🔄 ROLLBACK

Si algo sale mal:

```bash
# Ver versiones anteriores
wrangler deployments list

# Rollback a versión anterior
wrangler rollback
```

---

## 📞 SIGUIENTES PASOS

### TODO: Mejoras de Seguridad

1. **Validación de Firma de MP**
   ```typescript
   // Verificar x-signature header
   const signature = request.headers.get('x-signature');
   const isValid = verifyMercadoPagoSignature(payload, signature, secret);
   if (!isValid) {
     return jsonResponse({ message: 'Invalid signature' }, { status: 401 });
   }
   ```

2. **Rate Limiting**
   - Usar Cloudflare Rate Limiting
   - Limitar requests por IP/minuto

3. **Alertas**
   - Configurar alerts en Cloudflare para:
     - Error rate > 5%
     - Latency > 1s
     - 500 errors

### TODO: Obtener Access Token Dinámico

Actualmente el worker asume `approved` para `payment.created`. En producción:

```typescript
// 1. Obtener owner de la booking
const { data: booking } = await supabase
  .from('bookings')
  .select('car:cars(owner_id)')
  .eq('id', bookingId)
  .single();

// 2. Obtener access token del owner
const { data: mpState } = await supabase
  .from('mp_onboarding_states')
  .select('access_token')
  .eq('user_id', booking.car.owner_id)
  .single();

// 3. Consultar API de MP
const paymentDetails = await getMercadoPagoPaymentDetails(
  paymentId,
  mpState.access_token
);

// 4. Usar el status real
const normalized = normalizeMPStatus(paymentDetails.status);
```

---

## ✅ CHECKLIST DE DEPLOYMENT

Antes de marcar como completo:

- [ ] Build exitoso (`npm run build`)
- [ ] Secretos configurados (`wrangler secret list`)
- [ ] Deploy exitoso (`wrangler deploy`)
- [ ] Test mock passing
- [ ] Test MP passing (si tienes sandbox)
- [ ] Logs sin errores (`wrangler tail`)
- [ ] URL agregada a MP Dashboard
- [ ] Environment.ts actualizado con URL del worker
- [ ] Documentación actualizada

---

**Documento generado por**: Claude Code
**Última actualización**: 2025-10-28
**Versión**: 2.0
**Worker URL**: https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments
