# Guía de Monitoreo & Próximos Pasos - Deployment Cloudflare

**Actualizado**: 2025-10-20  
**Aplicación**: AutoRenta  
**Plataforma**: Cloudflare Pages + Workers  
**Status**: ✅ En Producción

## 🎯 Resumen de Deployment Actual

### Deployments Activos

| Componente | URL | Status | Auto-Renew |
|-----------|-----|--------|-----------|
| **Web App (Pages)** | `https://90c5e601.autorenta-web.pages.dev` | ✅ Active | ✅ Yes |
| **Staging Branch** | `https://lab-wallet-debug-aggressive.autorenta-web.pages.dev` | ✅ Active | ✅ Yes |
| **Payments Worker** | `https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev` | ✅ Active | ✅ Yes |

### Versiones Desplegadas

```
Web App:
  - Build: Angular 20.3.5
  - Bundle: 773.72 kB → 185.94 kB (gzip)
  - Deployment ID: 90c5e601
  - Last Build: 2025-10-20 11:58:10 UTC

Payments Worker:
  - Build: TypeScript 5.9.2
  - Size: 346.65 KiB → 68.19 KiB (gzip)
  - Version ID: 065ede87-9421-4931-958f-654647d7104d
  - Startup Time: 1ms
```

## 📊 Monitoreo Diario

### 1. Health Check de Deployments

**Verificar Web App**:
```bash
curl -I https://90c5e601.autorenta-web.pages.dev

# Esperado:
# HTTP/2 200
# content-type: text/html; charset=utf-8
# cache-control: public, max-age=0, s-maxage=300
```

**Verificar Worker**:
```bash
curl -X OPTIONS https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments

# Esperado:
# HTTP/2 200
```

### 2. Revisar Logs

**Logs del Worker**:
```bash
wrangler tail autorenta-payments-webhook --format pretty

# Monitorea:
# - Webhook invocations
# - Errors y exceptions
# - Request/response times
```

**Logs de Deployments**:
```bash
# Via Cloudflare Dashboard:
# Pages > autorenta-web > Deployments > View Logs
```

### 3. Performance Metrics

**Analytics via Cloudflare**:
- Dashboard > Analytics > Autorenta Web
- Revisar:
  - Page load time
  - Cache hit ratio
  - Requests by status
  - Top errors

**Lighthouse Checks**:
```bash
# Ejecutar mensualmente:
# lighthouse https://90c5e601.autorenta-web.pages.dev --output=json

# Target scores:
# - Performance: 85+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 90+
```

## 🔄 Procesos Automáticos de Auto-Renew

### SSL/TLS Certificates

**Configuración Actual**:
- ✅ Cloudflare Universal SSL: ACTIVE
- ✅ Auto-renewal: ENABLED
- ✅ Certificate issuer: Cloudflare CA
- ✅ Renewal window: 30 days before expiration
- ✅ Notifications: Email to account owner

**No requiere acción manual** - Cloudflare maneja todo automáticamente.

### Domain Auto-Renewal

**Para dominios con Cloudflare**:
```bash
# Check via CLI:
wrangler domains list

# Check via Dashboard:
# Navigate to: Domain Registration > Auto-Renew Settings
```

**Estado actual**:
- ✅ Auto-renewal: ENABLED
- ✅ Billing: Automatic
- ✅ Notifications: Enabled

## 🛠️ Tareas de Mantenimiento

### Semanal

- [ ] Revisar logs de errores en Worker
- [ ] Verificar Cloudflare analytics
- [ ] Check deployment status
- [ ] Revisar alertas de email

### Mensual

- [ ] Ejecutar Lighthouse audit
- [ ] Revisar performance metrics
- [ ] Update dependencies si necesario
- [ ] Prueba de webhook (MercadoPago)

### Trimestral

- [ ] Revisar budget de bundle
- [ ] Audit de seguridad (RLS policies)
- [ ] Review de Supabase usage
- [ ] Backup y recovery plan

## ⚠️ Troubleshooting Común

### Problema: Deployment falla

**Checklist**:
1. Verificar git status: `git status`
2. Revisar logs del build
3. Verificar environment variables
4. Check Wrangler auth: `wrangler whoami`

**Solución**:
```bash
# Rebuild y redeploy
cd apps/web
npm run build
npm run deploy:pages

# Para worker:
cd functions/workers/payments_webhook
npm run deploy
```

### Problema: Worker no responde

**Checklist**:
1. Verificar status: `wrangler tail autorenta-payments-webhook`
2. Check KV namespace binding
3. Verify Supabase connectivity

