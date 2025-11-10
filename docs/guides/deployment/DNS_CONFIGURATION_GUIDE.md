# 🌐 Guía de Configuración DNS para autorentar.com

**Fecha**: 2025-11-05  
**Dominio**: `autorentar.com`  
**Proyecto**: `autorenta-web` (Cloudflare Pages)

---

## 📋 Situación Actual

Tu dominio está actualmente en **GoDaddy** (nameservers: `ns33.domaincontrol.com` y `ns34.domaincontrol.com`).

Para usar Cloudflare Pages con custom domain, tienes **2 opciones**:

---

## ✅ OPCIÓN 1: Transferir DNS a Cloudflare (Recomendado)

Esta es la opción más fácil y recomendada. Cloudflare gestionará todos los DNS automáticamente.

### Paso 1: Agregar Dominio en Cloudflare

1. **Ir a Cloudflare Dashboard**:
   ```
   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603
   ```

2. **Agregar sitio**:
   - Click en **"Add a Site"** o **"Websites"** → **"Add a Site"**
   - Ingresar: `autorentar.com`
   - Click en **"Add site"**

3. **Seleccionar plan**:
   - Elegir **Free plan** (suficiente para Pages)
   - Click en **"Continue"**

4. **Cloudflare escaneará tus DNS actuales**:
   - Verás todos tus registros actuales
   - Cloudflare los copiará automáticamente

5. **Revisar configuración DNS**:
   - Verificar que todos los registros están copiados:
     - ✅ Email (Mailgun): `email` CNAME → `mailgun.org`
     - ✅ MX records: `mxa.mailgun.org` y `mxb.mailgun.org`
     - ✅ TXT record: SPF para Mailgun
     - ⚠️ El registro A actual (`@` → WebsiteBuilder) lo cambiarás después

6. **Obtener Nameservers de Cloudflare**:
   - Cloudflare te dará 2 nameservers, ejemplo:
     - `cora.ns.cloudflare.com`
     - `david.ns.cloudflare.com`
   - **Copiar estos nameservers** (los necesitarás en GoDaddy)

### Paso 2: Actualizar Nameservers en GoDaddy

1. **Ir a GoDaddy Domain Manager**:
   ```
   https://dcc.godaddy.com/manage/autorentar.com/dns
   ```

2. **Cambiar Nameservers**:
   - Ir a **"DNS"** o **"Nameservers"**
   - Click en **"Change"** o **"Custom"**
   - Reemplazar los nameservers actuales con los de Cloudflare:
     ```
     ns33.domaincontrol.com  →  cora.ns.cloudflare.com
     ns34.domaincontrol.com  →  david.ns.cloudflare.com
     ```
   - **Guardar cambios**

3. **Esperar propagación**:
   - Tiempo: 5-30 minutos (puede tardar hasta 24 horas)
   - Verificar: `dig autorentar.com NS`
   - Debe mostrar los nameservers de Cloudflare

### Paso 3: Configurar Custom Domain en Cloudflare Pages

Una vez que el dominio esté en Cloudflare:

1. **Ir a Cloudflare Pages**:
   ```
   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web
   ```

2. **Agregar Custom Domain**:
   - Click en **"Custom domains"** en el menú lateral
   - Click en **"Set up a custom domain"**
   - Ingresar: `autorentar.com`
   - Click en **"Continue"**

3. **Cloudflare configurará DNS automáticamente**:
   - Cloudflare creará automáticamente:
     - **CNAME** `@` (apex) → `autorenta-web.pages.dev` (o IPs si es necesario)
     - **CNAME** `www` → `autorenta-web.pages.dev`
   - **No necesitas hacer nada manualmente**

4. **Esperar SSL**:
   - Cloudflare generará automáticamente un certificado SSL
   - Tiempo: 2-5 minutos
   - Estado cambiará a **"Active"** cuando esté listo

### Paso 4: Verificar Configuración

```bash
# Verificar que el dominio responde
curl -I https://autorentar.com
# Debe retornar: HTTP/2 200

# Verificar DNS
dig autorentar.com
# Debe mostrar los nameservers de Cloudflare

# Verificar que www también funciona
curl -I https://www.autorentar.com
# Debe retornar: HTTP/2 200
```

---

## ⚠️ OPCIÓN 2: Mantener DNS en GoDaddy (No Recomendado)

Si prefieres mantener el dominio en GoDaddy, necesitarás configurar los registros manualmente.

### Paso 1: Agregar Custom Domain en Cloudflare Pages

1. **Ir a Cloudflare Pages**:
   ```
   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web
   ```

2. **Agregar Custom Domain**:
   - Click en **"Custom domains"**
   - Click en **"Set up a custom domain"**
   - Ingresar: `autorentar.com`

3. **Cloudflare te dará instrucciones específicas**:
   - Puede pedir un **CNAME** o un **registro A**
   - **Copiar exactamente lo que Cloudflare te indique**

### Paso 2: Configurar DNS en GoDaddy

Según lo que Cloudflare te indique, agregar estos registros:

#### Si Cloudflare pide CNAME (apex):

