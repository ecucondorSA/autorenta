#!/bin/bash
# =============================================================================
# Emoji Replacer for AutoRenta Codebase
# =============================================================================
# Replaces common emojis with <app-icon> components in HTML files.
#
# Usage:
#   ./tools/replace-emojis.sh --dry-run    # Preview changes
#   ./tools/replace-emojis.sh --apply      # Apply changes
#   ./tools/replace-emojis.sh --file <path> # Process single file
# =============================================================================

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCAN_DIR="apps/web/src/app"
DRY_RUN=true
SINGLE_FILE=""

# Parse args
for arg in "$@"; do
  case $arg in
    --apply) DRY_RUN=false ;;
    --dry-run) DRY_RUN=true ;;
    --file=*) SINGLE_FILE="${arg#*=}" ;;
    --file) shift; SINGLE_FILE="$1" ;;
  esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   AutoRenta Emoji Replacer${NC}"
if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}   Mode: DRY RUN (no changes will be made)${NC}"
else
  echo -e "${GREEN}   Mode: APPLY (changes will be saved)${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Emoji to icon mapping (for standalone emoji replacement)
# Format: emoji|icon-name|default-size
MAPPINGS=(
  "🔍|search|20"
  "📅|calendar|20"
  "🚗|car|24"
  "💰|wallet|20"
  "💵|dollar|20"
  "💸|dollar|20"
  "💳|credit-card|20"
  "✓|check|16"
  "✅|check|16"
  "❌|close|16"
  "✕|close|16"
  "⚠️|alert-triangle|20"
  "⚠|alert-triangle|20"
  "🔔|bell|20"
  "📊|bar-chart|20"
  "📈|trending-up|20"
  "📋|clipboard|20"
  "🗑️|trash|20"
  "🗑|trash|20"
  "📷|camera|20"
  "📸|camera|20"
  "💬|message|20"
  "🔄|refresh|20"
  "⚡|lightning|20"
  "🔥|fire|20"
  "🏠|home|20"
  "📍|location|20"
  "🌐|globe|20"
  "⚙️|settings|20"
  "⚙|settings|20"
  "🛡️|shield|20"
  "🛡|shield|20"
  "🔒|lock|20"
  "💡|lightbulb|20"
  "📝|edit|20"
  "📞|phone|20"
  "🔗|link|20"
  "📤|upload|20"
  "➕|plus|16"
  "🏦|bank|20"
  "👛|wallet|20"
  "🔋|battery|20"
  "🎉|celebration|24"
  "🚀|rocket|20"
  "⭐|star|16"
)

# Count replacements
TOTAL_REPLACEMENTS=0

# Get files to process
if [ -n "$SINGLE_FILE" ]; then
  FILES=("$SINGLE_FILE")
else
  mapfile -t FILES < <(find "$SCAN_DIR" -name "*.html" -type f)
fi

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    continue
  fi

  FILE_REPLACEMENTS=0
  TEMP_FILE=$(mktemp)
  cp "$file" "$TEMP_FILE"

  for mapping in "${MAPPINGS[@]}"; do
    IFS='|' read -r emoji icon size <<< "$mapping"

    # Count occurrences before replacement
    count=$(grep -o "$emoji" "$TEMP_FILE" 2>/dev/null | wc -l)

    if [ "$count" -gt 0 ]; then
      # Replace standalone emoji with app-icon
      # Pattern: emoji followed by space or end of tag content
      sed -i "s|${emoji}|<app-icon name=\"${icon}\" [size]=\"${size}\" />|g" "$TEMP_FILE"

      FILE_REPLACEMENTS=$((FILE_REPLACEMENTS + count))
      TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + count))
    fi
  done

  if [ "$FILE_REPLACEMENTS" -gt 0 ]; then
    short_file=$(echo "$file" | sed 's|apps/web/src/app/||')
    echo -e "${YELLOW}$short_file${NC}: ${GREEN}$FILE_REPLACEMENTS${NC} replacements"

    if [ "$DRY_RUN" = false ]; then
      cp "$TEMP_FILE" "$file"
    fi
  fi

  rm -f "$TEMP_FILE"
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Total replacements: ${GREEN}$TOTAL_REPLACEMENTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

if [ "$DRY_RUN" = true ] && [ "$TOTAL_REPLACEMENTS" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}This was a dry run. To apply changes, run:${NC}"
  echo -e "  ${GREEN}./tools/replace-emojis.sh --apply${NC}"
fi

echo ""
echo -e "${RED}IMPORTANT:${NC} After running, you must:"
echo "  1. Add IconComponent to each modified component's imports"
echo "  2. Review changes for proper sizing and context"
echo "  3. Run: npm run build:web to verify"
echo ""
