#!/bin/bash

# ============================================================================
# Script para cambiar Claude Code de API Usage Billing a Suscripción
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

banner "🔄 Cambiar Claude Code a Modo Suscripción"

log "Este script te ayudará a cambiar de 'API Usage Billing' a modo Suscripción"

# 1. Verificar variables problemáticas
banner "1️⃣  Verificando Variables de Entorno"

if [ -n "${CLAUDE_CODE_USE_VERTEX:-}" ]; then
  warn "CLAUDE_CODE_USE_VERTEX está configurado: $CLAUDE_CODE_USE_VERTEX"
  warn "Esto puede estar causando 'API Usage Billing'"
  log "Se eliminará esta variable"
else
  success "CLAUDE_CODE_USE_VERTEX no está configurado"
fi

# 2. Limpiar variables problemáticas
banner "2️⃣  Limpiando Variables Problemáticas"

# Eliminar de .bashrc
if grep -q "CLAUDE_CODE_USE_VERTEX" ~/.bashrc 2>/dev/null; then
  log "Eliminando CLAUDE_CODE_USE_VERTEX de ~/.bashrc"
  sed -i '/CLAUDE_CODE_USE_VERTEX/d' ~/.bashrc
  success "Eliminado de ~/.bashrc"
else
  log "CLAUDE_CODE_USE_VERTEX no encontrado en ~/.bashrc"
fi

# Unset en sesión actual
unset CLAUDE_CODE_USE_VERTEX 2>/dev/null || true
success "Variable eliminada de sesión actual"

# 3. Verificar token OAuth
banner "3️⃣  Verificando Token OAuth"

if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  TOKEN_PREFIX=$(echo $CLAUDE_CODE_OAUTH_TOKEN | cut -d'-' -f1-3)
  if [[ "$TOKEN_PREFIX" == "sk-ant-oat01" ]]; then
    success "Token OAuth correcto: $TOKEN_PREFIX... (Suscripción)"
  else
    warn "Token con prefijo inesperado: $TOKEN_PREFIX"
  fi
else
  warn "Token OAuth no está cargado"
  log "Se cargará desde ~/.bashrc"
  source ~/.bashrc 2>/dev/null || true
fi

# 4. Instrucciones para logout y reautenticación
banner "4️⃣  Próximos Pasos"

echo ""
log "Para completar el cambio a Suscripción:"
echo ""
echo "1. En Claude Code actual, ejecuta:"
echo "   ${YELLOW}/logout${NC}"
echo ""
echo "2. Cierra Claude Code (Ctrl+C)"
echo ""
echo "3. Actualiza Claude Code:"
echo "   ${YELLOW}claude update${NC}"
echo ""
echo "4. Reinicia tu terminal (o ejecuta):"
echo "   ${YELLOW}source ~/.bashrc${NC}"
echo ""
echo "5. Reautentica con suscripción:"
echo "   ${YELLOW}claude setup-token${NC}"
echo ""
echo "6. Inicia Claude Code:"
echo "   ${YELLOW}claude${NC}"
echo ""
warn "IMPORTANTE: Asegúrate de estar logueado con tu cuenta de SUSCRIPCIÓN"
echo "            (no con una cuenta que tenga solo API keys)"
echo ""

banner "✅ Preparación Completada"

success "Variables problemáticas eliminadas"
success "Sigue los pasos arriba para completar el cambio"
