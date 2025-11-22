#!/bin/bash

################################################################################
# AutoRenta Cleanup Script
# Detiene todos los procesos, puertos, servicios y libera recursos
# Uso: ./tools/cleanup.sh
################################################################################

set -e

echo "🧹 Iniciando limpieza del sistema..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# 1. DETENER PROCESOS DE DESARROLLO
################################################################################
echo -e "${BLUE}[1/7]${NC} Deteniendo procesos de desarrollo..."

# Angular dev servers
pkill -9 -f "ng serve" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Angular servers detenidos" || echo -e "  ${YELLOW}✓${NC} No había Angular servers"

# Node processes
pkill -9 node 2>/dev/null && echo -e "  ${GREEN}✓${NC} Node processes detenidos" || echo -e "  ${YELLOW}✓${NC} No había procesos Node"

# Workerd (Cloudflare Workers)
pkill -9 workerd 2>/dev/null && echo -e "  ${GREEN}✓${NC} Workerd processes detenidos" || echo -e "  ${YELLOW}✓${NC} No había procesos Workerd"

# npm processes
pkill -9 -f "npm run" 2>/dev/null && echo -e "  ${GREEN}✓${NC} npm processes detenidos" || echo -e "  ${YELLOW}✓${NC} No había procesos npm"

sleep 1
echo ""

################################################################################
# 2. DETENER SUPABASE
################################################################################
echo -e "${BLUE}[2/7]${NC} Deteniendo Supabase..."

supabase stop 2>/dev/null && echo -e "  ${GREEN}✓${NC} Supabase detenido" || echo -e "  ${YELLOW}✓${NC} Supabase no estaba corriendo"

sleep 1
echo ""

################################################################################
# 3. DETENER DOCKER CONTAINERS
################################################################################
echo -e "${BLUE}[3/7]${NC} Deteniendo contenedores Docker..."

if command -v docker &> /dev/null; then
    # Detener todos los contenedores
    docker stop $(docker ps -q) 2>/dev/null && echo -e "  ${GREEN}✓${NC} Contenedores Docker detenidos" || echo -e "  ${YELLOW}✓${NC} No había contenedores activos"
else
    echo -e "  ${YELLOW}⚠${NC} Docker no instalado"
fi

sleep 1
echo ""

################################################################################
# 4. LIBERAR PUERTOS
################################################################################
echo -e "${BLUE}[4/7]${NC} Liberando puertos..."

# Puertos comunes en AutoRenta
PORTS=(4200 8787 5432 54321 54322 54323 54324 3000 8000 8080)

for port in "${PORTS[@]}"; do
    if lsof -i -P -n 2>/dev/null | grep -q ":$port"; then
        pid=$(lsof -i -P -n 2>/dev/null | grep ":$port" | awk '{print $2}' | head -1)
        kill -9 "$pid" 2>/dev/null && echo -e "  ${GREEN}✓${NC} Puerto $port liberado" || true
    fi
done

echo ""

################################################################################
# 5. LIMPIAR CACHE DE RAM
################################################################################
echo -e "${BLUE}[5/7]${NC} Limpiando cache de RAM..."

sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 && echo -e "  ${GREEN}✓${NC} Cache de RAM limpiado" || echo -e "  ${YELLOW}⚠${NC} Requiere permisos sudo para limpiar cache"

sleep 1
echo ""

################################################################################
# 6. LIMPIAR npm CACHE
################################################################################
echo -e "${BLUE}[6/7]${NC} Limpiando npm cache..."

npm cache clean --force 2>/dev/null && echo -e "  ${GREEN}✓${NC} npm cache limpiado" || echo -e "  ${YELLOW}✓${NC} npm cache ya estaba limpio"

echo ""

################################################################################
# 7. MOSTRAR ESTADO FINAL
################################################################################
echo -e "${BLUE}[7/7]${NC} Estado final del sistema..."
echo ""

echo -e "${YELLOW}Memoria RAM:${NC}"
free -h | grep Mem

echo ""
echo -e "${YELLOW}Procesos activos (top 5):${NC}"
ps aux --sort=-%mem | head -6 | tail -5

echo ""
echo -e "${YELLOW}Puertos en escucha:${NC}"
lsof -i -P -n 2>/dev/null | grep LISTEN | wc -l
if [ $(lsof -i -P -n 2>/dev/null | grep LISTEN | wc -l) -gt 0 ]; then
    echo "Puertos:"
    lsof -i -P -n 2>/dev/null | grep LISTEN
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Limpieza completada exitosamente${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Próximos pasos:"
echo "  • Para iniciar desarrollo: npm run dev"
echo "  • Para ver estado del proyecto: npm run status"
echo "  • Para limpiar nuevamente: ./tools/cleanup.sh"
