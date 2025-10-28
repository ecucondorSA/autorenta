#!/bin/bash

# Aliases para GitHub Copilot CLI - Modo Autónomo
# Agregar a ~/.bashrc o ~/.zshrc: source /home/edu/autorenta/.copilot-aliases.sh

# Directorio del proyecto
export AUTORENTA_ROOT="/home/edu/autorenta"

# Habilitar modo autónomo por defecto
export COPILOT_ALLOW_ALL=1

# Alias principal - Copilot autónomo completo
alias pv='cd "$AUTORENTA_ROOT" && copilot --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --model claude-sonnet-4.5 --stream on --banner'

# Alias con prompt directo
alias pvp='cd "$AUTORENTA_ROOT" && copilot --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --model claude-sonnet-4.5 --stream on -p'

# Alias para continuar
alias pvc='cd "$AUTORENTA_ROOT" && copilot --continue --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --stream on'

# Alias para resumir
alias pvr='cd "$AUTORENTA_ROOT" && copilot --resume --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --stream on'

# Alias con diferentes modelos
alias pv-sonnet='cd "$AUTORENTA_ROOT" && copilot --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --model claude-sonnet-4.5 --stream on'
alias pv-haiku='cd "$AUTORENTA_ROOT" && copilot --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --model claude-haiku-4.5 --stream on'
alias pv-gpt='cd "$AUTORENTA_ROOT" && copilot --allow-all-tools --allow-all-paths --enable-all-github-mcp-tools --model gpt-5 --stream on'

# Alias para script personalizado
alias pva="$AUTORENTA_ROOT/tools/copilot-autonomous.sh"

# Función para ejecutar Copilot con prompt rápido
pvq() {
    cd "$AUTORENTA_ROOT"
    copilot \
        --allow-all-tools \
        --allow-all-paths \
        --enable-all-github-mcp-tools \
        --model claude-sonnet-4.5 \
        --stream on \
        -p "$*"
}

# Función para Copilot con configuración de directorios
pvd() {
    cd "$AUTORENTA_ROOT"
    copilot \
        --allow-all-tools \
        --allow-all-paths \
        --enable-all-github-mcp-tools \
        --add-dir "$AUTORENTA_ROOT" \
        --add-dir "$HOME" \
        --add-dir "/tmp" \
        --model claude-sonnet-4.5 \
        --stream on \
        --banner
}

# Función para tareas específicas del proyecto
pv-dev() {
    pvq "Ayúdame con el desarrollo: $*"
}

pv-fix() {
    pvq "Arregla este problema: $*"
}

pv-create() {
    pvq "Crea: $*"
}

pv-refactor() {
    pvq "Refactoriza: $*"
}

pv-test() {
    pvq "Crea tests para: $*"
}

pv-debug() {
    pvq "Debug este problema: $*"
}

# Mostrar ayuda de aliases
pv-help() {
    cat << 'EOF'
🤖 GitHub Copilot CLI - Aliases Autónomos

Aliases Principales:
  pv                Copilot autónomo interactivo
  pvp "<prompt>"    Copilot con prompt directo
  pvc               Continuar sesión anterior
  pvr               Resumir sesión previa
  pvq "<prompt>"    Quick prompt (función)

Modelos Específicos:
  pv-sonnet         Claude Sonnet 4.5 (default)
  pv-haiku          Claude Haiku 4.5 (más rápido)
  pv-gpt            GPT-5

Script Personalizado:
  pva run           Modo interactivo
  pva run "<p>"     Con prompt
  pva continue      Continuar sesión
  pva resume        Resumir sesión

Funciones de Proyecto:
  pv-dev "<task>"       Desarrollo general
  pv-fix "<issue>"      Arreglar problemas
  pv-create "<what>"    Crear componentes/servicios
  pv-refactor "<what>"  Refactorizar código
  pv-test "<what>"      Crear tests
  pv-debug "<issue>"    Debug problemas

Ejemplos:
  # Modo interactivo
  pv

  # Prompt directo
  pvp "Crea un componente de login standalone"
  pvq "Añade validación al formulario de registro"

  # Continuar trabajando
  pvc

  # Tareas específicas
  pv-create "un servicio de autenticación con Supabase"
  pv-fix "el error de CORS en el API"
  pv-test "el componente de booking"

  # Con diferentes modelos
  pv-haiku  # Más rápido para tareas simples
  pv-gpt    # Para tareas muy complejas

Características:
  ✅ --allow-all-tools              Sin confirmaciones
  ✅ --allow-all-paths              Acceso total
  ✅ --enable-all-github-mcp-tools  Herramientas GitHub
  ✅ Ejecución paralela            Habilitada
  ✅ Streaming                     Habilitado

Variables de Entorno:
  COPILOT_ALLOW_ALL=1              Modo autónomo
  AUTORENTA_ROOT                   Directorio proyecto

EOF
}

# Mensaje de bienvenida (opcional, comentar si no se desea)
echo "🤖 GitHub Copilot CLI aliases cargados. Usa 'pv-help' para ver comandos disponibles."
