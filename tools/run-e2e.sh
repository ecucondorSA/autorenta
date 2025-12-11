#!/bin/bash
#
# AutoRenta E2E Test Runner
#
# Uses Patchright (patched Chromium) for anti-bot bypass
# Integrates with DebugService for comprehensive logging
#
# Usage:
#   ./tools/run-e2e.sh              # Run all tests
#   ./tools/run-e2e.sh auth         # Run auth tests only
#   ./tools/run-e2e.sh booking      # Run booking tests only
#   HEADLESS=false ./tools/run-e2e.sh  # Run with visible browser
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_APP="$PROJECT_ROOT/apps/web"
E2E_DIR="$WEB_APP/e2e"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         AutoRenta E2E Test Runner (Patchright)          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if patchright is installed
if ! [ -d "$E2E_DIR/node_modules/patchright" ]; then
    echo -e "${YELLOW}Installing e2e dependencies...${NC}"
    cd "$E2E_DIR"
    pnpm install
    cd "$PROJECT_ROOT"
fi

# Check if dev server is running
check_server() {
    if curl -s http://localhost:4200 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start dev server if not running
if ! check_server; then
    echo -e "${YELLOW}Starting dev server...${NC}"
    cd "$WEB_APP"
    npx ng serve --host 0.0.0.0 &
    DEV_SERVER_PID=$!

    # Wait for server to start
    echo -n "Waiting for server"
    for i in {1..30}; do
        if check_server; then
            echo -e " ${GREEN}Ready!${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done

    if ! check_server; then
        echo -e " ${RED}Failed to start server${NC}"
        exit 1
    fi

    cd "$PROJECT_ROOT"
fi

# Ensure reports directory exists
mkdir -p "$E2E_DIR/reports"

# Determine which tests to run
TEST_SUITE="${1:-all}"

echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  BASE_URL: ${BASE_URL:-http://localhost:4200}"
echo "  HEADLESS: ${HEADLESS:-true}"
echo "  TEST_SUITE: $TEST_SUITE"
echo ""

cd "$E2E_DIR"

# Run tests based on suite selection
run_tests() {
    local test_file=$1
    echo -e "${BLUE}Running: $test_file${NC}"
    npx tsx "$test_file"
}

case $TEST_SUITE in
    auth)
        run_tests "auth/login.spec.ts"
        ;;
    booking)
        run_tests "booking/booking-flow.spec.ts"
        ;;
    all)
        echo -e "${BLUE}Running all tests...${NC}"
        echo ""

        echo -e "${YELLOW}=== Auth Tests ===${NC}"
        run_tests "auth/login.spec.ts" || true

        echo ""
        echo -e "${YELLOW}=== Booking Tests ===${NC}"
        run_tests "booking/booking-flow.spec.ts" || true
        ;;
    *)
        # Try to run as a specific file
        if [ -f "$TEST_SUITE" ]; then
            run_tests "$TEST_SUITE"
        else
            echo -e "${RED}Unknown test suite: $TEST_SUITE${NC}"
            echo "Usage: $0 [auth|booking|all|<file.spec.ts>]"
            exit 1
        fi
        ;;
esac

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}E2E tests completed!${NC}"
echo -e "Reports saved to: ${YELLOW}$E2E_DIR/reports/${NC}"
echo ""

# Clean up dev server if we started it
if [ -n "$DEV_SERVER_PID" ]; then
    echo "Stopping dev server (PID: $DEV_SERVER_PID)"
    kill $DEV_SERVER_PID 2>/dev/null || true
fi
