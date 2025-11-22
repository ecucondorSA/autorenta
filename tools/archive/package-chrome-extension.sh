#!/bin/bash
# Automatic Chrome Extension Packager
# Empaqueta la extensión de Chrome automáticamente

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directories
EXTENSION_DIR="/home/edu/autorenta/browser-extension"
OUTPUT_DIR="/home/edu/autorenta/browser-extension/dist"
KEYS_DIR="$HOME/.chrome-extension-keys"

echo ""
echo -e "${BLUE}======================================"
echo "  🤖 Chrome Extension Packager"
echo "======================================${NC}"
echo ""

# Step 1: Verify extension directory exists
echo -e "${YELLOW}[1/5]${NC} Verificando directorio de extensión..."
if [ ! -d "$EXTENSION_DIR" ]; then
    echo -e "${RED}❌ Error: Directorio no encontrado: $EXTENSION_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Directorio encontrado"

# Step 2: Create output directories
echo -e "${YELLOW}[2/5]${NC} Creando directorios de salida..."
mkdir -p "$OUTPUT_DIR"
mkdir -p "$KEYS_DIR"
chmod 700 "$KEYS_DIR"
echo -e "${GREEN}✓${NC} Directorios creados"

# Step 3: Get version from manifest
echo -e "${YELLOW}[3/5]${NC} Leyendo versión de manifest.json..."
VERSION=$(grep -o '"version": "[^"]*"' "$EXTENSION_DIR/manifest.json" | cut -d'"' -f4)
echo -e "${GREEN}✓${NC} Versión: ${BLUE}v$VERSION${NC}"

# Step 4: Check for existing key
KEY_FILE="$KEYS_DIR/browser-extension.pem"
if [ -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}[4/5]${NC} Usando clave privada existente..."
    echo -e "${GREEN}✓${NC} Clave encontrada: $KEY_FILE"
    PACK_KEY="--pack-extension-key=$KEY_FILE"
else
    echo -e "${YELLOW}[4/5]${NC} No se encontró clave privada. Se generará una nueva..."
    echo -e "${BLUE}ℹ${NC}  La clave se guardará en: $KEY_FILE"
    PACK_KEY=""
fi

# Step 5: Pack extension
echo -e "${YELLOW}[5/5]${NC} Empaquetando extensión..."
echo ""

# Run Chrome packager
google-chrome \
    --pack-extension="$EXTENSION_DIR" \
    $PACK_KEY \
    --no-sandbox \
    --headless 2>&1 | grep -v "DevTools" | grep -v "GPU" || true

# Wait a moment for file generation
sleep 1

# Move generated files
CRX_NAME="claude-code-browser-control-v${VERSION}.crx"
PEM_NAME="browser-extension.pem"

if [ -f "/home/edu/autorenta/browser-extension.crx" ]; then
    mv "/home/edu/autorenta/browser-extension.crx" "$OUTPUT_DIR/$CRX_NAME"
    echo -e "${GREEN}✓${NC} Extensión empaquetada: ${BLUE}$CRX_NAME${NC}"
else
    echo -e "${RED}❌ Error: No se generó el archivo .crx${NC}"
    echo ""
    echo "Intenta manualmente:"
    echo "1. Abre chrome://extensions"
    echo "2. Click 'Pack extension'"
    echo "3. Directorio: $EXTENSION_DIR"
    echo "4. Clave: $([ -f "$KEY_FILE" ] && echo "$KEY_FILE" || echo "(vacío)")"
    exit 1
fi

if [ -f "/home/edu/autorenta/browser-extension.pem" ]; then
    mv "/home/edu/autorenta/browser-extension.pem" "$KEY_FILE"
    echo -e "${GREEN}✓${NC} Clave privada guardada: ${BLUE}$KEY_FILE${NC}"
fi

echo ""
echo -e "${GREEN}======================================"
echo "  ✅ Empaquetado Completo"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📦 Archivos generados:${NC}"
echo ""
echo "  1. Extensión empaquetada:"
echo "     $OUTPUT_DIR/$CRX_NAME"
echo "     $(du -h "$OUTPUT_DIR/$CRX_NAME" | cut -f1)"
echo ""
echo "  2. Clave privada (GUARDAR):"
echo "     $KEY_FILE"
echo "     $(du -h "$KEY_FILE" 2>/dev/null | cut -f1 || echo "N/A")"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  • GUARDA la clave privada (.pem) en lugar seguro"
echo "  • SIN ella NO puedes actualizar la extensión"
echo "  • NO la compartas públicamente"
echo "  • NO la commitees a git (ya está en .gitignore)"
echo ""
echo -e "${BLUE}📋 Instalación:${NC}"
echo ""
echo "  1. Abre Chrome: chrome://extensions"
echo "  2. Activa 'Developer mode'"
echo "  3. Arrastra: $OUTPUT_DIR/$CRX_NAME"
echo "  4. Click 'Add extension'"
echo ""
echo -e "${GREEN}✨ Listo para distribuir!${NC}"
echo ""

# List all files in output directory
echo -e "${BLUE}📁 Contenido de dist/:${NC}"
ls -lh "$OUTPUT_DIR/" 2>/dev/null || echo "  (vacío)"
echo ""
