---
skills:
  - devtools
---

# DevTools MCP Cheat Sheet

**Referencia rápida para debugging en producción (autorentar.com)**

---

## 🚀 Quick Start

```bash
# El comando más útil para empezar
> "Inspecciona autorentar.com ahora - ¿qué ves en la consola?"

# Esto retorna instantáneamente:
# - Si la página carga (vs 500 error)
# - Errores en consola
# - Network requests fallidos
# - Performance metrics
```

**Tiempo de respuesta**: 2-3 segundos

---

## 📋 Comandos Comunes

### 1. Verificar Status de Aplicación

```bash
# ¿Está online la app?
> "¿Está online autorentar.com? Muéstrame los últimos errores en consola"

# Resultado:
# - ✅ Online / ❌ Offline (500 error)
# - Errores JavaScript en consola
# - Network errors (Supabase, MercadoPago, Mapbox, etc.)
```

**Casos de uso**: On-call alert "app is down", verificar status rápido

### 2. Inspeccionar Errors Específicos

```bash
# Ver errores de red (APIs)
> "Muéstrame los network errors en autorentar.com - ¿qué APIs están fallando?"

# Ver errores de rendering
> "¿Hay errores de JavaScript en autorentar.com que impidan el render?"

# Ver memory leaks
> "Analiza la consola de autorentar.com - ¿hay memory leaks o warnings?"
```

### 3. Performance Debugging

```bash
# Timing de carga
> "¿Cuánto tarda autorentar.com en cargar? Muéstrame Core Web Vitals"

# Recursos lentos
> "¿Qué recursos (imágenes, scripts, CSS) cargan lento en autorentar.com?"

# Network waterfall
> "Muéstrame el orden de carga de recursos en autorentar.com"
```

### 4. Inspeccionar Estado de Features

```bash
# Feature específica
> "Inspecciona autorentar.com en la página de bookings - ¿hay errores?"

# Auth flow
> "Muéstrame el flujo de auth cuando alguien hace login con Google"

# Payment flow
> "Inspecciona la consola cuando se completa un pago - ¿se envía correctamente a MercadoPago?"
```

---

## 🐛 Debugging Por Síntoma

### ❌ "autorentar.com no carga"

**Comando**:
```bash
> "¿Por qué autorentar.com no carga? Muéstrame el error HTTP"
```

**Qué buscar**:
- HTTP status code (500, 404, 503, etc.)
- Error message en consola
- Request fallida a Cloudflare Pages

**Próximos pasos**:
1. Si 500: Revisar Cloudflare Pages logs (`wrangler pages deployment tail`)
2. Si 404: Revisar que `_redirects` esté configurado
3. Si CORS error: Revisar Supabase auth configuration

---

### 🐌 "autorentar.com carga lento"

**Comando**:
```bash
> "¿Por qué carga lento autorentar.com? Analiza performance - ¿qué recurso es el cuello de botella?"
```

**Qué buscar**:
- Core Web Vitals (LCP, FID, CLS)
- Recursos grandes sin compresión
- Imágenes no optimizadas
- Queries a BD lentas

**Próximos pasos**:
1. Identificar recurso lento
2. Optimizar (compresión, caching, lazy load)
3. Revalidar con DevTools

---

### 💳 "Pagos no funcionan"

**Comando**:
```bash
> "Inspecciona autorentar.com cuando se completa un pago - ¿hay errores en red? ¿llega a MercadoPago?"
```

**Qué buscar**:
- Request a `api.mercadopago.com` (¿200 o error?)
- Error en consola (qué dice?)
- Response body (payload correcto?)
- Logs de webhook ejecutándose

**Próximos pasos**:
1. Si error en request: Verificar API key, format
2. Si webhook no ejecuta: Revisar Supabase logs
3. Si payment se crea pero split falla: Ver runbook split-payment-failure.md

---

### 🔐 "No puedo loguearse"

**Comando**:
```bash
> "Inspecciona la consola de autorentar.com cuando intento hacer login - ¿qué error hay?"
```

**Qué buscar**:
- Error de OAuth redirect
- CORS error desde Supabase
- Auth session no creándose
- Ruta `/auth/callback` retorna 404

