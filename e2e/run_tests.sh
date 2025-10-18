#!/bin/bash
# E2E Test Runner for AutorentA
# Activates venv and runs tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AutorentA E2E Tests${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${YELLOW}Installing playwright...${NC}"
    pip install playwright
    playwright install chromium
    echo -e "${GREEN}Setup complete!${NC}"
else
    echo -e "${GREEN}Activating virtual environment...${NC}"
    source venv/bin/activate
fi

# Check if dev server is running
echo -e "${YELLOW}Checking if dev server is running at http://localhost:4200...${NC}"
if curl -s http://localhost:4200 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Dev server is running${NC}"
else
    echo -e "${RED}✗ Dev server is NOT running!${NC}"
    echo -e "${YELLOW}Please start the dev server first:${NC}"
    echo -e "  cd /home/edu/autorenta/apps/web"
    echo -e "  npm run start"
    exit 1
fi

echo ""
echo -e "${GREEN}Running E2E tests...${NC}"
echo ""

# Run tests
python3 test_car_publication_and_booking.py

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All tests passed! ✅${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some tests failed! ❌${NC}"
    echo -e "${RED}But that's good - we found bugs!${NC}"
    echo -e "${RED}========================================${NC}"
fi

exit $EXIT_CODE
