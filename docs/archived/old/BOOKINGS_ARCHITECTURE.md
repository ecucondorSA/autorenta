# 🏗️ Arquitectura del Sistema de Reservas (Bookings)

**AutoRenta - Sistema de Reservas y Pagos**
Documento generado: 2025-10-23

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Diagrama de Flujo Completo](#diagrama-de-flujo-completo)
3. [Estados de una Reserva](#estados-de-una-reserva)
4. [Arquitectura de Componentes](#arquitectura-de-componentes)
5. [Flujo de Pago con MercadoPago](#flujo-de-pago-con-mercadopago)
6. [Base de Datos](#base-de-datos)
7. [Integraciones](#integraciones)

---

## 🎯 Visión General

El sistema de reservas de AutoRenta permite a los usuarios (locatarios) alquilar vehículos de anfitriones (locadores) con un flujo de pago seguro en pesos argentinos a través de MercadoPago.

**Características principales:**
- ✅ Reservas con expiración automática (30 minutos)
- 💳 Pagos procesados en ARS con conversión automática de USD
- 🔒 Depósito de garantía bloqueado en wallet
- ✉️ Mensajería integrada entre locador y locatario
- ⭐ Sistema de reviews bilateral
- 🤝 Confirmación bilateral de entrega/devolución

---

## 🔄 Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO COMPLETO DE RESERVA                             │
└─────────────────────────────────────────────────────────────────────────────┘

FASE 1: SELECCIÓN Y CREACIÓN
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Usuario    │──────│ Selecciona   │──────│   Checkout   │
│   Navega     │ 1️⃣  │    Fechas    │ 2️⃣  │    Page      │
│   /cars      │      │  y Opciones  │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
                                                    │
                                                    │ 3️⃣ Selecciona método pago
                                                    ▼
                                            ┌──────────────┐
                                            │  Crear       │
                                            │  Reserva     │◄──── BookingsService
                                            │  (pending)   │      .createBooking()
                                            └──────────────┘
                                                    │
                         ┌──────────────────────────┴──────────────────────────┐
                         │                                                      │
                 Método: CREDIT_CARD                              Método: WALLET
                         │                                                      │
                         ▼                                                      ▼
              ┌──────────────────┐                               ┌──────────────────┐
              │ Edge Function:   │                               │ RPC Function:    │
              │ mercadopago-     │                               │ wallet_lock_     │
              │ create-booking-  │                               │ funds()          │
              │ preference       │                               └──────────────────┘
              └──────────────────┘                                        │
                         │                                                │
                         │ Crea preferencia                               │ Bloquea $250 USD
                         │ en MercadoPago                                 │ + total booking
                         ▼                                                ▼
              ┌──────────────────┐                               ┌──────────────────┐
              │ MercadoPago      │                               │ Status:          │
              │ Checkout         │                               │ confirmed        │
              │ (init_point)     │                               │ paid_at: NOW     │
              └──────────────────┘                               └──────────────────┘
                         │                                                │
                         │ Usuario completa                               │
                         │ pago en ARS                                    │
                         ▼                                                │
              ┌──────────────────┐                                        │
              │ MercadoPago      │                                        │
              │ envía IPN        │                                        │
              │ notification     │                                        │
              └──────────────────┘                                        │
                         │                                                │
                         ▼                                                │
              ┌──────────────────┐                                        │
              │ Edge Function:   │                                        │
              │ mercadopago-     │                                        │
              │ webhook          │                                        │
              └──────────────────┘                                        │
                         │                                                │
                         │ Actualiza booking                              │
                         ▼                                                │
              ┌──────────────────┐                                        │
              │ Status:          │                                        │
              │ confirmed        │◄───────────────────────────────────────┘
              │ paid_at: NOW     │
              └──────────────────┘
                         │
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
FASE 2: CONFIRMADA          FASE 3: EN PROGRESO
┌──────────────┐            ┌──────────────┐
│ Status:      │            │ Status:      │
│ confirmed    │───────────►│ in_progress  │
│              │ Fecha      │              │
│ - Chat       │ inicio     │ - Chat       │
│   habilitado │ llegó      │   habilitado │
│ - Requisitos │            │ - Vehículo   │
│   visibles   │            │   en uso     │
└──────────────┘            └──────────────┘
                                    │
                                    │ Fecha fin
                                    │ llegó
                                    ▼
FASE 4: DEVOLUCIÓN         ┌──────────────┐
┌──────────────┐           │ Status:      │
│ Owner marca  │◄──────────│ completed    │
│ "returned"   │           │              │
└──────────────┘           │ completion_  │
        │                  │ status:      │
        │                  │ returned     │
        ▼                  └──────────────┘
┌──────────────┐                   │
│ completion_  │                   │
│ status:      │                   │
│ pending_both │                   │
└──────────────┘                   │
        │                          │
        │                          │
        ▼                          │
┌─────────────────────────────────┐│
│   CONFIRMACIÓN BILATERAL        ││
│   (Bilateral Confirmation)      ││
└─────────────────────────────────┘│
        │                          │
        ├──────────────────────────┘
        │
        ├──► Owner confirma entrega sin daños
        │    (owner_confirmed_delivery = true)
        │    completion_status → pending_renter
        │
        └──► Renter confirma recepción del depósito
             (renter_confirmed_payment = true)
             completion_status → pending_owner

        ┌────────────────────────────┐
        │  AMBOS CONFIRMARON         │
        └────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │ Edge Function:             │
        │ confirm-and-release-funds  │
        │                            │
        │ - Valida ambas confirmac.  │
        │ - Libera fondos bloqueados │
        │ - completion_status:       │
        │   funds_released           │
        └────────────────────────────┘
                    │
                    ▼
FASE 5: COMPLETADA
┌──────────────┐
│ Status:      │
│ completed    │
│              │
│ completion_  │
│ status:      │
│ funds_       │
│ released     │
│              │
│ - Disponible │
│   para       │
│   reviews    │
└──────────────┘
        │
        │ Usuarios dejan
        │ reviews
        ▼
┌──────────────┐
│ Reviews      │
│ creadas      │
│ (pendientes  │
│ publicación) │
└──────────────┘
        │
        │ 14 días O
        │ ambos reviewed
        ▼
┌──────────────┐
│ Reviews      │
│ publicadas   │
└──────────────┘
```

---

## 📊 Estados de una Reserva

### Diagrama de Estados

```
                    ┌─────────────┐
                    │   PENDING   │ ◄─── Creada, esperando pago
                    └─────────────┘      (expira en 30 min)
                           │
            ┌──────────────┴──────────────┐
            │                             │
        Pago OK                      Expiró / Canceló
            │                             │
            ▼                             ▼
     ┌─────────────┐              ┌─────────────┐
     │  CONFIRMED  │              │  CANCELLED  │
     └─────────────┘              │  EXPIRED    │
            │                     └─────────────┘
            │ Fecha inicio
            ▼
     ┌─────────────┐
     │ IN_PROGRESS │
     └─────────────┘
            │
            │ Fecha fin
            ▼
     ┌─────────────┐
     │  COMPLETED  │ ◄─── completion_status → varios
     └─────────────┘      (returned, pending_both,
                           pending_owner, pending_renter,
                           funds_released)
```

### Estados y Substatus

| Estado | completion_status | Descripción | Acciones disponibles |
|--------|------------------|-------------|---------------------|
| **pending** | null | Reserva creada, esperando pago | Pagar, Cancelar |
| **confirmed** | null | Pago confirmado, esperando inicio | Ver comprobante, Chat |
| **in_progress** | null | Vehículo en uso | Chat |
| **completed** | **returned** | Owner marcó como devuelto | Owner/Renter deben confirmar |
| **completed** | **pending_both** | Ninguno confirmó aún | Ambos deben confirmar |
| **completed** | **pending_owner** | Renter confirmó, falta Owner | Owner debe confirmar |
| **completed** | **pending_renter** | Owner confirmó, falta Renter | Renter debe confirmar |
| **completed** | **funds_released** | Ambos confirmaron, fondos liberados | Dejar review |
| **cancelled** | null | Cancelada por usuario/sistema | Ninguna |
| **expired** | null | Expiró sin pago | Ninguna |
| **no_show** | null | Locatario no se presentó | Ninguna |

---

## 🏛️ Arquitectura de Componentes

### Frontend (Angular 17)

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────┘

PAGES (Features)
├── /cars/:id
│   └── car-detail.page.ts
│       ├── Muestra detalles del vehículo
│       ├── Selector de fechas
│       └── Botón "Reservar" → /checkout
│
├── /checkout
│   └── checkout.page.ts ⭐ NÚCLEO DE RESERVA
│       ├── Resumen de reserva
│       ├── Selector método pago (WALLET | CREDIT_CARD)
│       ├── Cálculo de precio (PricingService)
│       ├── Conversión USD → ARS (ExchangeRateService)
│       └── Creación de booking (BookingsService)
│
├── /bookings
│   └── bookings.page.ts
│       └── Lista de reservas del usuario (como locatario y locador)
│
└── /bookings/:id
    └── booking-detail.page.ts ⭐ GESTIÓN DE RESERVA
        ├── Detalles completos de la reserva
        ├── Botón "Pagar ahora" (si pending)
        ├── Conversión USD → ARS
        ├── Chat integrado (BookingChatComponent)
        ├── Confirmación bilateral (Owner/Renter)
        └── Formulario de review (si completed)

COMPONENTS (Shared)
├── booking-chat.component.ts
│   └── Mensajería en tiempo real entre owner/renter
│
├── owner-confirmation.component.ts
│   └── Formulario para que owner confirme entrega sin daños
│
├── renter-confirmation.component.ts
│   └── Formulario para que renter confirme devolución de depósito
│
├── review-form.component.ts
│   └── Formulario para dejar review (rating + comentario)
│
└── review-card.component.ts
    └── Muestra review existente

SERVICES (Core)
├── bookings.service.ts
│   ├── createBooking(params)
│   ├── getBookingById(id)
│   ├── getMyBookings()
│   ├── cancelBooking(id, reason)
│   ├── isExpired(booking)
│   └── formatTimeRemaining(ms)
│
├── payments.service.ts
│   ├── createIntent(bookingId)
│   └── confirmPayment(intentId)
│
├── exchange-rate.service.ts
│   ├── getPlatformRate() → cotización USD/ARS
│   └── convertUsdToArs(amountUsd)
│
├── pricing.service.ts
│   ├── calculateBreakdown(params)
│   └── Calcula: subtotal, insurance, fees, deposit, total
│
└── reviews.service.ts
    ├── createReview(params)
    ├── canReviewBooking(bookingId)
    └── getReviewsForUser(userId)
```

### Backend (Supabase + Edge Functions)

```
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

SUPABASE POSTGRES
├── bookings ⭐ TABLA PRINCIPAL
│   ├── id (uuid, PK)
│   ├── renter_id (uuid, FK → profiles)
│   ├── car_id (uuid, FK → cars)
│   ├── status (booking_status enum)
│   ├── completion_status (completion_status enum)
│   ├── start_at (timestamptz)
│   ├── end_at (timestamptz)
│   ├── created_at (timestamptz)
│   ├── expires_at (timestamptz) ← 30 min después de created_at
│   ├── paid_at (timestamptz)
│   ├── payment_method (text) ← 'wallet' | 'credit_card'
│   ├── currency (text) ← 'USD'
│   ├── total_amount (numeric) ← En USD
│   ├── deposit_amount_cents (integer) ← $250 USD en centavos
│   ├── breakdown (jsonb) ← Desglose de precio
│   ├── mercadopago_preference_id (text)
│   ├── mercadopago_init_point (text)
│   ├── owner_confirmed_delivery (boolean)
│   ├── renter_confirmed_payment (boolean)
│   ├── owner_damage_amount (numeric)
│   └── owner_damage_description (text)
│
├── payments
│   ├── id (uuid, PK)
│   ├── booking_id (uuid, FK → bookings)
│   ├── amount_cents (integer)
│   ├── currency (text)
│   ├── status (payment_status enum)
│   └── provider (text) ← 'mercadopago'
│
├── payment_intents
│   ├── id (uuid, PK)
│   ├── booking_id (uuid, FK → bookings)
│   ├── provider (text)
│   ├── provider_intent_id (text)
│   └── status (text)
│
├── user_wallets
│   ├── user_id (uuid, PK, FK → profiles)
│   ├── balance_cents (integer) ← Saldo disponible
│   ├── locked_cents (integer) ← Fondos bloqueados
│   └── currency (text) ← 'USD'
│
├── wallet_transactions
│   ├── id (uuid, PK)
│   ├── wallet_id (uuid, FK → user_wallets)
│   ├── type (wallet_transaction_type enum)
│   ├── amount_cents (integer)
│   ├── status (text)
│   └── booking_id (uuid, nullable, FK → bookings)
│
├── messages
│   ├── id (uuid, PK)
│   ├── booking_id (uuid, FK → bookings)
│   ├── sender_id (uuid, FK → profiles)
│   ├── content (text)
│   └── created_at (timestamptz)
│
├── reviews
│   ├── id (uuid, PK)
│   ├── booking_id (uuid, FK → bookings)
│   ├── reviewer_id (uuid, FK → profiles)
│   ├── reviewee_id (uuid, FK → profiles)
│   ├── car_id (uuid, FK → cars)
│   ├── rating (integer) ← 1-5
│   ├── comment (text)
│   ├── review_type (text) ← 'owner_to_renter' | 'renter_to_owner'
│   ├── is_published (boolean)
│   └── published_at (timestamptz)
│
└── exchange_rates
    ├── pair (text, PK) ← 'USDTARS'
    ├── binance_rate (numeric) ← De Binance API
    ├── platform_rate (numeric) ← binance_rate * 1.10 (margen 10%)
    ├── is_active (boolean)
    └── last_updated (timestamptz)

EDGE FUNCTIONS (Supabase)
├── mercadopago-create-booking-preference
│   └── Crea preferencia de pago en MercadoPago para bookings
│       ├── INPUT: { booking_id }
│       ├── PROCESO:
│       │   1. Valida booking (owner_id ≠ renter_id)
│       │   2. Obtiene exchange_rate de BD
│       │   3. Convierte total USD → ARS
│       │   4. Crea preferencia en MercadoPago
│       │   5. Guarda preference_id e init_point en booking
│       └── OUTPUT: { init_point, preference_id }
│
├── mercadopago-webhook
│   └── Procesa notificaciones IPN de MercadoPago
│       ├── INPUT: IPN de MercadoPago (payment.id, external_reference)
│       ├── PROCESO:
│       │   1. Verifica signature/autenticidad
│       │   2. Obtiene payment data de MercadoPago API
│       │   3. Identifica tipo (booking vs wallet deposit)
│       │   4. Si es booking:
│       │   │   - Actualiza booking.status → 'confirmed'
│       │   │   - Actualiza booking.paid_at
│       │   │   - Crea registro en payments
│       │   5. Si es wallet deposit:
│       │   │   - Llama wallet_confirm_deposit()
│       │   │   - Credita fondos al wallet
│       └── OUTPUT: 200 OK (idempotente)
│
└── confirm-and-release-funds
    └── Libera fondos bloqueados después de confirmación bilateral
        ├── INPUT: { booking_id }
        ├── PROCESO:
        │   1. Valida booking.status = 'completed'
        │   2. Verifica owner_confirmed_delivery = true
        │   3. Verifica renter_confirmed_payment = true
        │   4. Si hay daños (owner_damage_amount):
        │   │   - Deduce del depósito
        │   │   - Transfiere a owner
        │   5. Libera fondos restantes a renter
        │   6. Actualiza completion_status → 'funds_released'
        └── OUTPUT: { success, funds_released, message }

RPC FUNCTIONS (Postgres)
├── wallet_lock_funds(p_user_id, p_amount_cents, p_booking_id)
│   └── Bloquea fondos en wallet para booking con pago wallet
│
├── wallet_unlock_funds(p_booking_id)
│   └── Desbloquea fondos si booking se cancela o expira
│
├── wallet_initiate_deposit(p_user_id, p_amount_cents)
│   └── Crea transacción pending para depósito vía MercadoPago
│
└── wallet_confirm_deposit(p_transaction_id)
    └── Confirma depósito y credita fondos (llamado por webhook)
```

---

## 💳 Flujo de Pago con MercadoPago

### Secuencia Detallada

```
┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Usuario  │    │ Frontend  │    │   Edge   │    │  Mercado │    │ Supabase │
│ (Renter) │    │  Angular  │    │ Function │    │   Pago   │    │    DB    │
└────┬─────┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │                │                │               │               │
     │ 1. Hace clic   │                │               │               │
     │ "Pagar ahora"  │                │               │               │
     ├───────────────►│                │               │               │
     │                │                │               │               │
     │                │ 2. POST /functions/v1/         │               │
     │                │    mercadopago-create-booking- │               │
     │                │    preference                  │               │
     │                ├───────────────►│               │               │
     │                │                │               │               │
     │                │                │ 3. SELECT booking             │
     │                │                ├──────────────────────────────►│
     │                │                │◄──────────────────────────────┤
     │                │                │ { id, total_amount, renter... }
     │                │                │               │               │
     │                │                │ 4. SELECT exchange_rate       │
     │                │                ├──────────────────────────────►│
     │                │                │◄──────────────────────────────┤
     │                │                │ { platform_rate: 1015.0 }     │
     │                │                │               │               │
     │                │                │ 5. Convierte USD → ARS        │
     │                │                │ total_ars = 37 USD * 1015     │
     │                │                │           = $37,555 ARS       │
     │                │                │               │               │
     │                │                │ 6. POST /v1/preferences       │
     │                │                ├──────────────►│               │
     │                │                │               │               │
     │                │                │               │ Crea checkout │
     │                │                │               │ URL           │
     │                │                │◄──────────────┤               │
     │                │                │ { id, init_point }            │
     │                │                │               │               │
     │                │                │ 7. UPDATE booking SET         │
     │                │                │    mercadopago_preference_id, │
     │                │                │    mercadopago_init_point     │
     │                │                ├──────────────────────────────►│
     │                │                │◄──────────────────────────────┤
     │                │                │               │               │
     │                │ { init_point } │               │               │
     │                │◄───────────────┤               │               │
     │                │                │               │               │
     │◄───────────────┤                │               │               │
     │ Redirige a     │                │               │               │
     │ MercadoPago    │                │               │               │
     │                │                │               │               │
     ├────────────────────────────────────────────────►│               │
     │             Checkout MercadoPago                │               │
     │                                                  │               │
     │ 8. Usuario completa pago en ARS                 │               │
     │ (tarjeta, efectivo, Rapipago, etc.)             │               │
     ├─────────────────────────────────────────────────┤               │
     │                                                  │               │
     │                                                  │ 9. IPN        │
     │                                                  │ (webhook)     │
     │                                                  │ POST /webhook │
     │                │                │◄──────────────┤               │
     │                │                │               │               │
     │                │                │ 10. GET /v1/payments/{id}     │
     │                │                ├──────────────►│               │
     │                │                │◄──────────────┤               │
     │                │                │ { status: "approved",         │
     │                │                │   transaction_amount: 37555,  │
     │                │                │   external_reference: booking_id }
     │                │                │               │               │
     │                │                │ 11. UPDATE bookings SET       │
     │                │                │     status = 'confirmed',     │
     │                │                │     paid_at = NOW()           │
     │                │                ├──────────────────────────────►│
     │                │                │◄──────────────────────────────┤
     │                │                │               │               │
     │                │                │ 12. INSERT INTO payments      │
     │                │                ├──────────────────────────────►│
     │                │                │◄──────────────────────────────┤
     │                │                │               │               │
     │                │                │ 13. Response 200 OK           │
     │                │                ├──────────────►│               │
     │                │                │               │               │
     │                │                │               │ Redirige      │
     │◄──────────────────────────────────────────────┬─┤ back_urls     │
     │         Success URL                           │ │ (success)     │
     │         /bookings/{id}                        │ │               │
     │                                                │ │               │
     │ 14. Ve reserva confirmada                     │ │               │
     │                                                │ │               │
```

### Conversión de Moneda

**Ejemplo real:**

```
Booking Total: 37 USD
Exchange Rate (Binance): 923.18 ARS/USD
Platform Rate (10% margin): 1015.50 ARS/USD

Cálculo:
  37 USD × 1015.50 = 37,573.50 ARS

Usuario paga: $37,573.50 ARS
AutoRenta recibe: 37 USD en wallet interno
Margen de plataforma: 37 × (1015.50 - 923.18) = $3,415.84 ARS
```

**Actualización de cotización:**
- Cada hora: Cron job obtiene cotización de Binance
- Se almacena en tabla `exchange_rates`
- Frontend consume vía `ExchangeRateService`

---

## 🗄️ Base de Datos

### Tabla bookings - Esquema Completo

```sql
CREATE TABLE bookings (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renter_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),

  -- Estado de la reserva
  status booking_status NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'in_progress', 'completed',
    -- 'cancelled', 'expired', 'no_show'

  completion_status completion_status DEFAULT NULL,
    -- 'returned', 'pending_both', 'pending_owner',
    -- 'pending_renter', 'funds_released'

  -- Fechas
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 minutes',
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Pago
  payment_method TEXT, -- 'wallet' | 'credit_card'
  currency TEXT DEFAULT 'USD',
  total_amount NUMERIC(10, 2) NOT NULL,
  deposit_amount_cents INTEGER DEFAULT 25000, -- $250 USD

  -- Desglose de precio (JSON)
  breakdown JSONB,
  /* Estructura:
  {
    "days": 5,
    "nightly_rate_cents": 500,
    "subtotal_cents": 2500,
    "insurance_cents": 500,
    "fees_cents": 200,
    "discounts_cents": 0,
    "deposit_cents": 25000,
    "total_cents": 3200
  }
  */

  -- MercadoPago
  mercadopago_preference_id TEXT,
  mercadopago_init_point TEXT,

  -- Confirmación bilateral
  owner_confirmed_delivery BOOLEAN DEFAULT FALSE,
  renter_confirmed_payment BOOLEAN DEFAULT FALSE,
  owner_damage_amount NUMERIC(10, 2),
  owner_damage_description TEXT,

  -- Metadata
  metadata JSONB,
  cancellation_reason TEXT,

  -- Denormalización (copiado de cars)
  car_title TEXT,
  car_brand TEXT,
  car_model TEXT,
  car_year INTEGER,
  car_city TEXT,
  car_province TEXT,
  main_photo_url TEXT,

  -- Días calculados
  days_count INTEGER
);

-- Índices
CREATE INDEX idx_bookings_renter ON bookings(renter_id);
CREATE INDEX idx_bookings_car ON bookings(car_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_at, end_at);
CREATE INDEX idx_bookings_mercadopago
  ON bookings(mercadopago_preference_id)
  WHERE mercadopago_preference_id IS NOT NULL;
```

### Enums

```sql
-- Estados de booking
CREATE TYPE booking_status AS ENUM (
  'pending',      -- Esperando pago
  'confirmed',    -- Pago confirmado
  'in_progress',  -- Vehículo en uso
  'completed',    -- Completada
  'cancelled',    -- Cancelada
  'expired',      -- Expiró sin pago
  'no_show'       -- Usuario no se presentó
);

-- Estados de completación
CREATE TYPE completion_status AS ENUM (
  'returned',         -- Owner marcó como devuelto
  'pending_both',     -- Ambos deben confirmar
  'pending_owner',    -- Falta confirmación del owner
  'pending_renter',   -- Falta confirmación del renter
  'funds_released'    -- Fondos liberados
);
```

### Triggers

```sql
-- Auto-calcular días de reserva
CREATE OR REPLACE FUNCTION calculate_booking_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_count := EXTRACT(DAY FROM (NEW.end_at - NEW.start_at)) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_days
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_days();

-- Auto-expirar bookings pendientes
-- (ejecutar vía cron cada 5 minutos)
CREATE OR REPLACE FUNCTION expire_pending_bookings()
RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 🔌 Integraciones

### MercadoPago

**Configuración:**
- **Access Token**: Configurado en Edge Function (variable de entorno)
- **Webhook URL**: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
- **Modo**: Producción (requiere certificación de MercadoPago)

**Eventos IPN Procesados:**
- `payment.created` - Pago creado
- `payment.updated` - Pago actualizado (approved/rejected)

**External Reference:**
```
Format: booking_id
Example: "550e8400-e29b-41d4-a716-446655440000"

Se usa para vincular pago con booking en webhook
```

### Supabase Realtime (Futuro)

**Canales planificados:**
- `bookings` - Notificaciones de cambios en reservas
- `messages` - Chat en tiempo real
- `reviews` - Notificaciones de nuevas reviews

### Email (Futuro - Resend/SendGrid)

**Emails planificados:**
- Booking created (pending payment)
- Payment confirmed
- Booking starting in 24h (reminder)
- Booking completed (request review)
- Review published

---

## 📱 Responsive Design

El sistema de reservas está optimizado para:
- 📱 **Mobile**: Flujo simplificado, pago móvil MercadoPago
- 💻 **Desktop**: Vista completa con detalles y chat
- 🌙 **Dark Mode**: Soporte completo con Tailwind dark:

---

## 🔒 Seguridad

### Row Level Security (RLS)

```sql
-- Usuarios solo ven sus propias reservas
CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (
  auth.uid() = renter_id OR
  auth.uid() IN (SELECT owner_id FROM cars WHERE id = car_id)
);

-- Solo el renter puede crear booking
CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = renter_id);

-- Solo el renter puede cancelar (si pending)
CREATE POLICY "Renters can cancel pending bookings"
ON bookings FOR UPDATE
USING (
  auth.uid() = renter_id AND
  status = 'pending'
);
```

### Validaciones Backend

**Edge Function - mercadopago-create-booking-preference:**
```typescript
// ✅ Validaciones implementadas
1. Usuario autenticado
2. Booking existe
3. Renter es el usuario actual (auth.uid = booking.renter_id)
4. Owner ≠ Renter (no self-booking)
5. Booking status = 'pending'
6. Total amount > 0
7. Exchange rate válido
```

**Edge Function - mercadopago-webhook:**
```typescript
// ✅ Validaciones implementadas
1. Signature de MercadoPago válida
2. Payment ID existe en MercadoPago
3. Status = 'approved' para confirmar
4. External reference válido
5. Idempotencia (no procesar 2 veces el mismo payment)
```

---

## 🚀 Mejoras Futuras

### Corto Plazo (MVP+)
- [ ] Notificaciones push (Supabase Realtime)
- [ ] Email confirmaciones (Resend/SendGrid)
- [ ] Historial de mensajes paginado
- [ ] Upload de fotos en chat (evidencia de daños)

### Mediano Plazo
- [ ] Cancelación con política de reembolso
- [ ] Modificación de reservas (cambio de fechas)
- [ ] Seguro premium opcional
- [ ] Multi-moneda (USD, ARS, EUR)

### Largo Plazo
- [ ] Instant booking (sin confirmación owner)
- [ ] Dynamic pricing (precios basados en demanda)
- [ ] Loyalty program (descuentos frecuentes)
- [ ] Referral system (invita amigos)

---

## 📞 Soporte y Contacto

**Issues de GitHub:**
- Reportar bugs en `ISSUES.md`
- Pull requests bienvenidos

**Documentación adicional:**
- `CLAUDE.md` - Guía completa del proyecto
- `WALLET_SYSTEM_DOCUMENTATION.md` - Sistema de wallet
- `PHOTO_UPLOAD_AUDIT.md` - Debugging RLS storage

---

**Última actualización:** 2025-10-23
**Versión:** 1.0
**Autor:** AutoRenta Team + Claude Code
