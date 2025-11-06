# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**AutoRenta** is a car rental marketplace MVP for Argentina built with:
- **Frontend**: Angular 20 (standalone components), Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Infrastructure**: Cloudflare Pages (web) + Cloudflare Workers (webhooks)
- **Payments**: MercadoPago (deposits, withdrawals, preauthorizations)
- **Package Manager**: pnpm (primary), npm (fallback)

## Common Commands

### Root-Level Workflows (from `/home/edu/autorenta`)

**Quick Start:**
```bash
npm run workflows           # Show all available workflows
npm run dev                 # Start web + worker in background
npm run ci                  # Full CI/CD pipeline (lint + test + build)
npm run deploy              # Deploy to production (web + worker)
```

**Development:**
```bash
npm run dev:web             # Angular dev server (localhost:4200)
npm run dev:worker          # Payment webhook worker (localhost:8787)
```

**Testing:**
```bash
npm run test                # Angular unit tests (watch mode)
npm run test:quick          # Quick tests (no coverage, headless)
npm run test:coverage       # Full test suite with coverage
npm run lint                # ESLint check
npm run lint:fix            # Auto-fix linting + formatting issues
```

**Build:**
```bash
npm run build               # Build Angular app
npm run build:web           # Same as above
```

**Deploy:**
```bash
npm run deploy:web          # Deploy to Cloudflare Pages
npm run deploy:worker       # Deploy payment webhook worker
```

**Utilities:**
```bash
npm run install:all         # Install deps for all workspaces
npm run sync:types          # Sync TypeScript types from Supabase schema
npm run sync:types:remote   # Sync from remote Supabase instance
```

### Angular Web App (from `apps/web/`)

```bash
npm run start               # Dev server with env loading
npm run build               # Production build
npm run lint                # ESLint
npm run format              # Prettier formatting
npm run test                # Karma/Jasmine unit tests
npm run deploy:pages        # Build + deploy to Cloudflare Pages
```

**Run single test file:**
```bash
# Karma doesn't support single file by default, use test.ts imports
# Or filter by describe/it name in browser
npm run test                # Then click on specific test in browser
```

### Cloudflare Workers (from `functions/workers/payments_webhook/`)

```bash
npm install                 # Install worker dependencies
npm run dev                 # Wrangler dev server (localhost:8787)
npm run build               # TypeScript build
npm run deploy              # Deploy to Cloudflare Workers

# Manage secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put MERCADOPAGO_ACCESS_TOKEN

# View logs
wrangler tail payments_webhook
```

### Supabase Edge Functions

**MercadoPago Preauthorization (CRITICAL for current task):**
```bash
# Serve locally (requires Supabase CLI)
supabase functions serve mp-create-preauth --env-file supabase/.env.local

# Deploy to production
supabase functions deploy mp-create-preauth --project-ref obxvffplochgeiclibng

# Invoke manually (testing)
supabase functions invoke mp-create-preauth \
  --no-verify-jwt \
  --data '{"intent_id":"...","user_id":"...","amount_ars":1000,"amount_usd":10,"card_token":"...","payer_email":"test@test.com"}'

# Set secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN
```

**Other Edge Functions:**
```bash
supabase functions serve mercadopago-webhook
supabase functions serve mercadopago-create-preference
supabase functions serve mercadopago-create-booking-preference
```

### Database Migrations

```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Apply to remote (production)
supabase db push --db-url postgresql://postgres:...

# Generate migration from diff
supabase db diff

# View migration status
supabase migration list
```

**Direct PostgreSQL:**
```bash
# Apply migration file manually
PGPASSWORD="..." psql "postgresql://..." -f database/migrations/XXX-migration.sql
```

### E2E Tests (Playwright)

```bash
# From root directory
cd e2e
python3 test_booking_flow.py              # Full booking flow test

# Or using Playwright directly (if configured)
npx playwright test                        # Run all tests
npx playwright test --ui                   # UI mode
npx playwright test -g "booking"           # Filter by test name
npx playwright test e2e/test_booking_flow.spec.ts  # Single file
```

## High-Level Architecture

### Monorepo Structure

