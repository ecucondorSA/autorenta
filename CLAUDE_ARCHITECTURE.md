# CLAUDE_ARCHITECTURE.md

Arquitectura técnica de AutoRenta para Claude Code.

## Angular Architecture

### Standalone Components

- **Componentes standalone**: Todos los componentes son standalone, sin NgModules
- **Lazy Loading**: Features cargadas mediante route configuration (`loadComponent`, `loadChildren`)
- **Route Guards**: `AuthGuard` (CanMatchFn) protege rutas autenticadas (`/cars/publish`, `/bookings`, `/admin`)
- **HTTP Interceptor**: `supabaseAuthInterceptor` adjunta JWT tokens a requests HTTP
- **Dependency Injection**: `injectSupabase()` provee acceso directo al cliente Supabase

### State Management

- **Supabase Client**: Centralizado en `SupabaseClientService` con persistencia de sesión y auto-refresh
- **Services**: Lógica de negocio encapsulada en servicios dedicados (Auth, Cars, Bookings, Payments, Admin)
- **No state library**: Usa RxJS observables y Angular signals para reactividad

### Authentication Flow

1. Usuario hace login vía `AuthService.login()` → Supabase Auth
2. Sesión persistida automáticamente por cliente Supabase
3. `AuthGuard` verifica `AuthService.isAuthenticated()` en rutas protegidas
4. `supabaseAuthInterceptor` agrega JWT a requests API

### User Roles

- **locador**: Dueño de auto (puede publicar autos)
- **locatario**: Arrendatario (puede reservar autos)
- **ambos**: Ambos roles
- **Admin**: Flag `is_admin` en profile (acceso a `/admin`)

## Supabase Integration

### Tables

- `profiles`: Perfil de usuario con role y admin flag
- `cars`: Listados de autos con status (draft, pending, active, suspended)
- `car_photos`: Imágenes de autos en Supabase Storage
- `bookings`: Reservas con tracking de status
- `payments`: Registros de pago vinculados a bookings
- `payment_intents`: Intents del proveedor de pagos
- `user_wallets`: Balance de usuario y fondos bloqueados
- `wallet_transactions`: Todas las operaciones de wallet

### RPC Functions

**Bookings:**
- `request_booking`: Crea booking con validación

**Wallet:**
- `wallet_initiate_deposit`: Crea transacción de depósito pendiente
- `wallet_confirm_deposit`: Confirma depósito y acredita fondos (llamado por webhook)
- `wallet_get_balance`: Retorna balance del wallet del usuario
- `wallet_lock_funds`: Bloquea fondos para booking
- `wallet_unlock_funds`: Desbloquea fondos después de booking

### Edge Functions

**MercadoPago:**
- `mercadopago-create-preference`: Crea preference de MercadoPago para depósitos
- `mercadopago-create-booking-preference`: Crea preference para bookings
- `mercadopago-webhook`: Procesa notificaciones IPN de MercadoPago
- `mercadopago-oauth-connect`: Conecta cuenta de MercadoPago
- `mercadopago-oauth-callback`: Callback de OAuth

**Wallet:**
- `wallet-transfer`: Transferencias entre wallets
- `wallet-reconciliation`: Reconciliación de transacciones

**Pricing:**
- `update-exchange-rates`: Actualiza tipos de cambio
- `sync-binance-rates`: Sincroniza rates de Binance
- `calculate-dynamic-price`: Calcula precios dinámicos

**Verification:**
- `verify-user-docs`: Verifica documentos de usuario

## Repository Structure

```
autorenta/
  apps/
    web/                         # Angular 17 standalone app con Tailwind
      src/app/
        core/                    # Core services, guards, interceptors, models
          guards/                # AuthGuard para protección de rutas
          interceptors/          # supabaseAuthInterceptor para JWT
          models/                # Interfaces TypeScript (User, Car, Booking, Payment)
          services/              # Servicios de lógica de negocio
            supabase-client.service.ts  # Cliente Supabase centralizado
            auth.service.ts      # Operaciones de autenticación
            cars.service.ts      # CRUD de autos
            bookings.service.ts  # Gestión de bookings
            payments.service.ts  # Manejo de payment intents
            admin.service.ts     # Operaciones admin
        features/                # Feature modules (lazy-loaded)
          auth/                  # Login, register, reset-password pages
          cars/                  # List, detail, publish, my-cars pages
          bookings/              # Páginas de gestión de bookings
          admin/                 # Dashboard admin
        shared/                  # Componentes compartidos, pipes, utils
          components/            # car-card, city-select, date-range-picker, upload-image
          pipes/
          utils/
  functions/
    workers/
      payments_webhook/          # Cloudflare Worker para webhooks de pago
        src/index.ts             # Mock payment webhook handler
      ai-car-generator/          # Worker con AI binding
      doc-verifier/              # Verificador de documentos
      mercadopago-oauth-redirect/ # Redirect OAuth MercadoPago
  supabase/
    functions/                   # Edge Functions (Deno)
    migrations/                  # Migraciones SQL
  database/
    monitoring_setup.sql         # Setup de monitoreo
    monitoring_cron_setup.sql    # Cron jobs de monitoreo
```

