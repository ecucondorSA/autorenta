#!/bin/bash

# Colores para el output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🤖 Auto-Connect ADB Wi-Fi Tool${NC}"
echo "----------------------------------------"

# 1. Verificar si hay dispositivo USB
echo -e "🔍 Buscando dispositivo por USB..."
USB_DEVICE=$(adb devices | grep -w "device" | grep -v "192.168" | head -n 1 | awk '{print $1}')

if [ -z "$USB_DEVICE" ]; then
    echo -e "${YELLOW}⚠️  No detecto ningún teléfono por USB.${NC}"
    echo "👉 Por favor, conecta el cable USB ahora..."
    adb wait-for-device
    USB_DEVICE=$(adb devices | grep -w "device" | grep -v "192.168" | head -n 1 | awk '{print $1}')
    echo -e "${GREEN}✅ Dispositivo detectado: $USB_DEVICE${NC}"
fi

# 2. Obtener IP
echo -e "🌐 Obteniendo dirección IP del teléfono..."
DEVICE_IP=$(adb -s $USB_DEVICE shell ip -f inet addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)

if [ -z "$DEVICE_IP" ]; then
    echo -e "${RED}❌ Error: No pude obtener la IP. Asegúrate de que el teléfono esté conectado al Wi-Fi.${NC}"
    exit 1
fi

echo -e "📍 IP encontrada: ${GREEN}$DEVICE_IP${NC}"

# 3. Activar modo TCP/IP
echo -e "🔓 Abriendo puerto 5555 en el teléfono..."
adb -s $USB_DEVICE tcpip 5555
sleep 3

# 4. Conectar
echo -e "🔗 Conectando inalámbricamente..."
adb connect $DEVICE_IP

# 5. Verificación final
CONNECTED=$(adb devices | grep "$DEVICE_IP")
if [ ! -z "$CONNECTED" ]; then
    echo "----------------------------------------"
    echo -e "${GREEN}🎉 ¡ÉXITO! Conexión establecida.${NC}"
    echo -e "👉 Ya puedes ${YELLOW}DESCONECTAR EL CABLE USB${NC}."
    echo -e "📱 Tu dispositivo está listo para depurar sin cables."
else
    echo -e "${RED}❌ Algo falló al conectar. Inténtalo de nuevo.${NC}"
fi
