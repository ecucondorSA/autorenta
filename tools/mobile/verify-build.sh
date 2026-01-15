#!/bin/bash

# tools/mobile/verify-build.sh
# Verifica el build de Android antes de publicar en Play Store

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../../"

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📱 AutoRenta - Android Build Verifier           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Read version from variables.gradle
cd "$PROJECT_ROOT/android"
TARGET_SDK=$(grep "targetSdkVersion" variables.gradle | sed 's/[^0-9]*//g')
COMPILE_SDK=$(grep "compileSdkVersion" variables.gradle | sed 's/[^0-9]*//g')

# Read version from build.gradle
cd app
VERSION_CODE=$(grep "versionCode" build.gradle | head -1 | sed 's/[^0-9]*//g')
VERSION_NAME=$(grep "versionName" build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
PACKAGE_NAME=$(grep "applicationId" build.gradle | sed 's/.*"\(.*\)".*/\1/')

echo -e "${BLUE}📦 Build Information:${NC}"
echo -e "  Package Name:    ${YELLOW}$PACKAGE_NAME${NC}"
echo -e "  Version Code:    ${YELLOW}$VERSION_CODE${NC}"
echo -e "  Version Name:    ${YELLOW}$VERSION_NAME${NC}"
echo -e "  Target SDK:      ${YELLOW}$TARGET_SDK${NC}"
echo -e "  Compile SDK:     ${YELLOW}$COMPILE_SDK${NC}"
echo ""

# Local verification
echo -e "${BLUE}🔍 Running Local Verification...${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Target SDK Version
echo -n "  [1/5] Target SDK Version (API 35+)... "
if [ "$TARGET_SDK" -ge 35 ]; then
    echo -e "${GREEN}✅ PASS${NC} (API $TARGET_SDK)"
else
    echo -e "${RED}❌ FAIL${NC} (API $TARGET_SDK - Required: 35+)"
    ((ERRORS++))
fi

# Check 2: Version Code
echo -n "  [2/5] Version Code validity... "
if [ "$VERSION_CODE" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($VERSION_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} (Invalid version code)"
    ((ERRORS++))
fi

# Check 3: Package Name
echo -n "  [3/5] Package Name... "
if [ "$PACKAGE_NAME" == "com.autorentar.app" ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${RED}❌ FAIL${NC} (Expected: com.autorentar.app)"
    ((ERRORS++))
fi

# Check 4: Keystore exists (check multiple locations)
echo -n "  [4/5] Release Keystore... "
KEYSTORE_FOUND=0
for KEYSTORE_PATH in "$PROJECT_ROOT/keystore/autorentar-release.keystore" "$PROJECT_ROOT/android/keystore/autorentar-release.keystore" "$PROJECT_ROOT/android/app/autorentar-release.keystore" "$PROJECT_ROOT/apps/web/android/keystore/autorentar-release.keystore"; do
    if [ -f "$KEYSTORE_PATH" ]; then
        KEYSTORE_FOUND=1
        break
    fi
done

if [ $KEYSTORE_FOUND -eq 1 ]; then
    echo -e "${GREEN}✅ PASS${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Keystore not found - required for release signing)"
    ((WARNINGS++))
fi

# Check 5: Required URLs
echo -n "  [5/5] Policy URLs... "
PRIVACY_URL="https://autorentar.com/privacy"
DELETE_URL="https://autorentar.com/delete-account"
TERMS_URL="https://autorentar.com/terminos"

# Quick check if URLs are accessible (skip if no internet)
if command -v curl &> /dev/null; then
    if curl -s --head --fail "$PRIVACY_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (Cannot verify URLs)"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (curl not available)"
fi

echo ""
echo -e "${BLUE}📋 Required Policy URLs:${NC}"
echo -e "  • Privacy:        $PRIVACY_URL"
echo -e "  • Account Delete: $DELETE_URL"
echo -e "  • Terms:          $TERMS_URL"
echo ""

# Check with Supabase Edge Function (optional)
echo -e "${BLUE}🌐 API Verification (Optional):${NC}"
read -p "Do you want to check against Play Store API? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}ℹ️  Calling verify-android-build Edge Function...${NC}"
    
    # Requires SUPABASE_URL and SUPABASE_ANON_KEY env vars
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        source "$PROJECT_ROOT/.env.local"
    fi

    SUPABASE_URL="${SUPABASE_URL:-https://uvtujvwvulufwwmjhqek.supabase.co}"
    
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        echo -e "${YELLOW}⚠️  SUPABASE_ANON_KEY not set. Skipping API check.${NC}"
    else
        PAYLOAD=$(cat <<EOF
{
  "appInfo": {
    "packageName": "$PACKAGE_NAME",
    "versionCode": $VERSION_CODE,
    "versionName": "$VERSION_NAME",
    "targetSdkVersion": $TARGET_SDK
  },
  "checkPlayStore": true
}
EOF
)
        
        RESPONSE=$(curl -s -X POST \
            "$SUPABASE_URL/functions/v1/verify-android-build" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD")
        
        echo -e "${GREEN}Response:${NC}"
        echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
    fi
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ BUILD VERIFICATION PASSED${NC}"
    echo -e "${GREEN}   Ready to publish to Google Play Store!${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}   ($WARNINGS warnings - review recommended)${NC}"
    fi
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Build release AAB: ./gradlew bundleRelease"
    echo "  2. Upload to Play Console: https://play.google.com/console"
    echo "  3. Start with Internal Testing track"
    exit 0
else
    echo -e "${RED}❌ BUILD VERIFICATION FAILED${NC}"
    echo -e "${RED}   $ERRORS critical error(s) found${NC}"
    echo ""
    echo -e "${YELLOW}Please fix the errors before publishing.${NC}"
    exit 1
fi
