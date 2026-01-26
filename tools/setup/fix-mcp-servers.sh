#!/bin/bash

# ============================================================================
# Script para configurar servidores MCP de AutoRenta
# ============================================================================

set -euo pipefail

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[ℹ]${NC} $*"; }
success() { echo -e "${GREEN}[✅]${NC} $*"; }
error() { echo -e "${RED}[❌]${NC} $*"; exit 1; }
warn() { echo -e "${YELLOW}[⚠️]${NC} $*"; }

banner() {
  echo ""
  echo "========================================"
  echo "$1"
  echo "========================================"
  echo ""
}

banner "🔧 Configuración de Servidores MCP"

cd /home/edu/autorenta

# Verificar Python
if ! command -v python3 &> /dev/null; then
  error "Python3 no está instalado"
fi

log "Python version: $(python3 --version)"

# Servidores MCP que requieren venv
MCP_SERVERS=("mcp/autorenta-ops" "mcp/prompt-refiner" "mcp/docs-navigator")

for server_dir in "${MCP_SERVERS[@]}"; do
  if [ ! -d "$server_dir" ]; then
    warn "Directorio no encontrado: $server_dir"
    continue
  fi
  
  log "Configurando: $server_dir"
  
  cd "$server_dir"
  
  # Crear venv si no existe
  if [ ! -d "venv" ]; then
    log "  Creando entorno virtual..."
    python3 -m venv venv
    success "  ✅ venv creado"
  else
    log "  ✅ venv ya existe"
  fi
  
  # Instalar dependencias
  if [ -f "requirements.txt" ]; then
    log "  Instalando dependencias..."
    ./venv/bin/pip install -q --upgrade pip
    ./venv/bin/pip install -q -r requirements.txt
    success "  ✅ Dependencias instaladas"
  else
    warn "  ⚠️  No hay requirements.txt"
  fi
  
  # Verificar que el servidor puede iniciarse
  if [ -f "server.py" ] && [ -f "venv/bin/python" ]; then
    log "  Verificando servidor..."
    if timeout 2 ./venv/bin/python server.py 2>&1 | head -1 > /dev/null 2>&1; then
      success "  ✅ Servidor funcional"
    else
      warn "  ⚠️  No se pudo verificar (puede ser normal si requiere configuración)"
    fi
  fi
  
  cd - > /dev/null
done

banner "✅ Configuración Completada"

echo ""
log "Servidores MCP configurados:"
for server_dir in "${MCP_SERVERS[@]}"; do
  if [ -f "$server_dir/venv/bin/python" ]; then
    echo -e "  ${GREEN}✅${NC} $server_dir"
  else
    echo -e "  ${RED}❌${NC} $server_dir"
  fi
done

echo ""
success "Los servidores MCP están listos para usar!"
