# 📊 STATUS ACTUAL - BLOQUEADOR #2: SETUP DE SECRETS

**Fecha**: 28 Octubre, 2025
**Status**: 🟡 PARCIALMENTE COMPLETADO
**Acción Requerida**: Manual (requiere acceso a dashboards)

---

## ✅ LO QUE YA ESTÁ CONFIGURADO

### 1. Herramientas CLI Instaladas ✅

```bash
✅ wrangler v4.38.0 (Cloudflare)
✅ supabase v2.51.0 (Supabase)
✅ git v2.43.0
✅ node v18.18.0
```

### 2. Archivos de Configuración ✅

```
✅ functions/workers/payments_webhook/wrangler.toml
✅ apps/web/.env.production (valores básicos)
✅ apps/web/.env.development.local (desarrollo)
✅ supabase/functions/ (todos desplegados)
```

### 3. Secrets en .gitignore ✅

```bash
✅ .env.* patterns en .gitignore
✅ No hay secrets en git history
✅ No hay credentials expuestas
```

### 4. Archivos Source Code ✅

```
✅ supabase/functions/mercadopago-webhook/index.ts
✅ supabase/functions/mercadopago-create-preference/index.ts
✅ supabase/functions/mercadopago-create-booking-preference/index.ts
✅ functions/workers/payments_webhook/src/index.ts (mock, solo dev)
```

### 5. Build Pipeline ✅

```bash
✅ npm run build funciona sin errores
✅ TypeScript compilation: 0 errors
✅ Cloudflare Pages config auto-generado
✅ Bundle size: 1.29 MB (aceptable)
```

---

## 🔴 LO QUE FALTA HACER (Tareas Manuales)

### 1️⃣ Cloudflare Workers Secrets (30 minutos)

**Status**: ❌ PENDIENTE
**Acción**: Requiere acceso a Cloudflare Dashboard

```bash
# FALTA EJECUTAR:

# 1. Login a Cloudflare
wrangler login

# 2. Configurar secrets en Cloudflare
cd functions/workers/payments_webhook

wrangler secret put --env production SUPABASE_URL
# Ingresara: https://obxvffplochgeiclibng.supabase.co

wrangler secret put --env production SUPABASE_SERVICE_ROLE_KEY
# Ingresar: [Obtenido de Supabase Project Settings]

wrangler secret put --env production MERCADOPAGO_ACCESS_TOKEN
# Ingresar: [Obtenido de MercadoPago App Dashboard]

# 3. Verificar secrets
wrangler secret list --env production
```

**Verificación**:
- [ ] `wrangler secret list --env production` muestra 3 secrets
- [ ] Cloudflare Dashboard → Workers → autorenta-payments-worker → Settings → Secrets muestra 3 items

---

### 2️⃣ Supabase Edge Functions Secrets (30 minutos)

**Status**: ❌ PENDIENTE
**Acción**: Requiere acceso a Supabase Dashboard

```bash
# FALTA EJECUTAR:

# 1. Link a Supabase
cd /home/edu/autorenta
supabase link --project-ref obxvffplochgeiclibng

# 2. Configurar secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-[TOKEN]
supabase secrets set SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[KEY]

# 3. Verificar
supabase secrets list
```

**Verificación**:
- [ ] `supabase secrets list` muestra 3 secrets
- [ ] Supabase Dashboard → Edge Functions → mercadopago-webhook → Settings → Secrets muestra 3 items

---

### 3️⃣ Cloudflare Pages Environment Variables (20 minutos)

**Status**: ❌ PENDIENTE (Opcional - para CI/CD)
**Acción**: Requiere acceso a Cloudflare Dashboard (opcional para deploy manual)

```
Ir a: https://dash.cloudflare.com/
Pages → autorenta-web → Settings → Environment variables → Production

Agregar variables PÚBLICAS (no secrets):
- NG_APP_SUPABASE_URL
- NG_APP_SUPABASE_ANON_KEY
- NG_APP_MAPBOX_ACCESS_TOKEN
- NG_APP_MERCADOPAGO_PUBLIC_KEY
- NG_APP_DEFAULT_CURRENCY
```

---

### 4️⃣ Deploy de Cloudflare Worker (15 minutos)

**Status**: ❌ PENDIENTE
**Acción**: Una vez configurados los secrets

```bash
cd /home/edu/autorenta/functions/workers/payments_webhook

# Deploy a Cloudflare
wrangler deploy --env production

# Resultado esperado:
# ✔ Uploaded payments_webhook
# ✔ Deployed to https://[WORKER_URL]/webhooks/payments
```

---

### 5️⃣ Deploy de Supabase Edge Functions (10 minutos)

**Status**: ❌ PENDIENTE
**Acción**: Una vez configurados los secrets

