# 🚀 Guía: Cómo Evitar Rechazos en Google Play Store

## ⚠️ Problema Común: "Broken Functionality"

Google rechaza apps que:
- No instalan correctamente
- Crashean al abrir
- No responden (ANR - Application Not Responding)
- No cumplen con políticas de API Level

## ✅ Solución: Verificación Automática Pre-Publicación

Hemos creado herramientas para validar tu build **ANTES** de subirlo a Play Store.

---

## 🛠️ Herramientas Disponibles

### 1. Script Bash Local: `verify-build.sh`

**Ubicación**: `tools/mobile/verify-build.sh`

**Qué verifica**:
- ✅ Target SDK >= 35 (requerido 2025)
- ✅ Version Code válido
- ✅ Package Name correcto
- ✅ Keystore de release existe
- ✅ URLs de políticas accesibles

**Uso**:
```bash
./tools/mobile/verify-build.sh
```

**Output ejemplo**:
```
╔════════════════════════════════════════════════════╗
║  📱 AutoRenta - Android Build Verifier           ║
╚════════════════════════════════════════════════════╝

📦 Build Information:
  Package Name:    com.autorentar.app
  Version Code:    1
  Version Name:    1.0
  Target SDK:      35

🔍 Running Local Verification...
  [1/5] Target SDK Version (API 35+)... ✅ PASS
  [2/5] Version Code validity... ✅ PASS
  [3/5] Package Name... ✅ PASS
  [4/5] Release Keystore... ✅ PASS
  [5/5] Policy URLs... ✅ PASS

✅ BUILD VERIFICATION PASSED
   Ready to publish to Google Play Store!
```

### 2. Edge Function: `verify-android-build`

**Ubicación**: `supabase/functions/verify-android-build/`

**Qué hace**:
- Verifica localmente (igual que script bash)
- **OPCIONALMENTE**: Consulta Google Play Developer API
  - Compara con versión actual en producción
  - Verifica que nuevo versionCode sea mayor
  - Obtiene estado de revisión

**Endpoint**:
```
POST https://uvtujvwvulufwwmjhqek.supabase.co/functions/v1/verify-android-build
```

**Request**:
```json
{
  "appInfo": {
    "packageName": "com.autorentar.app",
    "versionCode": 2,
    "versionName": "1.0.1",
    "targetSdkVersion": 35
  },
  "checkPlayStore": true
}
```

**Response exitosa**:
```json
{
  "success": true,
  "errors": [],
  "warnings": [],
  "checks": {
    "apiLevel": { "passed": true, "message": "✅ targetSdkVersion 35 meets requirement" },
    "versionCode": { "passed": true, "message": "✅ versionCode: 2" },
    "packageName": { "passed": true, "message": "✅ Package name correct" },
    "signing": { "passed": true, "message": "⚠️  Requires AAB upload" },
    "policies": { "passed": true, "message": "✅ All policies OK" }
  },
  "currentProduction": {
    "versionCode": 1,
    "versionName": "1.0",
    "status": "completed"
  }
}
```

**Response con errores**:
```json
{
  "success": false,
  "errors": [
    "Target SDK version must be 35 or higher. Current: 33",
    "New versionCode (1) must be higher than production (1)"
  ],
  "warnings": [],
  "checks": { ... }
}
```

---

## 🔐 Setup: Google Play Developer API (Opcional pero Recomendado)

Para habilitar la verificación contra Play Store API:

### Paso 1: Crear Service Account

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea/selecciona proyecto
3. **IAM & Admin > Service Accounts > Create Service Account**
   - Name: `autorentar-play-api`
   - Role: Service Account User
4. **Keys > Add Key > JSON** → Descarga el archivo

### Paso 2: Habilitar API

1. **APIs & Services > Library**
2. Busca "Google Play Android Developer API"
3. Click **Enable**

### Paso 3: Vincular en Play Console

