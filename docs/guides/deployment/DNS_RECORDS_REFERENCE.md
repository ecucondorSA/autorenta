# 📋 Referencia de Registros DNS para autorentar.com

**Dominio**: `autorentar.com`  
**Proyecto**: `autorenta-web` (Cloudflare Pages)  
**Fecha**: 2025-11-05

---

## 🔄 Cambios Necesarios en DNS

### ❌ ELIMINAR (Registro Actual)

| Type | Name | Data | Acción |
|------|------|------|--------|
| **A** | `@` | `WebsiteBuilder Site` | **DELETE** - Ya no se necesita |

### ✅ AGREGAR/MANTENER (Registros Necesarios)

#### 1. Dominio Principal (Cloudflare Pages)

**Opción A: Si tu DNS soporta CNAME en apex** (Cloudflare DNS lo soporta):

| Type | Name | Data | TTL | Descripción |
|------|------|------|-----|-------------|
| **CNAME** | `@` | `autorenta-web.pages.dev` | 1 Hour | Apex domain → Cloudflare Pages |

**Opción B: Si tu DNS NO soporta CNAME en apex** (GoDaddy requiere registro A):

Primero, obtener las IPs de Cloudflare Pages:
```bash
# Cloudflare Pages te dará IPs específicas cuando agregues el custom domain
# Ejemplo de IPs (verificar en Cloudflare Pages dashboard):
# 192.0.2.1
# 192.0.2.2
```

Entonces agregar:
| Type | Name | Data | TTL | Descripción |
|------|------|------|-----|-------------|
| **A** | `@` | `[IP que Cloudflare te da]` | 1 Hour | Apex domain → Cloudflare Pages IP |

**Nota**: Cloudflare Pages te dará las IPs exactas cuando agregues el custom domain en el dashboard.

#### 2. Subdominio www

| Type | Name | Data | TTL | Descripción |
|------|------|------|-----|-------------|
| **CNAME** | `www` | `autorenta-web.pages.dev` | 1 Hour | www subdomain → Cloudflare Pages |

#### 3. Email (Mailgun) - MANTENER

| Type | Name | Data | TTL | Descripción |
|------|------|------|-----|-------------|
| **CNAME** | `email` | `mailgun.org` | 1 Hour | Email routing (Mailgun) |
| **MX** | `@` | `mxa.mailgun.org` (Priority: 60) | 1 Hour | Mailgun MX 1 |
| **MX** | `@` | `mxb.mailgun.org` (Priority: 60) | 1 Hour | Mailgun MX 2 |
| **TXT** | `@` | `v=spf1 include:mailgun.org ~all` | 1 Hour | SPF record para Mailgun |

#### 4. Nameservers (Si transfieres a Cloudflare)

| Type | Name | Data | Descripción |
|------|------|------|-------------|
| **NS** | `@` | `cora.ns.cloudflare.com` | Cloudflare nameserver 1 |
| **NS** | `@` | `david.ns.cloudflare.com` | Cloudflare nameserver 2 |

**Nota**: Los nameservers se configuran en GoDaddy Domain Manager, no en los registros DNS.

---

## 📝 Configuración Actual vs Recomendada

### Antes (Actual)

```
a       @       WebsiteBuilder Site     ❌ ELIMINAR
cname   www     autorentar.com          ⚠️ CAMBIAR (debe apuntar a Pages)
cname   email   mailgun.org             ✅ MANTENER
mx      @       mxa.mailgun.org         ✅ MANTENER
mx      @       mxb.mailgun.org         ✅ MANTENER
txt     @       v=spf1 include:...      ✅ MANTENER
ns      @       ns33.domaincontrol.com  ⚠️ CAMBIAR (si transfieres a Cloudflare)
ns      @       ns34.domaincontrol.com  ⚠️ CAMBIAR (si transfieres a Cloudflare)
```

### Después (Recomendado - Opción 1: Cloudflare DNS)

```
a       @       [IP de Cloudflare Pages]  ✅ AGREGAR (o CNAME si Cloudflare lo permite)
cname   www     autorenta-web.pages.dev   ✅ CAMBIAR
cname   email   mailgun.org                ✅ MANTENER
mx      @       mxa.mailgun.org            ✅ MANTENER
mx      @       mxb.mailgun.org            ✅ MANTENER
txt     @       v=spf1 include:...         ✅ MANTENER
ns      @       cora.ns.cloudflare.com     ✅ CAMBIAR (en GoDaddy Domain Manager)
ns      @       david.ns.cloudflare.com    ✅ CAMBIAR (en GoDaddy Domain Manager)
```

