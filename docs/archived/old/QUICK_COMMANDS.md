# 🚀 COMANDOS RÁPIDOS - AUTORENTA MOBILE

## 📱 Abrir Android Studio

```bash
cd /home/edu/autorenta
./open-android.sh
```

O manualmente:
```bash
CAPACITOR_ANDROID_STUDIO_PATH="/snap/android-studio/209/bin/studio.sh" npx cap open android
```

---

## 🌐 Probar en Web Browser

```bash
cd /home/edu/autorenta/apps/web
npm start
```

Abrir en navegador: http://localhost:4200/tabs/home

**Para vista móvil en Chrome:**
- Presiona `F12`
- Click en ícono móvil (o `Ctrl+Shift+M`)
- Selecciona dispositivo: iPhone 12 Pro, Pixel 5, etc.

---

## 🔄 Después de Hacer Cambios

```bash
# 1. Build web app
cd /home/edu/autorenta/apps/web
npm run build

# 2. Sync con Capacitor
cd /home/edu/autorenta
npx cap sync

# 3. Rebuild en Android Studio
# Click en Run (▶) o Shift+F10
```

---

## 🔨 Build APK desde Terminal

```bash
cd /home/edu/autorenta/android
./gradlew assembleDebug
```

APK generado en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Instalar en dispositivo:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 🐛 Solución de Problemas

### Gradle sync falla
```bash
cd /home/edu/autorenta/android
./gradlew clean
./gradlew build
```

### Limpiar todo y rebuild
```bash
cd /home/edu/autorenta/apps/web
rm -rf dist node_modules
npm install
npm run build
cd ../..
npx cap sync
```

### Ver logs de Android
```bash
adb logcat | grep -i capacitor
```

### Listar dispositivos conectados
```bash
adb devices
```

---

## 📊 Ver Estado del Proyecto

```bash
cd /home/edu/autorenta
npx cap ls  # Lista plugins instalados
```

---

## 📚 Ver Documentación

```bash
# Índice principal
cat /home/edu/autorenta/MOBILE_DOCS_INDEX.md

# Guía completa
cat /home/edu/autorenta/README_MOBILE.md

# Resumen visual
cat /home/edu/autorenta/MOBILE_SUCCESS_SUMMARY.txt
```

---

## 🎯 Rutas de la App

- **Home:** http://localhost:4200/tabs/home
- **Explorar:** http://localhost:4200/tabs/explore
- **Publicar:** http://localhost:4200/tabs/publish
- **Viajes:** http://localhost:4200/tabs/bookings
- **Perfil:** http://localhost:4200/tabs/profile

---

## ⚡ Script Interactivo

```bash
cd /home/edu/autorenta
./mobile-quick-start.sh
```

Opciones:
1. Start web dev server
2. Open Android Studio
3. Build APK debug
4. Sync Capacitor
5. Full rebuild
6. Show status

---

## 🔑 Variables de Entorno

Si necesitas configurar permanentemente:

```bash
echo 'export CAPACITOR_ANDROID_STUDIO_PATH="/snap/android-studio/209/bin/studio.sh"' >> ~/.bashrc
source ~/.bashrc
```

---

## 📦 Estructura de Archivos Clave

```
/home/edu/autorenta/
├── capacitor.config.js          # Config Capacitor
├── ionic.config.json            # Config Ionic
├── android/                     # Proyecto Android
├── apps/web/
│   ├── src/app/
│   │   ├── tabs/               # Tab navigation
│   │   └── features/
│   │       ├── home/           # Home page
│   │       └── explore/        # Explore page
│   └── dist/                   # Build output
├── open-android.sh             # Script para Android Studio
├── mobile-quick-start.sh       # Script interactivo
└── MOBILE_DOCS_INDEX.md        # Documentación completa
```

---

## ✅ Checklist Primera Vez

- [x] Ionic/Capacitor instalados
- [x] Android Studio instalado
- [x] Proyecto Android creado
- [ ] Emulador configurado → Tools → Device Manager
- [ ] App ejecutada primera vez → Run (▶)
- [ ] Tab navigation probado
- [ ] Home page funcionando
- [ ] Explore page con mapa funcionando

---

## 🎉 Todo Listo!

La app está completamente funcional. Solo necesitas:
1. Esperar que Android Studio termine de cargar
2. Crear un emulador (Tools → Device Manager)
3. Click en Run (▶)
4. ¡Ver tu app funcionando!

**Documentación completa:** `MOBILE_DOCS_INDEX.md`
