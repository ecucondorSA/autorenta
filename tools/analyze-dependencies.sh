#!/bin/bash
# Analyze service dependencies for surgical code changes
# Usage: ./tools/analyze-dependencies.sh <file-path>

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if file path provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: No file path provided${NC}"
  echo "Usage: ./tools/analyze-dependencies.sh <file-path>"
  echo "Example: ./tools/analyze-dependencies.sh apps/web/src/app/core/services/bookings.service.ts"
  exit 1
fi

FILE_PATH="$1"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo -e "${RED}Error: File not found: $FILE_PATH${NC}"
  exit 1
fi

# Extract filename and service name
FILENAME=$(basename "$FILE_PATH")
SERVICE_NAME=$(echo "$FILENAME" | sed 's/.service.ts/Service/' | sed 's/.component.ts/Component/' | sed 's/^./\U&/')

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DEPENDENCY ANALYSIS: $SERVICE_NAME${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Find dependencies (services this file injects)
echo -e "${YELLOW}STEP 1: Dependencies (Services THIS file injects)${NC}"
echo "──────────────────────────────────────────────────────"
DEPENDENCIES=$(grep -E "inject\([A-Z][a-zA-Z]*Service\)" "$FILE_PATH" | sed 's/.*inject(\([^)]*\)).*/\1/' | sort -u)

if [ -z "$DEPENDENCIES" ]; then
  echo -e "${GREEN}✓ No service dependencies found (0 dependencies)${NC}"
  DEP_COUNT=0
else
  DEP_COUNT=$(echo "$DEPENDENCIES" | wc -l)
  echo -e "${YELLOW}Found $DEP_COUNT dependencies:${NC}"
  echo "$DEPENDENCIES" | while read -r dep; do
    echo "  - $dep"
  done
fi
echo ""

# Step 2: Find dependents (who uses this service?)
echo -e "${YELLOW}STEP 2: Dependents (Services/Components that USE this service)${NC}"
echo "──────────────────────────────────────────────────────"
SEARCH_PATTERN="inject($SERVICE_NAME)"
DEPENDENTS=$(grep -r "$SEARCH_PATTERN" apps/web/src/app --include="*.ts" --exclude="$FILENAME" | cut -d: -f1 | sort -u)

if [ -z "$DEPENDENTS" ]; then
  echo -e "${GREEN}✓ No dependents found (no other files inject this service)${NC}"
  DEPENDENT_COUNT=0
else
  DEPENDENT_COUNT=$(echo "$DEPENDENTS" | wc -l)
  echo -e "${YELLOW}Found $DEPENDENT_COUNT dependents:${NC}"
  echo "$DEPENDENTS" | while read -r file; do
    echo "  - $file"
  done
fi
echo ""

# Step 3: Find database operations
echo -e "${YELLOW}STEP 3: Database Operations${NC}"
echo "──────────────────────────────────────────────────────"

# Find table queries
TABLES=$(grep -E "from\('[a-z_]+'\)" "$FILE_PATH" | sed "s/.*from('\([^']*\)').*/\1/" | sort -u)
if [ -n "$TABLES" ]; then
  echo -e "${YELLOW}Tables accessed:${NC}"
  echo "$TABLES" | while read -r table; do
    echo "  - $table"
  done
else
  echo "  (No direct table access found)"
fi

# Find RPC calls
RPCS=$(grep -E "\.rpc\('[a-z_]+'" "$FILE_PATH" | sed "s/.*\.rpc('\([^']*\)'.*/\1/" | sort -u)
if [ -n "$RPCS" ]; then
  echo -e "${YELLOW}RPC functions called:${NC}"
  echo "$RPCS" | while read -r rpc; do
    echo "  - $rpc()"
  done
else
  echo "  (No RPC calls found)"
fi
echo ""

# Step 4: Assess risk level
echo -e "${YELLOW}STEP 4: Risk Assessment${NC}"
echo "──────────────────────────────────────────────────────"

TOTAL_IMPACT=$((DEP_COUNT + DEPENDENT_COUNT))

if [ $DEP_COUNT -ge 6 ]; then
  RISK="🔴 CRITICAL"
  RISK_COLOR=$RED
  RECOMMENDATION="This is a high-coupling orchestration service. Changes have CRITICAL blast radius. Review docs/architecture/DEPENDENCY_GRAPH.md and follow checklist for 6+ dependencies in docs/guides/SAFE_CHANGE_CHECKLIST.md"
elif [ $DEP_COUNT -ge 3 ]; then
  RISK="🟡 MEDIUM"
  RISK_COLOR=$YELLOW
  RECOMMENDATION="Medium coupling service. Changes affect multiple domains. Review docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md and follow checklist for 3-5 dependencies."
else
  RISK="🟢 LOW"
  RISK_COLOR=$GREEN
  RECOMMENDATION="Low coupling service. Changes have minimal impact. Follow checklist for 0-2 dependencies in docs/guides/SAFE_CHANGE_CHECKLIST.md"
fi

echo -e "${RISK_COLOR}Risk Level: $RISK${NC}"
echo -e "Dependencies: $DEP_COUNT"
echo -e "Dependents: $DEPENDENT_COUNT"
echo -e "Total Impact: $TOTAL_IMPACT files"
echo ""
echo -e "${BLUE}Recommendation:${NC}"
echo "$RECOMMENDATION" | fold -s -w 60
echo ""

# Step 5: Next steps
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  NEXT STEPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Review documentation:"
echo "   - docs/architecture/DEPENDENCY_GRAPH.md"
echo "   - docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md"
echo ""
echo "2. Follow checklist:"
echo "   - docs/guides/SAFE_CHANGE_CHECKLIST.md"
echo ""
echo "3. Run validation before committing:"
echo "   ./tools/validate-change.sh $FILE_PATH"
echo ""
