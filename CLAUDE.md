# CLAUDE.md

Guía principal para Claude Code trabajando en AutoRenta.

> **Nota**: Esta guía ha sido modularizada. Para información detallada, consulta los archivos específicos:
> - [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md) - Arquitectura técnica (Angular, Supabase, Database)
> - [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) - Comandos, CI/CD y deployment
> - [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md) - Supabase Storage, buckets y RLS
> - [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) - Sistema de pagos MercadoPago y Wallet
> - [CLAUDE_MCP.md](./CLAUDE_MCP.md) - Model Context Protocol integration

## Project Overview

AutoRenta es un marketplace de renta de autos MVP para Argentina construido con:
- **Frontend**: Angular 20 (standalone components) + Tailwind CSS + PrimeNG
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Cloudflare Pages
- **Workers**: Cloudflare Workers para webhooks y workers especializados
- **Payments**: MercadoPago (producción) + Mock (desarrollo)
- **Package Manager**: pnpm 10.22.0

## Preferencias de Documentación

**IMPORTANTE**: NO crear archivos .md para cada acción o cambio rutinario.
- SOLO crear archivos .md cuando cambie la arquitectura de la plataforma
- Cursor es la documentación viva - no necesita archivos .md para tareas rutinarias
- Excepciones: cambios arquitectónicos importantes, decisiones de diseño significativas, runbooks operativos críticos

## Quick Start

### Setup Inicial (una vez)

```bash
# 1. Configurar autenticación CLI
./tools/setup-auth.sh    # GitHub, Supabase, Cloudflare

# 2. Configurar secrets de desarrollo
cp .env.local.example .env.local
# Editar .env.local y llenar con tus credenciales:
# - NG_APP_SUPABASE_ANON_KEY (obtener de Supabase Dashboard)
# - NG_APP_MAPBOX_ACCESS_TOKEN (obtener de Mapbox)
# - NG_APP_PAYPAL_CLIENT_ID (obtener de PayPal Developer)

# 3. Instalar dependencias
pnpm install

# 4. Verificar configuración
pnpm run check:auth
pnpm run status
```

**⚠️ IMPORTANTE**: Nunca commitear `.env.local` - está en `.gitignore` automáticamente.

### Desarrollo Diario

```bash
# Iniciar entorno de desarrollo
npm run dev              # Angular + Payment webhook

# URLs locales:
# - Web: http://localhost:4200
# - Worker: http://localhost:8787
```

### Comandos Principales

```bash
pnpm run dev             # Desarrollo
pnpm run test:quick      # Tests rápidos
pnpm run ci              # Pipeline completo (lint + test + build)
pnpm run deploy          # Deploy a producción
pnpm run status          # Estado del proyecto
```

**Ver todos los comandos**: [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md)

## Authentication & Configuration

### Herramientas Configuradas

Después del setup inicial (`./tools/setup-auth.sh`):
- `gh` (GitHub CLI) - Credenciales en `~/.config/gh/`
- `supabase` CLI - Token en `~/.supabase/access-token`
- `wrangler` (Cloudflare) - Token en `~/.wrangler/config/default.toml`

### Acceso y Configuración Actual (Auditoría 2025-11-03)

#### GitHub
- **Repositorio**: `ecucondorSA/autorenta` (privado)
- **Branch principal**: `main`
- **Workflows activos**: 14 workflows (Build and Deploy, CI, Security Scan, E2E Tests, etc.)
- **Secrets configurados**: 13 secrets (CF_*, SUPABASE_*, MERCADOPAGO_*, etc.)

#### Supabase
- **Proyecto**: autarenta
- **Reference ID**: obxvffplochgeiclibng
- **URL**: https://obxvffplochgeiclibng.supabase.co
- **Región**: us-east-2
- **Edge Functions activas**: 30+ functions (mercadopago-*, google-calendar-oauth, wallet-*, monitoring-*, etc.)

#### Cloudflare
- **Account ID**: `5b448192fe4b369642b68ad8f53a7603`
- **Workers configurados**: payments_webhook, ai-car-generator, doc-verifier, mercadopago-oauth-redirect
- **Pages Project**: `autorenta-web` (autorenta-web.pages.dev)

**Actualizar esta info**: Ejecuta `./tools/check-auth.sh`

## Repository Structure

