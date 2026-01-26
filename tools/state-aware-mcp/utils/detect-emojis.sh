#!/bin/bash
# =============================================================================
# Emoji Detector for AutoRenta Codebase
# =============================================================================
# Detects emoji usage in source files and reports locations for cleanup.
# Emojis should be replaced with SVG icons from the sprite system.
#
# Usage: ./tools/detect-emojis.sh [--summary] [--by-file]
# =============================================================================

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directory to scan
SCAN_DIR="apps/web/src/app"

# Emoji regex pattern
EMOJI_REGEX='[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AutoRenta Emoji Detector${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if --summary flag
if [[ "$1" == "--summary" ]]; then
  # Count files and occurrences
  FILE_COUNT=$(grep -rPl "$EMOJI_REGEX" --include="*.html" --include="*.ts" "$SCAN_DIR" 2>/dev/null | wc -l)
  EMOJI_COUNT=$(grep -rPo "$EMOJI_REGEX" --include="*.html" --include="*.ts" "$SCAN_DIR" 2>/dev/null | wc -l)

  echo -e "  ${YELLOW}Files with emojis:${NC}  $FILE_COUNT"
  echo -e "  ${YELLOW}Total emoji uses:${NC}   $EMOJI_COUNT"
  echo ""

  if [ "$EMOJI_COUNT" -gt 0 ]; then
    echo -e "${RED}Warning: Emojis detected!${NC}"
    echo -e "Run without --summary to see details."
  else
    echo -e "${GREEN}No emojis found. Codebase is clean!${NC}"
  fi

elif [[ "$1" == "--by-file" ]]; then
  # Group by file
  echo -e "${CYAN}Emojis grouped by file:${NC}"
  echo ""

  for file in $(grep -rPl "$EMOJI_REGEX" --include="*.html" --include="*.ts" "$SCAN_DIR" 2>/dev/null); do
    count=$(grep -Po "$EMOJI_REGEX" "$file" 2>/dev/null | wc -l)
    emojis=$(grep -Po "$EMOJI_REGEX" "$file" 2>/dev/null | sort -u | tr '\n' ' ')
    short_file=$(echo "$file" | sed 's|apps/web/src/app/||')
    echo -e "${YELLOW}$short_file${NC} (${GREEN}$count${NC}): $emojis"
  done

else
  # Show all occurrences with line numbers
  echo -e "${CYAN}All emoji occurrences:${NC}"
  echo ""

  grep -rPn "$EMOJI_REGEX" --include="*.html" --include="*.ts" "$SCAN_DIR" 2>/dev/null | while read -r line; do
    file=$(echo "$line" | cut -d: -f1 | sed 's|apps/web/src/app/||')
    linenum=$(echo "$line" | cut -d: -f2)
    content=$(echo "$line" | cut -d: -f3- | head -c 60)
    emoji=$(echo "$line" | grep -Po "$EMOJI_REGEX" | head -1)

    echo -e "${YELLOW}$file${NC}:${GREEN}$linenum${NC} $emoji"
  done
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Suggested replacements (use <app-icon name=\"...\">):${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  search, calendar, car, wallet, credit-card, check, close,"
echo "  alert-triangle, bell, bar-chart, clipboard, trash, camera,"
echo "  message, refresh, lightning, fire, home, location, globe,"
echo "  settings, shield, lock, lightbulb, edit, phone, link, upload"
echo ""
