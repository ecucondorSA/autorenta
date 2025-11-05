# Domain Change: autorenta.com → autorentar.com

## Cambio Realizado

Se actualizó el dominio de la aplicación de `autorenta.com` a `autorentar.com` para mantener consistencia con el environment.ts de producción.

## Archivos Actualizados (18 archivos)

- `.github/workflows/build-and-deploy.yml` - URL en deployment summary
- Documentación (*.md): CLAUDE_SKILLS_GUIDE, DEPLOY_MANUAL, etc.
- Edge Functions: mercadopago-oauth-connect, mercadopago-oauth-callback
- Supabase functions: mercadopago-create-preference

## URLs Actualizadas

- `https://autorenta.com` → `https://autorentar.com`
- `https://autorenta.com.ar` → `https://autorentar.com.ar`

## ⚠️ ACCIONES REQUERIDAS POST-DEPLOYMENT

### 1. Actualizar Redirect URI en MercadoPago (CRÍTICO)

Las URLs de OAuth callback cambiaron. Debes actualizar en el dashboard de MercadoPago:

**Dashboard de MercadoPago:**
1. Ve a https://www.mercadopago.com.ar/developers/panel/app
2. Selecciona tu aplicación
3. En "Redirect URIs", actualiza:
   - ❌ VIEJO: `https://autorenta.com.ar/auth/mercadopago/callback`
   - ✅ NUEVO: `https://autorentar.com.ar/auth/mercadopago/callback`

### 2. Actualizar Secrets de Supabase

Si hay variables hardcoded con el dominio antiguo:

```bash
# Verificar secrets actuales
supabase secrets list

# Actualizar si es necesario
supabase secrets set MERCADOPAGO_OAUTH_REDIRECT_URI=https://autorentar.com.ar/auth/mercadopago/callback
supabase secrets set APP_BASE_URL=https://autorentar.com
```

### 3. Actualizar Dominio en Cloudflare Pages

1. Ve a Cloudflare Pages dashboard
2. Proyecto: `autorenta-web`
3. Settings → Custom Domains
4. Agregar: `autorentar.com` y `www.autorentar.com`
5. Configurar DNS records en Cloudflare:
   ```
   CNAME  autorentar.com  → autorenta-web.pages.dev
   CNAME  www            → autorenta-web.pages.dev
   ```

### 4. Actualizar DNS si tienes dominio registrado

Si `autorentar.com` está registrado en otro registrar:
- Apuntar nameservers a Cloudflare
- O crear CNAME a `autorenta-web.pages.dev`

### 5. Actualizar GitHub Secrets (si existen)

```bash
# Verificar en Settings → Secrets
gh secret list

# Si hay secrets con URLs, actualizarlos:
gh secret set PRODUCTION_URL --body "https://autorentar.com"
```

## Verificación Post-Deployment

Después de actualizar en MercadoPago, verificar:

```bash
# 1. Dominio resuelve correctamente
curl -I https://autorentar.com

# 2. Flujo de OAuth funciona
# Ir a /profile → "Conectar MercadoPago"
# Debe redirigir a MP y volver correctamente

# 3. Webhooks funcionan
# Hacer un depósito de prueba
# Verificar que webhook recibe notificación correctamente
```

## Rollback (si es necesario)

Si algo falla y necesitas revertir:

```bash
git revert <commit-hash>
# Luego re-actualizar URLs en MercadoPago al dominio viejo
```

## Fecha de Cambio

- **Realizado:** 2025-11-05
- **Por:** Claude Code (Production Ready Fase 3)
- **Commit:** fix(domain): unificar dominio a autorentar.com

---

**NOTA IMPORTANTE:** El cambio de dominio en OAuth es crítico. Sin actualizar MercadoPago, el flujo de conexión de vendedores fallará. Prioridad: ALTA.
