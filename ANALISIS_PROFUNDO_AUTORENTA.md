# ANALISIS PROFUNDO: AUTORENTA

**Fecha:** 2026-01-03
**Proyecto:** Autorenta - Plataforma P2P de Alquiler de Autos
**Supabase Project ID:** `pisqjmoklivzpwufhscx`
**Region:** `sa-east-1` (Sao Paulo)
**Estado:** ACTIVE_HEALTHY

---

## 1. RESUMEN EJECUTIVO

Autorenta es una plataforma P2P (peer-to-peer) de alquiler de autos que conecta propietarios de vehículos con arrendatarios. El sistema implementa:

- **Frontend:** Angular 20 (SSR) + Ionic 8 + Capacitor 7
- **Backend:** Supabase (PostgreSQL 17.6 + Edge Functions)
- **Pagos:** MercadoPago SDK v2 (Checkout Bricks) + PayPal REST API
- **Tasas FX:** Sistema dual Binance + Platform Rate (+10%)
- **Wallet:** Sistema de billetera interna con ledger doble partida
- **Deploy:** Cloudflare Pages (Frontend) + Supabase Edge (Backend)

---

## 2. ARQUITECTURA DEL PROYECTO

### 2.1 Estructura del Monorepo

```
/home/edu/autorenta/
├── apps/
│   └── web/                          # Angular 20 SSR App
│       └── src/app/
│           ├── core/                 # Singleton services, guards, models
│           │   ├── services/
│           │   │   ├── auth/         # 9+ servicios de autenticación
│           │   │   ├── bookings/     # 20+ servicios de reservas
│           │   │   ├── cars/         # 10+ servicios de autos
│           │   │   ├── payments/     # 30+ servicios de pagos
│           │   │   ├── infrastructure/  # Logger, Supabase, Realtime
│           │   │   ├── verification/ # FGO, Risk, Daño
│           │   │   ├── geo/          # Mapbox, Geocoding
│           │   │   └── ui/           # Tema, idioma, notificaciones
│           │   ├── guards/           # AuthGuard, VerificationGuard
│           │   ├── interceptors/     # HTTP interceptors
│           │   ├── models/           # TypeScript interfaces
│           │   └── constants/        # Constantes globales
│           ├── features/             # 35+ feature modules (lazy-loaded)
│           │   ├── bookings/
│           │   │   ├── booking-detail-payment/  # *** CRITICO ***
│           │   │   ├── checkout/
│           │   │   ├── success/
│           │   │   └── ...
│           │   ├── wallet/
│           │   ├── cars/
│           │   └── ...
│           └── shared/               # Componentes reutilizables
│               └── components/
│                   └── mercadopago-card-form/
├── supabase/
│   ├── functions/                    # 38 Edge Functions
│   └── migrations/                   # Migraciones SQL
├── database/
│   └── migrations/                   # Migraciones adicionales
├── tests/                            # E2E Playwright
├── android/                          # Capacitor Android
└── tools/                            # Scripts de desarrollo
```

### 2.2 Stack Tecnológico Detallado

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework Frontend | Angular | 20 |
| UI Components | Ionic | 8 |
| Mobile | Capacitor | 7 |
| Styling | TailwindCSS | 4.x |
| 3D Graphics | Three.js | Latest |
| Mapas | Mapbox GL | 3.17 |
| Charts | Chart.js + ng2-charts | Latest |
| State | Angular Signals | Built-in |
| Database | PostgreSQL | 17.6.1 |
| Backend | Supabase | Latest |
| Edge Functions | Deno | Latest |
| Payments | MercadoPago SDK v2 | Latest |
| Payments Alt | PayPal REST API | Latest |
| Tests E2E | Playwright | Latest |
| Tests Unit | Vitest | Latest |

---

## 3. SISTEMA DE PAGOS (CRITICO)

