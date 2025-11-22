#!/bin/bash
# Launch Playwright Codegen connected to Chrome CDP for live interaction

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🎬 Playwright Codegen with Chrome CDP"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Chrome CDP is running
if ! curl -s http://localhost:9222/json/version > /dev/null; then
  echo -e "${YELLOW}⚠️  Chrome CDP not detected on port 9222${NC}"
  echo -e "   Please run: ${GREEN}./scripts/chrome-dev.sh${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} Chrome CDP detected"

# Check if dev server is running
if ! curl -s http://localhost:4200 > /dev/null; then
  echo -e "${YELLOW}⚠️  Dev server not detected on port 4200${NC}"
  echo -e "   Please run: ${GREEN}npm run dev:web${NC}"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓${NC} Dev server detected on http://localhost:4200"
echo ""
echo -e "${BLUE}Launching Codegen...${NC}"
echo -e "  - Interact with your app to generate test code"
echo -e "  - All actions will be visible in the Chrome window"
echo -e "  - Copy generated code when done"
echo ""

# Get the URL to open (default to localhost:4200)
URL="${1:-http://localhost:4200}"

# Launch codegen
npx playwright codegen --target=chrome --port=9222 "$URL"
