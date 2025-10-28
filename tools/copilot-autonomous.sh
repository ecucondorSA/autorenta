#!/bin/bash

# GitHub Copilot CLI - Modo Autónomo Extremo
# Este script ejecuta Copilot sin preguntar nada

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuración de directorios permitidos
ALLOWED_DIRS=(
    "$PROJECT_ROOT"
    "$HOME"
    "/tmp"
    "/var/tmp"
)

# Construir argumentos de directorios permitidos
DIR_ARGS=""
for dir in "${ALLOWED_DIRS[@]}"; do
    DIR_ARGS="$DIR_ARGS --add-dir $dir"
done

# Herramientas específicas a permitir (opcional, si no usas --allow-all-tools)
ALLOWED_TOOLS=(
    "write"
    "read"
    "shell(git:*)"
    "shell(npm:*)"
    "shell(pnpm:*)"
    "shell(node:*)"
    "shell(ng:*)"
    "shell(supabase:*)"
)

# Construir argumentos de herramientas permitidas
TOOL_ARGS=""
for tool in "${ALLOWED_TOOLS[@]}"; do
    TOOL_ARGS="$TOOL_ARGS --allow-tool '$tool'"
done

# Herramientas a denegar (comandos peligrosos)
DENIED_TOOLS=(
    "shell(rm -rf *)"
    "shell(git push --force)"
    "shell(chmod 777 *)"
)

DENY_ARGS=""
for tool in "${DENIED_TOOLS[@]}"; do
    DENY_ARGS="$DENY_ARGS --deny-tool '$tool'"
done

# Función principal para ejecutar Copilot en modo autónomo
run_autonomous_copilot() {
    local prompt="${1:-}"
    local model="${2:-claude-sonnet-4.5}"
    
    cd "$PROJECT_ROOT"
    
    if [ -n "$prompt" ]; then
        # Modo no interactivo con prompt
        echo "Ejecutando Copilot en modo autónomo con prompt: $prompt"
        copilot \
            --allow-all-tools \
            --allow-all-paths \
            --enable-all-github-mcp-tools \
            --model "$model" \
            --stream on \
            --prompt "$prompt" \
            $DIR_ARGS \
            $DENY_ARGS
    else
        # Modo interactivo autónomo
        echo "Iniciando Copilot en modo interactivo autónomo"
        copilot \
            --allow-all-tools \
            --allow-all-paths \
            --enable-all-github-mcp-tools \
            --model "$model" \
            --stream on \
            --banner \
            $DIR_ARGS \
            $DENY_ARGS
    fi
}

# Continuar sesión anterior en modo autónomo
continue_autonomous() {
    cd "$PROJECT_ROOT"
    
    echo "Continuando sesión anterior en modo autónomo"
    copilot \
        --continue \
        --allow-all-tools \
        --allow-all-paths \
        --enable-all-github-mcp-tools \
        --stream on \
        $DIR_ARGS \
        $DENY_ARGS
}

# Resumir sesión específica en modo autónomo
resume_autonomous() {
    local session_id="${1:-}"
    
    cd "$PROJECT_ROOT"
    
    if [ -n "$session_id" ]; then
        echo "Resumiendo sesión $session_id en modo autónomo"
        copilot \
            --resume "$session_id" \
            --allow-all-tools \
            --allow-all-paths \
            --enable-all-github-mcp-tools \
            --stream on \
            $DIR_ARGS \
            $DENY_ARGS
    else
        echo "Seleccionando sesión anterior para resumir"
        copilot \
            --resume \
            --allow-all-tools \
            --allow-all-paths \
            --enable-all-github-mcp-tools \
            --stream on \
            $DIR_ARGS \
            $DENY_ARGS
    fi
}

# Mostrar ayuda
show_help() {
    cat << EOF
GitHub Copilot CLI - Modo Autónomo Extremo

Uso: $0 <comando> [opciones]

Comandos:
    run [prompt]              Ejecutar en modo autónomo (interactivo u con prompt)
    continue                  Continuar sesión anterior
    resume [session_id]       Resumir sesión específica o elegir una
    help                      Mostrar esta ayuda

Opciones:
    --model <modelo>          Modelo a usar (default: claude-sonnet-4.5)
                              Opciones: claude-sonnet-4.5, claude-sonnet-4, 
                                       claude-haiku-4.5, gpt-5

Ejemplos:
    # Modo interactivo autónomo
    $0 run

    # Ejecutar un prompt específico
    $0 run "Crea un componente de login standalone"

    # Usar modelo específico
    $0 run "Refactoriza el servicio de auth" --model claude-sonnet-4

    # Continuar sesión anterior
    $0 continue

    # Resumir sesión
    $0 resume

    # Resumir sesión específica
    $0 resume abc123xyz

Características Habilitadas:
    ✅ --allow-all-tools              Todas las herramientas sin confirmación
    ✅ --allow-all-paths              Acceso a cualquier ruta
    ✅ --enable-all-github-mcp-tools  Todas las herramientas GitHub MCP
    ✅ Ejecución paralela de herramientas (habilitada por defecto)
    ✅ Streaming habilitado
    ✅ Modelo: claude-sonnet-4.5

Directorios Permitidos:
$(for dir in "${ALLOWED_DIRS[@]}"; do echo "    - $dir"; done)

Herramientas Denegadas (por seguridad):
$(for tool in "${DENIED_TOOLS[@]}"; do echo "    - $tool"; done)

Variables de Entorno:
    COPILOT_ALLOW_ALL=1       Permite todas las herramientas
    COPILOT_MODEL             Modelo por defecto

EOF
}

# Main
main() {
    local command="${1:-run}"
    shift || true
    
    # Exportar variable de entorno para modo autónomo
    export COPILOT_ALLOW_ALL=1
    
    case "$command" in
        run)
            local prompt=""
            local model="claude-sonnet-4.5"
            
            # Parsear argumentos
            while [[ $# -gt 0 ]]; do
                case $1 in
                    --model)
                        model="$2"
                        shift 2
                        ;;
                    *)
                        prompt="$1"
                        shift
                        ;;
                esac
            done
            
            run_autonomous_copilot "$prompt" "$model"
            ;;
        continue)
            continue_autonomous
            ;;
        resume)
            resume_autonomous "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "Comando desconocido: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
