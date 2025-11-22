#!/bin/bash
# Script para obtener y configurar CLOUDFLARE_API_TOKEN desde GitHub Secrets

echo "🔐 Obteniendo CF_API_TOKEN desde GitHub Secrets..."
echo ""

# Verificar GitHub CLI
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI no está instalado"
  exit 1
fi

# Verificar autenticación
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub CLI no está autenticado"
  echo "Ejecuta: gh auth login"
  exit 1
fi

# Verificar que el secret existe
if gh secret list | grep -q "CF_API_TOKEN"; then
  echo "✅ CF_API_TOKEN encontrado en GitHub Secrets"
  echo ""
  echo "📋 Para obtener el valor:"
  echo "   1. Ve a: https://github.com/ecucondorSA/autorenta/settings/secrets/actions"
  echo "   2. Click en 'CF_API_TOKEN'"
  echo "   3. Click en 'Update' (solo para ver el valor)"
  echo "   4. Copia el valor y ejecuta:"
  echo "      export CLOUDFLARE_API_TOKEN='tu-token'"
  echo ""
  echo "💡 Luego ejecuta: ./tools/add-tiktok-dns-now.sh"
else
  echo "❌ CF_API_TOKEN no encontrado en GitHub Secrets"
fi
