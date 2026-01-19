#!/bin/bash
# verify-ad-id-removal.sh
# Verifies that the Android App Bundle does NOT contain AD_ID permission
# This is a privacy/compliance requirement

set -e

AAB_FILE="$1"

if [ -z "$AAB_FILE" ]; then
  echo "Usage: $0 <path-to-aab>"
  exit 1
fi

if [ ! -f "$AAB_FILE" ]; then
  echo "Error: AAB file not found: $AAB_FILE"
  exit 1
fi

echo "Checking AAB for AD_ID permission: $AAB_FILE"

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract AAB (it's a ZIP file)
unzip -q "$AAB_FILE" -d "$TEMP_DIR" 2>/dev/null || true

# Search for AD_ID permission in all AndroidManifest files
AD_ID_FOUND=false

for manifest in $(find "$TEMP_DIR" -name "AndroidManifest.xml" 2>/dev/null); do
  # Check for AD_ID permission (binary XML, so search for the string)
  if strings "$manifest" 2>/dev/null | grep -qi "AD_ID\|com.google.android.gms.permission.AD_ID"; then
    echo "WARNING: AD_ID permission found in $manifest"
    AD_ID_FOUND=true
  fi
done

# Also check base module manifest if exists
if [ -f "$TEMP_DIR/base/manifest/AndroidManifest.xml" ]; then
  if strings "$TEMP_DIR/base/manifest/AndroidManifest.xml" 2>/dev/null | grep -qi "AD_ID\|com.google.android.gms.permission.AD_ID"; then
    echo "WARNING: AD_ID permission found in base manifest"
    AD_ID_FOUND=true
  fi
fi

if [ "$AD_ID_FOUND" = true ]; then
  echo ""
  echo "FAIL: AD_ID permission detected in the AAB."
  echo "Please ensure the permission is removed in AndroidManifest.xml using:"
  echo '  <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove"/>'
  exit 1
fi

echo "PASS: No AD_ID permission found in the AAB"
exit 0
