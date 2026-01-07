# Bookings System Architecture

## Overview

El sistema de Bookings de AutoRenta utiliza una arquitectura de capas con Angular 17+ en el frontend, Supabase como backend, y Edge Functions para logica de negocio critica.

## Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Angular 17+)"]
        UI[Pages & Components]
        Signals[Angular Signals]
        Services[Core Services]
    end

    subgraph Backend["Backend Services"]
        BS[BookingsService]
        BRS[BookingRealtimeService]
        BSM[BookingStateMachineService]
        BCS[BookingConfirmationService]
        BWS[BookingWalletService]
        BNS[BookingNotificationsService]
        MPG[MercadoPagoGateway]
    end

    subgraph Supabase["Supabase"]
        RT[Realtime WebSocket]
        RPC[RPC Functions]
        DB[(PostgreSQL)]
    end

    subgraph Edge["Edge Functions"]
        MP1[mercadopago-create-preference]
        MP2[mercadopago-process-payment]
        MP3[mercadopago-webhook]
        PDF[generate-contract-pdf]
        EMAIL[send-reminder-email]
    end

    UI --> Signals
    Signals --> Services
    Services --> BS
    BS --> BRS
    BS --> BSM
    BS --> BCS
    BS --> BWS
    BS --> BNS
    BS --> MPG

    BRS --> RT
    BS --> RPC
    MPG --> Edge

    RPC --> DB
    RT --> DB
    Edge --> DB
```

## Layer Responsibilities

### 1. Frontend Layer

| Component | Location | Responsibility |
|-----------|----------|----------------|
| Booking Pages | `apps/web/src/app/features/bookings/` | User interface, routing |
| Wizard Steps | `features/bookings/components/` | Multi-step booking creation |
| Shared Components | `app/shared/components/` | Reusable UI elements |

### 2. Services Layer

| Service | File | Responsibility |
|---------|------|----------------|
| `BookingsService` | `bookings.service.ts` | CRUD operations, main orchestrator |
| `BookingRealtimeService` | `booking-realtime.service.ts` | WebSocket subscriptions |
| `BookingStateMachineService` | `booking-state-machine.service.ts` | State transitions, FSM |
| `BookingConfirmationService` | `booking-confirmation.service.ts` | Bilateral confirmation flow |
| `BookingWalletService` | `booking-wallet.service.ts` | Wallet/deposit operations |
| `BookingFlowService` | `booking-flow.service.ts` | Complex workflow orchestration |
| `BookingNotificationsService` | `booking-notifications.service.ts` | Notification management |
| `MercadoPagoGateway` | `mercadopago-booking-gateway.service.ts` | Payment integration |

### 3. Supabase Layer

| Component | Purpose |
|-----------|---------|
| PostgreSQL | Data persistence |
| Realtime | WebSocket connections for live updates |
| RPC Functions | Server-side business logic |
| Row Level Security | Authorization |

### 4. Edge Functions

| Function | Purpose |
|----------|---------|
| `mercadopago-create-booking-preference` | Create payment preference |
| `mercadopago-process-booking-payment` | Process card payments |
| `mercadopago-webhook` | Handle IPN notifications |
| `generate-booking-contract-pdf` | PDF generation |
| `send-booking-reminder-email` | Email notifications |

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Services
    participant R as Realtime
    participant DB as Database
    participant E as Edge Functions
    participant MP as MercadoPago

    U->>F: Create Booking
    F->>S: BookingsService.createBookingAtomic()
    S->>DB: RPC: create_booking_atomic
    DB-->>S: Booking Created
    S-->>F: Return Booking

    U->>F: Pay Booking
    F->>S: MercadoPagoGateway.createPreference()
    S->>E: Edge: mercadopago-create-preference
    E->>MP: Create Preference
    MP-->>E: Preference URL
    E-->>S: Return init_point
    S-->>F: Redirect to MercadoPago

    MP->>E: Webhook: Payment Completed
    E->>DB: Update booking status
    DB->>R: Realtime: booking changed
    R->>F: Push update
    F->>U: Show confirmation
```

## Service Dependencies

```mermaid
graph LR
    BS[BookingsService] --> BRS[BookingRealtimeService]
    BS --> BSM[BookingStateMachineService]
    BS --> BCS[BookingConfirmationService]
    BS --> BWS[BookingWalletService]
    BS --> BNS[BookingNotificationsService]
    BS --> MPG[MercadoPagoGateway]
    BS --> BVS[BookingValidationService]
    BS --> BAS[BookingApprovalService]
    BS --> BCOS[BookingCompletionService]
    BS --> BCAS[BookingCancellationService]
    BS --> BES[BookingExtensionService]
    BS --> BDS[BookingDisputeService]
    BS --> BIHS[BookingInsuranceHelperService]

    BRS --> RCS[RealtimeConnectionService]
    BWS --> WS[WalletService]
    MPG --> FXS[FxService]
```

## Key Files

```
apps/web/src/app/
├── features/bookings/
│   ├── bookings.routes.ts           # Route definitions
│   ├── pages/booking-wizard/        # 6-step wizard
│   ├── pages/booking-checkout/      # Payment flow
│   ├── booking-detail/              # Booking details
│   ├── booking-detail-payment/      # Pre-auth/guarantee
│   ├── booking-success/             # Payment confirmation
│   ├── check-in/                    # Renter inspection
│   ├── check-out/                   # Return inspection
│   ├── my-bookings/                 # User's bookings
│   └── owner-bookings/              # Owner's bookings
│
├── core/services/bookings/
│   ├── bookings.service.ts          # 1,174 lines
│   ├── booking-realtime.service.ts  # 320 lines
│   ├── booking-flow.service.ts      # 22,798 lines
│   ├── booking-state-machine.service.ts
│   ├── booking-confirmation.service.ts
│   ├── booking-wallet.service.ts
│   └── booking-notifications.service.ts
│
└── core/services/payments/
    └── mercadopago-booking-gateway.service.ts

supabase/functions/
├── mercadopago-create-booking-preference/
├── mercadopago-process-booking-payment/
├── mercadopago-webhook/
├── generate-booking-contract-pdf/
└── send-booking-reminder-email/
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | Angular 17+ |
| UI Framework | Ionic 8 |
| Styling | Tailwind CSS |
| State Management | Angular Signals |
| Backend | Supabase (PostgreSQL + Realtime) |
| Edge Functions | Deno (TypeScript) |
| Payments | MercadoPago SDK |
| PDF Generation | PDFKit |
| Email | Resend |
