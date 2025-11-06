# 🌐 Configuración del Dominio autorentar.com - AutoRenta

**Fecha**: 2025-11-05  
**Dominio**: `autorentar.com`  
**Estado**: ✅ Dominio comprado - Configuración en progreso

---

## ✅ Cambios Automáticos Realizados

### 1. Código Actualizado

- ✅ `supabase/functions/mercadopago-oauth-connect/index.ts` - Redirect URI actualizado a `https://autorentar.com/auth/mercadopago/callback`
- ✅ `apps/web/src/environments/environment.ts` - Ya tenía `https://autorentar.com` configurado

---

## 📋 Pasos Manuales Requeridos

### Paso 1: Configurar Dominio en Cloudflare Pages

#### Opción A: Script Automático (Recomendado)

```bash
cd /home/edu/autorenta
./tools/setup-custom-domain.sh
```

Este script intentará configurar el dominio automáticamente usando la API de Cloudflare.

#### Opción B: Manual (Si el script no funciona)

1. **Ir a Cloudflare Dashboard**:
   ```
   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web
   ```

2. **Configurar Custom Domain**:
   - Click en **"Custom domains"** en el menú lateral
   - Click en **"Set up a custom domain"**
   - Ingresar: `autorentar.com`
   - Click en **"Continue"**
   - Agregar los registros DNS que Cloudflare te indique:
     - **Tipo CNAME**: `autorentar.com` → `autorenta-web.pages.dev`
     - O **Tipo A** según las instrucciones de Cloudflare

3. **Verificar SSL**:
   - Cloudflare automáticamente generará un certificado SSL
   - Esperar 2-5 minutos para que se active
   - Verificar que el dominio esté en estado "Active"

**Comando de verificación**:
```bash
curl -I https://autorentar.com
# Debe retornar HTTP/2 200
```

---

### Paso 2: Actualizar Supabase Secrets

Ejecutar estos comandos para actualizar `APP_BASE_URL`:

```bash
# Opción 1: Usando Supabase CLI (recomendado)
npx supabase secrets set APP_BASE_URL="https://autorentar.com" --project-ref obxvffplochgeiclibng

# Opción 2: Via Dashboard
# Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions
# Buscar "Function Secrets" → Editar APP_BASE_URL → Cambiar a: https://autorentar.com
```

**Verificar que se actualizó**:
```bash
npx supabase secrets list --project-ref obxvffplochgeiclibng | grep APP_BASE_URL
# Debe mostrar: APP_BASE_URL = https://autorentar.com
```

---

### Paso 3: Actualizar MercadoPago OAuth Redirect URIs

#### 3.1 En el Dashboard de MercadoPago

1. **Ir a tu aplicación de MercadoPago**:
   ```
   https://www.mercadopago.com.ar/developers/panel/app/4340262352975191
   ```

2. **Configurar Redirect URIs**:
   - Buscar sección: **"URLs de redirección"** o **"Redirect URIs"**
   - Agregar (o reemplazar):
     - ✅ **Producción**: `https://autorentar.com/auth/mercadopago/callback`
     - ✅ **Desarrollo**: `http://localhost:4200/auth/mercadopago/callback` (si aplica)

3. **Guardar cambios**

#### 3.2 En Supabase Secrets (Opcional pero Recomendado)

Si quieres usar el secret en lugar del default en código:

```bash
npx supabase secrets set MERCADOPAGO_OAUTH_REDIRECT_URI="https://autorentar.com/auth/mercadopago/callback" --project-ref obxvffplochgeiclibng

npx supabase secrets set MERCADOPAGO_OAUTH_REDIRECT_URI_DEV="http://localhost:4200/auth/mercadopago/callback" --project-ref obxvffplochgeiclibng
```

---

### Paso 4: Actualizar Cloudflare Pages Environment Variables

Si tienes variables de entorno en Cloudflare Pages que usan el dominio:

1. **Ir a Cloudflare Pages Settings**:
   ```
   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web/settings/environment-variables
   ```

2. **Actualizar variables que contengan URLs**:
   - Buscar: `NG_APP_URL`, `PRODUCTION_URL`, etc.
   - Cambiar a: `https://autorentar.com`

