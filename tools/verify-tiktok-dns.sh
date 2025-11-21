#!/bin/bash
# Script para verificar el registro TXT de TikTok después de agregarlo

DOMAIN="autorentar.com"
TXT_CONTENT="tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"

echo "🔍 Verificando registro TXT de TikTok para $DOMAIN..."
echo ""

# Verificar usando dig
if command -v dig &> /dev/null; then
  echo "📡 Verificando con dig..."
  RESULT=$(dig TXT $DOMAIN +short 2>/dev/null | grep -o "tiktok-developers-site-verification=[^ ]*" || echo "")

  if [ -n "$RESULT" ]; then
    echo "✅ Registro encontrado: $RESULT"
    if echo "$RESULT" | grep -q "$TXT_CONTENT"; then
      echo "✅ El contenido coincide correctamente"
      echo ""
      echo "🎉 ¡Registro verificado exitosamente!"
      echo "💡 Ahora puedes regresar a TikTok Developers y hacer click en 'Verify'"
    else
      echo "⚠️  El contenido no coincide exactamente"
      echo "   Esperado: $TXT_CONTENT"
      echo "   Encontrado: $RESULT"
    fi
  else
    echo "⏳ Registro aún no se ha propagado (esto es normal, puede tardar 5-10 minutos)"
    echo "💡 Intenta de nuevo en unos minutos"
  fi
else
  echo "⚠️  dig no está instalado. Instalando..."
  echo "💡 Puedes verificar manualmente en:"
  echo "   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/$DOMAIN/dns"
fi

echo ""
echo "📋 Para verificar manualmente:"
echo "   1. Ve a: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/$DOMAIN/dns"
echo "   2. Busca el registro TXT con contenido: $TXT_CONTENT"
echo "   3. O usa: dig TXT $DOMAIN +short"