1. Ve a [Play Console](https://play.google.com/console/)
2. **Settings > Developer account > API access**
3. Click **Link** junto a tu proyecto Google Cloud
4. Grant permissions al service account:
   - ✅ View app information
   - ✅ Manage production releases
   - ✅ Manage testing tracks

### Paso 4: Agregar Secrets a Supabase

```bash
# Del archivo JSON descargado, extrae:
SERVICE_EMAIL="autorentar-play-api@your-project.iam.gserviceaccount.com"
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----\n"

# Configurar en Supabase
supabase secrets set PLAY_STORE_SERVICE_ACCOUNT_EMAIL="$SERVICE_EMAIL"
supabase secrets set PLAY_STORE_PRIVATE_KEY="$PRIVATE_KEY"

# Desplegar función
supabase functions deploy verify-android-build
```

---

## 📋 Workflow Completo: Del Build a Play Store

### 1. Pre-Build: Incrementar Versión

```bash
# Editar android/app/build.gradle
versionCode 2        # Incrementar en 1
versionName "1.0.1"  # Actualizar versión
```

### 2. Verificar Build Localmente

```bash
./tools/mobile/verify-build.sh
```

Si falla, corregir errores antes de continuar.

### 3. Construir Release AAB

```bash
cd apps/web
pnpm run build               # Build web app
npx cap sync android         # Sync to Capacitor

cd android
./gradlew bundleRelease      # Build AAB
```

**Output**: `app/build/outputs/bundle/release/app-release.aab`

### 4. Verificar AAB (Manual)

```bash
# Instalar bundletool
wget https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all-1.15.6.jar -O bundletool.jar

# Generar APKs de prueba
java -jar bundletool.jar build-apks \
  --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=app-debug.apks \
  --mode=universal

# Instalar en dispositivo
java -jar bundletool.jar install-apks --apks=app-debug.apks
```

**Probar**:
- ✅ App instala correctamente
- ✅ App abre sin crash
- ✅ Funciones principales operan
- ✅ No hay ANRs (freezes)

### 5. Subir a Play Console

1. Ve a [Play Console](https://play.google.com/console/)
2. Selecciona "AutoRenta"
3. **Release > Internal testing** (primera vez)
4. **Create new release**
5. **Upload** → Selecciona `app-release.aab`
6. Completa Release notes
7. **Review release** → **Start rollout to Internal testing**

### 6. Monitoreo Post-Upload

**Pre-launch report** (automático):
- Google prueba en ~20 dispositivos
- Reporta crashes, ANRs, issues de seguridad
- Disponible en 1-2 horas

**Revisar**:
- Android vitals
- Crash reports
- Pre-launch test results

---

## 🚨 Errores Comunes y Soluciones

### ❌ "Target API level is too low"

**Causa**: targetSdkVersion < 35

**Solución**:
```gradle
// android/variables.gradle
targetSdkVersion = 35
```

### ❌ "Version code already used"

**Causa**: Subiste un AAB con versionCode duplicado

**Solución**:
```gradle
// android/app/build.gradle
versionCode 2  // Incrementar
```

### ❌ "Missing privacy policy"

**Causa**: URL de privacy policy no configurada en Play Console

**Solución**:
1. Play Console > App content > Privacy policy
2. Agregar: `https://autorentar.com/privacy`

### ❌ "App crashes on startup"

**Causa**: Configuración de environment variables incorrecta

**Solución**:
```bash
# Verificar apps/web/.env
NG_APP_SUPABASE_URL=https://uvtujvwvulufwwmjhqek.supabase.co
NG_APP_SUPABASE_ANON_KEY=eyJ... (no puede estar vacío)
NG_APP_MAPBOX_TOKEN=pk.eyJ... (si usas mapas)
```

### ❌ "ANR (Application Not Responding)"

**Causa**: Operación pesada en UI thread

**Solución**:
- Usar Web Workers para procesos pesados
- Lazy load de módulos
- Optimizar queries a Supabase (agregar índices)

---

## 📊 Checklist Pre-Publicación

**Configuración**:
- [ ] `targetSdkVersion = 35`
- [ ] `versionCode` > versión anterior
- [ ] `packageName = "com.autorentar.app"`
- [ ] Keystore configurado

**Políticas**:
- [ ] Privacy Policy: https://autorentar.com/privacy
- [ ] Account Deletion: https://autorentar.com/delete-account
- [ ] Terms: https://autorentar.com/terminos
- [ ] Data Safety form completado en Play Console

**Calidad**:
- [ ] Probado en dispositivo físico (no solo emulador)
- [ ] Sin crashes en inicio
- [ ] Sin ANRs
- [ ] Tiempo de carga < 3 segundos
- [ ] Todas las funciones principales operan

**Assets**:
- [ ] App Icon 512x512 px
- [ ] Feature Graphic 1024x500 px
- [ ] Mínimo 4 screenshots

**Verificación**:
- [ ] `./tools/mobile/verify-build.sh` pasa ✅
- [ ] AAB instalado manualmente y probado

---

## 📖 Referencias

- [Script de verificación](../tools/mobile/verify-build.sh)
- [Edge Function](../supabase/functions/verify-android-build/)
- [Plan de publicación completo](../PLAYSTORE_PUBLISH_PLAN.md)
- [Google Play Policies](https://play.google.com/console/about/guides/releasewithconfidence/)

---

## 🆘 Soporte

Si encuentras errores o necesitas ayuda:
1. Revisa logs: `adb logcat | grep AutoRenta`
2. Consulta Pre-launch Report en Play Console
3. Ejecuta `./tools/mobile/verify-build.sh` para diagnóstico
