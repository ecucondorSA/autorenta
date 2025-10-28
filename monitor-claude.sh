#!/bin/bash
# Monitor script for Claude Code non-interactive session
# Checks file changes, process status, and updates copilot-claudecode.md with corrections

PROJECT_DIR="/home/edu/autorenta"
CONTROL_FILE="$PROJECT_DIR/copilot-claudecode.md"
MONITOR_LOG="$PROJECT_DIR/.claude-monitor.log"
CHECK_INTERVAL=5 # seconds

echo "🔍 Claude Code Monitor Started - $(date)" | tee -a "$MONITOR_LOG"
echo "Project: $PROJECT_DIR" | tee -a "$MONITOR_LOG"
echo "Control file: $CONTROL_FILE" | tee -a "$MONITOR_LOG"
echo "---" | tee -a "$MONITOR_LOG"

# Función para detectar cambios en archivos
check_file_changes() {
    local changes=$(cd "$PROJECT_DIR" && git status --short 2>/dev/null | head -20)
    if [ -n "$changes" ]; then
        echo "[$(date +%H:%M:%S)] 📝 Changes detected:" | tee -a "$MONITOR_LOG"
        echo "$changes" | tee -a "$MONITOR_LOG"
        echo "" >> "$MONITOR_LOG"
    fi
}

# Función para verificar procesos claude
check_claude_process() {
    local claude_pids=$(pgrep -f "claude" | tr '\n' ' ')
    if [ -n "$claude_pids" ]; then
        echo "[$(date +%H:%M:%S)] ⚙️  Claude process(es): $claude_pids" | tee -a "$MONITOR_LOG"
    else
        echo "[$(date +%H:%M:%S)] ⚠️  No Claude process detected" | tee -a "$MONITOR_LOG"
    fi
}

# Función para verificar archivos creados/modificados en últimos 2 minutos
check_recent_files() {
    local recent=$(find "$PROJECT_DIR/docs" "$PROJECT_DIR/config" -type f -mmin -2 2>/dev/null)
    if [ -n "$recent" ]; then
        echo "[$(date +%H:%M:%S)] 🆕 Recently modified files:" | tee -a "$MONITOR_LOG"
        echo "$recent" | while read file; do
            local size=$(du -h "$file" | cut -f1)
            echo "  - $file ($size)" | tee -a "$MONITOR_LOG"
        done
        echo "" >> "$MONITOR_LOG"
    fi
}

