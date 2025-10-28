#!/bin/bash
# Quick setup script for testing phase tasks

set -e

echo "🚀 AutoRenta Testing Phase - Quick Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if secret exists
check_secret() {
  local secret_name=$1
  if gh secret list | grep -q "$secret_name"; then
    echo -e "${GREEN}✅ $secret_name is configured${NC}"
    return 0
  else
    echo -e "${RED}❌ $secret_name is NOT configured${NC}"
    return 1
  fi
}

# Task 1: Check GitHub Secrets
echo "📋 Task 1: Checking GitHub Secrets"
echo "-----------------------------------"

SECRETS_OK=true

check_secret "SUPABASE_URL" || SECRETS_OK=false
check_secret "SUPABASE_ANON_KEY" || SECRETS_OK=false
check_secret "MERCADOPAGO_TEST_ACCESS_TOKEN" || SECRETS_OK=false

if [ "$SECRETS_OK" = false ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Some secrets are missing!${NC}"
  echo "Configure them at:"
  echo "https://github.com/ecucondorSA/autorenta/settings/secrets/actions"
  echo ""
  echo "Required secrets:"
  echo "  - SUPABASE_URL"
  echo "  - SUPABASE_ANON_KEY"
  echo "  - MERCADOPAGO_TEST_ACCESS_TOKEN"
  exit 1
else
  echo -e "${GREEN}✅ All secrets configured!${NC}"
fi

echo ""

# Task 2: Check E2E Workflow
echo "📋 Task 2: Checking E2E Workflow"
echo "---------------------------------"

if [ -f ".github/workflows/e2e-tests.yml" ]; then
  echo -e "${GREEN}✅ E2E workflow file exists${NC}"
else
  echo -e "${RED}❌ E2E workflow file missing${NC}"
  exit 1
fi

echo "Recent workflow runs:"
gh run list --workflow=e2e-tests.yml --limit 5 || echo "No recent runs"

echo ""

# Task 3: Create Test User Verification Script
echo "📋 Task 3: Creating Test User Verification"
echo "-------------------------------------------"

cat > verify-test-user.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔐 Testing login with test-renter@autorenta.com...');

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!'
});

if (error) {
  console.error('❌ Login failed:', error.message);
  console.log('\n📝 To create the test user:');
  console.log('1. Go to Supabase Dashboard > Auth > Users');
  console.log('2. Click "Add User"');
  console.log('3. Email: test-renter@autorenta.com');
  console.log('4. Password: TestPassword123!');
  console.log('5. Check "Auto Confirm User"');
  process.exit(1);
}

console.log('✅ Test user verified!');
console.log('User ID:', data.user.id);
console.log('Email:', data.user.email);
console.log('Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
EOF

echo -e "${GREEN}✅ Created verify-test-user.mjs${NC}"
echo ""
echo "To test the user exists, run:"
echo "  node verify-test-user.mjs"

echo ""

# Check if pnpm install is needed
echo "📦 Checking Dependencies"
echo "------------------------"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
  echo "Run: pnpm install"
else
  echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Configure missing secrets (if any)"
echo "  2. Run: node verify-test-user.mjs"
echo "  3. Run: pnpm test:e2e"
echo "  4. Push changes to trigger CI/CD"
echo ""
echo "For detailed guide, see: IMPLEMENTATION_GUIDE_TESTING_PHASE.md"
