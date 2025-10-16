# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutorentA is a car rental marketplace MVP for Argentina built with Angular 17 (standalone components), Supabase, and Cloudflare Workers/Pages. The project consists of a web application and a payment webhook worker.

## Repository Structure

```
autorenta/
  apps/
    web/                         # Angular 17 standalone app with Tailwind
      src/app/
        core/                    # Core services, guards, interceptors, models
          guards/                # AuthGuard for route protection
          interceptors/          # supabaseAuthInterceptor for JWT handling
          models/                # TypeScript interfaces (User, Car, Booking, Payment)
          services/              # Business logic services
            supabase-client.service.ts  # Centralized Supabase client
            auth.service.ts      # Authentication operations
            cars.service.ts      # Car CRUD operations
            bookings.service.ts  # Booking management
            payments.service.ts  # Payment intent handling
            admin.service.ts     # Admin operations
        features/                # Feature modules (lazy-loaded)
          auth/                  # Login, register, reset-password pages
          cars/                  # List, detail, publish, my-cars pages
          bookings/              # Booking management pages
          admin/                 # Admin dashboard
        shared/                  # Shared components, pipes, utils
          components/            # car-card, city-select, date-range-picker, upload-image
          pipes/
          utils/
  functions/
    workers/
      payments_webhook/          # Cloudflare Worker for payment webhooks
        src/index.ts             # Mock payment webhook handler
```

## Common Commands

### Angular Web App (from `apps/web/`)

**Development:**
```bash
npm run start              # Dev server at http://localhost:4200
npm run build              # Production build to dist/autorenta-web
npm run lint               # ESLint with Angular ESLint (flat config)
npm run format             # Prettier with cache
npm run test               # Karma/Jasmine unit tests
```

**Deployment:**
```bash
npm run deploy:pages       # Build + deploy to Cloudflare Pages
```

**Worker shortcuts (from web app root):**
```bash
npm run worker:dev         # Start payments webhook worker locally
npm run worker:deploy      # Deploy payments webhook worker
```

### Payments Webhook Worker (from `functions/workers/payments_webhook/`)

```bash
npm install                # Install dependencies
npm run dev                # Wrangler dev at http://localhost:8787/webhooks/payments
npm run build              # TypeScript build to dist/
npm run deploy             # Deploy to Cloudflare Workers
```

**Set worker secrets:**
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Architecture Patterns

### Angular Architecture

- **Standalone Components**: All components are standalone, no NgModules
- **Lazy Loading**: Features are lazy-loaded via route configuration (`loadComponent`, `loadChildren`)
- **Route Guards**: `AuthGuard` (CanMatchFn) protects authenticated routes (`/cars/publish`, `/bookings`, `/admin`)
- **HTTP Interceptor**: `supabaseAuthInterceptor` attaches JWT tokens to outgoing HTTP requests
- **Dependency Injection**: `injectSupabase()` provides direct access to Supabase client

### State Management

- **Supabase Client**: Centralized in `SupabaseClientService` with session persistence and auto-refresh
- **Services**: Business logic encapsulated in dedicated services (Auth, Cars, Bookings, Payments, Admin)
- **No state library**: Uses RxJS observables and Angular signals for reactivity

### Authentication Flow

1. User logs in via `AuthService.login()` → Supabase Auth
2. Session persisted automatically by Supabase client
3. `AuthGuard` checks `AuthService.isAuthenticated()` on protected routes
4. `supabaseAuthInterceptor` adds JWT to API requests

### User Roles

- **locador**: Car owner (can publish cars)
- **locatario**: Renter (can book cars)
- **ambos**: Both owner and renter
- **Admin**: `is_admin` flag in profile (access to `/admin`)

### Supabase Integration

**Tables:**
- `profiles`: User profile with role and admin flag
- `cars`: Car listings with status (draft, pending, active, suspended)
- `car_photos`: Car images stored in Supabase Storage
- `bookings`: Rental bookings with status tracking
- `payments`: Payment records linked to bookings
- `payment_intents`: Payment provider intents

**RPC Functions:**
- `request_booking`: Creates booking with validation

### Payment Webhook Worker

- **Mock Implementation**: Simulates payment provider webhooks
- **Endpoint**: `POST /webhooks/payments`
- **Payload**: `{ provider: 'mock', booking_id: string, status: 'approved' | 'rejected' }`
- **Logic**: Updates `payments`, `bookings`, and `payment_intents` tables based on webhook status
- **TODO**: Add KV Namespace for idempotency (commented out in code)

## Code Quality Tools

### ESLint Configuration (Flat Config)

- **Angular ESLint**: Rules for components and templates
- **TypeScript ESLint**: Strict type checking
- **Import Plugin**: Enforces import order (alphabetized, grouped by type)
- **Explicit return types**: Required on all functions
- **Unused variables**: Errors except args prefixed with `_`

### Prettier

- **Print width**: 100
- **Single quotes**: Enabled
- **Angular HTML**: Custom parser for templates
- **Plugin**: `prettier-plugin-organize-imports` for auto-import sorting

### Husky + lint-staged

- **Pre-commit**: Runs Prettier and ESLint on staged files
- **Setup**: `npm run prepare` installs Husky hooks

## Environment Variables

**Angular (`.env.development.local`):**
```bash
NG_APP_SUPABASE_URL=            # Supabase project URL
NG_APP_SUPABASE_ANON_KEY=       # Supabase anon/public key
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
```

**Cloudflare Worker (via `wrangler secret`):**
```bash
SUPABASE_URL=                   # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (admin)
```

## Key Design Decisions

1. **Standalone Components**: Simplifies architecture, aligns with Angular's modern direction
2. **Flat ESLint Config**: Uses new flat config format (eslint.config.mjs)
3. **Mock Payment Provider**: Simplifies MVP development, ready for Mercado Pago integration
4. **Role-based Access**: Single user table with role field instead of separate tables
5. **Cloudflare Pages**: Static hosting with edge performance
6. **Cloudflare Workers**: Serverless webhook handling without backend server

## Future Enhancements (from README)

1. Add KV Namespace to Worker for webhook idempotency
2. Replace mock payment with Mercado Pago integration
3. Add unit/E2E tests per module
4. Implement Supabase Realtime for booking notifications
5. Add identity verification for car owners

## Development Workflow

1. **Start local dev**:
   ```bash
   cd apps/web && npm run start
   cd ../../functions/workers/payments_webhook && npm run dev
   ```

2. **Before committing**: Husky runs Prettier + ESLint automatically

3. **Testing booking flow**:
   - Select car on `/cars` page
   - Login/register via `/auth/login`
   - Request booking (creates payment intent)
   - Simulate webhook via `POST http://localhost:8787/webhooks/payments`

4. **Deploy**:
   - **Web**: `cd apps/web && npm run deploy:pages` (or via Cloudflare Pages dashboard)
   - **Worker**: `cd functions/workers/payments_webhook && npm run deploy`
