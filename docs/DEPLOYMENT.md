# 🚀 Guía Maestra de Despliegue e Infraestructura (Autorenta)

> **Documento Vivo de Operaciones (DevOps)**  
> Esta guía detalla exhaustivamente los procedimientos para construir, desplegar y mantener la plataforma Autorenta en sus entornos de producción, staging y desarrollo.

---

## 🌍 Topología de Ambientes

La plataforma opera en tres entornos aislados para garantizar la estabilidad.

| Entorno | URL / Acceso | Propósito | Rama Git | Infraestructura |
| :--- | :--- | :--- | :--- | :--- |
| **Producción** | `https://autorentar.com` | Usuarios finales reales. Datos vivos. | `main` | Cloudflare Pages + Supabase Prod |
| **Staging** | `https://autorenta-web.pages.dev` | Pruebas de integración pre-release. | `develop` | Cloudflare Pages (Preview) |
| **Local** | `http://localhost:4200` | Desarrollo diario de features. | `feature/*` | Servidor Angular + Docker/Supabase Local |

---

## 🛠️ Herramientas y Prerrequisitos

Para operar la infraestructura, el ingeniero debe disponer de:

### Core
*   **Node.js:** v20.x (LTS Iron).
*   **PNPM:** v10.22.0 (Gestor de paquetes estricto). Instalar: `npm i -g pnpm`.
*   **Git:** Control de versiones.

### Backend & Cloud
*   **Supabase CLI:** `brew install supabase/tap/supabase` (o vía npm).
*   **Wrangler (Cloudflare):** Para gestión de Workers/Pages (`pnpm i -g wrangler`).

### Móvil (Android)
*   **Java JDK:** v21 (Temurin recomendado).
*   **Android Studio:** Koala o superior.
*   **Android SDK:** API Level 34 (Android 14).

---

## 1. 🌐 Frontend (Web App)

El frontend es una SPA (Single Page Application) Angular + Ionic hospedada en **Cloudflare Pages**.

### Pipeline de Construcción (Build)

El comando `pnpm run build:web` ejecuta la compilación de producción.

**Configuración de Angular (`angular.json`):**
*   **Optimizaciones:** AOT (Ahead-of-Time), Minificación, Build Optimizer activados.
*   **Assets:** Copia `src/assets` y `src/manifest.webmanifest`.
*   **Service Worker:** Genera `ngsw-worker.js` para soporte PWA offline.

```bash
# Comando manual de build production
pnpm build:web
```

### Despliegue Automático (GitHub Actions)
El workflow `.github/workflows/build-and-deploy.yml` orquesta el despliegue.

1.  **Trigger:** Push a la rama `main`.
2.  **Build Job:**
    *   Instala dependencias con caché pnpm.
    *   Inyecta variables de entorno (ver sección Secrets).
    *   Genera artefactos en `dist/web/browser`.
    *   Sube sourcemaps a **Sentry** para debugging.
3.  **Deploy Job:**
    *   Utiliza `wrangler` para subir la carpeta `dist` a Cloudflare Pages.
    *   Proyecto: `autorentar`.

### Troubleshooting Frontend
*   **Error de Hydration/Zone.js:** Si la app no carga, verificar `polyfills.ts`.
*   **404 en Rutas:** Cloudflare requiere un archivo `_redirects` o configuración SPA. Angular genera `index.html` que debe servir para todas las rutas no estáticas.

---

## 2. 🗄️ Backend (Supabase)

La infraestructura backend es "Infrastructure as Code" (IaC).

### Base de Datos (PostgreSQL)
Las modificaciones de esquema se gestionan estrictamente mediante migraciones SQL.

*   **Ubicación:** `supabase/migrations/`
*   **Formato:** `<timestamp>_nombre_descriptivo.sql`

**Aplicar cambios a Producción:**
El CI/CD ejecuta `supabase db push` automáticamente. **Nunca** modificar el esquema manualmente desde el dashboard web en producción.

**Rollback de Base de Datos:**
Supabase no soporta "down migrations" automáticas.
1.  Crear migración de reversión: `supabase migration new revert_feature_x`.
2.  Escribir el SQL inverso (ej. `DROP TABLE`, `ALTER TABLE ... DROP COLUMN`).
3.  Hacer push a git.

### Edge Functions (Deno)
Lógica de servidor en `supabase/functions/`.

**Funciones Críticas:**
*   `mercadopago-webhook`: Procesa notificaciones de pago (IPN). **CRÍTICA.**
*   `mercadopago-create-booking-preference`: Genera checkouts.
*   `generate-booking-contract-pdf`: Crea el PDF legal del alquiler.
*   `send-whatsapp-otp`: Envía códigos de verificación.

**Despliegue Manual de Función:**
```bash
# Deploy de una sola función (útil para hotfixes)
supabase functions deploy nombre-funcion --project-ref <PROJECT_ID> --no-verify-jwt
```