# Función para validar SPEC documents creados
validate_specs() {
    local spec_dir="$PROJECT_DIR/docs/technical-specs"
    if [ -d "$spec_dir" ]; then
        local spec_count=$(ls -1 "$spec_dir"/*.md 2>/dev/null | wc -l)
        echo "[$(date +%H:%M:%S)] 📋 Technical specs: $spec_count/5 created" | tee -a "$MONITOR_LOG"
        
        # Verificar estructura de cada spec
        for spec in "$spec_dir"/*.md; do
            if [ -f "$spec" ]; then
                local has_problem=$(grep -q "## Problema Actual" "$spec" && echo "✓" || echo "✗")
                local has_solution=$(grep -q "## Solución Propuesta" "$spec" && echo "✓" || echo "✗")
                local has_tests=$(grep -q "## Tests" "$spec" && echo "✓" || echo "✗")
                echo "  $(basename "$spec"): Problem:$has_problem Solution:$has_solution Tests:$has_tests" | tee -a "$MONITOR_LOG"
            fi
        done
        echo "" >> "$MONITOR_LOG"
    fi
}

# Función para detectar errores en logs de tmux
check_tmux_output() {
    if tmux has-session -t claude-session 2>/dev/null; then
        local recent_output=$(tmux capture-pane -t claude-session -p -S -50 2>/dev/null | tail -20)
        
        # Buscar errores comunes
        if echo "$recent_output" | grep -qi "error\|failed\|exception"; then
            echo "[$(date +%H:%M:%S)] ⚠️  Possible error in Claude session:" | tee -a "$MONITOR_LOG"
            echo "$recent_output" | grep -i "error\|failed\|exception" | tee -a "$MONITOR_LOG"
            echo "" >> "$MONITOR_LOG"
            
            # Agregar corrección al control file
            add_correction "Detected error in Claude session output"
        fi
    fi
}

# Función para agregar corrección al control file
add_correction() {
    local issue="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat >> "$CONTROL_FILE" << EOF

## ⚠️ CORRECCIÓN REQUERIDA [$timestamp]

**Detectado por**: Monitor automático
**Problema**: $issue
**Acción requerida**: Revisar logs y corregir el error antes de continuar

EOF
    
    echo "[$(date +%H:%M:%S)] 🚨 Correction added to control file" | tee -a "$MONITOR_LOG"
}

# Función para generar resumen de progreso
generate_progress_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$MONITOR_LOG"
    echo "[$(date +%H:%M:%S)] 📊 PROGRESS SUMMARY" | tee -a "$MONITOR_LOG"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$MONITOR_LOG"
    
    # Fase 1
    local phase1_done=$(grep -c "✅ 1\." "$CONTROL_FILE" 2>/dev/null || echo 0)
    echo "Phase 1 (Docs & Secrets): ✅ Complete ($phase1_done tasks)" | tee -a "$MONITOR_LOG"
    
    # Fase 2
    local specs_created=$(ls -1 "$PROJECT_DIR/docs/technical-specs"/*.md 2>/dev/null | wc -l)
    echo "Phase 2A (Tech Specs): $specs_created/5 specs created" | tee -a "$MONITOR_LOG"
    
    # Git status
    local uncommitted=$(cd "$PROJECT_DIR" && git status --short 2>/dev/null | wc -l)
    echo "Git: $uncommitted uncommitted changes" | tee -a "$MONITOR_LOG"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$MONITOR_LOG"
    echo ""
}

# Función para verificar integridad de archivos críticos
check_critical_files() {
    local critical_files=(
        "docs/FASE_1_COMPLETADA.md"
        "docs/PRODUCTION_READINESS_BASELINE.md"
        "docs/SECURITY_AUDIT.md"
        "QUICK_START.md"
        "PRODUCTION_ROADMAP_CONSOLIDATED.md"
    )
    
    local missing=0
    for file in "${critical_files[@]}"; do
        if [ ! -f "$PROJECT_DIR/$file" ]; then
            echo "[$(date +%H:%M:%S)] ❌ Missing: $file" | tee -a "$MONITOR_LOG"
            missing=$((missing + 1))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        echo "[$(date +%H:%M:%S)] ✅ All critical files present" | tee -a "$MONITOR_LOG"
    fi
}

# Main monitoring loop
iteration=0
while true; do
    iteration=$((iteration + 1))
    
    # Cada iteración (5s): Check básico
    check_claude_process
    
    # Cada 3 iteraciones (15s): Check archivos recientes
    if [ $((iteration % 3)) -eq 0 ]; then
        check_recent_files
        check_file_changes
    fi
    
    # Cada 6 iteraciones (30s): Validaciones profundas
    if [ $((iteration % 6)) -eq 0 ]; then
        validate_specs
        check_tmux_output
        check_critical_files
    fi
    
    # Cada 12 iteraciones (60s): Resumen de progreso
    if [ $((iteration % 12)) -eq 0 ]; then
        generate_progress_summary
    fi
    
    # Sleep
    sleep "$CHECK_INTERVAL"
    
    # Break condition: Si el control file tiene "FASE 2A COMPLETA"
    if grep -q "FASE 2A COMPLETA" "$CONTROL_FILE" 2>/dev/null; then
        echo ""
        echo "✅ Phase 2A marked as complete. Monitor stopping." | tee -a "$MONITOR_LOG"
        generate_progress_summary
        break
    fi
done

echo ""
echo "🏁 Monitor stopped - $(date)" | tee -a "$MONITOR_LOG"
