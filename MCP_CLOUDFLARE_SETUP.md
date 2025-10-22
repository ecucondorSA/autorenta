# MCP Cloudflare Setup - AutoRenta

## ✅ Configuración Completada (2025-10-18)

### 1. MCP Servers Configurados

**Ubicación:** `.claude/config.json`

**Servidores Activos (Free Tier):**
- `cloudflare-builds` - Deploy and manage Pages/Workers builds
- `cloudflare-docs` - Quick Cloudflare documentation reference
- `cloudflare-bindings` - Manage Workers bindings (R2, KV, D1, AI)

**Autenticación:** OAuth con cuenta `marques.eduardo95466020@gmail.com`

---

### 2. Infraestructura Cloudflare Migrada

#### Account ID Actualizado
- **OLD (sin acceso):** `5737682cdee596a0781f795116a3120b`
- **NEW (actual):** `5b448192fe4b369642b68ad8f53a7603`

#### Payment Webhook Worker

**Archivo:** `functions/workers/payments_webhook/wrangler.toml`

**Cambios:**
```toml
name = "autorenta-payments-webhook"
account_id = "5b448192fe4b369642b68ad8f53a7603"  # ← AGREGADO

[[kv_namespaces]]
binding = "AUTORENT_WEBHOOK_KV"
id = "a2a12698413f4f288023a9c595e19ae6"  # ← NUEVO KV namespace
```

**KV Namespace Creado:**
```bash
$ wrangler kv namespace list
[
  {
    "id": "a2a12698413f4f288023a9c595e19ae6",
    "title": "AUTORENT_WEBHOOK_KV",
    "supports_url_encoding": true
  }
]
```

#### Web App (Cloudflare Pages)

**Archivo:** `apps/web/package.json`

**Script de Deploy Actualizado:**
```json
"deploy:pages": "npm run build && CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 npx wrangler pages deploy dist/autorenta-web"
```

#### Variables de Entorno

**Archivo:** `.env` (proyecto raíz)

```bash
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603
```

**Estado:** Agregado a `.gitignore` ✅

---

### 3. Wrangler CLI

**Autenticación:** ✅ OAuth Token activo

**Permisos:**
```
✅ account:read
✅ user:read
✅ workers:write
✅ workers_kv:write
✅ workers_routes:write
✅ workers_scripts:write
✅ workers_tail:read
✅ d1:write
✅ pages:write
✅ zone:read
✅ ssl_certs:write
✅ ai:write
✅ queues:write
✅ pipelines:write
✅ secrets_store:write
✅ containers:write
✅ cloudchamber:write
✅ connectivity:admin
✅ offline_access
```

**Comandos Verificados:**
```bash
$ wrangler whoami              # ✅ Funciona
$ wrangler kv namespace list   # ✅ Funciona
$ wrangler pages project list  # ✅ Funciona (sin proyectos todavía)
```

---

## 🚀 Próximos Pasos

### 1. Primer Deploy del Payment Webhook

```bash
cd functions/workers/payments_webhook
npm run build
npm run deploy
```

**Esto creará:**
- Worker `autorenta-payments-webhook` en Cloudflare
- URL: `https://autorenta-payments-webhook.<tu-subdomain>.workers.dev`

### 2. Primer Deploy de la Web App

```bash
cd apps/web
npm run deploy:pages
```

**Esto creará:**
- Pages project `autorenta-web`
- URL: `https://autorenta-web.pages.dev` (o custom domain)

### 3. Configurar Secrets del Worker

```bash
cd functions/workers/payments_webhook

# Agregar Supabase credentials
wrangler secret put SUPABASE_URL
# Pegar: https://obxvffplochgeiclibng.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Pegar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc
```

---

## 🎯 Uso de MCP Servers

### Desde Claude Code

**Deployment Management:**
```
"Show me my Cloudflare Workers"
"Deploy autorenta-payments-webhook"
"What's the status of my last Pages deployment?"
```

**Documentation:**
```
"How do I configure custom domains in Cloudflare Pages?"
"Show me examples of KV namespace usage"
"What are the Workers free tier limits?"
```

**Bindings Management:**
```
"List all my KV namespaces"
"Show me the bindings for autorenta-payments-webhook"
```

---

## 📋 Estado Actual del Proyecto

### ✅ Completado
- [x] MCP Cloudflare configurado (3 servers)
- [x] Account ID migrado a cuenta actual
- [x] KV namespace creado en nueva cuenta
- [x] Scripts de deploy actualizados
- [x] Variables de entorno configuradas
- [x] Wrangler autenticado correctamente

### ⏳ Pendiente
- [ ] Primer deploy del payment webhook worker
- [ ] Primer deploy de la web app a Pages
- [ ] Configurar secrets en el worker
- [ ] Upgrade a paid plan para Observability server (opcional)
- [ ] Configurar custom domain (opcional)

---

## 🔐 Seguridad

**Archivos NO subir a Git (ya en .gitignore):**
- `.env`
- `.env.development.local`
- `wrangler.toml` (contiene account_id pero OK si es público)

**Secrets manejados por Wrangler:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Estos secrets se configuran con `wrangler secret put` y se almacenan encriptados en Cloudflare.

---

## 📚 Recursos

- **MCP Config:** `.claude/config.json`
- **CLAUDE.md:** Sección "Model Context Protocol (MCP) Integration" (líneas 751-883)
- **Worker Config:** `functions/workers/payments_webhook/wrangler.toml`
- **Web Deploy:** `apps/web/package.json` (script `deploy:pages`)
- **GitHub:** https://github.com/cloudflare/mcp-server-cloudflare
- **Docs:** https://developers.cloudflare.com/agents/model-context-protocol/

---

## 🆘 Troubleshooting

### Error: "Authentication error [code: 10000]"

**Causa:** Wrangler intentando usar cuenta antigua

**Solución:**
```bash
# Verificar que .env tiene CLOUDFLARE_ACCOUNT_ID
cat .env | grep CLOUDFLARE_ACCOUNT_ID

# O usar variable de entorno explícita
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 wrangler <comando>
```

### MCP Servers no aparecen en Claude Code

**Solución:**
1. Reiniciar Claude Code
2. Verificar `.claude/config.json` existe
3. Cuando Claude Code pida autenticar, usar cuenta de Cloudflare

### Worker deploy falla

**Verificar:**
```bash
# Cuenta correcta
cat functions/workers/payments_webhook/wrangler.toml | grep account_id

# Build exitoso
cd functions/workers/payments_webhook && npm run build

# KV namespace existe
wrangler kv namespace list
```

---

**Última actualización:** 2025-10-18 20:30 UTC
**Estado:** ✅ Configuración completa, listo para deploy
