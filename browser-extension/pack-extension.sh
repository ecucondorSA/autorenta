#!/bin/bash
# Pack Chrome Extension
# Generates .crx and .pem files

set -e

EXTENSION_DIR="/home/edu/autorenta/browser-extension"
OUTPUT_DIR="/home/edu/autorenta/browser-extension/dist"

echo "======================================"
echo "  Chrome Extension Packager"
echo "======================================"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if private key exists
if [ -f "$OUTPUT_DIR/extension.pem" ]; then
    echo "✓ Using existing private key: extension.pem"
    PEM_FILE="$OUTPUT_DIR/extension.pem"
else
    echo "⚠ No private key found. Chrome will generate one."
    PEM_FILE=""
fi

# Pack extension using Chrome
echo ""
echo "Packing extension..."
echo "  Source: $EXTENSION_DIR"
echo "  Output: $OUTPUT_DIR"
echo ""

# Method 1: Using chrome --pack-extension
google-chrome \
    --pack-extension="$EXTENSION_DIR" \
    ${PEM_FILE:+--pack-extension-key="$PEM_FILE"} \
    2>&1 | grep -v "DevTools" || true

# Move generated files to dist/
if [ -f "$EXTENSION_DIR.crx" ]; then
    mv "$EXTENSION_DIR.crx" "$OUTPUT_DIR/claude-code-browser-control.crx"
    echo "✅ Extension packed: $OUTPUT_DIR/claude-code-browser-control.crx"
fi

if [ -f "$EXTENSION_DIR.pem" ]; then
    mv "$EXTENSION_DIR.pem" "$OUTPUT_DIR/extension.pem"
    echo "✅ Private key saved: $OUTPUT_DIR/extension.pem"
    echo ""
    echo "⚠️  IMPORTANT: Keep extension.pem safe!"
    echo "   You'll need it to update the extension."
fi

echo ""
echo "======================================"
echo "  Package Complete!"
echo "======================================"
echo ""
echo "Files created:"
ls -lh "$OUTPUT_DIR/" 2>/dev/null || echo "  (none yet - use Chrome UI method)"
echo ""
echo "Distribution:"
echo "  - Share: claude-code-browser-control.crx"
echo "  - Keep private: extension.pem (DO NOT SHARE)"
echo ""