En GoDaddy, agregar:
- **Type**: `CNAME`
- **Name**: `@` (o dejar vacío para apex)
- **Data**: El valor que Cloudflare te dio (ej: `autorenta-web.pages.dev` o similar)
- **TTL**: `1 Hour`

#### Si Cloudflare pide registro A:

En GoDaddy, agregar:
- **Type**: `A`
- **Name**: `@` (o dejar vacío)
- **Data**: La IP que Cloudflare te dio
- **TTL**: `1 Hour`

**Para www subdomain**:
- **Type**: `CNAME`
- **Name**: `www`
- **Data**: `autorenta-web.pages.dev` (o el valor que Cloudflare indique)
- **TTL**: `1 Hour`

### Paso 3: Eliminar Registro A Actual (WebsiteBuilder)

**IMPORTANTE**: Eliminar el registro A actual que apunta a WebsiteBuilder:
- **Type**: `A`
- **Name**: `@`
- **Data**: `WebsiteBuilder Site`
- **Delete**: Click en "Delete"

### Paso 4: Verificar

Esperar 5-10 minutos y verificar:
```bash
curl -I https://autorentar.com
```

---

## 📊 Configuración DNS Final Recomendada

Una vez que Cloudflare Pages esté configurado, tus registros DNS deberían verse así:

| Type | Name | Data | TTL | Purpose |
|------|------|------|-----|---------|
| **CNAME** | `@` | `autorenta-web.pages.dev` (o IP si Cloudflare indica) | 1 Hour | Apex domain → Cloudflare Pages |
| **CNAME** | `www` | `autorenta-web.pages.dev` | 1 Hour | www subdomain → Cloudflare Pages |
| **CNAME** | `email` | `mailgun.org` | 1 Hour | Email (Mailgun) |
| **MX** | `@` | `mxa.mailgun.org` (Priority: 60) | 1 Hour | Email (Mailgun) |
| **MX** | `@` | `mxb.mailgun.org` (Priority: 60) | 1 Hour | Email (Mailgun) |
| **TXT** | `@` | `v=spf1 include:mailgun.org ~all` | 1 Hour | SPF para Mailgun |
| **NS** | `@` | `cora.ns.cloudflare.com` | - | Nameserver (si usas Cloudflare DNS) |
| **NS** | `@` | `david.ns.cloudflare.com` | - | Nameserver (si usas Cloudflare DNS) |

**Nota**: Los registros NS, SOA y `_domainconnect` son automáticos y no se pueden editar.

---

## 🔍 Troubleshooting

### Problema: "Domain not found" o "DNS not configured"

**Solución**:
1. Verificar que agregaste el dominio en Cloudflare Pages
2. Esperar 5-10 minutos para propagación DNS
3. Verificar que los nameservers apuntan a Cloudflare (si usas Opción 1)
4. Verificar que los registros DNS están correctos (si usas Opción 2)

### Problema: SSL no funciona

**Solución**:
1. En Cloudflare Pages, verificar que el certificado SSL está "Active"
2. Si está "Pending", esperar 2-5 minutos
3. Verificar que el dominio apunta correctamente a Cloudflare
4. Limpiar cache del navegador y probar en modo incógnito

### Problema: Email no funciona (Mailgun)

**Solución**:
1. Verificar que los registros MX y CNAME de email están configurados
2. Verificar que el TXT SPF está presente
3. En Mailgun, verificar que el dominio está verificado
4. Esperar 24-48 horas para propagación completa de DNS de email

### Problema: www no funciona

**Solución**:
1. Agregar CNAME `www` → `autorenta-web.pages.dev` en DNS
2. En Cloudflare Pages, agregar también `www.autorentar.com` como custom domain
3. Esperar 5-10 minutos

---

## ✅ Checklist Final

- [ ] Dominio agregado en Cloudflare (si usas Opción 1)
- [ ] Nameservers actualizados en GoDaddy (si usas Opción 1)
- [ ] Custom domain configurado en Cloudflare Pages
- [ ] Registros DNS configurados correctamente
- [ ] Registro A antiguo (WebsiteBuilder) eliminado
- [ ] SSL certificado activo en Cloudflare Pages
- [ ] `https://autorentar.com` responde correctamente
- [ ] `https://www.autorentar.com` responde correctamente
- [ ] Email (Mailgun) sigue funcionando
- [ ] Verificado con `curl -I https://autorentar.com`

---

## 🚀 Próximos Pasos

Una vez que el dominio esté configurado:

1. **Actualizar Supabase Secrets**:
   ```bash
   npx supabase secrets set APP_BASE_URL="https://autorentar.com" --project-ref obxvffplochgeiclibng
   ```

2. **Actualizar MercadoPago OAuth Redirect URIs**:
   - Ir a: https://www.mercadopago.com.ar/developers/panel/app/[TU_APP_ID]
   - Agregar: `https://autorentar.com/auth/mercadopago/callback`

3. **Verificar que todo funciona**:
   - Probar login
   - Probar OAuth de MercadoPago
   - Probar flujo de reserva completo

---

**Última actualización**: 2025-11-05  
**Estado**: ⏳ Guía de configuración







