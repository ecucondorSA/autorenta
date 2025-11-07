# CLAUDE_WORKFLOWS.md

Comandos, workflows y CI/CD de AutoRenta.

## Consolidated Script Runner (✨ Nov 2025)

**Todos los comandos consolidados en una interfaz CLI unificada:**

```bash
# Dos formas de ejecutar comandos:
./tools/run.sh [command]   # Ejecución directa
npm run [command]          # Vía shortcuts de package.json
```

## 🚀 Quick Start Commands

```bash
npm run dev                # Start entorno dev completo (web + worker)
npm run test:quick         # Run tests rápidos (sin coverage)
npm run ci                 # Pipeline CI/CD completo (lint + test + build)
npm run deploy             # Deploy a producción (con confirmación)
npm run status             # Mostrar estado del proyecto
```

## 📋 All Available Commands

### DEVELOPMENT

```bash
npm run dev              # Start web + worker en background
npm run dev:web          # Start solo web app
npm run dev:worker       # Start solo payment webhook
npm run dev:stop         # Detener todos los dev servers
```

**URLs Locales**:
- Web: http://localhost:4200
- Worker: http://localhost:8787
- Supabase Local: http://localhost:54321

### TESTING

```bash
npm run test             # Run todos los tests
npm run test:quick       # Tests rápidos (sin coverage)
npm run test:coverage    # Tests con coverage report
npm run test:e2e         # E2E tests con Playwright
npm run test:e2e:ui      # E2E tests en UI mode
```

**Test Coverage Goal**: 80%+ por módulo

### BUILDING

```bash
npm run build            # Build todo (paralelo)
npm run build:web        # Build solo web app
npm run build:worker     # Build solo worker
```

**Build Outputs**:
- Web: `apps/web/dist/autorenta/`
- Worker: `functions/workers/payments_webhook/dist/`

### DEPLOYMENT

```bash
npm run deploy           # Deploy completo (requiere confirmación)
npm run deploy:web       # Deploy web a Cloudflare Pages
npm run deploy:worker    # Deploy payment webhook
```

