#!/bin/bash
# Script para generar fotos con IA para autos sin fotos

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎨 Generador de Fotos con IA${NC}"
echo ""

# Leer cantidad de autos (default 5)
LIMIT=${1:-5}

echo -e "${YELLOW}Vas a generar fotos para $LIMIT autos sin fotos${NC}"
echo -e "${YELLOW}Esto tomará aproximadamente $(( LIMIT * 20 / 60 )) minutos${NC}"
echo ""
read -p "¿Continuar? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Cancelado"
    exit 1
fi

cd apps/web
npx tsx scripts/generate-photos-bulk.ts --method cloudflare-ai --limit $LIMIT

echo ""
echo -e "${GREEN}✅ Proceso completado!${NC}"
