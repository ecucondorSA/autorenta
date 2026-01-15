# Verify Android Build - Play Store Verification

Esta Edge Function y script bash verifican tu build de Android antes de publicar en Play Store.

## 🎯 Propósito

Prevenir rechazos de Google Play validando:
- ✅ Target SDK Version (API 35+ requerido para 2025)
- ✅ Version Code válido
- ✅ Package Name correcto
- ✅ Políticas de privacidad publicadas
- ✅ Versión mayor que la actual en producción (API)

## 📦 Componentes

### 1. Edge Function: `verify-android-build`

**Endpoint**: `https://uvtujvwvulufwwmjhqek.supabase.co/functions/v1/verify-android-build`

**Request**:
```json
{
  "appInfo": {
    "packageName": "com.autorentar.app",
    "versionCode": 1,
    "versionName": "1.0",
    "targetSdkVersion": 35
  },
  "checkPlayStore": true
}
```

**Response**:
```json
{
  "success": true,
  "errors": [],
  "warnings": ["Upload AAB to verify signing configuration"],
  "checks": {
    "apiLevel": { "passed": true, "message": "✅ targetSdkVersion 35 meets 2025 requirement" },
    "versionCode": { "passed": true, "message": "✅ versionCode: 1" },
    "packageName": { "passed": true, "message": "✅ Package name is correct" },
    "signing": { "passed": true, "message": "⚠️  Signing verification requires AAB file upload" },
    "policies": { "passed": true, "message": "✅ Required policies..." }
  },
  "currentProduction": {
    "versionCode": 0,
    "versionName": "1.0",
    "status": "completed"
  }
}
```

### 2. Bash Script: `tools/mobile/verify-build.sh`

**Uso**:
```bash
./tools/mobile/verify-build.sh
```

Verifica localmente:
- Lee configuración de `android/app/build.gradle`
- Valida SDK levels
- Verifica URLs de políticas
- Opcionalmente llama a la API de Play Store

## 🔐 Configuración de Play Store API

### Paso 1: Crear Service Account en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea o selecciona un proyecto
3. Ve a **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
   - Name: `play-store-api`
   - Role: `Service Account User`
5. Click **Keys > Add Key > Create New Key**
6. Selecciona **JSON** y descarga

### Paso 2: Habilitar Google Play Developer API

1. Ve a **APIs & Services > Library**
2. Busca "Google Play Developer API"
3. Click **Enable**

### Paso 3: Vincular Service Account en Play Console

1. Ve a [Google Play Console](https://play.google.com/console/)
2. **Settings > Developer account > API access**
3. Click **Link** junto al proyecto de Google Cloud
4. Grant permissions:
   - View app information
   - View financial data (optional)
   - Manage production releases
   - Manage testing tracks

### Paso 4: Agregar Secrets a Supabase

```bash
# Extract email from service account JSON
SERVICE_ACCOUNT_EMAIL="play-store-api@your-project.iam.gserviceaccount.com"

# Extract private key (debe incluir -----BEGIN PRIVATE KEY----- y -----END PRIVATE KEY-----)
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"

# Set secrets in Supabase
supabase secrets set PLAY_STORE_SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_EMAIL"
supabase secrets set PLAY_STORE_PRIVATE_KEY="$PRIVATE_KEY"
```

## 🚀 Flujo de Trabajo

### Antes de Publicar

```bash
# 1. Verificar build localmente
./tools/mobile/verify-build.sh

# 2. Si pasa, construir AAB
cd android
./gradlew bundleRelease

# 3. Firmar AAB (si no está configurado en build.gradle)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ../keystore/autorentar-release.keystore \
  app/build/outputs/bundle/release/app-release.aab \
  autorentar-key

# 4. Subir a Play Console
# Ir a https://play.google.com/console
# Seleccionar app > Release > Internal testing
# Subir AAB
```

### Verificación Automática en CI/CD

Agregar a `.github/workflows/android-release.yml`:

```yaml
- name: Verify Build
  run: ./tools/mobile/verify-build.sh
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## 📋 Checklist Pre-Publicación

- [ ] `targetSdkVersion` >= 35
- [ ] `versionCode` > versión anterior
- [ ] Package name: `com.autorentar.app`
- [ ] Keystore de release configurado
- [ ] Privacy Policy accesible: https://autorentar.com/privacy
- [ ] Account Deletion accesible: https://autorentar.com/delete-account
- [ ] Terms of Service accesibles: https://autorentar.com/terminos
- [ ] App probada en dispositivo físico
- [ ] Sin crashes ni ANRs
- [ ] Permisos justificados en Play Console
- [ ] Screenshots y assets preparados

## 🐛 Troubleshooting

### Error: "Failed to get access token"

**Causa**: Private key mal formateado o service account inválido.

**Solución**:
1. Verifica que el private key incluya headers (`-----BEGIN PRIVATE KEY-----`)
2. Asegúrate de escapar `\n` en variables de entorno
3. Verifica que el service account email sea correcto

### Error: "403 Forbidden" en API

**Causa**: Service account no tiene permisos en Play Console.

**Solución**:
1. Ve a Play Console > Settings > API Access
2. Grant permissions al service account
3. Espera 5-10 minutos para propagación

### Advertencia: "Cannot verify URLs"

**Causa**: No hay conexión a internet o URLs no accesibles.

**Solución**:
- Verifica manualmente que las URLs funcionen
- Asegúrate que estén desplegadas en producción

## 📚 Referencias

- [Google Play Developer API](https://developers.google.com/android-publisher)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [Play Store Publishing Checklist](https://developer.android.com/distribute/best-practices/launch/launch-checklist)
- [Target API Level Requirements](https://support.google.com/googleplay/android-developer/answer/11926878)

## 🔄 Actualizaciones

**Enero 2026**: Requisito de API 35+ obligatorio  
**Septiembre 2026**: Verificación de desarrollador obligatoria
