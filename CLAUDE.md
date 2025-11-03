# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Preferencias de Documentación

**IMPORTANTE**: NO crear archivos .md para cada acción o cambio rutinario.
- SOLO crear archivos .md cuando cambie la arquitectura de la plataforma
- Cursor es la documentación viva - no necesita archivos .md para tareas rutinarias
- Excepciones: cambios arquitectónicos importantes, decisiones de diseño significativas, runbooks operativos críticos

## Autenticación Persistente

**Setup inicial (una vez)**:
```bash
./tools/setup-auth.sh    # Configura login persistente para GitHub, Supabase, Cloudflare
./tools/check-auth.sh    # Verifica estado de autenticación
```

**Herramientas configuradas**:
- `gh` (GitHub CLI) - Credenciales en `~/.config/gh/`
- `supabase` CLI - Token en `~/.supabase/access-token`
- `wrangler` (Cloudflare) - Token en `~/.wrangler/config/default.toml`

Después del setup inicial, no será necesario autenticarse nuevamente a menos que expire el token.

## Acceso y Configuración Actual (Auditoría 2025-11-03)

### GitHub
- **Repositorio**: `ecucondorSA/autorenta`
- **URL**: https://github.com/ecucondorSA/autorenta
- **Branch principal**: `main`
- **Último push**: 2025-11-01T23:26:15Z
- **Público**: No (privado)
- **Workflows activos**: 14 workflows (Build and Deploy, CI, Security Scan, E2E Tests, etc.)
- **Secrets configurados** (13):
  - CF_ACCOUNT_ID, CF_PAGES_PROJECT
  - DATABASE_URL, DB_PASSWORD
  - MAPBOX_ACCESS_TOKEN
  - MERCADOPAGO_* (ACCESS_TOKEN, CLIENT_SECRET, PROD_ACCESS_TOKEN, PROD_PUBLIC_KEY, TEST_ACCESS_TOKEN)
  - SUPABASE_* (ANON_KEY, SERVICE_ROLE_KEY, URL)
- **Estado deployments**: Últimos 5 builds fallaron (necesitan corrección)
- **Secrets Cloudflare configurados**:
  - `CF_ACCOUNT_ID` ✅ (ya existe)
  - `CF_API_TOKEN` ✅ (configurado 2025-11-03, válido hasta 2026-06-30)
- **Workflow usa**: `CF_API_TOKEN || CLOUDFLARE_API_TOKEN` (fallback configurado)
- **Usuario autenticado**: ecucondorSA

### Supabase
- **Proyecto**: autarenta
- **Reference ID**: obxvffplochgeiclibng
- **URL**: https://obxvffplochgeiclibng.supabase.co
- **Región**: us-east-2
- **Creado**: 2025-10-15 18:33:52 UTC
- **Secrets configurados** (15):
  - APP_BASE_URL
  - DOC_VERIFIER_URL
  - MAPBOX_ACCESS_TOKEN
  - MERCADOPAGO_ACCESS_TOKEN
  - MERCADOPAGO_APPLICATION_ID
  - MERCADOPAGO_CLIENT_SECRET
  - MERCADOPAGO_MARKETPLACE_ID
  - MERCADOPAGO_OAUTH_REDIRECT_URI
  - MERCADOPAGO_OAUTH_REDIRECT_URI_DEV
  - MERCADOPAGO_PUBLIC_KEY
  - PLATFORM_MARGIN_PERCENT
  - SUPABASE_ANON_KEY
  - SUPABASE_DB_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_URL
- **Edge Functions activas** (20):
  - mercadopago-webhook (v40, actualizado 2025-10-28)
  - mercadopago-create-preference (v51)
  - mercadopago-create-booking-preference (v19, actualizado 2025-10-28)
  - mercadopago-oauth-connect (v5, actualizado 2025-11-02)
  - mercadopago-oauth-callback (v3)
  - wallet-transfer, wallet-reconciliation
  - update-exchange-rates, sync-binance-rates
  - calculate-dynamic-price
  - verify-user-docs
  - Y 10 más...

