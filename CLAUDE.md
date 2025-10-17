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