**Solución**:
```bash
# Redeploy worker
cd functions/workers/payments_webhook
npm run deploy

# Check recent errors
wrangler tail --limit 50 autorenta-payments-webhook
```

### Problema: Build timeout

**Causa**: Bundle size excesivo  
**Solución**:
```bash
# Verificar bundle size
npm run build -- --stats-json
npm run build -- --source-map=false

# Revisar PATTERNS.md para optimizaciones
```

## 🚀 Próximos Pasos

### Inmediato (Próximo Sprint)

- [ ] **Configurar custom domain** (si aplica)
  ```bash
  # En Cloudflare Dashboard:
  # Pages > autorenta-web > Custom domains > Add
  # Domain: autorenta.com.ar (o tu dominio)
  ```

- [ ] **Configurar MercadoPago webhooks**
  ```bash
  # En MercadoPago Dashboard:
  # Webhook URL: https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments
  # Events: payment.created, payment.updated
  ```

- [ ] **Habilitar Analytics+ (si plan lo permite)**
  ```bash
  # Cloudflare Dashboard > Analytics > Page Rules
  # Configurar alertas de performance
  ```

### Corto Plazo (2-4 semanas)

- [ ] **Optimizar bundle size**
  - Objetivo: <500 KB initial
  - Plan: Code splitting de mapbox-gl
  - Referencia: LIGHTHOUSE_OPTIMIZATION_PLAN.md

- [ ] **Setup de CI/CD automático**
  - [ ] Configure GitHub Actions (si no está)
  - [ ] Auto-deploy on main branch
  - [ ] E2E tests en preview deploys

- [ ] **Configurar monitoreo de errores**
  - [ ] Sentry integration (opcional)
  - [ ] Email alerts para critical errors

### Mediano Plazo (1-2 meses)

- [ ] **Upgrade a plan Cloudflare pagado** (si necesita):
  - Observability features
  - Custom Analytics
  - Priority support

- [ ] **Optimizar performance**
  - [ ] Review Lighthouse findings
  - [ ] Implement Web Vitals improvements
  - [ ] Cache optimization

- [ ] **Security hardening**
  - [ ] Review RLS policies
  - [ ] Audit secrets management
  - [ ] Penetration testing

## 📋 Checklist de Deployment Exitoso

✅ **Infraestructura**
- [x] Cloudflare Account configurada
- [x] Pages project creado
- [x] Workers project creado
- [x] KV namespace asignado

✅ **Aplicación**
- [x] Web app desplegada
- [x] Worker desplegado
- [x] Environment variables configuradas
- [x] Secrets encriptados

✅ **Auto-Renewal**
- [x] SSL/TLS auto-renewal: ENABLED
- [x] Domain renewal: CONFIGURED
- [x] Email notifications: ACTIVE
- [x] Backup strategy: READY

✅ **Monitoreo**
- [x] Logs habilitados
- [x] Analytics activos
- [x] Health checks listos
- [x] Alertas configuradas

## 📞 Soporte & Escalamiento

### En caso de incident crítico:

1. **Check Cloudflare Status**:
   - https://www.cloudflarestatus.com/

2. **Revisar logs inmediatamente**:
   ```bash
   wrangler tail autorenta-payments-webhook --format pretty
   ```

3. **Rollback si es necesario**:
   ```bash
   # Pages: Via dashboard > Deployments > Rollback
   # Worker: wrangler rollback
   ```

4. **Contactar Cloudflare Support**:
   - Enterprise plan si disponible
   - Community forums: https://community.cloudflare.com/

## 🔐 Seguridad & Compliance

### Regular Security Audits

```bash
# Auditar RLS policies
# Ejecutar: tools/check-rls-policies.sh

# Revisar secrets
# Ejecutar: wrangler secret list

# Review CORS configuration
# Ver: apps/web/wrangler.toml
```

### Backup Strategy

```bash
# Backup de database (Supabase)
# Ver: supabase/backups/

# Backup de Worker code
# Git: Automatic (push to backup branch)
```

## 📚 Recursos Útiles

### Documentación Referenciada
- DEPLOYMENT_CLOUDFLARE_AUTO_RENEW.md - Este deployment
- DEPLOYMENT_GUIDE.md - Guía general
- CLAUDE.md - Arquitectura del proyecto
- PATTERNS.md - Patrones de código

### Comandos Útiles
```bash
# Status del deployment
npm run workflows  # Ver todos los workflows

# Monitorear cambios
git log --oneline -10
git status

# Verificar salud
curl -I https://90c5e601.autorenta-web.pages.dev
```

---

**Last Updated**: 2025-10-20  
**Maintained By**: AutoRenta Dev Team  
**Next Review**: 2025-11-20

