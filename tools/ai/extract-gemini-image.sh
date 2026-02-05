#!/bin/bash
# Extract image from Gemini API response
# Usage: ./extract-gemini-image.sh response.json output.png

INPUT_FILE="${1:-response.json}"
OUTPUT_FILE="${2:-output.png}"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: Input file '$INPUT_FILE' not found"
  exit 1
fi

# Extract base64 data from Gemini response structure
# The image can be in any part of the parts array
IMAGE_DATA=$(jq -r '.candidates[0].content.parts[] | select(.inlineData) | .inlineData.data' "$INPUT_FILE" | head -1)

if [ -z "$IMAGE_DATA" ]; then
  echo "Error: No image data found in response"
  echo "Expected path: .candidates[0].content.parts[0].inlineData.data"
  echo ""
  echo "Response structure:"
  jq 'keys' "$INPUT_FILE" 2>/dev/null
  exit 1
fi

# Decode base64 and save
echo "$IMAGE_DATA" | base64 -d > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
  echo "✅ Image extracted: $OUTPUT_FILE ($SIZE bytes)"
else
  echo "❌ Failed to decode image"
  exit 1
fi