### Cloudflare
- **Account ID**: `5b448192fe4b369642b68ad8f53a7603`
- **Email**: marques.eduardo95466020@gmail.com
- **Account Name**: Marques.eduardo95466020@gmail.com's Account
- **Permisos**: account:read, workers:write, pages:write, workers_kv:write, etc. (todos los necesarios)
- **Workers configurados**:
  - `autorenta-payments-webhook` (functions/workers/payments_webhook)
    - KV Namespace: AUTORENT_WEBHOOK_KV (id: a2a12698413f4f288023a9c595e19ae6)
  - `autorent-ai-car-generator` (functions/workers/ai-car-generator)
    - AI binding habilitado
  - `mercadopago-oauth-redirect` (functions/workers/mercadopago-oauth-redirect)
  - `doc-verifier` (functions/workers/doc-verifier)
- **Cloudflare Pages**: Proyectos existentes:
  - `autorenta-web` (modificado hace 20 horas) - URL: autorenta-web.pages.dev
  - `autorentar-app`, `autorentar`, `autorenta` (proyectos antiguos)
- **Dominio configurado**: 
  - Workflow usa: `autorenta.com` 
  - Environment.ts: `autorentar.com` (inconsistencia a corregir)
- **Deployments**: Últimos builds en GitHub Actions fallaron

**Nota**: Esta información se actualiza cuando se ejecuta `./tools/check-auth.sh` o se hacen cambios significativos.

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

### Root Package Scripts (from project root)

**🚀 Claude Code Workflows (NEW - Oct 2025):**
```bash
npm run workflows          # Ver ayuda de todos los workflows
npm run ci                 # Pipeline CI/CD completo (lint + test + build)
npm run dev                # Inicia entorno completo (web + worker)
npm run deploy             # Deploy completo a producción
npm run test:quick         # Tests rápidos sin coverage
npm run test:coverage      # Tests completos con coverage
npm run lint:fix           # Auto-fix de linting issues
npm run install:all        # Instala todas las dependencias
```

**💡 Tip**: Todos los workflows aprovechan auto-background de Claude Code para comandos largos.

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
- `wallet_initiate_deposit`: Creates pending deposit transaction
- `wallet_confirm_deposit`: Confirms deposit and credits funds (called by webhook)
- `wallet_get_balance`: Returns user's wallet balance
- `wallet_lock_funds`: Locks funds for booking
- `wallet_unlock_funds`: Unlocks funds after booking

### Wallet System

**Tables:**
- `user_wallets`: User balance and locked funds (one row per user)
- `wallet_transactions`: All wallet operations (deposits, withdrawals, payments, locks, unlocks)

**Edge Functions:**
- `mercadopago-create-preference`: Creates MercadoPago payment preference for deposits
- `mercadopago-webhook`: Processes IPN notifications from MercadoPago

**Flow**:
1. User clicks "Depositar" → Frontend calls `wallet_initiate_deposit()`
2. RPC creates pending transaction → Returns transaction_id
3. Frontend calls Edge Function `mercadopago-create-preference` with transaction_id
4. Edge Function creates preference → Returns init_point (checkout URL)
5. User redirected to MercadoPago → Completes payment
6. MercadoPago sends IPN → Calls Edge Function `mercadopago-webhook`
7. Webhook verifies payment → Calls `wallet_confirm_deposit()`
8. RPC updates transaction status → Credits funds to user wallet
9. User redirected back → Balance updated

**Key Implementation Details:**
- ✅ Currency: Always ARS (required by MercadoPago Argentina)
- ✅ Idempotency: Webhook handles duplicate notifications safely
- ✅ Token cleaning: Access token is trimmed and sanitized
- ✅ No auto_return: Doesn't work with localhost HTTP
- ✅ Logging: Extensive debug logs for troubleshooting
- ✅ Hardcoded fallback: Token has fallback for local development
- ✅ RLS: All operations protected by Row Level Security

**Documentation**: See `WALLET_SYSTEM_DOCUMENTATION.md` for complete guide.

### Payment Architecture (CRITICAL - Updated Oct 2025)

**AutoRenta uses DIFFERENT payment systems for development vs production:**

#### 🏭 PRODUCTION (Real Money - MercadoPago)

