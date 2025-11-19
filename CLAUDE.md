# CLAUDE.md

Guía principal para Claude Code trabajando en AutoRenta.

> **Nota**: Esta guía ha sido modularizada. Para información detallada, consulta los archivos específicos:
> - [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md) - Arquitectura técnica (Angular, Supabase, Database)
> - [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md) - Comandos, CI/CD y deployment
> - [CLAUDE_STORAGE.md](./CLAUDE_STORAGE.md) - Supabase Storage, buckets y RLS
> - [CLAUDE_PAYMENTS.md](./CLAUDE_PAYMENTS.md) - Sistema de pagos MercadoPago y Wallet
> - [CLAUDE_MCP.md](./CLAUDE_MCP.md) - Model Context Protocol integration
> - **[AUDIT_MCP_INDEX.md](./AUDIT_MCP_INDEX.md) - 🔍 MCP Auditor: Security & Performance** ⭐ **VER PRIMERO**

## Project Overview

AutoRenta es un marketplace de renta de autos MVP para Argentina construido con:
- **Frontend**: Angular 17 (standalone components) + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Hosting**: Cloudflare Pages
- **Workers**: Cloudflare Workers para webhooks y workers especializados
- **Payments**: MercadoPago (producción) + Mock (desarrollo)

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
npm run install

# 4. Verificar configuración
npm run check:auth
npm run status
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

### ⭐ Workflow de Auditoría PRE-CÓDIGO (NUEVA)

**ANTES de escribir código, verifica seguridad y RLS:**

```bash
# Opción 1: Script interactivo
./tools/audit-before-code.sh [nombre_tabla]

# Opción 2: En Claude Code
@autorenta-platform Audita RLS para [nombre_tabla]
```

**Flujo completo:**
1. `./tools/audit-before-code.sh wallet_transactions` → Ver qué auditar
2. `@autorenta-platform Audita RLS para wallet_transactions` → Revisar políticas
3. Si no tiene RLS: `@autorenta-platform Genera RLS policies para wallet_transactions`
4. Aplicar SQL generado en Supabase
5. `npm run sync:types` → Sincronizar tipos
6. Ahora SÍ escribir código ✅

**Ver guía completa**: [AUDIT_MCP_INDEX.md](./AUDIT_MCP_INDEX.md)

### Supabase Local (Docker)

```bash
# Requisitos previos
sudo systemctl start docker   # Asegúrate de que Docker daemon esté activo
supabase start                # Levanta Postgres, auth, storage, realtime, etc.
supabase status               # Muestra URLs locales y llaves
supabase stop                 # Apaga y respalda los contenedores
```

- Base de datos local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- API Gateway (Kong): `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Mailpit: `http://127.0.0.1:54324`

La CLI crea contenedores `supabase_*_autorenta` y los marca como saludables. Si ves servicios "Stopped" en `supabase status` (por ejemplo `imgproxy` o `pooler`), es normal: solo arrancan cuando se necesitan. Recuerda ejecutar `supabase stop` para liberar recursos antes de limpiar Docker o apagar la máquina.



### Comandos Principales

```bash
npm run dev              # Desarrollo
npm run test:quick       # Tests rápidos
npm run ci               # Pipeline completo (lint + test + build)
npm run deploy           # Deploy a producción
npm run status           # Estado del proyecto
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
- **Reference ID**: pisqjmoklivzpwufhscx
- **URL**: https://pisqjmoklivzpwufhscx.supabase.co
- **Región**: us-east-2
- **Edge Functions activas**: 20 functions (mercadopago-webhook, create-preference, wallet-*, etc.)

#### Cloudflare
- **Account ID**: `5b448192fe4b369642b68ad8f53a7603`
- **Workers configurados**: payments_webhook, ai-car-generator, doc-verifier, mercadopago-oauth-redirect
- **Pages Project**: `autorenta-web` (autorenta-web.pages.dev)

**Actualizar esta info**: Ejecuta `./tools/check-auth.sh`

## Repository Structure

```
autorenta/
  apps/web/                      # Angular 17 app
    src/app/
      core/                      # Services, guards, interceptors
      features/                  # Feature modules (lazy-loaded)
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

### Frontend (Angular 17)
- **Standalone Components** - No NgModules
- **Lazy Loading** - Features cargados bajo demanda
- **Route Guards** - AuthGuard para rutas protegidas
- **HTTP Interceptor** - JWT automático en requests
- **Signals & RxJS** - State management reactivo

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

### 3. Booking System
- Solicitud de booking con validación de disponibilidad
- Estados: pending, approved, active, completed, cancelled
- Lock de fondos en wallet durante booking

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

## Common Commands Reference

### Development
```bash
npm run dev              # Full dev environment
npm run dev:web          # Solo web app
npm run dev:worker       # Solo payment webhook
```

### Testing
```bash
npm run test             # All tests
npm run test:quick       # Quick tests (no coverage)
npm run test:e2e         # Playwright E2E tests
```

### Building & Deployment
```bash
npm run build            # Build all
npm run ci               # Full CI pipeline
npm run deploy           # Deploy to production
```

### Utilities
```bash
npm run status           # Project health check
npm run lint:fix         # Fix lint + format
npm run sync:types       # Sync DB types from Supabase
```

**Todos los comandos**: [CLAUDE_WORKFLOWS.md](./CLAUDE_WORKFLOWS.md)

## Development Workflow

### 1. Trabajar en Feature

```bash
# 1. Crear branch
git checkout -b feature/nueva-funcionalidad

# 2. Iniciar dev
npm run dev

# 3. Hacer cambios...
# (Husky ejecuta lint + format en pre-commit)

# 4. Tests
npm run test:quick
```

### 2. Antes de PR

```bash
# Run full CI pipeline
npm run ci

# Si todo pasa:
git push origin feature/nueva-funcionalidad

# Crear PR en GitHub
```

### 3. Deployment (después de merge a main)

```bash
# Automático vía GitHub Actions
# O manual:
npm run deploy
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
npm run sync:types
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
npm run status

# Check autenticación
npm run check:auth

# Ver estado del proyecto
npm run status

# Troubleshooting
cat docs/runbooks/troubleshooting.md
```

## Last Updated

- **Date**: 2025-11-06
- **Version**: v1.0 (modularizado)
- **Changelog**: Dividido en archivos específicos para mejor performance de Claude Code

---

**Nota**: Este archivo es ahora ~8k caracteres (vs 41k original), mejorando significativamente el performance de Claude Code. Para información detallada, consulta los archivos modulares correspondientes.
