#!/bin/bash
#
# Version Code Sync Script: Synchronize local versionCode with Google Play Console
#
# Purpose: Automatically increment versionCode to avoid conflicts with previously released builds
#
# This script:
#   1. Queries Google Play Console for the highest versionCode in use
#   2. Compares with local versionCode in build.gradle
#   3. Increments to next available if needed
#   4. Updates build.gradle automatically
#
# Usage:
#   ./sync-version-code.sh [--auto-commit]
#
# Environment Variables Required:
#   GOOGLE_PLAY_SERVICE_ACCOUNT - Base64 encoded service account JSON
#   PACKAGE_NAME - Android package name (com.autorentar.app)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_GRADLE="$SCRIPT_DIR/app/build.gradle"

# Configuration
PACKAGE_NAME="${PACKAGE_NAME:-com.autorentar.app}"
AUTO_COMMIT="${1:-}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 Android Version Code Synchronizer${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Package: $PACKAGE_NAME"
echo "Build config: $BUILD_GRADLE"
echo ""

# ============================================================================
# 1. Get local versionCode and versionName
# ============================================================================

echo "🔍 Reading local version info..."

LOCAL_VERSION_CODE=$(grep 'versionCode' "$BUILD_GRADLE" | grep -o '[0-9]\+' | head -1)
LOCAL_VERSION_NAME=$(grep 'versionName' "$BUILD_GRADLE" | grep -oP '"\K[^"]+' | head -1)

if [ -z "$LOCAL_VERSION_CODE" ] || [ -z "$LOCAL_VERSION_NAME" ]; then
    echo -e "${RED}❌ Error: Could not parse versionCode or versionName from build.gradle${NC}"
    exit 1
fi

echo "✓ Local versionCode: $LOCAL_VERSION_CODE"
echo "✓ Local versionName: $LOCAL_VERSION_NAME"
echo ""

# ============================================================================
# 2. Attempt to sync with Google Play Console
# ============================================================================

echo "🌐 Querying Google Play Console..."
echo ""

# Check if we have service account credentials
if [ -z "${GOOGLE_PLAY_SERVICE_ACCOUNT:-}" ]; then
    echo -e "${YELLOW}⚠️  GOOGLE_PLAY_SERVICE_ACCOUNT not set${NC}"
    echo "    Skipping Google Play sync (running in local mode)"
    echo "    You can still manually increment the version code"
    echo ""
    PLAY_VERSION_CODE=0
    SYNC_AVAILABLE=false
else
    SYNC_AVAILABLE=true

    # Create temporary service account file
    TEMP_CREDS=$(mktemp)
    trap "rm -f $TEMP_CREDS" EXIT

    echo "$GOOGLE_PLAY_SERVICE_ACCOUNT" | base64 -d > "$TEMP_CREDS" 2>/dev/null || {
        echo -e "${RED}❌ Error: Invalid base64 in GOOGLE_PLAY_SERVICE_ACCOUNT${NC}"
        exit 1
    }

    # Get access token
    echo "  Authenticating with Google Play API..."
    ACCESS_TOKEN=$(gcloud auth application-default print-access-token --cred-file="$TEMP_CREDS" 2>/dev/null) || {
        echo -e "${YELLOW}⚠️  Could not authenticate with Google Play API${NC}"
        echo "    Make sure gcloud SDK is installed and configured"
        PLAY_VERSION_CODE=0
        SYNC_AVAILABLE=false
    }

    if [ -n "${ACCESS_TOKEN}" ]; then
        echo "  ✓ Authenticated"

        # Query Google Play Console API for releases
        echo "  Fetching release history from Google Play..."

        # Get all releases and extract versionCode
        PLAY_RELEASES=$(curl -s \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/$PACKAGE_NAME/edits/0/releases" 2>/dev/null || echo "")

        if [ -z "$PLAY_RELEASES" ]; then
            echo -e "${YELLOW}⚠️  Could not fetch releases from Google Play${NC}"
            PLAY_VERSION_CODE=0
            SYNC_AVAILABLE=false
        else
            # Extract highest versionCode from all releases
            PLAY_VERSION_CODE=$(echo "$PLAY_RELEASES" | \
                grep -oP '"versionCode":\s*"\K[0-9]+' 2>/dev/null | \
                sort -n | tail -1)

            if [ -z "$PLAY_VERSION_CODE" ]; then
                PLAY_VERSION_CODE=0
            fi

            echo "✓ Highest versionCode in Google Play: $PLAY_VERSION_CODE"
        fi
    fi
fi

echo ""

# ============================================================================
# 3. Calculate next version code
# ============================================================================

echo "📊 Version code analysis:"
echo "  Local:       $LOCAL_VERSION_CODE"
echo "  Play Store:  $PLAY_VERSION_CODE"
echo ""

# Determine next versionCode
if [ "$LOCAL_VERSION_CODE" -le "$PLAY_VERSION_CODE" ]; then
    NEXT_VERSION_CODE=$((PLAY_VERSION_CODE + 1))
    ACTION="increment"

    echo -e "${YELLOW}⚠️  Conflict detected!${NC}"
    echo "   Local versionCode ($LOCAL_VERSION_CODE) is not higher than Play Store ($PLAY_VERSION_CODE)"
    echo ""
    echo "🔄 Auto-incrementing to: $NEXT_VERSION_CODE"
else
    NEXT_VERSION_CODE="$LOCAL_VERSION_CODE"
    ACTION="none"

    echo -e "${GREEN}✅ No conflict detected${NC}"
    echo "   Local versionCode ($LOCAL_VERSION_CODE) is safe to use"
fi

echo ""

# ============================================================================
# 4. Update build.gradle if needed
# ============================================================================

if [ "$ACTION" = "increment" ]; then
    echo "📝 Updating build.gradle..."

    # Replace versionCode in build.gradle
    sed -i.bak "s/versionCode $LOCAL_VERSION_CODE/versionCode $NEXT_VERSION_CODE/" "$BUILD_GRADLE"
    rm -f "$BUILD_GRADLE.bak"

    # Verify update
    NEW_VERSION_CODE=$(grep 'versionCode' "$BUILD_GRADLE" | grep -o '[0-9]\+' | head -1)

    if [ "$NEW_VERSION_CODE" != "$NEXT_VERSION_CODE" ]; then
        echo -e "${RED}❌ Error: Failed to update versionCode${NC}"
        exit 1
    fi

    echo "✓ Updated versionCode: $LOCAL_VERSION_CODE → $NEXT_VERSION_CODE"
    echo ""

    # Auto-commit if requested
    if [ "$AUTO_COMMIT" = "--auto-commit" ]; then
        echo "💾 Committing changes..."
        cd "$SCRIPT_DIR/../.."  # Go to repo root

        git add "apps/web/android/app/build.gradle"
        git commit -m "chore(android): bump versionCode $LOCAL_VERSION_CODE → $NEXT_VERSION_CODE

This was automatically synced to avoid Google Play version conflicts.
Updated by: sync-version-code.sh
Package: $PACKAGE_NAME
Date: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"

        echo "✓ Committed"
    else
        echo -e "${BLUE}💡 Tip: Run with --auto-commit to automatically commit the changes${NC}"
    fi
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Sync complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Next build will use:"
echo "  versionCode: $NEXT_VERSION_CODE"
echo "  versionName: $LOCAL_VERSION_NAME"
echo ""
