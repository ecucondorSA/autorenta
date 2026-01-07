# PROMPT PARA GEMINI - ENV_VARIABLES.md

## Objetivo
Documentar TODAS las variables de entorno necesarias para Autorenta.

## Instrucciones para Gemini

Busca EXHAUSTIVAMENTE todas las variables de entorno:

### Archivos a analizar:
1. `apps/web/src/environments/*.ts` - Environment files Angular
2. `supabase/functions/**/*.ts` - Deno.env.get() calls
3. `supabase/config.toml` - Config Supabase
4. `android/app/src/main/AndroidManifest.xml` - Config Android
5. `.github/workflows/*.yml` - CI/CD secrets
6. `capacitor.config.ts` - Config Capacitor
7. Buscar patron: `process.env`, `Deno.env`, `environment.`

### Secciones requeridas:

```markdown
# Environment Variables

## Frontend (Angular)

### environment.ts / environment.prod.ts

| Variable | Requerida | Descripcion | Ejemplo |
|----------|-----------|-------------|---------|
| supabaseUrl | Si | URL del proyecto Supabase | https://xxx.supabase.co |
| supabaseAnonKey | Si | Anon key de Supabase | eyJhbG... |
| mapboxToken | Si | Token de Mapbox GL | pk.eyJ... |
| mercadoPagoPublicKey | Si | Public key de MP | APP_USR-xxx |
| environment | Si | Nombre del ambiente | production |
[... TODAS las variables encontradas]

## Backend (Supabase Edge Functions)

### Secrets requeridos

| Variable | Requerida | Descripcion | Como obtener |
|----------|-----------|-------------|--------------|
| SUPABASE_URL | Auto | URL del proyecto | Automatico |
| SUPABASE_ANON_KEY | Auto | Anon key | Automatico |
| SUPABASE_SERVICE_ROLE_KEY | Auto | Service role | Automatico |
| MP_ACCESS_TOKEN | Si | Access token MercadoPago | Panel MP > Credenciales |
| MP_CLIENT_ID | Si | Client ID para OAuth | Panel MP > Credenciales |
| MP_CLIENT_SECRET | Si | Client Secret para OAuth | Panel MP > Credenciales |
| MP_WEBHOOK_SECRET | Si | Secret para validar webhooks | Panel MP > Webhooks |
| GOOGLE_CLIENT_ID | Si | Client ID Google OAuth | Google Cloud Console |
| GOOGLE_CLIENT_SECRET | Si | Client Secret Google | Google Cloud Console |
| GEMINI_API_KEY | Si | API Key de Google Gemini | Google AI Studio |
[... TODAS las variables de edge functions]

### Como configurar secrets
```bash
supabase secrets set MP_ACCESS_TOKEN=xxx
supabase secrets set MP_CLIENT_ID=xxx
# ... etc
```

### Listar secrets actuales
```bash
supabase secrets list
```

## Database (PostgreSQL)

### Variables de conexion
| Variable | Descripcion |
|----------|-------------|
| DATABASE_URL | Connection string completo |
| POSTGRES_HOST | Host del servidor |
| POSTGRES_PORT | Puerto (5432) |
| POSTGRES_DB | Nombre de la base |
| POSTGRES_USER | Usuario |
| POSTGRES_PASSWORD | Password |

## CI/CD (GitHub Actions)

### Secrets de GitHub
| Secret | Usado en | Descripcion |
|--------|----------|-------------|
| SUPABASE_ACCESS_TOKEN | deploy.yml | Token para CLI |
| SUPABASE_PROJECT_REF | deploy.yml | ID del proyecto |
[... todos los secrets de workflows]

## Mobile (Android/Capacitor)

### Variables de build
| Variable | Descripcion |
|----------|-------------|
| ANDROID_KEYSTORE_PASSWORD | Password del keystore |
| ANDROID_KEY_ALIAS | Alias de la key |
| ANDROID_KEY_PASSWORD | Password de la key |
[... variables de Android]

## Servicios Externos

### MercadoPago
- **Donde obtener**: https://www.mercadopago.com.ar/developers/panel/credentials
- **Ambiente test**: Usar credenciales de sandbox
- **Ambiente prod**: Usar credenciales de produccion

### Mapbox
- **Donde obtener**: https://account.mapbox.com/access-tokens/
- **Scopes necesarios**: [Lista]

### Google (OAuth + Gemini)
- **OAuth**: Google Cloud Console > APIs & Services > Credentials
- **Gemini**: Google AI Studio > Get API Key

### Firebase (Push Notifications)
- **Donde obtener**: Firebase Console > Project Settings
- **Archivo**: google-services.json (Android)

## Archivo .env.example

```env
# ===================
# SUPABASE
# ===================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ===================
# MERCADOPAGO
# ===================
MP_ACCESS_TOKEN=APP_USR-xxx
MP_CLIENT_ID=xxx
MP_CLIENT_SECRET=xxx
MP_WEBHOOK_SECRET=xxx
MP_PUBLIC_KEY=APP_USR-xxx

# ===================
# GOOGLE
# ===================
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GEMINI_API_KEY=xxx

# ===================
# MAPBOX
# ===================
MAPBOX_TOKEN=pk.xxx

# ===================
# OTROS
# ===================
[... todas las demas variables]
```

## Validacion

### Script para validar variables
[Si existe un script de validacion, documentarlo]

### Variables opcionales vs requeridas
[Lista clara de cuales son obligatorias]
```

### Formato de salida:
- TODAS las variables encontradas en el codigo
- Instrucciones claras de donde obtener cada una
- Archivo .env.example completo
- Maximo 400 lineas