## Code Quality Tools

### ESLint Configuration (Flat Config)

- **Angular ESLint**: Reglas para componentes y templates
- **TypeScript ESLint**: Type checking estricto
- **Import Plugin**: Fuerza orden de imports (alfabetizado, agrupado por tipo)
- **Explicit return types**: Requerido en todas las funciones
- **Unused variables**: Errores excepto args con prefijo `_`

### Prettier

- **Print width**: 100
- **Single quotes**: Habilitado
- **Angular HTML**: Parser custom para templates
- **Plugin**: `prettier-plugin-organize-imports` para auto-sorting de imports

### Husky + lint-staged

- **Pre-commit**: Ejecuta Prettier y ESLint en archivos staged
- **Setup**: `npm run prepare` instala hooks de Husky

## Environment Variables

### Angular (`.env.development.local`)

```bash
NG_APP_SUPABASE_URL=            # URL del proyecto Supabase
NG_APP_SUPABASE_ANON_KEY=       # Supabase anon/public key
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
```

### Cloudflare Worker (vía `wrangler secret`)

```bash
SUPABASE_URL=                   # URL del proyecto Supabase
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (admin)
MERCADOPAGO_ACCESS_TOKEN=       # Token de acceso MercadoPago
```

## Key Design Decisions

1. **Standalone Components**: Simplifica arquitectura, alineado con dirección moderna de Angular
2. **Flat ESLint Config**: Usa nuevo formato flat config (eslint.config.mjs)
3. **Mock Payment Provider**: Simplifica desarrollo MVP, listo para integración con Mercado Pago
4. **Role-based Access**: Tabla única de usuario con campo role en vez de tablas separadas
5. **Cloudflare Pages**: Hosting estático con performance edge
6. **Cloudflare Workers**: Manejo serverless de webhooks sin servidor backend
7. **Supabase Edge Functions**: Funciones Deno para lógica compleja (MercadoPago, wallet)

## Vertical Stack Debugging Workflow

Cuando se debuggea problemas complejos que abarcan múltiples capas de la aplicación, usa el enfoque **Vertical Stack Debugging**.

### Cuándo Usar

- Violaciones de políticas RLS
- Fallos en uploads de Storage
- Problemas de autenticación
- Problemas de flujo de datos entre capas
- Bugs de integración entre frontend y backend

### Proceso

1. **Crear Audit Branch**
   ```bash
   git checkout -b audit/feature-name
   ```

2. **Mapear el Full Stack**
   Trazar la feature a través de todas las capas:
   ```
   UI Component → Service → SDK → Storage/DB → RLS → Schema
   ```

3. **Documentar Hallazgos**
   Crear documento de audit detallado (ej. `PHOTO_UPLOAD_AUDIT.md`):
   - Análisis de schema de base de datos
   - Políticas RLS
   - Código de capa de servicio
   - Integración de componentes
   - Identificación de causa raíz
   - Plan de implementación de fix

4. **Implementar y Testear**
   - Aplicar fixes a todas las capas afectadas
   - Verificar políticas RLS
   - Testear flujo end-to-end
   - Documentar solución

5. **Merge y Clean Up**
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

### Testing RLS Policies

Usa Supabase SQL Editor con tu sesión:

```sql
-- Test como usuario autenticado
SET LOCAL "request.jwt.claims" = '{"sub": "your-user-uuid"}';

-- Test storage policy
SELECT (storage.foldername('user-uuid/file.jpg'))[1] = 'user-uuid';
-- Debería retornar: true

SELECT (storage.foldername('avatars/user-uuid/file.jpg'))[1] = 'user-uuid';
-- Debería retornar: false (este es el bug!)
```

## Common Pitfalls

### 1. TypeScript Type Mismatches

**Problem**: Tipos de base de datos no coinciden con código

**Solution**: Mantener `database.types.ts` sincronizado con schema de base de datos
```bash
npm run sync:types  # Regenera tipos desde Supabase
```

### 2. RLS Policy Violations

**Problem**: `new row violates row-level security policy`

**Debug Steps**:
1. Verificar si usuario está autenticado: `await supabase.auth.getUser()`
2. Verificar que estructura de path coincida con expectativas de policy
3. Testear policy en Supabase SQL editor con tu user UUID
4. Comparar con ejemplos que funcionan (ej. `CarsService.uploadPhoto()`)

## References

- Ver [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md) para arquitectura de Storage y RLS
- Ver [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) para arquitectura de pagos
- Ver [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) para comandos y CI/CD
