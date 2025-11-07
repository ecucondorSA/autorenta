#!/bin/bash
# ============================================================================
# Setup Persistent Authentication for GitHub, Supabase, Cloudflare
# Configura login persistente para no pedir credenciales constantemente
# ============================================================================

set -euo pipefail

# Colors
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

# ============================================================================
# 1. GitHub CLI
# ============================================================================

banner "🔐 1/3: GitHub CLI Authentication"

if ! command -v gh &> /dev/null; then
  error "GitHub CLI (gh) no está instalado. Instalar: https://cli.github.com/"
fi

log "Verificando autenticación GitHub..."
if gh auth status &> /dev/null; then
  success "GitHub CLI ya está autenticado"
  gh auth status
else
  log "Iniciando login de GitHub..."
  gh auth login
  success "GitHub CLI autenticado correctamente"
fi

# Verificar acceso al repo
log "Verificando acceso al repositorio..."
if gh repo view &> /dev/null; then
  success "Acceso al repositorio confirmado"
else
  warn "No se pudo verificar acceso al repo. Ejecutar manualmente: gh repo view"
fi

# ============================================================================
# 2. Supabase CLI
# ============================================================================

banner "🔐 2/3: Supabase CLI Authentication"

if ! command -v supabase &> /dev/null; then
  warn "Supabase CLI no está instalado."
  log "Instalar con: npm install -g supabase"
  log "O seguir instrucciones: https://supabase.com/docs/reference/cli/installing-the-cli"
  read -p "¿Continuar sin Supabase CLI? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  log "Verificando autenticación Supabase..."
  
  # Verificar si está autenticado
  if supabase projects list &> /dev/null; then
    success "Supabase CLI ya está autenticado"
    log "Proyectos disponibles:"
    supabase projects list
  else
    log "Iniciando login de Supabase..."
    log "Esto abrirá tu navegador para autenticación..."
    supabase login
    
    if supabase projects list &> /dev/null; then
      success "Supabase CLI autenticado correctamente"
      
      # Link al proyecto si existe .supabase/config.toml
      if [ -f ".supabase/config.toml" ]; then
        log "Verificando link al proyecto..."
        PROJECT_REF=$(grep -E '^project_id' .supabase/config.toml | cut -d '"' -f 2 || echo "")
        if [ -n "$PROJECT_REF" ]; then
          log "Proyecto configurado: $PROJECT_REF"
          supabase link --project-ref "$PROJECT_REF" || warn "No se pudo linkear proyecto automáticamente"
        fi
      fi
    else
      error "Falló la autenticación de Supabase"
    fi
  fi
fi

# ============================================================================
# 3. Cloudflare Wrangler
# ============================================================================

banner "🔐 3/3: Cloudflare Wrangler Authentication"

if ! command -v wrangler &> /dev/null; then
  warn "Wrangler CLI no está instalado."
  log "Instalar con: npm install -g wrangler"
  read -p "¿Continuar sin Wrangler? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  log "Verificando autenticación Cloudflare..."
  
  # Verificar si está autenticado
  if wrangler whoami &> /dev/null; then
    success "Cloudflare Wrangler ya está autenticado"
    log "Información de cuenta:"
    wrangler whoami
  else
    log "Iniciando login de Cloudflare..."
    log "Esto abrirá tu navegador para autenticación..."
    wrangler login
    
    if wrangler whoami &> /dev/null; then
      success "Cloudflare Wrangler autenticado correctamente"
      wrangler whoami
    else
      error "Falló la autenticación de Cloudflare"
    fi
  fi
fi

# ============================================================================
# Resumen Final
# ============================================================================

banner "✅ Setup Completado"

echo ""
echo "Estado de autenticación:"
echo ""

# GitHub
if gh auth status &> /dev/null; then
  echo -e "${GREEN}✅${NC} GitHub CLI: Autenticado"
  gh auth status --show-token 2>/dev/null | head -n 1 || echo "   (token guardado)"
else
  echo -e "${RED}❌${NC} GitHub CLI: No autenticado"
fi

# Supabase
if command -v supabase &> /dev/null && supabase projects list &> /dev/null; then
  echo -e "${GREEN}✅${NC} Supabase CLI: Autenticado"
else
  echo -e "${YELLOW}⚠️${NC} Supabase CLI: No disponible o no autenticado"
fi

# Cloudflare
if command -v wrangler &> /dev/null && wrangler whoami &> /dev/null; then
  echo -e "${GREEN}✅${NC} Cloudflare Wrangler: Autenticado"
else
  echo -e "${YELLOW}⚠️${NC} Cloudflare Wrangler: No disponible o no autenticado"
fi

echo ""
echo "========================================"
echo "Las credenciales están guardadas localmente"
echo "No necesitarás autenticarte de nuevo"
echo "========================================"
echo ""

success "Setup de autenticación completado!"











