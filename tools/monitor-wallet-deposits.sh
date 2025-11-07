#!/bin/bash

# ========================================
# Monitor de Depósitos - AutoRenta Wallet
# ========================================
#
# Script para monitorear transacciones de wallet en tiempo real
# Útil para debugging y validación de validaciones implementadas
#
# Uso:
#   ./tools/monitor-wallet-deposits.sh              # Monitoreo continuo
#   ./tools/monitor-wallet-deposits.sh --once       # Una sola ejecución
#   ./tools/monitor-wallet-deposits.sh --last 10    # Últimas 10 transacciones
#

DB_URL="postgresql://postgres.pisqjmoklivzpwufhscx:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
PGPASSWORD="ECUCONDOR08122023"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar header
print_header() {
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE}  AutoRenta Wallet - Monitor de Depósitos${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

# Función para mostrar últimas transacciones
show_recent_transactions() {
  local limit=${1:-5}

  echo -e "${YELLOW}📊 Últimas $limit transacciones:${NC}"
  echo ""

  PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -c "
    SELECT
      SUBSTRING(id::text, 1, 8) as tx_id,
      SUBSTRING(user_id::text, 1, 8) as user,
      type,
      status,
      amount,
      currency,
      TO_CHAR(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD HH24:MI:SS') as created_local,
      provider,
      SUBSTRING(provider_transaction_id, 1, 15) as provider_tx_id,
      provider_metadata->>'status' as mp_status
    FROM wallet_transactions
    ORDER BY created_at DESC
    LIMIT $limit;
  "
  echo ""
}

# Función para mostrar estadísticas
show_statistics() {
  echo -e "${YELLOW}📈 Estadísticas del día:${NC}"
  echo ""

  PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -c "
    SELECT
      COUNT(*) as total_hoy,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_acreditado
    FROM wallet_transactions
    WHERE type = 'deposit'
      AND created_at >= CURRENT_DATE;
  "
  echo ""
}

# Función para detectar anomalías
check_anomalies() {
  echo -e "${YELLOW}🔍 Verificación de anomalías:${NC}"
  echo ""

  # 1. Verificar duplicados de provider_transaction_id
  echo -e "${BLUE}1. Provider Transaction IDs duplicados:${NC}"
  PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -c "
    SELECT
      provider_transaction_id,
      COUNT(*) as count,
      STRING_AGG(SUBSTRING(id::text, 1, 8), ', ') as transaction_ids
    FROM wallet_transactions
    WHERE provider_transaction_id IS NOT NULL
      AND provider_transaction_id != ''
    GROUP BY provider_transaction_id
    HAVING COUNT(*) > 1;
  " -t -A

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ No se encontraron duplicados${NC}"
  else
    echo -e "${RED}❌ ALERTA: Provider IDs duplicados encontrados${NC}"
  fi
  echo ""

  # 2. Verificar pending viejos (>24 horas)
  echo -e "${BLUE}2. Pending viejos (>24 horas):${NC}"
  PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -c "
    SELECT
      SUBSTRING(id::text, 1, 8) as tx_id,
      SUBSTRING(user_id::text, 1, 8) as user,
      amount,
      AGE(NOW(), created_at) as age
    FROM wallet_transactions
    WHERE status = 'pending'
      AND type = 'deposit'
      AND created_at < (NOW() - INTERVAL '24 hours')
    ORDER BY created_at ASC;
  " -t -A

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ No hay pending viejos${NC}"
  else
    echo -e "${YELLOW}⚠️  Hay pending con más de 24 horas${NC}"
  fi
  echo ""

  # 3. Verificar rate limiting por usuario
  echo -e "${BLUE}3. Usuarios cerca del límite (>7 pending):${NC}"
  PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -c "
    SELECT
      SUBSTRING(user_id::text, 1, 8) as user,
      COUNT(*) as pending_count,
      check_user_pending_deposits_limit(user_id) as can_create_more
    FROM wallet_transactions
    WHERE status = 'pending'
      AND type = 'deposit'
      AND created_at > (NOW() - INTERVAL '7 days')
    GROUP BY user_id
    HAVING COUNT(*) > 7
    ORDER BY COUNT(*) DESC;
  " -t -A

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Ningún usuario cerca del límite${NC}"
  else
    echo -e "${YELLOW}⚠️  Usuarios con alto número de pending${NC}"
  fi
  echo ""
}

# Función para monitoreo continuo
continuous_monitor() {
  echo -e "${GREEN}🔄 Modo monitoreo continuo (Ctrl+C para salir)${NC}"
  echo ""

  while true; do
    clear
    print_header
    show_recent_transactions 10
    show_statistics
    check_anomalies

    echo -e "${BLUE}Próxima actualización en 30 segundos...${NC}"
    sleep 30
  done
}

# Parse argumentos
case "$1" in
  --once)
    print_header
    show_recent_transactions 5
    show_statistics
    check_anomalies
    ;;
  --last)
    print_header
    show_recent_transactions ${2:-10}
    ;;
  --stats)
    print_header
    show_statistics
    ;;
  --check)
    print_header
    check_anomalies
    ;;
  *)
    continuous_monitor
    ;;
esac
