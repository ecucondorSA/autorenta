# 🚀 Resumen de Cambios DNS para autorentar.com

**Fecha**: 2025-11-05  
**Acción Requerida**: Configurar dominio para Cloudflare Pages

---

## 📊 Cambios Necesarios en tu Panel DNS

### ❌ ELIMINAR este registro:

```
Type: A
Name: @
Data: WebsiteBuilder Site
```

**Acción**: Click en "Delete" en este registro.

---

### ✅ CAMBIAR este registro:

```
ANTES:
Type: CNAME
Name: www
Data: autorentar.com

DESPUÉS:
Type: CNAME
Name: www
Data: autorenta-web.pages.dev
```

**Acción**: Editar el registro CNAME de `www` y cambiar el valor a `autorenta-web.pages.dev`

---

### ✅ AGREGAR este registro (después de configurar en Cloudflare Pages):

**Primero debes agregar el custom domain en Cloudflare Pages**, luego Cloudflare te dirá exactamente qué registrar.

**Opción A - Si Cloudflare te pide CNAME**:
```
Type: CNAME
Name: @ (o dejar vacío)
Data: [Valor que Cloudflare te da]
TTL: 1 Hour
```

**Opción B - Si Cloudflare te pide registro A** (más probable en GoDaddy):
```
Type: A
Name: @ (o dejar vacío)
Data: [IP que Cloudflare te da - ej: 192.0.2.1]
TTL: 1 Hour
```

**Nota**: Cloudflare Pages te dará las IPs exactas cuando agregues el custom domain en el dashboard.

---

### ✅ MANTENER estos registros (no cambiar):

```
✅ CNAME  email  →  mailgun.org
✅ MX     @      →  mxa.mailgun.org (Priority: 60)
✅ MX     @      →  mxb.mailgun.org (Priority: 60)
✅ TXT    @      →  v=spf1 include:mailgun.org ~all
✅ NS     @      →  ns33.domaincontrol.com (si mantienes en GoDaddy)
✅ NS     @      →  ns34.domaincontrol.com (si mantienes en GoDaddy)
```

---

## 🎯 Pasos a Seguir

### Paso 1: Agregar Custom Domain en Cloudflare Pages

1. Ir a: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web
2. Click en **"Custom domains"** en el menú lateral
3. Click en **"Set up a custom domain"**
4. Ingresar: `autorentar.com`
5. Click en **"Continue"**
6. **Cloudflare te mostrará exactamente qué registrar** (copiar estos valores)

### Paso 2: Hacer Cambios en tu Panel DNS (GoDaddy)

1. Ir a: https://dcc.godaddy.com/manage/autorentar.com/dns
2. **Eliminar** el registro A `@` → `WebsiteBuilder Site`
3. **Editar** el registro CNAME `www` → cambiar a `autorenta-web.pages.dev`
4. **Agregar** el registro que Cloudflare te indicó:
   - Si es CNAME: `@` → `[valor de Cloudflare]`
   - Si es A: `@` → `[IP de Cloudflare]`

### Paso 3: Esperar Propagación

- Tiempo: 5-30 minutos
- Verificar: `curl -I https://autorentar.com`
- Debe retornar: `HTTP/2 200`

### Paso 4: Verificar SSL

- Cloudflare generará automáticamente el certificado SSL
- Tiempo: 2-5 minutos
- Estado cambiará a "Active" en Cloudflare Pages

---

## 📋 Configuración Final Esperada

Después de los cambios, tu DNS debería verse así:

```
Type    Name    Data                          TTL
----    ----    ----                          ---
A       @       [IP de Cloudflare Pages]      1 Hour    ← NUEVO (reemplaza WebsiteBuilder)
CNAME   www     autorenta-web.pages.dev      1 Hour    ← CAMBIADO
CNAME   email   mailgun.org                  1 Hour    ← MANTENER
MX      @       mxa.mailgun.org (60)         1 Hour    ← MANTENER
MX      @       mxb.mailgun.org (60)         1 Hour    ← MANTENER
TXT     @       v=spf1 include:...           1 Hour    ← MANTENER
NS      @       ns33.domaincontrol.com       -        ← MANTENER (si no transfieres)
NS      @       ns34.domaincontrol.com       -        ← MANTENER (si no transfieres)
```

---

## 🔍 Verificación

Después de configurar, ejecutar:

```bash
# Verificar que el dominio responde
curl -I https://autorentar.com

# Debe retornar:
# HTTP/2 200
# server: cloudflare
# ...

# Verificar www
curl -I https://www.autorentar.com

# Debe retornar:
# HTTP/2 200
```

---

## ⚠️ Notas Importantes

1. **No elimines ningún registro** hasta que Cloudflare Pages te indique qué registrar
2. **Mantén todos los registros de email** (Mailgun) exactamente como están
3. **Cloudflare te dará valores específicos** cuando agregues el custom domain
4. **La propagación DNS puede tardar** 5-30 minutos (hasta 24 horas en casos raros)

---

## 📚 Documentación Completa

Para más detalles, ver:
- `docs/guides/deployment/DNS_CONFIGURATION_GUIDE.md` - Guía completa
- `docs/guides/deployment/DNS_RECORDS_REFERENCE.md` - Referencia de registros

---

**Última actualización**: 2025-11-05