**Próximos pasos**:
1. Si 404 en callback: Ver runbook fix-auth-callback-404.md
2. Si CORS error: Revisar Supabase URL configuration
3. Si session no crea: Revisar Supabase Auth logs

---

### 🗺️ "Maps no carga / autos no aparecen"

**Comando**:
```bash
> "¿Por qué no aparecen los autos en el mapa de autorentar.com? ¿hay errores de Mapbox?"
```

**Qué buscar**:
- Request a Mapbox API (¿status?)
- Error de GL error en consola
- Auth error de Mapbox token
- Error en Supabase query

**Próximos pasos**:
1. Si Mapbox error: Revisar token, API limit
2. Si Supabase error: Revisar query en DB
3. Si RLS error: Revisar storage permissions

---

### 📸 "Imágenes no cargan"

**Comando**:
```bash
> "¿Por qué no cargan las imágenes en autorentar.com? Muéstrame los errores de red"
```

**Qué buscar**:
- Request a Supabase Storage (¿status?)
- 403 Forbidden (RLS error)
- 404 Not Found (file not exist)
- CORS error

**Próximos pasos**:
1. Si 403: Revisar RLS policies en Storage
2. Si 404: Verificar path del archivo
3. Si CORS: Revisar Supabase configuration

---

## ⚡ On-Call Quick Flow

### Paso 1: Alerta Recibida (Tiempo: 0s)

Ejemplo: "Payment failures detected"

### Paso 2: DevTools Inspection (Tiempo: 0-5s)

```bash
> "Inspecciona autorentar.com - ¿está online? ¿hay errores en pagos?"
```

### Paso 3: Assessment (Tiempo: 5-15s)

Basándome en resultado de DevTools:

**Si está online y sin errores de checkout**:
- Problema probablemente en backend/webhook
- Escalate a backend runbook

**Si tiene error en consola (400, 500)**:
- Problema en request frontend
- Revisar código, API key, configuration

**Si está offline (500)**:
- Critical: Trigger disaster recovery
- Revisar Cloudflare Pages status

### Paso 4: Action

```bash
# Ejemplo: Payment error 500
> "Muéstrame qué request está fallando cuando intento pagar"
> "¿Es un error de MercadoPago o de Supabase?"
> [Based on response]: Escalate con contexto claro
```

---

## 🎯 Common On-Call Scenarios

### Scenario 1: "Payments are failing"

```bash
# Step 1
> "¿Funciona el flujo de pago en autorentar.com? Muéstrame errores"

# Step 2 (si hay error)
> "¿El error es en el frontend (consola) o backend (network 500)?"

# Step 3 (escalate si necesario)
# - Si frontend: revisar código/API key
# - Si backend: revisar Supabase logs
# - Si MercadoPago: revisar webhook
```

**Reference**: See [split-payment-failure.md](./runbooks/split-payment-failure.md)

---

### Scenario 2: "App is slow"

```bash
# Step 1
> "Analiza performance de autorentar.com - ¿cuáles son los Core Web Vitals?"

# Step 2 (si LCP > 2.5s)
> "¿Qué recurso está causando el slow LCP? (imágenes, scripts, API calls)"

# Step 3
# Optimizar recurso identificado:
# - Imágenes: Usar Cloudflare Image Optimization
# - Scripts: Lazy load o defer
# - API: Cache o optimizar query
```

---

### Scenario 3: "User reports error in specific feature"

```bash
# Step 1: Get context
> "¿En qué página está el error? (booking, payment, maps, etc.)"

# Step 2: Inspect
> "Inspecciona autorentar.com/[page] - ¿qué error hay en consola?"

# Step 3: Analyze network
> "¿Hay network errors? ¿Cuáles APIs están fallando?"

# Step 4: Action
# - If client error: fix frontend code
# - If API error: escalate to backend
# - If 3rd party: verify Mapbox, Supabase, MercadoPago status
```

---

## 🔗 Links Útiles

