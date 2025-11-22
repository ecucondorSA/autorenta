# 🚀 Guía de Deployment - AutoRenta

**Última actualización**: 2025-11-03  
**Versión**: 1.0.0

## Índice

- [Overview](#overview)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Automático (GitHub Actions)](#deployment-automático-github-actions)
- [Deployment Manual](#deployment-manual)
- [Deployment de Edge Functions](#deployment-de-edge-functions)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

AutoRenta se despliega en:

1. **Cloudflare Pages** - Frontend Angular (web app)
2. **Supabase Edge Functions** - Backend functions (webhooks, APIs)
3. **Cloudflare Workers** - Payment webhook (legacy, opcional)

### Flujo de Deployment

```
Developer → GitHub (push to main) → GitHub Actions → Build → Deploy
                                              ↓
                          Cloudflare Pages (automatic)
                          Supabase Functions (manual)
```

---

## Pre-Deployment Checklist

### ✅ Antes de Cada Deployment

- [ ] **Tests pasan**: `npm run test:quick`
- [ ] **Linting pasa**: `npm run lint`
- [ ] **Build exitoso**: `npm run build:web`
- [ ] **TypeScript sin errores**: `npx tsc --noEmit`
- [ ] **Secrets configurados**: Verificar en GitHub Secrets y Supabase
- [ ] **Variables de entorno**: Verificar `.env.production.template`
- [ ] **Migrations aplicadas**: Si hay cambios de schema
- [ ] **Backup de DB**: Si hay cambios de schema (ver [database-backup-restore.md](./runbooks/database-backup-restore.md))
- [ ] **Changelog actualizado**: Documentar cambios importantes

### 🔴 Crítico: Verificar Secrets

```bash
# Verificar GitHub Secrets
gh secret list

# Debe incluir:
# - CF_API_TOKEN
# - CF_ACCOUNT_ID
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - MERCADOPAGO_ACCESS_TOKEN
# - MAPBOX_ACCESS_TOKEN

# Verificar Supabase Secrets
supabase secrets list

# Debe incluir:
# - MERCADOPAGO_ACCESS_TOKEN
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

---

## Deployment Automático (GitHub Actions)

### Flujo Automático

Cuando haces push a `main`:

1. **GitHub Actions** detecta el push
2. **Build** ejecuta: `pnpm install` → `pnpm run build:web`
3. **Deploy** sube a Cloudflare Pages automáticamente

### Configuración

**Workflow**: `.github/workflows/build-and-deploy.yml`

```yaml
on:
  push:
    branches:
      - main

jobs:
  build:
    - Install dependencies
    - Build web application
    - Upload artifacts
  
  deploy-pages:
    - Download artifacts
    - Deploy to Cloudflare Pages
```

### Verificar Deployment Automático

```bash
# Ver estado del último deployment
gh run list --workflow="🚀 Build and Deploy"

# Ver logs del deployment
gh run view <run-id> --log

# Ver deployments en Cloudflare
wrangler pages deployment list autorenta-web
```

### Trigger Manual

Si necesitas forzar deployment sin push:

```bash
# Via GitHub CLI
gh workflow run "🚀 Build and Deploy"

# O via GitHub UI:
# Actions → 🚀 Build and Deploy → Run workflow
```

---

## Deployment Manual

### Opción 1: Deploy Web App (Cloudflare Pages)

```bash
# 1. Build local
cd apps/web
npm run build

# 2. Deploy a Cloudflare Pages
npm run deploy:pages

# O usando wrangler directamente
wrangler pages deploy dist/web \
  --project-name=autorenta-web \
  --branch=main
```

### Opción 2: Deploy Completo (Web + Worker)

```bash
# Usar workflow script
source tools/claude-workflows.sh
full_deploy

# O manualmente:
cd apps/web && npm run deploy:pages
cd ../../functions/workers/payments_webhook && npm run deploy
```

### Opción 3: Deploy Solo Worker (Legacy)

```bash
cd functions/workers/payments_webhook
npm run deploy

# Verificar
wrangler tail payments_webhook
```

---

## Deployment de Edge Functions

### Supabase Edge Functions

Las Edge Functions se despliegan manualmente a Supabase:

```bash
# 1. Autenticarse (si es necesario)
supabase login

# 2. Link proyecto
supabase link --project-ref obxvffplochgeiclibng

# 3. Deploy función específica
supabase functions deploy mercadopago-webhook

# 4. O deploy todas las funciones
supabase functions deploy

# 5. Verificar deployment
supabase functions list
```

### Funciones Críticas

| Función | Propósito | Frecuencia Deploy |
|---------|-----------|-------------------|
| `mercadopago-webhook` | Procesa pagos de MercadoPago | Solo cuando hay cambios |
| `mercadopago-create-preference` | Crea preferencias de pago | Solo cuando hay cambios |
| `mercadopago-create-booking-preference` | Crea preferencias para reservas | Solo cuando hay cambios |
| `wallet-transfer` | Transfiere fondos entre wallets | Solo cuando hay cambios |
| `wallet-reconciliation` | Reconciliación de wallet | Solo cuando hay cambios |

### Configurar Secrets de Edge Functions

```bash
# Setear secret para función
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx --project-ref obxvffplochgeiclibng

# Verificar secrets
supabase secrets list --project-ref obxvffplochgeiclibng
```

---

## Post-Deployment Verification

### Checklist Post-Deployment

- [ ] **Aplicación carga**: https://autorenta-web.pages.dev
- [ ] **Login funciona**: Probar login con usuario de test
- [ ] **Autos se muestran**: Verificar listado de autos
- [ ] **Mapa carga**: Verificar marcadores en mapa
- [ ] **Uploads funcionan**: Probar subir foto de perfil
- [ ] **Pagos funcionan**: Probar flujo de depósito (sandbox)
- [ ] **Webhooks funcionan**: Verificar logs de Edge Functions
- [ ] **No hay errores en console**: Abrir DevTools → Console

### Scripts de Verificación

```bash
# Verificar estado completo
./tools/check-auth.sh

# Verificar deployment
curl -I https://autorenta-web.pages.dev

# Verificar Edge Functions
curl -I https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook

# Verificar logs
supabase functions logs mercadopago-webhook --limit 10
```

### Verificación Manual

1. **Abrir aplicación**: https://autorenta-web.pages.dev
2. **Login**: Usar credenciales de test
3. **Navegar**: Verificar que todas las rutas funcionan
4. **Console**: Verificar que no hay errores JavaScript
5. **Network**: Verificar que requests a Supabase funcionan

---

## Rollback Procedures

### Rollback en Cloudflare Pages

#### Opción 1: Via Dashboard (Recomendado)

1. Ir a: https://dash.cloudflare.com/
2. Pages → `autorenta-web` → Deployments
3. Seleccionar deployment anterior
4. Click "Rollback to this deployment"

#### Opción 2: Via Wrangler

```bash
# Listar deployments
wrangler pages deployment list autorenta-web

# Rollback a deployment específico
wrangler pages deployment rollback autorenta-web \
  --deployment-id=<deployment-id>
```

#### Opción 3: Via Git (Nuclear Option)

```bash
# Revertir commit
git revert <commit-hash>
git push origin main

# Esto triggera nuevo deployment automáticamente
```

### Rollback de Edge Functions

```bash
# Ver versiones anteriores
supabase functions list

# Re-deploy versión anterior
# (Requiere tener código de versión anterior en git)

git checkout <previous-commit>
supabase functions deploy mercadopago-webhook
git checkout main
```

### Rollback de Database

Ver [database-backup-restore.md](./runbooks/database-backup-restore.md)

---

## Troubleshooting

### Problema: Build falla en GitHub Actions

**Síntomas**:
- GitHub Actions muestra error en step "Build"
- Build funciona localmente

**Diagnóstico**:

```bash
# Ver logs del workflow
gh run view <run-id> --log

# Reproducir build localmente
npm run build:web
```

**Soluciones**:

1. **Dependencias faltantes**: Verificar `package.json` y `package-lock.json`
2. **Variables de entorno**: Verificar que GitHub Secrets estén configurados
3. **Node version**: Verificar que `.github/workflows/build-and-deploy.yml` use Node 20

### Problema: Deploy falla en Cloudflare

**Síntomas**:
- Build exitoso pero deploy falla
- Error "Invalid API token" o "Account not found"

**Diagnóstico**:

```bash
# Verificar token
echo $CF_API_TOKEN

# Verificar account ID
echo $CF_ACCOUNT_ID

# Test deploy manual
wrangler pages deploy dist/web --project-name=autorenta-web
```

**Soluciones**:

1. **Token inválido**: Rotar token en Cloudflare Dashboard
2. **Account ID incorrecto**: Verificar en Cloudflare Dashboard
3. **Permisos insuficientes**: Verificar que token tenga permisos de Pages

### Problema: Aplicación no carga después de deploy

**Síntomas**:
- Deploy exitoso pero página en blanco
- Errores 404 en console

**Diagnóstico**:

```bash
# Verificar deployment
wrangler pages deployment list autorenta-web

# Verificar build artifacts
curl -I https://autorenta-web.pages.dev/

# Verificar console errors (en browser)
```

**Soluciones**:

1. **Rollback inmediato**: Usar rollback procedure
2. **Verificar base href**: Debe ser `/` en `index.html`
3. **Verificar paths**: Verificar que `angular.json` tenga paths correctos

### Problema: Edge Function no responde

**Síntomas**:
- Requests a Edge Function retornan 500
- Logs muestran errores

**Diagnóstico**:

```bash
# Ver logs
supabase functions logs mercadopago-webhook --limit 50

# Test función
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "Authorization: Bearer $(supabase secrets get SUPABASE_ANON_KEY)"
```

**Soluciones**:

1. **Re-deploy función**: `supabase functions deploy mercadopago-webhook`
2. **Verificar secrets**: `supabase secrets list`
3. **Verificar código**: Revisar logs para errores específicos

---

## Mejores Prácticas

### 1. Siempre hacer backup antes de cambios grandes

```bash
# Backup de DB antes de migrations
./docs/runbooks/database-backup-restore.sh
```

### 2. Deployar en horarios de bajo tráfico

- Preferir: Lunes a Viernes 2-4 AM UTC
- Evitar: Viernes tarde, fines de semana

### 3. Usar feature flags para cambios grandes

```typescript
// En environment.ts
export const FEATURE_FLAGS = {
  newFeature: false, // Deshabilitar si hay problemas
};
```

### 4. Monitorear después de deploy

- Verificar logs por 30 minutos después de deploy
- Monitorear errores en Sentry (si configurado)
- Verificar métricas en Cloudflare Analytics

### 5. Documentar cambios

- Actualizar CHANGELOG.md
- Documentar breaking changes
- Notificar a equipo si hay cambios importantes

---

## Referencias

- [Runbook: Troubleshooting](./runbooks/troubleshooting.md)
- [Runbook: Database Backup & Restore](./runbooks/database-backup-restore.md)
- [CLAUDE.md](../../CLAUDE.md) - Arquitectura del proyecto
- [GitHub Actions Workflow](../../.github/workflows/build-and-deploy.yml)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)

---

**Última revisión**: 2025-11-03  
**Mantenedor**: Equipo de Desarrollo AutoRenta