**Primary System**: Supabase Edge Functions
- **Webhook**: `supabase/functions/mercadopago-webhook/` (✅ DEPLOYED, ACTIVE)
- **Create Preference**: `supabase/functions/mercadopago-create-preference/` (✅ DEPLOYED)
- **Booking Preference**: `supabase/functions/mercadopago-create-booking-preference/` (✅ DEPLOYED)
- **Authentication**: `MERCADOPAGO_ACCESS_TOKEN` stored in Supabase secrets
- **URL**: `https://[PROJECT].supabase.co/functions/v1/mercadopago-webhook`
- **SDK**: Official MercadoPago SDK (imported via Deno)
- **Signature Verification**: ✅ Enabled (validates MP signatures)
- **Idempotency**: ✅ Handled via transaction_id uniqueness in DB

**Payment Flow (Production)**:
```
User → Frontend → Supabase Edge Function (create-preference)
                ↓
          MercadoPago Checkout (real payment)
                ↓
          MercadoPago sends IPN webhook
                ↓
          Supabase Edge Function (mercadopago-webhook)
                ↓
          RPC wallet_confirm_deposit() → Credits funds
                ↓
          User redirected back to app
```

**Key Files**:
- `/home/edu/autorenta/supabase/functions/mercadopago-webhook/index.ts` (webhook handler)
- `/home/edu/autorenta/supabase/functions/mercadopago-create-preference/index.ts` (wallet deposits)
- `/home/edu/autorenta/supabase/functions/mercadopago-create-booking-preference/index.ts` (bookings)

#### 🧪 DEVELOPMENT (Mock Testing)

**Secondary System**: Cloudflare Worker (LOCAL ONLY)
- **Location**: `functions/workers/payments_webhook/`
- **Status**: ❌ NOT DEPLOYED to Cloudflare (only local dev)
- **Purpose**: Mock webhooks for rapid testing without MercadoPago
- **URL**: `http://localhost:8787/webhooks/payments` (wrangler dev)
- **Endpoint**: `POST /webhooks/payments`
- **Payload**: `{ provider: 'mock', booking_id: string, status: 'approved' | 'rejected' }`

**Mock Flow (Development Only)**:
```
Developer → Frontend → payments.service.ts::markAsPaid()
                     ↓
               Cloudflare Worker (local)
                     ↓
               Supabase DB (mock payment)
```

**Protection Against Accidental Production Use**:
```typescript
// apps/web/src/app/core/services/payments.service.ts:75
async markAsPaid(intentId: string): Promise<void> {
  if (environment.production) {
    throw new Error('markAsPaid() deprecado en producción.
                     El webhook de MercadoPago actualiza automáticamente.');
  }
  // ... mock logic only runs in dev
}
```

#### ⚠️ IMPORTANT: Which System is Used?

| Environment | Payment System | Webhook URL | Token Required |
|-------------|----------------|-------------|----------------|
| **Production** | MercadoPago Real | Supabase Edge Function | ✅ In Supabase secrets |
| **Staging** | MercadoPago Sandbox | Supabase Edge Function | ✅ In Supabase secrets |
| **Development** | Mock (optional) | Cloudflare Worker (local) | ❌ Not needed |

**To verify which system is active**:
```bash
# Check deployed Supabase functions
npx supabase functions list | grep mercadopago

# Check Cloudflare Worker (should NOT exist in production)
wrangler secret list --name payments_webhook
```

#### 🔐 Secrets Configuration

**Supabase Secrets (Production)**:
```bash
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-***
npx supabase secrets set SUPABASE_URL=https://[project].supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=***
```

