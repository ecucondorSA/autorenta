#!/bin/bash
# Verificación de pre-requisitos para tests de Google Calendar OAuth

set -e

echo "🔍 Verificando configuración para tests de Google Calendar OAuth..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

# 1. Verificar que el servidor dev esté corriendo
echo "1️⃣  Verificando servidor de desarrollo..."
if curl -s http://localhost:4200 > /dev/null; then
    echo -e "${GREEN}✓${NC} Servidor corriendo en http://localhost:4200"
else
    echo -e "${RED}✗${NC} Servidor NO está corriendo"
    echo "   Ejecuta: pnpm run dev"
    ((errors++))
fi
echo ""

# 2. Verificar variables de entorno en .env.development.local
echo "2️⃣  Verificando variables de entorno (.env.development.local)..."
if [ -f "apps/web/.env.development.local" ]; then
    echo -e "${GREEN}✓${NC} Archivo .env.development.local existe"
    
    # Check for required vars
    required_vars=("NG_APP_SUPABASE_URL" "NG_APP_SUPABASE_ANON_KEY")
    for var in "${required_vars[@]}"; do
        if grep -q "$var=" apps/web/.env.development.local; then
            echo -e "${GREEN}  ✓${NC} $var configurado"
        else
            echo -e "${RED}  ✗${NC} $var NO configurado"
            ((errors++))
        fi
    done
else
    echo -e "${RED}✗${NC} Archivo .env.development.local NO existe"
    echo "   Copia de .env.local.example y configura las variables"
    ((errors++))
fi
echo ""

# 3. Verificar que Supabase esté configurado
echo "3️⃣  Verificando configuración de Supabase..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓${NC} Supabase CLI instalado"
    
    # Check if logged in
    if supabase projects list &> /dev/null; then
        echo -e "${GREEN}✓${NC} Supabase CLI autenticado"
    else
        echo -e "${YELLOW}⚠${NC} Supabase CLI no autenticado"
        echo "   Ejecuta: npx supabase login"
        ((warnings++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Supabase CLI no instalado"
    echo "   Instalar: npm install -g supabase"
    ((warnings++))
fi
echo ""

# 4. Verificar Edge Function deployada
echo "4️⃣  Verificando Edge Function google-calendar-oauth..."
if [ -f "supabase/functions/google-calendar-oauth/index.ts" ]; then
    echo -e "${GREEN}✓${NC} Archivo de función existe"
    
    # Check if function is deployed (this will fail if not logged in, but that's ok)
    echo "   Verificando deployment..."
    if supabase functions list 2>&1 | grep -q "google-calendar-oauth"; then
        echo -e "${GREEN}  ✓${NC} Función deployada"
    else
        echo -e "${YELLOW}  ⚠${NC} Función podría no estar deployada"
        echo "     Deploy con: npx supabase functions deploy google-calendar-oauth"
        ((warnings++))
    fi
else
    echo -e "${RED}✗${NC} Archivo de función NO existe"
    ((errors++))
fi
echo ""

# 5. Verificar secrets de Supabase
echo "5️⃣  Verificando secrets de Supabase..."
required_secrets=("GOOGLE_OAUTH_CLIENT_ID" "GOOGLE_OAUTH_CLIENT_SECRET" "GOOGLE_OAUTH_REDIRECT_URI" "FRONTEND_URL")
echo "   Secrets requeridos:"
for secret in "${required_secrets[@]}"; do
    echo "   - $secret"
done
echo -e "${YELLOW}⚠${NC} No podemos verificar secrets automáticamente"
echo "   Verifica manualmente con: npx supabase secrets list"
echo ""

# 6. Verificar usuario de prueba
echo "6️⃣  Verificando usuario de prueba..."
echo "   El test espera un usuario con:"
echo "   - Email: test@example.com"
echo "   - Password: testpassword123"
echo -e "${YELLOW}⚠${NC} Debes crear este usuario manualmente en Supabase"
echo "   O edita el test para usar tus credenciales"
echo ""

# 7. Verificar Playwright instalado
echo "7️⃣  Verificando Playwright..."
if [ -d "node_modules/@playwright/test" ]; then
    echo -e "${GREEN}✓${NC} Playwright instalado"
    
    # Check browsers
    if npx playwright list-files | grep -q "chromium"; then
        echo -e "${GREEN}✓${NC} Navegadores instalados"
    else
        echo -e "${YELLOW}⚠${NC} Navegadores podrían no estar instalados"
        echo "   Instalar: npx playwright install"
        ((warnings++))
    fi
else
    echo -e "${RED}✗${NC} Playwright NO instalado"
    echo "   Instalar: pnpm install"
    ((errors++))
fi
echo ""

# 8. Verificar archivo de test existe
echo "8️⃣  Verificando archivo de test..."
if [ -f "tests/e2e/google-calendar-oauth.spec.ts" ]; then
    echo -e "${GREEN}✓${NC} Archivo de test existe"
else
    echo -e "${RED}✗${NC} Archivo de test NO existe"
    ((errors++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ Todo configurado correctamente!${NC}"
    echo ""
    echo "Ejecuta los tests con:"
    echo "  pnpm run test:e2e:calendar"
    exit 0
elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $warnings advertencia(s) encontrada(s)${NC}"
    echo ""
    echo "Los tests podrían funcionar, pero revisa las advertencias arriba."
    echo ""
    echo "Para ejecutar los tests de todos modos:"
    echo "  pnpm run test:e2e:calendar"
    exit 0
else
    echo -e "${RED}❌ $errors error(es) encontrado(s)${NC}"
    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $warnings advertencia(s) encontrada(s)${NC}"
    fi
    echo ""
    echo "Corrige los errores antes de ejecutar los tests."
    exit 1
fi
