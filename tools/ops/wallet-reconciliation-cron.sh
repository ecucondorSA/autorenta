#!/bin/bash

# ============================================================================
# AutoRenta - Wallet Reconciliation Cron Script
# ============================================================================
# Este script ejecuta la reconciliación diaria de wallets
# Puede ejecutarse manualmente o vía cron job
#
# Uso:
#   ./wallet-reconciliation-cron.sh
#
# Cron (diario a las 3am):
#   0 3 * * * /home/edu/autorenta/tools/wallet-reconciliation-cron.sh >> /var/log/wallet-reconciliation.log 2>&1
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="pisqjmoklivzpwufhscx"
FUNCTION_URL="https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/wallet-reconciliation"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk0MzQ4ODgsImV4cCI6MjA0NTAxMDg4OH0.WaZNdM1PmUUyDZ9VKXIHfQU12sMJZiRm-Fw9OMCzb_o}"
REPORT_FILE="/tmp/wallet-reconciliation-$(date +%Y%m%d-%H%M%S).json"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  AutoRenta - Wallet Reconciliation${NC}"
echo -e "${BLUE}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Verificar que curl está instalado
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ Error: curl no está instalado${NC}"
    exit 1
fi

# Verificar que jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: jq no está instalado, el reporte no se formateará${NC}"
    HAS_JQ=false
else
    HAS_JQ=true
fi

# Ejecutar reconciliación
echo -e "${BLUE}🔄 Ejecutando reconciliación...${NC}"
echo

HTTP_CODE=$(curl -s -w "%{http_code}" -o "$REPORT_FILE" \
    -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json")

# Verificar código HTTP
if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}❌ Error: HTTP $HTTP_CODE${NC}"
    echo -e "${RED}Respuesta:${NC}"
    cat "$REPORT_FILE"
    echo
    exit 1
fi

# Leer reporte
if [ "$HAS_JQ" = true ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Reporte de Reconciliación${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo

    SUCCESS=$(jq -r '.success' "$REPORT_FILE")
    MESSAGE=$(jq -r '.message' "$REPORT_FILE")

    TOTAL_USERS=$(jq -r '.report.total_users' "$REPORT_FILE")
    USERS_CHECKED=$(jq -r '.report.users_checked' "$REPORT_FILE")
    DISCREPANCIES=$(jq -r '.report.discrepancies_found' "$REPORT_FILE")
    TOTAL_DIFF=$(jq -r '.report.total_difference' "$REPORT_FILE")

    FUND_BALANCE=$(jq -r '.report.coverage_fund_balance' "$REPORT_FILE")
    FUND_CALCULATED=$(jq -r '.report.coverage_fund_calculated' "$REPORT_FILE")
    FUND_OK=$(jq -r '.report.coverage_fund_ok' "$REPORT_FILE")

    echo -e "${BLUE}📊 Resumen:${NC}"
    echo "  • Usuarios totales: $TOTAL_USERS"
    echo "  • Usuarios verificados: $USERS_CHECKED"
    echo "  • Discrepancias encontradas: $DISCREPANCIES"
    echo "  • Diferencia total: $TOTAL_DIFF centavos"
    echo

    echo -e "${BLUE}🛡️  Fondo de Cobertura:${NC}"
    echo "  • Balance almacenado: $FUND_BALANCE centavos"
    echo "  • Balance calculado: $FUND_CALCULATED centavos"

    if [ "$FUND_OK" = "true" ]; then
        echo -e "  • Estado: ${GREEN}✅ OK${NC}"
    else
        echo -e "  • Estado: ${RED}❌ DISCREPANCIA${NC}"
        FUND_DIFF=$((FUND_BALANCE - FUND_CALCULATED))
        echo -e "  • Diferencia: ${RED}$FUND_DIFF centavos${NC}"
    fi
    echo

    # Mostrar discrepancias si las hay
    if [ "$DISCREPANCIES" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Usuarios con discrepancias:${NC}"
        jq -r '.report.users_with_issues[] | "  • User: \(.user_id)\n    Almacenado: \(.stored_balance) centavos\n    Calculado: \(.calculated_balance) centavos\n    Diferencia: \(.difference) centavos\n"' "$REPORT_FILE"
    fi

    # Resultado final
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ "$SUCCESS" = "true" ] && [ "$DISCREPANCIES" -eq 0 ] && [ "$FUND_OK" = "true" ]; then
        echo -e "${GREEN}✅ $MESSAGE${NC}"
    else
        echo -e "${YELLOW}⚠️  $MESSAGE${NC}"
        echo -e "${YELLOW}Ver reporte completo en: $REPORT_FILE${NC}"
    fi

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    # Sin jq, mostrar JSON raw
    echo -e "${YELLOW}Reporte (JSON raw):${NC}"
    cat "$REPORT_FILE"
    echo
fi

# Guardar reporte en directorio de logs
LOGS_DIR="/home/edu/autorenta/logs/reconciliation"
mkdir -p "$LOGS_DIR"
cp "$REPORT_FILE" "$LOGS_DIR/latest.json"

echo
echo -e "${BLUE}📁 Reporte guardado en:${NC}"
echo "  • $REPORT_FILE"
echo "  • $LOGS_DIR/latest.json"
echo

# Exit code basado en discrepancias
if [ "$HAS_JQ" = true ]; then
    if [ "$DISCREPANCIES" -gt 0 ] || [ "$FUND_OK" = "false" ]; then
        exit 1
    fi
fi

exit 0
