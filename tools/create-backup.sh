#!/bin/bash
# Script de backup programático para Supabase
# Crea backup completo (schema + data) antes de cambios críticos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración de conexión
# Usar variables de entorno si existen, sino usar valores del runbook
PGPASSWORD="${PGPASSWORD:-ECUCONDOR08122023}"
DB_URL="${DB_URL:-postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres}"

# Nombre del backup
BACKUP_NAME="${1:-pre-launch-pii-encryption-deployed}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}_${BACKUP_DATE}.sql"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "🗄️  Iniciando backup programático..."
echo "📅 Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📝 Nombre: ${BACKUP_NAME}"
echo "💾 Archivo: ${BACKUP_FILE}.gz"
echo ""

# Verificar conexión primero
echo "🔍 Verificando conexión a la base de datos..."
if ! psql "$DB_URL" -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se pudo conectar a la base de datos${NC}"
    echo "   Verifica que las credenciales sean correctas"
    exit 1
fi
echo -e "${GREEN}✅ Conexión verificada${NC}"
echo ""

# Crear backup
echo "📦 Creando backup completo (schema + data)..."
pg_dump "$DB_URL" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=plain \
  > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Comprimir
    echo "🗜️  Comprimiendo backup..."
    gzip "$BACKUP_FILE"
    
    BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
    echo "📁 Archivo: ${BACKUP_FILE_GZ}"
    echo "📊 Tamaño: ${BACKUP_SIZE}"
    echo ""
    echo "💡 Para restaurar este backup:"
    echo "   gunzip < ${BACKUP_FILE_GZ} | psql \"\$DB_URL\""
    echo ""
    
    # Mostrar últimos backups
    echo "📋 Últimos backups:"
    ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 | awk '{print "   " $9 " (" $5 ")"}' || echo "   (ninguno)"
    
    exit 0
else
    echo -e "${RED}❌ Error al crear el backup${NC}"
    exit 1
fi

