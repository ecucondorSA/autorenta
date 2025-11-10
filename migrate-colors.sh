#!/bin/bash
#
# migrate-colors.sh - Migrar colores legacy a sistema de tokens
#
# Este script automatiza la migración de las 480+ violaciones de colores
# encontradas en el Visual Audit (Issue #184) al nuevo sistema de tokens (Issue #186).
#
# Uso:
#   ./migrate-colors.sh [opciones]
#
# Opciones:
#   --dry-run     Simular cambios sin modificar archivos
#   --no-backup   No crear backup antes de modificar
#   --path PATH   Migrar solo archivos en PATH (default: apps/web/src/app)
#
# Ejemplos:
#   ./migrate-colors.sh --dry-run                    # Ver qué se cambiaría
#   ./migrate-colors.sh --path apps/web/src/app/features/bookings  # Solo bookings
#   ./migrate-colors.sh                              # Migración completa
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_MAP="$SCRIPT_DIR/migration-map.txt"
DEFAULT_PATH="apps/web/src/app"
BACKUP_DIR="$SCRIPT_DIR/.migration-backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
NO_BACKUP=false
TARGET_PATH="$DEFAULT_PATH"

# Statistics
TOTAL_FILES=0
MODIFIED_FILES=0
TOTAL_REPLACEMENTS=0

# ============================================================================
# Functions
# ============================================================================

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

show_usage() {
  head -n 20 "$0" | grep "^#" | sed 's/^# //' | sed 's/^#//'
  exit 0
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --no-backup)
        NO_BACKUP=true
        shift
        ;;
      --path)
        TARGET_PATH="$2"
        shift 2
        ;;
      --help|-h)
        show_usage
        ;;
      *)
        log_error "Opción desconocida: $1"
        show_usage
        ;;
    esac
  done
}

# Create backup of files before migration
create_backup() {
  if [ "$NO_BACKUP" = true ]; then
    log_warning "Backup deshabilitado (--no-backup)"
    return
  fi

  log_info "Creando backup en: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"

  # Copy entire target directory to backup
  cp -r "$TARGET_PATH" "$BACKUP_DIR/"
  log_success "Backup creado"
}

# Build sed command from migration map
build_sed_command() {
  local sed_cmd=""

  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    [[ ! "$line" =~ → ]] && continue

    # Parse mapping: "old → new"
    local old_class=$(echo "$line" | sed 's/ *→.*$//')
    local new_class=$(echo "$line" | sed 's/^.*→ *//')

    # Skip if either is empty
    [[ -z "$old_class" ]] && continue
    [[ -z "$new_class" ]] && continue

    # Escape special characters for sed
    old_class_escaped=$(echo "$old_class" | sed 's/[.[\*^$/]/\\&/g')
    new_class_escaped=$(echo "$new_class" | sed 's/[.[\*^$/]/\\&/g')

    # Add to sed command (using | as delimiter to avoid issues with /)
    if [ -z "$sed_cmd" ]; then
      sed_cmd="s|$old_class_escaped|$new_class_escaped|g"
    else
      sed_cmd="$sed_cmd; s|$old_class_escaped|$new_class_escaped|g"
    fi
  done < "$MIGRATION_MAP"

  echo "$sed_cmd"
}

# Migrate all files
migrate_all_files() {
  if [ ! -f "$MIGRATION_MAP" ]; then
    log_error "Archivo de mapeo no encontrado: $MIGRATION_MAP"
    exit 1
  fi

  log_info "Construyendo comando de reemplazo..."
  local sed_cmd=$(build_sed_command)

  if [ -z "$sed_cmd" ]; then
    log_error "No se encontraron mapeos válidos"
    exit 1
  fi

  log_info "Buscando archivos en: $TARGET_PATH"

  # Find all .html, .ts, and .css files (excluding spec.ts)
  local files=$(find "$TARGET_PATH" -type f \( -name "*.html" -o -name "*.ts" -o -name "*.css" \) ! -name "*.spec.ts")

  TOTAL_FILES=$(echo "$files" | wc -l)
  log_success "Encontrados $TOTAL_FILES archivos"

  log_info "Iniciando migración..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "Modo DRY-RUN - no se modificarán archivos"
  fi

  local current=0
  while IFS= read -r file; do
    current=$((current + 1))

    # Show progress every 20 files
    if [ "$((current % 20))" -eq 0 ]; then
      log_info "Progreso: $current/$TOTAL_FILES archivos"
    fi

    # Check if file has any matches
    local matches=$(grep -E "text-(green|red|yellow|blue|gray|indigo|violet|amber)|bg-(green|red|yellow|blue|gray|indigo|violet|amber)|border-(green|red|yellow|blue|gray|indigo|violet|amber)" "$file" | wc -l || true)

    if [ "$matches" -gt 0 ]; then
      MODIFIED_FILES=$((MODIFIED_FILES + 1))
      TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + matches))

      # Apply replacement if not dry-run
      if [ "$DRY_RUN" = false ]; then
        sed -i "$sed_cmd" "$file"
      fi
    fi
  done <<< "$files"
}

# Show migration summary
show_summary() {
  echo ""
  echo "============================================================"
  log_info "Resumen de Migración"
  echo "============================================================"
  echo ""
  echo "  Archivos procesados:    $TOTAL_FILES"
  echo "  Archivos modificados:   $MODIFIED_FILES"
  echo "  Total de reemplazos:    ~$TOTAL_REPLACEMENTS líneas"
  echo ""

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY-RUN: Ningún archivo fue modificado"
    echo ""
    log_info "Para aplicar cambios, ejecuta sin --dry-run"
  else
    log_success "Migración completada exitosamente"

    if [ "$NO_BACKUP" = false ]; then
      echo ""
      log_info "Backup guardado en: $BACKUP_DIR"
    fi

    echo ""
    log_warning "IMPORTANTE: Revisar cambios antes de commit"
    echo ""
    log_info "Pasos siguientes:"
    echo "  1. git diff"
    echo "  2. npm run dev"
    echo "  3. Verificar visualmente"
  fi

  echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
  log_info "🎨 AutoRenta Color Migration Tool"
  echo ""

  # Parse arguments
  parse_args "$@"

  # Validate target path exists
  if [ ! -d "$TARGET_PATH" ]; then
    log_error "Directorio no encontrado: $TARGET_PATH"
    exit 1
  fi

  # Create backup (unless disabled or dry-run)
  if [ "$DRY_RUN" = false ]; then
    create_backup
  fi

  # Migrate all files
  migrate_all_files

  # Show summary
  show_summary
}

# Run main
main "$@"
