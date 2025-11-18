# 🔄 Operaciones MercadoPago - AutoRenta

**Última actualización:** 2025-11-16
**Estado:** ✅ Producción activa

---

## 📋 Flujos Operativos Detallados

### 1. Depósitos a Wallet

**Flujo completo:**
```
1. Usuario → WalletService.initiateDeposit({ amount, provider: 'mercadopago' })
   ↓
2. Se crea registro en wallet_transactions:
   - type: 'deposit'
   - status: 'pending'
   - provider: 'mercadopago'
   - amount: monto solicitado
   ↓
3. Frontend → mercadopago-create-preference Edge Function
   - Parámetros: transaction_id, amount, description
   ↓
4. Edge Function crea preferencia en MercadoPago:
   - currency_id: 'ARS'
   - external_reference: transaction_id
   - notification_url: mercadopago-webhook
   - payer: { email, first_name, last_name, phone, identification }
   ↓
5. Usuario redirigido a MercadoPago (init_point)
   ↓
6. Usuario completa pago (tarjeta, efectivo, etc.)
   ↓
7. MercadoPago → mercadopago-webhook (notificación IPN)
   - topic: 'payment'
   - id: payment_id
   ↓
8. Webhook valida HMAC y procesa:
   - Verifica estado del pago
   - Llama RPC wallet_confirm_deposit_admin()
   - Actualiza wallet_transactions (status: 'completed')
   - Acredita balance en user_wallets
   ↓
9. Balance disponible para usar en bookings
```

**Backup (Polling):**
- Cron `mercadopago-poll-pending-payments` ejecuta cada 3 minutos
- Consulta `/v1/payments/search` con `external_reference`
- Si encuentra pago aprobado y webhook no llegó, confirma manualmente
- Metadata: `provider_metadata.polled_at` permite auditoría

---

### 2. Pagos de Booking

**Flujo completo:**
```
1. Usuario → BookingService.requestBooking({ car_id, start_at, end_at })
   ↓
2. Se crea booking en DB:
   - status: 'pending'
   - total_amount: calculado (precio diario × días + delivery + depósito)
   - currency: 'ARS'
   ↓
3. Frontend → mercadopago-create-booking-preference Edge Function
   - Parámetros: booking_id, amount
   ↓
4. Edge Function:
   a. Obtiene datos del booking y car
   b. Obtiene datos del owner (vendedor)
   c. Determina si usar split payments:
      - shouldSplit = owner tiene mercadopago_collector_id
   d. Selecciona token:
      - Si shouldSplit && owner.mercadopago_access_token → usa token OAuth del owner
      - Si no → usa MP_ACCESS_TOKEN (marketplace)
   e. Crea preferencia con:
      - items: [{ id: booking_id, title, description, category_id: 'travel', picture_url }]
      - payer: { email, first_name, last_name, phone, identification }
      - marketplace: MP_MARKETPLACE_ID (si split)
      - marketplace_fee: platformFee (15% si split)
      - collector_id: owner.mercadopago_collector_id (si split)
   ↓
5. Usuario redirigido a MercadoPago
   ↓
6. Usuario completa pago
   ↓
7. MercadoPago → mercadopago-webhook
   ↓
8. Webhook procesa:
   - Actualiza booking (status: 'confirmed')
   - Guarda mercadopago_payment_id
   - Si split: registra split en metadata
   ↓
9. Booking confirmado, auto disponible
```

**Split Payments:**
- **Plataforma recibe:** 15% (marketplace_fee)
- **Owner recibe:** 85% (resto del pago)
- **Token usado:** OAuth token del owner (si está disponible)
- **Fallback:** Token del marketplace si owner no tiene OAuth

---

### 3. Preautorizaciones (Card Holds)

**Flujo completo:**
```
1. PaymentAuthorizationService.authorizePayment({ booking_id, amount })
   ↓
2. RPC create_payment_authorization():
   - Crea registro en payment_authorizations
   - status: 'pending'
   ↓
3. Edge Function mp-create-preauth:
   - POST /v1/payments con capture=false
   - amount: monto a preautorizar
   - payment_method_id: 'credit_card'
   ↓
4. MercadoPago reserva fondos (no captura)
   ↓
5. Webhook marca estado:
   - authorized: fondos reservados
   - approved: pago aprobado (pero no capturado)
   ↓
6. Al confirmar booking:
   - mp-capture-preauth → POST /v1/payments/{id}?capture=true
   - Fondos se capturan realmente
   - Ledger wallet_ledger registra entrada (double-entry)
   ↓
7. Si booking se cancela:
   - mp-cancel-preauth → libera fondos reservados
   - payment_authorizations.status = 'cancelled'
```