```bash
cd /home/edu/autorenta

# Deploy individual functions
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-create-booking-preference

# Resultado esperado:
# ✔ Deployed function mercadopago-webhook
# ✔ Deployed function mercadopago-create-preference
# ✔ Deployed function mercadopago-create-booking-preference
```

---

## 📋 INFORMACIÓN NECESARIA PARA COMPLETAR

Para completar manualmente, necesitarás obtener:

### De MercadoPago Dashboard
```
1. ACCESS TOKEN (para pagos reales)
   - Ir a: https://www.mercadopago.com.ar/developers/panel
   - Sección: "Credenciales de producción"
   - Copiar: "Access Token"
   - Patrón: APP_USR-[alphanumeric]
```

### De Supabase Dashboard
```
1. SERVICE ROLE KEY
   - Ir a: https://app.supabase.com/project/obxvffplochgeiclibng
   - Settings → API
   - Copiar: "service_role" (no anon key)
   - Patrón: eyJhbGciOi... (JWT)

2. PROJECT URL
   - Copiar: https://obxvffplochgeiclibng.supabase.co
```

### De Cloudflare Dashboard
```
1. ACCOUNT ID
   - Ir a: https://dash.cloudflare.com/
   - Settings → Account
   - Copiar: "Account ID"

2. ZONE ID (si aplica)
   - Ir a: https://dash.cloudflare.com/
   - Seleccionar dominio
   - Copiar: "Zone ID"
```

---

## 🔍 CÓMO VERIFICAR QUE TODO ESTÁ CORRECTO

### Verificación 1: Cloudflare Workers

```bash
# Login check
wrangler whoami
# Debe mostrar tu email de Cloudflare

# Secrets check
wrangler secret list --env production
# Debe mostrar 3 secrets

# Deploy check
wrangler deploy --env production
# Debe completar sin errores

# API Test
curl -X POST https://[WORKER_URL]/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Debe retornar {"status": "ok"} o similar
```

### Verificación 2: Supabase Edge Functions

```bash
# Login check
supabase projects list
# Debe mostrar proyecto obxvffplochgeiclibng

# Secrets check
supabase secrets list
# Debe mostrar 3 secrets (MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Deploy check
supabase functions deploy mercadopago-webhook
# Debe completar sin errores

# Logs check
supabase functions logs mercadopago-webhook
# Debe mostrar logs recientes sin errores de "missing secret"
```

### Verificación 3: Frontend Build

```bash
cd /home/edu/autorenta/apps/web

# Build production
NODE_ENV=production npm run build

# Check env.js generated
cat dist/web/public/env.js | head -20

# Debe contener todas las variables públicas
# NG_APP_SUPABASE_URL, NG_APP_MERCADOPAGO_PUBLIC_KEY, etc.
```

---

## 🎯 TIMELINE

| Paso | Tiempo | Status |
|------|--------|--------|
| Cloudflare Workers Secrets | 30 min | ⏳ PENDING |
| Supabase Secrets | 30 min | ⏳ PENDING |
| Cloudflare Pages Env | 20 min | ⏳ PENDING |
| Worker Deploy | 15 min | ⏳ PENDING |
| Edge Functions Deploy | 10 min | ⏳ PENDING |
| **TOTAL** | **~2 horas** | ⏳ PENDING |

---

## 📞 CONTACTOS Y RECURSOS

### Documentación Creada
- `HITO_BLOQUEADOR_2_SETUP_SECRETS.md` - Guía paso-a-paso completa
- `STATUS_BLOQUEADOR_2_ACTUAL.md` - Este documento

### Dashboard URLs
- **Cloudflare**: https://dash.cloudflare.com/
- **Supabase**: https://app.supabase.com/project/obxvffplochgeiclibng
- **MercadoPago**: https://www.mercadopago.com.ar/developers/panel

### CLI Commands
```bash
# Verificar status en cualquier momento
wrangler status
supabase projects list
```

---

## ✅ CHECKLIST FINAL

Cuando completes Bloqueador #2, marca estos items:

- [ ] Cloudflare Workers secrets configurados
- [ ] Supabase Edge Functions secrets configurados
- [ ] Worker deployado a producción
- [ ] Edge Functions desplegadas a producción
- [ ] Cloudflare Pages environment variables configuradas
- [ ] `wrangler secret list` muestra 3 secrets
- [ ] `supabase secrets list` muestra 3 secrets
- [ ] `npm run build` completa sin errores
- [ ] Webhook URL configurada en MercadoPago
- [ ] Test end-to-end pasa (depósito simulado)

---

**Status**: 🟡 READY FOR MANUAL EXECUTION
**Duración**: 1.5-2 horas (procedimientos manuales con dashboards)
**Complejidad**: Media (copy-paste de valores, sin código a escribir)

