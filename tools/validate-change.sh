#!/bin/bash
# Validate code changes before committing
# Usage: ./tools/validate-change.sh <file-path>

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
  echo -e "${RED}Error: No file path provided${NC}"
  echo "Usage: ./tools/validate-change.sh <file-path>"
  exit 1
fi

FILE_PATH="$1"

if [ ! -f "$FILE_PATH" ]; then
  echo -e "${RED}Error: File not found: $FILE_PATH${NC}"
  exit 1
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VALIDATING CHANGES: $(basename $FILE_PATH)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Check 1: TypeScript compilation
echo -e "${YELLOW}[1/5] TypeScript compilation...${NC}"
if npm run build:check 2>&1 | grep -q "error TS"; then
  echo -e "${RED}✗ TypeScript errors found${NC}"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ TypeScript compilation passed${NC}"
  PASSED=$((PASSED + 1))
fi

# Check 2: ESLint
echo -e "${YELLOW}[2/5] ESLint validation...${NC}"
if npm run lint -- "$FILE_PATH" 2>&1 | grep -q "error"; then
  echo -e "${RED}✗ ESLint errors found${NC}"
  FAILED=$((FAILED + 1))
else
  echo -e "${GREEN}✓ ESLint passed${NC}"
  PASSED=$((PASSED + 1))
fi

# Check 3: Related tests
echo -e "${YELLOW}[3/5] Running related tests...${NC}"
SPEC_FILE="${FILE_PATH%.ts}.spec.ts"
if [ -f "$SPEC_FILE" ]; then
  if npm run test -- --include="$SPEC_FILE" 2>&1 | grep -q "FAIL"; then
    echo -e "${RED}✗ Tests failed${NC}"
    FAILED=$((FAILED + 1))
  else
    echo -e "${GREEN}✓ Tests passed${NC}"
    PASSED=$((PASSED + 1))
  fi
else
  echo -e "${YELLOW}⚠ No test file found: $SPEC_FILE${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Check 4: Check for TODO/FIXME comments
echo -e "${YELLOW}[4/5] Checking for TODO/FIXME...${NC}"
if grep -q -E "TODO|FIXME" "$FILE_PATH"; then
  echo -e "${YELLOW}⚠ Found TODO/FIXME comments (review before commit)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No TODO/FIXME found${NC}"
  PASSED=$((PASSED + 1))
fi

# Check 5: Check for console.log
echo -e "${YELLOW}[5/5] Checking for console.log...${NC}"
if grep -q "console\.log" "$FILE_PATH"; then
  echo -e "${YELLOW}⚠ Found console.log statements (remove before production)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✓ No console.log found${NC}"
  PASSED=$((PASSED + 1))
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  VALIDATION SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "Fix errors before committing."
  exit 1
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
  if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Review warnings before committing.${NC}"
  fi
  exit 0
fi
