#!/bin/bash

echo "🔄 Actualizando tasa de cambio manualmente..."

SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY apps/web/.env.development.local | cut -d '=' -f2)

curl -X POST \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/sync-binance-rates

echo -e "\n✅ Actualización completada"