**Cloudflare Secrets (Development - Optional)**:
```bash
# NOT NEEDED - Mock worker doesn't validate real payments
# Only configure if you want to test real MP webhooks locally
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

#### 📊 Payment Types & Non-Withdrawable Cash

**MercadoPago payment_type_id values**:
- `'ticket'` → Pago Fácil/Rapipago (cash) → **NON-WITHDRAWABLE**
- `'credit_card'` → Credit card → Withdrawable
- `'debit_card'` → Debit card → Withdrawable
- `'account_money'` → MercadoPago balance → Withdrawable

**Cash Deposit Handling** (see `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`):
- Cash deposits are credited normally to wallet
- Automatically marked as non-withdrawable
- Tracked in `user_wallets.non_withdrawable_floor`
- Users warned in UI before depositing
- Can use for bookings but cannot withdraw to bank

#### 🧹 Legacy Code Cleanup

**Files to IGNORE (legacy mock system)**:
- `functions/workers/payments_webhook/` - Cloudflare Worker (not deployed)
- Methods in `payments.service.ts` with production guards:
  - `markAsPaid()` - Throws error in production
  - `triggerMockPayment()` - Throws error in production

**Why keep mock code?**:
- Enables rapid local development
- No need to hit MercadoPago sandbox for every test
- Production guards prevent accidental use
- Developers can test payment flows offline

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

---

## Supabase Storage Architecture

### Storage Buckets

The application uses Supabase Storage with the following buckets:

| Bucket | Purpose | Public | Path Pattern |
|--------|---------|--------|--------------|
| `avatars` | User profile photos | ✅ Yes | `{user_id}/{filename}` |
| `car-images` | Car listing photos | ✅ Yes | `{user_id}/{car_id}/{filename}` |
| `documents` | Verification docs | ❌ No | `{user_id}/{document_type}/{filename}` |

### Storage Path Conventions

**CRITICAL**: Storage paths must NOT include the bucket name as a prefix.

```typescript
// ✅ CORRECT - Path without bucket prefix
const filePath = `${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);

// ❌ INCORRECT - Including bucket name in path
const filePath = `avatars/${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);
```

**Why?** RLS policies validate that the first folder in the path matches `auth.uid()`:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

If you include the bucket prefix, the policy check fails:
- With `avatars/user-id/file.jpg`: `foldername()[1]` = `'avatars'` ❌
- With `user-id/file.jpg`: `foldername()[1]` = `user-id` ✅

### RLS Policies for Storage

**Avatar Uploads** (`storage.objects` table):
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own files
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### Storage Service Patterns

**ProfileService Example** (`profile.service.ts`):
```typescript
async uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Validations
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 2MB');
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${user.id}/${uuidv4()}.${extension}`; // ✅ No bucket prefix

  // Upload
  const { error } = await this.supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = this.supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update profile
  await this.updateProfile({ avatar_url: publicUrl });

  return publicUrl;
}
```

