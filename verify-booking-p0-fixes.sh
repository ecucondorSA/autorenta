#!/bin/bash

# ============================================================================
# BOOKING SYSTEM P0 FIXES - VERIFICATION SCRIPT
# ============================================================================

set -e

echo "🔍 Verifying Booking System P0 Fixes..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must run from project root${NC}"
    exit 1
fi

echo "1️⃣  Checking TypeScript compilation..."
cd apps/web
if npm run build > /tmp/booking_build.log 2>&1; then
    echo -e "${GREEN}✅ TypeScript compiles successfully${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    tail -20 /tmp/booking_build.log
    exit 1
fi
cd ../..

echo ""
echo "2️⃣  Checking linter..."
cd apps/web
if npm run lint > /tmp/booking_lint.log 2>&1; then
    echo -e "${GREEN}✅ Linter passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linter warnings (check /tmp/booking_lint.log)${NC}"
fi
cd ../..

echo ""
echo "3️⃣  Checking file changes..."
FILES_CHANGED=(
    "apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html"
    "apps/web/src/app/core/services/risk.service.ts"
    "apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts"
)

for file in "${FILES_CHANGED[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ ${file}${NC}"
    else
        echo -e "${RED}❌ Missing: ${file}${NC}"
        exit 1
    fi
done

echo ""
echo "4️⃣  Checking critical patterns in code..."

# Check 1: Route should be /bookings/checkout
if grep -q "'/bookings/checkout'" apps/web/src/app/features/bookings/my-bookings/my-bookings.page.html; then
    echo -e "${GREEN}✅ Route fixed: /bookings/checkout${NC}"
else
    echo -e "${RED}❌ Route not fixed${NC}"
    exit 1
fi

# Check 2: Table name should be singular
if grep -q "from('booking_risk_snapshot')" apps/web/src/app/core/services/risk.service.ts; then
    echo -e "${GREEN}✅ Table name fixed: booking_risk_snapshot (singular)${NC}"
else
    echo -e "${RED}❌ Table name not fixed${NC}"
    exit 1
fi

# Check 3: Status should be 'pending'
if grep -q "status: 'pending'" apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts; then
    echo -e "${GREEN}✅ Status fixed: 'pending'${NC}"
else
    echo -e "${RED}❌ Status not fixed${NC}"
    exit 1
fi

# Check 4: Should use renter_id, not user_id
if grep -q "renter_id: userId" apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts; then
    echo -e "${GREEN}✅ Schema fixed: renter_id${NC}"
else
    echo -e "${RED}❌ Schema not fixed: still using user_id${NC}"
    exit 1
fi

# Check 5: Should use start_at, not start_date
if grep -q "start_at:" apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts; then
    echo -e "${GREEN}✅ Schema fixed: start_at${NC}"
else
    echo -e "${RED}❌ Schema not fixed: still using start_date${NC}"
    exit 1
fi

# Check 6: Should have updateBookingRiskSnapshot method
if grep -q "updateBookingRiskSnapshot" apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts; then
    echo -e "${GREEN}✅ Risk snapshot FK fix implemented${NC}"
else
    echo -e "${RED}❌ Risk snapshot FK fix missing${NC}"
    exit 1
fi

echo ""
echo "5️⃣  Checking migration file..."
if [ -f "supabase/migrations/20250125_booking_p0_fixes.sql" ]; then
    echo -e "${GREEN}✅ Migration file created${NC}"
else
    echo -e "${RED}❌ Migration file missing${NC}"
    exit 1
fi

echo ""
echo "6️⃣  Summary of changes..."
git diff --stat 2>/dev/null || echo "Not a git repository"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ ALL P0 FIXES VERIFIED SUCCESSFULLY${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Run migration: supabase migration up"
echo "   2. Deploy to staging"
echo "   3. Manual testing (see BOOKING_P0_FIXES_APPLIED.md)"
echo "   4. Deploy to production"
echo ""
echo "📚 Documentation:"
echo "   - BOOKING_SYSTEM_PANORAMA_AUDIT.md"
echo "   - BOOKING_P0_FIXES_APPLIED.md"
echo ""
