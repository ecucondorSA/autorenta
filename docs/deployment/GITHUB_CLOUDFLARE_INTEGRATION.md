# 🔗 GitHub → Cloudflare Pages Integration

**Estado**: ✅ CONFIGURADO Y FUNCIONANDO  
**Fecha**: 15 de noviembre de 2025  
**Deployment URL**: https://autorentar.com

---

## ✅ Configuración Completada

### 1. GitHub Actions Workflow

**Archivo**: `.github/workflows/deploy_pages.yml`

**Trigger**:
- Push a `main` branch
- Cambios en `apps/web/**`, `package.json`, `pnpm-lock.yaml`
- Manual dispatch desde GitHub UI

**Flujo**:
1. Checkout código
2. Setup pnpm (10.22.0) + Node.js (20)
3. Instalar dependencias
4. Build Angular app
5. Inyectar env.js con production secrets
6. Preparar directorio (crear .cfignore)
7. Deploy con wrangler a Cloudflare Pages
8. Mostrar resumen con URLs

**Duración promedio**: ~1m 54s

---

## 🔐 GitHub Secrets Configurados

| Secret | Descripción | Status |
|--------|-------------|--------|
| `CF_API_TOKEN` | Token API de Cloudflare | ✅ |
| `CF_ACCOUNT_ID` | Account ID (hardcoded en workflow) | ✅ |
| `CF_PAGES_PROJECT` | Nombre del proyecto: `autorenta-web` | ✅ |
| `SUPABASE_URL` | URL de Supabase | ✅ |
| `SUPABASE_ANON_KEY` | Anon key de Supabase | ✅ |
| `MAPBOX_ACCESS_TOKEN` | Token de Mapbox | ✅ |
| `MERCADOPAGO_PROD_PUBLIC_KEY` | Public key de MercadoPago | ✅ |

---

## 🌐 URLs de Deployment

### Producción
- **Custom Domain**: https://autorentar.com ✅
- **Pages URL**: https://autorenta-web.pages.dev ✅

### Deployments Individuales
- Cada push genera una URL única: `https://{hash}.autorenta-web.pages.dev`
- Útil para preview/testing

### Branch Aliases
- **main** → https://production.autorenta-web.pages.dev

---

## 🚀 Cómo Usar

### Deployment Automático

Simplemente hacer push a `main`:

```bash
git add .
git commit -m "feat: my new feature"
git push origin main
```

El workflow se ejecutará automáticamente y desplegará a producción.

### Deployment Manual

Desde GitHub UI:
1. Ir a **Actions** → **Deploy to Cloudflare Pages**
2. Click en **Run workflow**
3. Seleccionar branch `main`
4. Click en **Run workflow**

### Ver Status de Deployments

```bash
# Listar últimos 5 deployments
gh run list --workflow="deploy_pages.yml" --limit 5

# Ver detalles de un deployment específico
gh run view <RUN_ID>

# Monitorear deployment en tiempo real
gh run watch <RUN_ID>
```

---

## 🔧 Soluciones Implementadas

### Problema 1: Wrangler escaneaba node_modules de workers

**Error**:
```
✘ [ERROR] The constant "GLIBC" must be initialized
functions/workers/payments_webhook/node_modules/detect-libc/index.d.ts:4:13
```

**Solución**:
- Crear `.cfignore` en directorio de deployment
- Excluir `**/node_modules/`, `**/functions/`, `**/.git/`
- Usar flag `--commit-dirty=true`

### Problema 2: cloudflare/pages-action@v1 deprecado

**Solución**:
- Cambiar a comando directo `wrangler pages deploy`
- Usar variables de entorno `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`
- Mayor control sobre flags y comportamiento

---

## 📊 Métricas de Deployment

### Último Deployment Exitoso

- **Run ID**: 19385695211
- **Commit**: `11b74f2e`
- **Branch**: main
- **Duración**: 1m 54s
- **Archivos subidos**: 1 nuevo (627 en cache)
- **Hash**: dec51cbf
- **URL**: https://dec51cbf.autorenta-web.pages.dev
- **Status**: ✅ SUCCESS

### Historial de Deploys

```bash
STATUS  TITLE                              WORKFLOW              BRANCH  EVENT  ELAPSED
✓       fix: resolve wrangler error        Deploy to CF Pages    main    push   1m54s
✓       ci: configure GitHub integration   Deploy to CF Pages    main    push   1m42s
X       docs: move obsolete files          Deploy to CF Pages    main    push   10s
```

---

## 🔍 Troubleshooting

### Ver logs de un deployment fallido

```bash
gh run view <RUN_ID> --log-failed
```

### Re-correr un deployment fallido

```bash
gh run rerun <RUN_ID>
```

### Verificar secrets

```bash
gh secret list
```

### Verificar proyectos en Cloudflare

```bash
wrangler pages project list
```

---

## 📝 Archivos Importantes

### Workflow de CI/CD

- `.github/workflows/deploy_pages.yml` - Deployment automático
- `.github/workflows/ci.yml` - Pipeline de CI (tests, lint, build)
- `.github/workflows/pr-validation.yml` - Validación de PRs

### Configuración de Build

- `apps/web/package.json` - Scripts de build
- `apps/web/angular.json` - Configuración de Angular
- `apps/web/scripts/generate-env.js` - Generación de env.js
- `apps/web/scripts/create-cloudflare-config.js` - _headers y _redirects

### Cloudflare Pages

- `apps/web/dist/web/browser/_headers` - Headers HTTP
- `apps/web/dist/web/browser/_redirects` - Reglas de redirect (SPA)
- `apps/web/dist/web/browser/env.js` - Variables de entorno

---

## 🎯 Próximos Pasos

### Mejoras Sugeridas

1. **Preview Deployments para PRs**:
   ```yaml
   on:
     pull_request:
       branches: [main]
   ```
   - Cada PR tendría su propia URL de preview
   - Facilita QA y revisión de código

2. **Rollback Automático**:
   - Si tests E2E fallan post-deployment
   - Usar Cloudflare API para rollback

3. **Notificaciones**:
   - Slack/Discord cuando deployment completa
   - Alertas si deployment falla

4. **Métricas**:
   - Tiempo de deployment
   - Tamaño de bundle
   - Performance scores

### Configuración Adicional

1. **Custom 404 page**:
   - Crear `apps/web/dist/web/browser/404.html`
   - Cloudflare lo servirá automáticamente

2. **Analytics**:
   - Habilitar Cloudflare Web Analytics
   - O integrar Google Analytics

3. **CDN Configuration**:
   - Browser cache TTL
   - Edge cache TTL
   - Purge automático post-deployment

---

## ✅ Checklist de Configuración

- [x] GitHub Actions workflow creado
- [x] GitHub Secrets configurados
- [x] Cloudflare Pages project creado (`autorenta-web`)
- [x] Custom domain configurado (`autorentar.com`)
- [x] SSL certificate activo (automático)
- [x] Deployment automático funcionando
- [x] Environment variables inyectadas
- [x] _headers y _redirects configurados
- [x] .cfignore para excluir archivos innecesarios
- [ ] Preview deployments para PRs (opcional)
- [ ] Rollback automático (opcional)
- [ ] Notificaciones (opcional)

---

## 📚 Referencias

- **Cloudflare Pages Docs**: https://developers.cloudflare.com/pages/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **GitHub Actions**: https://docs.github.com/en/actions
- **Angular Deployment**: https://angular.dev/tools/cli/deployment

---

**Última actualización**: 15 de noviembre de 2025, 06:25 UTC  
**Mantenedor**: ecucondorSA/autorenta  
**Status**: ✅ Producción activa
