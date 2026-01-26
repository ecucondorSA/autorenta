#!/bin/bash

# AutoRentar - RUS Meeting Launcher
# Abre todas las pestañas necesarias para la presentación
# Sistema completo: Pre → During → Post

echo "🚀 Iniciando Entorno de Presentación AutoRentar × RUS..."
echo ""

# Base URLs
BRAIN_DIR="/home/edu/.gemini/antigravity/brain/0ea5de2e-6ac2-40f0-bce2-9a2c9aff19be"
APP_URL="http://localhost:4200"

# Verificar que el servidor local está corriendo
echo "📡 Verificando servidor local..."
if curl -s "$APP_URL" > /dev/null 2>&1; then
    echo "✅ App corriendo en $APP_URL"
else
    echo "⚠️  App NO está corriendo. Inicia con: pnpm dev"
    echo "   Continuando de todas formas..."
fi

echo ""
echo "📂 Abriendo materiales de presentación..."
echo ""

# 1. Presentación Principal (Pantalla Compartida - LIMPIA)
echo "1️⃣  Presentación Visual (Chrome - COMPARTIR)"
xdg-open "$BRAIN_DIR/presentacion_visual_rus.html" 2>/dev/null &
sleep 1

# 2. Demo en Vivo (Pantalla Compartida - Para cambiar de tab)
echo "2️⃣  Demo en Vivo (localhost:4200)"
xdg-open "$APP_URL" 2>/dev/null &
sleep 1

# 3. MASTER PLAYBOOK (Tu Guía de Mando - SOLO EDU)
echo "3️⃣  MASTER PLAYBOOK (Tu Control - NO COMPARTIR)"
xdg-open "$BRAIN_DIR/MASTER_PLAYBOOK_RUS.md" 2>/dev/null &
sleep 1

# 4. Pre-Meeting Checklist (Opcional - si quieres revisar)
echo "4️⃣  Pre-Meeting Checklist (Opcional)"
xdg-open "$BRAIN_DIR/PRE_MEETING_CHECKLIST.md" 2>/dev/null &
sleep 1

# 5. Post-Meeting Automation (Para después de la reunión)
echo "5️⃣  Post-Meeting Automation (Para después)"
xdg-open "$BRAIN_DIR/POST_MEETING_AUTOMATION.md" 2>/dev/null &
sleep 1

# 6. Documentos de Soporte (Tu Pantalla - Listos por si preguntan)
echo "6️⃣  Documentos de Soporte (Emergencia)"
xdg-open "$BRAIN_DIR/ficha_tecnica_15_70_15.md" 2>/dev/null &
xdg-open "$BRAIN_DIR/marco_legal_blindaje.md" 2>/dev/null &
xdg-open "$BRAIN_DIR/analisis_competitivo_tripwip.md" 2>/dev/null &
xdg-open "$BRAIN_DIR/propuesta_poliza_autorentar.md" 2>/dev/null &

echo ""
echo "✅ Todo abierto. Organiza tus ventanas:"
echo ""
echo "   🖥️  MONITOR PRINCIPAL (COMPARTIR):"
echo "      → Presentación Visual (Chrome) - Presiona F11 para pantalla completa"
echo ""
echo "   👁️  MONITOR SECUNDARIO (TU CONTROL):"
echo "      → MASTER_PLAYBOOK_RUS.md (tu guía durante la reunión)"
echo "      → Demo (localhost:4200) - Para cambiar de tab en minuto 20"
echo "      → Documentos de soporte (por si preguntan)"
echo ""
echo "📋 RECUERDA:"
echo "   • Comparte SOLO la pestaña de la Presentación al inicio"
echo "   • En minuto 20:00, cambia a la Demo (Ctrl+Tab)"
echo "   • Después de cortar: Ejecuta POST_MEETING_AUTOMATION.md"
echo ""
echo "🎯 ¡Éxito en la reunión! 👊"
