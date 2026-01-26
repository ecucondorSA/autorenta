#!/bin/bash

# 🚀 RUS MEETING COMPLETE AUTOMATION
# Sistema completo: Pre → During → Post
# Uso: ./tools/rus_meeting_complete.sh [pre|during|post]

set -e

BRAIN_DIR="/home/edu/.gemini/antigravity/brain/0ea5de2e-6ac2-40f0-bce2-9a2c9aff19be"
APP_URL="http://localhost:4200"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo "🚀 RUS Meeting Complete Automation"
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  pre     - Preparación pre-reunión (30 min antes)"
    echo "  during  - Iniciar presentación (5 min antes)"
    echo "  post    - Post-reunión (inmediatamente después)"
    echo "  all     - Ejecutar todo el flujo (pre → during)"
    echo ""
    echo "Ejemplos:"
    echo "  $0 pre      # Checklist de preparación"
    echo "  $0 during  # Abrir presentación y materiales"
    echo "  $0 post    # Generar email y notas"
    echo ""
}

# FASE PRE: Preparación Pre-Reunión
phase_pre() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📋 FASE PRE: PREPARACIÓN PRE-REUNIÓN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 1. Verificar servidor local
    echo -e "${YELLOW}1️⃣  Verificando servidor local...${NC}"
    if curl -s "$APP_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ App corriendo en $APP_URL${NC}"
    else
        echo -e "${RED}   ❌ App NO está corriendo${NC}"
        echo -e "${YELLOW}   💡 Inicia con: pnpm dev${NC}"
        read -p "   ¿Quieres iniciar el servidor ahora? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "   Iniciando servidor en background..."
            cd "$SCRIPT_DIR/.." && pnpm dev > /dev/null 2>&1 &
            sleep 5
            echo -e "${GREEN}   ✅ Servidor iniciado${NC}"
        fi
    fi
    echo ""

    # 2. Verificar materiales
    echo -e "${YELLOW}2️⃣  Verificando materiales...${NC}"
    MATERIALS=(
        "$BRAIN_DIR/presentacion_visual_rus.html"
        "$BRAIN_DIR/MASTER_PLAYBOOK_RUS.md"
        "$BRAIN_DIR/PRE_MEETING_CHECKLIST.md"
        "$BRAIN_DIR/POST_MEETING_AUTOMATION.md"
        "$BRAIN_DIR/ficha_tecnica_15_70_15.md"
        "$BRAIN_DIR/marco_legal_blindaje.md"
        "$BRAIN_DIR/analisis_competitivo_tripwip.md"
        "$BRAIN_DIR/propuesta_poliza_autorentar.md"
    )

    ALL_OK=true
    for material in "${MATERIALS[@]}"; do
        if [ -f "$material" ]; then
            echo -e "${GREEN}   ✅ $(basename "$material")${NC}"
        else
            echo -e "${RED}   ❌ $(basename "$material") - NO ENCONTRADO${NC}"
            ALL_OK=false
        fi
    done
    echo ""

    if [ "$ALL_OK" = false ]; then
        echo -e "${RED}⚠️  Algunos materiales faltan. Revisa antes de continuar.${NC}"
    fi

    # 3. Verificar conectividad
    echo -e "${YELLOW}3️⃣  Verificando conectividad...${NC}"
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ Internet conectado${NC}"
    else
        echo -e "${RED}   ❌ Sin conexión a internet${NC}"
    fi
    echo ""

    # 4. Abrir Pre-Meeting Checklist
    echo -e "${YELLOW}4️⃣  Abriendo Pre-Meeting Checklist...${NC}"
    xdg-open "$BRAIN_DIR/PRE_MEETING_CHECKLIST.md" 2>/dev/null &
    sleep 1
    echo -e "${GREEN}   ✅ Checklist abierto${NC}"
    echo ""

    echo -e "${GREEN}✅ Preparación completada${NC}"
    echo ""
    echo -e "${BLUE}📋 Próximos pasos:${NC}"
    echo "   1. Completa el checklist en la ventana abierta"
    echo "   2. Ejecuta: $0 during (5 min antes de la reunión)"
    echo ""
}

# FASE DURING: Durante la Reunión
phase_during() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎬 FASE DURING: INICIANDO PRESENTACIÓN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Ejecutar el script de inicio de presentación
    echo -e "${YELLOW}🚀 Abriendo todas las ventanas necesarias...${NC}"
    echo ""

    "$SCRIPT_DIR/start_presentation.sh"

    echo ""
    echo -e "${GREEN}✅ Todo listo para la reunión${NC}"
    echo ""
    echo -e "${BLUE}📋 RECUERDA:${NC}"
    echo "   • Presentación en pantalla completa (F11)"
    echo "   • Playbook visible en segundo monitor"
    echo "   • En minuto 20:00, cambia a Demo (Ctrl+Tab)"
    echo "   • Después de cortar: Ejecuta $0 post"
    echo ""
}

