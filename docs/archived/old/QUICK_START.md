# 🚀 QUICK START - Próximos Pasos para el Usuario

**Fecha**: 2025-10-28  
**Fase Actual**: Fase 1 Completada ✅  
**Próxima Fase**: Fase 2 - Setup de Secrets  
**Tiempo Estimado**: 1-2 horas

---

## 📋 Resumen de Lo Que Se Hizo

Claude Code (en modo non-interactive) creó:
- ✅ 11 documentos nuevos (~85 KB)
- ✅ 3 Runbooks operativos
- ✅ 2 Templates de environment variables
- ✅ 2 Guías de setup completas
- ✅ 2 Documentos de assessment
- ✅ Fix en .gitignore

**Ver resumen completo**: `docs/FASE_1_COMPLETADA.md`

---

## ⚡ Acciones Inmediatas (HACER HOY)

### 1. Revisar Documentación Creada (10 min)

```bash
cd /home/edu/autorenta

# Ver listado de nuevos archivos
ls -lh config/secrets/
ls -lh config/environments/
ls -lh docs/runbooks/
ls -lh docs/FASE_1_COMPLETADA.md
ls -lh docs/PRODUCTION_READINESS_BASELINE.md
ls -lh docs/SECURITY_AUDIT.md
```

**Acción**: Leer `docs/FASE_1_COMPLETADA.md` primero

---

### 2. Verificar .gitignore (5 min)

```bash
# Ver cambios
git diff .gitignore

# Debe mostrar:
# + /apps/web/out-tsc
# + /out-tsc

# Si está OK, commitear
git add .gitignore
git commit -m "chore: exclude build artifacts from git (security)"
git push
```

**Por qué**: Build artifacts tienen tokens hardcodeados y no deben estar en Git.

---

### 3. Configurar GitHub Actions Secrets (30 min)

#### Opción A: Script Automático (Recomendado)

```bash
cd /home/edu/autorenta

# Usar el script interactivo creado
# Ver: docs/GITHUB_SECRETS_SETUP.md línea 200+

# O manualmente con gh CLI:
```

#### Opción B: Manual

```bash
# 1. Supabase
gh secret set SUPABASE_URL \
  -b"https://obxvffplochgeiclibng.supabase.co"

# Obtener del dashboard:
# https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api
gh secret set SUPABASE_ANON_KEY -b"<COPIAR_DEL_DASHBOARD>"
gh secret set SUPABASE_SERVICE_ROLE_KEY -b"<COPIAR_DEL_DASHBOARD>"

# 2. Database
gh secret set DATABASE_URL \
  -b"postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# 3. Mercado Pago
# Obtener del dashboard:
# https://www.mercadopago.com.ar/developers/panel/credentials
gh secret set MERCADOPAGO_PROD_ACCESS_TOKEN -b"<COPIAR_DEL_DASHBOARD>"
gh secret set MERCADOPAGO_PROD_PUBLIC_KEY -b"<COPIAR_DEL_DASHBOARD>"

# 4. Mapbox
# Obtener de:
# https://account.mapbox.com/access-tokens/
gh secret set MAPBOX_ACCESS_TOKEN -b"<TU_TOKEN>"

# 5. Cloudflare
# Obtener de:
# https://dash.cloudflare.com/profile/api-tokens
gh secret set CLOUDFLARE_ACCOUNT_ID -b"<TU_ACCOUNT_ID>"
gh secret set CLOUDFLARE_API_TOKEN -b"<TU_TOKEN>"

# Verificar
gh secret list
```

**Documentación completa**: `docs/GITHUB_SECRETS_SETUP.md`

---

### 4. Configurar Cloudflare Workers Secrets (15 min)

```bash
cd /home/edu/autorenta/apps/workers/mercadopago

# Configurar secrets
wrangler secret put MERCADOPAGO_ACCESS_TOKEN
# Pegar tu token de producción cuando lo pida

wrangler secret put SUPABASE_URL
# Pegar: https://obxvffplochgeiclibng.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Pegar service role key de Supabase Dashboard

# Verificar
wrangler secret list
```

**Por qué**: Workers necesitan estos secrets para webhooks de Mercado Pago.

---

### 5. Configurar Supabase Edge Functions Secrets (10 min)

```bash
cd /home/edu/autorenta

# Login a Supabase
supabase login

# Link al proyecto
supabase link --project-ref obxvffplochgeiclibng

# Configurar secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<TU_TOKEN>

# Si usas Binance integration
supabase secrets set BINANCE_API_KEY=<TU_KEY>
supabase secrets set BINANCE_API_SECRET=<TU_SECRET>

# Verificar
supabase secrets list
```

---

### 6. Crear Test Users en Supabase (20 min)

#### Opción A: Via Dashboard (Más Fácil)

1. Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/auth/users
2. Click "Add user"
3. Email: `test-renter@autorenta.com`
4. Password: `TestPassword123!`
5. ✅ **Auto Confirm**: YES
6. Click "Create user"
7. Repetir para `test-owner@autorenta.com`

#### Opción B: Via SQL

```bash
export PGPASSWORD=ECUCONDOR08122023
psql postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# Ejecutar scripts de docs/TEST_USERS_SETUP.md
```

**Verificar**:
```sql
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email LIKE 'test-%@autorenta.com';
```

**Documentación completa**: `docs/TEST_USERS_SETUP.md`

