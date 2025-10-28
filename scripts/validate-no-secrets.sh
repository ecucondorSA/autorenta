#!/bin/bash

echo "🔍 Buscando secretos expuestos en el código..."
echo ""

FOUND=0
ISSUES=()

# Buscar JWTs hardcoded
if grep -r "eyJhbG" apps/ supabase/ functions/ --exclude-dir=node_modules --exclude-dir=.angular --exclude="*.md" 2>/dev/null | grep -v "\.env"; then
  echo "❌ Encontrado JWT hardcoded"
  ISSUES+=("JWT tokens hardcoded")
  FOUND=1
fi

# Buscar tokens de MercadoPago
if grep -r "APP_USR-\|TEST-[0-9]" apps/ supabase/ functions/ *.sh --exclude-dir=node_modules --exclude="*.md" 2>/dev/null | grep -v "\.env\|\.example"; then
  echo "❌ Encontrado token de MercadoPago"
  ISSUES+=("MercadoPago tokens hardcoded")
  FOUND=1
fi

# Buscar tokens de Mapbox
if grep -r "pk\.[a-zA-Z0-9]\{60,\}" apps/ supabase/ --exclude-dir=node_modules --exclude="*.md" 2>/dev/null | grep -v "\.env\|\.example"; then
  echo "❌ Posible Mapbox token hardcoded"
  ISSUES+=("Mapbox tokens hardcoded")
  FOUND=1
fi

# Buscar passwords en texto plano
if grep -ri "password.*=.*['\"][^$]" *.sh --exclude="*.md" 2>/dev/null | grep -v "\.env\|\.example\|your-\|PASSWORD"; then
  echo "❌ Passwords en texto plano"
  ISSUES+=("Passwords in plain text")
  FOUND=1
fi

# Buscar database URLs con credenciales
if grep -r "postgres.*://.*:.*@" *.sh --exclude="*.md" 2>/dev/null | grep -v "\.env\|\.example\|YOUR-PASSWORD\|\${"; then
  echo "❌ Database URL con credenciales hardcoded"
  ISSUES+=("Database URLs with credentials")
  FOUND=1
fi

echo ""
if [ $FOUND -eq 0 ]; then
  echo "✅ No se encontraron secretos expuestos"
  echo "✅ El código está seguro"
  exit 0
else
  echo "❌ Se encontraron ${#ISSUES[@]} tipos de secretos expuestos:"
  for issue in "${ISSUES[@]}"; do
    echo "   - $issue"
  done
  echo ""
  echo "🔧 Acciones recomendadas:"
  echo "   1. Mueve todos los secretos a .env.local"
  echo "   2. Usa variables de entorno (\${VAR})"
  echo "   3. Verifica que .gitignore incluya .env*"
  echo "   4. Haz git commit de los cambios"
  echo ""
  exit 1
fi
