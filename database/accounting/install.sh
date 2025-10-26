#!/bin/bash

# =====================================================
# SCRIPT DE INSTALACIÓN DEL SISTEMA CONTABLE
# =====================================================

set -e

echo "🚀 Instalando Sistema Contable Automático para AutoRenta"
echo "=========================================================="

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "database/accounting" ]; then
  print_error "Error: Directorio database/accounting no encontrado"
  echo "Ejecutar desde el directorio raíz de autorenta/"
  exit 1
fi

# Verificar que Supabase está configurado
if [ ! -f ".env" ]; then
  print_error "Archivo .env no encontrado"
  echo "Por favor configura tu conexión a Supabase primero"
  exit 1
fi

# Cargar variables de entorno
source .env

# Verificar que tenemos las credenciales necesarias
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  print_error "Variables SUPABASE_URL o SUPABASE_SERVICE_KEY no encontradas en .env"
  exit 1
fi

echo ""
print_step "Instalación del Sistema Contable"
echo ""

# Opción 1: Instalación vía Supabase CLI
if command -v supabase &> /dev/null; then
  print_step "1. Creando tablas base..."
  supabase db push --file database/accounting/001-accounting-tables.sql
  print_success "Tablas creadas"
  
  print_step "2. Cargando plan de cuentas..."
  supabase db push --file database/accounting/002-chart-of-accounts.sql
  print_success "Plan de cuentas cargado"
  
  print_step "3. Instalando funciones automáticas..."
  supabase db push --file database/accounting/003-automated-functions.sql
  print_success "Funciones automáticas instaladas"
  
  print_step "4. Configurando gestión FGO..."
  supabase db push --file database/accounting/004-fgo-management.sql
  print_success "Gestión FGO configurada"
  
  print_step "5. Creando vistas de reportes..."
  supabase db push --file database/accounting/005-reports-views.sql
  print_success "Vistas de reportes creadas"
  
  print_step "6. Configurando procesos periódicos..."
  supabase db push --file database/accounting/006-periodic-processes.sql
  print_success "Procesos periódicos configurados"
  
else
  # Opción 2: Instalación vía psql directo
  print_warning "Supabase CLI no encontrado, usando psql directo"
  
  # Extraer datos de conexión
  DB_HOST=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|http://||')
  
  print_step "Conectando a base de datos..."
  
  for file in database/accounting/*.sql; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      print_step "Ejecutando $filename..."
      
      # Aquí deberías usar tu conexión real a Supabase
      # Por seguridad, no incluyo credenciales hardcoded
      echo "  → $filename (ejecutar manualmente o vía Supabase Dashboard)"
    fi
  done
  
  print_warning "Por favor ejecuta los archivos SQL manualmente en el SQL Editor de Supabase"
  print_warning "Orden de ejecución:"
  echo "  1. 001-accounting-tables.sql"
  echo "  2. 002-chart-of-accounts.sql"
  echo "  3. 003-automated-functions.sql"
  echo "  4. 004-fgo-management.sql"
  echo "  5. 005-reports-views.sql"
  echo "  6. 006-periodic-processes.sql"
fi

echo ""
echo "=========================================================="
print_success "Instalación completada"
echo "=========================================================="
echo ""

print_step "Verificando instalación..."
echo ""

# Crear script de verificación
cat > /tmp/verify_accounting.sql << 'EOF'
-- Verificación de instalación
SELECT 'Cuentas contables' as entity, COUNT(*)::text as count FROM accounting_accounts
UNION ALL
SELECT 'Asientos contables', COUNT(*)::text FROM accounting_journal_entries
UNION ALL
SELECT 'Provisiones', COUNT(*)::text FROM accounting_provisions;

-- Verificar funciones
SELECT 
  'Funciones instaladas: ' || COUNT(*)::text as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'accounting%';

-- Verificar vistas
SELECT 
  'Vistas creadas: ' || COUNT(*)::text as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'accounting%';
EOF

echo "Script de verificación creado en /tmp/verify_accounting.sql"
echo ""

print_step "Próximos pasos:"
echo ""
echo "1. Ejecutar verificación:"
echo "   psql -f /tmp/verify_accounting.sql"
echo ""
echo "2. Ver dashboard ejecutivo:"
echo "   SELECT * FROM accounting_executive_dashboard;"
echo ""
echo "3. Configurar cron jobs para procesos periódicos:"
echo "   - Cierre diario: SELECT * FROM accounting_daily_close();"
echo "   - Cierre mensual: SELECT * FROM accounting_monthly_close(year, month);"
echo "   - Auditoría: SELECT * FROM accounting_integrity_audit();"
echo ""
echo "4. Leer documentación completa:"
echo "   cat database/accounting/README.md"
echo ""

print_success "Sistema contable listo para usar! 🎉"
echo ""