# FASE POST: Post-Reunión
phase_post() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📧 FASE POST: POST-REUNIÓN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 1. Abrir Post-Meeting Automation
    echo -e "${YELLOW}1️⃣  Abriendo Post-Meeting Automation...${NC}"
    xdg-open "$BRAIN_DIR/POST_MEETING_AUTOMATION.md" 2>/dev/null &
    sleep 1
    echo -e "${GREEN}   ✅ Documento abierto${NC}"
    echo ""

    # 2. Generar timestamp para notas
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
    NOTES_FILE="$BRAIN_DIR/notas_reunion_$(date +"%Y%m%d_%H%M%S").md"

    echo -e "${YELLOW}2️⃣  Creando archivo de notas...${NC}"
    cat > "$NOTES_FILE" << EOF
# 📋 NOTAS: Reunión AutoRentar × RUS
**Fecha:** $TIMESTAMP
**Duración:** [COMPLETAR] minutos
**Participantes:** Eduardo, Anabella, Amelia

## ✅ Puntos Cubiertos
- [ ] Modelo 15/70/15 explicado
- [ ] Triple Capa de Protección presentada
- [ ] Demo en vivo mostrada
- [ ] Costos discutidos
- [ ] Próximos pasos acordados

## 🎯 Compromisos de RUS
1. [ ] Envío de documentación API REST
2. [ ] Cotización Capa 3 (RC + Casco Pay-as-you-go)
3. [ ] Fecha límite: [FECHA]

## 🎯 Compromisos de AutoRentar
1. [ ] Envío de Ficha Técnica 15/70/15
2. [ ] Envío de Protocolo de Blindaje Legal
3. [ ] Fecha límite: [FECHA]

## ❓ Preguntas Pendientes
- [PREGUNTA 1] → [RESPUESTA/ACCIÓN]
- [PREGUNTA 2] → [RESPUESTA/ACCIÓN]

## 🚨 Objeciones/Resistencias
- [OBJECIÓN 1] → [CÓMO SE RESOLVIÓ]
- [OBJECIÓN 2] → [CÓMO SE RESOLVIÓ]

## 💡 Insights Clave
- [INSIGHT 1]
- [INSIGHT 2]

## 📅 Próxima Reunión
- **Fecha:** [FECHA]
- **Tipo:** Revisión técnica / Cotización / Otro
- **Agenda:** [PUNTOS A TRATAR]
EOF

    echo -e "${GREEN}   ✅ Notas creadas: $(basename "$NOTES_FILE")${NC}"
    xdg-open "$NOTES_FILE" 2>/dev/null &
    echo ""

    # 3. Generar email template
    EMAIL_FILE="$BRAIN_DIR/email_post_reunion_$(date +"%Y%m%d_%H%M%S").txt"
    echo -e "${YELLOW}3️⃣  Generando template de email...${NC}"
    cat > "$EMAIL_FILE" << 'EOF'
Asunto: Minuta y Próximos Pasos: Alianza Estratégica AutoRentar - RUS

Estimadas Anabella y Amelia,

Un gusto haber conversado hoy. Quedamos muy entusiasmados con la posibilidad de construir este estándar juntos.

RESUMEN DE ACUERDOS:
1. Tecnología: AutoRentar provee el "Evidence Pack" (KYC + GPS) para reducir tiempos de liquidación.
2. Modelo: Esquema 15/70/15 con FGO que filtra la siniestralidad menor (Loss Ratio eficiente).
3. Siguientes Pasos (Para el [FECHA]):
   - RUS: Envío de documentación API REST.
   - RUS: Propuesta estimativa de Capa 3 (RC + Casco "Pay-as-you-go").
   - AutoRentar: Envío de Ficha Técnica 15/70/15 y Protocolo de Blindaje Legal.

Adjunto la Ficha Técnica y el Protocolo de Blindaje Legal para sus equipos.

Quedamos a la espera de su feedback técnico.

Saludos cordiales,

Eduardo Marques
Founder | AutoRentar
ECUCONDOR S.A.S. (BIC)
EOF

    echo -e "${GREEN}   ✅ Email template creado: $(basename "$EMAIL_FILE")${NC}"
    xdg-open "$EMAIL_FILE" 2>/dev/null &
    echo ""

    echo -e "${GREEN}✅ Post-reunión completado${NC}"
    echo ""
    echo -e "${BLUE}📋 Próximos pasos:${NC}"
    echo "   1. Completa las notas en: $(basename "$NOTES_FILE")"
    echo "   2. Personaliza el email en: $(basename "$EMAIL_FILE")"
    echo "   3. Envía el email en los próximos 15 minutos"
    echo "   4. Adjunta materiales: Ficha Técnica + Protocolo Legal"
    echo ""
}

# Main
case "${1:-}" in
    pre)
        phase_pre
        ;;
    during)
        phase_during
        ;;
    post)
        phase_post
        ;;
    all)
        phase_pre
        echo ""
        read -p "¿Continuar con fase DURING? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            phase_during
        fi
        ;;
    *)
        show_help
        exit 1
        ;;
esac
