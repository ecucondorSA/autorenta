#!/bin/bash
# tools/adb-monitor.sh

echo "🤖 ADB Auto-Connect Monitor activo..."
echo "🔌 Conecta el cable USB en cualquier momento para reactivar el modo inalámbrico."
echo "----------------------------------------------------------------"

while true; do
    # 1. ¿Ya estamos conectados por Wifi?
    WIFI_CONNECTED=$(adb devices | grep ":5555" | grep "device")

    # 2. Si NO estamos conectados por Wifi, buscar USB
    if [ -z "$WIFI_CONNECTED" ]; then
        USB_DEVICE=$(adb devices | grep -w "device" | grep -v ":" | head -n 1 | awk '{print $1}')

        if [ ! -z "$USB_DEVICE" ]; then
            echo "$(date '+%H:%M:%S') - 🔌 USB detectado: $USB_DEVICE"
            
            # Obtener IP
            IP=$(adb -s $USB_DEVICE shell ip -f inet addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1)
            
            if [ ! -z "$IP" ]; then
                echo "             🌐 IP encontrada: $IP"
                echo "             🔓 Abriendo puerto TCP..."
                adb -s $USB_DEVICE tcpip 5555
                sleep 4
                
                echo "             🔗 Conectando..."
                adb connect $IP
                
                echo "             ✅ ¡Listo! Modo inalámbrico activo."
            else
                echo "             ⚠️ Error: No pude leer la IP (¿Wifi apagado?)."
            fi
        fi
    fi
    
    # Esperar 5 segundos antes de volver a verificar
    sleep 5
done
