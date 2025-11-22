# ⚙️ GitHub Actions Secrets Configuration

## Overview

Guía completa para configurar todos los secrets necesarios en GitHub Actions para CI/CD de AutoRenta.

## Pre-Requisitos

```bash
# 1. Instalar GitHub CLI
# https://cli.github.com/

# 2. Autenticar
gh auth login

# 3. Verificar repo correcto
gh repo view
```

## Secrets Requeridos

### 1. Supabase

#### SUPABASE_URL
```bash
gh secret set SUPABASE_URL \
  -b"https://obxvffplochgeiclibng.supabase.co"
```

#### SUPABASE_ANON_KEY
Obtener desde: [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api)

```bash
# Copiar "anon / public" key del dashboard
gh secret set SUPABASE_ANON_KEY \
  -b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTAwMDAwMDAsImV4cCI6MTg0NzY4MDAwMH0..."
```

#### SUPABASE_SERVICE_ROLE_KEY
⚠️ **MUY SENSIBLE** - Solo para server-side operations

```bash
# Copiar "service_role" key del dashboard
gh secret set SUPABASE_SERVICE_ROLE_KEY \
  -b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5MDAwMDAwMCwiZXhwIjoxODQ3NjgwMDAwfQ..."
```

#### DATABASE_URL
```bash
gh secret set DATABASE_URL \
  -b"postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
```

### 2. Mercado Pago

#### Production Keys