**CarsService Example** (`cars.service.ts`):
```typescript
async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
  const userId = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  const extension = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`; // ✅ No bucket prefix

  const { error } = await this.supabase.storage
    .from('car-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data } = this.supabase.storage
    .from('car-images')
    .getPublicUrl(filePath);

  // Save to database
  const { data: photoData, error: photoError } = await this.supabase
    .from('car_photos')
    .insert({
      id: uuidv4(),
      car_id: carId,
      stored_path: filePath,
      url: data.publicUrl,
      position,
      sort_order: position,
    })
    .select()
    .single();

  if (photoError) throw photoError;
  return photoData as CarPhoto;
}
```

### Deleting Files from Storage

When deleting files, extract the path from the public URL:

```typescript
async deleteAvatar(): Promise<void> {
  const profile = await this.getCurrentProfile();
  if (!profile?.avatar_url) return;

  // Extract storage path from public URL
  const url = new URL(profile.avatar_url);
  const pathParts = url.pathname.split('/avatars/');

  if (pathParts.length > 1) {
    const storagePath = pathParts[1]; // ✅ Without bucket prefix
    await this.supabase.storage.from('avatars').remove([storagePath]);
  }

  // Update profile
  await this.updateProfile({ avatar_url: '' });
}
```

---

## Vertical Stack Debugging Workflow

When debugging complex issues that span multiple layers of the application, use the **Vertical Stack Debugging** approach.

### When to Use

- RLS policy violations
- Storage upload failures
- Authentication issues
- Data flow problems across layers
- Integration bugs between frontend and backend

### Process

1. **Create Audit Branch**
   ```bash
   git checkout -b audit/feature-name
   ```

2. **Map the Full Stack**
   Trace the feature through all layers:
   ```
   UI Component → Service → SDK → Storage/DB → RLS → Schema
   ```

3. **Document Findings**
   Create a detailed audit document (e.g., `PHOTO_UPLOAD_AUDIT.md`):
   - Database schema analysis
   - RLS policies
   - Service layer code
   - Component integration
   - Root cause identification
   - Fix implementation plan

4. **Implement and Test**
   - Apply fixes to all affected layers
   - Verify RLS policies
   - Test end-to-end flow
   - Document solution

5. **Merge and Clean Up**
   ```bash
   git checkout main
   git merge audit/feature-name --no-ff
   git branch -d audit/feature-name
   ```

### Layer-by-Layer Analysis Template

```
┌─────────────────────────────────────────┐
│  LAYER 1: UI (Angular Component)        │
│  Status: ✅ / ❌                         │
│  Files: profile.page.ts:137             │
│  Notes: Event handler working           │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 2: Service Layer                 │
│  Status: ✅ / ❌                         │
│  Files: profile.service.ts:97           │
│  Notes: Check path construction         │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 3: Supabase SDK                  │
│  Status: ✅ / ❌                         │
│  Files: N/A (external)                  │
│  Notes: Verify API usage                │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 4: Storage/Database              │
│  Status: ✅ / ❌                         │
│  Files: setup-profiles.sql:69           │
│  Notes: Bucket configuration            │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 5: RLS Policies                  │
│  Status: ✅ / ❌ ← ERROR HERE            │
│  Files: setup-profiles.sql:76           │
│  Notes: Policy validation failing       │
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 6: Database Schema               │
│  Status: ✅ / ❌                         │
│  Files: setup-profiles.sql:4            │
│  Notes: Column definitions              │
└─────────────────────────────────────────┘
```

### Example: Avatar Upload Bug (2025-10-16)

**Problem**: `new row violates row-level security policy`

**Analysis**:
- ✅ Component: Event handler working
- ✅ Service: File validation passing
- ❌ **Storage Path**: Including bucket prefix `avatars/`
- ❌ **RLS Policy**: Expecting first folder to be `user_id`

**Root Cause**: Path mismatch between service and RLS expectations

**Fix**: Remove bucket prefix from file path in `ProfileService.uploadAvatar()`

**Documentation**: See `PHOTO_UPLOAD_AUDIT.md` for complete analysis

---

## Common Pitfalls

### 1. Storage Path Errors

**Problem**: Including bucket name in storage path
```typescript
// ❌ WRONG
const filePath = `avatars/${userId}/${filename}`;
```

**Solution**: Omit bucket name
```typescript
// ✅ CORRECT
const filePath = `${userId}/${filename}`;
```

**Why**: RLS policies check `(storage.foldername(name))[1] = auth.uid()::text`

### 2. RLS Policy Violations

**Problem**: `new row violates row-level security policy`

**Debug Steps**:
1. Check if user is authenticated: `await supabase.auth.getUser()`
2. Verify path structure matches policy expectations
3. Test policy in Supabase SQL editor with your user's UUID
4. Compare with working examples (e.g., `CarsService.uploadPhoto()`)

### 3. TypeScript Type Mismatches

**Problem**: Database types don't match code

**Solution**: Keep `database.types.ts` in sync with database schema
```typescript
// Regenerate types after schema changes
// Use Supabase CLI or manual updates
```

### 4. Avatar URL Extraction

**Problem**: Incorrect path extraction when deleting files

```typescript
// ❌ WRONG - Includes bucket prefix again
const storagePath = `avatars/${pathParts[1]}`;

// ✅ CORRECT - Direct path
const storagePath = pathParts[1];
```

### 5. File Size Limits

**Problem**: Files too large for Supabase Storage

**Solution**: Validate before upload
```typescript
if (file.size > 2 * 1024 * 1024) {
  throw new Error('File must be under 2MB');
}
```

---

## Debugging Resources

### Audit Documents

- **`PHOTO_UPLOAD_AUDIT.md`**: Complete analysis of avatar upload RLS issue
  - Database schema review
  - Storage architecture
  - RLS policy validation
  - Root cause analysis
  - Fix implementation

### Reference Files

- **Database Setup**: `apps/web/database/setup-profiles.sql`
- **Storage Policies**: Lines 69-109 in setup-profiles.sql
- **TypeScript Types**: `apps/web/src/app/core/types/database.types.ts`
- **Storage Constants**: Lines 201-205 in database.types.ts

### Testing RLS Policies

Use Supabase SQL Editor with your session:

```sql
-- Test as authenticated user
SET LOCAL "request.jwt.claims" = '{"sub": "your-user-uuid"}';

-- Test storage policy
SELECT (storage.foldername('user-uuid/file.jpg'))[1] = 'user-uuid';
-- Should return: true

