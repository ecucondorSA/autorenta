#!/bin/bash
# Script para aplicar migraciones de base de datos
# Usa variables de entorno para credenciales (NUNCA hardcodear)

set -e

echo "📦 Aplicando migración..."
echo ""

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  source .env.local
elif [ -f ".env" ]; then
  source .env
else
  echo "❌ Error: .env.local o .env no encontrado"
  echo "Copia .env.example a .env.local y configura tus credenciales"
  exit 1
fi

# Validar que existan las variables necesarias
if [ -z "$DATABASE_URL" ]; then
  if [ -z "$DB_HOST" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_USER" ]; then
    echo "❌ Error: Variables de base de datos no definidas"
    echo "Define DATABASE_URL o DB_HOST/DB_USER/DB_PASSWORD en .env.local"
    exit 1
  fi
  # Construir DATABASE_URL
  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-6543}/${DB_NAME:-postgres}"
fi

# Archivo de migración (primer argumento o default)
MIGRATION_FILE="${1:-supabase/migrations/20251025171022_create_available_cars_function.sql}"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Archivo de migración no encontrado: $MIGRATION_FILE"
  exit 1
fi

echo "📝 Archivo: $MIGRATION_FILE"
echo "🔗 Host: ${DB_HOST}"
echo ""

# Ejecutar migración
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migración aplicada exitosamente"
else
  echo "❌ Error al aplicar migración"
  exit 1
fi
