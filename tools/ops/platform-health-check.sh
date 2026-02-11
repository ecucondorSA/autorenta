#!/bin/bash

# =====================================================
# VERIFICACIÓN COMPLETA DE PLATAFORMA - AutoRenta
# =====================================================

set -e

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="diagnostics/reports"
REPORT_FILE="$REPORT_DIR/health-check-$TIMESTAMP.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create report directory
mkdir -p "$REPORT_DIR"

# Clear screen
clear

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🔍 AutoRenta - Platform Health Check                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Timestamp: $(date)"
echo "Report: $REPORT_FILE"
echo ""

# Redirect all output to report file and console
exec > >(tee -a "$REPORT_FILE")
exec 2>&1

echo "════════════════════════════════════════════════════════════"
echo "1. SERVICIOS LOCALES"
echo "════════════════════════════════════════════════════════════"

# Check Angular Dev Server
echo -n "Angular Dev Server (http://localhost:4200)... "
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

# Check Cloudflare Worker
echo -n "Payment Webhook Worker (http://localhost:8787)... "
if curl -s http://localhost:8787 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not Running${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "2. SUPABASE EDGE FUNCTIONS"
echo "════════════════════════════════════════════════════════════"

npx supabase functions list --project-ref aceacpaockyxgogxsfyc 2>/dev/null | head -20

echo ""
echo "════════════════════════════════════════════════════════════"
echo "3. PROCESOS EN EJECUCIÓN"
echo "════════════════════════════════════════════════════════════"

# Check Node processes
echo "Node.js processes:"
pgrep -fl node | grep -E "(angular|wrangler|start-with-env)" || echo "No node processes found"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "4. PUERTOS EN USO"
echo "════════════════════════════════════════════════════════════"

echo "Port 4200 (Angular): $(lsof -i :4200 -t 2>/dev/null | wc -l) process(es)"
echo "Port 8787 (Worker): $(lsof -i :8787 -t 2>/dev/null | wc -l) process(es)"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "5. LOGS RECIENTES (últimas 10 líneas)"
echo "════════════════════════════════════════════════════════════"

if [ -f "apps/web/app_start.log" ]; then
    echo "Angular build status:"
    tail -10 apps/web/app_start.log | grep -E "(complete|ERROR|WARNING)" || echo "No recent build activity"
else
    echo "No app_start.log found"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "6. ARCHIVOS DE CONFIGURACIÓN"
echo "════════════════════════════════════════════════════════════"

# Check environment files
echo -n ".env.local: "
[ -f "apps/web/.env.local" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${RED}❌ Missing${NC}"

echo -n ".env.development.local: "
[ -f "apps/web/.env.development.local" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${RED}❌ Missing${NC}"

echo -n "public/env.js: "
[ -f "apps/web/public/env.js" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${RED}❌ Missing${NC}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "7. DEPENDENCIAS"
echo "════════════════════════════════════════════════════════════"

# Check node_modules
echo -n "Web node_modules: "
[ -d "apps/web/node_modules" ] && echo -e "${GREEN}✅ Installed${NC}" || echo -e "${RED}❌ Not Installed${NC}"

echo -n "Worker node_modules: "
[ -d "functions/workers/payments_webhook/node_modules" ] && echo -e "${GREEN}✅ Installed${NC}" || echo -e "${RED}❌ Not Installed${NC}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "8. BUILD ARTIFACTS"
echo "════════════════════════════════════════════════════════════"

echo -n "Web build (dist/): "
[ -d "apps/web/dist" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${YELLOW}⚠️  Not Built${NC}"

echo -n "Worker build: "
[ -f "functions/workers/payments_webhook/dist/index.js" ] && echo -e "${GREEN}✅ Exists${NC}" || echo -e "${YELLOW}⚠️  Not Built${NC}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "9. GIT STATUS"
echo "════════════════════════════════════════════════════════════"

echo "Branch: $(git branch --show-current 2>/dev/null || echo 'Not a git repo')"
echo "Uncommitted changes: $(git status --short 2>/dev/null | wc -l) files"
echo "Untracked files: $(git ls-files --others --exclude-standard 2>/dev/null | wc -l) files"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "10. DISK USAGE"
echo "════════════════════════════════════════════════════════════"

du -sh apps/web/node_modules 2>/dev/null || echo "node_modules: N/A"
du -sh apps/web/dist 2>/dev/null || echo "dist: N/A"
du -sh .angular 2>/dev/null || echo ".angular cache: N/A"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ VERIFICACIÓN COMPLETADA"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Reporte guardado en: $REPORT_FILE"
echo ""
echo "Para ver el reporte completo:"
echo "  cat $REPORT_FILE"
echo ""
echo "Para ejecutar diagnóstico SQL de base de datos:"
echo "  Ir a Supabase SQL Editor y ejecutar:"
echo "  diagnostics/PLATFORM_HEALTH_CHECK.sql"
echo ""