```
autorenta/
  apps/web/                      # Angular 20 app
    src/app/
      core/                      # Services, guards, interceptors
      features/                  # Feature modules (lazy-loaded)
        auth/                    # Authentication
        cars/                    # Car listings & management
        bookings/                # Booking system
        admin/                   # Admin dashboard
        notifications/           # Notifications system
        driver-profile/          # Driver profiles
        dashboard/               # User dashboards
      shared/                    # Shared components
  functions/workers/             # Cloudflare Workers
    payments_webhook/            # Mock payment webhook (dev only)
    ai-car-generator/            # AI car generator
    doc-verifier/                # Document verifier
  supabase/
    functions/                   # Edge Functions (Deno)
    migrations/                  # SQL migrations
  database/                      # SQL setup scripts
  docs/                          # Documentation
    runbooks/                    # Operational runbooks
    guides/                      # Feature guides
  tools/                         # CLI tools y scripts
```

**Estructura detallada**: [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)

## Architecture Overview

### Frontend (Angular 20)
- **Standalone Components** - No NgModules
- **Lazy Loading** - Features cargados bajo demanda
- **Route Guards** - AuthGuard para rutas protegidas
- **HTTP Interceptor** - JWT automático en requests
- **Signals & RxJS** - State management reactivo
- **UI Libraries** - PrimeNG 20.3.0, Tailwind CSS, Ionic Angular

### Backend (Supabase)
- **PostgreSQL** - Base de datos con RLS
- **Edge Functions** - Lógica serverless (Deno)
- **Storage** - Imágenes y documentos
- **Auth** - Sistema de autenticación integrado

### Payment System
- **Producción**: MercadoPago (Supabase Edge Functions)
- **Desarrollo**: Mock webhooks (Cloudflare Worker local)

**Detalles completos**: [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)

## Key Features & Systems

### 1. Authentication & Authorization
- Login/Register con Supabase Auth
- Role-based access: `locador`, `locatario`, `ambos`, `admin`
- RLS policies en todas las tablas

### 2. Car Listings
- CRUD de autos con fotos (hasta 10 por auto)
- Estados: draft, pending, active, suspended
- Verificación de locador requerida para publicar
- Dynamic pricing con AI car generator

### 3. Booking System
- Solicitud de booking con validación de disponibilidad
- Estados: pending, approved, active, completed, cancelled
- Lock de fondos en wallet durante booking
- Google Calendar integration para sincronización automática

### 4. Payment & Wallet System
- Depósitos vía MercadoPago (tarjeta, débito, efectivo)
- Wallet interno con balance y locked_balance
- Efectivo marcado como non-withdrawable
- Split payments a locador (85%) y plataforma (15%)

**Sistema de pagos completo**: [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md)

### 5. Storage System
- Buckets: `avatars`, `car-images`, `documents`
- RLS policies para acceso seguro
- Path convention: `{user_id}/{resource_id}/{filename}`
- **CRITICAL**: NO incluir nombre de bucket en path

**Guía de Storage**: [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md)

### 6. Google Calendar Integration
- OAuth 2.0 flow para conectar calendarios
- Sincronización bidireccional de bookings
- Calendarios secundarios por auto
- Eventos con colores por estado del booking

**Guía completa**: [docs/GOOGLE_CALENDAR_INTEGRATION.md](./docs/GOOGLE_CALENDAR_INTEGRATION.md)

### 7. Notifications System
- Notificaciones en tiempo real
- Preferencias configurables por usuario
- Dashboard de notificaciones
- Integration con Supabase Realtime

## Common Commands Reference

### Development
```bash
pnpm run dev             # Full dev environment
pnpm run dev:web         # Solo web app
pnpm run dev:worker      # Solo payment webhook
```

### Testing
```bash
pnpm run test            # All tests
pnpm run test:quick      # Quick tests (no coverage)
pnpm run test:e2e        # Playwright E2E tests
pnpm run test:e2e:calendar  # Google Calendar OAuth tests
```

### Building & Deployment
```bash
pnpm run build           # Build all
pnpm run ci              # Full CI pipeline
pnpm run deploy          # Deploy to production
```

### Utilities
```bash
pnpm run status          # Project health check
pnpm run lint:fix        # Fix lint + format
pnpm run sync:types      # Sync DB types from Supabase
pnpm run check:a11y      # Accessibility checks
```