### 3.1 Flujo de Pago Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO SELECCIONA AUTO + FECHAS                            │
│    (Car Detail Page → navigate to booking-detail-payment)       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ 2. BOOKING-DETAIL-PAYMENT PAGE                                  │
│    ├─ Cargar info del auto (cars table)                         │
│    ├─ Obtener FX Snapshot (binanceRate + platformRate)          │
│    ├─ Calcular rental cost en USD y ARS                         │
│    ├─ Calcular RiskSnapshot (franquicia, hold)                  │
│    └─ Mostrar resumen de pago                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ MODO = CARD     │           │ MODO = WALLET   │
    │ (Tarjeta)       │           │ (Billetera)     │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ CardHoldPanel   │           │ wallet_lock_    │
    │ (MP Card Form)  │           │ funds()         │
    │ → Genera Token  │           │ → Lock fondos   │
    │ → Preauth $600  │           └────────┬────────┘
    └────────┬────────┘                    │
             │                             │
             └──────────────┬──────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 3. submitRequest()                                              │
│    ├─ Crear/Actualizar booking en DB                            │
│    ├─ Guardar payment_mode, wallet_lock_id o authorized_payment │
│    ├─ Enviar mensaje al host (opcional)                         │
│    └─ Navegar a /bookings/success/{id}                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 4. EDGE FUNCTION: mercadopago-process-booking-payment           │
│    (Solo si modo = card y se procesa pago directo)              │
│    ├─ Rate Limiting (fail-closed DDoS protection)               │
│    ├─ Validar JWT del usuario                                   │
│    ├─ Validar contrato bilateral (4 cláusulas)                  │
│    ├─ Validar price_lock no expirado                            │
│    ├─ Idempotencia check                                        │
│    ├─ Procesar pago en MP API                                   │
│    ├─ Split Payment 15% automático                              │
│    └─ Actualizar booking status                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│ 5. WEBHOOK: mercadopago-webhook                                 │
│    ├─ Validar IP whitelist de MP                                │
│    ├─ Validar firma HMAC                                        │
│    ├─ Deduplicación por event_id                                │
│    ├─ Consultar estado del pago en MP API                       │
│    ├─ Si approved → confirmar booking                           │
│    ├─ Si es deposit → acreditar wallet                          │
│    └─ Registrar en ledger                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Componente Principal: booking-detail-payment.page.ts

**Ubicación:** `/apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`

**Signals de Estado:**
```typescript
// Core state
car = signal<Car | null>(null);
fxSnapshot = signal<DualRateFxSnapshot | null>(null);
loading = signal(false);
processingPayment = signal(false);
error = signal<string | null>(null);

// Payment flow
bookingCreated = signal(false);
bookingId = signal<string | null>(null);
fxRateLocked = signal(false);

// Authorization
riskSnapshot = signal<RiskSnapshot | null>(null);
currentAuthorization = signal<PaymentAuthorization | null>(null);
paymentMode = signal<PaymentMode>('card');
walletLockId = signal<string | null>(null);
lockingWallet = signal(false);
termsAccepted = signal(false);
```

**Sistema FX Dual:**
```typescript
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number;    // Raw Binance (sin margen) - para alquiler
  platformRate: number;   // Binance + 10% margen - para garantías
}
```

**Cálculos Críticos:**
```typescript
// Costo del alquiler en USD (precio base del auto)
rentalCostUsd = dailyRate * days;

// Costo del alquiler en ARS (usando Binance rate SIN margen)
rentalCostArs = rentalCostUsd * fx.binanceRate;

// Garantía en ARS (usando Platform rate CON 10% margen)
guaranteeArs = PRE_AUTH_AMOUNT_USD * fx.platformRate; // $600 USD

// Total = Garantía + Alquiler
totalArs = guaranteeArs + rentalArs;
```

### 3.3 Componente: CardHoldPanelComponent

**Ubicación:** `/apps/web/src/app/features/bookings/booking-detail-payment/components/card-hold-panel.component.ts`

**Flujo de Preautorización:**
1. Usuario ingresa datos de tarjeta en MercadoPago Card Form
2. Al generar token, se llama a `onCardTokenGenerated()`
3. Se invoca `PaymentAuthorizationService.authorizePayment()`
4. Preautorización de $600 USD (hold de 7 días)
5. Se guarda `authorizedPaymentId` para captura posterior

### 3.4 Edge Function: mercadopago-process-booking-payment

**Ubicación:** `/supabase/functions/mercadopago-process-booking-payment/index.ts`

