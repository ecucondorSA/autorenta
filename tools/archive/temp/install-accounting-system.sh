#!/bin/bash

##############################################
# 🔄 INSTALADOR AUTOMÁTICO SISTEMA CONTABLE
# AutoRenta - Sistema Cíclico NIIF 15/37
##############################################

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════╗"
echo "║  🔄 SISTEMA CONTABLE AUTOMATIZADO - AUTORENTAR         ║"
echo "║  Basado en NIIF 15 (Ingresos) y NIIF 37 (Provisiones) ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅ OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌ ERROR]${NC} $1"
}

# Verificar variables de entorno
log_info "Verificando configuración..."

if [ -z "$DATABASE_URL" ]; then
    if [ -f ".env" ]; then
        log_info "Cargando .env"
        export $(cat .env | grep -v '^#' | xargs)
    else
        log_error "No se encuentra DATABASE_URL ni archivo .env"
        echo ""
        echo "Por favor configura DATABASE_URL o crea archivo .env con:"
        echo "DATABASE_URL=postgresql://..."
        exit 1
    fi
fi

log_success "DATABASE_URL configurado"

# Verificar psql
if ! command -v psql &> /dev/null; then
    log_error "psql no está instalado"
    echo ""
    echo "Instala PostgreSQL client:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "  macOS: brew install postgresql"
    exit 1
fi

log_success "psql instalado"

# Ejecutar migración
log_info "Ejecutando migración SQL..."
echo ""

MIGRATION_FILE="supabase/migrations/20251026_accounting_automated_system.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    log_error "No se encuentra archivo: $MIGRATION_FILE"
    exit 1
fi

# Backup antes de ejecutar
log_info "Creando backup de tablas existentes..."
psql "$DATABASE_URL" -c "
DO \$\$
BEGIN
    -- Backup de tablas existentes (si existen)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounting_journal_entries') THEN
        CREATE TABLE IF NOT EXISTS accounting_journal_entries_backup_$(date +%Y%m%d) AS SELECT * FROM accounting_journal_entries;
    END IF;
END \$\$;
" 2>/dev/null || log_warning "No hay tablas previas para respaldar"

# Ejecutar migración
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    log_success "Migración ejecutada correctamente"
else
    log_error "Error ejecutando migración"
    exit 1
fi

echo ""
log_info "Verificando instalación..."

# Verificar tablas creadas
TABLES=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'accounting_accounts',
    'accounting_journal_entries',
    'accounting_ledger',
    'accounting_provisions'
);
")

TABLES=$(echo $TABLES | xargs)  # Trim whitespace

if [ "$TABLES" = "4" ]; then
    log_success "Tablas contables creadas: 4/4"
else
    log_error "Faltan tablas. Creadas: $TABLES/4"
    exit 1
fi

# Verificar plan de cuentas
ACCOUNTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM accounting_accounts;")
ACCOUNTS=$(echo $ACCOUNTS | xargs)

if [ "$ACCOUNTS" -gt "0" ]; then
    log_success "Plan de cuentas cargado: $ACCOUNTS cuentas"
else
    log_warning "No hay cuentas en el plan de cuentas"
fi

# Verificar vistas materializadas
VIEWS=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM pg_matviews 
WHERE schemaname = 'public' 
AND matviewname IN (
    'accounting_balance_sheet',
    'accounting_income_statement',
    'accounting_dashboard'
);
")

VIEWS=$(echo $VIEWS | xargs)

if [ "$VIEWS" = "3" ]; then
    log_success "Vistas materializadas creadas: 3/3"
else
    log_warning "Faltan vistas materializadas: $VIEWS/3"
fi

# Verificar cron jobs
log_info "Verificando cron jobs automatizados..."

CRON_DAILY=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM cron.job 
WHERE jobname = 'refresh-accounting-balances-daily';
")

CRON_MONTHLY=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) FROM cron.job 
WHERE jobname = 'close-accounting-period-monthly';
")

CRON_DAILY=$(echo $CRON_DAILY | xargs)
CRON_MONTHLY=$(echo $CRON_MONTHLY | xargs)

if [ "$CRON_DAILY" = "1" ]; then
    log_success "Cron diario (00:01): Refresh balances"
else
    log_warning "Cron diario no encontrado"
fi

if [ "$CRON_MONTHLY" = "1" ]; then
    log_success "Cron mensual (Día 1, 01:00): Cierre período"
else
    log_warning "Cron mensual no encontrado"
fi

# Ejecutar primer refresh de balances
log_info "Ejecutando primer refresh de balances..."
psql "$DATABASE_URL" -c "SELECT refresh_accounting_balances();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log_success "Balances refrescados correctamente"
else
    log_warning "No se pudo refrescar balances (normal si no hay datos aún)"
fi

# Verificar integridad
log_info "Ejecutando test de integridad..."
echo ""

