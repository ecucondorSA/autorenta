#!/bin/bash

#############################################################################
# 🚀 SETUP AUTOMÁTICO: SOCIAL MEDIA MARKETING SYSTEM
#
# Este script automatiza TODO:
# 1. Obtiene tokens de redes sociales
# 2. Guarda en Supabase Secrets
# 3. Aplica migraciones
# 4. Deploy a producción
#
# Uso:
#   ./scripts/setup-social-media-auto.sh
#############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   🚀 SETUP AUTOMÁTICO - MARKETING EN REDES SOCIALES           ║"
echo "║   Facebook • Instagram • LinkedIn • TikTok                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

#############################################################################
# PASO 1: Verificar requisitos
#############################################################################
echo -e "${YELLOW}📋 PASO 1: Verificando requisitos...${NC}\n"

# Verificar supabase CLI
if ! command -v supabase &> /dev/null; then
  echo -e "${RED}❌ Supabase CLI no encontrado${NC}"
  echo "Instala: brew install supabase/tap/supabase"
  exit 1
fi

# Verificar git
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ Git no encontrado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Requisitos OK${NC}\n"

#############################################################################
# PASO 2: Obtener credenciales del usuario
#############################################################################
echo -e "${YELLOW}📝 PASO 2: Ingresa tus credenciales${NC}\n"

# Facebook
echo -e "${BLUE}📘 Facebook${NC}"
read -p "Facebook Page ID: " FACEBOOK_PAGE_ID
read -s -p "Facebook Access Token: " FACEBOOK_ACCESS_TOKEN
echo ""

# Instagram
echo -e "${BLUE}📷 Instagram${NC}"
read -p "Instagram Business Account ID: " INSTAGRAM_BUSINESS_ID
read -s -p "Instagram Access Token: " INSTAGRAM_ACCESS_TOKEN
echo ""

# LinkedIn
echo -e "${BLUE}💼 LinkedIn${NC}"
read -p "LinkedIn Page ID (Organization ID): " LINKEDIN_PAGE_ID
read -s -p "LinkedIn Access Token: " LINKEDIN_ACCESS_TOKEN
echo ""

# TikTok
echo -e "${BLUE}🎵 TikTok${NC}"
read -p "TikTok Business ID: " TIKTOK_BUSINESS_ID
read -s -p "TikTok Access Token: " TIKTOK_ACCESS_TOKEN
echo ""

echo -e "${GREEN}✅ Credenciales recibidas${NC}\n"

#############################################################################
# PASO 3: Guardar en Supabase Secrets
#############################################################################
echo -e "${YELLOW}🔐 PASO 3: Guardando en Supabase Secrets...${NC}\n"

echo "Guardando FACEBOOK_PAGE_ID..."
supabase secrets set FACEBOOK_PAGE_ID="$FACEBOOK_PAGE_ID"

echo "Guardando FACEBOOK_ACCESS_TOKEN..."
supabase secrets set FACEBOOK_ACCESS_TOKEN="$FACEBOOK_ACCESS_TOKEN"

echo "Guardando INSTAGRAM_BUSINESS_ID..."
supabase secrets set INSTAGRAM_BUSINESS_ID="$INSTAGRAM_BUSINESS_ID"

echo "Guardando INSTAGRAM_ACCESS_TOKEN..."
supabase secrets set INSTAGRAM_ACCESS_TOKEN="$INSTAGRAM_ACCESS_TOKEN"

echo "Guardando LINKEDIN_PAGE_ID..."
supabase secrets set LINKEDIN_PAGE_ID="$LINKEDIN_PAGE_ID"

echo "Guardando LINKEDIN_ACCESS_TOKEN..."
supabase secrets set LINKEDIN_ACCESS_TOKEN="$LINKEDIN_ACCESS_TOKEN"

echo "Guardando TIKTOK_BUSINESS_ID..."
supabase secrets set TIKTOK_BUSINESS_ID="$TIKTOK_BUSINESS_ID"

echo "Guardando TIKTOK_ACCESS_TOKEN..."
supabase secrets set TIKTOK_ACCESS_TOKEN="$TIKTOK_ACCESS_TOKEN"