**Todos los comandos**: [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md)

## Development Workflow

### 1. Trabajar en Feature

```bash
# 1. Crear branch
git checkout -b feature/nueva-funcionalidad

# 2. Iniciar dev
pnpm run dev

# 3. Hacer cambios...
# (Husky ejecuta lint + format en pre-commit)

# 4. Tests
pnpm run test:quick
```

### 2. Antes de PR

```bash
# Run full CI pipeline
pnpm run ci

# Si todo pasa:
git push origin feature/nueva-funcionalidad

# Crear PR en GitHub
```

### 3. Deployment (después de merge a main)

```bash
# Automático vía GitHub Actions
# O manual:
pnpm run deploy
```

## Debugging Resources

### Operational Runbooks

**Documentación operativa crítica** (actualizada 2025-11-03):

- **[Runbook: Troubleshooting](./docs/runbooks/troubleshooting.md)**: Guía completa de solución de problemas
- **[Guía de Deployment](./docs/deployment-guide.md)**: Procedimientos de deployment
- **[Disaster Recovery Plan](./docs/disaster-recovery-plan.md)**: Plan de recuperación ante desastres
- **[Runbook: Split Payment Failure](./docs/runbooks/split-payment-failure.md)**: Problemas con pagos divididos
- **[Runbook: Database Backup & Restore](./docs/runbooks/database-backup-restore.md)**: Backup y restauración
- **[Runbook: Secret Rotation](./docs/runbooks/secret-rotation.md)**: Rotación de secrets

**Ver índice completo**: [docs/README.md](./docs/README.md)

### Vertical Stack Debugging

Para bugs complejos que abarcan múltiples capas (UI → Service → DB → RLS):

1. Crear audit branch: `git checkout -b audit/feature-name`
2. Mapear full stack: `UI → Service → SDK → Storage/DB → RLS → Schema`
3. Documentar hallazgos en archivo audit (ej. `PHOTO_UPLOAD_AUDIT.md`)
4. Implementar y testear fixes
5. Merge con `--no-ff`

