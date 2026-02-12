# 📚 API Reference

> **Última actualización:** 2026-01-09
> **Versión:** v1.0
> **Tipo:** Referencia de endpoints RPC y REST

---

## 📋 Tabla de Contenidos

1. [Introducción](#-introducción)
2. [Autenticación](#-autenticación)
3. [RPC Endpoints por Dominio](#-rpc-endpoints-por-dominio)
   - [Wallet](#wallet)
   - [Payments](#payments)
   - [Pricing](#pricing)
   - [Bookings](#bookings)
   - [Subscriptions](#subscriptions)
   - [FGO (Fondo de Garantía)](#fgo-fondo-de-garantía)
   - [Driver Profile](#driver-profile)
   - [Verification](#verification)
4. [Edge Functions](#-edge-functions)
5. [Códigos de Error](#-códigos-de-error)

---

## 🔐 Introducción

AutoRenta utiliza **Supabase** como backend, exponiendo:
- **PostgREST API:** CRUD automático sobre tablas con RLS
- **RPC Functions:** Lógica de negocio encapsulada en PostgreSQL
- **Edge Functions:** Lógica serverless en Deno para integraciones externas

### Base URL

```
Production: https://[PROJECT_REF].supabase.co
```

---

## 🔐 Autenticación

Todas las requests requieren autenticación via JWT en el header:

```http
Authorization: Bearer <supabase_access_token>
apikey: <supabase_anon_key>
```

### Obtener Token

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## 📡 RPC Endpoints por Dominio

### Wallet

Gestión de billetera digital del usuario.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `wallet_get_balance` | RPC | Obtiene balance actual del usuario |
| `wallet_initiate_deposit` | RPC | Inicia depósito de fondos |
| `wallet_deposit_funds_admin` | RPC | Depósito admin (solo service_role) |
| `wallet_lock_funds` | RPC | Bloquea fondos para reserva |
| `wallet_unlock_funds` | RPC | Desbloquea fondos cancelados |
| `wallet_lock_rental_and_deposit` | RPC | Bloquea rental + garantía |
| `wallet_poll_pending_payments` | RPC | Consulta pagos pendientes |
| `search_users_by_wallet_number` | RPC | Busca usuarios por número de wallet |

#### Ejemplo: Obtener Balance

```typescript
const { data, error } = await supabase.rpc('wallet_get_balance');
// Retorna: { available: number, locked: number, pending: number }
```

#### Ejemplo: Bloquear Fondos

```typescript
const { data, error } = await supabase.rpc('wallet_lock_funds', {
  p_amount_cents: 50000,
  p_booking_id: 'uuid-booking-id',
  p_reason: 'rental_payment'
});
```

---

### Payments

Procesamiento de pagos y pre-autorizaciones MercadoPago.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `create_mp_preauth_order` | RPC | Crea pre-autorización MP |
| `capture_mp_preauth_order` | RPC | Captura pre-autorización |
| `release_mp_preauth_order` | RPC | Libera pre-autorización |
| `create_payment_authorization` | RPC | Crea autorización de pago |

#### Ejemplo: Crear Pre-autorización

```typescript
const { data, error } = await supabase.rpc('create_mp_preauth_order', {
  p_booking_id: 'uuid-booking-id',
  p_amount_cents: 150000,
  p_currency: 'ARS',
  p_card_token: 'mp-token-xxx'
});
// Retorna: { payment_id: string, status: 'authorized' }
```

---

### Pricing

Cotización y pricing dinámico.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `quote_booking` | RPC | Cotiza una reserva |
| `calculate_dynamic_price` | RPC | Calcula precio dinámico |
| `calculate_batch_dynamic_prices` | RPC | Precios batch |
| `lock_price_for_booking` | RPC | Bloquea precio por tiempo |
| `cancel_with_fee` | RPC | Cancela con fee calculado |
| `estimate_vehicle_value_usd` | RPC | Estima valor de vehículo |

#### Ejemplo: Cotizar Reserva

```typescript
const { data, error } = await supabase.rpc('quote_booking', {
  p_car_id: 'uuid-car-id',
  p_start_date: '2026-01-15',
  p_end_date: '2026-01-20',
  p_pickup_lat: -34.6037,
  p_pickup_lng: -58.3816
});
// Retorna: { total_cents, daily_rate, fees, insurance, deposit }
```

---

### Bookings

Gestión del ciclo de vida de reservas.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `request_booking` | RPC | Crea solicitud de reserva |
| `approve_booking` | RPC | Owner aprueba reserva |
| `reject_booking` | RPC | Owner rechaza reserva |
| `start_trip` | RPC | Inicia viaje (check-in) |
| `end_trip` | RPC | Finaliza viaje (check-out) |
| `booking_v2_submit_inspection` | RPC | Envía inspección de vehículo |

#### Ejemplo: Crear Reserva

```typescript
const { data, error } = await supabase.rpc('request_booking', {
  p_car_id: 'uuid-car-id',
  p_start_date: '2026-01-15T10:00:00Z',
  p_end_date: '2026-01-20T10:00:00Z',
  p_pickup_location: { lat: -34.6037, lng: -58.3816, address: 'Buenos Aires' }
});
// Retorna: { booking_id: string, status: 'pending' }
```

---

### Subscriptions

Gestión de planes de suscripción (Autorentar Club).

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `get_active_subscription` | RPC | Obtiene suscripción activa |
| `check_subscription_coverage` | RPC | Verifica cobertura para reserva |
| `calculate_subscription_upgrade` | RPC | Calcula upgrade de plan |
| `calculate_preauthorization` | RPC | Calcula monto pre-auth según plan |
| `validate_subscription_for_vehicle` | RPC | Valida plan vs. valor vehículo |
| `get_subscription_usage_history` | RPC | Historial de uso del plan |

#### Ejemplo: Verificar Cobertura

```typescript
const { data, error } = await supabase.rpc('check_subscription_coverage', {
  p_vehicle_value_usd: 25000,
  p_rental_days: 5
});
// Retorna: { covered: boolean, tier: 'standard'|'black'|'luxury', deposit_reduction_pct: number }
```

---

### FGO (Fondo de Garantía)

Fondo de Garantía Operativa - Sistema de cobertura de daños.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `fgo_get_parameters` | RPC | Obtiene parámetros FGO actuales |
| `fgo_create_risk_snapshot` | RPC | Crea snapshot de riesgo |
| `fgo_assess_eligibility` | RPC | Evalúa elegibilidad FGO |
| `fgo_execute_waterfall` | RPC | Ejecuta waterfall de cobros |
| `fgo_get_metrics` | RPC | Obtiene métricas FGO |

#### Ejemplo: Crear Risk Snapshot

```typescript
const { data, error } = await supabase.rpc('fgo_create_risk_snapshot', {
  p_booking_id: 'uuid-booking-id',
  p_vehicle_value_usd: 20000,
  p_renter_score: 85
});
// Retorna: { snapshot_id: string, franchise_amount: number, coverage_level: string }
```

---

### Driver Profile

Perfil de conductor y sistema de clases.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `get_driver_profile` | RPC | Obtiene perfil de conductor |
| `initialize_driver_profile` | RPC | Inicializa perfil nuevo |
| `get_class_benefits` | RPC | Beneficios por clase |
| `increment_driver_good_years` | RPC | Incrementa años buenos |
| `update_driver_class_on_claim` | RPC | Actualiza clase por reclamo |

#### Ejemplo: Obtener Perfil

```typescript
const { data, error } = await supabase.rpc('get_driver_profile', {
  p_user_id: 'uuid-user-id'
});
// Retorna: { class: 'A'|'B'|'C', good_years: number, claims_count: number }
```

---

### Verification

Verificación de identidad y KYC.

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `submit_document_verification` | RPC | Envía documento para OCR |
| `submit_face_verification` | RPC | Envía foto para verificación facial |
| `get_verification_status` | RPC | Estado de verificación |
| `approve_user_verification` | RPC | Admin aprueba verificación |
| `reject_user_verification` | RPC | Admin rechaza verificación |

---

## 🔧 Edge Functions

Funciones serverless para integraciones externas.

### Pagos (MercadoPago)

| Function | Método | Descripción |
|----------|--------|-------------|
| `mercadopago-webhook` | POST | Recibe webhooks de MP |
| `mercadopago-create-preference` | POST | Crea preferencia de pago |
| `mercadopago-process-booking-payment` | POST | Procesa pago de reserva |
| `mp-create-preauth` | POST | Crea pre-autorización |
| `mp-capture-preauth` | POST | Captura pre-auth |
| `mp-cancel-preauth` | POST | Cancela pre-auth |
| `mercadopago-money-out` | POST | Transferencia a owner |

### Verificación

| Function | Método | Descripción |
|----------|--------|-------------|
| `verify-document` | POST | OCR de documentos |
| `verify-face` | POST | Verificación facial |
| `gemini3-document-analyzer` | POST | Análisis AI de documentos |

### Notificaciones

| Function | Método | Descripción |
|----------|--------|-------------|
| `send-push-notification` | POST | Envía push notification |
| `send-booking-confirmation-email` | POST | Email de confirmación |
| `send-whatsapp-otp` | POST | OTP por WhatsApp |

### Ejemplo: Llamar Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('mp-create-preauth', {
  body: {
    booking_id: 'uuid-booking-id',
    amount_cents: 50000,
    card_token: 'mp-token-xxx'
  }
});
```

---

## ❌ Códigos de Error

### Errores de Negocio

| Código | Descripción |
|--------|-------------|
| `INSUFFICIENT_FUNDS` | Saldo insuficiente en wallet |
| `BOOKING_NOT_FOUND` | Reserva no encontrada |
| `CAR_NOT_AVAILABLE` | Vehículo no disponible |
| `SUBSCRIPTION_EXPIRED` | Suscripción expirada |
| `VERIFICATION_REQUIRED` | Verificación KYC requerida |
| `OWNER_NOT_VERIFIED` | Propietario no verificado MP |
| `PAYMENT_FAILED` | Pago rechazado |
| `PREAUTH_NOT_FOUND` | Pre-autorización no encontrada |

### Errores HTTP

| Status | Significado |
|--------|-------------|
| 400 | Request malformado |
| 401 | No autenticado |
| 403 | No autorizado (RLS) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ya existe) |
| 429 | Rate limit exceeded |
| 500 | Error interno |

---

**Documento generado automáticamente por Gemini Agent**
**Fecha de generación:** 2026-01-09T06:04:35-03:00
