#!/bin/bash
#
# Version Code Bumper: Simple incremental version code management
#
# Purpose: Automatically increment versionCode for each build
#
# This is the pragmatic CI/CD solution: simply increment versionCode
# by 1 for each release build, preventing conflicts with Google Play.
#
# Usage in CI/CD:
#   ./bump-version-code.sh
#

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_GRADLE="$SCRIPT_DIR/app/build.gradle"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 Android Version Code Bumper${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Extract current versionCode
CURRENT_CODE=$(grep 'versionCode' "$BUILD_GRADLE" | grep -o '[0-9]\+' | head -1)
CURRENT_NAME=$(grep 'versionName' "$BUILD_GRADLE" | grep -oP '"\K[^"]+' | head -1)

echo "📊 Current Version:"
echo "   versionCode: $CURRENT_CODE"
echo "   versionName: $CURRENT_NAME"
echo ""

# Calculate next version code
NEXT_CODE=$((CURRENT_CODE + 1))

echo "🔄 Bumping versionCode..."
echo "   $CURRENT_CODE → $NEXT_CODE"
echo ""

# Update build.gradle with new versionCode
sed -i "s/versionCode $CURRENT_CODE/versionCode $NEXT_CODE/" "$BUILD_GRADLE"

# Verify the update
VERIFIED_CODE=$(grep 'versionCode' "$BUILD_GRADLE" | grep -o '[0-9]\+' | head -1)

if [ "$VERIFIED_CODE" != "$NEXT_CODE" ]; then
    echo -e "${YELLOW}❌ Error: Failed to update versionCode${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Version code bumped${NC}"
echo ""
echo "📝 Changes made:"
echo "   File: $BUILD_GRADLE"
echo "   versionCode: $CURRENT_CODE → $NEXT_CODE"
echo ""
echo -e "${YELLOW}💡 Remember: Commit this change before building!${NC}"
echo "   git add apps/web/android/app/build.gradle"
echo "   git commit -m \"chore(android): bump versionCode $CURRENT_CODE → $NEXT_CODE\""
echo ""
