#!/bin/bash

###############################################################################
# CHECK CLAUDE SKILLS AVAILABILITY
###############################################################################
# Script para verificar si Claude Skills está disponible
#
# Uso:
#   ./tools/check-skills.sh
#
# Agregar a cron para verificación automática:
#   crontab -e
#   0 9 * * * /home/edu/autorenta/tools/check-skills.sh
###############################################################################

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando disponibilidad de Claude Skills...${NC}\n"

# Verificar documentación online
echo -e "${YELLOW}📚 Verificando documentación oficial...${NC}"

DOCS_URL="https://docs.claude.com/en/docs/claude-code/skills"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOCS_URL" 2>/dev/null)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Documentación de Skills existe (HTTP 200)${NC}"
    echo -e "${GREEN}   Posiblemente disponible!${NC}\n"

    echo -e "${BLUE}📝 Próximos pasos:${NC}"
    echo -e "${YELLOW}   1. Abrir Claude Code CLI${NC}"
    echo -e "${YELLOW}   2. Ejecutar: /skills list${NC}"
    echo -e "${YELLOW}   3. Si funciona, comenzar experimentación:${NC}"
    echo -e "${YELLOW}      cat SKILLS_EXPERIMENTATION.md${NC}\n"

    # Guardar timestamp
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skills posiblemente disponible" >> .skills-check.log

    exit 0
else
    echo -e "${RED}❌ Documentación aún no disponible (HTTP $HTTP_STATUS)${NC}"
    echo -e "${YELLOW}   Skills probablemente no lanzado aún${NC}\n"

    # Guardar timestamp
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skills no disponible (HTTP $HTTP_STATUS)" >> .skills-check.log

    echo -e "${BLUE}💡 Mientras esperas:${NC}"
    echo -e "${YELLOW}   - Revisar preparación: cat PATTERNS.md${NC}"
    echo -e "${YELLOW}   - Practicar workflows: npm run workflows${NC}"
    echo -e "${YELLOW}   - Ver release notes: /release-notes en Claude Code${NC}\n"

    exit 1
fi
