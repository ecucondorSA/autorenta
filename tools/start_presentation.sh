#!/bin/bash

# AutoRentar - Start Presentation & Demo Script
# Usage: ./tools/start_presentation.sh

# 1. Colors for UI
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando entorno de presentación AutoRentar...${NC}"

# 2. Open artifacts in default browser (Chrome)
# Note: Using xdg-open for Linux compatibility
echo -e "${GREEN}✅ Abriendo Presentación Visual...${NC}"
xdg-open "/home/edu/.gemini/antigravity/brain/0ea5de2e-6ac2-40f0-bce2-9a2c9aff19be/presentacion_visual_rus.html"

echo -e "${GREEN}✅ Abriendo Master Playbook...${NC}"
xdg-open "/home/edu/.gemini/antigravity/brain/0ea5de2e-6ac2-40f0-bce2-9a2c9aff19be/MASTER_PLAYBOOK_RUS.md"

# 3. Check if dev server is running, if not start it
echo -e "${BLUE}🏗️ Verificando servidor de desarrollo...${NC}"
if ! curl -s localhost:4200 > /dev/null; then
    echo -e "${GREEN}⚙️ Iniciando pnpm dev en segundo plano...${NC}"
    # Start dev server in a new terminal tab or background
    # Note: Redirecting output to avoid cluttering presentation terminal
    pnpm dev > /dev/null 2>&1 &
    sleep 5
fi

echo -e "${GREEN}✅ Abriendo Demo...${NC}"
xdg-open "http://localhost:4200/cars/publish"

echo -e "${BLUE}--------------------------------------------------${NC}"
echo -e "${GREEN}¡Todo listo! Buena suerte en la reunión con RUS.${NC}"
echo -e "${BLUE}--------------------------------------------------${NC}"
