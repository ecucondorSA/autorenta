# 🎵 TikTok OAuth Setup Guide

Guía completa para configurar autenticación con TikTok en AutoRenta.

## 📋 Requisitos Previos

- Cuenta de TikTok Developer
- Aplicación registrada en TikTok Developer Portal
- Credentials: Client ID y Client Secret

---

## 🚀 Paso 1: Registrar Aplicación en TikTok Developer

1. Ir a [TikTok Developer Portal](https://developer.tiktok.com/apps)
2. Click en **Create an app**
3. Seleccionar **Web app** como tipo
4. Llenar detalles:
   - **App Name**: AutoRenta
   - **App Category**: Lifestyle
   - **Use Case**: User Authentication

5. Aceptar términos y crear app
6. Copiar:
   - **Client Key** (usaremos como `TIKTOK_CLIENT_ID`)
   - **Client Secret** (usaremos como `TIKTOK_CLIENT_SECRET`)

---

## 🔐 Paso 2: Configurar Redirect URI

En TikTok Developer Portal:

1. Ir a **Application** → **Basic Information**
2. Scroll hasta **Redirect URIs**
3. Click **Add URI**
4. Agregar:
   - **Development**: `http://localhost:4200/auth/callback`
   - **Production**: `https://autorentar.com/auth/callback`

5. Click **Save**

---

## 🛠️ Paso 3: Configurar Environment Variables

### Desarrollo Local (`.env.local`)

```bash
NG_APP_TIKTOK_CLIENT_ID=<tu-tiktok-client-key>
```

### Producción (Cloudflare Pages)

```bash
# En Cloudflare Pages Settings → Environment Variables
NG_APP_TIKTOK_CLIENT_ID=<tu-tiktok-client-key>
```

### Supabase Edge Function Secrets

```bash
# Ejecutar en tu proyecto Supabase
supabase secrets set TIKTOK_CLIENT_ID=<tu-tiktok-client-key>
supabase secrets set TIKTOK_CLIENT_SECRET=<tu-tiktok-client-secret>
```

---

## 📊 Paso 4: Desplegar Migraciones

```bash
# Aplicar migración a BD local
supabase db reset

# Aplicar a producción
supabase db push --linked
```

La migración agregará campos `provider` y `provider_id` a la tabla `profiles`.

---

## 📦 Paso 5: Desplegar Edge Function

```bash
# Deploy tiktok-oauth-callback
supabase functions deploy tiktok-oauth-callback

# Verificar que se desplegó
supabase functions list | grep tiktok
```

---

## 🧪 Paso 6: Testear Localmente

### 1. Iniciar dev server
```bash
npm run dev
```

### 2. Ir a página de login
```
http://localhost:4200/auth/login
```

### 3. Click en botón "TikTok" (si está disponible)

### 4. Autenticarse con TikTok

### 5. Verificar en console del navegador:
```javascript
// Debería mostrar sesión activa
window.localStorage.getItem('sb-pisqjmoklivzpwufhscx-auth-token')
```

---

## 🔍 Troubleshooting

### Error: "TikTok Client ID no configurado"
**Causa**: Variable de entorno no configurada
**Solución**:
```bash
# Verificar .env.local tiene NG_APP_TIKTOK_CLIENT_ID
cat .env.local | grep TIKTOK

# Si no está, agregarlo
echo "NG_APP_TIKTOK_CLIENT_ID=<tu-client-id>" >> .env.local
```

### Error: "OAuth state no encontrado"
**Causa**: sessionStorage fue limpiado entre login y callback
**Solución**: Usar misma pestaña del navegador (no abrir callback en pestaña nueva)

### Error: "Failed to exchange authorization code"
**Causas posibles**:
1. Client Secret incorrecto en Edge Function
2. Código expirado (durabilidad limitada)
3. Redirect URI no coincide

**Solución**:
1. Verificar `TIKTOK_CLIENT_SECRET` en Supabase
2. Verificar redirect URI en TikTok Developer Portal
3. Ver logs en Supabase Dashboard → Edge Functions

### Error: "Failed to fetch user info from TikTok"
**Causa**: Access token inválido o expirado
**Solución**: Verificar que el token obtenido es válido
```bash
# Ver logs del Edge Function
supabase functions logs tiktok-oauth-callback
```

---

## 📝 Flujo Completo (Diagramado)

```
1. Usuario hace click en "TikTok Login"
   ↓
2. Auth Service genera state aleatorio (CSRF protection)
   ↓
3. Redirigir a TikTok OAuth Authorize
   ↓
4. Usuario autentica con TikTok
   ↓
5. TikTok redirige a /auth/callback con código
   ↓
6. Auth Callback Component detecta código
   ↓
7. Llamar Edge Function tiktok-oauth-callback
   ↓
8. Edge Function intercambia código por access token
   ↓
9. Edge Function obtiene user info de TikTok API
   ↓
10. Edge Function crea/actualiza usuario en Supabase
   ↓
11. Edge Function crea sesión de Supabase
   ↓
12. Frontend recibe sesión y autentica usuario
   ↓
13. Redirigir a dashboard
```

---

## 🔗 Recursos

| Recurso | URL |
|---------|-----|
| TikTok Developer Docs | https://developers.tiktok.com/doc/login-kit-web |
| TikTok API Reference | https://developers.tiktok.com/doc/login-kit-api-reference |
| OAuth 2.0 Flow | https://developers.tiktok.com/doc/login-kit-web#oauth-flow |

---

## ✅ Checklist

- [ ] Registrar app en TikTok Developer Portal
- [ ] Copiar Client ID y Client Secret
- [ ] Agregar Redirect URIs (dev + prod)
- [ ] Configurar NG_APP_TIKTOK_CLIENT_ID en .env.local
- [ ] Configurar TIKTOK_CLIENT_ID y TIKTOK_CLIENT_SECRET en Supabase secrets
- [ ] Ejecutar `supabase db reset` para migración
- [ ] Desplegar `tiktok-oauth-callback` Edge Function
- [ ] Testear login localmente
- [ ] Testear en producción (después de merge)

---

## 🎯 Próximos Pasos

Después de TikTok OAuth, puedes:

1. **Integración de TikTok Shop** (si aplica)
   - Sincronizar productos desde TikTok
   - Crear listados automáticos

2. **TikTok Pixel Tracking** (ya implementado)
   - Track eventos de usuario
   - Mejorar targeting de ads

3. **TikTok API v2** (futuro)
   - Acceso a analytics
   - Gestión de contenido

---

**Última actualización**: 2025-11-20
**Versión**: 1.0 (TikTok OAuth v2)
**Estado**: Ready for Implementation
