#!/usr/bin/env bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CHROME_DEBUG_PORT="${CHROME_DEVTOOLS_PORT:-9222}"
DEV_SERVER_PORT="${DEV_SERVER_PORT:-4200}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔍 Playwright CDP Debug Workflow"
echo -e "${BLUE}║${NC}  Interactive browser testing with live debugging"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if service is running
check_service() {
  local url=$1
  local name=$2
  
  if curl -s "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name is running"
    return 0
  else
    echo -e "${RED}✗${NC} $name is not running"
    return 1
  fi
}

# Function to start Chrome CDP
start_chrome_cdp() {
  echo -e "${YELLOW}🚀 Starting Chrome with CDP...${NC}"
  ./scripts/chrome-dev.sh &
  
  # Wait for Chrome to start
  for i in {1..10}; do
    if check_service "http://localhost:${CHROME_DEBUG_PORT}/json/version" "Chrome CDP"; then
      break
    fi
    echo -e "${YELLOW}   Waiting for Chrome to start... ($i/10)${NC}"
    sleep 2
  done
}

# Function to start dev server
start_dev_server() {
  echo -e "${YELLOW}🚀 Starting development server...${NC}"
  cd apps/web && npm run start &
  DEV_SERVER_PID=$!
  cd ../..
  
  # Wait for dev server to start
  for i in {1..20}; do
    if check_service "http://localhost:${DEV_SERVER_PORT}" "Development Server"; then
      break
    fi
    echo -e "${YELLOW}   Waiting for dev server to start... ($i/20)${NC}"
    sleep 3
  done
}

# Check current status
echo -e "${BLUE}📊 Checking current status...${NC}"
echo ""

CHROME_RUNNING=false
DEV_SERVER_RUNNING=false

if check_service "http://localhost:${CHROME_DEBUG_PORT}/json/version" "Chrome CDP"; then
  CHROME_RUNNING=true
fi

if check_service "http://localhost:${DEV_SERVER_PORT}" "Development Server"; then
  DEV_SERVER_RUNNING=true
fi

echo ""

# Start services if needed
if [ "$CHROME_RUNNING" = false ]; then
  start_chrome_cdp
fi

if [ "$DEV_SERVER_RUNNING" = false ]; then
  start_dev_server
fi

# Get WebSocket endpoint
echo -e "${BLUE}🔗 Getting WebSocket endpoint...${NC}"
WS_ENDPOINT=$(curl -s "http://localhost:${CHROME_DEBUG_PORT}/json/version" | jq -r '.webSocketDebuggerUrl' 2>/dev/null || echo "")

if [ -z "$WS_ENDPOINT" ]; then
  echo -e "${RED}❌ Could not get WebSocket endpoint${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} WebSocket endpoint: ${WS_ENDPOINT}"
echo ""

# Export environment variable
export CHROME_CDP_WS_ENDPOINT="$WS_ENDPOINT"

# Show available debugging options
echo -e "${BLUE}🎯 Available debugging options:${NC}"
echo ""
echo -e "${GREEN}1.${NC} Run specific test with UI:"
echo -e "   ${YELLOW}npx playwright test tests/e2e/car-publication.spec.ts --config=playwright.config.cdp.ts --ui${NC}"
echo ""
echo -e "${GREEN}2.${NC} Run all tests with CDP:"
echo -e "   ${YELLOW}npx playwright test --config=playwright.config.cdp.ts${NC}"
echo ""
echo -e "${GREEN}3.${NC} Open Playwright UI:"
echo -e "   ${YELLOW}npx playwright test --config=playwright.config.cdp.ts --ui${NC}"
echo ""
echo -e "${GREEN}4.${NC} Generate tests with codegen:"
echo -e "   ${YELLOW}npx playwright codegen --target=playwright --port=${CHROME_DEBUG_PORT} http://localhost:${DEV_SERVER_PORT}${NC}"
echo ""
echo -e "${GREEN}5.${NC} Open Chrome DevTools:"
echo -e "   ${YELLOW}http://localhost:${CHROME_DEBUG_PORT}${NC}"
echo ""

# Interactive menu
while true; do
  echo -e "${BLUE}Select an option (1-5) or 'q' to quit:${NC}"
  read -r choice
  
  case $choice in
    1)
      echo -e "${YELLOW}Enter test file path:${NC}"
      read -r test_path
      npx playwright test "$test_path" --config=playwright.config.cdp.ts --ui
      ;;
    2)
      npx playwright test --config=playwright.config.cdp.ts
      ;;
    3)
      npx playwright test --config=playwright.config.cdp.ts --ui
      ;;
    4)
      npx playwright codegen --target=playwright --port="${CHROME_DEBUG_PORT}" "http://localhost:${DEV_SERVER_PORT}"
      ;;
    5)
      echo -e "${GREEN}Opening Chrome DevTools at http://localhost:${CHROME_DEBUG_PORT}${NC}"
      if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:${CHROME_DEBUG_PORT}"
      elif command -v open > /dev/null; then
        open "http://localhost:${CHROME_DEBUG_PORT}"
      else
        echo -e "${YELLOW}Please open http://localhost:${CHROME_DEBUG_PORT} in your browser${NC}"
      fi
      ;;
    q|Q)
      echo -e "${GREEN}👋 Happy debugging!${NC}"
      break
      ;;
    *)
      echo -e "${RED}Invalid option. Please choose 1-5 or 'q' to quit.${NC}"
      ;;
  esac
  echo ""
done