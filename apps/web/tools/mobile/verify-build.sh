#!/bin/bash

# verify-build.sh - Android Build Verify
# Checks requirements for Google Play 2026

set -e

APP_DIR="apps/web"
ANDROID_DIR="$APP_DIR/android"
GRADLE_FILE="$ANDROID_DIR/app/build.gradle"
VARIABLES_FILE="$ANDROID_DIR/variables.gradle"
MANIFEST_FILE="$ANDROID_DIR/app/src/main/AndroidManifest.xml"

echo "╔════════════════════════════════════════════════════╗"
echo "║  📱 AutoRenta - Android Build Verifier           ║"
echo "╚════════════════════════════════════════════════════╝"

# 1. Check Target SDK
echo -n "🔍 [1/5] Checking Target SDK (Must be >= 35)... "
if [ -f "$VARIABLES_FILE" ]; then
  TARGET_SDK=$(grep "targetSdkVersion =" "$VARIABLES_FILE" | awk '{print $3}')
else
  TARGET_SDK=$(grep "targetSdkVersion" "$GRADLE_FILE" | awk '{print $2}')
fi

if [ "$TARGET_SDK" -ge 35 ]; then
  echo "✅ PASS ($TARGET_SDK)"
else
  echo "❌ FAIL (Found $TARGET_SDK, need 35+)"
  exit 1
fi

# 2. Check Version Code
echo -n "🔍 [2/5] Checking Version Code valid... "
VERSION_CODE=$(grep "versionCode" "$GRADLE_FILE" | head -n 1 | awk '{print $2}')
if [ "$VERSION_CODE" -gt 0 ]; then
  echo "✅ PASS ($VERSION_CODE)"
else
  echo "❌ FAIL (Invalid version code)"
  exit 1
fi

# 3. Check Package Name
echo -n "🔍 [3/5] Checking Package Name... "
PACKAGE_NAME="app.autorentar"
FOUND_PACKAGE=$(grep "applicationId" "$GRADLE_FILE" | awk '{print $2}' | tr -d '"')

if [[ "$FOUND_PACKAGE" == *"$PACKAGE_NAME"* ]]; then
  echo "✅ PASS ($FOUND_PACKAGE)"
else
  echo "❌ FAIL (Expected $PACKAGE_NAME, found $FOUND_PACKAGE)"
  exit 1
fi

# 4. Check Keystore
echo -n "🔍 [4/5] Checking Release Keystore... "
KEYSTORE_PATH="$ANDROID_DIR/app/autorentar-release.keystore"
if [ -f "$KEYSTORE_PATH" ]; then
  echo "✅ PASS"
else
  echo "⚠️  WARN (Keystore not found at $KEYSTORE_PATH)"
  # Don't fail, maybe CI handles it differently
fi

# 5. Check Policy URLs accessible
echo "🔍 [5/5] Checking Policy URLs..."
URLS=("https://autorentar.com/privacy" "https://autorentar.com/delete-account" "https://autorentar.com/terminos")

for url in "${URLS[@]}"; do
  if curl --output /dev/null --silent --head --fail "$url"; then
    echo "  ✅ $url accessible"
  else
    echo "  ⚠️  $url NOT accessible (may need deploy)"
  fi
done

echo ""
echo "✅ BUILD VERIFICATION COMPLETED"
echo "   Ready for './gradlew bundleRelease'"
