#!/bin/bash
set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Configuración y Optimización Antigravity (Low Spec & Tabula Rasa) ===${NC}"

# 1. Configuración de Memoria de Node
echo -e "${YELLOW}[1/4] Configurando opciones de memoria para Node...${NC}"
# Verificar si ya existe en .env.local o perfil
if grep -q "max-old-space-size" ~/.bashrc; then
    echo "Configuración de memoria ya presente en .bashrc"
else
    echo "export NODE_OPTIONS=\"--max-old-space-size=4096\"" >> ~/.bashrc
    export NODE_OPTIONS="--max-old-space-size=4096"
    echo -e "${GREEN}Añadido NODE_OPTIONS=--max-old-space-size=4096 a .bashrc${NC}"
fi

# 2. Verificación de Inotify (Watchers)
echo -e "${YELLOW}[2/4] Verificando límites de inotify (File Watchers)...${NC}"
WATCHES=$(cat /proc/sys/fs/inotify/max_user_watches)
if [ "$WATCHES" -lt 524288 ]; then
    echo -e "${RED}ALERTA: max_user_watches es bajo ($WATCHES). Se recomienda aumentar.${NC}"
    echo "Ejecuta: echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p"
else
    echo -e "${GREEN}Límite de watchers adecuado: $WATCHES${NC}"
fi

# 3. Limpieza Tabula Rasa
echo -e "${YELLOW}[3/4] Ejecutando limpieza profunda (Tabula Rasa)...${NC}"
DIRS_TO_CLEAN=(
    "node_modules"
    "apps/web/node_modules"
    "apps/web/.angular"
    "dist"
    "tmp"
    ".angular"
)

for dir in "${DIRS_TO_CLEAN[@]}"; do
    if [ -d "$dir" ]; then
        echo "Borrando $dir..."
        rm -rf "$dir"
    fi
done

echo -e "${GREEN}Limpieza completada.${NC}"

# 4. Reinstalación Limpia
echo -e "${YELLOW}[4/4] Instalando dependencias (pnpm)...${NC}"
# Usar --silent para reducir overhead de I/O en terminal lenta si se desea, pero dejaremos output normal
pnpm install

echo -e "${GREEN}=== Setup Completado Exitosamente ===${NC}"
echo -e "Recuerda reiniciar tu terminal o ejecutar 'source ~/.bashrc' si hubo cambios de variables entorno."