**Validaciones de Seguridad (P0):**
1. **Rate Limiting** - Fail-closed para prevenir DDoS
2. **JWT Validation** - Usuario autenticado
3. **Contract Validation** - 4 cláusulas aceptadas, < 24h
4. **Price Lock** - Verificar no expirado
5. **Idempotencia** - Evitar pagos duplicados
6. **Amount Validation** - Monto coincide con reserva

**Split Payment Automático:**
```typescript
// 15% comisión plataforma
const platformFee = Math.round(totalAmount * 0.15 * 100) / 100;

// Payload a MercadoPago
const mpPayload = {
  transaction_amount: totalAmount,
  marketplace: MP_MARKETPLACE_ID,
  marketplace_fee: platformFee,
  collector_id: owner.mercadopago_collector_id,
  // ...
};
```

### 3.5 Edge Function: mercadopago-webhook

**Ubicación:** `/supabase/functions/mercadopago-webhook/index.ts`

**Validaciones de Seguridad:**
1. **IP Whitelist** - Solo IPs de MercadoPago (rangos CIDR)
2. **HMAC Validation** - Firma x-signature válida
3. **Deduplicación** - Por event_id (x-request-id) en mp_webhook_logs
4. **Timeout** - 3s máximo para consulta a MP API

**Estados Manejados:**
- `approved` → Confirmar booking/Acreditar wallet
- `authorized` → Preautorización exitosa
- `cancelled` → Cancelar preauth
- `pending` → En espera
- `rejected` → Rechazado

---

## 4. EDGE FUNCTIONS DESPLEGADAS (38 total)

### 4.1 Funciones de Pagos MercadoPago

| Función | JWT | Propósito |
|---------|-----|-----------|
| `mercadopago-webhook` | NO | Webhook IPN de MP |
| `mercadopago-create-preference` | SI | Crear preferencia genérica |
| `mercadopago-create-booking-preference` | SI | Preferencia para booking |
| `mercadopago-process-booking-payment` | SI | Procesar pago de booking |
| `mercadopago-process-deposit-payment` | SI | Procesar depósito a wallet |
| `mercadopago-process-brick-payment` | SI | Procesar pago de Brick |
| `mercadopago-oauth-connect` | SI | Iniciar OAuth MP |
| `mercadopago-oauth-callback` | NO | Callback OAuth MP |
| `mercadopago-initiate-onboarding` | SI | Onboarding de owners |
| `mp-create-preauth` | SI | Crear preautorización |
| `mp-capture-preauth` | SI | Capturar preauth |
| `mp-cancel-preauth` | SI | Cancelar preauth |
| `monitor-pending-payouts` | SI | Monitorear payouts |

### 4.2 Funciones de PayPal

| Función | JWT | Propósito |
|---------|-----|-----------|
| `paypal-create-order` | SI | Crear orden PayPal |
| `paypal-capture-order` | SI | Capturar orden |

### 4.3 Funciones de Integraciones

| Función | JWT | Propósito |
|---------|-----|-----------|
| `google-calendar-oauth` | NO | OAuth Google Calendar |
| `sync-booking-to-calendar` | SI | Sincronizar booking |
| `make-calendar-public` | SI | Hacer calendario público |
| `tiktok-events` | SI | Eventos TikTok Pixel |
| `tiktok-oauth-callback` | SI | Callback OAuth TikTok |

### 4.4 Funciones de IA/Análisis

| Función | JWT | Propósito |
|---------|-----|-----------|
| `generate-car-images` | NO | Generar imágenes 3D |
| `analyze-damage-images` | SI | Análisis daño (Gemini) |
| `gemini3-document-analyzer` | SI | OCR documentos |
| `verify-document` | SI | Verificar documento |
| `verify-user-docs` | SI | Verificar docs usuario |

### 4.5 Funciones de Sistema

| Función | JWT | Propósito |
|---------|-----|-----------|
| `dashboard-stats` | SI | Stats para dashboard |
| `sync-binance-rates` | NO | Sincronizar tasas FX |
| `sync-fipe-values` | SI | Sincronizar FIPE Brasil |
| `sync-fipe-prices` | SI | Sincronizar precios FIPE |
| `get-fipe-value` | SI | Obtener valor FIPE |
| `monitoring-health-check` | SI | Health check |
| `monitoring-database-metrics` | SI | Métricas DB |
| `rentarfast-agent` | SI | Agente IA conversacional |
| `incident-webhook` | SI | Webhooks de incidentes |
| `return-protocol-scheduler` | SI | Scheduler devoluciones |
| `generate-booking-contract-pdf` | NO | PDF de contrato |
| `outbound-processor` | SI | Procesador saliente |

