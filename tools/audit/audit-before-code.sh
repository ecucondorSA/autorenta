#!/bin/bash

################################################################################
# AUDIT BEFORE CODE
#
# Herramienta para ejecutar auditoría rápida antes de escribir código
# Verifica seguridad, RLS policies, y performance de tablas que vas a usar
#
# Uso:
#   ./tools/audit-before-code.sh                    # Auditoría completa
#   ./tools/audit-before-code.sh wallet_transactions  # Auditar tabla específica
#   ./tools/audit-before-code.sh --security           # Solo SECURITY_DEFINER
#   ./tools/audit-before-code.sh --rls                # Solo RLS policies
#   ./tools/audit-before-code.sh --performance        # Solo performance
################################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flag variables
AUDIT_SECURITY=false
AUDIT_RLS=false
AUDIT_PERFORMANCE=false
TABLE_NAME=""
FULL_AUDIT=false

# Parse arguments
if [ $# -eq 0 ]; then
  FULL_AUDIT=true
else
  case "$1" in
    --security)
      AUDIT_SECURITY=true
      ;;
    --rls)
      AUDIT_RLS=true
      ;;
    --performance)
      AUDIT_PERFORMANCE=true
      ;;
    --help|-h)
      echo "Uso: ./tools/audit-before-code.sh [tabla|opción]"
      echo ""
      echo "Opciones:"
      echo "  (sin argumentos)           Ejecutar auditoría completa"
      echo "  [nombre_tabla]             Auditar tabla específica"
      echo "  --security                 Solo auditar SECURITY_DEFINER functions"
      echo "  --rls                      Solo auditar RLS policies"
      echo "  --performance              Solo auditar performance (seq_scans)"
      echo "  --help, -h                 Mostrar esta ayuda"
      echo ""
      echo "Ejemplos:"
      echo "  ./tools/audit-before-code.sh"
      echo "  ./tools/audit-before-code.sh wallet_transactions"
      echo "  ./tools/audit-before-code.sh --security"
      exit 0
      ;;
    *)
      TABLE_NAME="$1"
      AUDIT_RLS=true
      ;;
  esac
fi

# If full audit
if [ "$FULL_AUDIT" = true ]; then
  AUDIT_SECURITY=true
  AUDIT_RLS=true
  AUDIT_PERFORMANCE=true
fi

# Helper functions
print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
  echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Check if MCP server is available
check_mcp_server() {
  print_section "Verificando disponibilidad del MCP server..."

  # Try to connect to MCP via Claude
  if command -v claude &> /dev/null; then
    print_success "Claude Code disponible"
    return 0
  else
    print_warning "Claude Code no disponible. Usa: @autorenta-platform en Claude Code"
    return 1
  fi
}

# Function to generate audit report
generate_audit_report() {
  print_header "AUDITORÍA COMPLETA DE SUPABASE"

  cat << 'EOF'

Para obtener un reporte completo, ejecuta en Claude Code:

  @autorenta-platform Genera reporte de auditoría completo

Esto te mostrará:
  • Funciones SECURITY_DEFINER por nivel de riesgo
  • Tablas sin RLS policies
  • Tablas con seq_scans altos
  • Acciones prioritarias y esfuerzo estimado

EOF
}

# Function to audit specific table RLS
audit_table_rls() {
  local table=$1
  print_header "AUDITORÍA DE RLS: $table"

  cat << EOF

Para auditar RLS en la tabla '$table', ejecuta en Claude Code:

  @autorenta-platform Audita RLS para $table

Si la tabla no tiene RLS, generará boilerplate:

  @autorenta-platform Genera RLS policies para $table

EOF
}

# Function to audit performance
audit_performance() {
  print_header "AUDITORÍA DE PERFORMANCE"

  cat << 'EOF'

Para analizar sequential scans altos, ejecuta en Claude Code:

  @autorenta-platform Analiza performance

Esto identifica tablas con seq_scans críticos.

Para generar índices de optimización:

  @autorenta-platform Genera índices para [nombre_tabla]

EOF
}

# Function to audit SECURITY_DEFINER
audit_security_definer() {
  print_header "AUDITORÍA DE SECURITY_DEFINER FUNCTIONS"

  cat << 'EOF'

Para auditar funciones SECURITY_DEFINER críticas, ejecuta en Claude Code:

  @autorenta-platform Audita funciones SECURITY_DEFINER con riesgo crítico

Esto lista funciones que requieren auditoría de privilegios.

EOF
}

# Generate development checklist
generate_checklist() {
  print_header "CHECKLIST DE DESARROLLO SEGURO"

  cat << 'EOF'

Antes de escribir código para una nueva tabla:

  ☐ Verificar RLS policies
    @autorenta-platform Audita RLS para [tabla]

  ☐ Si no tiene RLS, crear policies
    @autorenta-platform Genera RLS policies para [tabla]

  ☐ Aplicar SQL en Supabase
    (Copiar SQL generado → Supabase SQL Editor)

  ☐ Sincronizar tipos
    npm run sync:types

  ☐ Verificar performance
    @autorenta-platform Analiza performance

  ☐ Si hay seq_scans altos, crear índices
    @autorenta-platform Genera índices para [tabla]

  ✓ Ahora SÍ puedes escribir código seguro

EOF
}

# Main execution
main() {
  print_header "HERRAMIENTA DE AUDITORÍA PRE-CÓDIGO"

  print_section "AutoRenta Database Security & Performance Audit Tool"

  echo "Esta herramienta te ayuda a validar seguridad y performance"
  echo "antes de escribir código."
  echo ""

  # Determine what to audit
  if [ ! -z "$TABLE_NAME" ]; then
    # Audit specific table
    audit_table_rls "$TABLE_NAME"
    generate_checklist
  elif [ "$AUDIT_SECURITY" = true ] && [ "$AUDIT_RLS" = false ] && [ "$AUDIT_PERFORMANCE" = false ]; then
    # Security only
    audit_security_definer
  elif [ "$AUDIT_RLS" = true ] && [ "$AUDIT_SECURITY" = false ] && [ "$AUDIT_PERFORMANCE" = false ]; then
    # RLS only
    audit_table_rls "all"
  elif [ "$AUDIT_PERFORMANCE" = true ] && [ "$AUDIT_SECURITY" = false ] && [ "$AUDIT_RLS" = false ]; then
    # Performance only
    audit_performance
  else
    # Full audit
    audit_security_definer
    audit_table_rls "all"
    audit_performance
    generate_checklist
  fi

  print_section "Próximos pasos"
  echo ""
  echo "1. Abre Claude Code (@autorenta-platform)"
  echo "2. Copia el comando que aparece arriba"
  echo "3. Revisa los resultados"
  echo "4. Aplica las recomendaciones"
  echo "5. Escribe código seguro ✓"
  echo ""
  echo "Para más información, ver:"
  echo "  • mcp-server/QUICK_START_AUDIT.md"
  echo "  • mcp-server/AUDIT_MODULE.md"
  echo ""
}

# Run main
main
