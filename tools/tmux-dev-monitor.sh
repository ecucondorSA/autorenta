#!/bin/bash
# Script para configurar tmux con paneles para desarrollo y monitoreo
# AutoRenta - 2025-11-09

SESSION_NAME="autorenta-dev"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🚀 AutoRenta Development Monitor${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar si tmux está instalado
if ! command -v tmux &> /dev/null; then
    echo -e "${YELLOW}⚠️  tmux no está instalado. Instalando...${NC}"
    sudo apt-get update && sudo apt-get install -y tmux
fi

# Cambiar al directorio del proyecto
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

# Si la sesión ya existe, conectarse a ella
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Sesión '$SESSION_NAME' ya existe. Conectando...${NC}"
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

# Crear nueva sesión tmux
echo -e "${GREEN}✅ Creando sesión tmux: $SESSION_NAME${NC}"
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# Configurar ventana principal (0) con dos paneles
# Panel izquierdo: Scripts y comandos
# Panel derecho: Logs y monitoreo

# Dividir ventana horizontalmente (50/50)
tmux split-window -h -t "$SESSION_NAME:0"

# Panel izquierdo (0): Scripts y comandos
tmux select-pane -t "$SESSION_NAME:0.0"
tmux send-keys -t "$SESSION_NAME:0.0" "cd $PROJECT_ROOT" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🔧 Panel de Scripts y Comandos'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo 'Comandos útiles:'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  python3 tools/fix-test-types.py  # Fix errores de tests'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  npm run test:quick              # Tests rápidos'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  npm run build                    # Build del proyecto'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  npm run lint:fix                 # Fix linting'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '📝 Listo para ejecutar comandos...'" C-m

# Panel derecho (1): Logs y monitoreo
tmux select-pane -t "$SESSION_NAME:0.1"
tmux send-keys -t "$SESSION_NAME:0.1" "cd $PROJECT_ROOT" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '📊 Panel de Monitoreo y Logs'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Monitoreando errores de TypeScript...'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" C-m

# Crear script de monitoreo en el panel derecho
MONITOR_SCRIPT=$(cat <<'EOF'
# Monitoreo continuo de errores
while true; do
    clear
    echo "📊 AutoRenta - Monitor de Errores"
    echo "══════════════════════════════════════════════════════════"
    echo ""
    echo "🕐 $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Contar errores de TypeScript en tests
    echo "📋 Errores de TypeScript en tests:"
    if npm run test:quick 2>&1 | grep -q "ERROR"; then
        ERROR_COUNT=$(npm run test:quick 2>&1 | grep -E "TS[0-9]+" | wc -l)
        echo "   ⚠️  $ERROR_COUNT errores encontrados"
        echo ""
        echo "📊 Top 10 errores por tipo:"
        npm run test:quick 2>&1 | grep -E "TS[0-9]+" | grep -o "TS[0-9]*" | sort | uniq -c | sort -rn | head -10 | sed 's/^/   /'
    else
        echo "   ✅ Sin errores"
    fi
    
    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo "🔄 Actualizando en 30 segundos... (Ctrl+C para salir)"
    sleep 30
done
EOF
)

# Guardar script temporal y ejecutarlo en el panel derecho
TEMP_SCRIPT="/tmp/autorenta-monitor-$$.sh"
echo "$MONITOR_SCRIPT" > "$TEMP_SCRIPT"
chmod +x "$TEMP_SCRIPT"

# Opción 1: Ejecutar monitoreo automático
# tmux send-keys -t "$SESSION_NAME:0.1" "bash $TEMP_SCRIPT" C-m

# Opción 2: Mostrar comandos útiles para monitoreo manual
tmux send-keys -t "$SESSION_NAME:0.1" "echo 'Comandos de monitoreo:'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  npm run test:quick 2>&1 | grep TS | wc -l  # Contar errores'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  npm run test:quick 2>&1 | grep TS | grep -o \"TS[0-9]*\" | sort | uniq -c | sort -rn  # Top errores'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '  tail -f logs/*.log  # Ver logs en tiempo real'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo '💡 Ejecuta comandos arriba o presiona Ctrl+C para salir del loop'" C-m
tmux send-keys -t "$SESSION_NAME:0.1" "echo ''" C-m

# Configurar tamaños de paneles (50/50)
tmux select-layout -t "$SESSION_NAME:0" even-horizontal

# Seleccionar panel izquierdo por defecto
tmux select-pane -t "$SESSION_NAME:0.0"

# Configurar atajos útiles
tmux bind-key -n C-b send-prefix  # Permitir Ctrl+B como prefijo
tmux set-option -t "$SESSION_NAME" -g mouse on  # Habilitar mouse

# Crear ventana adicional para logs de build
tmux new-window -t "$SESSION_NAME" -n "logs" -c "$PROJECT_ROOT"
tmux send-keys -t "$SESSION_NAME:logs" "cd $PROJECT_ROOT" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo '📝 Ventana de Logs'" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo 'Comandos útiles:'" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo '  npm run build 2>&1 | tee build.log'" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo '  npm run test:quick 2>&1 | tee test.log'" C-m
tmux send-keys -t "$SESSION_NAME:logs" "echo '  tail -f build.log  # Ver build en tiempo real'" C-m

# Volver a la ventana principal
tmux select-window -t "$SESSION_NAME:0"

# Mostrar instrucciones
echo ""
echo -e "${GREEN}✅ Sesión tmux creada exitosamente!${NC}"
echo ""
echo -e "${BLUE}📋 Ventanas disponibles:${NC}"
echo -e "   ${YELLOW}0${NC}: Scripts (izq) | Monitoreo (der)"
echo -e "   ${YELLOW}1${NC}: Logs"
echo ""
echo -e "${BLUE}⌨️  Atajos útiles:${NC}"
echo -e "   ${YELLOW}Ctrl+B, C${NC}: Nueva ventana"
echo -e "   ${YELLOW}Ctrl+B, %${NC}: Dividir verticalmente"
echo -e "   ${YELLOW}Ctrl+B, \"${NC}: Dividir horizontalmente"
echo -e "   ${YELLOW}Ctrl+B, ←→↑↓${NC}: Navegar entre paneles"
echo -e "   ${YELLOW}Ctrl+B, D${NC}: Desconectar (mantiene sesión)"
echo -e "   ${YELLOW}Ctrl+B, X${NC}: Cerrar panel"
echo ""
echo -e "${GREEN}🚀 Conectando a la sesión...${NC}"
echo ""

# Conectar a la sesión
tmux attach-session -t "$SESSION_NAME"

