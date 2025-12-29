# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack Tecnológico

**Frontend:** Angular 20 (Standalone), Ionic 8, Capacitor 7, TailwindCSS, Three.js, Mapbox GL
**Backend:** Supabase (PostgreSQL), Supabase Auth, Deno Edge Functions
**Payments:** MercadoPago SDK v2 (Checkout Bricks), PayPal REST API

---

## Comandos de Desarrollo

```bash
# Development
pnpm dev                            # Dev server (apps/web)
pnpm dev:web                        # Web dev server only
pnpm build                          # Production build
pnpm lint                           # Lint all

# Unit Tests (Vitest)
pnpm test:unit                      # Run unit tests
pnpm test:unit:watch                # Watch mode
pnpm test:unit:coverage             # With coverage
pnpm --dir apps/web run test:unit   # Frontend tests only

# E2E Tests (Playwright)
pnpm test:e2e                       # All E2E tests
pnpm test:e2e:headed                # With browser visible
pnpm test:e2e:debug                 # Debug mode
pnpm test:e2e:booking               # Booking flow only
pnpm test:e2e:wallet                # Wallet tests only
pnpm test:e2e:report                # Show report

# Deploy
pnpm build && CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
  npx wrangler pages deploy dist/web/browser --project-name=autorentar --commit-dirty=true

# Supabase
supabase functions deploy <function-name>
supabase functions logs <function-name> --follow
supabase gen types typescript --project-id obxvffplochgeiclibng \
  > apps/web/src/app/core/models/supabase.types.generated.ts

# Database (Production)
PGPASSWORD='Ab.12345' psql -h aws-1-sa-east-1.pooler.supabase.com -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx -d postgres
```

---

## Reglas de Desarrollo

### REGLA CRÍTICA: Modificar SOLO lo solicitado
- **SOLO lo pedido:** Modificar ÚNICAMENTE lo que el usuario solicita explícitamente
- **Cambios quirúrgicos:** Limitar cambios al mínimo necesario
- **Preguntar si hay ambigüedad:** Si no está claro el alcance, preguntar antes de modificar

### UI/UX
- **NO WIZARDS:** Prohibidos los step-by-step wizards
- **NO MODALS:** Prohibidos los modales/dialogs
- **NO COMPONENTES HUÉRFANOS:** Todo componente DEBE estar integrado (rutas o templates)

### Código Angular
- **Signals > BehaviorSubject:** Usar signals para estado reactivo
- **OnPush obligatorio:** Todos los componentes con `ChangeDetectionStrategy.OnPush`
- **LoggerService:** Usar LoggerService, NO console.log en producción
- **Standalone only:** No usar NgModules, solo standalone components

### Seguridad
- **RLS obligatorio:** Toda tabla nueva requiere políticas RLS en Supabase
- **No secrets en código:** Usar environment variables o Supabase secrets

### Git
- **Commits:** `feat|fix|chore|refactor: descripción concisa`
- **Branch:** `feature/nombre`, `fix/nombre`, `chore/nombre`

---

## Arquitectura

### Estructura del Frontend (`apps/web/src/app/`)

```
app/
├── core/                    # Singleton services, guards, interceptors
│   ├── services/           # Business logic (auth, fx, wallet, etc.)
│   ├── guards/             # Route guards
│   ├── interceptors/       # HTTP interceptors
│   ├── models/             # TypeScript interfaces & Supabase types
│   └── constants/          # App-wide constants
├── features/               # Feature modules (lazy-loaded)
│   ├── admin/             # Admin dashboard
│   ├── auth/              # Login, register, password reset
│   ├── bookings/          # Booking flow, payment, confirmation
│   ├── cars/              # Car listing, detail, search
│   ├── dashboard/         # User dashboard
│   ├── marketplace/       # Car marketplace/search
│   ├── profile/           # User profile management
│   ├── wallet/            # Wallet, deposits, transactions
│   └── ...                # Other features
├── shared/                 # Reusable components, pipes, directives
└── app.routes.ts          # Main routing configuration
```

### Supabase Edge Functions (`supabase/functions/`)

Key functions:
- `mercadopago-process-booking-payment` - Main payment processing with split payments
- `mercadopago-process-deposit-payment` - Wallet deposits
- `mercadopago-webhook` - Payment status webhooks
- `dashboard-stats` - Analytics aggregation
- `generate-car-images` - AI car image generation

---

## Patrones Clave

### 1. Dual FX Rate System
Dos tasas simultáneas: **Binance Rate** (sin margen, alquiler) + **Platform Rate** (+10%, garantías)

```typescript
interface DualRateFxSnapshot {
  binanceRate: number;    // Raw Binance (alquiler)
  platformRate: number;   // Binance + 10% (garantía)
}
```

### 2. Price Lock (15 min)
El precio se bloquea durante 15 minutos al iniciar checkout. Backend valida expiración antes de procesar pago.

### 3. Wallet Dual Lock
```typescript
// Lock rental + deposit en una operación atómica
await supabase.rpc('wallet_lock_rental_and_deposit', {
  p_booking_id, p_rental_amount, p_deposit_amount
});

// Completar booking (libera fondos según estado)
await supabase.rpc('wallet_complete_booking', { p_booking_id });
```

### 4. MercadoPago Split Payment
```typescript
// 15% platform fee automático
const paymentPayload = {
  transaction_amount: amount,
  marketplace_fee: amount * 0.15,
  collector_id: owner.mercadopago_collector_id,
  external_reference: booking_id
};
```

### 5. Confirmación Bilateral
Owner y Renter confirman finalización. Fondos se liberan solo cuando ambos confirman.

---

## SQL Functions Importantes (RPC)

| Function | Descripción |
|----------|-------------|
| `wallet_lock_rental_and_deposit` | Bloquea fondos para alquiler y depósito |
| `wallet_complete_booking` | Libera fondos al completar booking |
| `get_available_cars` | Búsqueda de autos con filtros y distancia |
| `calculate_bonus_malus` | Calcula factor de precio por historial |
| `booking_confirm_and_release` | Confirmación bilateral de booking |

---

## Services Principales

| Service | Ubicación | Propósito |
|---------|-----------|-----------|
| `AuthService` | `core/services/auth/` | Autenticación Supabase |
| `FxService` | `core/services/fx.service.ts` | Tasas de cambio (Binance + Platform) |
| `WalletService` | `core/services/wallet/` | Operaciones de wallet |
| `BookingService` | `core/services/booking/` | Gestión de reservas |
| `LoggerService` | `core/services/infrastructure/` | Logging con Sentry |
| `AnalyticsService` | `core/services/infrastructure/` | GA4 + Supabase events |

---

## Testing

### Unit Tests (Vitest)
- Config: `apps/web/vitest.config.ts`
- Setup: `apps/web/src/test/vitest.setup.ts`

### E2E Tests (Playwright)
- Config: `playwright.config.ts`
- Tests: `tests/` directory
- Use `data-testid` attributes for selectors

---

## Environment Variables

Frontend (Cloudflare Pages):
- `NG_APP_SUPABASE_ANON_KEY`
- `NG_APP_MAPBOX_ACCESS_TOKEN`
- `NG_APP_GOOGLE_AI_IMAGE_URL`

Supabase Functions:
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

**Proyecto:** AutoRenta - Plataforma P2P de alquiler de autos
**Monorepo:** pnpm workspaces
