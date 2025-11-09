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

# Ejecutar monitoreo
tmux send-keys -t "$SESSION_NAME:0" "cd $PROJECT_ROOT" C-m
tmux send-keys -t "$SESSION_NAME:0" "clear" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo '📊 AutoRenta - Monitor de Errores'" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo 'Ejecutando monitoreo continuo...'" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo 'Presiona Ctrl+C para detener'" C-m
tmux send-keys -t "$SESSION_NAME:0" "echo ''" C-m
tmux send-keys -t "$SESSION_NAME:0" "while true; do clear; echo '╔══════════════════════════════════════════════════════════╗'; echo '║  📊 AutoRenta - Monitor de Errores y Tests              ║'; echo '╚══════════════════════════════════════════════════════════╝'; echo ''; echo \"🕐 \$(date '+%Y-%m-%d %H:%M:%S')\"; echo ''; echo '📋 Errores de TypeScript en tests:'; ERROR_OUTPUT=\$(npm run test:quick 2>&1); if echo \"\$ERROR_OUTPUT\" | grep -q 'ERROR'; then ERROR_COUNT=\$(echo \"\$ERROR_OUTPUT\" | grep -E 'TS[0-9]+' | wc -l); echo \"   ⚠️  \$ERROR_COUNT errores encontrados\"; echo ''; echo '📊 Top 10 errores por tipo:'; echo \"\$ERROR_OUTPUT\" | grep -E 'TS[0-9]+' | grep -o 'TS[0-9]*' | sort | uniq -c | sort -rn | head -10 | sed 's/^/   /'; echo ''; echo '📄 Últimos 5 errores:'; echo \"\$ERROR_OUTPUT\" | grep -E 'TS[0-9]+' | head -5 | sed 's/^/   /'; else echo '   ✅ Sin errores de TypeScript'; fi; echo ''; echo '══════════════════════════════════════════════════════════'; echo '🔄 Actualizando en 30 segundos... (Ctrl+C para salir)'; sleep 30; done" C-m

echo "✅ Sesión de monitoreo creada: $SESSION_NAME"
echo "🚀 Conectando..."
tmux attach-session -t "$SESSION_NAME"

