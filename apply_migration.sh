#!/bin/bash
# Script para aplicar migración de disponibilidad

echo "📦 Aplicando migración de disponibilidad..."
echo ""

# Credenciales de la DB
DB_URL="postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Ejecutar migración
PGPASSWORD=ECUCONDOR08122023 psql "$DB_URL" -f supabase/migrations/20251025171022_create_available_cars_function.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migración aplicada exitosamente"
  echo ""
  echo "📊 Verificando funciones creadas..."
  PGPASSWORD=ECUCONDOR08122023 psql "$DB_URL" -c "\df get_available_cars"
  PGPASSWORD=ECUCONDOR08122023 psql "$DB_URL" -c "\df is_car_available"
else
  echo "❌ Error al aplicar migración"
  exit 1
fi