---

## 5. MODELOS DE DATOS CRITICOS

### 5.1 Booking Detail Payment Model

```typescript
// Modos de pago
type PaymentMode = 'card' | 'wallet';

// Tipos de cobertura
type CoverageUpgrade = 'standard' | 'premium50' | 'zero';

// Buckets de vehículos
type BucketType = 'economy' | 'standard' | 'premium' | 'luxury';

// FX Snapshot con tasas duales
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number;    // Sin margen (alquiler)
  platformRate: number;   // +10% (garantía)
}

// Snapshot de riesgo
interface RiskSnapshot {
  deductibleUsd: number;           // Franquicia estándar
  rolloverDeductibleUsd: number;   // Franquicia por vuelco
  holdEstimatedArs: number;        // Hold en ARS
  holdEstimatedUsd: number;        // Hold en USD ($600)
  creditSecurityUsd: number;       // Crédito de seguridad
  bucket: BucketType;
  vehicleValueUsd: number;
  country: CountryCode;
  fxRate: number;
  calculatedAt: Date;
  coverageUpgrade: CoverageUpgrade;
}

// Autorización de pago (preauth)
interface PaymentAuthorization {
  authorizedPaymentId: string;
  amountArs: number;
  amountUsd: number;
  currency: string;
  expiresAt: Date;
  status: 'pending' | 'authorized' | 'failed' | 'expired';
  cardLast4: string;
  createdAt: Date;
}
```

### 5.2 Wallet Model

```typescript
interface WalletBalance {
  user_id: string;
  available_balance: number;         // Total - Locked
  transferable_balance: number;      // Available - Protected
  withdrawable_balance: number;      // Transferable - Hold
  autorentar_credit_balance: number; // Crédito Autorentar $300
  cash_deposit_balance: number;      // Depósitos efectivo
  locked_balance: number;            // En reservas activas
  total_balance: number;             // available + locked
  currency: string;                  // 'USD' | 'ARS'
}

type WalletTransactionType =
  | 'deposit' | 'lock' | 'unlock' | 'charge' | 'refund' | 'bonus'
  | 'rental_payment_lock' | 'rental_payment_transfer'
  | 'security_deposit_lock' | 'security_deposit_release'
  | 'security_deposit_charge' | 'withdrawal';
```

---

## 6. SERVICIOS PRINCIPALES DEL FRONTEND

### 6.1 Servicios de Pagos (30+ servicios)

| Servicio | Responsabilidad |
|----------|-----------------|
| `WalletService` | Estado de wallet (signals) |
| `FxService` | Tasas de cambio (Binance + Platform) |
| `ExchangeRateService` | API Binance en tiempo real |
| `MercadoPagoPaymentService` | Procesar pagos MP |
| `MercadoPagoBookingGatewayService` | Preferencias booking |
| `MercadoPagoWalletGatewayService` | Preferencias wallet |
| `PaymentAuthorizationService` | Preautorizaciones |
| `PaymentOrchestrationService` | Orquestación de flujo |
| `SplitPaymentService` | Split 15% automático |
| `PricingService` | Cálculo de precios |
| `DynamicPricingService` | Pricing por demanda |
| `BonusMalusService` | Factor por historial |
| `SettlementService` | Liquidación owners |
| `WithdrawalService` | Retiros bancarios |
| `RefundService` | Reembolsos |

### 6.2 Servicios de Bookings (20+ servicios)

| Servicio | Responsabilidad |
|----------|-----------------|
| `BookingsService` | CRUD de reservas |
| `BookingFlowService` | Estados del booking |
| `BookingInitiationService` | Inicio de booking |
| `BookingApprovalService` | Aprobación owner |
| `BookingConfirmationService` | Confirmación pago |
| `BookingCompletionService` | Finalización |
| `BookingCancellationService` | Cancelaciones |
| `BookingWalletService` | Interacción wallet |
| `BookingValidationService` | Validaciones |
| `ContractsService` | PDFs de contrato |
| `MessagesService` | P2P messaging |