**Ventajas:**
- Reserva fondos sin capturar inmediatamente
- Permite cancelar sin costo
- Expira en 7 días si no se captura

---

### 4. OAuth (Marketplace Onboarding)

**Flujo completo:**
```
1. Owner → MarketplaceOnboardingService.startOnboarding()
   ↓
2. Se genera state único y se guarda en mp_onboarding_states
   ↓
3. Redirección a MercadoPago OAuth:
   - URL: https://auth.mercadopago.com.ar/authorization
   - client_id: MP_APPLICATION_ID
   - redirect_uri: callback URL
   - state: state único
   ↓
4. Owner autoriza aplicación en MercadoPago
   ↓
5. Callback → handleCallback({ code, state })
   ↓
6. exchangeCodeForToken(code):
   - POST a MercadoPago API
   - Recibe: access_token, refresh_token, expires_in, user_id
   ↓
7. Encriptación de tokens:
   - EncryptionService.encrypt() con AES-256-GCM
   - Key: NG_APP_ENCRYPTION_KEY (variable de entorno)
   ↓
8. Guardado en profiles:
   - mercadopago_collector_id: user_id
   - mercadopago_access_token_encrypted: token encriptado
   - mercadopago_refresh_token_encrypted: refresh token encriptado
   - mercadopago_connected: true
   - marketplace_approved: true
   ↓
9. Owner puede recibir pagos con split
```

**Seguridad:**
- Tokens encriptados con AES-256-GCM antes de almacenar
- EncryptionService usa Web Crypto API (nativo, sin dependencias)
- Key derivation con PBKDF2 (100,000 iteraciones)

---

## 🔍 Monitoreo y Debugging

### Logs de Edge Functions

```bash
# Ver logs de webhook (tiempo real)
npx supabase functions logs mercadopago-webhook --tail

# Ver logs de create-preference
npx supabase functions logs mercadopago-create-preference

# Ver logs de booking preference
npx supabase functions logs mercadopago-create-booking-preference

# Ver logs de polling
npx supabase functions logs mercadopago-poll-pending-payments
```

### Queries SQL Útiles

**Depósitos pendientes:**
```sql
SELECT id, amount, status, provider_transaction_id, created_at
FROM wallet_transactions
WHERE type = 'deposit' AND status = 'pending'
ORDER BY created_at DESC;
```

**Bookings con pagos:**
```sql
SELECT id, car_id, renter_id, total_amount, status,
       mercadopago_preference_id, mercadopago_payment_id, created_at
FROM bookings
WHERE mercadopago_preference_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Preautorizaciones activas:**
```sql
SELECT id, booking_id, amount, status, provider_payment_id, expires_at
FROM payment_authorizations
WHERE status IN ('authorized', 'approved')
ORDER BY created_at DESC;
```

**Owners con OAuth conectado:**
```sql
SELECT id, email, mercadopago_collector_id, mercadopago_connected, marketplace_approved
FROM profiles
WHERE mercadopago_connected = true
ORDER BY mp_onboarding_completed_at DESC;
```

### Verificar Cron Jobs

```sql
-- Ver cron jobs activos
SELECT * FROM cron.job WHERE jobname LIKE '%mercadopago%';

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mercadopago-poll-pending-payments')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🧪 Testing

### Tarjetas Sandbox

**Mastercard (APRO - Aprobado):**
- Número: `5031 7557 3453 0604`
- CVV: `123`
- Vencimiento: `11/25`
- Titular: `APRO`

**Visa (APRO - Aprobado):**
- Número: `4509 9535 6623 3704`
- CVV: `123`
- Vencimiento: `11/25`

**Mastercard (CONT - Contingencia):**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Vencimiento: `11/25`

### Montos Recomendados

- ✅ $100 ARS - Siempre aprobado
- ✅ $1,000 ARS - Siempre aprobado
- ✅ $10,000 ARS - Siempre aprobado
- ⚠️ > $100,000 ARS - Puede generar `cc_rejected_high_risk`

### Simular Webhook

```bash
# Simular webhook de pago aprobado
curl -X POST \
  'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook?topic=payment&id=123456789' \
  -H 'Content-Type: application/json'
```

