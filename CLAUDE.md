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

# 2. Instalar dependencias
npm run install

# 3. Verificar configuración
npm run check:auth
npm run status
```

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
- **Reference ID**: obxvffplochgeiclibng
- **URL**: https://obxvffplochgeiclibng.supabase.co
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

### 5. Common Development Errors

**⭐ NUEVO:** Ver guía completa de errores comunes y cómo prevenirlos:

- **[DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)** - Patrones de errores + soluciones
- **[ci-build-errors-troubleshooting.md](./docs/runbooks/ci-build-errors-troubleshooting.md)** - Fix rápido de CI

**Errores más comunes prevenibles:**

- Templates inline grandes (>50 líneas) → usar `.html` externo
- Toast service con 1 parámetro → usar 2-3 parámetros `(title, message)`
- Parámetros sin tipo → agregar tipos explícitos
- Imports a módulos inexistentes → verificar paths
- IonicModule faltante → importar en componentes standalone
- Tipos de Supabase desactualizados → sincronizar después de migrations

**Ver documentación completa para ejemplos y fixes automáticos.**

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
| **Dev Guidelines** | [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md) | Prevención de errores comunes ⭐ NEW |
| **CI Build Errors** | [docs/runbooks/ci-build-errors-troubleshooting.md](./docs/runbooks/ci-build-errors-troubleshooting.md) | Troubleshooting de errores de CI ⭐ NEW |

### Feature Guides

- **Wallet System**: `WALLET_SYSTEM_DOCUMENTATION.md`
- **Cash Deposits**: `CASH_DEPOSITS_NON_WITHDRAWABLE_FIX.md`
- **MercadoPago Features**: `docs/guides/features/MERCADOPAGO_*.md`
- **Testing Plan**: `docs/testing/TESTING_PLAN.md`

### CI/CD & Quality

- **CI Fix Progress**: `CI_FIX_PROGRESS.md` (2,411 → 211 errores, 91.2% reducción)
- **Development Guidelines**: `DEVELOPMENT_GUIDELINES.md` (Errores comunes y cómo evitarlos)
- **CI Troubleshooting**: `docs/runbooks/ci-build-errors-troubleshooting.md` (Guía rápida de fixes)

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
