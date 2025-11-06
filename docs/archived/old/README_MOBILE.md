# 📱 Autorenta Mobile App

App móvil nativa desarrollada con **Ionic** + **Capacitor** para iOS y Android.

## 🚀 Quick Start

```bash
# Opción 1: Usar el script interactivo
./mobile-quick-start.sh

# Opción 2: Comandos manuales
cd apps/web && npm start               # Web dev server
npx cap open android                   # Android Studio
npx cap open ios                       # Xcode (macOS)
```

## 📱 Estructura de la App

### Tab Bar Navigation (5 tabs)

```
🏠 Inicio     → Hero + búsqueda + autos destacados
🗺️ Explorar   → Mapa fullscreen con filtros
➕ Publicar   → Publicar tu auto
🚗 Viajes     → Mis reservas y viajes
👤 Perfil     → Perfil, wallet, configuración
```

## 🎨 Features

- ✅ Tab bar navigation nativa
- ✅ Mapbox GL integrado
- ✅ Geolocalización
- ✅ Pull-to-refresh
- ✅ Bottom sheet modals
- ✅ Dark mode automático
- ✅ Skeleton loaders
- ✅ PWA capabilities

## 🔌 Plugins Nativos

```typescript
✅ @capacitor/camera              // Fotos para autos
✅ @capacitor/geolocation        // GPS / Mapa
✅ @capacitor/push-notifications // Notificaciones
✅ @capacitor/haptics            // Feedback táctil
✅ @capacitor/share              // Compartir
✅ @capacitor/app                // Lifecycle
✅ @capacitor/status-bar         // Status bar
✅ @capacitor/splash-screen      // Splash
✅ @capacitor/network            // Conexión
✅ @capacitor/filesystem         // Storage
```

## 🛠️ Desarrollo

### Requisitos

- Node.js 18+
- Android Studio (para Android)
- Xcode (para iOS, solo macOS)

### Setup Inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Build web app
cd apps/web && npm run build

# 3. Sync Capacitor
npx cap sync

# 4. Agregar plataformas (si no existen)
npx cap add android
npx cap add ios  # Solo en macOS
```

### Desarrollo Web

```bash
cd apps/web
npm start
# Abrir: http://localhost:4200/tabs/home
```

### Desarrollo Android

```bash
# Opción 1: Android Studio
npx cap open android

# Opción 2: Command line
cd android
./gradlew installDebug
```

### Desarrollo iOS (macOS)

```bash
npx cap open ios
# Build & Run desde Xcode
```

## 🔄 Workflow de Desarrollo

### Después de cambios en el código:

```bash
# 1. Build web
cd apps/web && npm run build

# 2. Sync cambios
cd ../.. && npx cap sync

# 3. (Opcional) Solo copiar assets
npx cap copy
```

### Live Reload (Android/iOS)

```bash
# 1. Start web server
cd apps/web && npm start

# 2. En Android Studio/Xcode:
# - Cambiar server URL en capacitor.config.js
# - server.url: "http://YOUR_IP:4200"

# 3. Rebuild app nativa
```

## 📦 Build Release

### Android

```bash
# APK Debug
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/

# AAB Release (Play Store)
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/

# Signing: Configurar en android/app/build.gradle
```

### iOS (macOS)

```bash
# Xcode
npx cap open ios
# Product → Archive → Distribute App
```

## 🎨 Personalización

### Theme

Editar `apps/web/src/theme/variables.css`:

```css
:root {
  --ion-color-primary: #4f46e5;
  --ion-color-secondary: #7c3aed;
  /* ... más colores */
}
```

### Splash Screen & Icons

```bash
# 1. Crear assets en:
# - android/app/src/main/res/drawable/splash.png
# - android/app/src/main/res/mipmap-*/ic_launcher.png

# 2. iOS:
# - ios/App/App/Assets.xcassets/AppIcon.appiconset/
# - ios/App/App/Assets.xcassets/Splash.imageset/
```

## 📱 Testing

### En Dispositivo Real

```bash
# Android
adb devices  # Verificar dispositivo conectado
cd android && ./gradlew installDebug

# iOS (requiere Apple Developer Account)
# - Abrir Xcode
# - Seleccionar dispositivo
# - Run
```

### En Emulador

```bash
# Android
# - Android Studio → AVD Manager → Create/Start emulator
# - Run app desde Android Studio

# iOS
# - Xcode → Open Developer Tool → Simulator
# - Run app desde Xcode
```

## 🐛 Troubleshooting

### Build falla

```bash
# Limpiar y rebuild
cd apps/web
rm -rf dist node_modules
npm install
npm run build
cd ../..
npx cap sync
```

### Android Gradle errors

```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### iOS CocoaPods errors

```bash
cd ios/App
pod deintegrate
pod install
```

### Capacitor no encuentra web assets

```bash
# Verificar webDir en capacitor.config.js
# Debe apuntar a: apps/web/dist/web/browser
npx cap sync
```

## 📚 Documentación

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Ionic Docs](https://ionicframework.com/docs)
- [Android Docs](https://developer.android.com/)
- [iOS Docs](https://developer.apple.com/)

## 📂 Estructura de Archivos

```
autorenta/
├── capacitor.config.js          # Config Capacitor
├── ionic.config.json            # Config Ionic
├── android/                     # Proyecto Android nativo
├── ios/                         # Proyecto iOS nativo
├── apps/web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── tabs/           # Tab navigation
│   │   │   └── features/
│   │   │       ├── home/       # Home page
│   │   │       └── explore/    # Explore page
│   │   └── theme/              # Ionic theme
│   └── dist/                   # Build output
└── mobile-quick-start.sh       # Quick start script
```

## 🚀 Deployment

### Google Play Store

1. Generar AAB release
2. Crear app en Play Console
3. Upload AAB
4. Complete store listing
5. Submit for review

### Apple App Store

1. Archive desde Xcode
2. Upload to App Store Connect
3. Complete app information
4. Submit for review

## ⚡ Performance Tips

- Usar lazy loading para imágenes
- Implementar virtual scrolling
- Habilitar Service Worker (PWA)
- Optimizar bundle size
- Usar CDN para assets estáticos

## 🔐 Seguridad

- Nunca commitear API keys
- Usar environment variables
- Implementar certificate pinning
- Ofuscar código en release builds
- Habilitar ProGuard (Android)

## 📝 TODO

- [ ] Integrar @capacitor/camera en PublishCarV2Page
- [ ] Agregar @capacitor/haptics en acciones críticas
- [ ] Setup push notifications
- [ ] Implementar share functionality
- [ ] Optimizar performance en listas largas
- [ ] Agregar E2E tests con Appium/Detox
- [ ] Configurar CI/CD para builds automáticos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Copyright © 2025 Autorenta

---

**¿Preguntas?** Revisar `MOBILE_IMPLEMENTATION_COMPLETE.md` para más detalles.
