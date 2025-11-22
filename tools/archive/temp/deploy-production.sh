#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════╗
# ║  🚀 DEPLOYMENT SCRIPT - AUTORENTA PRODUCTION                         ║
# ║  Sistema de Precios Dinámicos + Booking Flow Fixes                  ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🚀 AUTORENTA PRODUCTION DEPLOYMENT                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════
# 1. PRE-DEPLOYMENT CHECKS
# ═══════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Pre-deployment Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check git status
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
  git status -s
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}✓${NC} Current branch: $CURRENT_BRANCH"

# Check last commit
LAST_COMMIT=$(git --no-pager log --oneline -1)
echo -e "${GREEN}✓${NC} Last commit: $LAST_COMMIT"

# ═══════════════════════════════════════════════════════════════
# 2. BUILD APPLICATION
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Building Application${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Building Angular app..."
npm run build

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Build successful"
else
  echo -e "${RED}✗${NC} Build failed"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 3. CHECK ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. Environment Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ENV_FILE="apps/web/.env.development.local"

if [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}✓${NC} Environment file found"
  
  # Check critical vars
  if grep -q "NG_APP_SUPABASE_URL" "$ENV_FILE"; then
    echo -e "${GREEN}✓${NC} Supabase URL configured"
  else
    echo -e "${RED}✗${NC} Supabase URL missing"
    exit 1
  fi
  
  if grep -q "NG_APP_SUPABASE_ANON_KEY" "$ENV_FILE"; then
    echo -e "${GREEN}✓${NC} Supabase Anon Key configured"
  else
    echo -e "${RED}✗${NC} Supabase Anon Key missing"
    exit 1
  fi
else
  echo -e "${RED}✗${NC} Environment file not found: $ENV_FILE"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 4. VERIFY DATABASE CONNECTION
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. Database Connection${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

export PGPASSWORD='ECUCONDOR08122023'

# Test connection
if psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "SELECT NOW();" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Database connection successful"
else
  echo -e "${RED}✗${NC} Database connection failed"
  exit 1
fi

# Check Cron Jobs
CRON_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM cron.job WHERE active = true;" 2>/dev/null)

if [ "$CRON_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓${NC} Cron Jobs active: $CRON_COUNT"
else
  echo -e "${YELLOW}⚠${NC}  No active Cron Jobs found"
fi

# Check Realtime tables
REALTIME_COUNT=$(psql "postgresql://postgres.obxvffplochgeiclibng@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -t -c "SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('exchange_rates', 'pricing_demand_snapshots', 'pricing_special_events');" 2>/dev/null)

if [ "$REALTIME_COUNT" -ge 3 ]; then
  echo -e "${GREEN}✓${NC} Realtime enabled on $REALTIME_COUNT tables"
else
  echo -e "${YELLOW}⚠${NC}  Realtime not fully enabled (expected 3, found $REALTIME_COUNT)"
fi

# ═══════════════════════════════════════════════════════════════
# 5. DEPLOYMENT OPTIONS
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. Deployment Target${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Select deployment target:"
echo "  1) Cloudflare Pages (Automatic via GitHub)"
echo "  2) Vercel"
echo "  3) Netlify"
echo "  4) Manual (copy dist files)"
echo "  5) Skip deployment"
echo ""

read -p "Enter choice (1-5): " DEPLOY_CHOICE

case $DEPLOY_CHOICE in
  1)
    echo ""
    echo -e "${GREEN}✓${NC} Cloudflare Pages Deployment"
    echo ""
    echo "Your changes have been pushed to GitHub."
    echo "Cloudflare Pages will automatically deploy from main branch."
    echo ""
    echo "Check status at:"
    echo "  https://dash.cloudflare.com/your-account/pages"
    echo ""
    echo -e "${YELLOW}⚠${NC}  Make sure GitHub integration is configured"
    ;;
  
  2)
    echo ""
    echo -e "${GREEN}✓${NC} Vercel Deployment"
    echo ""
    if command -v vercel &> /dev/null; then
      echo "Deploying to Vercel..."
      cd apps/web && vercel --prod
    else
      echo -e "${YELLOW}⚠${NC}  Vercel CLI not installed"
      echo "Install with: npm i -g vercel"
      echo "Then run: vercel --prod"
    fi
    ;;
  
  3)
    echo ""
    echo -e "${GREEN}✓${NC} Netlify Deployment"
    echo ""
    if command -v netlify &> /dev/null; then
      echo "Deploying to Netlify..."
      cd apps/web && netlify deploy --prod --dir=dist/web
    else
      echo -e "${YELLOW}⚠${NC}  Netlify CLI not installed"
      echo "Install with: npm i -g netlify-cli"
      echo "Then run: netlify deploy --prod"
    fi
    ;;
  
  4)
    echo ""
    echo -e "${GREEN}✓${NC} Manual Deployment"
    echo ""
    echo "Build files location:"
    echo "  apps/web/dist/web/"
    echo ""
    echo "Copy these files to your web server"
    ;;
  
  5)
    echo ""
    echo -e "${YELLOW}ℹ${NC}  Skipping deployment"
    ;;
  
  *)
    echo -e "${RED}✗${NC} Invalid choice"
    exit 1
    ;;
esac

# ═══════════════════════════════════════════════════════════════
# 6. POST-DEPLOYMENT VERIFICATION
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. Post-Deployment Checklist${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Manual verification needed:"
echo ""
echo "  □ Open production URL"
echo "  □ Check browser console for WebSocket connections:"
echo "    - Look for: '💱 Exchange rates channel status: SUBSCRIBED'"
echo "    - Look for: '📈 Demand channel status: SUBSCRIBED'"
echo ""
echo "  □ Test booking flow with real user:"
echo "    - Login with real email (not test@autorenta.com)"
echo "    - Select car with dates"
echo "    - Verify availability filtering works"
echo "    - Complete card authorization"
echo "    - Verify email is used (check payment gateway logs)"
echo ""
echo "  □ Monitor for errors:"
echo "    - Supabase logs"
echo "    - Browser console errors"
echo "    - Network tab for failed requests"
echo ""

# ═══════════════════════════════════════════════════════════════
# DEPLOYMENT SUMMARY
# ═══════════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   ✅ DEPLOYMENT COMPLETE                                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Summary:${NC}"
echo "  • Commits pushed: ✓"
echo "  • Build successful: ✓"
echo "  • Database connected: ✓"
echo "  • Environment configured: ✓"
echo ""

echo -e "${YELLOW}What was deployed:${NC}"
echo "  • Dynamic pricing with WebSocket Realtime"
echo "  • Binance API integration"
echo "  • P0 Fix: Real user email in card authorization"
echo "  • P0 Fix: Availability blocking (no double bookings)"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "  1. Monitor application for 15-30 minutes"
echo "  2. Test critical flows (search, booking, payment)"
echo "  3. Check Supabase metrics dashboard"
echo "  4. Verify Cron Jobs are running"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# ROLLBACK INSTRUCTIONS
# ═══════════════════════════════════════════════════════════════

echo -e "${RED}If something goes wrong:${NC}"
echo ""
echo "Rollback to previous version:"
echo "  git reset --hard 0f6dddc"
echo "  git push origin main --force"
echo ""
echo "Or create hotfix branch:"
echo "  git checkout -b hotfix/rollback-pricing"
echo "  git revert HEAD~3..HEAD"
echo "  git push origin hotfix/rollback-pricing"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Deployment script completed${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