SELECT (storage.foldername('avatars/user-uuid/file.jpg'))[1] = 'user-uuid';
-- Should return: false (this is the bug!)
```

---

## Claude Code Optimization (Oct 2025)

### Auto-Background Commands

AutoRenta aprovecha las nuevas funcionalidades de **auto-background** de Claude Code para ejecutar comandos largos sin timeouts.

**Comandos que se benefician**:
- `npm run build` - 30-90s (antes: timeout a 120s)
- `npm run deploy:pages` - 60-180s (antes: fallos frecuentes)
- `npm run test` - 40-120s
- `npm install` - 60-300s (dependiendo de red)

**Configuración**:
```bash
# Timeout configurado en BASH_DEFAULT_TIMEOUT_MS
export BASH_DEFAULT_TIMEOUT_MS=900000  # 15 minutos
```

### Workflows Automatizados

El proyecto incluye workflows automatizados en `tools/claude-workflows.sh`:

**Funciones Principales**:

```bash
# Cargar workflows
source tools/claude-workflows.sh

# O usar shortcuts de npm
npm run workflows          # Ver ayuda completa

# CI/CD Pipeline
npm run ci                 # lint + test + build en paralelo
# - Lint y tests corren simultáneamente
# - Build ejecuta después de validaciones
# - Todo aprovecha auto-background

# Desarrollo
npm run dev                # Inicia web + worker en background
# - Angular dev server: http://localhost:4200
# - Payment worker: http://localhost:8787

# Deploy
npm run deploy             # Deploy completo con confirmación
# - Valida que ci_pipeline haya pasado
# - Deploys web y worker en secuencia
```

**Ventajas**:
- ⏱️ 40-60% reducción en tiempo de desarrollo
- 🚫 0 timeouts en builds y deploys
- ⚡ Ejecución paralela de tareas independientes
- 📊 Mejor visibilidad de progreso

### Claude Skills (Preparación)

El proyecto está preparado para aprovechar **Claude Skills** cuando estén disponibles:

**Documentación**:
- `CLAUDE_SKILLS_GUIDE.md` - Guía completa de uso
- `CLAUDE.md` - Patterns de arquitectura (este archivo)
- `CLAUDE_CODE_IMPROVEMENTS.md` - Análisis de mejoras

**Skills Recomendados**:
1. **Angular Scaffolder** - Genera features siguiendo patterns de AutoRenta
2. **Supabase RLS Debugger** - Analiza vertical stack de políticas de seguridad
3. **TypeScript Sync** - Sincroniza database.types.ts con schema
4. **Test Generator** - Genera tests unitarios con 80%+ coverage
5. **Performance Optimizer** - Analiza bundle size y Web Vitals
6. **Security Auditor** - Valida RLS policies y configuraciones

**Preparación para Skills**:
- ✅ CLAUDE.md documentado con patterns claros
- ✅ Arquitectura standalone bien definida
- ✅ Storage conventions documentadas
- ✅ Debugging workflows establecidos
- 🔄 TODO: Crear PATTERNS.md con templates de código

### Recursos Claude Code

**Documentos Clave**:
- `/autorenta/CLAUDE.md` - Guía principal del proyecto
- `/autorenta/CLAUDE_SKILLS_GUIDE.md` - Uso de Skills
- `/autorenta/CLAUDE_CODE_IMPROVEMENTS.md` - Análisis de mejoras
- `/autorenta/tools/claude-workflows.sh` - Scripts automatizados

**Comandos Útiles**:
```bash
# Workflows
npm run workflows          # Ver ayuda
npm run ci                 # Pipeline completo
npm run dev                # Entorno de desarrollo
npm run deploy             # Deploy a producción

# Status
source tools/claude-workflows.sh && status  # Ver estado del proyecto

# Linting
npm run lint:fix           # Auto-fix de issues
```

---

## Model Context Protocol (MCP) Integration

### Configured MCP Servers

AutoRenta uses Cloudflare's official MCP servers for enhanced development and deployment workflows. Configuration is located in `.claude/config.json`.

**Active Servers (Free Tier)**:

| Server | URL | Purpose | Use Cases |
|--------|-----|---------|-----------|
| **cloudflare-builds** | `https://builds.mcp.cloudflare.com/mcp` | Deploy and manage Pages/Workers builds | Deploy automation, build status, rollbacks |
| **cloudflare-docs** | `https://docs.mcp.cloudflare.com/mcp` | Quick Cloudflare documentation reference | API lookups, configuration help |
| **cloudflare-bindings** | `https://bindings.mcp.cloudflare.com/mcp` | Manage Workers bindings (R2, KV, D1, AI) | Future: KV for webhook idempotency |