### Testing de Split Payments

1. Owner debe tener OAuth conectado (mercadopago_connected = true)
2. Crear booking con auto de ese owner
3. Verificar en logs que se usa token OAuth del owner
4. Verificar en MercadoPago Dashboard que split se aplicó correctamente

---

## ⚠️ Troubleshooting Común

### Pago no se confirma

**Síntomas:**
- Booking queda en `pending`
- Wallet transaction queda en `pending`

**Diagnóstico:**
1. Verificar logs del webhook: `npx supabase functions logs mercadopago-webhook --tail`
2. Verificar si polling lo detectó: Query `wallet_transactions` con `provider_metadata.polled_at`
3. Verificar en MercadoPago Dashboard si el pago existe

**Solución:**
- Si webhook no llegó pero polling lo detectó → Ya está confirmado
- Si ninguno lo detectó → Verificar configuración de webhook en MP Dashboard
- Si pago no existe en MP → Usuario no completó el pago

### Error: "MERCADOPAGO_ACCESS_TOKEN not configured"

**Solución:**
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd"
```

### Error: "cc_rejected_high_risk"

**Causa:** Monto muy alto o datos incompletos del payer

**Solución:**
- Reducir monto de prueba
- Verificar que payer tiene `first_name`, `last_name`, `identification`
- Verificar que items tienen `category_id: 'travel'`

### Split Payment no funciona

**Diagnóstico:**
1. Verificar que owner tiene `mercadopago_collector_id`
2. Verificar que owner tiene `mercadopago_connected = true`
3. Verificar logs: ¿Se usa token OAuth o token del marketplace?

**Solución:**
- Si owner no tiene OAuth → Conectar cuenta vía MarketplaceOnboardingService
- Si token OAuth expiró → Refresh token automático (implementar si falta)

### Webhook no se ejecuta

**Verificar:**
1. URL configurada en MP Dashboard: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
2. Eventos seleccionados: `payment`, `money_request`
3. Función deployada: `npx supabase functions deploy mercadopago-webhook`
4. Logs: `npx supabase functions logs mercadopago-webhook --tail`

---

## 🔒 Seguridad

### Encriptación de Tokens

**Estado:** ✅ Implementado

- **Algoritmo:** AES-256-GCM
- **Servicio:** `EncryptionService` (frontend)
- **Columnas:** `mercadopago_access_token_encrypted`, `mercadopago_refresh_token_encrypted`
- **Key:** Variable de entorno `NG_APP_ENCRYPTION_KEY`

### Validación HMAC

**Webhook valida:**
- Headers `x-signature` y `x-request-id` de MercadoPago
- Verifica que la notificación viene de MercadoPago

### RLS Policies

- ✅ `wallet_transactions` - Solo usuarios ven sus propias transacciones
- ✅ `bookings` - Solo usuarios ven sus propios bookings
- ✅ `profiles` - Solo usuarios ven su propio perfil
- ✅ `payment_authorizations` - Solo usuarios ven sus propias preautorizaciones

---

## 📊 Métricas y KPIs

### Métricas a Monitorear

- **Tasa de aprobación:** % de pagos aprobados vs rechazados
- **Tiempo de confirmación:** Tiempo desde pago hasta confirmación en DB
- **Tasa de webhook:** % de pagos confirmados vía webhook vs polling
- **Split payments:** % de bookings con split payments activo
- **OAuth conectado:** % de owners con OAuth conectado

### Queries de Métricas

```sql
-- Tasa de aprobación (últimos 30 días)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as approval_rate
FROM wallet_transactions
WHERE type = 'deposit'
  AND created_at > NOW() - INTERVAL '30 days';

-- Tiempo promedio de confirmación
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
  AND completed_at IS NOT NULL;
```

---

## 🎯 Próximos Pasos

1. **Monitoreo continuo:** Configurar alertas para errores críticos
2. **Optimización:** Reducir tiempo de confirmación (mejorar polling si necesario)
3. **Expansión:** Implementar retiros automatizados (cuando MP lo permita o con proveedor alternativo)
4. **Mejoras:** Verificar Device ID en frontend (si SDK no lo envía automáticamente)

---

**Referencias:**
- **`MERCADOPAGO_SETUP.md`** - Configuración, credenciales y tokens
- **`MERCADOPAGO_QUALITY_AUDIT.md`** - Auditoría completa de calidad (85-90/100 puntos)

