# 📱 GUÍA: Publicar en Google Play Store

## 💰 Costos

### Pago Único (Una sola vez)
- **$25 USD** - Cuenta de Google Play Developer (de por vida)
- Solo pagas una vez, puedes publicar apps ilimitadas

## 📋 Requisitos Previos

### 1. Cuenta Google Play Console
```
Costo: $25 USD (pago único)
Link: https://play.google.com/console/signup
```

### 2. Documentos/Info Requerida
- ✅ Email de contacto
- ✅ Dirección física (puede ser tu casa)
- ✅ Número de teléfono
- ✅ Política de privacidad (URL pública)
- ✅ Identificación oficial (en algunos casos)

---

## 🔐 PASO 1: Generar Clave de Firma (Release)

### Crear Keystore
```bash
cd /home/edu/autorenta/android/app

# Generar keystore
keytool -genkey -v -keystore autorenta-release.keystore \
  -alias autorenta -keyalg RSA -keysize 2048 -validity 10000

# Te pedirá:
# - Contraseña del keystore (GUÁRDALA BIEN)
# - Datos personales/empresa
# - Contraseña de la clave (puede ser la misma)
```

**⚠️ IMPORTANTE:** 
- Guarda el archivo `.keystore` en lugar seguro
- **NUNCA pierdas la contraseña** (no podrás actualizar la app)
- **NO subas el keystore a Git**

---

## 📦 PASO 2: Configurar Build Release

### Editar: `android/app/build.gradle`