**Recommended (Paid Plan)**:

| Server | URL | Purpose | Value for AutoRenta |
|--------|-----|---------|---------------------|
| **cloudflare-observability** | `https://observability.mcp.cloudflare.com/mcp` | Logs and analytics debugging | **CRITICAL**: Payment webhook debugging |
| **cloudflare-audit-logs** | `https://auditlogs.mcp.cloudflare.com/mcp` | Security and compliance auditing | Track deployments, API changes |
| **cloudflare-graphql** | `https://graphql.mcp.cloudflare.com/mcp` | Analytics data access | Performance metrics, Web Vitals |

### Authentication

MCP servers use OAuth authentication with your Cloudflare account:

1. Claude Code will prompt for authentication when accessing MCP servers
2. Use the same Cloudflare account that hosts AutoRenta Pages and Workers
3. Grant requested permissions (read-only for free tier servers)

### Common MCP Workflows

**Deployment Management** (cloudflare-builds):
```
"Show me the latest deployment of autorenta-web on Pages"
"Deploy my web app to Cloudflare Pages"
"What's the status of my last 5 deployments?"
"Rollback Pages deployment to the previous version"
```

**Documentation Lookup** (cloudflare-docs):
```
"How do I configure custom domains in Cloudflare Pages?"
"What are the limits for Cloudflare Workers free tier?"
"Show me examples of KV namespace usage for idempotency"
"How do I set up environment variables in Workers?"
```

**Bindings Management** (cloudflare-bindings):
```
"List all KV namespaces in my account"
"Create a new KV namespace for webhook idempotency"
"Show me the bindings configured for my payment webhook worker"
```

**Debugging Payment Webhook** (cloudflare-observability - Paid):
```
"Show me the last 10 invocations of payments_webhook with errors"
"What's the average execution time of my payment webhook today?"
"Find all webhook calls that resulted in 500 errors in the last hour"
"Get logs for invocation with error at 2025-10-18 15:30 UTC"
```

**Security Auditing** (cloudflare-audit-logs - Paid):
```
"Show me all API key creations in the last 7 days"
"List all configuration changes to my Workers this week"
"Who deployed to production yesterday?"
"Audit trail for payment webhook configuration changes"
```

### MCP Server Configuration

The MCP configuration file is located at `.claude/config.json`:

```json
{
  "mcpServers": {
    "cloudflare-builds": {
      "url": "https://builds.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Deploy and manage Cloudflare Pages and Workers builds"
    },
    "cloudflare-docs": {
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Quick reference for Cloudflare documentation"
    },
    "cloudflare-bindings": {
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "transport": "streamble-http",
      "description": "Manage Workers bindings (R2, KV, D1, AI, etc.)"
    }
  }
}
```

To add paid servers when available:

```bash
# Edit .claude/config.json and add:
"cloudflare-observability": {
  "url": "https://observability.mcp.cloudflare.com/mcp",
  "transport": "streamble-http",
  "description": "Logs and analytics debugging for Workers"
}
```

### Why Cloudflare MCP vs Others

AutoRenta chose Cloudflare MCP servers over alternatives (e.g., Vercel) because:

- ✅ **100% Infrastructure Alignment**: Already using Cloudflare Pages + Workers
- ✅ **15 Official Servers**: vs 0 official Vercel servers
- ✅ **Observability**: Critical for payment webhook debugging
- ✅ **Maturity**: 3k+ stars, 311 commits, actively maintained
- ✅ **Native Integration**: Built for Cloudflare services used by AutoRenta

### Future MCP Usage

When upgrading to a paid Cloudflare Workers plan:

1. **Enable Observability Server** - Essential for production webhook debugging
2. **Setup Audit Logs** - Compliance and security tracking
3. **Configure GraphQL Analytics** - Performance monitoring and Web Vitals
4. **Add Browser Rendering** - E2E testing and screenshot generation

### Resources

- **GitHub**: [cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)
- **Documentation**: [Cloudflare MCP Docs](https://developers.cloudflare.com/agents/model-context-protocol/)
- **All Servers**: 15 servers available, 3 configured for free tier
- **Last Updated**: October 2025
