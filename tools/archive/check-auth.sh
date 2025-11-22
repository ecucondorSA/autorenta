#!/bin/bash
# ============================================================================
# Quick check de estado de autenticación
# Verifica rápidamente si todas las herramientas CLI están autenticadas
# ============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "🔐 Estado de Autenticación"
echo "=========================="
echo ""

# GitHub
echo -n "GitHub CLI:        "
if command -v gh &> /dev/null && gh auth status &> /dev/null; then
  USER=$(gh api user --jq .login 2>/dev/null || echo "autenticado")
  echo -e "${GREEN}✅ Autenticado${NC} ($USER)"
else
  echo -e "${RED}❌ No autenticado${NC}"
fi

# Supabase
echo -n "Supabase CLI:      "
if command -v supabase &> /dev/null && supabase projects list &> /dev/null 2>&1; then
  echo -e "${GREEN}✅ Autenticado${NC}"
else
  echo -e "${RED}❌ No autenticado${NC}"
fi

# Cloudflare
echo -n "Cloudflare Wrangler: "
if command -v wrangler &> /dev/null; then
  if wrangler whoami &> /dev/null 2>&1; then
    EMAIL=$(wrangler whoami 2>/dev/null | grep -E "You are logged in as" | sed 's/.*as //' || echo "")
    if [ -n "$EMAIL" ]; then
      echo -e "${GREEN}✅ Autenticado${NC} ($EMAIL)"
    else
      echo -e "${GREEN}✅ Autenticado${NC}"
    fi
  else
    echo -e "${RED}❌ No autenticado${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ No instalado${NC}"
fi

echo ""
echo "Para autenticar todas las herramientas:"
echo "  ./tools/setup-auth.sh"
echo ""

