#!/bin/bash

# ========================================
# Cron Job - Limpieza de Depósitos Viejos
# ========================================
#
# Ejecuta la función cleanup_old_pending_deposits() diariamente
# para cancelar transacciones pending con más de 30 días
#
# Instalación:
#   crontab -e
#   # Agregar línea:
#   0 2 * * * /home/edu/autorenta/tools/cleanup-old-deposits-cron.sh >> /var/log/wallet-cleanup.log 2>&1
#
# Esto ejecutará el cleanup todos los días a las 2:00 AM (hora local)
#

DB_URL="postgresql://postgres.pisqjmoklivzpwufhscx:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres"
PGPASSWORD="ECUCONDOR08122023"

# Timestamp para logging
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "========================================="
echo "Wallet Cleanup - $TIMESTAMP"
echo "========================================="

# Ejecutar función de cleanup
result=$(PGPASSWORD="$PGPASSWORD" psql "$DB_URL" -t -A -c "SELECT * FROM cleanup_old_pending_deposits();")

if [ $? -eq 0 ]; then
  echo "✅ Cleanup ejecutado exitosamente"
  echo "Resultado: $result"

  # Parsear resultado (formato: cleaned_count|message)
  cleaned_count=$(echo "$result" | cut -d'|' -f1)
  message=$(echo "$result" | cut -d'|' -f2)

  echo "Transacciones canceladas: $cleaned_count"
  echo "Mensaje: $message"

  # Enviar notificación si se cancelaron transacciones (opcional)
  if [ "$cleaned_count" -gt 0 ]; then
    echo "⚠️  ATENCIÓN: Se cancelaron $cleaned_count transacciones viejas"
    # TODO: Enviar email o notificación (ej. webhook a Slack/Discord)
    # curl -X POST https://hooks.slack.com/... -d "{\"text\":\"Wallet cleanup: $cleaned_count cancelados\"}"
  fi
else
  echo "❌ Error ejecutando cleanup"
  exit 1
fi

echo "========================================="
echo ""