```
autorenta/
├── apps/web/                      # Angular 20 app (standalone components)
│   ├── src/app/
│   │   ├── core/                  # Services, guards, interceptors, models
│   │   │   ├── services/          # Business logic (auth, cars, bookings, payments, wallet)
│   │   │   ├── guards/            # AuthGuard (CanMatchFn)
│   │   │   ├── interceptors/      # supabaseAuthInterceptor (JWT)
│   │   │   └── models/            # TypeScript interfaces
│   │   ├── features/              # Lazy-loaded feature modules
│   │   │   ├── auth/              # Login, register, reset-password
│   │   │   ├── cars/              # List, detail, publish, my-cars
│   │   │   ├── bookings/          # Booking management
│   │   │   ├── wallet/            # Wallet, deposits, withdrawals
│   │   │   ├── profile/           # User profile management
│   │   │   └── admin/             # Admin dashboard
│   │   └── shared/                # Shared components, pipes, utils
│   └── database/                  # Legacy SQL scripts (migrate to supabase/migrations)
├── functions/workers/             # Cloudflare Workers
│   ├── payments_webhook/          # Payment webhook handler (mock + real)
│   ├── doc-verifier/              # Document verification worker
│   └── ai-car-generator/          # AI car description generator
├── supabase/
│   ├── functions/                 # Supabase Edge Functions (Deno)
│   │   ├── mp-create-preauth/     # ⭐ MercadoPago preauthorization (capture=false)
│   │   ├── mercadopago-webhook/   # IPN webhook handler
│   │   ├── mercadopago-create-preference/  # Deposit preferences
│   │   ├── mercadopago-create-booking-preference/  # Booking payment
│   │   └── _shared/               # Shared utilities
│   └── migrations/                # Database migrations (numbered)
├── database/                      # Database scripts and documentation
│   ├── migrations/                # Official migrations (apply in order)
│   └── seed-data/                 # Test data
├── e2e/                           # End-to-end tests (Python + Playwright)
├── docs/                          # Additional documentation
└── tools/                         # CLI utilities and workflows
```

### Key Systems

#### Authentication & Authorization
- **Auth**: Supabase Auth with JWT tokens
- **Roles**: `locador` (owner), `locatario` (renter), `ambos` (both), `is_admin` flag
- **Guards**: `AuthGuard` protects routes (`/cars/publish`, `/bookings`, `/admin`)
- **Interceptor**: `supabaseAuthInterceptor` attaches JWT to HTTP requests

#### User Flow
1. User registers/logs in → Supabase Auth
2. Session persisted automatically
3. User publishes car (if locador) or books car (if locatario)
4. Payment handled via wallet (deposits) or preauthorization (bookings)

#### Wallet System (Dual Architecture - Migration in Progress)

**Legacy System (⚠️ DEPRECATED):**
- Table: `wallet_transactions`
- Status: 96 historical transactions
- Usage: Read-only, DO NOT use for new code

**New System (✅ ACTIVE):**
- Table: `wallet_ledger` (double-entry bookkeeping)
- Table: `wallet_transfers` (P2P transfers)
- View: `v_wallet_history` (unified view of both systems)
- RPC Functions:
  - `wallet_initiate_deposit()` - Create pending deposit
  - `wallet_confirm_deposit()` - Confirm and credit funds (called by webhook)
  - `wallet_get_balance()` - Get user balance
  - `wallet_lock_funds()` - Lock funds for booking
  - `wallet_unlock_funds()` - Release locked funds
  - `transfer_between_users()` - P2P transfers
  - `get_user_balance_from_ledger()` - Balance from ledger

**Wallet Account Numbers:**
- Format: `AR` + 14 digits (e.g., `AR12345678901234`)
- Auto-assigned on wallet creation
- Search users via `search_users_by_wallet_number()`

#### Payment Systems

**1. Wallet Deposits (MercadoPago Preference API):**
- User initiates deposit → `wallet_initiate_deposit()`
- Frontend calls Edge Function `mercadopago-create-preference`
- User redirected to MercadoPago → Completes payment
- MercadoPago sends IPN → `mercadopago-webhook` Edge Function
- Webhook calls `wallet_confirm_deposit()` → Credits funds

**2. MercadoPago Preauthorizations (⭐ CURRENT FOCUS):**

