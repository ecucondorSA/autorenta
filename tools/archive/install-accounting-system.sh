#!/bin/bash
# =================================================
# Script de Instalación Automática
# Sistema Contable AutoRenta
# =================================================

set -e  # Salir si hay error

echo "🚀 Instalando Sistema Contable Automatizado..."
echo "=============================================="

# Configuración
DB_HOST="${SUPABASE_DB_HOST:-db.YOUR_PROJECT.supabase.co}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

ACCOUNTING_DIR="apps/web/database/accounting"

# Verificar que estamos en el directorio correcto
if [ ! -d "$ACCOUNTING_DIR" ]; then
  echo "❌ Error: No se encuentra el directorio $ACCOUNTING_DIR"
  echo "   Ejecuta este script desde la raíz del proyecto"
  exit 1
fi

# Función para ejecutar SQL
execute_sql() {
  local file=$1
  local description=$2
  
  echo ""
  echo "📝 Ejecutando: $description"
  echo "   Archivo: $file"
  
  if [ -f "$file" ]; then
    PGPASSWORD=$DB_PASSWORD psql \
      -h $DB_HOST \
      -U $DB_USER \
      -d $DB_NAME \
      -f "$file" \
      -v ON_ERROR_STOP=1 \
      --quiet
    echo "   ✅ Completado"
  else
    echo "   ❌ Archivo no encontrado: $file"
    exit 1
  fi
}

# Paso 1: Crear tablas base
execute_sql "$ACCOUNTING_DIR/001-accounting-tables.sql" \
  "Tablas Base (accounts, ledger, journal_entries, provisions)"

# Paso 2: Insertar plan de cuentas
execute_sql "$ACCOUNTING_DIR/002-accounting-seed-data.sql" \
  "Plan de Cuentas (26 cuentas contables)"

# Paso 3: Crear funciones y triggers
execute_sql "$ACCOUNTING_DIR/003-accounting-automation-functions.sql" \
  "Funciones de Automatización (triggers en wallet y bookings)"

# Paso 4: Crear vistas de reportes
execute_sql "$ACCOUNTING_DIR/004-accounting-reports.sql" \
  "Vistas de Reportes (balance, P&L, dashboard)"

# Paso 5: Configurar cron jobs
execute_sql "$ACCOUNTING_DIR/005-accounting-cron-jobs.sql" \
  "Cron Jobs (cierre mensual, conciliación, backups)"

# Verificación
echo ""
echo "🔍 Verificando instalación..."
echo "=============================="

# Contar cuentas creadas
ACCOUNT_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -t -c "SELECT COUNT(*) FROM accounting_accounts;")

echo "📊 Cuentas contables creadas: $(echo $ACCOUNT_COUNT | tr -d ' ')"

# Verificar triggers
TRIGGER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trigger_accounting%';")

echo "🔧 Triggers activos: $(echo $TRIGGER_COUNT | tr -d ' ')"

# Verificar vistas
VIEW_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -t -c "SELECT COUNT(*) FROM pg_views WHERE viewname LIKE 'accounting_%';")

echo "📈 Vistas de reportes: $(echo $VIEW_COUNT | tr -d ' ')"

# Verificar cron jobs
CRON_COUNT=$(PGPASSWORD=$DB_PASSWORD psql \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  -t -c "SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%accounting%';" 2>/dev/null || echo "0")

echo "⏰ Cron jobs programados: $(echo $CRON_COUNT | tr -d ' ')"

echo ""
echo "✅ ¡Instalación Completada!"
echo "=========================="
echo ""
echo "📚 Próximos pasos:"
echo "1. Refrescar balances: SELECT refresh_accounting_balances();"
echo "2. Ver dashboard: SELECT * FROM accounting_dashboard;"
echo "3. Ver plan de cuentas: SELECT code, name, account_type FROM accounting_accounts ORDER BY code;"
echo ""
echo "📖 Documentación completa: SISTEMA_CONTABLE_AUTOMATIZADO_COMPLETO.md"