### 6.3 Servicios de Autenticación (9 servicios)

| Servicio | Responsabilidad |
|----------|-----------------|
| `AuthService` | Sesión Supabase |
| `ProfileService` | Perfil usuario |
| `OnboardingService` | Flujo onboarding |
| `PhoneVerificationService` | SMS verificación |
| `EmailVerificationService` | Email verificación |
| `IdentityLevelService` | Niveles KYC |
| `BiometricAuthService` | Auth biométrica |
| `RBACService` | Roles y permisos |
| `ReferralsService` | Referidos |

---

## 7. FUNCIONES SQL CRITICAS (RPC)

### 7.1 Wallet Functions

```sql
-- Bloquear fondos para alquiler + depósito
wallet_lock_rental_and_deposit(
  p_booking_id UUID,
  p_rental_amount DECIMAL,
  p_deposit_amount DECIMAL
) → { success, transaction_id, new_available, new_locked }

-- Completar booking (liberar fondos)
wallet_complete_booking(
  p_booking_id UUID,
  p_completion_type TEXT -- 'completed' | 'cancelled' | 'damage_charge'
) → { success, amount_released }

-- Bloquear fondos con expiración
wallet_lock_funds_with_expiration(
  p_booking_id UUID,
  p_amount_cents BIGINT,
  p_lock_type TEXT,
  p_expires_in_days INT
) → lock_id UUID

-- Confirmar depósito (admin)
wallet_confirm_deposit_admin(
  p_user_id UUID,
  p_transaction_id UUID,
  p_provider_transaction_id TEXT,
  p_provider_metadata JSONB
) → { success }

-- Registrar en ledger
wallet_deposit_ledger(
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_ref TEXT,
  p_provider TEXT,
  p_meta JSONB
) → { success }
```

### 7.2 Booking Functions

```sql
-- Validar y confirmar split payment (atómico)
validate_and_confirm_split_payment(
  p_booking_id UUID,
  p_mp_payment_id TEXT,
  p_mp_status TEXT,
  p_transaction_amount DECIMAL,
  p_collector_id TEXT,
  p_marketplace_fee DECIMAL,
  ...
) → { validation_passed, already_processed, validation_issues }

-- Actualizar estado de payment intent
update_payment_intent_status(
  p_mp_payment_id TEXT,
  p_mp_status TEXT,
  p_mp_status_detail TEXT,
  p_payment_method_id TEXT,
  p_card_last4 TEXT,
  p_metadata JSONB
) → void

-- Capturar preauth
capture_preauth(
  p_intent_id UUID,
  p_booking_id UUID
) → void

-- Cancelar preauth
cancel_preauth(
  p_intent_id UUID
) → void
```

---

## 8. CONSTANTES DEL SISTEMA

```typescript
// Pagos
PAYMENT_RATE_LIMIT = 5 per minute per user
CARD_HOLD_DAYS = 7
PRE_AUTH_AMOUNT_USD = 600
PLATFORM_COMMISSION = 0.15 (15%)
MAX_AMOUNT_ARS = 1_000_000

// Wallet
WALLET_STALE_TIME_MS = 30_000 (30 segundos)
MAX_WALLET_LOCKS_PER_MINUTE = 10
RATE_LIMIT_WINDOW_MS = 60_000

// FX
FX_MARGIN = 0.10 (10%)
FX_SNAPSHOT_VALIDITY = 7 days
VARIATION_THRESHOLD = 0.10 (±10%)
FX_POLL_INTERVAL = 30_000 (30 segundos)

// Booking
BOOKING_STATE_TIMEOUT = 24 hours
PRICE_LOCK_DURATION = 15 minutes
CONTRACT_ACCEPTANCE_EXPIRY = 24 hours

// Rate Limiting
WEBHOOK_RATE_LIMIT = 100 per minute per IP
PAYMENT_RATE_LIMIT = 5 per minute per user
```

---