```gradle
android {
    ...
    
    signingConfigs {
        release {
            storeFile file('autorenta-release.keystore')
            storePassword 'TU_CONTRASEÑA_KEYSTORE'
            keyAlias 'autorenta'
            keyPassword 'TU_CONTRASEÑA_CLAVE'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Mejor práctica:** Usar variables de entorno en lugar de contraseñas hardcoded:

```gradle
signingConfigs {
    release {
        storeFile file('autorenta-release.keystore')
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
```

---

## 🏗️ PASO 3: Generar AAB Release

### Build AAB (Android App Bundle - requerido por Play Store)
```bash
cd /home/edu/autorenta

# 1. Build web app
cd apps/web && npm run build

# 2. Sync Capacitor
cd ../.. && npx cap sync

# 3. Build AAB
cd android && ./gradlew bundleRelease

# Output:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Verificar AAB
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
# Debe ser ~15-25 MB (más pequeño que APK)
```

---

## 🎨 PASO 4: Preparar Assets de Store

### Iconos & Screenshots Requeridos

**App Icon**
- 512x512 px PNG (32-bit)
- Sin transparencia
- Sin bordes redondeados (Google los redondea)

**Feature Graphic**
- 1024x500 px JPG/PNG
- Banner principal de la app

**Screenshots** (Mínimo 2, máximo 8 por tipo)
- Teléfono: 1080x1920 px o 1440x2560 px
- Tablet 7": 1200x1920 px
- Tablet 10": 1920x1200 px

**Video promocional** (Opcional)
- YouTube link

### Generar Screenshots desde Android Studio/Emulador
```bash
# Abrir emulador
cd /home/edu/autorenta
npx cap open android

# Desde Android Studio:
# - Run app
# - Camera icon en emulador (Ctrl+S)
# - Guardar screenshots
```

---

## 📝 PASO 5: Información de Store Listing

### Textos Requeridos

**Título corto**
- Máx 30 caracteres
- Ejemplo: "Autorentar - Alquiler Autos"

**Descripción corta**
- Máx 80 caracteres
- Ejemplo: "Alquila o renta tu auto de forma fácil y segura en Uruguay"

**Descripción completa**
- Máx 4000 caracteres
- Incluir:
  - Qué hace la app
  - Features principales
  - Beneficios
  - Contacto/soporte

**Ejemplo:**
```
🚗 Autorentar - Alquiler de Autos P2P en Uruguay

Alquila el auto perfecto para tu viaje o gana dinero rentando el tuyo.

✨ FEATURES:
• Búsqueda con mapa interactivo
• Reservas instantáneas
• Pagos seguros integrados
• Chat con propietarios
• Verificación de usuarios
• Seguro incluido

📱 FÁCIL Y RÁPIDO:
1. Busca autos cerca de ti
2. Reserva en segundos
3. Recoge y disfruta

💰 GANA DINERO:
Renta tu auto cuando no lo uses y genera ingresos pasivos.

🔒 SEGURO Y CONFIABLE:
• Verificación de identidad
• Pagos protegidos
• Soporte 24/7

Únete a la comunidad de alquiler de autos en Uruguay.
```

**Categoría:** Mapas y navegación / Viajes y transporte

**Contacto:**
- Email de soporte
- Sitio web
- Política de privacidad (URL)

---

## 🚀 PASO 6: Subir a Play Console

### 1. Crear App
```
Play Console → Crear app
- Nombre: Autorentar
- Idioma: Español (Uruguay)
- Tipo: App / Juego
- Gratis / Paga
```

### 2. Panel Principal (Dashboard)
Completar todas las secciones:

**✅ Configuración de la app**
- Política de privacidad
- Categoría
- Información de contacto
- Direcciones de tienda (opcional)

**✅ Store listing**
- Título, descripción
- Iconos, screenshots
- Categoría y tags

**✅ Clasificación de contenido**
- Cuestionario de contenido
- Edad mínima

**✅ Precios y distribución**
- Países donde estará disponible
- Precio (gratis/paga)

**✅ Información sobre datos**
- Qué datos recopilas
- Cómo los usas
- Seguridad

### 3. Release de Producción
```
Production → Create new release
- Upload AAB: app-release.aab
- Release notes (changelog)
- Review
- Submit
```

---

## ⏱️ PASO 7: Revisión de Google

### Timeline
- **Envío:** Inmediato
- **Revisión:** 1-7 días (promedio 2-3 días)
- **Actualizaciones:** 1-3 días

### Posibles Razones de Rechazo
1. Política de privacidad faltante/incompleta
2. Screenshots de baja calidad
3. Descripción engañosa
4. Permisos no justificados
5. Contenido inapropiado
6. Funcionalidad rota/bugs

---

## 🔄 Actualizar App (Después de publicar)

```bash
# 1. Incrementar versión en build.gradle
# android/app/build.gradle
versionCode 2      # Era 1
versionName "1.1"  # Era "1.0"

# 2. Build nueva versión
cd apps/web && npm run build
cd ../.. && npx cap sync
cd android && ./gradlew bundleRelease

# 3. Subir a Play Console
# Production → Create new release → Upload AAB
```

---

## 💡 TIPS

### Optimización
- Habilita ProGuard (reduce tamaño ~40%)
- Usa WebP para imágenes
- Lazy loading de componentes
- AAB en vez de APK (Google optimiza por dispositivo)

### Marketing
- Usa Google Play Beta Testing primero
- Pide reviews a usuarios
- Responde comentarios
- Actualiza regularmente

### Monetización (si aplica)
- In-app purchases
- Subscripciones
- Anuncios (AdMob)
- Versión premium

---

## 📊 Costos Totales Estimados

```
✅ Cuenta Developer     $25 USD (una vez)
✅ Dominio web          $10-15/año (para política privacidad)
✅ Hosting web          Gratis (GitHub Pages, Netlify)
─────────────────────────────────────────────
TOTAL INICIAL:          ~$30-40 USD
TOTAL ANUAL:            ~$10-15 USD
```

---

## 🔗 Links Útiles

- Play Console: https://play.google.com/console
- Políticas: https://play.google.com/about/developer-content-policy/
- Guía oficial: https://developer.android.com/distribute
- Asset Studio: https://romannurik.github.io/AndroidAssetStudio/

---

## ✅ Checklist Antes de Publicar

- [ ] Cuenta Play Console activa ($25)
- [ ] Keystore generado y guardado
- [ ] AAB release firmado
- [ ] Política de privacidad publicada
- [ ] Screenshots (mínimo 2)
- [ ] App icon 512x512
- [ ] Feature graphic 1024x500
- [ ] Descripción completa
- [ ] Clasificación de contenido
- [ ] Testing en dispositivos reales
- [ ] Sin bugs críticos
- [ ] Permisos justificados

---

**¿Listo para publicar?** Sigue estos pasos en orden y en 1 semana tu app estará en Play Store! 🚀
