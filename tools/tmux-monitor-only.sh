#!/bin/bash
# Script para crear solo el panel de monitoreo en tmux
# Útil para monitorear mientras se ejecutan scripts en otra terminal

SESSION_NAME="autorenta-monitor"

cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

# Si la sesión ya existe, conectarse
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    tmux attach-session -t "$SESSION_NAME"
    exit 0
fi

# Crear sesión de solo monitoreo
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# Script de monitoreo continuo
MONITOR_SCRIPT=$(cat <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

while true; do
    clear
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  📊 AutoRenta - Monitor de Errores y Tests              ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "🕐 $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Errores de TypeScript
    echo "📋 Errores de TypeScript en tests:"
    if cd "$PROJECT_ROOT" && npm run test:quick 2>&1 | grep -q "ERROR"; then
        ERROR_OUTPUT=$(cd "$PROJECT_ROOT" && npm run test:quick 2>&1)
        ERROR_COUNT=$(echo "$ERROR_OUTPUT" | grep -E "TS[0-9]+" | wc -l)
        echo "   ⚠️  $ERROR_COUNT errores encontrados"
        echo ""
        echo "📊 Top 10 errores por tipo:"
        echo "$ERROR_OUTPUT" | grep -E "TS[0-9]+" | grep -o "TS[0-9]*" | sort | uniq -c | sort -rn | head -10 | sed 's/^/   /'
        echo ""
        echo "📄 Últimos 5 errores:"
        echo "$ERROR_OUTPUT" | grep -E "TS[0-9]+" | head -5 | sed 's/^/   /'
    else
        echo "   ✅ Sin errores de TypeScript"
    fi
    
    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo "🔄 Actualizando en 30 segundos... (Ctrl+C para salir)"
    sleep 30
done
EOF
)

# Ejecutar monitoreo
tmux send-keys -t "$SESSION_NAME:0" "cd $PROJECT_ROOT" C-m
tmux send-keys -t "$SESSION_NAME:0" "$MONITOR_SCRIPT" C-m

echo "✅ Sesión de monitoreo creada: $SESSION_NAME"
echo "🚀 Conectando..."
tmux attach-session -t "$SESSION_NAME"