### Documentación Completa
- [DevTools MCP en CLAUDE_MCP.md](../CLAUDE_MCP.md#5-devtools-mcp-debugging-en-producción)

### Runbooks Relacionados
- [Troubleshooting General](./runbooks/troubleshooting.md#5-debugging-en-producción-con-devtools-mcp)
- [Split Payment Failure](./runbooks/split-payment-failure.md#debugging-con-devtools-mcp)
- [On-Call Rotation](./runbooks/on-call-rotation.md#debugging-rápido-con-devtools-mcp-on-call)
- [Fix Auth Callback 404](./runbooks/fix-auth-callback-404.md#debugging-con-devtools-mcp)

### Status Pages
- Supabase: https://status.supabase.com
- Cloudflare: https://www.cloudflarestatus.com
- MercadoPago: https://status.mercadopago.com

### Dashboards
- Cloudflare Pages: https://dash.cloudflare.com/
- Supabase: https://supabase.com/dashboard/project/obxvffplochgeiclibng
- Sentry: https://sentry.io/organizations/autorenta/

---

## ⏱️ Response Time Targets

| Action | Target | Notes |
|--------|--------|-------|
| **Initial DevTools inspection** | < 5s | Page state verification |
| **Error identification** | < 15s | Determine root cause category |
| **Escalation decision** | < 30s | Frontend fix, backend fix, or disaster recovery |
| **Full investigation** | < 30-60min | Depends on issue complexity |

---

## 💡 Pro Tips

### Tip 1: Ask for Specific Errors

❌ Bad: `"Why is autorentar.com failing?"`

✅ Good: `"Muéstrame los últimos errores en consola de autorentar.com"`

### Tip 2: Compare Before/After

```bash
# Good for pinpointing exact error
> "Muéstrame los errores en autorentar.com ANTES de mi deploy"
> "Ahora muéstrame después"
> "¿Qué cambió?"
```

### Tip 3: Check 3rd Party Status

Always rule out third-party services:

```bash
# Supabase status
> "¿Está Supabase up o down en status.supabase.com?"

# Cloudflare status
> "¿Hay problemas en Cloudflare en cloudflarestatus.com?"

# MercadoPago status
> "¿Está MercadoPago API operacional?"
```

### Tip 4: Use Context from Recent Deployments

```bash
# Si hubo deploy reciente
> "¿Qué cambió en el último deploy? ¿Hay errores relacionados?"

# Si hay muchos errores de repente
> "Compara errores ANTES y DESPUÉS del deploy de [commit]"
```

---

## 🚨 Critical Checklist

### If Payment System is Down

- [ ] Is Supabase Edge Function `mercadopago-webhook` running?
- [ ] Is MercadoPago API up? (check status page)
- [ ] Are there CORS errors? (check Supabase config)
- [ ] Is wallet balance consistent? (check database)

**Action**: See [split-payment-failure.md](./runbooks/split-payment-failure.md)

### If App is Offline (500 error)

- [ ] Is Cloudflare Pages deployment active?
- [ ] Are there build errors in last deployment?
- [ ] Is `_redirects` file present?
- [ ] Is Supabase reachable?

**Action**: Contact Platform Engineering, prepare rollback

### If Auth is Failing

- [ ] Is Supabase Auth service up?
- [ ] Is OAuth redirect configured correctly?
- [ ] Is `/auth/callback` route returning 404?
- [ ] Are Supabase redirect URLs configured?

**Action**: See [fix-auth-callback-404.md](./runbooks/fix-auth-callback-404.md)

---

## 📞 Escalation

**When to escalate to platform team**:
1. Issue persists after 30 minutes of investigation
2. 3rd party service is down (Supabase, Cloudflare, MercadoPago)
3. Database issue suspected
4. Multiple services failing simultaneously

**When to escalate to CTO/VP Engineering**:
1. Major outage (> 1 hour)
2. Data loss or integrity concern
3. Security incident

---

**Last Updated**: 2025-11-18
**For**: On-Call Engineers, Developers, Platform Team
**Version**: 1.0

---

## Feedback

Have a common scenario not covered? Add it to this cheat sheet:
- Open issue: [GitHub Issues](https://github.com/ecucondorSA/autorenta/issues)
- Update cheat sheet: Edit this file and add your scenario
