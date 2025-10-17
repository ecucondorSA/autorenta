#!/bin/bash

###############################################################################
# SYNC DATABASE TYPES FROM SUPABASE
###############################################################################
# Script para regenerar types de TypeScript desde el schema de Supabase
#
# Uso:
#   ./tools/sync-types.sh           # Sync desde proyecto local
#   ./tools/sync-types.sh --remote  # Sync desde proyecto remoto
#
# Requiere:
#   - Supabase CLI instalado (https://supabase.com/docs/guides/cli)
#   - Proyecto Supabase configurado
###############################################################################

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Obtener directorio raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Archivo de destino
OUTPUT_FILE="$PROJECT_ROOT/apps/web/src/app/core/types/database.types.ts"

echo -e "${BLUE}🔄 Sincronizando types de Supabase...${NC}\n"

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI no está instalado${NC}"
    echo -e "${YELLOW}💡 Instalar con: npm install -g supabase${NC}"
    exit 1
fi

# Verificar que directorio de destino exista
DEST_DIR=$(dirname "$OUTPUT_FILE")
if [ ! -d "$DEST_DIR" ]; then
    echo -e "${YELLOW}📁 Creando directorio: $DEST_DIR${NC}"
    mkdir -p "$DEST_DIR"
fi

# Crear backup del archivo actual si existe
if [ -f "$OUTPUT_FILE" ]; then
    BACKUP_FILE="$OUTPUT_FILE.backup-$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}💾 Creando backup: $(basename $BACKUP_FILE)${NC}"
    cp "$OUTPUT_FILE" "$BACKUP_FILE"
fi

# Determinar si usar proyecto local o remoto
USE_REMOTE=false
if [ "$1" == "--remote" ]; then
    USE_REMOTE=true
fi

# Generar types
echo -e "${BLUE}⚙️  Generando types de TypeScript...${NC}"

if [ "$USE_REMOTE" = true ]; then
    # Generar desde proyecto remoto
    echo -e "${YELLOW}🌐 Usando proyecto remoto${NC}"

    # Verificar que PROJECT_REF esté configurado
    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        echo -e "${RED}❌ Variable SUPABASE_PROJECT_REF no configurada${NC}"
        echo -e "${YELLOW}💡 Ejecutar: export SUPABASE_PROJECT_REF=your-project-ref${NC}"
        exit 1
    fi

    supabase gen types typescript \
        --project-id "$SUPABASE_PROJECT_REF" \
        > "$OUTPUT_FILE"
else
    # Generar desde proyecto local
    echo -e "${YELLOW}🏠 Usando proyecto local${NC}"

    # Verificar que Supabase esté corriendo localmente
    if ! supabase status &> /dev/null; then
        echo -e "${RED}❌ Supabase local no está corriendo${NC}"
        echo -e "${YELLOW}💡 Iniciar con: supabase start${NC}"
        exit 1
    fi

    supabase gen types typescript --local > "$OUTPUT_FILE"
fi

# Verificar que se generó correctamente
if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
    echo -e "${GREEN}✅ Types generados exitosamente${NC}"
    echo -e "${BLUE}📝 Archivo: $OUTPUT_FILE${NC}"

    # Mostrar estadísticas
    LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
    echo -e "${YELLOW}📊 Líneas generadas: $LINE_COUNT${NC}"

    # Contar interfaces principales
    INTERFACE_COUNT=$(grep -c "^export interface" "$OUTPUT_FILE" || true)
    echo -e "${YELLOW}📊 Interfaces: $INTERFACE_COUNT${NC}"

    # Agregar header personalizado
    echo -e "${BLUE}📝 Agregando header personalizado...${NC}"

    TEMP_FILE=$(mktemp)
    cat > "$TEMP_FILE" << 'EOF'
/**
 * Database Types para AutoRenta
 *
 * IMPORTANTE: Este archivo es auto-generado desde el schema de Supabase.
 * NO editar manualmente.
 *
 * Para regenerar:
 *   npm run sync:types        # Desde proyecto local
 *   npm run sync:types:remote # Desde proyecto remoto
 *
 * Última actualización: AUTO_TIMESTAMP
 */

EOF

    # Reemplazar timestamp
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    sed -i "s/AUTO_TIMESTAMP/$TIMESTAMP/" "$TEMP_FILE"

    # Combinar header con types generados
    cat "$OUTPUT_FILE" >> "$TEMP_FILE"
    mv "$TEMP_FILE" "$OUTPUT_FILE"

    # Formatear con Prettier si está disponible
    if command -v prettier &> /dev/null; then
        echo -e "${BLUE}✨ Formateando con Prettier...${NC}"
        cd "$PROJECT_ROOT/apps/web" && prettier --write "$OUTPUT_FILE" --loglevel=silent
    fi

    echo -e "\n${GREEN}🎉 Sincronización completada${NC}"

    # Mostrar diff si hay backup
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "\n${YELLOW}📋 Cambios detectados:${NC}"

        DIFF_LINES=$(diff "$BACKUP_FILE" "$OUTPUT_FILE" | wc -l || true)

        if [ "$DIFF_LINES" -eq 0 ]; then
            echo -e "${GREEN}   Sin cambios en el schema${NC}"
            rm "$BACKUP_FILE"
        else
            echo -e "${YELLOW}   $DIFF_LINES líneas modificadas${NC}"
            echo -e "${BLUE}💡 Backup guardado en: $(basename $BACKUP_FILE)${NC}"
            echo -e "${YELLOW}💡 Revisar cambios y actualizar servicios si es necesario${NC}"
        fi
    fi

    # Sugerencias post-sync
    echo -e "\n${BLUE}📝 Próximos pasos:${NC}"
    echo -e "${YELLOW}   1. Revisar cambios en database.types.ts${NC}"
    echo -e "${YELLOW}   2. Actualizar models si hay nuevas tablas${NC}"
    echo -e "${YELLOW}   3. Actualizar services si cambió estructura${NC}"
    echo -e "${YELLOW}   4. Ejecutar tests: npm run test${NC}"

else
    echo -e "${RED}❌ Error generando types${NC}"

    # Restaurar backup si existe
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${YELLOW}🔄 Restaurando backup...${NC}"
        mv "$BACKUP_FILE" "$OUTPUT_FILE"
        echo -e "${GREEN}✅ Backup restaurado${NC}"
    fi

    exit 1
fi

echo ""
