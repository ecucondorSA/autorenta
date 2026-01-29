# 📸 Guía de Configuración de Instagram API

Pasos detallados para conectar tu Instagram Business Account a AutoRenta.

## ⏱️ Tiempo: 5-10 minutos

---

## PASO 1: Acceder a Meta Developers

```
1. Abre: https://developers.facebook.com/
2. Login con tu cuenta de Meta (Facebook)
3. Ve a: My Apps → Selecciona "AutoRenta" app
```

**Si no ves la app "AutoRenta":**
- Crea una nueva app (tipo: Business)
- Nombre: "AutoRenta Marketing"
- Categoría: "E-commerce & Shopping"

---

## PASO 2: Configurar Instagram Graph API

```
En tu app de Meta:

1. Haz clic en "+ Add Product"
2. Busca "Instagram Graph API"
3. Haz clic en "Set Up"
4. Elige "Permissions"
5. Selecciona permisos necesarios:
   ✅ instagram_basic
   ✅ instagram_content_publishing
   ✅ pages_manage_metadata
   ✅ pages_read_engagement
```

---

## PASO 3: Obtener Business Account ID

```
Ubicación: Instagram Basic Display

Dentro de tu app:
Settings → Instagram Basic Display

Busca "App Roles" o "Test Users"
Haz clic en tu nombre de usuario

Verás un número como: 17841402937654321

🎯 COPIAR ESTE NÚMERO (Business Account ID)
```

**Alternativa:** Si no aparece, ve a:
- Instagram → Settings → Business → Business Account ID

---

## PASO 4: Generar Access Token

Hay 2 formas:

### Opción A: Access Token Permanente (Recomendado)

```
1. Ve a: Settings → Instagram Graph API → Tools
2. Haz clic en "Get Access Token"
3. Elige tu Instagram Business Account
4. Selecciona permisos:
   ✅ instagram_basic
   ✅ instagram_content_publishing
5. Haz clic en "Generate Token"

🎯 COPIAR ESTE TOKEN (empezará con IGQVJYd...)
```

### Opción B: Access Token desde Access Token Debugger

```
1. Ve a: https://developers.facebook.com/tools/accesstoken/
2. En "Get Access Tokens", selecciona tu app
3. Haz clic en el token largo que aparece
4. Cópialo
```

⚠️ **Importante:** El token expira en 60 días

---

## PASO 5: Obtener Page ID

```
Para publicar en Instagram, necesitas el ID de tu página de Facebook.

1. Ve a: https://www.facebook.com/
2. Abre tu página de negocio
3. Ve a Settings → Page Info
4. Busca "Page ID" (número como 123456789012345)

O:
1. Abre DevTools (F12)
2. En la consola escribe:
   console.log(window.top.location.href)
3. El URL contendrá el Page ID

🎯 COPIAR ESTE NÚMERO (Page ID)
```

---

## PASO 6: Ejecutar Script de Setup

Abre terminal en la carpeta del proyecto:

```bash
# Navega al directorio
cd /home/edu/autorentar

# Copia el .env.local si no existe
cp .env.local.example .env.local

# Agrega estas líneas a .env.local:
# SUPABASE_URL=tu_url
# SUPABASE_SERVICE_ROLE_KEY=tu_key

# Ejecuta el setup interactivo
bun scripts/setup-instagram-credentials.ts
```

**El script te pedirá 3 cosas:**
1. ✏️ Instagram Business Account ID (el número de ~20 dígitos)
2. ✏️ Access Token (el token largo que empieza con IGQVJYd...)
3. ✏️ Page ID (el número de ID de tu página)

---

## PASO 7: Verificación

Si todo está bien, verás:

```
✅ Token válido para cuenta: @tu_instagram_business
✅ Acceso a media verificado
✅ Credenciales guardadas correctamente
✅ Publicación de prueba exitosa
```

---

## ✅ ¡Hecho!

Instagram está configurado. Ahora puedes:

```bash
# Trigger una campaña en Instagram
gh workflow run campaign-renter-acquisition.yml \
  -f template=free_credit_300 \
  -f platform=instagram \
  -f dry_run=false
```

---

## ⚠️ Troubleshooting

### "Error: Token inválido"
- Verifica que copiaste el token completo
- Asegúrate de que no tiene espacios al inicio/final
- Regenera el token en Meta Dashboard

### "Error: No puedo acceder a media"
- Verifica que tu app tiene los permisos correctos
- Ve a Settings → Instagram Graph API → Permissions
- Agrega `instagram_content_publishing`

### "Error: Tabla 'social_media_credentials' no encontrada"
```bash
# Ejecuta migraciones
cd /home/edu/autorentar
supabase db push
```

### "La publicación falla con imagen placeholder"
- La imagen placeholder puede no ser válida para Instagram
- Usa una imagen real en tu primera publicación
- Instagram requiere al menos 600x600px

---

## 🔄 Renovar Token (cada 60 días)

El token de acceso expira cada 60 días. Para renovar:

```bash
# 1. Ve a Meta Dashboard y regenera el token
# https://developers.facebook.com/apps/autorentar/instagram-basic-display

# 2. Ejecuta el setup script nuevamente
bun scripts/setup-instagram-credentials.ts

# 3. Ingresa el nuevo token cuando se pida
```

---

## 🔐 Seguridad

**NUNCA:**
- ❌ Comparte tu Access Token públicamente
- ❌ Lo commitees a GitHub
- ❌ Lo envíes por email sin encriptar

**SIEMPRE:**
- ✅ Guárdalo en un password manager
- ✅ Usa Supabase para almacenarlo (encriptado)
- ✅ Revoca el token si se compromete

---

## 📖 Documentación Completa

- 📘 [Marketing Campaigns Guide](./MARKETING_CAMPAIGNS_GUIDE.md)
- 🔗 [Meta Graph API Docs](https://developers.facebook.com/docs/instagram-api)
- 🔗 [Instagram Business Account Setup](https://help.instagram.com/1986234648360433)

---

**¿Necesitas ayuda?**
- Lee `/home/edu/autorentar/docs/MARKETING_CAMPAIGNS_GUIDE.md`
- Revisa los logs: `gh run view --log <run-id>`
- Consulta Meta Developer Docs