**Guía completa**: [CLAUDE_ARCHITECTURE.md#vertical-stack-debugging](./CLAUDE_ARCHITECTURE.md#vertical-stack-debugging-workflow)

## Debugging Build Errors

### Filosofía: Preservar Funcionalidad

**CRÍTICO**: Cuando encuentres errores de compilación, NUNCA elimines componentes o funcionalidades para "arreglar" el error. En su lugar:

1. **Analiza el error real**: Lee el mensaje de error completo para entender el problema subyacente
2. **Identifica la causa raíz**: Determina qué está causando el error (imports faltantes, tipos incorrectos, configuración)
3. **Arregla el problema**: Soluciona el problema real preservando toda la funcionalidad
4. **Verifica la funcionalidad**: Asegúrate de que ninguna feature se perdió en el proceso

### Proceso de Debugging de Angular Build Errors

#### Paso 1: Identificar todos los errores

```bash
# Ver el log completo de compilación
tail -200 app_start.log | grep -E "ERROR|WARNING"

# Listar todos los componentes faltantes
grep "is not a known element" app_start.log | grep -o "'app-[^']*'" | sort -u
```

#### Paso 2: Para cada error, determina la solución correcta

**Error**: `'app-component-name' is not a known element`
**Causa**: Componente no está en el array `imports` del módulo/componente
**Solución**: Agregar el componente a `imports`, NO removerlo del template

```typescript
// ✅ CORRECTO
imports: [
  CommonModule,
  MissingComponent,  // <- Agregar componente faltante
],

// ❌ INCORRECTO - No remover del template
// Esto elimina funcionalidad
```

**Error**: `Property 'method' does not exist on type 'Component'`
**Causa**: Método o propiedad falta en el componente TypeScript
**Solución**: Agregar el método/propiedad faltante, NO remover del template

```typescript
// ✅ CORRECTO
onMethodClick(param: string): void {
  // Implementar lógica del método
}

// ❌ INCORRECTO
// (click)="onMethodClick($event)"  <- No eliminar del template
```

**Error**: `Property 'prop' is private and only accessible within class`
**Causa**: Propiedad privada siendo accedida desde el template
**Solución**: Cambiar a `public` o crear un getter público, NO remover del template

```typescript
// ✅ CORRECTO - Opción 1: Hacer público
public map: MapboxMap | null = null;

// ✅ CORRECTO - Opción 2: Crear getter
private map: MapboxMap | null = null;
get mapInstance(): MapboxMap | null {
  return this.map;
}

// ❌ INCORRECTO
// [map]="component?.map"  <- No eliminar del template
```

**Error**: `Parser Error: Missing expected } at column X`
**Causa**: Sintaxis de template inválida (ej: spread operator en template)
**Solución**: Mover la lógica a un método del componente

```typescript
// ❌ INCORRECTO - Spread operator en template
(change)="data.set({...data(), field: $event})"

// ✅ CORRECTO - Método helper
onFieldChange(event: Event): void {
  this.data.set({
    ...this.data(),
    field: (event.target as HTMLInputElement).value
  });
}

// En template:
(change)="onFieldChange($event)"
```

#### Paso 3: Verificar que no se perdió funcionalidad

Después de arreglar errores, verifica:

```bash
# 1. Build exitoso
tail -20 app_start.log | grep "Application bundle generation complete"

# 2. No quedan errores
tail -100 app_start.log | grep ERROR

# 3. Todos los componentes siguen en el template
grep -o "app-[a-z-]*" src/app/features/*/\*.html | sort -u

# 4. Todas las features siguen disponibles
# - Verifica manualmente en http://localhost:4200
```

### Checklist Anti-Patterns a Evitar

- ❌ Eliminar componentes del template porque no están importados
- ❌ Eliminar métodos del template porque no existen en el componente
- ❌ Comentar secciones del template para "arreglar" errores
- ❌ Remover imports "no usados" sin verificar si están en el template
- ❌ Simplificar funcionalidad compleja para evitar errors de tipos

### Checklist de Buenas Prácticas

- ✅ Agregar imports faltantes para componentes usados en template
- ✅ Implementar métodos faltantes referenciados en template
- ✅ Hacer públicas las propiedades accedidas desde template
- ✅ Crear métodos helper para lógica compleja de template
- ✅ Sincronizar tipos cuando hay cambios en DB: `npm run sync:types`
- ✅ Limpiar cache de Angular si hay errores extraños: `rm -rf apps/web/.angular`

## Common Pitfalls

### 1. Storage Path Errors

```typescript
// ❌ WRONG - Incluye bucket name
const filePath = `avatars/${userId}/${filename}`;

// ✅ CORRECT - Sin bucket name
const filePath = `${userId}/${filename}`;
```

**Por qué**: RLS policies verifican `(storage.foldername(name))[1] = auth.uid()::text`

### 2. Payment System Confusion

- **Producción**: Usa Supabase Edge Functions (MercadoPago real)
- **Desarrollo**: Usa Cloudflare Worker (mock webhooks)
- **NEVER** llamar `payments.service.ts::markAsPaid()` en producción

**Detalles**: [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md)

### 3. RLS Policy Violations

```bash
# Debug con SQL Editor de Supabase
SET LOCAL "request.jwt.claims" = '{"sub": "your-user-uuid"}';
SELECT (storage.foldername('user-uuid/file.jpg'))[1] = 'user-uuid';
```

### 4. TypeScript Type Mismatches

```bash
# Sincronizar tipos después de cambios en DB
pnpm run sync:types
```

## Environment Variables

### Angular (`.env.development.local`)

```bash
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=<your-anon-key>
NG_APP_DEFAULT_CURRENCY=ARS
NG_APP_PAYMENTS_WEBHOOK_URL=http://localhost:8787/webhooks/payments
```

### Cloudflare Worker (via `wrangler secret`)

```bash
SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
MERCADOPAGO_ACCESS_TOKEN=<access-token>
```

**Ver configuración completa de secrets**: [CLAUDE_WORKFLOWS.md#secrets-configuration](./CLAUDE_WORKFLOWS.md#secrets-configuration)

## Code Quality

### ESLint + Prettier

- **Pre-commit hooks**: Husky ejecuta automáticamente
- **Manual**: `npm run lint:fix`
- **Config**: `eslint.config.mjs` (flat config)

### Testing

- **Unit Tests**: Karma + Jasmine (Angular)
- **E2E Tests**: Playwright
- **Coverage Goal**: 80%+ por módulo

### Git Workflow

- **Main branch**: Protegido, requiere PR + review
- **Feature branches**: `feature/nombre-descriptivo`
- **Audit branches**: `audit/feature-name` (para debugging complejo)

## Model Context Protocol (MCP)

AutoRenta usa servidores MCP de Cloudflare para workflows mejorados:

### Active Servers (Free Tier)
- **cloudflare-builds**: Deploy y manage builds
- **cloudflare-docs**: Documentación rápida
- **cloudflare-bindings**: Manage KV/R2/D1

### Recommended (Paid)
- **cloudflare-observability**: Logs y debugging (CRÍTICO para webhooks)
- **cloudflare-audit-logs**: Compliance y security
- **cloudflare-graphql**: Analytics y performance

**Configuración**: `.claude/config.json`
**Guía completa**: [CLAUDE_MCP.md](./CLAUDE_MCP.md)

## Additional Resources

### Documentation by Topic

| Topic | File | Description |
|-------|------|-------------|
| **Arquitectura** | [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md) | Angular, Supabase, Database, Debugging |
| **Workflows** | [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) | Comandos, CI/CD, Deployment |
| **Storage** | [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md) | Buckets, RLS, Path conventions |
| **Payments** | [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) | MercadoPago, Wallet, Webhooks |
| **MCP** | [CLAUDE_MCP.md](./CLAUDE_MCP.md) | Model Context Protocol |
| **Deployment** | [docs/deployment-guide.md](./docs/deployment-guide.md) | Deployment procedures |
| **Troubleshooting** | [docs/runbooks/troubleshooting.md](./docs/runbooks/troubleshooting.md) | Problem solving |

### Feature Guides

- **Wallet System**: `WALLET_SYSTEM_DOCUMENTATION.md`
- **Cash Deposits**: `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`
- **MercadoPago Features**: `docs/guides/features/MERCADOPAGO_*.md`
- **Testing Plan**: `docs/testing/TESTING_PLAN.md`

### Skills & Optimization

- **Claude Skills Guide**: `CLAUDE_SKILLS_GUIDE.md` (preparación para Skills)
- **Code Improvements**: `CLAUDE_CODE_IMPROVEMENTS.md` (análisis de mejoras)
- **Workflows Script**: `tools/claude-workflows.sh` (workflows automatizados)

## Getting Help

```bash
# Ver ayuda de comandos
./tools/run.sh help
pnpm run status

# Check autenticación
pnpm run check:auth

# Ver estado del proyecto
pnpm run status

# Troubleshooting
cat docs/runbooks/troubleshooting.md
```

## Recent Updates (2025-11-15)

### Major Changes Since Last Update (2025-11-06)
- ✅ **Google Calendar Integration**: OAuth 2.0 flow completo con sincronización bidireccional de bookings
- ✅ **Notifications System**: Sistema de notificaciones en tiempo real con preferencias configurables
- ✅ **Driver Profile Page**: Página optimizada con diseño premium y manejo de errores
- ✅ **Angular 20 Migration**: Upgrade completo a Angular 20.3.7 con PrimeNG 20.3.0
- ✅ **pnpm Migration**: Cambio de package manager a pnpm 10.22.0
- ✅ **Testing Improvements**: Nuevos tests E2E para Google Calendar y booking flows
- ✅ **CI/CD Updates**: Workflow actualizado para usar pnpm en GitHub Actions

### Recent Commits
```
fd6fc81 feat: complete Google Calendar integration with management UI
a1d1a51 fix: correct pnpm setup order in deploy workflow
b52b808 fix: add OAuth callback redirect handler for root domain
710778f fix: Resolve Angular compilation errors in DriverProfilePage
c5e6fc3 feat: optimize driver profile page with premium visual design
```

## Last Updated

- **Date**: 2025-11-15
- **Version**: v1.1 (Angular 20 + pnpm + nuevas features)
- **Previous Version**: v1.0 (2025-11-06)
- **Changelog**:
  - Actualizado a Angular 20.3.7 y pnpm 10.22.0
  - Agregadas secciones para Google Calendar y Notifications
  - Todos los comandos npm actualizados a pnpm
  - Limpieza de contenido obsoleto

---

**Nota**: Este archivo es ahora ~9k caracteres (modularizado), optimizado para Claude Code. Para información detallada, consulta los archivos modulares correspondientes.