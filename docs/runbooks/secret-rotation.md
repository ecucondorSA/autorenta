# 🔄 Runbook: Secret Rotation

## Cuándo Rotar Secrets

### Rotación Programada
- **Cada 90 días**: Mercado Pago access tokens
- **Cada 180 días**: API keys de terceros (Mapbox, etc)
- **Cada 365 días**: Database passwords
- **Según política del servicio**: Cloudflare, Supabase

### Rotación Inmediata (Incident Response)
- **Secret expuesto en Git**: Rotar INMEDIATAMENTE
- **Secret en logs**: Rotar mismo día
- **Offboarding de miembro del equipo**: Rotar dentro de 24hrs
- **Sospecha de compromiso**: Rotar inmediatamente

## Pre-Requisitos

```bash
# Herramientas necesarias
gh auth status  # GitHub CLI
wrangler --version  # Cloudflare CLI
supabase --version  # Supabase CLI
psql --version  # PostgreSQL client

# Accesos necesarios
# - Admin en GitHub repo
# - Admin en Supabase project
# - Admin en Cloudflare account
# - Admin en Mercado Pago developer account
```

## 1. Mercado Pago Access Token

### Generar Nuevo Token

1. **Login a Mercado Pago**
   - https://www.mercadopago.com.ar/developers/panel

2. **Ir a Credenciales**
   - Panel → Tus integraciones → Credenciales

3. **Generar nuevo Access Token**
   - Producción → Crear credenciales
   - Copiar Access Token (comienza con `APP-`)
   - Copiar Public Key

### Actualizar en GitHub Actions

```bash
# Set new token
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN \
  -b"APP-XXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXX"

gh secret set MERCADOPAGO_PROD_PUBLIC_KEY \
  -b"APP_USR-XXXXXXXX-XXXXXX-XXXX-XXXX-XXXXXXXXXXXX"

# Verify
gh secret list | grep MERCADOPAGO
```

### Actualizar en Cloudflare Workers

```bash
cd apps/workers/mercadopago

# Update secret
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Paste new token when prompted

# Verify (lista secrets pero no muestra valores)
wrangler secret list
```

### Actualizar en Supabase Edge Functions

```bash
# Set new secret
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP-XXXXXXXXXXXX...

# Verify
supabase secrets list
```

### Verificar Funcionamiento

```bash
# Test payment endpoint
curl -X POST https://tu-worker.workers.dev/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Test rotation"
  }'

# O usar script de verificación
cd /home/edu/autorenta
./verify-real-payments.sh
```

### Revocar Token Anterior

1. Volver a MP Dashboard → Credenciales
2. Encontrar token anterior en lista
3. Click en "..." → Eliminar
4. Confirmar revocación

## 2. Supabase Keys

### Anon Key (Public)

1. **Dashboard**
   - https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api

2. **Generar Nueva Key**
   - Settings → API → Anon Key → Regenerate
   - Copiar nueva key

3. **Actualizar GitHub Secrets**
```bash
gh secret set SUPABASE_ANON_KEY \
  -b"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

4. **Actualizar en aplicación**
```bash
# Regenerar build con nueva key
cd apps/web
npm run build

# Deploy
# (El CI/CD tomará la nueva key de GitHub Secrets)
```

### Service Role Key (Private)

⚠️ **CRÍTICO**: Solo rotar si hay compromiso confirmado

1. **Dashboard → Settings → API**
2. **Service Role Key → Regenerate**
3. **Actualizar TODOS los secrets stores**:

```bash
# GitHub Actions
gh secret set SUPABASE_SERVICE_ROLE_KEY -b"eyJ..."

# Cloudflare Workers
wrangler secret put SUPABASE_SERVICE_ROLE_KEY

# Supabase Edge Functions (se autoactualiza)

# Local development
# Editar .env.local manualmente
```

## 3. Database Password

⚠️ **ALTO IMPACTO**: Requiere coordinación

### Preparación

```bash
# 1. Notificar al equipo
# 2. Programar ventana de mantenimiento
# 3. Backup completo de DB
pg_dump "$DB_URL" > backup_before_password_rotation_$(date +%Y%m%d).sql
```

### Cambiar Password en Supabase

1. **Dashboard → Settings → Database**
2. **Database password → Reset password**
3. **Copiar nueva password**

### Actualizar DATABASE_URL

```bash
# Nueva URL con nueva password
NEW_DB_URL="postgresql://postgres.obxvffplochgeiclibng:<NEW_PASSWORD>@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# GitHub Actions
gh secret set DATABASE_URL -b"$NEW_DB_URL"
gh secret set DB_PASSWORD -b"<NEW_PASSWORD>"

# Local .env.local
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=<NEW_PASSWORD>/" .env.local
sed -i "s/:ECUCONDOR08122023@/:NEW_PASSWORD@/" .env.local
```

### Verificar Conectividad

```bash
# Test connection
export PGPASSWORD=<NEW_PASSWORD>
psql "$NEW_DB_URL" -c "SELECT NOW();"