## 9. FLUJO DE ESTADOS DEL BOOKING

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    pending                                                      │
│       │                                                         │
│       ├──► owner_approved ──► confirmed ──► active ──► completed│
│       │         │                 │           │                 │
│       │         └──► rejected     └──► cancelled               │
│       │                                                         │
│       └──► cancelled (timeout)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Estados:
- pending: Reserva creada, esperando aprobación owner
- owner_approved: Owner aprobó, esperando pago
- confirmed: Pago completado
- active: Renter hizo check-in
- completed: Ambos confirmaron devolución
- cancelled: Cancelada (por timeout, renter, o owner)
- rejected: Owner rechazó
```

---

## 10. INTEGRACIONES EXTERNAS

| Servicio | Propósito | Autenticación |
|----------|-----------|---------------|
| **MercadoPago** | Pagos, split, preauth | OAuth + Access Token |
| **PayPal** | Pagos alternativos | Client ID + Secret |
| **Binance** | Tasas FX | API Pública |
| **Google Gemini** | IA (daños, OCR) | API Key |
| **Mapbox GL** | Mapas, geocoding | Access Token |
| **Google Calendar** | Sincronización | OAuth 2.0 |
| **TikTok Pixel** | Analytics | Pixel ID |
| **Google Analytics 4** | Analytics | Measurement ID |
| **Sentry** | Error tracking | DSN |

---

## 11. AMBIENTE DE PRODUCCION

### 11.1 Frontend (Cloudflare Pages)

- **URL:** https://autorentar.pages.dev
- **Account ID:** 5b448192fe4b369642b68ad8f53a7603
- **Project:** autorentar

### 11.2 Supabase

- **Project ID:** pisqjmoklivzpwufhscx
- **Region:** sa-east-1 (Sao Paulo)
- **Database Host:** db.pisqjmoklivzpwufhscx.supabase.co
- **Pooler Host:** aws-1-sa-east-1.pooler.supabase.com:6543
- **PostgreSQL Version:** 17.6.1
- **Estado:** ACTIVE_HEALTHY

---

## 12. PUNTOS CRITICOS A MONITOREAR

### 12.1 Flujo de Pago

1. **booking-detail-payment.page.ts** - Punto de entrada del checkout
2. **card-hold-panel.component.ts** - Preautorización de tarjeta
3. **mercadopago-process-booking-payment** - Procesamiento del pago
4. **mercadopago-webhook** - Confirmación asíncrona

### 12.2 Sistema FX

1. **FxService** - Obtención de tasas
2. **ExchangeRateService** - API Binance
3. **sync-binance-rates** - Sincronización automática

### 12.3 Wallet

1. **WalletService** - Estado de billetera
2. **wallet_lock_funds** - Bloqueo de fondos
3. **wallet_confirm_deposit_admin** - Acreditación

### 12.4 Seguridad

1. Rate limiting en Edge Functions
2. HMAC validation en webhooks
3. IP whitelist de MercadoPago
4. Price lock validation
5. Contract validation

---

## 13. COMANDOS UTILES

```bash
# Development
pnpm dev                            # Dev server
pnpm build                          # Production build
pnpm lint                           # Lint all

# Tests
pnpm test:unit                      # Unit tests
pnpm test:e2e                       # E2E tests

# Database
PGPASSWORD='Ab.12345' psql -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 -U postgres.pisqjmoklivzpwufhscx -d postgres

# Deploy
pnpm build && CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
  npx wrangler pages deploy dist/web/browser --project-name=autorentar

# Edge Functions
supabase functions deploy <function-name>
supabase functions logs <function-name> --follow
```

---

## 14. CONCLUSION

Autorenta es un sistema complejo con múltiples capas de seguridad y validación. Los puntos más críticos son:

1. **Sistema de pagos dual** (tarjeta + wallet)
2. **Split payment automático** (15% plataforma)
3. **Sistema FX dual** (Binance + Platform Rate)
4. **Preautorizaciones** de $600 USD
5. **Validación de contratos** bilateral
6. **Webhooks seguros** con HMAC + IP whitelist

**Archivos clave para debugging:**
- `booking-detail-payment.page.ts`
- `card-hold-panel.component.ts`
- `mercadopago-process-booking-payment/index.ts`
- `mercadopago-webhook/index.ts`

---

*Documento generado: 2026-01-03*
*Versión: 1.0*
