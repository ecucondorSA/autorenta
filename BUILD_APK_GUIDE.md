# 📱 CÓMO GENERAR EL APK - AUTORENTA MOBILE

## ⚠️ SITUACIÓN ACTUAL

El APK no puede generarse desde terminal porque:
- ❌ Android SDK no está configurado todavía
- ✅ Java 17 SÍ está instalado
- ✅ Android Studio SÍ está instalado

**SOLUCIÓN:** Usar Android Studio (es más fácil y rápido)

---

## 🎯 MÉTODO 1: GENERAR APK DESDE ANDROID STUDIO (RECOMENDADO)

### Paso 1: Abrir Android Studio
```bash
cd /home/edu/autorenta
./open-android.sh
```

### Paso 2: Esperar Gradle Sync
- Verás en la barra inferior: "Gradle sync"
- Puede tardar 2-5 minutos la primera vez
- Android Studio descargará automáticamente el Android SDK

### Paso 3: Build APK
En el menú superior:
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

O usa el atajo: `Ctrl + Shift + A` y escribe "Build APK"

### Paso 4: Esperar compilación
- Verás progreso en la barra inferior
- Tardará 2-3 minutos

### Paso 5: APK Generado ✅
Verás notificación: **"APK(s) generated successfully"**

Click en **"locate"** para abrir la carpeta del APK

**Ubicación del APK:**
```
/home/edu/autorenta/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🎯 MÉTODO 2: EJECUTAR DIRECTAMENTE EN EMULADOR (MÁS RÁPIDO)

Si solo quieres probar la app, NO necesitas el APK:

### Paso 1: Crear Emulador
```
Tools → Device Manager → Create Device
```
- Selecciona: Pixel 5
- System Image: API 33 (Tiramisu)
- Click Finish

### Paso 2: Ejecutar App
- Click en el botón verde **Run** (▶) 
- O presiona `Shift + F10`
- Selecciona el emulador
- La app se abrirá automáticamente

**NO NECESITAS APK** - Se instala directo en el emulador

---

## 🎯 MÉTODO 3: CONFIGURAR SDK Y COMPILAR DESDE TERMINAL

Si insistes en usar terminal:

### Paso 1: Esperar que Android Studio descargue el SDK
Abre Android Studio y déjalo descargar el SDK (primera vez)

### Paso 2: Configurar ANDROID_HOME
```bash
# El SDK se instala en:
export ANDROID_HOME=$HOME/Android/Sdk
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
source ~/.bashrc
```

### Paso 3: Compilar APK
```bash
cd /home/edu/autorenta/android
./gradlew assembleDebug
```

**Ubicación del APK:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📦 DESPUÉS DE TENER EL APK

### Instalar en tu teléfono Android:

**OPCIÓN A: Via USB (ADB)**
```bash
# Conecta tu teléfono por USB
# Habilita "Depuración USB" en el teléfono
adb devices
adb install /home/edu/autorenta/android/app/build/outputs/apk/debug/app-debug.apk
```

**OPCIÓN B: Copiar manualmente**
1. Copia el APK a tu teléfono (USB, email, Drive, etc.)
2. Abre el APK desde tu teléfono
3. Permite "Instalar apps de origen desconocido"
4. Click "Instalar"

---

## ✅ RESUMEN - LO MÁS FÁCIL

1. Abre Android Studio: `./open-android.sh`
2. Espera Gradle Sync (2-5 min)
3. `Build → Build APK(s)`
4. Espera 2-3 min
5. APK listo en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🎯 PRÓXIMO PASO INMEDIATO

```bash
cd /home/edu/autorenta
./open-android.sh
```

Luego en Android Studio: `Build → Build APK(s)`

¡Eso es todo! 🚀