# Test scripts
cd /home/edu/autorenta
./apply_migration.sh supabase/migrations/test.sql
```

## 4. Mapbox Access Token

### Generar Nuevo Token

1. **Login a Mapbox**
   - https://account.mapbox.com/access-tokens/

2. **Create a token**
   - Name: AutoRenta Production - 2025-10
   - Scopes: `styles:read`, `fonts:read`, `datasets:read`
   - URL restrictions: `https://autorenta-web.pages.dev/*`

3. **Copy token** (starts with `pk.`)

### Actualizar Secrets

```bash
# GitHub Actions
gh secret set MAPBOX_ACCESS_TOKEN -b"pk.eyJ..."

# Variables de aplicación
gh secret set NG_APP_MAPBOX_ACCESS_TOKEN -b"pk.eyJ..."
```

### Revocar Token Anterior

1. Account → Access Tokens
2. Find old token
3. Click trash icon → Delete

## 5. Cloudflare API Token

### Crear Nuevo Token

1. **Dashboard**
   - https://dash.cloudflare.com/profile/api-tokens

2. **Create Token**
   - Template: "Edit Cloudflare Workers"
   - Permissions:
     - Account / Workers Scripts / Edit
     - Account / Workers KV Storage / Edit
   - Account Resources: Include / Your Account

3. **Copy token**

### Actualizar GitHub Actions

```bash
gh secret set CLOUDFLARE_API_TOKEN -b"<NEW_TOKEN>"
```

### Revocar Token Anterior

1. API Tokens page
2. Find old token → Roll / Revoke

## Checklist Post-Rotación

Usar este checklist para CADA rotación:

### Validación Técnica
- [ ] Secret actualizado en GitHub Actions
- [ ] Secret actualizado en Cloudflare Workers (si aplica)
- [ ] Secret actualizado en Supabase Edge Functions (si aplica)
- [ ] Secret actualizado en .env.local
- [ ] GitHub Actions workflows passing (check último run)
- [ ] Test payment/request exitoso
- [ ] No hay errores en logs

### Validación de Aplicación
- [ ] Login funciona
- [ ] Crear/editar auto funciona  
- [ ] Hacer reserva funciona
- [ ] Pago con MP funciona
- [ ] Mapbox geocoding funciona (si aplica)
- [ ] Edge functions responden

### Cleanup
- [ ] Token/key anterior revocado en servicio origen
- [ ] Documentado en `docs/SECRET_ROTATION_LOG.md`
- [ ] Equipo notificado de rotación completada
- [ ] Próxima fecha de rotación agendada

## Logging de Rotaciones

**Archivo**: `docs/SECRET_ROTATION_LOG.md`

```markdown
# Secret Rotation Log

| Fecha | Secret | Razón | Ejecutado Por | Verificado |
|-------|--------|-------|---------------|------------|
| 2025-10-28 | MERCADOPAGO_PROD_ACCESS_TOKEN | Scheduled 90d | Eduardo | ✅ |
| 2025-10-15 | SUPABASE_ANON_KEY | Accidental exposure | Eduardo | ✅ |
```

## Troubleshooting

### Error: GitHub Actions failing después de rotación

```bash
# Ver logs del workflow
gh run list --limit 5
gh run view <RUN_ID> --log

# Verificar que secret se seteo correctamente
gh secret list

# Re-run workflow
gh run rerun <RUN_ID>
```

### Error: Cloudflare Worker no usa nuevo secret

```bash
# Los secrets se actualizan en próximo deploy
cd apps/workers/mercadopago
wrangler deploy

# Verificar
curl https://tu-worker.workers.dev/health
```

### Error: "Invalid credentials" después de rotación

```bash
# Verificar que copiaste el token completo (sin espacios)
# Verificar que no expiraste el nuevo token por error
# Verificar permisos/scopes del nuevo token
```

## Emergency Rollback

Si el nuevo secret causa problemas:

```bash
# 1. Obtener secret anterior (si lo guardaste)
# 2. Revertir rápidamente
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<OLD_TOKEN>"

# 3. Trigger redeploy
gh workflow run deploy.yml

# 4. Investigar por qué falló el nuevo
# 5. Re-intentar rotación con fix
```

## Automation (Futuro)

```yaml
# .github/workflows/scheduled-secret-rotation.yml
name: Secret Rotation Reminder

on:
  schedule:
    - cron: '0 9 1 * *' # 9am primer día del mes

jobs:
  check-rotation:
    runs-on: ubuntu-latest
    steps:
      - name: Check last rotation dates
        run: |
          echo "🔄 Verificar últimas rotaciones en docs/SECRET_ROTATION_LOG.md"
          echo "Mercado Pago: Cada 90 días"
          echo "Mapbox: Cada 180 días"
```

## Referencias

- [Mercado Pago Credentials](https://www.mercadopago.com.ar/developers/panel/credentials)
- [Supabase API Settings](https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api)
- [Mapbox Tokens](https://account.mapbox.com/access-tokens/)
- [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support Contacts

- **Mercado Pago**: https://www.mercadopago.com.ar/developers/es/support
- **Supabase**: support@supabase.io
- **Cloudflare**: https://support.cloudflare.com/
