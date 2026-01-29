#!/bin/bash

# ============================================================================
# Reautenticación de Claude Code
# ============================================================================

set -euo pipefail

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

banner "🔐 Reautenticación de Claude Code"

# Verificar que Claude Code esté instalado
if ! command -v claude &> /dev/null; then
  error "Claude Code no está instalado. Instalar desde: https://claude.ai/code"
fi

log "Versión de Claude Code:"
claude --version

echo ""
log "Opciones de reauticación:"
echo ""
echo "1. Reautenticar con setup-token (recomendado)"
echo "2. Limpiar credenciales y reautenticar"
echo "3. Solo verificar estado actual"
echo ""
read -p "Selecciona una opción (1-3): " option

case $option in
  1)
    banner "Reautenticando con setup-token"
    log "Esto abrirá tu navegador para autenticarte..."
    log "Asegúrate de tener una suscripción activa de Claude"
    echo ""
    claude setup-token
    success "Reautenticación completada"
    ;;
    
  2)
    banner "Limpiando credenciales y reautenticando"
    
    # Backup de credenciales existentes
    if [ -f ~/.claude/.credentials.json ]; then
      log "Haciendo backup de credenciales existentes..."
      cp ~/.claude/.credentials.json ~/.claude/.credentials.json.backup.$(date +%Y%m%d-%H%M%S)
      success "Backup creado"
    fi
    
    # Limpiar credenciales (opcional - comentado por seguridad)
    # log "Eliminando credenciales existentes..."
    # rm -f ~/.claude/.credentials.json
    # success "Credenciales eliminadas"
    
    log "Iniciando reautenticación..."
    claude setup-token
    success "Reautenticación completada"
    ;;
    
  3)
    banner "Estado de autenticación"
    
    if [ -f ~/.claude/.credentials.json ]; then
      log "Archivo de credenciales encontrado:"
      ls -lh ~/.claude/.credentials.json
      echo ""
      log "Contenido (sin tokens sensibles):"
      cat ~/.claude/.credentials.json | jq 'del(.. | .accessToken? // empty)' 2>/dev/null || \
        cat ~/.claude/.credentials.json
    else
      warn "No se encontraron credenciales guardadas"
    fi
    
    echo ""
    log "Probando autenticación..."
    if claude -p "test" &> /dev/null; then
      success "Autenticación funcionando correctamente"
    else
      warn "Parece que hay un problema con la autenticación"
      log "Ejecuta 'claude setup-token' para reautenticarte"
    fi
    ;;
    
  *)
    error "Opción inválida"
    ;;
esac

echo ""
banner "✅ Proceso completado"

success "Reautenticación de Claude Code finalizada!"