**Purpose**: Hold funds for booking guarantee without immediate charge.

**Key Files:**
- **Migration**: `supabase/migrations/20251024_payment_intents_preauth.sql`
- **Edge Function**: `supabase/functions/mp-create-preauth/index.ts`
- **Frontend Service**: `apps/web/src/app/core/services/payment-authorization.service.ts`
- **DB Table**: `payment_intents`

**Flow:**
1. User initiates booking → Frontend calls `create_payment_authorization()` RPC
2. RPC creates `payment_intent` with status `pending`
3. Frontend calls Edge Function `mp-create-preauth` with card token
4. Edge Function calls MercadoPago API with `capture: false` (CRITICAL)
5. MercadoPago authorizes (holds) funds → Returns `status: 'authorized'`
6. Edge Function updates `payment_intent`:
   - `status` = `'authorized'`
   - `mp_payment_id` = MP payment ID
   - `preauth_expires_at` = now + 7 days
7. When booking confirmed → Call capture endpoint (TODO: implement)
8. When booking cancelled → Call cancel endpoint (TODO: implement)

**Payment Intent States:**
- `pending` - Created, waiting for authorization
- `authorized` - Funds held (7-day expiry)
- `captured` - Preauth captured (funds charged)
- `cancelled` - Preauth cancelled (funds released)
- `expired` - Preauth expired (7 days passed)
- `approved` - Direct charge (non-preauth)
- `rejected` - Payment rejected
- `failed` - Technical error

**⚠️ CRITICAL Implementation Notes:**
- `capture: false` creates hold (authorization), NOT a charge
- Authorizations expire after 7 days automatically
- Must call MercadoPago capture API before expiry to charge
- Cancel endpoint releases funds immediately
- Webhook integration needed to track status changes from MercadoPago side

**TODO (for Claude/Warp to complete):**
- [ ] Implement capture endpoint (Edge Function or Worker)
- [ ] Implement cancel endpoint (Edge Function or Worker)
- [ ] Handle MercadoPago webhook events for preauth status changes
- [ ] Update `payment_intents` and `wallet_ledger` on capture/cancel
- [ ] Add expiry monitoring (cron job to mark expired preauths)
- [ ] Frontend UI to capture/cancel preauths from admin/booking detail
- [ ] E2E tests for full preauth lifecycle

#### Exchange Rates
- Table: `exchange_rates`
- Source: Binance API (USDTARS)
- Margin: 10%-20% platform fee
- Auto-update via Edge Function `sync-binance-rates`
- Current rate: ~1748 ARS/USD (as of 2025-10-22)

#### Storage (Supabase Storage)

**Buckets:**
- `avatars` (public) - User profile photos
- `car-images` (public) - Car listing photos
- `documents` (private) - Verification documents

**⚠️ CRITICAL Path Convention:**
- **NEVER** include bucket name in storage path
- RLS policies expect first folder = `user_id`
- Example:
  ```typescript
  // ✅ CORRECT
  const path = `${userId}/${filename}`;
  await supabase.storage.from('avatars').upload(path, file);

  // ❌ WRONG (RLS will fail)
  const path = `avatars/${userId}/${filename}`;
  ```

**Path Patterns:**
- `avatars`: `{user_id}/{filename}`
- `car-images`: `{user_id}/{car_id}/{filename}`
- `documents`: `{user_id}/{document_type}/{filename}`

#### Database Schema (Key Tables)

**Users & Profiles:**
- `auth.users` - Supabase auth (managed by Supabase)
- `profiles` - User profile (role, admin flag, wallet_account_number, avatar_url)

**Cars:**
- `cars` - Car listings (status: draft, pending, active, suspended)
- `car_photos` - Car images (linked to Supabase Storage)
- `car_brands`, `car_models` - Normalized car data

**Bookings:**
- `bookings` - Rental bookings (status tracking, deposit amounts)
- `payment_intents` - ⭐ Payment authorizations and charges
- `payments` - Payment records (legacy, may deprecate)

**Wallet:**
- `user_wallets` - User balance and locked funds
- `wallet_ledger` - ✅ Double-entry ledger (NEW)
- `wallet_transactions` - ⚠️ DEPRECATED (legacy)
- `wallet_transfers` - P2P transfers
- `v_wallet_history` - Unified view (reads from both systems)