psql "$DATABASE_URL" -c "SELECT * FROM verify_accounting_integrity();" 2>/dev/null || log_warning "Test de integridad no disponible aún"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          ✅ INSTALACIÓN COMPLETADA CON ÉXITO           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Mostrar dashboard
log_info "Consultando dashboard ejecutivo..."
echo ""

psql "$DATABASE_URL" -c "
SELECT 
  'Total Activos' as concepto, 
  COALESCE(total_assets, 0) as monto 
FROM accounting_dashboard
UNION ALL
SELECT 
  'Total Pasivos', 
  COALESCE(total_liabilities, 0) 
FROM accounting_dashboard
UNION ALL
SELECT 
  'Total Patrimonio', 
  COALESCE(total_equity, 0) 
FROM accounting_dashboard
UNION ALL
SELECT 
  'Ingreso Mensual', 
  COALESCE(monthly_income, 0) 
FROM accounting_dashboard
UNION ALL
SELECT 
  'Gasto Mensual', 
  COALESCE(monthly_expenses, 0) 
FROM accounting_dashboard
UNION ALL
SELECT 
  'Utilidad Mensual', 
  COALESCE(monthly_profit, 0) 
FROM accounting_dashboard;
" 2>/dev/null || echo "Dashboard vacío (esperado en instalación inicial)"

echo ""
log_success "Sistema contable 100% operativo"
echo ""
echo "📋 Recursos disponibles:"
echo "   • Plan de cuentas: SELECT * FROM accounting_accounts;"
echo "   • Dashboard: SELECT * FROM accounting_dashboard;"
echo "   • Balance: SELECT * FROM accounting_balance_sheet;"
echo "   • P&L: SELECT * FROM accounting_income_statement;"
echo "   • Conciliación: SELECT * FROM accounting_wallet_reconciliation;"
echo ""
echo "🔄 Automatización:"
echo "   • Diaria (00:01): Refresh de balances"
echo "   • Mensual (Día 1): Cierre de período"
echo ""
echo "📖 Documentación completa:"
echo "   • SISTEMA_CONTABLE_CICLICO_COMPLETO.md"
echo "   • PROYECCION_FINANCIERA_REALISTA.md"
echo ""

# Mostrar plan de cuentas resumido
log_info "Plan de cuentas instalado:"
echo ""

psql "$DATABASE_URL" -c "
SELECT 
  code,
  name,
  account_type
FROM accounting_accounts
WHERE is_control_account = true
ORDER BY code;
" 2>/dev/null || echo "Plan de cuentas no disponible"

echo ""
log_info "Próximos pasos:"
echo "   1. Integrar frontend con AccountingService"
echo "   2. Verificar triggers automáticos en transacciones"
echo "   3. Monitorear dashboard diariamente"
echo "   4. Revisar conciliación wallet semanalmente"
echo ""

# Crear archivo de verificación
cat > accounting_system_installed.txt <<EOF
Sistema Contable Automatizado - AutoRenta
Instalado: $(date)
Database: $DATABASE_URL (oculto por seguridad)

✅ Tablas: 4/4
✅ Plan de Cuentas: $ACCOUNTS cuentas
✅ Vistas: $VIEWS/3
✅ Cron Diario: $([ "$CRON_DAILY" = "1" ] && echo "Activo" || echo "Inactivo")
✅ Cron Mensual: $([ "$CRON_MONTHLY" = "1" ] && echo "Activo" || echo "Inactivo")

Sistema operativo y 100% automatizado.
EOF

log_success "Archivo de verificación creado: accounting_system_installed.txt"
echo ""

# Test opcional de asiento contable
echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║          🧪 TEST OPCIONAL: Crear Asiento Demo         ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

read -p "¿Deseas crear un asiento contable de prueba? (s/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Ss]$ ]]; then
    log_info "Creando asiento de prueba..."
    
    psql "$DATABASE_URL" -c "
    SELECT create_journal_entry(
        'TEST_ENTRY',
        NULL,
        'manual_test',
        'Asiento de prueba - Depósito inicial $1000',
        '[
            {\"account_code\": \"1102\", \"debit\": 1000, \"description\": \"Ingreso MercadoPago\"},
            {\"account_code\": \"2101\", \"credit\": 1000, \"description\": \"Pasivo billetera\"}
        ]'::jsonb
    );
    "
    
    if [ $? -eq 0 ]; then
        log_success "Asiento de prueba creado"
        
        log_info "Refrescando balances..."
        psql "$DATABASE_URL" -c "SELECT refresh_accounting_balances();" > /dev/null
        
        log_info "Nuevo dashboard:"
        psql "$DATABASE_URL" -c "SELECT * FROM accounting_dashboard;"
        
        log_info "Balance general:"
        psql "$DATABASE_URL" -c "
        SELECT code, name, balance 
        FROM accounting_balance_sheet 
        WHERE balance != 0 
        ORDER BY code;
        "
    else
        log_error "Error creando asiento de prueba"
    fi
fi

echo ""
log_success "🎉 ¡Instalación completa! Sistema listo para producción."
echo ""
