#!/usr/bin/env bash

set -euo pipefail

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin Color

CHROME_DEBUG_PORT="${CHROME_DEVTOOLS_PORT:-9222}"
DEV_SERVER_PORT="${DEV_SERVER_PORT:-4200}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🎯 Generador de Tests con Chrome CDP"
echo -e "${BLUE}║${NC}  Crea tests automáticamente mientras navegas"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para verificar si un servicio está ejecutándose
verificar_servicio() {
  local url=$1
  local nombre=$2
  
  if curl -s "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $nombre está ejecutándose"
    return 0
  else
    echo -e "${RED}✗${NC} $nombre no está ejecutándose"
    return 1
  fi
}

# Verificar estado actual
echo -e "${BLUE}📊 Verificando estado actual...${NC}"
echo ""

CHROME_RUNNING=false
DEV_SERVER_RUNNING=false

if verificar_servicio "http://localhost:${CHROME_DEBUG_PORT}/json/version" "Chrome CDP"; then
  CHROME_RUNNING=true
fi

if verificar_servicio "http://localhost:${DEV_SERVER_PORT}" "Servidor de Desarrollo"; then
  DEV_SERVER_RUNNING=true
fi

echo ""

# Iniciar servicios si es necesario
if [ "$CHROME_RUNNING" = false ]; then
  echo -e "${YELLOW}🚀 Iniciando Chrome con CDP...${NC}"
  ./scripts/chrome-dev.sh &
  
  # Esperar a que Chrome se inicie
  for i in {1..10}; do
    if verificar_servicio "http://localhost:${CHROME_DEBUG_PORT}/json/version" "Chrome CDP"; then
      break
    fi
    echo -e "${YELLOW}   Esperando que Chrome se inicie... ($i/10)${NC}"
    sleep 2
  done
fi

if [ "$DEV_SERVER_RUNNING" = false ]; then
  echo -e "${YELLOW}🚀 Iniciando servidor de desarrollo...${NC}"
  echo -e "${YELLOW}   Por favor ejecuta en otra terminal: npm run dev:web${NC}"
  echo -e "${YELLOW}   Presiona Enter cuando el servidor esté listo...${NC}"
  read -r
fi

# Obtener endpoint WebSocket
echo -e "${BLUE}🔗 Obteniendo endpoint WebSocket...${NC}"
WS_ENDPOINT=$(curl -s "http://localhost:${CHROME_DEBUG_PORT}/json/version" | jq -r '.webSocketDebuggerUrl' 2>/dev/null || echo "")

if [ -z "$WS_ENDPOINT" ]; then
  echo -e "${RED}❌ No se pudo obtener el endpoint WebSocket${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Endpoint WebSocket: ${WS_ENDPOINT}"
echo ""

# Exportar variable de entorno
export CHROME_CDP_WS_ENDPOINT="$WS_ENDPOINT"

# Mostrar instrucciones
echo -e "${BLUE}📋 Instrucciones para generar tests:${NC}"
echo ""
echo -e "${GREEN}1.${NC} Se abrirá una ventana de Chrome conectada al navegador de depuración"
echo -e "${GREEN}2.${NC} Navega por tu aplicación como lo haría un usuario normal"
echo -e "${GREEN}3.${NC} Haz clic en elementos, llena formularios, etc."
echo -e "${GREEN}4.${NC} Playwright grabará automáticamente todas tus acciones"
echo -e "${GREEN}5.${NC} Al finalizar, cierra la ventana para obtener el código del test"
echo ""

echo -e "${YELLOW}💡 Consejos:${NC}"
echo -e "   • Navega despacio para obtener mejores selectores"
echo -e "   • Usa nombres descriptivos para los tests"
echo -e "   • Evita hacer clic en elementos que cambien frecuentemente"
echo -e "   • Incluye verificaciones (assertions) al final"
echo ""

# Preguntar por el tipo de test
echo -e "${BLUE}🎯 ¿Qué tipo de test quieres generar?${NC}"
echo ""
echo -e "${GREEN}1.${NC} Test de flujo completo (publicar auto, reservar, etc.)"
echo -e "${GREEN}2.${NC} Test de componente específico (formulario, modal, etc.)"
echo -e "${GREEN}3.${NC} Test de navegación (menú, links, etc.)"
echo -e "${GREEN}4.${NC} Test personalizado"
echo ""

read -p "Selecciona una opción (1-4): " opcion

case $opcion in
  1)
    TEST_NAME="flujo-completo"
    URL_PATH=""
    echo -e "${BLUE}🎯 Generando test de flujo completo...${NC}"
    ;;
  2)
    echo -e "${YELLOW}Ingresa el nombre del componente (ej: formulario-publicar):${NC}"
    read -r TEST_NAME
    URL_PATH=""
    ;;
  3)
    TEST_NAME="navegacion"
    URL_PATH=""
    echo -e "${BLUE}🎯 Generando test de navegación...${NC}"
    ;;
  4)
    echo -e "${YELLOW}Ingresa el nombre del test:${NC}"
    read -r TEST_NAME
    echo -e "${YELLOW}Ingresa la ruta específica (opcional, ej: /publicar):${NC}"
    read -r URL_PATH
    ;;
  *)
    TEST_NAME="test-generado"
    URL_PATH=""
    ;;
esac

# Crear directorio de tests si no existe
mkdir -p tests/generados

# Archivo de salida
OUTPUT_FILE="tests/generados/${TEST_NAME}-$(date +%Y%m%d-%H%M%S).spec.ts"

echo ""
echo -e "${GREEN}🎬 Iniciando generación de test...${NC}"
echo -e "${BLUE}   Archivo de salida: ${OUTPUT_FILE}${NC}"
echo ""

# Ejecutar codegen
npx playwright codegen \
  --target=playwright \
  --output="$OUTPUT_FILE" \
  "http://localhost:${DEV_SERVER_PORT}${URL_PATH}"

echo ""
echo -e "${GREEN}✅ Test generado exitosamente!${NC}"
echo -e "${BLUE}📁 Archivo: ${OUTPUT_FILE}${NC}"
echo ""

# Mostrar contenido del archivo generado
if [ -f "$OUTPUT_FILE" ]; then
  echo -e "${BLUE}📄 Contenido del test generado:${NC}"
  echo -e "${YELLOW}===============================================${NC}"
  head -20 "$OUTPUT_FILE"
  echo -e "${YELLOW}===============================================${NC}"
  echo ""
  
  echo -e "${BLUE}🔧 Próximos pasos:${NC}"
  echo -e "${GREEN}1.${NC} Revisar y editar el test: ${YELLOW}code ${OUTPUT_FILE}${NC}"
  echo -e "${GREEN}2.${NC} Ejecutar el test: ${YELLOW}npx playwright test ${OUTPUT_FILE}${NC}"
  echo -e "${GREEN}3.${NC} Ejecutar con UI: ${YELLOW}npx playwright test ${OUTPUT_FILE} --ui${NC}"
  echo -e "${GREEN}4.${NC} Depurar con CDP: ${YELLOW}npx playwright test ${OUTPUT_FILE} --config=playwright.config.cdp.ts --ui${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ¡Listo para crear más tests!${NC}"