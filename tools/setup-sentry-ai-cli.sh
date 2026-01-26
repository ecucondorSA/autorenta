#!/bin/bash

# 🤖 Setup Sentry AI Code Review desde CLI
# Configura todo lo posible desde la línea de comandos

set -e

SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-YOUR_AUTH_TOKEN_HERE}"
SENTRY_ORG="ecu-iu"  # Ajusta si es diferente
SENTRY_PROJECT="autorenta-web"  # Ajusta si es diferente

export SENTRY_AUTH_TOKEN

echo "🚀 Configurando Sentry AI Code Review desde CLI..."
echo ""

# 1. Verificar que Sentry CLI está instalado
if ! command -v sentry-cli &> /dev/null; then
    echo "❌ Sentry CLI no está instalado"
    echo "   Instalando..."
    npm install -g @sentry/cli
fi

# 2. Configurar token
echo "1️⃣  Configurando token de autenticación..."
sentry-cli login --auth-token "$SENTRY_AUTH_TOKEN" > /dev/null 2>&1
echo "   ✅ Token configurado"

# 3. Verificar información
echo ""
echo "2️⃣  Verificando configuración..."
sentry-cli info | grep -E "(User|Organization|Project)" || true

# 4. Listar organizaciones disponibles
echo ""
echo "3️⃣  Organizaciones disponibles:"
sentry-cli organizations list

# 5. Configurar organización por defecto (si no está configurada)
echo ""
echo "4️⃣  Configurando organización por defecto..."
if [ -n "$SENTRY_ORG" ]; then
    # Guardar en .sentryclirc
    SENTRYCLI_RC="$HOME/.sentryclirc"
    if ! grep -q "defaults.org" "$SENTRYCLI_RC" 2>/dev/null; then
        echo "defaults.org=$SENTRY_ORG" >> "$SENTRYCLI_RC"
        echo "   ✅ Organización configurada: $SENTRY_ORG"
    else
        echo "   ℹ️  Organización ya configurada"
    fi
fi

# 6. Verificar proyectos
echo ""
echo "5️⃣  Proyectos disponibles:"
sentry-cli projects list --org "$SENTRY_ORG" 2>/dev/null || echo "   ⚠️  No se pudo listar proyectos (verifica la organización)"

# 7. Instrucciones para GitHub App
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PRÓXIMOS PASOS (Requieren UI de GitHub):"
echo ""
echo "La instalación de la GitHub App requiere autorización OAuth que no se puede"
echo "hacer completamente desde CLI. Sigue estos pasos:"
echo ""
echo "1. Instalar Sentry GitHub App:"
echo "   → https://github.com/apps/sentry"
echo "   → Click en 'Configure'"
echo "   → Selecciona tu organización/repositorio 'autorenta'"
echo "   → Acepta los permisos necesarios"
echo ""
echo "2. Conectar repositorio en Sentry:"
echo "   → https://ecu-iu.sentry.io/settings/integrations/github/"
echo "   → Click en 'Add Repository'"
echo "   → Selecciona 'autorenta'"
echo ""
echo "3. Verificar que AI Code Review esté habilitado:"
echo "   → https://ecu-iu.sentry.io/settings/account/api/auth-tokens/"
echo "   → Verifica que 'Enable AI Code Review' esté activado"
echo ""
echo "4. Probar con un PR:"
echo "   → Crea un PR de prueba"
echo "   → Márcalo como 'Ready for review'"
echo "   → O comenta '@sentry review'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 8. Verificar integraciones existentes (si la API lo permite)
echo "6️⃣  Verificando integraciones..."
echo "   ℹ️  Las integraciones de GitHub se gestionan desde la UI de Sentry"
echo "   → https://ecu-iu.sentry.io/settings/integrations/github/"
echo ""

# 9. Guardar token en GitHub Secrets (si es necesario)
echo "7️⃣  Token configurado en:"
echo "   → ~/.sentryclirc"
echo ""
echo "   Para usar en GitHub Actions, agrega este token como secret:"
echo "   → SENTRY_AUTH_TOKEN: $SENTRY_AUTH_TOKEN"
echo ""

echo "✅ Configuración CLI completada"
echo ""
echo "📚 Recursos:"
echo "   • Sentry Dashboard: https://ecu-iu.sentry.io"
echo "   • AI Code Review: https://ecu-iu.sentry.io/prevent/ai-code-review/"
echo "   • GitHub App: https://github.com/apps/sentry"
echo ""
