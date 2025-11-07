#!/bin/bash

# Script para configurar branch protection rules usando GitHub CLI
# Requiere: gh CLI autenticado con permisos de admin

set -e

echo "🔒 Configurando Branch Protection Rules para 'main'..."
echo ""

# Verificar que gh está autenticado
if ! gh auth status > /dev/null 2>&1; then
    echo "❌ Error: GitHub CLI no está autenticado"
    echo "   Ejecuta: gh auth login"
    exit 1
fi

# Verificar permisos
echo "🔍 Verificando permisos..."
REPO="ecucondorSA/autorenta"

# Intentar configurar branch protection
echo "📝 Configurando protección para branch 'main'..."
echo ""

# Usar método más simple con archivo JSON temporal
cat > /tmp/branch-protection-config.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci",
      "build",
      "lint",
      "test",
      "pr-validation"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "require_linear_history": false
}
EOF

# Aplicar configuración
if gh api repos/$REPO/branches/main/protection \
  --method PUT \
  --input /tmp/branch-protection-config.json 2>&1; then
    echo ""
    echo "✅ Branch protection configurada exitosamente!"
    echo ""
    echo "📋 Configuración aplicada:"
    echo "   - Requiere 1 aprobación de code review"
    echo "   - Requiere que CI checks pasen"
    echo "   - Requiere resolución de conversaciones"
    echo "   - No permite force push"
    echo "   - No permite deletion"
    echo "   - Incluye administradores"
    echo ""
    echo "🔍 Verificar configuración:"
    echo "   gh api repos/$REPO/branches/main/protection"
    echo ""
    echo "🌐 Ver en GitHub UI:"
    echo "   https://github.com/$REPO/settings/branches"
else
    echo ""
    echo "⚠️  Error al configurar branch protection"
    echo ""
    echo "💡 Alternativas:"
    echo "   1. Configurar manualmente en GitHub UI:"
    echo "      https://github.com/$REPO/settings/branches"
    echo ""
    echo "   2. Ver instrucciones en:"
    echo "      .github/BRANCH_PROTECTION_SETUP.md"
    echo ""
    echo "   3. Verificar que tienes permisos de administrador"
    exit 1
fi

# Limpiar
rm -f /tmp/branch-protection-config.json

echo "✅ ¡Listo!"




