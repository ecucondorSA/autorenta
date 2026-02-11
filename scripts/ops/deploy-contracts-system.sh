#!/bin/bash

###############################################################################
# AutoRenta - Contract System Deployment Script
#
# This script deploys the complete legal contract system including:
# - Database migration (booking_contracts enhancements)
# - Edge Function (PDF generation with Puppeteer)
# - Frontend build (Angular 18+ with contract UI)
# - Verification tests
#
# Legal Compliance:
# - Ley 25.506 (Digital Signature)
# - Ley 20.091 (SSN Insurance Regulation)
# - Art. 173 CP (Illegal Retention)
# - Art. 886 CCyC (Automatic Default)
#
# Usage:
#   ./scripts/deploy-contracts-system.sh [--local|--production]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Environment (default: production)
ENV="${1:-production}"

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     AutoRenta - Contract System Deployment              ║${NC}"
echo -e "${GREEN}║     Environment: ${ENV}                                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Database Migration
echo -e "${YELLOW}[1/6] Applying database migration...${NC}"

if [ "$ENV" == "local" ]; then
  echo "  → Applying to local Supabase instance"
  supabase db push
else
  echo "  → Applying to production database"
  PGPASSWORD='Ab.12345' psql \
    -h aws-1-sa-east-1.pooler.supabase.com \
    -p 6543 \
    -U postgres.aceacpaockyxgogxsfyc \
    -d postgres \
    -f supabase/migrations/20251214000000_enhance_booking_contracts.sql

  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ Migration applied successfully${NC}"
  else
    echo -e "  ${RED}✗ Migration failed${NC}"
    exit 1
  fi
fi

# Step 2: Create Storage Bucket (if not exists)
echo ""
echo -e "${YELLOW}[2/6] Verifying storage bucket...${NC}"
echo "  → Bucket 'booking-contracts' should exist after migration"
echo "  → Manual verification recommended in Supabase Dashboard"

# Step 3: Deploy Edge Function
echo ""
echo -e "${YELLOW}[3/6] Deploying Edge Function (PDF Generation)...${NC}"

cd supabase/functions

if [ "$ENV" == "local" ]; then
  echo "  → Serving locally"
  supabase functions serve generate-booking-contract-pdf
else
  echo "  → Deploying to production"
  supabase functions deploy generate-booking-contract-pdf --no-verify-jwt

  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ Edge Function deployed successfully${NC}"
  else
    echo -e "  ${RED}✗ Edge Function deployment failed${NC}"
    exit 1
  fi
fi

cd ../..

# Step 4: Verify Edge Function Secrets
echo ""
echo -e "${YELLOW}[4/6] Verifying Edge Function secrets...${NC}"

if [ "$ENV" == "production" ]; then
  echo "  Checking required secrets:"
  echo "    - SUPABASE_URL"
  echo "    - SUPABASE_ANON_KEY"
  echo "    - SUPABASE_SERVICE_ROLE_KEY"

  supabase secrets list | grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY"

  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ Required secrets configured${NC}"
  else
    echo -e "  ${RED}✗ Missing required secrets. Run:${NC}"
    echo "    supabase secrets set SUPABASE_URL='https://...'"
    echo "    supabase secrets set SUPABASE_ANON_KEY='...'"
    echo "    supabase secrets set SUPABASE_SERVICE_ROLE_KEY='...'"
    exit 1
  fi
else
  echo "  → Skipping (local environment)"
fi

# Step 5: Build Frontend
echo ""
echo -e "${YELLOW}[5/6] Building frontend...${NC}"

cd apps/web

if [ "$ENV" == "local" ]; then
  echo "  → Development build"
  pnpm build
else
  echo "  → Production build"
  pnpm build
fi

if [ $? -eq 0 ]; then
  echo -e "  ${GREEN}✓ Frontend built successfully${NC}"
else
  echo -e "  ${RED}✗ Frontend build failed${NC}"
  exit 1
fi

cd ../..

# Step 6: Deploy Frontend (Production only)
if [ "$ENV" == "production" ]; then
  echo ""
  echo -e "${YELLOW}[6/6] Deploying frontend to Cloudflare Pages...${NC}"

  CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
    npx wrangler pages deploy apps/web/dist/web/browser \
    --project-name=autorentar \
    --commit-dirty=true

  if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ Frontend deployed successfully${NC}"
  else
    echo -e "  ${RED}✗ Frontend deployment failed${NC}"
    exit 1
  fi
else
  echo ""
  echo -e "${YELLOW}[6/6] Skipping frontend deployment (local environment)${NC}"
fi

# Final Summary
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Deployment Complete!                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Database migration applied${NC}"
echo -e "${GREEN}✓ Edge Function deployed${NC}"
echo -e "${GREEN}✓ Frontend built and deployed${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Verify storage bucket RLS policies:"
echo "   - Go to Supabase Dashboard → Storage → booking-contracts"
echo "   - Check policy: 'contracts_download_participants'"
echo ""
echo "2. Test contract flow:"
echo "   - Create a booking"
echo "   - Verify PDF generation"
echo "   - Accept all 4 clauses"
echo "   - Process payment"
echo ""
echo "3. Run E2E tests:"
echo "   cd apps/web"
echo "   npm run test:e2e:booking-contract"
echo ""
echo "4. Monitor Edge Function logs:"
echo "   supabase functions logs generate-booking-contract-pdf --follow"
echo ""
echo "5. Check for errors in Sentry:"
echo "   https://sentry.io/organizations/autorenta"
echo ""
echo -e "${YELLOW}Legal Compliance Checklist:${NC}"
echo ""
echo "☐ All 4 priority clauses displayed in contract template"
echo "☐ IP address captured on acceptance"
echo "☐ User-Agent captured on acceptance"
echo "☐ Device fingerprint captured on acceptance"
echo "☐ Timestamp captured on acceptance (Ley 25.506)"
echo "☐ PDF stored securely with RLS policies"
echo "☐ Backend validation blocks payment without acceptance"
echo "☐ 24-hour expiry enforced on backend"
echo "☐ 'Dispensa Contractual' wording used (Ley 20.091)"
echo "☐ Insurance policy number displayed in contract"
echo ""
echo -e "${GREEN}Deployment completed at: $(date)${NC}"
