#!/bin/bash

echo "============================================================"
echo "EXTRACTOR PROFESIONAL DE WHATSAPP - VERSIÓN DIRECTA"
echo "============================================================"
echo ""

# Configurar syncFullHistory
echo "🔄 Habilitando syncFullHistory..."
curl -s -X POST http://localhost:8080/settings/set/autorentar-main \
  -H apikey:7d0d63e938c69bb8db9e3ca64f8d2bed2135266fa3c0c925c93dbfebe7f6f68f \
  -H Content-Type:application/json \
  -d '{"rejectCall":false,"msgCall":"","groupsIgnore":false,"alwaysOnline":false,"readMessages":false,"readStatus":false,"syncFullHistory":true}' > /dev/null

echo "✅ Configuración aplicada"
echo ""

# Obtener ID de instancia
echo "📊 Consultando base de datos..."
INSTANCE_ID=$(docker exec evolution_postgres psql -U evolution_user -d evolution_db -t -A -c "SELECT id FROM evolution_api.\"Instance\" WHERE name = 'autorentar-main' LIMIT 1;" 2>/dev/null)

if [ -z "$INSTANCE_ID" ]; then
  echo "❌ No se encontró la instancia"
  exit 1
fi

echo "✅ Instancia ID: $INSTANCE_ID"
echo ""

# Contar chats
CHAT_COUNT=$(docker exec evolution_postgres psql -U evolution_user -d evolution_db -t -A -c "SELECT COUNT(*) FROM evolution_api.\"Chat\" WHERE \"instanceId\" = '$INSTANCE_ID';" 2>/dev/null)
echo "📊 Total de chats en DB: $CHAT_COUNT"

# Contar mensajes
MESSAGE_COUNT=$(docker exec evolution_postgres psql -U evolution_user -d evolution_db -t -A -c "SELECT COUNT(*) FROM evolution_api.\"Message\" WHERE \"instanceId\" = '$INSTANCE_ID';" 2>/dev/null)
echo "💬 Total de mensajes en DB: $MESSAGE_COUNT"
echo ""

if [ "$MESSAGE_COUNT" -gt 0 ]; then
  echo "📥 Extrayendo mensajes..."
  
  # Extraer todos los mensajes a JSON
  docker exec evolution_postgres psql -U evolution_user -d evolution_db -t -A -F '|' -c "
    SELECT 
      row_to_json(t)
    FROM (
      SELECT
        m.id,
        m.\"keyRemoteJid\" as remote_jid,
        m.\"keyFromMe\" as is_from_me,
        m.\"pushName\" as push_name,
        m.\"messageTimestamp\" as timestamp,
        m.\"message\" as content,
        c.\"remoteJid\" as chat_id
      FROM evolution_api.\"Message\" m
      LEFT JOIN evolution_api.\"Chat\" c ON m.\"keyRemoteJid\" = c.\"remoteJid\"
      WHERE m.\"instanceId\" = '$INSTANCE_ID'
      ORDER BY m.\"messageTimestamp\" DESC
      LIMIT 1000
    ) t
  " > whatsapp-messages.json 2>/dev/null
  
  echo "✅ Datos extraídos a: whatsapp-messages.json"
  echo ""
  echo "📋 Primeros 5 mensajes:"
  head -5 whatsapp-messages.json | jq -r '.push_name + ": " + (.content // "N/A")' 2>/dev/null || head -5 whatsapp-messages.json
else
  echo "⚠️  LA BASE DE DATOS ESTÁ VACÍA"
  echo ""
  echo "Baileys/Evolution API solo sincroniza mensajes que llegan"
  echo "DESPUÉS de conectar. No sincroniza historial antiguo automáticamente."
  echo ""
  echo "💡 PRÓXIMOS PASOS:"
  echo "   1. Enviate un mensaje de prueba desde otro teléfono"
  echo "   2. Esperá 30 segundos"
  echo "   3. Ejecutá este script nuevamente"
  echo ""
  echo "   O usá el método alternativo: extraer msgstore.db con key"
fi

echo ""
echo "============================================================"