**Exchange Rates:**
- `exchange_rates` - USDTARS rates with margin

### Angular Architecture Patterns

**Standalone Components:**
- All components are standalone (no NgModules)
- Lazy loading via route configuration (`loadComponent`, `loadChildren`)

**Dependency Injection:**
- Services via `inject()` function (modern DI)
- `injectSupabase()` for direct Supabase client access

**State Management:**
- RxJS observables for async data
- Angular signals for reactive state
- No external state library (NgRx, Akita, etc.)

**Routing:**
- Lazy-loaded feature routes
- `AuthGuard` (CanMatchFn) for protected routes
- Route guards check `AuthService.isAuthenticated()`

**HTTP:**
- `supabaseAuthInterceptor` adds JWT to requests
- Direct Supabase JS SDK calls (not HTTP client for Supabase)

### Testing Stack

**Unit Tests:**
- Framework: Jasmine + Karma
- Location: `*.spec.ts` files next to source
- Run: `npm run test` (watch mode) or `npm run test:quick` (headless)

**E2E Tests:**
- Framework: Python + Playwright
- Location: `e2e/` directory
- Run: `cd e2e && python3 test_booking_flow.py`
- Focus: User flows (registration, car publish, booking, payment)

## Development Workflows

### 1. Start Local Development

**Option A: Auto-start (uses workflows script):**
```bash
npm run dev                 # Starts web + worker in background
```

**Option B: Manual start (separate terminals):**
```bash
# Terminal 1: Angular dev server
cd apps/web
npm run start               # http://localhost:4200

# Terminal 2: Payment webhook worker
cd functions/workers/payments_webhook
npm run dev                 # http://localhost:8787

# Terminal 3 (optional): Supabase Edge Functions
supabase functions serve mp-create-preauth  # http://localhost:54321/functions/v1/mp-create-preauth
```

### 2. Make Code Changes

**Frontend (Angular):**
- Files: `apps/web/src/app/**`
- Hot reload: Automatic on save
- Lint: `npm run lint` (from `apps/web/`)
- Format: `npm run format` (Prettier)

**Backend (Edge Functions):**
- Files: `supabase/functions/**/*.ts`
- Reload: Automatic if using `supabase functions serve`
- Deploy: `supabase functions deploy {function-name}`

**Database:**
- Create migration: `supabase migration new {name}`
- Edit: `supabase/migrations/{timestamp}_{name}.sql`
- Apply locally: `supabase db reset`
- Apply remote: `supabase db push`

### 3. Run Tests

**Quick tests (no coverage):**
```bash
npm run test:quick          # Fast, headless, no coverage
```

**Full tests with coverage:**
```bash
npm run test:coverage       # Slow, generates coverage report
```

**E2E tests:**
```bash
cd e2e
python3 test_booking_flow.py
```

### 4. Deploy to Production

**Full deploy (recommended):**
```bash
npm run deploy              # Deploys web + worker (uses workflows script)
```

**Individual deployments:**
```bash
# Web (Cloudflare Pages)
cd apps/web
npm run deploy:pages

# Worker (Cloudflare Workers)
cd functions/workers/payments_webhook
npm run deploy

# Edge Function (Supabase)
supabase functions deploy mp-create-preauth --project-ref obxvffplochgeiclibng
```

### 5. Database Migrations (Production)

**Apply migration to production:**
```bash
supabase db push --db-url postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres
```

**Or via SQL client:**
```bash
PGPASSWORD="..." psql "postgresql://..." -f database/migrations/XXX-migration.sql
```

## Important Conventions (from CLAUDE.md)

### Vertical Stack Debugging

When debugging complex issues (RLS failures, payment flows, storage uploads), trace through ALL layers:

```
┌─────────────────────────────────────────┐
│  Layer 1: UI (Angular Component)        │
│  Check: Event handlers, form validation │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  Layer 2: Service Layer (TypeScript)    │
│  Check: API calls, data transformation  │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  Layer 3: Edge Function / Worker        │
│  Check: Request parsing, external APIs  │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  Layer 4: Database / Storage            │
│  Check: Table structure, constraints    │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  Layer 5: RLS Policies                  │
│  Check: Policy logic, auth.uid() match  │
└─────────────────────────────────────────┘
```

