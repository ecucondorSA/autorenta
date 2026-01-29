#!/bin/bash

# Script para enviar mensaje de Navidad a los últimos chats de WhatsApp
# Usa ADB para automatizar el envío

MESSAGE="Hola!

Hoy quería tomarme un momento para escribirte.

Este año pasaron muchas cosas, para todos. Algunos días fueron más fáciles que otros, pero acá estamos, llegando a otra Navidad.

Espero que esta noche puedas estar con los tuyos, o al menos cerca de quienes querés. Que haya risas, aunque sea por un rato. Que la mesa esté llena de lo que se pueda, pero sobre todo de gente que te haga bien.

Si este año fue difícil, que el próximo sea más liviano.
Si fue bueno, que venga uno todavía mejor.

Gracias por estar, por confiar, por ser parte de este camino.

Un abrazo grande y feliz Navidad."

# Número de chats a enviar
TOTAL_CHATS=${1:-250}

# Coordenadas del primer chat (ajustar según pantalla 720x1640)
FIRST_CHAT_Y=280
CHAT_HEIGHT=120

# Coordenada X central de la lista
CHAT_X=360

# Coordenada del campo de texto
INPUT_X=360
INPUT_Y=1550

# Coordenada del botón enviar
SEND_X=670
SEND_Y=1550

echo "=== WhatsApp Broadcast Script ==="
echo "Enviando mensaje a $TOTAL_CHATS chats"
echo ""

# Abrir WhatsApp
echo "Abriendo WhatsApp..."
adb shell am start -n com.whatsapp.w4b/com.whatsapp.Main
sleep 3

sent=0
scroll_count=0
chats_per_screen=8

for ((i=1; i<=TOTAL_CHATS; i++)); do
    # Calcular posición del chat en pantalla
    chat_index=$((i - scroll_count * chats_per_screen))

    # Si necesitamos scroll
    if [ $chat_index -gt $chats_per_screen ]; then
        echo "Scrolling..."
        adb shell input swipe 360 1200 360 400 300
        sleep 1
        scroll_count=$((scroll_count + 1))
        chat_index=1
    fi

    # Calcular Y del chat
    chat_y=$((FIRST_CHAT_Y + (chat_index - 1) * CHAT_HEIGHT))

    echo "[$i/$TOTAL_CHATS] Enviando mensaje..."

    # Tap en el chat
    adb shell input tap $CHAT_X $chat_y
    sleep 1.5

    # Tap en campo de texto
    adb shell input tap $INPUT_X $INPUT_Y
    sleep 0.5

    # Escribir mensaje (escapando caracteres especiales)
    # Usamos base64 para evitar problemas con caracteres especiales
    echo "$MESSAGE" | while IFS= read -r line; do
        if [ -n "$line" ]; then
            # Escapar comillas y caracteres especiales para ADB
            escaped_line=$(echo "$line" | sed "s/'/\\\\'/g" | sed 's/"/\\"/g')
            adb shell input text "'$escaped_line'"
        fi
        # Enter para nueva línea
        adb shell input keyevent 66
    done

    sleep 0.5

    # Enviar mensaje
    adb shell input tap $SEND_X $SEND_Y
    sleep 1

    # Volver atrás
    adb shell input keyevent KEYCODE_BACK
    sleep 1

    sent=$((sent + 1))
    echo "   ✓ Mensaje $sent enviado"

    # Pausa cada 10 mensajes para evitar bloqueos
    if [ $((sent % 10)) -eq 0 ]; then
        echo "   Pausa de 5 segundos..."
        sleep 5
    fi
done

echo ""
echo "=== Completado ==="
echo "Total mensajes enviados: $sent"
