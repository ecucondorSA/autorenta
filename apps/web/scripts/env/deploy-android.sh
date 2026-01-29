#!/bin/bash

# ==============================================================================
# AUTORENTA ANDROID DEPLOYMENT SCRIPT
# ==============================================================================
# Automatiza el ciclo completo de compilación y despliegue en Android.
# Uso: ./scripts/deploy-android.sh [--release] [--no-icons]
# ==============================================================================

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
APP_ID="com.autorentar.app"
BUILD_TYPE="debug"
GENERATE_ICONS=true

# Parsear argumentos
for arg in "$@"
do
    case $arg in
        --release)
        BUILD_TYPE="release"
        shift
        ;;
        --no-icons)
        GENERATE_ICONS=false
        shift
        ;;
    esac
done

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🚀  INICIANDO DESPLIEGUE DE AUTORENTA (ANDROID: ${BUILD_TYPE^^})${NC}"
echo -e "${BLUE}============================================================${NC}"

# 1. Verificar ADB
echo -e "${YELLOW}Wait... Verificando dispositivo Android...${NC}"
DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)

if [ "$DEVICE_COUNT" -eq "0" ]; then
    echo -e "${RED}❌ Error: No se detectó ningún dispositivo Android conectado.${NC}"
    echo "   Por favor conecta tu móvil por USB o verifica la IP para ADB Wireless."
    exit 1
fi
echo -e "${GREEN}✅ Dispositivo detectado.${NC}"

# 2. Generar Iconos (Opcional)
if [ "$GENERATE_ICONS" = true ]; then
    echo -e "${YELLOW}🎨  Generando Assets (Iconos y Splash)...${NC}"
    if [ -f "assets/logo.png" ]; then
        npx @capacitor/assets generate --android --quiet
        echo -e "${GREEN}✅ Assets generados.${NC}"
    else
        echo -e "${YELLOW}⚠️  Advertencia: No se encontró assets/logo.png. Saltando generación de iconos.${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Saltando generación de iconos (--no-icons).${NC}"
fi

# 3. Compilar Angular
echo -e "${YELLOW}🔨  Compilando Aplicación Web (Angular)...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build Web completado.${NC}"
else
    echo -e "${RED}❌ Error en el Build Web. Abortando.${NC}"
    exit 1
fi

# 4. Sincronizar Capacitor
echo -e "${YELLOW}🔄  Sincronizando con Capacitor...${NC}"
if npx cap sync android; then
    echo -e "${GREEN}✅ Sincronización nativa completada.${NC}"
else
    echo -e "${RED}❌ Error en Cap Sync. Abortando.${NC}"
    exit 1
fi

# 5. Compilar Android (Gradle)
echo -e "${YELLOW}🤖  Compilando APK Nativo (${BUILD_TYPE})...${NC}"
cd android
if ./gradlew "assemble${BUILD_TYPE^}"; then
    echo -e "${GREEN}✅ APK compilado exitosamente.${NC}"
else
    echo -e "${RED}❌ Error en compilación Gradle. Abortando.${NC}"
    cd ..
    exit 1
fi
cd ..

# 6. Instalar APK
APK_PATH="android/app/build/outputs/apk/${BUILD_TYPE}/app-${BUILD_TYPE}.apk"

if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ Error: No se encuentra el APK en $APK_PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}📲  Instalando en dispositivo...${NC}"
if adb install -r "$APK_PATH"; then
    echo -e "${GREEN}✅ Instalación completada.${NC}"
else
    echo -e "${RED}❌ Error al instalar APK. Verifica permisos en el móvil.${NC}"
    exit 1
fi

# 7. Lanzar Aplicación
echo -e "${YELLOW}🚀  Lanzando Autorentar...${NC}"
adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}✨  DESPLIEGUE FINALIZADO EXITOSAMENTE  ✨${NC}"
echo -e "${BLUE}============================================================${NC}"
