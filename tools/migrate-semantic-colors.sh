#!/bin/bash

#######################################################################
# Semantic Color Migration Script - Phase 3
# Automatically migrates old color patterns to new semantic tokens
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  🎨 Semantic Color Migration - Phase 3"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Base directory
BASE_DIR="apps/web/src/app"

# Backup counter
UPDATED_FILES=0

# Function to update a file
update_file() {
  local file="$1"
  local temp_file="${file}.tmp"

  # Create backup
  cp "$file" "$temp_file"

  # Apply replacements
  sed -i \
    -e 's/text-error-600 dark:text-error-300/text-error-text/g' \
    -e 's/text-error-600 dark:text-error-400/text-error-text/g' \
    -e 's/text-error-700 dark:text-error-300/text-error-strong/g' \
    -e 's/text-error-700 dark:text-error-200/text-error-strong/g' \
    -e 's/text-error-800 dark:text-error-200/text-error-strong/g' \
    -e 's/text-error-900 dark:text-error-100/text-error-strong/g' \
    -e 's/text-error-600/text-error-text/g' \
    -e 's/text-error-700/text-error-strong/g' \
    -e 's/text-error-800/text-error-strong/g' \
    -e 's/text-error-900/text-error-strong/g' \
    -e 's/bg-error-50 dark:bg-error-500\/15/bg-error-bg/g' \
    -e 's/bg-error-50 dark:bg-error-900\/20/bg-error-bg/g' \
    -e 's/bg-error-50/bg-error-bg/g' \
    -e 's/bg-error-100/bg-error-bg-hover/g' \
    -e 's/border-error-200 dark:border-error-700/border-error-border/g' \
    -e 's/border-error-200 dark:border-error-500\/40/border-error-border/g' \
    -e 's/border-error-500 dark:border-error-500\/40/border-error-border/g' \
    -e 's/border-error-200/border-error-border/g' \
    -e 's/border-error-500/border-error-border/g' \
    -e 's/text-warning-600 dark:text-warning-300/text-warning-text/g' \
    -e 's/text-warning-700 dark:text-warning-300/text-warning-strong/g' \
    -e 's/text-warning-800 dark:text-warning-200/text-warning-strong/g' \
    -e 's/text-warning-900 dark:text-warning-100/text-warning-strong/g' \
    -e 's/text-warning-600/text-warning-text/g' \
    -e 's/text-warning-700/text-warning-strong/g' \
    -e 's/text-warning-800/text-warning-strong/g' \
    -e 's/text-warning-900/text-warning-strong/g' \
    -e 's/bg-warning-50 dark:bg-warning-500\/15/bg-warning-bg/g' \
    -e 's/bg-warning-50 dark:bg-warning-900\/20/bg-warning-bg/g' \
    -e 's/bg-warning-50/bg-warning-bg/g' \
    -e 's/bg-warning-100/bg-warning-bg-hover/g' \
    -e 's/border-warning-200 dark:border-warning-700/border-warning-border/g' \
    -e 's/border-warning-500 dark:border-warning-500\/40/border-warning-border/g' \
    -e 's/border-warning-200/border-warning-border/g' \
    -e 's/border-warning-500/border-warning-border/g' \
    -e 's/text-success-600 dark:text-success-300/text-success-text/g' \
    -e 's/text-success-700 dark:text-success-300/text-success-strong/g' \
    -e 's/text-success-800 dark:text-success-200/text-success-strong/g' \
    -e 's/text-success-900 dark:text-success-100/text-success-strong/g' \
    -e 's/text-success-600/text-success-text/g' \
    -e 's/text-success-700/text-success-strong/g' \
    -e 's/text-success-800/text-success-strong/g' \
    -e 's/text-success-900/text-success-strong/g' \
    -e 's/bg-success-50 dark:bg-success-500\/15/bg-success-bg/g' \
    -e 's/bg-success-50 dark:bg-success-900\/20/bg-success-bg/g' \
    -e 's/bg-success-50/bg-success-bg/g' \
    -e 's/bg-success-100/bg-success-bg-hover/g' \
    -e 's/border-success-200 dark:border-success-700/border-success-border/g' \
    -e 's/border-success-500 dark:border-success-500\/40/border-success-border/g' \
    -e 's/border-success-200/border-success-border/g' \
    -e 's/border-success-500/border-success-border/g' \
    "$temp_file"

  # Check if file changed
  if ! diff -q "$file" "$temp_file" > /dev/null 2>&1; then
    mv "$temp_file" "$file"
    echo -e "${GREEN}✓${NC} Updated: $file"
    ((UPDATED_FILES++))
  else
    rm "$temp_file"
  fi
}

# Find all HTML and TS files
echo -e "${YELLOW}📁 Scanning for files with color inconsistencies...${NC}"
echo ""

# Process HTML files
while IFS= read -r -d '' file; do
  if grep -qE '(error-[6-9]00|warning-[6-9]00|success-[6-9]00|error-(50|100|200)|warning-(50|100|200)|success-(50|100|200))' "$file"; then
    update_file "$file"
  fi
done < <(find "$BASE_DIR" -type f -name "*.html" -print0)

# Process TS files
while IFS= read -r -d '' file; do
  if grep -qE '(error-[6-9]00|warning-[6-9]00|success-[6-9]00|error-(50|100|200)|warning-(50|100|200)|success-(50|100|200))' "$file"; then
    update_file "$file"
  fi
done < <(find "$BASE_DIR" -type f -name "*.ts" -print0)

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ✅ Migration Complete!"
echo -e "${GREEN}║${NC}  📊 Files updated: ${UPDATED_FILES}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Run: npm run lint:fix"
echo "  2. Test: npm run test:quick"
echo "  3. Review changes: git diff"
echo ""