### Después (Opción 2: Mantener en GoDaddy)

```
a       @       [IP de Cloudflare Pages]  ✅ REEMPLAZAR (WebsiteBuilder → Pages IP)
cname   www     autorenta-web.pages.dev   ✅ CAMBIAR
cname   email   mailgun.org                ✅ MANTENER
mx      @       mxa.mailgun.org            ✅ MANTENER
mx      @       mxb.mailgun.org            ✅ MANTENER
txt     @       v=spf1 include:...         ✅ MANTENER
ns      @       ns33.domaincontrol.com     ✅ MANTENER (no cambiar)
ns      @       ns34.domaincontrol.com    ✅ MANTENER (no cambiar)
```

---

## 🎯 Pasos Específicos para GoDaddy

### Si usas Opción 1 (Transferir a Cloudflare)

1. **Obtener nameservers de Cloudflare**:
   - Agregar dominio en Cloudflare Dashboard
   - Copiar los 2 nameservers que Cloudflare te da

2. **Cambiar nameservers en GoDaddy**:
   - Ir a: https://dcc.godaddy.com/manage/autorentar.com/dns
   - Click en **"DNS"** → **"Nameservers"**
   - Click en **"Change"**
   - Seleccionar **"Custom"**
   - Ingresar los nameservers de Cloudflare
   - Guardar

3. **Configurar DNS en Cloudflare**:
   - Cloudflare copiará automáticamente tus registros actuales
   - Luego, agregar custom domain en Cloudflare Pages
   - Cloudflare configurará automáticamente los registros A/CNAME necesarios

### Si usas Opción 2 (Mantener en GoDaddy)

1. **Eliminar registro A actual**:
   - Ir a: https://dcc.godaddy.com/manage/autorentar.com/dns
   - Buscar el registro A con `@` → `WebsiteBuilder Site`
   - Click en **"Delete"**

2. **Agregar custom domain en Cloudflare Pages**:
   - Ir a: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web
   - Click en **"Custom domains"**
   - Click en **"Set up a custom domain"**
   - Ingresar: `autorentar.com`
   - Cloudflare te dirá exactamente qué registrar

3. **Agregar registro A en GoDaddy**:
   - En GoDaddy DNS, click en **"Add"**
   - **Type**: `A`
   - **Name**: `@` (o dejar vacío)
   - **Data**: La IP que Cloudflare te dio
   - **TTL**: `1 Hour`
   - Guardar

4. **Actualizar registro CNAME de www**:
   - Buscar el registro CNAME `www` → `autorentar.com`
   - Editarlo para que apunte a: `autorenta-web.pages.dev`
   - O eliminarlo y crear uno nuevo

---

## ⚠️ Notas Importantes

1. **Propagación DNS**: Los cambios pueden tardar 5-30 minutos en propagarse (hasta 24 horas en casos raros)

2. **CNAME en apex**: Algunos proveedores DNS (como GoDaddy) no permiten CNAME en el apex domain (`@`). En ese caso, debes usar un registro A con las IPs que Cloudflare te proporciona.

3. **Cloudflare Pages IPs**: Cuando agregas un custom domain en Cloudflare Pages, Cloudflare te dará las IPs exactas que debes usar. Estas IPs pueden cambiar, así que es mejor usar Cloudflare DNS (Opción 1) que maneja esto automáticamente.

4. **Email**: Los registros de email (Mailgun) deben mantenerse exactamente como están. No los cambies.

5. **SSL**: Cloudflare generará automáticamente un certificado SSL una vez que el DNS esté configurado correctamente. Tarda 2-5 minutos.

---

## ✅ Verificación

Después de configurar, verificar con:

```bash
# Verificar que el dominio responde
curl -I https://autorentar.com
# Debe retornar: HTTP/2 200

# Verificar DNS
dig autorentar.com
nslookup autorentar.com

# Verificar www
curl -I https://www.autorentar.com
# Debe retornar: HTTP/2 200
```

---

**Última actualización**: 2025-11-05







