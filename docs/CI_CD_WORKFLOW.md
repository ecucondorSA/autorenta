# AutoRenta - Flujo de CI/CD

**Última actualización:** 2025-12-28

---

## Resumen de Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Development   │────▶│    Staging      │────▶│   Production    │
│   (localhost)   │     │ (preview.pages) │     │  (autorentar)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   pnpm dev              Cloudflare Pages         Cloudflare Pages
   localhost:4200        *.autorentar.pages.dev   autorentar.pages.dev
```

---

## Entornos

| Entorno | URL | Branch | Auto-deploy |
|---------|-----|--------|-------------|
| Development | `localhost:4200` | - | Manual |
| Preview | `*.autorentar.pages.dev` | feature/* | Si |
| Production | `autorentar.pages.dev` | main | Si |

---

## Pipeline de Deploy

### 1. Frontend (Angular)

```bash
# Build producción
pnpm build:web

# Deploy a Cloudflare Pages
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
npx wrangler pages deploy dist/web/browser \
  --project-name=autorentar \
  --commit-dirty=true
```

**Triggers automáticos:**
- Push a `main` → Deploy a producción
- Push a `feature/*` → Deploy a preview

### 2. Edge Functions (Supabase)

```bash
# Deploy todas las funciones
supabase functions deploy

# Deploy función específica
supabase functions deploy <function-name>

# Ver logs en tiempo real
supabase functions logs <function-name> --follow
```

**Proceso manual:**
1. Desarrollar en local
2. Probar con Postman/curl
3. Deploy a producción
4. Verificar logs

### 3. Database Migrations

```bash
# Desarrollo local
supabase db push

# Producción (via psql)
PGPASSWORD='<password>' psql \
  -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx \
  -d postgres \
  -f supabase/migrations/<migration>.sql
```

**Proceso:**
1. Crear migración: `supabase migration new <name>`
2. Escribir SQL
3. Probar en local: `supabase db push`
4. Aplicar en producción via psql

### 4. Android App

```bash
# Build debug
./apps/web/scripts/deploy-android.sh

# Build release
./apps/web/scripts/deploy-android.sh --release

# Sin regenerar icons
./apps/web/scripts/deploy-android.sh --no-icons
```

---

## Secrets & Variables

### Supabase Secrets
```bash
# Listar secrets
supabase secrets list

# Agregar secret
supabase secrets set KEY="value"

# Secrets requeridos:
# - MERCADOPAGO_ACCESS_TOKEN
# - MERCADOPAGO_PUBLIC_KEY
# - PAYPAL_CLIENT_ID
# - PAYPAL_CLIENT_SECRET
# - RESEND_API_KEY
```

### Environment Variables (Frontend)
```bash
# apps/web/.env
VITE_SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_MERCADOPAGO_PUBLIC_KEY=<mp_key>
VITE_SENTRY_DSN=<sentry_dsn>
```

---

## Comandos Frecuentes

### Desarrollo
```bash
pnpm dev          # Dev server Angular
pnpm lint         # Linting
pnpm test         # Unit tests
pnpm build        # Build producción
```

### Testing
```bash
npm run test:e2e                    # Todos los E2E
npm run test:e2e:booking            # Solo booking flow
npx tsx scripts/load-tests/*.ts     # Load tests
```

### Database
```bash
supabase gen types typescript > types.ts  # Regenerar types
supabase db reset                         # Reset local DB
```

### Monitoreo
```bash
supabase functions logs <fn> --follow   # Logs Edge Functions
# Ver dashboard: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx
```

---

## Proceso de Release

### 1. Preparación
```bash
# Actualizar versión en package.json
# Actualizar CHANGELOG.md
git checkout main
git pull origin main
```

### 2. Build & Test
```bash
pnpm lint
pnpm test
pnpm build
npm run test:e2e
```

### 3. Deploy
```bash
# Frontend
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
npx wrangler pages deploy dist/web/browser \
  --project-name=autorentar

# Edge Functions (si hay cambios)
supabase functions deploy

# Migrations (si hay cambios)
PGPASSWORD='...' psql ... -f supabase/migrations/xxx.sql
```

### 4. Verificación Post-Deploy
- [ ] Verificar logs de Edge Functions
- [ ] Probar flujo de login
- [ ] Probar flujo de búsqueda
- [ ] Probar flujo de reserva (hasta checkout)
- [ ] Verificar métricas en Sentry

---

## Rollback

### Frontend
```bash
# Via Cloudflare Dashboard:
# 1. Ir a Pages > autorentar > Deployments
# 2. Seleccionar deployment anterior
# 3. Click "Rollback to this deployment"
```

### Edge Functions
```bash
# Revertir código y re-deploy
git checkout <commit> -- supabase/functions/<fn>
supabase functions deploy <fn>
```

### Database
```bash
# Crear migración de rollback
supabase migration new rollback_<original>
# Escribir SQL inverso
# Aplicar en producción
```

---

## Troubleshooting

### Error de build Angular
```bash
# Limpiar cache
rm -rf node_modules/.cache
rm -rf dist
pnpm install
pnpm build
```

### Error de Edge Functions
```bash
# Ver logs detallados
supabase functions logs <fn> --follow

# Probar localmente
supabase functions serve <fn> --env-file .env.local
```

### Error de migración
```bash
# Ver estado de migraciones
supabase db push --dry-run

# Verificar en producción
PGPASSWORD='...' psql ... -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"
```

---

## Contactos

| Rol | Contacto |
|-----|----------|
| DevOps | - |
| Backend | - |
| Frontend | - |
| DB Admin | - |

---

*Documentación generada por Claude Code*