**Process:**
1. Create audit branch: `git checkout -b audit/feature-name`
2. Document findings at each layer in audit doc (e.g., `FEATURE_AUDIT.md`)
3. Identify root cause
4. Apply fixes to all affected layers
5. Test end-to-end
6. Merge: `git merge audit/feature-name --no-ff`

### Storage Path Convention (CRITICAL)

**Rule**: NEVER include bucket name in storage path.

**Why**: RLS policies validate `(storage.foldername(name))[1] = auth.uid()::text`. If path includes bucket prefix, validation fails.

**Examples:**
```typescript
// ✅ CORRECT
const filePath = `${userId}/${carId}/${filename}`;
await supabase.storage.from('car-images').upload(filePath, file);

// ❌ WRONG (RLS error: "new row violates row-level security policy")
const filePath = `car-images/${userId}/${carId}/${filename}`;
await supabase.storage.from('car-images').upload(filePath, file);
```

### RLS Policy Patterns

**Authenticated Users:**
```sql
-- User can insert their own records
CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can view their own records
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

**Service Role (Webhooks):**
```sql
-- Service role can update (for webhooks)
CREATE POLICY "Service role can update"
  ON table_name FOR UPDATE
  USING (auth.role() = 'service_role');
```

**Admins:**
```sql
-- Admins can view all
CREATE POLICY "Admins can view all"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
```

### Claude Code Auto-Background

AutoRenta is configured to use Claude Code's auto-background feature for long-running commands:

**Timeout**: 900,000ms (15 minutes)

**Commands that benefit:**
- `npm run build` - 30-90s
- `npm run deploy:pages` - 60-180s
- `npm run test` - 40-120s
- `npm install` - 60-300s

**Workflows Script** (`tools/claude-workflows.sh`):
- `ci_pipeline` - Runs lint + test + build in parallel/sequence
- `dev_setup` - Starts web + worker in background
- `full_deploy` - Deploys all services with confirmation

### Model Context Protocol (MCP) Integration

AutoRenta uses Cloudflare MCP servers (configured in `.claude/config.json`):

**Active Servers:**
- `cloudflare-builds` - Deploy and manage Pages/Workers builds
- `cloudflare-docs` - Quick documentation reference
- `cloudflare-bindings` - Manage Workers bindings (R2, KV, D1, AI)

**Recommended (Paid Plan):**
- `cloudflare-observability` - **CRITICAL** for payment webhook debugging
- `cloudflare-audit-logs` - Security and compliance auditing
- `cloudflare-graphql` - Analytics data access

**Usage Examples:**
```
"Show me the latest deployment of autorenta-web on Pages"
"Deploy my web app to Cloudflare Pages"
"Rollback Pages deployment to the previous version"
"Show me the last 10 invocations of payments_webhook with errors"
```

## MercadoPago Preauthorization Implementation Guide

### Current Status

**✅ Implemented:**
- Database table `payment_intents` with all required fields
- RPC function `create_payment_authorization()`
- Edge Function `mp-create-preauth` (creates authorization with `capture: false`)
- Frontend service `PaymentAuthorizationService` (creates and queries preauths)
- Frontend models `PaymentAuthorization`, `AuthorizePaymentResult`

**❌ TODO (for Claude/Warp to complete):**
1. **Capture Flow**:
   - Create Edge Function `mp-capture-preauth`
   - Call MercadoPago capture API: `POST /v1/payments/{id}?capture=true`
   - Update `payment_intents` status to `captured`
   - Create `wallet_ledger` entries for debit/credit
   - Update booking status

2. **Cancel Flow**:
   - Create Edge Function `mp-cancel-preauth`
   - Call MercadoPago cancel API: `PUT /v1/payments/{id}` with status `cancelled`
   - Update `payment_intents` status to `cancelled`
   - Release any locked funds in `user_wallets`

3. **Webhook Integration**:
   - Update `mercadopago-webhook` to handle preauth events
   - Map MercadoPago status to `payment_intents` status
   - Handle edge cases: expiry, partial capture, refunds

4. **Expiry Monitoring**:
   - Create cron job Edge Function `expire-preauths`
   - Query `payment_intents` where `preauth_expires_at < now()` and `status = 'authorized'`
   - Update status to `expired`
   - Send notification to user (optional)

5. **Frontend UI**:
   - Booking detail page: Show preauth status
   - Admin panel: Capture/cancel buttons
   - Error handling: Show user-friendly messages

6. **Testing**:
   - E2E test: Create preauth → Capture → Verify DB
   - E2E test: Create preauth → Cancel → Verify DB
   - E2E test: Create preauth → Wait 7 days → Verify expiry

### Testing Preauth Locally

**1. Start services:**
```bash
# Terminal 1: Angular dev server
cd apps/web && npm run start