Obtener desde: [Mercado Pago Dashboard → Credenciales](https://www.mercadopago.com.ar/developers/panel/credentials)

```bash
# Access Token (comienza con APP-)
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN \
  -b"APP-XXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXX"

# Public Key (comienza con APP_USR-)
gh secret set MERCADOPAGO_PROD_PUBLIC_KEY \
  -b"APP_USR-XXXXXXXX-XXXXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

#### Test Keys (Sandbox)

⚠️ **PENDIENTE**: Investigar credenciales de test

```bash
# TODO: Obtener de MP Sandbox
# https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/accounts

gh secret set MERCADOPAGO_TEST_ACCESS_TOKEN \
  -b"TEST-XXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXX"

gh secret set MERCADOPAGO_TEST_PUBLIC_KEY \
  -b"TEST_USR-XXXXXXXX-XXXXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

### 3. Mapbox

Obtener desde: [Mapbox Account → Access Tokens](https://account.mapbox.com/access-tokens/)

```bash
# Token público (comienza con pk.)
gh secret set MAPBOX_ACCESS_TOKEN \
  -b"pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Alias para app
gh secret set NG_APP_MAPBOX_ACCESS_TOKEN \
  -b"pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsXXXYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 4. Cloudflare

#### Account ID
Obtener desde: Cloudflare Dashboard → Account ID (lado derecho)

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID \
  -b"your-account-id-here"
```

#### API Token
Crear en: [Cloudflare Dashboard → API Tokens](https://dash.cloudflare.com/profile/api-tokens)

Permisos necesarios:
- Account / Workers Scripts / Edit
- Account / Workers KV Storage / Edit

```bash
gh secret set CLOUDFLARE_API_TOKEN \
  -b"your-api-token-here"
```

### 5. Application Variables

```bash
# Moneda por defecto
gh secret set NG_APP_DEFAULT_CURRENCY -b"ARS"

# Webhook URL (actualizar con tu dominio)
gh secret set NG_APP_PAYMENTS_WEBHOOK_URL \
  -b"https://mercadopago-webhook.autorenta.workers.dev"
```

## Verificar Secrets Configurados

```bash
# Listar todos los secrets (no muestra valores)
gh secret list

# Debe mostrar algo como:
# CLOUDFLARE_ACCOUNT_ID          Updated 2025-10-28
# CLOUDFLARE_API_TOKEN            Updated 2025-10-28
# DATABASE_URL                    Updated 2025-10-28
# MAPBOX_ACCESS_TOKEN             Updated 2025-10-28
# MERCADOPAGO_PROD_ACCESS_TOKEN   Updated 2025-10-28
# MERCADOPAGO_PROD_PUBLIC_KEY     Updated 2025-10-28
# NG_APP_DEFAULT_CURRENCY         Updated 2025-10-28
# NG_APP_MAPBOX_ACCESS_TOKEN      Updated 2025-10-28
# NG_APP_PAYMENTS_WEBHOOK_URL     Updated 2025-10-28
# SUPABASE_ANON_KEY               Updated 2025-10-28
# SUPABASE_SERVICE_ROLE_KEY       Updated 2025-10-28
# SUPABASE_URL                    Updated 2025-10-28
```

## Uso en Workflows

### Ejemplo: Deploy Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      # Secrets disponibles como env vars
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      NG_APP_MAPBOX_ACCESS_TOKEN: ${{ secrets.MAPBOX_ACCESS_TOKEN }}
      
    steps:
      - uses: actions/checkout@v3
      
      - name: Build
        run: npm run build
        
      - name: Deploy to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: npx wrangler pages deploy ./dist
```

### Ejemplo: E2E Tests

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      # Test environment
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      MERCADOPAGO_TEST_ACCESS_TOKEN: ${{ secrets.MERCADOPAGO_TEST_ACCESS_TOKEN }}
      
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Playwright Tests
        run: npm run test:e2e
```

## Script de Setup Automático

Crear archivo `setup-github-secrets.sh`:

```bash
#!/bin/bash
# setup-github-secrets.sh
# Script interactivo para configurar todos los secrets

set -e

echo "🔐 GitHub Actions Secrets Setup"
echo "================================"
echo ""

# Function to set secret
set_secret() {
  local name=$1
  local description=$2
  local value
  
  read -sp "$description: " value
  echo ""
  
  if [ -n "$value" ]; then
    gh secret set "$name" -b"$value"
    echo "✅ $name configurado"
  else
    echo "⏭️  $name omitido"
  fi
  echo ""
}

# Supabase
echo "📦 SUPABASE"
gh secret set SUPABASE_URL -b"https://obxvffplochgeiclibng.supabase.co"
set_secret "SUPABASE_ANON_KEY" "Supabase Anon Key"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key"
gh secret set DATABASE_URL -b"postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Mercado Pago
echo "💳 MERCADO PAGO"
set_secret "MERCADOPAGO_PROD_ACCESS_TOKEN" "MP Production Access Token"
set_secret "MERCADOPAGO_PROD_PUBLIC_KEY" "MP Production Public Key"

# Mapbox
echo "🗺️  MAPBOX"
set_secret "MAPBOX_ACCESS_TOKEN" "Mapbox Access Token"

# Cloudflare
echo "☁️  CLOUDFLARE"
set_secret "CLOUDFLARE_ACCOUNT_ID" "Cloudflare Account ID"
set_secret "CLOUDFLARE_API_TOKEN" "Cloudflare API Token"

echo ""
echo "✅ Setup completado!"
echo ""
echo "Verificar con: gh secret list"
```

Usar:
```bash
chmod +x setup-github-secrets.sh
./setup-github-secrets.sh
```

## Secrets por Ambiente (Futuro)

GitHub Actions también soporta Environment Secrets:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-staging:
    environment: staging
    env:
      SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
      
  deploy-production:
    environment: production
    env:
      SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
```

Configurar en: Settings → Environments → New environment

## Troubleshooting

### Secret no se actualiza en workflow

```bash
# 1. Verificar que se seteo correctamente
gh secret list

# 2. Trigger nuevo run (no re-run)
git commit --allow-empty -m "trigger: test secrets"
git push

# 3. Ver logs detallados
gh run list --limit 1
gh run view <RUN_ID> --log
```

### Error: "Refusing to expose secret"

Esto es correcto - GitHub nunca muestra valores de secrets en logs.

### Error: "Secret name already exists"

```bash
# Actualizar secret existente (sobreescribe automáticamente)
gh secret set SECRET_NAME -b"new_value"
```

## Seguridad

### ✅ Buenas Prácticas
- Usar nombres descriptivos (`SUPABASE_ANON_KEY`, no `KEY1`)
- Documentar qué hace cada secret
- Rotar secrets regularmente
- Limitar acceso al repo
- Usar Environment Secrets para staging/prod

### ❌ Evitar
- Loggear secrets en workflows
- Usar secrets en PR de forks (están deshabilitados por seguridad)
- Commitear valores de secrets en repo
- Compartir secrets entre proyectos sin necesidad

## Monitoreo

```bash
# Ver último uso de cada secret
gh api repos/:owner/:repo/actions/secrets --jq '.secrets[] | {name: .name, updated_at: .updated_at}'

# Ver workflows que usan secrets
grep -r "secrets\." .github/workflows/
```

## Checklist Post-Setup

- [ ] Todos los secrets listados con `gh secret list`
- [ ] Workflow de deploy pasa en GitHub Actions
- [ ] Workflow de tests pasa en GitHub Actions
- [ ] Application se construye correctamente
- [ ] No hay logs de "secret not found"
- [ ] Documentado en `docs/SECRET_ROTATION_LOG.md`

## Referencias

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI - gh secret](https://cli.github.com/manual/gh_secret)
- [Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

## Support

Si tienes problemas:
1. Verificar permisos en el repo (debes ser admin)
2. Verificar autenticación de `gh` CLI
3. Ver documentación de GitHub Actions
4. Contactar al equipo
