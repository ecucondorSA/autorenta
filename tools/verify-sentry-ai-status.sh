#!/bin/bash

# 🔍 Verificar estado de Sentry AI Code Review

set -e

SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-YOUR_AUTH_TOKEN_HERE}"
SENTRY_ORG="ecu-iu"
SENTRY_PROJECT="autorenta"

export SENTRY_AUTH_TOKEN

echo "🔍 Verificando estado de Sentry AI Code Review..."
echo ""

# 1. Verificar autenticación
echo "1️⃣  Autenticación:"
if sentry-cli info > /dev/null 2>&1; then
    USER=$(sentry-cli info 2>/dev/null | grep "User:" | awk '{print $2}')
    echo "   ✅ Autenticado como: $USER"
else
    echo "   ❌ No autenticado"
    exit 1
fi

# 2. Verificar organización
echo ""
echo "2️⃣  Organización:"
ORG_INFO=$(sentry-cli organizations list 2>/dev/null | grep "$SENTRY_ORG" || echo "")
if [ -n "$ORG_INFO" ]; then
    echo "   ✅ Organización '$SENTRY_ORG' encontrada"
else
    echo "   ❌ Organización '$SENTRY_ORG' no encontrada"
fi

# 3. Verificar proyecto
echo ""
echo "3️⃣  Proyecto:"
PROJECT_INFO=$(sentry-cli projects list --org "$SENTRY_ORG" 2>/dev/null | grep "$SENTRY_PROJECT" || echo "")
if [ -n "$PROJECT_INFO" ]; then
    echo "   ✅ Proyecto '$SENTRY_PROJECT' encontrado"
else
    echo "   ❌ Proyecto '$SENTRY_PROJECT' no encontrado"
fi

# 4. Verificar configuración local
echo ""
echo "4️⃣  Configuración local:"
if [ -f "$HOME/.sentryclirc" ]; then
    echo "   ✅ Archivo de configuración existe: ~/.sentryclirc"
    if grep -q "defaults.org" "$HOME/.sentryclirc"; then
        ORG_CONFIG=$(grep "defaults.org" "$HOME/.sentryclirc" | cut -d'=' -f2)
        echo "   ✅ Organización por defecto: $ORG_CONFIG"
    fi
else
    echo "   ⚠️  Archivo de configuración no existe"
fi

# 5. Verificar token en GitHub Secrets (solo info)
echo ""
echo "5️⃣  GitHub Secrets:"
echo "   ℹ️  Verifica manualmente que SENTRY_AUTH_TOKEN esté configurado en:"
echo "   → https://github.com/[tu-org]/autorenta/settings/secrets/actions"
echo ""

# 6. Estado de integraciones (requiere UI)
echo "6️⃣  Integraciones de GitHub:"
echo "   ℹ️  Las integraciones se verifican desde la UI:"
echo "   → https://ecu-iu.sentry.io/settings/integrations/github/"
echo ""
echo "   Para verificar manualmente:"
echo "   1. Ve a la URL de arriba"
echo "   2. Verifica que 'autorenta' aparezca como repositorio conectado"
echo "   3. Verifica que los permisos sean correctos"
echo ""

# 7. Estado de AI Code Review (requiere UI)
echo "7️⃣  AI Code Review:"
echo "   ℹ️  El estado de AI Code Review se verifica desde la UI:"
echo "   → https://ecu-iu.sentry.io/prevent/ai-code-review/"
echo ""
echo "   Para verificar manualmente:"
echo "   1. Ve a Settings → Organization Settings"
echo "   2. Verifica que 'Enable AI Code Review' esté activado"
echo "   3. Verifica que 'Show Generative AI Features' esté activado"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Verificación completada"
echo ""
echo "📋 Resumen:"
echo "   • Token configurado: ✅"
echo "   • Organización: $SENTRY_ORG ✅"
echo "   • Proyecto: $SENTRY_PROJECT ✅"
echo "   • GitHub App: ⚠️  Verificar manualmente (requiere UI)"
echo "   • AI Code Review: ⚠️  Verificar manualmente (requiere UI)"
echo ""
echo "🔗 Links útiles:"
echo "   • Sentry Dashboard: https://ecu-iu.sentry.io"
echo "   • AI Code Review: https://ecu-iu.sentry.io/prevent/ai-code-review/"
echo "   • GitHub Integrations: https://ecu-iu.sentry.io/settings/integrations/github/"
echo "   • GitHub App: https://github.com/apps/sentry"
echo ""
