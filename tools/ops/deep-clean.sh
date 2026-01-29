#!/bin/bash

################################################################################
# AutoRenta Deep Clean Script
# Removes node_modules, build artifacts, and temporary files to free up space
# Usage: ./tools/ops/deep-clean.sh
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Deep Clean...${NC}"
echo -e "${YELLOW}This will remove node_modules, dist folders, and temporary files.${NC}"
echo -e "${YELLOW}You will need to run 'pnpm install' afterwards.${NC}"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# 1. Clean node_modules
echo -e "\n${BLUE}[1/4] Removing node_modules...${NC}"
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/web/.angular
echo -e "${GREEN}✓ node_modules removed${NC}"

# 2. Clean build artifacts
echo -e "\n${BLUE}[2/4] Removing build artifacts...${NC}"
rm -rf dist
rm -rf apps/web/dist
echo -e "${GREEN}✓ dist folders removed${NC}"

# 3. Clean temporary files
echo -e "\n${BLUE}[3/4] Removing temporary files...${NC}"
find . -name ".DS_Store" -delete
find . -name "*.log" -delete
rm -rf .angular
rm -rf .turbo
echo -e "${GREEN}✓ Temporary files removed${NC}"

# 4. Clean large asset sources (Optional - interactive)
echo -e "\n${BLUE}[4/4] Checking for large unused assets...${NC}"
# List large files > 50MB
find . -type f -size +50M -not -path "*/node_modules/*" -not -path "*/.git/*" -exec ls -lh {} \; | awk '{print $9 ": " $5}'

echo -e "\n${GREEN}Deep clean completed!${NC}"
echo -e "Run ${YELLOW}pnpm install${NC} to reinstall dependencies."