# Terminal 2: Edge Function
supabase functions serve mp-create-preauth
```

**2. Create preauth via frontend or curl:**
```bash
# Get session token from browser localStorage (key: 'supabase.auth.token')
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:54321/functions/v1/mp-create-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "00000000-0000-0000-0000-000000000001",
    "user_id": "YOUR_USER_ID",
    "amount_ars": 10000,
    "amount_usd": 100,
    "card_token": "MERCADOPAGO_CARD_TOKEN",
    "payer_email": "test@test.com"
  }'
```

**3. Verify in database:**
```sql
SELECT * FROM payment_intents
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Should see:
-- status = 'authorized'
-- mp_payment_id = (number from MercadoPago)
-- preauth_expires_at = (now + 7 days)
```

**4. Test capture (once implemented):**
```bash
curl -X POST http://localhost:54321/functions/v1/mp-capture-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "00000000-0000-0000-0000-000000000001",
    "amount_ars": 10000
  }'
```

**5. Test cancel (once implemented):**
```bash
curl -X POST http://localhost:54321/functions/v1/mp-cancel-preauth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "intent_id": "00000000-0000-0000-0000-000000000001"
  }'
```

### MercadoPago API Reference

**Create Authorization (implemented):**
```bash
POST https://api.mercadopago.com/v1/payments
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN
X-Idempotency-Key: {unique-key}

{
  "transaction_amount": 10000,
  "token": "card_token_from_frontend",
  "description": "Preautorización de garantía",
  "installments": 1,
  "payment_method_id": "visa",
  "payer": { "email": "user@example.com" },
  "capture": false,  // ⚠️ CRITICAL: false = hold, true = charge
  "metadata": {
    "intent_id": "...",
    "booking_id": "...",
    "type": "preauth"
  }
}
```

**Capture Authorization (TODO):**
```bash
POST https://api.mercadopago.com/v1/payments/{payment_id}?capture=true
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN
```

**Cancel Authorization (TODO):**
```bash
PUT https://api.mercadopago.com/v1/payments/{payment_id}
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN

{
  "status": "cancelled"
}
```

**Get Payment Status:**
```bash
GET https://api.mercadopago.com/v1/payments/{payment_id}
Authorization: Bearer ACCESS_TOKEN
```

## Additional Resources

**Documentation:**
- `CLAUDE.md` - Comprehensive architecture guide for Claude Code
- `README.md` - Project overview
- `database/README.md` - Database migrations guide
- `e2e/README.md` - E2E testing guide
- `CLAUDE_SKILLS_GUIDE.md` - Claude Skills usage patterns

**Key Files for Preauth Implementation:**
- Migration: `supabase/migrations/20251024_payment_intents_preauth.sql`
- Edge Function: `supabase/functions/mp-create-preauth/index.ts`
- Frontend Service: `apps/web/src/app/core/services/payment-authorization.service.ts`
- Frontend Models: `apps/web/src/app/core/models/booking-detail-payment.model.ts`

**MercadoPago Documentation:**
- [Payments API](https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post)
- [Card Tokenization](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/integration-configuration/card-configuration)
- [Webhooks (IPN)](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/ipn)

---

**Last Updated**: 2025-10-24  
**Maintainer**: AutoRenta Dev Team (autorentardev@gmail.com)  
**For AI Agents**: This file is designed for Warp, Claude, Gemini, and Codex to execute tasks end-to-end. Use Vertical Stack Debugging, leverage auto-background for long commands, and always verify changes across all layers (UI → Service → Edge Function → DB → RLS).
