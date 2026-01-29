#!/bin/bash

# Threshold in KB
THRESHOLD=500

echo "Checking for large images (> ${THRESHOLD}KB) in public directory..."

find apps/web/public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -size +${THRESHOLD}k -exec ls -lh {} \; | awk '{print $9 ": " $5}'

echo ""
echo "Recommendation: Convert these images to WebP format to reduce size."
echo "You can use tools like 'cwebp' or online converters."
