#!/bin/bash
# Helper script para copiar secrets al portapapeles (si está disponible)

echo "🔐 Secrets para Cursor:"
echo ""
echo "1. NG_APP_SUPABASE_URL"
echo "   Valor: https://obxvffplochgeiclibng.supabase.co"
echo ""
echo "2. NG_APP_SUPABASE_ANON_KEY"
echo "   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU"
echo ""
echo "3. NG_APP_MAPBOX_ACCESS_TOKEN"
echo "   Valor: [OBTENER DESDE MAPBOX]"
echo ""

# Intentar copiar al portapapeles si xclip o pbcopy están disponibles
if command -v xclip &> /dev/null; then
  echo "💡 Usa: xclip -selection clipboard para copiar valores"
elif command -v pbcopy &> /dev/null; then
  echo "💡 Usa: pbcopy para copiar valores"
fi
