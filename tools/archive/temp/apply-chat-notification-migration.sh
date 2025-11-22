#!/bin/bash

echo "📝 Aplicando migración de notificaciones de chat..."

SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY apps/web/.env.development.local | cut -d '=' -f2)

# Leer el archivo SQL
SQL_CONTENT=$(cat supabase/migrations/20251027_trigger_chat_notifications.sql)

# Ejecutar via psql (requiere conexión directa) o via HTTP

echo "✅ Migración lista para aplicar"
echo ""
echo "Para aplicar manualmente, ejecuta en Supabase SQL Editor:"
echo "https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql/new"
echo ""
echo "O copia el contenido de:"
echo "supabase/migrations/20251027_trigger_chat_notifications.sql"
