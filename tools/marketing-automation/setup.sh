#!/bin/bash

# Marketing Automation - Complete Setup Script
# This script sets up the entire marketing automation system

set -e  # Exit on error

echo "🚀 AutoRenta Marketing Automation - Setup"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "tools/marketing-automation/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Step 1: Validate environment
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Validating environment variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "tools/marketing-automation/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating from .env.example..."
    cp tools/marketing-automation/.env.example tools/marketing-automation/.env
    echo -e "${YELLOW}⚠️  Please edit tools/marketing-automation/.env with your credentials${NC}"
    echo "Press Enter when ready to continue..."
    read
fi

cd tools/marketing-automation
node scripts/validate-env.js
cd ../..

echo ""

# Step 2: Install dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd tools/marketing-automation
pnpm install
cd ../..

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Apply database migrations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Applying database migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking for pending migrations..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install with: npm install -g supabase"
    echo "Skipping migration..."
else
    echo "Applying migrations..."
    supabase db push || {
        echo -e "${YELLOW}⚠️  Migration failed - you may need to run this manually:${NC}"
        echo "   supabase db push"
    }
fi

echo ""

# Step 4: Seed personas
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Seeding personas to database..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}Do you want to seed 32 personas now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cd tools/marketing-automation
    pnpm seed || echo -e "${YELLOW}⚠️  Seeding failed - check your Supabase connection${NC}"
    cd ../..
else
    echo "Skipping persona seeding. Run later with: pnpm --filter @autorenta/marketing-automation seed"
fi

echo ""

# Step 5: Deploy Edge Functions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Deploying Edge Functions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}Do you want to deploy Edge Functions now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Deploying marketing-webhook..."
    supabase functions deploy marketing-webhook --no-verify-jwt || echo -e "${YELLOW}⚠️  Deployment failed${NC}"
    
    echo "Skipping marketing-reset-daily (now runs via GitHub Actions)"
else
    echo "Skipping Edge Function deployment. Deploy later with:"
    echo "   supabase functions deploy marketing-webhook --no-verify-jwt"
    echo "   marketing-reset-daily now runs via GitHub Actions (marketing-reset-daily.yml)"
fi

echo ""

# Step 6: Setup GitHub secrets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  GitHub Secrets Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Configure the following secrets in GitHub:"
echo ""
echo "  gh secret set GROQ_API_KEY -b \"your_key_here\""
echo "  gh secret set SUPABASE_URL -b \"your_url_here\""
echo "  gh secret set SUPABASE_SERVICE_ROLE_KEY -b \"your_key_here\""
echo ""
echo -e "${YELLOW}Do you want to set these now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
        echo "Install from: https://cli.github.com/"
    else
        # Load from .env
        source tools/marketing-automation/.env 2>/dev/null || true
        
        if [ -n "$GROQ_API_KEY" ]; then
            gh secret set GROQ_API_KEY -b "$GROQ_API_KEY" && echo -e "${GREEN}✅ GROQ_API_KEY set${NC}"
        fi
        
        if [ -n "$SUPABASE_URL" ]; then
            gh secret set SUPABASE_URL -b "$SUPABASE_URL" && echo -e "${GREEN}✅ SUPABASE_URL set${NC}"
        fi
        
        if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            gh secret set SUPABASE_SERVICE_ROLE_KEY -b "$SUPABASE_SERVICE_ROLE_KEY" && echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY set${NC}"
        fi
    fi
fi

echo ""

# Step 7: Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure proxies in: tools/marketing-automation/config/proxy-pool.json"
echo "2. Extract cookies from 1-2 Facebook accounts for testing"
echo "3. Encrypt cookies: pnpm --filter @autorenta/marketing-automation encrypt"
echo "4. Test content generation:"
echo "   cd tools/marketing-automation"
echo "   pnpm generate \"Test post content\" --platform facebook"
echo ""
echo "5. Import n8n workflow from: tools/marketing-automation/n8n/workflows/guerrilla-content.json"
echo "6. Configure RSS feeds in n8n for target groups"
echo ""
echo "📚 Full documentation: tools/marketing-automation/README.md"
echo ""