**Gestión de Secretos de Funciones:**
Las funciones acceden a `Deno.env.get('KEY')`. Estos secretos se configuran en el Dashboard de Supabase > Settings > Edge Functions o vía CLI:

```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
```

---

## 3. 📱 Móvil (Android)

La app Android es un wrapper **Capacitor** de la web app.

### Configuración del Entorno
Archivo clave: `apps/web/android/app/build.gradle`.
*   **Application ID:** `com.autorentar.app`
*   **Version Code:** Entero incremental (ej. 1045).
*   **Version Name:** SemVer (ej. "1.5.2").

### Proceso de Build & Release

**1. Sincronización:**
Copia los assets web compilados al proyecto nativo.
```bash
pnpm build:web
pnpm --filter @autorenta/web exec cap sync android
```

**2. Compilación (Release):**
Genera el AAB/APK firmado.
```bash
cd apps/web/android
./gradlew bundleRelease  # Genera .aab para Play Store
./gradlew assembleRelease # Genera .apk para pruebas
```

**3. Firma (Keystore):**
El CI decodifica el Keystore desde `KEYSTORE_BASE64` (GitHub Secret).
Para firmar localmente, crear `keystore.properties` (no commitear):
```properties
storeFile=../my-release-key.jks
storePassword=password
keyAlias=my-key-alias
keyPassword=password
```

### Google Play Internal Track
El workflow `build-android.yml` sube automáticamente el APK al canal "Internal Testing" si se selecciona `upload_to_play_store: true`. Esto permite distribución inmediata a QAs registrados.

---

## 4. 🔐 Gestión de Secretos (Variables de Entorno)

La seguridad depende de la correcta configuración de estas variables.

### GitHub Actions Secrets (Repositorio)
Estas variables se inyectan en tiempo de compilación (Build time).

| Variable | Uso | Crítico |
| :--- | :--- | :--- |
| `NG_APP_SUPABASE_URL` | Endpoint API Supabase | Sí |
| `NG_APP_SUPABASE_ANON_KEY` | Llave pública cliente | Sí |
| `NG_APP_MERCADOPAGO_PUBLIC_KEY` | Inicializar SDK JS MP | Sí |
| `NG_APP_MAPBOX_ACCESS_TOKEN` | Mapas (Frontend) | Sí |
| `NG_APP_SENTRY_DSN` | Reporte de errores | No |
| `KEYSTORE_BASE64` | Firma de APK Android | Sí (Móvil) |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Subida a Play Store | Sí (Móvil) |

### Supabase Secrets (Backend)
Estas variables viven en el servidor (Edge Functions) y nunca se exponen al cliente.

| Variable | Uso |
| :--- | :--- |
| `MERCADOPAGO_ACCESS_TOKEN` | Cobros, Devoluciones, API MP |
| `MERCADOPAGO_WEBHOOK_SECRET` | Validar firma de webhooks MP |
| `SERVICE_ROLE_KEY` | Acceso admin a DB (bypass RLS) |
| `OPENAI_API_KEY` | Análisis de daños con IA |
| `WHATSAPP_API_TOKEN` | Envío de OTPs |

---

## 5. 🚨 Protocolos de Emergencia

### Rollback Web (Instantáneo)
Si se despliega una versión rota de la web:
1.  Entrar a **Cloudflare Pages Dashboard**.
2.  Ir a **Deployments**.
3.  Localizar el último despliegue "Success" conocido.
4.  Click en **Rollback**. Tiempo estimado: 30 segundos.

### Incidente de Pagos
Si MercadoPago falla o los webhooks no llegan:
1.  Verificar logs de `mercadopago-webhook` en Supabase.
2.  Si el error es de código, corregir y hacer `supabase functions deploy`.
3.  Si es infraestructura, activar "Modo Mantenimiento" (Feature Flag en DB).

### Hotfix Móvil
Las apps móviles no tienen rollback instantáneo.
1.  Corregir el bug en `main`.
2.  Incrementar `versionCode` en `build.gradle`.
3.  Ejecutar workflow `Build Android APK` con `upload_to_play_store: true`.
4.  Promover de Internal -> Production en Google Play Console (Revisión rápida).

---

## 6. ✅ Checklist de "Go Live"

Antes de fusionar un PR a `main`:

*   [ ] **Migraciones:** ¿Hay cambios de DB? ¿Son reversibles? ¿No bloquean la app actual?
*   [ ] **Variables:** ¿Se agregaron nuevas `NG_APP_`? ¿Están en GitHub Secrets?
*   [ ] **Edge Functions:** ¿Se actualizaron las funciones si hubo cambios en la lógica de negocio?
*   [ ] **Tests:** ¿Pasaron los tests E2E críticos (Booking Flow)?
*   [ ] **Móvil:** ¿Se probó la build en un dispositivo físico Android? (Especialmente permisos).

---

**© 2026 Autorenta DevOps Team**
