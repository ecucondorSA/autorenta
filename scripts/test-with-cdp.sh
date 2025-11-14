#!/bin/bash
# Run Playwright tests connected to Chrome CDP for live debugging

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔍 Playwright Tests with Chrome CDP"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Chrome CDP is running
if ! curl -s http://localhost:9222/json/version > /dev/null; then
  echo -e "${YELLOW}⚠️  Chrome CDP not detected on port 9222${NC}"
  echo -e "   Please run: ${GREEN}./scripts/chrome-dev.sh${NC}"
  echo ""
  exit 1
fi

# Get WebSocket endpoint
WS_ENDPOINT=$(curl -s http://localhost:9222/json/version | grep -o '"webSocketDebuggerUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$WS_ENDPOINT" ]; then
  echo -e "${YELLOW}⚠️  Could not get WebSocket endpoint from Chrome${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Chrome CDP detected"
echo -e "${GREEN}✓${NC} WebSocket: ${WS_ENDPOINT}"
echo ""

# Check if dev server is running
if ! curl -s http://localhost:4200 > /dev/null; then
  echo -e "${YELLOW}⚠️  Dev server not detected on port 4200${NC}"
  echo -e "   Please run: ${GREEN}npm run dev:web${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} Dev server detected on http://localhost:4200"
echo ""

# Set environment variable for Playwright
export CHROME_CDP_WS_ENDPOINT="$WS_ENDPOINT"

# Run tests with CDP config
if [ "$1" = "--ui" ]; then
  echo -e "${BLUE}Starting Playwright UI with Chrome CDP...${NC}"
  npx playwright test --config=playwright.config.cdp.ts --ui
elif [ -n "$1" ]; then
  echo -e "${BLUE}Running test: $1${NC}"
  npx playwright test "$1" --config=playwright.config.cdp.ts
else
  echo -e "${BLUE}Running all tests with Chrome CDP...${NC}"
  npx playwright test --config=playwright.config.cdp.ts
fi