echo -e "${GREEN}✅ Secrets guardados en Supabase${NC}\n"

#############################################################################
# PASO 4: Verificar secrets
#############################################################################
echo -e "${YELLOW}✅ PASO 4: Verificando Secrets guardados...${NC}\n"

supabase secrets list

echo -e "${GREEN}✅ Secrets verificados${NC}\n"

#############################################################################
# PASO 5: Aplicar migraciones
#############################################################################
echo -e "${YELLOW}📊 PASO 5: Aplicando migraciones a la BD...${NC}\n"

echo "Esto puede demorar 1-2 minutos..."
supabase db push --linked

echo -e "${GREEN}✅ Migraciones aplicadas${NC}\n"

#############################################################################
# PASO 6: Verificar tablas creadas
#############################################################################
echo -e "${YELLOW}🗄️  PASO 6: Verificando tablas creadas...${NC}\n"

TABLES=(
  "social_media_credentials"
  "campaign_schedules"
  "social_publishing_log"
  "campaign_events"
)

for table in "${TABLES[@]}"; do
  echo -n "Verificando tabla $table... "
  supabase db execute "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" && echo "✅" || echo "❌"
done

echo -e "${GREEN}✅ Tablas verificadas${NC}\n"

#############################################################################
# PASO 7: Git commit y push
#############################################################################
echo -e "${YELLOW}📤 PASO 7: Commitear cambios a GitHub...${NC}\n"

cd /home/edu/autorentar

git add .
git commit -m "feat(marketing): add automated social media publishing system

- Configure Facebook, Instagram, LinkedIn, TikTok credentials
- Set up campaign scheduling with pg_cron
- Deploy Edge Function for parallel publishing
- Add admin dashboard for campaign management

Co-Authored-By: Claude <noreply@anthropic.com>"

echo "Pushing to GitHub..."
git push origin main

echo -e "${GREEN}✅ Cambios pushed a GitHub${NC}\n"

#############################################################################
# PASO 8: Monitor GitHub Actions
#############################################################################
echo -e "${YELLOW}⏳ PASO 8: Esperando deploy en GitHub Actions...${NC}\n"

# Esperar 10 segundos para que inicie el workflow
sleep 10

# Ver status del workflow
echo "Verificando status del deploy..."
gh run list --limit 1

echo ""
echo -e "${YELLOW}Para monitorear en tiempo real:${NC}"
echo -e "  ${BLUE}gh run watch${NC}\n"

#############################################################################
# RESUMEN FINAL
#############################################################################
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            ✅ SETUP COMPLETADO EXITOSAMENTE                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${BLUE}📍 PRÓXIMOS PASOS:${NC}\n"

echo "1️⃣  Esperar a que GitHub Actions termine el deploy (5-10 minutos)"
echo "   Comando: ${BLUE}gh run watch${NC}\n"

echo "2️⃣  Ir al dashboard admin:"
echo "   URL: ${BLUE}https://autorentar.app/admin/social-campaigns${NC}\n"

echo "3️⃣  Crear tu primera campaña:"
echo "   - Título: '¡Gana dinero alquilando tu auto!'"
echo "   - Descripción: 'Obtén hasta \$500 USD mensuales'"
echo "   - Imagen: URL de imagen promocional"
echo "   - Plataformas: Selecciona todas 4"
echo "   - Fecha: Ahora o una hora específica"
echo "   - Clic en '🚀 Programar Publicación'\n"

echo "4️⃣  Ver publicaciones:"
echo "   - Facebook:  https://www.facebook.com/autorentar"
echo "   - Instagram: https://www.instagram.com/autorentar"
echo "   - LinkedIn:  https://www.linkedin.com/company/autorentar"
echo "   - TikTok:    https://www.tiktok.com/@autorentar\n"

echo "5️⃣  Monitorear ejecución:"
echo "   - Dashboard: /admin/social-campaigns"
echo "   - Logs:      SELECT * FROM social_publishing_log\n"

echo -e "${YELLOW}📚 Más info:${NC}"
echo "  ${BLUE}cat SETUP_SOCIAL_MEDIA_MARKETING.md${NC}\n"

echo -e "${GREEN}¡Tu sistema de marketing automático está listo! 🎉${NC}\n"
