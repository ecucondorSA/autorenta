#!/bin/bash
# Script rápido para agregar registro TXT de TikTok - Guía interactiva

DOMAIN="autorentar.com"
TXT_CONTENT="tiktok-developers-site-verification=933WGFWSl55S6GpQilNQXer0Fbl7ggl3"

echo "🎵 Agregar Registro TXT de TikTok en Cloudflare"
echo "================================================"
echo ""
echo "📋 Información del registro:"
echo "   Dominio: $DOMAIN"
echo "   Tipo: TXT"
echo "   Nombre: @"
echo "   Contenido: $TXT_CONTENT"
echo "   TTL: Automático"
echo "   Proxy Status: Solo DNS"
echo ""
echo "🔗 Abriendo Cloudflare Dashboard..."
echo ""

# Intentar abrir en navegador
if command -v xdg-open &> /dev/null; then
  xdg-open "https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/$DOMAIN/dns" 2>/dev/null &
elif command -v open &> /dev/null; then
  open "https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/$DOMAIN/dns" 2>/dev/null &
fi

echo "✅ Dashboard abierto en tu navegador"
echo ""
echo "📝 Pasos a seguir:"
echo "   1. En la página de DNS, haz click en 'Agregar registro' (botón azul)"
echo "   2. Completa los campos:"
echo "      - Tipo: TXT"
echo "      - Nombre: @"
echo "      - Contenido: $TXT_CONTENT"
echo "      - TTL: Automático"
echo "      - Proxy Status: Solo DNS (importante: NO usar proxy)"
echo "   3. Haz click en 'Guardar'"
echo "   4. Espera 5-10 minutos para propagación"
echo "   5. Regresa a TikTok Developers y haz click en 'Verify'"
echo ""
echo "💡 URL directa:"
echo "   https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/domains/$DOMAIN/dns"
echo ""



