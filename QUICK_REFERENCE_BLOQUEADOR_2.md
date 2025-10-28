# ⚡ QUICK REFERENCE - BLOQUEADOR #2: SETUP SECRETS

**TL;DR**: Configurar 9 secrets en 2 dashboards para que el sistema de pagos funcione.
**Tiempo**: 1.5-2 horas (procedural, sin código)
**Complejidad**: Media (copy-paste, sin codificación)
**Responsable**: Edu (requiere acceso a dashboards)

---

## 🚀 QUICK START (Haz esto AHORA si tienes 2 horas)

### ✅ Requerimientos Previos
```bash
# Verificar herramientas instaladas
wrangler --version
# Esperado: >= 4.38.0

supabase --version
# Esperado: >= 2.51.0
```

---

## 🔐 PASO 1: CLOUDFLARE WORKERS SECRETS (30 min)

### Terminal Commands
```bash
cd /home/edu/autorenta/functions/workers/payments_webhook

# Login
wrangler login

# Set secrets
wrangler secret put --env production SUPABASE_URL
# → Copiar-pegar: https://obxvffplochgeiclibng.supabase.co

wrangler secret put --env production SUPABASE_SERVICE_ROLE_KEY
# → Copiar-pegar: [De Supabase Dashboard → Settings → API → service_role]

wrangler secret put --env production MERCADOPAGO_ACCESS_TOKEN
# → Copiar-pegar: [De MercadoPago Dashboard]

# Verificar
wrangler secret list --env production
# Debe mostrar: 3 secrets
```

### Dónde obtener valores

**SUPABASE_SERVICE_ROLE_KEY**:
1. Ir a: https://app.supabase.com/project/obxvffplochgeiclibng
2. Settings → API
3. Under "Project API keys"
4. Copiar "service_role secret" (la KEY larga)

**MERCADOPAGO_ACCESS_TOKEN**:
1. Ir a: https://www.mercadopago.com.ar/developers/panel
2. "Credenciales de producción"
3. Copiar "Access Token"

---

## 🔑 PASO 2: SUPABASE EDGE FUNCTIONS SECRETS (30 min)

### Terminal Commands
```bash
cd /home/edu/autorenta

# Link al proyecto
supabase link --project-ref obxvffplochgeiclibng

# Set secrets (3 mismos valores que Cloudflare)
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-[TOKEN]
supabase secrets set SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[KEY_COPIADA]

# Verificar
supabase secrets list
# Debe mostrar: 3 secrets

# Deploy functions
supabase functions deploy mercadopago-webhook
supabase functions deploy mercadopago-create-preference
supabase functions deploy mercadopago-create-booking-preference
```

---

## 🌐 PASO 3: CLOUDFLARE PAGES ENV VARS (20 min)

### Manual via Dashboard
1. Ir a: https://dash.cloudflare.com/
2. **Pages** → **autorenta-web**
3. **Settings** → **Environment variables**
4. **Production** tab
5. Agregar 6 variables PÚBLICAS:

```
NG_APP_SUPABASE_URL
→ https://obxvffplochgeiclibng.supabase.co

NG_APP_SUPABASE_ANON_KEY
→ eyJhbGciOi... (de Supabase Settings → API → anon key)

NG_APP_MAPBOX_ACCESS_TOKEN
→ pk.eyJ1... (el que ya tienen)

NG_APP_MERCADOPAGO_PUBLIC_KEY
→ APP_USR-a89f4240...

NG_APP_DEFAULT_CURRENCY
→ ARS

NG_APP_PAYMENTS_WEBHOOK_URL
→ https://[WORKER_URL]/webhooks/payments
```

---

## ✅ PASO 4: DEPLOY & VERIFY (15 min)

### Terminal
```bash
# Deploy worker
cd /home/edu/autorenta/functions/workers/payments_webhook
wrangler deploy --env production
# Esperado: ✔ Deployed to https://[URL]

# Build frontend
cd /home/edu/autorenta/apps/web
npm run build
# Esperado: ✔ Building... [X seconds]

# Test que variables están disponibles
cat dist/web/public/env.js
# Debe contener: NG_APP_SUPABASE_URL, NG_APP_MERCADOPAGO_PUBLIC_KEY, etc.
```

