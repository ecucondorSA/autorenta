#!/bin/bash

# Tour System E2E Implementation - Verification Script
# This script verifies that all components of the new guided tour system are in place

set -e

echo "🧭 Verifying Guided Tour System Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_PATH="apps/web/src/app/core/guided-tour"

# Function to check if file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    return 0
  else
    echo -e "${RED}✗${NC} $2 (MISSING)"
    return 1
  fi
}

# Function to check if directory exists
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $2"
    return 0
  else
    echo -e "${RED}✗${NC} $2 (MISSING)"
    return 1
  fi
}

# Check directory structure
echo "📁 Checking directory structure..."
check_dir "$BASE_PATH" "Base directory"
check_dir "$BASE_PATH/interfaces" "Interfaces directory"
check_dir "$BASE_PATH/services" "Services directory"
check_dir "$BASE_PATH/adapters" "Adapters directory"
check_dir "$BASE_PATH/resolvers" "Resolvers directory"
check_dir "$BASE_PATH/registry" "Registry directory"
echo ""

# Check core files
echo "📄 Checking core files..."
check_file "$BASE_PATH/interfaces/tour-definition.interface.ts" "Tour definitions interface"
check_file "$BASE_PATH/services/tour-orchestrator.service.ts" "Tour orchestrator service"
check_file "$BASE_PATH/services/telemetry-bridge.service.ts" "Telemetry bridge service"
check_file "$BASE_PATH/adapters/shepherd-adapter.service.ts" "Shepherd adapter"
check_file "$BASE_PATH/resolvers/step-resolver.service.ts" "Step resolver"
check_file "$BASE_PATH/registry/tour-registry.service.ts" "Tour registry"
check_file "$BASE_PATH/guided-tour.service.ts" "Main guided tour service"
check_file "$BASE_PATH/index.ts" "Public API (barrel export)"
echo ""

# Check documentation
echo "📚 Checking documentation..."
check_file "$BASE_PATH/README.md" "Main documentation"
check_file "$BASE_PATH/guided-tour.service.spec.ts" "Unit tests"
check_file "TOUR_MIGRATION_GUIDE.md" "Migration guide"
echo ""

# Check for Shepherd.js dependency
echo "📦 Checking dependencies..."
if grep -q "shepherd.js" package.json; then
  echo -e "${GREEN}✓${NC} Shepherd.js dependency found"
else
  echo -e "${YELLOW}⚠${NC} Shepherd.js not found in package.json"
  echo "  Run: npm install shepherd.js"
fi
echo ""

# Count lines of code
echo "📊 Code statistics..."
total_lines=$(find "$BASE_PATH" -name "*.ts" -not -name "*.spec.ts" | xargs wc -l | tail -n 1 | awk '{print $1}')
echo "  Total lines: $total_lines"

test_lines=$(find "$BASE_PATH" -name "*.spec.ts" | xargs wc -l 2>/dev/null | tail -n 1 | awk '{print $1}' || echo "0")
echo "  Test lines: $test_lines"

file_count=$(find "$BASE_PATH" -name "*.ts" | wc -l)
echo "  Total files: $file_count"
echo ""

# Check for old TourService
echo "🔍 Checking for old TourService..."
if [ -f "apps/web/src/app/core/services/tour.service.ts" ]; then
  echo -e "${YELLOW}⚠${NC} Old TourService still exists"
  echo "  Consider deprecating or removing after migration"
else
  echo -e "${GREEN}✓${NC} Old TourService not found (already migrated)"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Guided Tour System Implementation Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Next steps:"
echo "  1. Review the documentation: $BASE_PATH/README.md"
echo "  2. Follow migration guide: TOUR_MIGRATION_GUIDE.md"
echo "  3. Add data-tour-step attributes to your HTML templates"
echo "  4. Test tours in development: guidedTour.enableDebug()"
echo "  5. Run unit tests: npm test"
echo ""
echo "🚀 Quick start:"
echo "  import { GuidedTourService, TourId } from '@core/guided-tour';"
echo "  "
echo "  private guidedTour = inject(GuidedTourService);"
echo "  this.guidedTour.request({ id: TourId.Welcome });"
echo ""