---

### Paso 5: Verificar Configuración

#### 5.1 Verificar Dominio Funciona

```bash
# Verificar que el dominio responde
curl -I https://autorentar.com
# Debe retornar: HTTP/2 200

# Verificar que la app carga
curl https://autorentar.com | grep -q "app-root" && echo "✅ App carga correctamente" || echo "❌ Error"
```

#### 5.2 Verificar MercadoPago OAuth

1. **Probar flujo de OAuth**:
   - Ir a: `https://autorentar.com/cars/publish` (o cualquier ruta que requiera OAuth)
   - Click en "Conectar MercadoPago"
   - Verificar que redirige a MercadoPago con el redirect_uri correcto
   - Después de autorizar, verificar que vuelve a `https://autorentar.com/auth/mercadopago/callback`

#### 5.3 Verificar Email Confirmations

Los emails de confirmación de reserva deben usar el nuevo dominio:

```bash
# Verificar en logs de send-booking-confirmation-email
# Los links deben apuntar a https://autorentar.com/...
```

---

## 📊 Checklist de Configuración

- [ ] Dominio configurado en Cloudflare Pages
- [ ] SSL activo (certificado generado)
- [ ] `APP_BASE_URL` actualizado en Supabase secrets
- [ ] MercadoPago redirect URIs actualizados en dashboard
- [ ] `MERCADOPAGO_OAUTH_REDIRECT_URI` actualizado en Supabase secrets (opcional)
- [ ] Variables de entorno en Cloudflare Pages actualizadas (si aplica)
- [ ] Dominio responde correctamente (`curl -I https://autorentar.com`)
- [ ] App carga correctamente en el navegador
- [ ] OAuth flow funciona con nuevo dominio
- [ ] Emails usan el nuevo dominio

---

## 🔍 Troubleshooting

### Problema: Dominio no responde

**Solución**:
1. Verificar DNS: `dig autorentar.com` o `nslookup autorentar.com`
2. Verificar que Cloudflare Pages muestra el dominio como "Active"
3. Esperar 5-10 minutos para propagación DNS

### Problema: SSL no funciona

**Solución**:
1. En Cloudflare Pages, verificar que el certificado SSL está "Active"
2. Si está "Pending", esperar 2-5 minutos
3. Verificar que el dominio apunta correctamente a Cloudflare

### Problema: OAuth redirect falla

**Solución**:
1. Verificar que el redirect URI en MercadoPago dashboard coincide exactamente: `https://autorentar.com/auth/mercadopago/callback`
2. Verificar que no hay espacios o caracteres extra
3. Verificar que el secret `MERCADOPAGO_OAUTH_REDIRECT_URI` está actualizado (si lo estás usando)

### Problema: Emails con URLs antiguas

**Solución**:
1. Verificar que `APP_BASE_URL` en Supabase secrets está actualizado
2. Redesplegar Edge Function `send-booking-confirmation-email` si es necesario:
   ```bash
   cd supabase/functions/send-booking-confirmation-email
   npx supabase functions deploy send-booking-confirmation-email --project-ref obxvffplochgeiclibng
   ```

---

## 📝 Notas Importantes

1. **Propagación DNS**: Puede tomar 5-10 minutos para que el dominio se propague globalmente
2. **SSL Certificate**: Cloudflare genera automáticamente el certificado SSL, puede tardar 2-5 minutos
3. **Cache**: Después de configurar, puede haber cache en el navegador. Usar modo incógnito para probar
4. **Backwards Compatibility**: El dominio `.pages.dev` seguirá funcionando como backup

---

## ✅ Una vez completado

Después de completar todos los pasos:

1. ✅ El dominio `autorentar.com` estará activo
2. ✅ SSL funcionará automáticamente
3. ✅ Todas las integraciones (MercadoPago, emails) usarán el nuevo dominio
4. ✅ El dominio `.pages.dev` seguirá funcionando como backup

**URL de Producción Final**: `https://autorentar.com`

---

**Última actualización**: 2025-11-05  
**Estado**: ⏳ Configuración en progreso