**Pre-deployment Checklist**:
1. ✅ Tests pasando (`npm run test`)
2. ✅ Build exitoso (`npm run build`)
3. ✅ Lint sin errores (`npm run lint`)
4. ✅ Secrets configurados (ver [Secrets Configuration](#secrets-configuration))

### CI/CD

```bash
npm run ci               # Pipeline completo (lint + test + build)
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues + format
npm run format           # Format code con Prettier
```

### UTILITIES

```bash
npm run install          # Install todas las dependencias (paralelo)
npm run clean            # Limpiar artifacts de build
npm run sync:types       # Sincronizar database types desde Supabase
npm run status           # Mostrar estado del proyecto (git, builds, servers)
```

### SETUP (one-time)

```bash
npm run setup:auth       # Setup auth CLI (GitHub, Supabase, Cloudflare)
npm run setup:prod       # Setup entorno de producción
```

### MONITORING

```bash
npm run monitor:health   # Check system health
npm run monitor:wallet   # Monitor depósitos de wallet
npm run check:auth       # Check estado de autenticación
```

## 💡 Benefits of Consolidated Scripts

- ✅ Single source of truth (`tools/run.sh`)
- ✅ Estructura consistente de comandos en todas las operaciones
- ✅ Mejor error handling y logging
- ✅ Ejecución paralela para tareas independientes
- ✅ Auto-background support para comandos de larga duración
- ✅ Ayuda categorizada con `./tools/run.sh help`

## 🔧 Detailed Help

```bash
./tools/run.sh help      # Mostrar todos los comandos con descripciones
npm run status           # Quick project health check
```

## Development Workflow

### 1. Start Local Development

```bash
# Terminal 1: Start full dev environment
npm run dev

# Esto inicia:
# - Angular dev server (http://localhost:4200)
# - Payment webhook worker (http://localhost:8787)
```

### 2. Make Changes

```bash
# Work on features...
# Files auto-reload on save
```

### 3. Before Committing

```bash
# Husky ejecuta automáticamente:
# - Prettier (format)
# - ESLint (lint)

# O ejecuta manualmente:
npm run lint:fix
```

### 4. Run Tests

```bash
# Quick tests durante desarrollo
npm run test:quick

# Full tests antes de commit
npm run test
```

### 5. Build and Deploy

```bash
# Full CI pipeline
npm run ci

# Si todo pasa, deploy
npm run deploy
```

## CI/CD Pipeline (GitHub Actions)

### Workflows Configurados

**Build and Deploy** (`.github/workflows/deploy.yml`):
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    - Run ESLint
    - Check formatting

  test:
    - Run unit tests
    - Run E2E tests
    - Upload coverage

  build:
    - Build web app
    - Build workers

  deploy:
    - Deploy to Cloudflare Pages
    - Deploy Edge Functions to Supabase
    - Deploy Workers to Cloudflare
```

**Security Scan** (`.github/workflows/security.yml`):
- npm audit
- Snyk scan (si configurado)
- OWASP dependency check

**E2E Tests** (`.github/workflows/e2e.yml`):
- Playwright tests
- Visual regression tests (si configurado)

### Branch Protection

**main branch**:
- ✅ Require PR antes de merge
- ✅ Require status checks passing
- ✅ Require review de al menos 1 persona
- ✅ Require linear history
- ❌ No direct pushes (excepto emergencias)

## Secrets Configuration

### GitHub Secrets

Configurar en: **Settings** > **Secrets and variables** > **Actions**

```bash
# Cloudflare
CF_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603
CF_API_TOKEN=<your-token>
CF_PAGES_PROJECT=autorenta-web

# Supabase
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-<your-token>
MERCADOPAGO_PUBLIC_KEY=APP_USR-<your-public-key>
MERCADOPAGO_CLIENT_SECRET=<your-client-secret>

# Database
DATABASE_URL=<your-db-url>
DB_PASSWORD=<your-db-password>

# Other
MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
```

### Supabase Secrets

```bash
# Set secrets en Supabase Edge Functions
npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-***
npx supabase secrets set MERCADOPAGO_APPLICATION_ID=***
npx supabase secrets set MERCADOPAGO_CLIENT_SECRET=***
npx supabase secrets set MERCADOPAGO_MARKETPLACE_ID=***
npx supabase secrets set MERCADOPAGO_PUBLIC_KEY=***
npx supabase secrets set MERCADOPAGO_OAUTH_REDIRECT_URI=***
npx supabase secrets set PLATFORM_MARGIN_PERCENT=15
npx supabase secrets set SUPABASE_URL=https://[project].supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=***
npx supabase secrets set APP_BASE_URL=https://autorenta.com
npx supabase secrets set DOC_VERIFIER_URL=https://doc-verifier.workers.dev
npx supabase secrets set MAPBOX_ACCESS_TOKEN=***

# List secrets
npx supabase secrets list
```

### Cloudflare Worker Secrets

```bash
# Set secrets para workers
wrangler secret put SUPABASE_URL --name payments_webhook
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name payments_webhook
wrangler secret put MERCADOPAGO_ACCESS_TOKEN --name payments_webhook

# List secrets
wrangler secret list --name payments_webhook
```

## Claude Code Optimization

### Auto-Background Commands

AutoRenta aprovecha **auto-background** de Claude Code para ejecutar comandos largos sin timeouts.

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

```bash
# Cargar workflows
source tools/claude-workflows.sh

# CI/CD Pipeline
npm run ci                 # lint + test + build en paralelo

# Desarrollo
npm run dev                # Inicia web + worker en background

# Deploy
npm run deploy             # Deploy completo con confirmación
```

**Ventajas**:
- ⏱️ 40-60% reducción en tiempo de desarrollo
- 🚫 0 timeouts en builds y deploys
- ⚡ Ejecución paralela de tareas independientes
- 📊 Mejor visibilidad de progreso

## Project-Specific Commands

**Note**: La mayoría de operaciones deberían usar el consolidated runner (`./tools/run.sh` o `npm run`).
Los comandos abajo son para operaciones directas de subproyectos cuando sea necesario.

### Angular Web App (desde `apps/web/`)

```bash
npm run start              # Dev server (preferir: npm run dev:web desde root)
npm run test               # Karma/Jasmine tests (preferir: npm run test desde root)
npm run lint               # ESLint (preferir: npm run lint desde root)
npm run format             # Prettier (preferir: npm run format desde root)
```

### Payments Webhook Worker (desde `functions/workers/payments_webhook/`)

```bash
npm run dev                # Wrangler dev (preferir: npm run dev:worker desde root)
npm run build              # TypeScript build (preferir: npm run build:worker desde root)
npm run deploy             # Deploy worker (preferir: npm run deploy:worker desde root)
```

## Testing Workflows

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- --include="**/auth.service.spec.ts"

# Watch mode
npm run test -- --watch
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- tests/visitor/01-homepage.spec.ts

# Debug mode
npm run test:e2e:ui

# Generate report
npm run test:e2e -- --reporter=html
```

### Integration Tests

```bash
# Test payment flow completo
npm run test:payment-flow

# Test booking flow
npm run test:booking-flow
```

## Deployment Workflows

### Manual Deployment

```bash
# 1. Verificar que CI pase
npm run ci

# 2. Deploy web
npm run deploy:web

# 3. Deploy workers
npm run deploy:worker

# 4. Deploy edge functions (Supabase)
npx supabase functions deploy mercadopago-webhook
npx supabase functions deploy mercadopago-create-preference
npx supabase functions deploy mercadopago-create-booking-preference
```

### Automatic Deployment (GitHub Actions)

```bash
# Push a main branch
git push origin main

# GitHub Actions ejecutará automáticamente:
# 1. Lint + Test + Build
# 2. Deploy to Cloudflare Pages
# 3. Deploy Edge Functions
# 4. Deploy Workers
```

### Rollback

```bash
# Rollback Cloudflare Pages deployment
npx wrangler pages deployment list --project-name=autorenta-web
npx wrangler pages deployment rollback <deployment-id>

# Rollback Supabase Edge Function
npx supabase functions list
# Deploy version anterior desde git
```

## Monitoring and Debugging

### Check System Health

```bash
npm run monitor:health

# Verifica:
# - Supabase connection
# - Edge Functions status
# - Workers status
# - Database migrations
# - Cron jobs
```

### View Logs

```bash
# Supabase Edge Functions
npx supabase functions logs mercadopago-webhook --tail

# Cloudflare Workers
wrangler tail payments_webhook

# GitHub Actions
gh run list
gh run view <run-id> --log
```

### Debug Issues

```bash
# Ver estado actual
npm run status

# Check autenticación
npm run check:auth

# Verificar secretos configurados
npx supabase secrets list
wrangler secret list --name payments_webhook
gh secret list
```

## Resources

- **Run Script**: `tools/run.sh` - Script consolidado
- **Workflows**: `tools/claude-workflows.sh` - Workflows automatizados
- **GitHub Actions**: `.github/workflows/` - CI/CD pipelines
- **Deployment Guide**: `docs/deployment-guide.md` - Guía detallada de deployment
- **Troubleshooting**: `docs/runbooks/troubleshooting.md` - Guía de solución de problemas
