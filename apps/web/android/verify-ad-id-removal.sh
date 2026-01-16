#!/bin/bash
#
# Security Verification Script: Verify AD_ID Permission Removal
#
# Purpose: Ensure that the com.google.android.gms.permission.AD_ID permission
#          is NOT present in the compiled APK/AAB, even from transitive dependencies.
#
# Usage:
#   ./verify-ad-id-removal.sh <path-to-aab-or-apk>
#   Example: ./verify-ad-id-removal.sh app/build/outputs/bundle/release/app-release.aab
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if argument provided
if [ $# -ne 1 ]; then
    echo -e "${RED}❌ Error: Missing argument${NC}"
    echo "Usage: $0 <path-to-aab-or-apk>"
    exit 1
fi

ARTIFACT="$1"

# Check if file exists
if [ ! -f "$ARTIFACT" ]; then
    echo -e "${RED}❌ Error: File not found: $ARTIFACT${NC}"
    exit 1
fi

echo "🔍 Verifying AD_ID Permission Removal..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Artifact: $ARTIFACT"
echo "File size: $(du -h "$ARTIFACT" | cut -f1)"
echo ""

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Determine file type and extract
if [[ "$ARTIFACT" == *.aab ]]; then
    echo "📦 Type: Android App Bundle (AAB)"
    echo "Extracting base module manifest..."

    # AAB is a ZIP file - extract BundleConfig.pb and base module
    unzip -q "$ARTIFACT" -d "$TEMP_DIR"

    # Look for AndroidManifest.xml in the base module
    MANIFEST=$(find "$TEMP_DIR" -name "AndroidManifest.xml" -type f | head -1)

elif [[ "$ARTIFACT" == *.apk ]]; then
    echo "📱 Type: Android Package (APK)"
    echo "Extracting manifest..."

    # APK is a ZIP file
    unzip -q "$ARTIFACT" -d "$TEMP_DIR"
    MANIFEST="$TEMP_DIR/AndroidManifest.xml"

else
    echo -e "${RED}❌ Error: Unknown file type. Expected .aab or .apk${NC}"
    exit 1
fi

if [ ! -f "$MANIFEST" ]; then
    echo -e "${RED}❌ Error: Could not find AndroidManifest.xml in artifact${NC}"
    exit 1
fi

echo "✓ Manifest extracted"
echo ""

# Check for AD_ID permission
# Note: Manifest might be binary, so we need to search for the permission string
if strings "$MANIFEST" | grep -q "com.google.android.gms.permission.AD_ID"; then
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "⚠️  The AD_ID permission is PRESENT in the compiled artifact!"
    echo ""
    echo "This means:"
    echo "  • Google Play Console will reject this build"
    echo "  • The app is claiming to use advertising IDs"
    echo "  • Transitive dependencies may not be properly filtered"
    echo ""
    echo "Action required:"
    echo "  1. Verify AndroidManifest.xml has tools:node=\"remove\" for AD_ID"
    echo "  2. Check for transitive GMS dependencies in build.gradle"
    echo "  3. Rebuild and re-run this verification"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ VERIFICATION PASSED${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✓ AD_ID permission is NOT present in the compiled artifact"
    echo "✓ Manifest merge tools:node=\"remove\" is working correctly"
    echo "✓ App can be safely uploaded to Google Play Console"
    echo ""
    exit 0
fi
