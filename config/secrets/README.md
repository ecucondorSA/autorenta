# 🔐 Secrets Management Guide

## Production Secrets (NUNCA en Git)

### Supabase
- `SUPABASE_URL`: https://obxvffplochgeiclibng.supabase.co
- `SUPABASE_ANON_KEY`: Clave pública para cliente (Dashboard → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY`: Clave privada para servidor (⚠️ CRÍTICO)
- `DATABASE_URL`: postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres

### Mercado Pago
- `MERCADOPAGO_PROD_ACCESS_TOKEN`: Token producción (Dashboard → Credenciales)
- `MERCADOPAGO_PROD_PUBLIC_KEY`: Public key producción
- `MERCADOPAGO_TEST_ACCESS_TOKEN`: Token test/sandbox (⚠️ PENDIENTE INVESTIGAR)
- `MERCADOPAGO_TEST_PUBLIC_KEY`: Public key test

### Mapbox
- `MAPBOX_ACCESS_TOKEN`: Token para geocodificación (⚠️ OBLIGATORIO)

### Cloudflare
- `CLOUDFLARE_ACCOUNT_ID`: ID de cuenta
- `CLOUDFLARE_API_TOKEN`: Token con permisos Workers

## Test Secrets

### Test Users Supabase
- `TEST_RENTER_EMAIL`: test-renter@autorenta.com
- `TEST_RENTER_PASSWORD`: TestPassword123!
- `TEST_OWNER_EMAIL`: test-owner@autorenta.com
- `TEST_OWNER_PASSWORD`: TestPassword123!

## Dónde configurar

### 1. GitHub Actions
```bash
# Settings → Secrets and variables → Actions → New repository secret
gh secret set SUPABASE_URL -b"https://obxvffplochgeiclibng.supabase.co"
gh secret set SUPABASE_ANON_KEY -b"<YOUR_ANON_KEY>"
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<YOUR_MP_TOKEN>"
```

### 2. Cloudflare Workers
```bash
cd apps/workers/mercadopago
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Ingresar token cuando lo solicite
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### 3. Supabase Edge Functions
```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<YOUR_TOKEN>
supabase secrets set BINANCE_API_KEY=<YOUR_KEY>
supabase secrets list  # Verificar
```

### 4. Local Development
```bash
# Crear .env.local (ya en .gitignore)
cp config/environments/.env.production.template .env.local
# Editar .env.local con valores reales
```

## Rotación de Secretos

Ver documentación completa: `docs/runbooks/secret-rotation.md`

### Frecuencia Recomendada
- **Mercado Pago**: Cada 90 días
- **Supabase Service Role**: Solo si comprometido
- **Mapbox**: Anual
- **Después de exposición**: INMEDIATO

### Checklist Post-Rotación
- [ ] GitHub Actions secrets actualizados
- [ ] Cloudflare Workers secrets actualizados
- [ ] Supabase Edge Functions secrets actualizados
- [ ] CI/CD workflows passing
- [ ] Test payment exitoso
- [ ] Revocar credenciales antiguas

## Seguridad

### ✅ HACER
- Usar variables de entorno en todos los scripts
- Agregar `.env.local`, `.env.production` al `.gitignore`
- Rotar secrets cada 90 días
- Usar `gh secret` CLI para GitHub Actions
- Limitar permisos de tokens al mínimo necesario

### ❌ NUNCA
- Hardcodear credenciales en código
- Commitear archivos `.env` con valores reales
- Compartir secrets por email/chat sin cifrar
- Usar secrets de producción en desarrollo local
- Loggear secrets en consola

## Verificación de Seguridad

```bash
# Buscar posibles secrets hardcodeados
grep -r "eyJ" --include="*.ts" --include="*.js" --include="*.sh" .
grep -r "APP-" --include="*.ts" --include="*.js" .
grep -r "TEST-" --include="*.ts" --include="*.js" .

# Verificar .gitignore
git check-ignore .env.local .env.production
```

## Contacto en Caso de Compromiso

Si detectas una exposición de secrets:
1. Rotar INMEDIATAMENTE todas las credenciales
2. Revisar logs de acceso en cada servicio
3. Documentar en `docs/SECURITY_INCIDENTS.md`
4. Notificar al equipo

## Referencias

- [Supabase Dashboard](https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api)
- [Mercado Pago Credentials](https://www.mercadopago.com.ar/developers/panel/credentials)
- [Mapbox Tokens](https://account.mapbox.com/access-tokens/)
- [Cloudflare Workers](https://dash.cloudflare.com/)
