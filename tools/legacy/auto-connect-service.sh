#!/bin/bash
# /home/edu/autorenta/tools/auto-connect-service.sh

# Configurar entorno para que ADB funcione desde Udev (que corre como root/system)
export HOME="/home/edu"
export USER="edu"
ADB="/usr/bin/adb" # O la ruta donde esté tu adb, asumiremos system path o lo buscamos
if [ -f "$HOME/platform-tools/adb" ]; then
    ADB="$HOME/platform-tools/adb"
fi

# Logs para depuración
LOG_FILE="/tmp/adb-autoconnect.log"
echo "$(date) - 🔌 Dispositivo USB detectado. Iniciando protocolo..." >> $LOG_FILE

# Esperar a que el sistema de archivos USB se monte y ADB lo vea
sleep 5
$ADB start-server >> $LOG_FILE 2>&1

# Intentar obtener el ID del dispositivo
# Filtramos líneas vacías y 'List of devices'
USB_DEVICE=$($ADB devices | grep -w "device" | grep -v "192.168" | awk '{print $1}' | head -n 1)

if [ -z "$USB_DEVICE" ]; then
    echo "$(date) - ❌ No se detectó dispositivo ADB válido después de esperar." >> $LOG_FILE
    exit 1
fi

echo "$(date) - ✅ Dispositivo encontrado: $USB_DEVICE. Obteniendo IP..." >> $LOG_FILE

# Obtener IP
DEVICE_IP=$($ADB -s $USB_DEVICE shell ip -f inet addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)

if [ -z "$DEVICE_IP" ]; then
    echo "$(date) - ⚠️ No se pudo obtener IP (¿Tal vez no está en WiFi?). Abortando." >> $LOG_FILE
    exit 1
fi

echo "$(date) - 🌐 IP: $DEVICE_IP. Activando TCP/IP..." >> $LOG_FILE

# Activar modo TCP
$ADB -s $USB_DEVICE tcpip 5555 >> $LOG_FILE 2>&1
sleep 3

# Conectar
$ADB connect $DEVICE_IP >> $LOG_FILE 2>&1

echo "$(date) - 🎉 Conectado a $DEVICE_IP. Listo." >> $LOG_FILE