---

### 7. Crear .env.local para Desarrollo (5 min)

```bash
cd /home/edu/autorenta

# Copiar template
cp config/environments/.env.production.template .env.local

# Editar con valores reales
nano .env.local
# O tu editor preferido
```

**Llenar con**:
- Supabase keys del dashboard
- Mercado Pago tokens del dashboard
- Mapbox token
- Database password: ECUCONDOR08122023

**Verificar que está en .gitignore**:
```bash
git check-ignore .env.local
# Debe retornar: .env.local
```

---

## ✅ Checklist de Verificación

Marcar cuando completes cada paso:

- [ ] Revisé `docs/FASE_1_COMPLETADA.md`
- [ ] Commiteé cambios en `.gitignore`
- [ ] Configuré GitHub Actions Secrets (verificado con `gh secret list`)
- [ ] Configuré Cloudflare Workers Secrets
- [ ] Configuré Supabase Edge Functions Secrets
- [ ] Creé test users (test-renter y test-owner)
- [ ] Creé `.env.local` para desarrollo
- [ ] Verifiqué que `.env.local` está en `.gitignore`
- [ ] Leí `docs/PRODUCTION_READINESS_BASELINE.md` (opcional pero recomendado)
- [ ] Leí `docs/SECURITY_AUDIT.md` (opcional pero recomendado)

---

## 🧪 Pruebas de Verificación

### Test 1: GitHub Actions

```bash
# Trigger workflow manualmente
git commit --allow-empty -m "test: verify secrets configured"
git push

# Ver resultado
gh run list --limit 1
gh run view --log
```

**Debe pasar sin errores** de "secret not found"

---

### Test 2: Cloudflare Worker

```bash
# Deploy worker
cd apps/workers/mercadopago
wrangler deploy

# Test endpoint (si tienes uno de health check)
curl https://tu-worker.workers.dev/health
```

---

### Test 3: Login con Test User

```bash
# Abrir app local
cd apps/web
npm run start

# En browser:
# 1. Ir a /login
# 2. Email: test-renter@autorenta.com
# 3. Password: TestPassword123!
# 4. Debe loggear exitosamente
```

---

## 📚 Documentación de Referencia

| Si necesitas... | Ver documento... |
|-----------------|------------------|
| Configurar secrets | `docs/GITHUB_SECRETS_SETUP.md` |
| Crear test users | `docs/TEST_USERS_SETUP.md` |
| Rotar un secret | `docs/runbooks/secret-rotation.md` |
| Hacer backup de DB | `docs/runbooks/database-backup-restore.md` |
| Resolver split payment failure | `docs/runbooks/split-payment-failure.md` |
| Ver roadmap completo | `docs/PRODUCTION_READINESS_BASELINE.md` |
| Ver security issues | `docs/SECURITY_AUDIT.md` |
| Resumen de Fase 1 | `docs/FASE_1_COMPLETADA.md` |

---

## 🔄 Próximos Pasos (Después de Completar Esto)

### Fase 2: Fixes de Código (Esta Semana)

**Responsable**: GitHub Copilot

1. Fix `booking_risk_snapshots` table name issue
2. Implementar `getCarName()` con datos reales
3. Validar MP onboarding antes de publicar auto
4. Agregar `payout_status` a bookings table
5. Implementar webhook resiliente con retries

**Ver**: `docs/PRODUCTION_READINESS_BASELINE.md` → Roadmap

---

### Fase 3: Tests Environment Separation (Próxima Semana)

**Responsable**: Ambos (Claude Code + Copilot)

1. Crear `.env.test` con test credentials
2. Mock completo de Mercado Pago API
3. Tests no modifican producción
4. Coverage > 60%
5. CI pasa consistentemente

---

## 🆘 Si Algo Sale Mal

### "No puedo configurar un secret"

1. **Verificar permisos**: Debes ser admin del repo
2. **Verificar GitHub CLI**: `gh auth status`
3. **Ver documentación**: Sección correspondiente en docs/

### "Tests fallan en CI"

1. **Verificar secrets**: `gh secret list`
2. **Ver logs**: `gh run view <ID> --log`
3. **Verificar .env.test**: Debe existir y tener valores correctos

### "Worker no funciona"

1. **Verificar secrets**: `wrangler secret list`
2. **Redeploy**: `wrangler deploy`
3. **Ver logs**: `wrangler tail`

### "No puedo crear test users"

1. **Ver guía completa**: `docs/TEST_USERS_SETUP.md`
2. **Verificar password de DB**: ECUCONDOR08122023
3. **Probar via Dashboard**: Más fácil que SQL

---

## 💬 Feedback y Mejoras

Si encuentras algo que falta o está confuso:

1. Añadir nota en el documento relevante
2. O crear issue con label "documentation"
3. O actualizar directamente y hacer PR

---

## 🎉 ¡Listo!

Una vez completes este checklist:
- ✅ Secrets configurados en todos los servicios
- ✅ Test users creados y funcionales
- ✅ .gitignore protegiendo secrets
- ✅ Documentación completa para operar el sistema

**Tiempo total**: 1-2 horas (con interrupciones)

**Próximo milestone**: Fase 2 completada (código fixes) - Target: 2025-11-04

---

**Última actualización**: 2025-10-28  
**Creado por**: Claude Code  
**Mantenido por**: Equipo AutoRenta