### Dashboard Verification
```
Cloudflare:
- Ir a: Workers → autorenta-payments-worker → Settings → Secrets
- Verificar: 3 secrets presentes

Supabase:
- Ir a: Edge Functions → mercadopago-webhook → Settings → Secrets
- Verificar: 3 secrets presentes
```

---

## 🧪 QUICK TEST (5 min)

### Verificar que todo funciona

```bash
# Test 1: Cloudflare Worker
curl -X POST https://[WORKER_URL]/webhooks/payments \
  -H "Content-Type: application/json" \
  -d '{"test":true}'
# Resultado esperado: {"status": "ok"} o similar

# Test 2: Supabase function logs
supabase functions logs mercadopago-webhook
# Resultado esperado: Sin errores de "missing secret"

# Test 3: Frontend build
cd /home/edu/autorenta/apps/web
grep "SUPABASE_URL" dist/web/public/env.js
# Resultado esperado: Variable visible
```

---

## 🚨 ERROR TROUBLESHOOTING

### Error: "Secret not found"
```bash
# Solución:
1. Verificar que secret existe: wrangler secret list
2. Si no existe, crear: wrangler secret put NOMBRE
3. Verificar copy-paste correcto (sin espacios)
```

### Error: "Invalid credentials"
```bash
# Solución:
1. Copiar nuevamente de dashboard (copy exacto)
2. Verificar no haya caracteres extras
3. Verificar que sea production token (no sandbox)
```

### Error: "Permission denied" en Supabase
```bash
# Solución:
1. Verificar que sea SERVICE_ROLE_KEY (no ANON_KEY)
2. Copiar nuevamente de Supabase Settings → API
3. Confirmar que está bajo "Project API keys"
```

---

## 📋 CHECKLIST FINAL

Marca estos items cuando completes:

```
CLOUDFLARE WORKERS:
☐ wrangler login exitoso
☐ 3 secrets configurados (wrangler secret list muestra 3)
☐ wrangler deploy exitoso
☐ Webhook responde a POST requests

SUPABASE EDGE FUNCTIONS:
☐ supabase link exitoso
☐ 3 secrets configurados (supabase secrets list muestra 3)
☐ 3 functions desplegadas (mercadopago-webhook, create-preference, create-booking-preference)
☐ supabase functions logs sin errores

CLOUDFLARE PAGES:
☐ 6 environment variables configuradas en Production
☐ npm run build exitoso
☐ dist/web/public/env.js contiene variables

OVERALL:
☐ Todos los secrets están fuera de .env archivos
☐ No hay secrets en git
☐ CI/CD pipeline puede acceder a valores
```

---

## 📊 ESTIMADO DE TIEMPO

| Paso | Tiempo | Dificultad |
|------|--------|-----------|
| Cloudflare Workers secrets | 30 min | Fácil |
| Supabase secrets + deploy | 30 min | Fácil |
| Cloudflare Pages env vars | 20 min | Muy fácil |
| Verificación & testing | 15 min | Fácil |
| **TOTAL** | **~2 horas** | **Muy fácil** |

---

## 📚 DOCUMENTACIÓN COMPLETA

Para detalles adicionales, ver:
- `HITO_BLOQUEADOR_2_SETUP_SECRETS.md` (guía exhaustiva 350+ líneas)
- `STATUS_BLOQUEADOR_2_ACTUAL.md` (estado actual, checklist)

---

## 🎯 QUÉS ES DESPUÉS

Una vez completado Bloqueador #2 ✅:
```
1. System de pagos OPERACIONAL
2. Wallet deposits PROCESABLES
3. MercadoPago webhook RECIBIENDO notifications
4. Production readiness: 60% → 75%
5. Siguiente: Bloqueador #3 (webhook validation, 1-1.5h)
```

---

**¡Listo para empezar?** ⚡

Lee `HITO_BLOQUEADOR_2_SETUP_SECRETS.md` para guía completa, o sigue directamente los comandos arriba.

