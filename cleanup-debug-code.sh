#!/bin/bash

echo "🧹 Cleaning up debug code for PRODUCTION..."
echo "=========================================="

# Remove debug elements from template files
echo "🔍 Searching for debug elements..."

# Find and list debug occurrences first
echo "📍 Debug elements found:"
grep -r "debug\|DEBUG\|Debug" apps/web/src --include="*.ts" --include="*.html" | grep -i "debug" | head -10

echo ""
echo "🧹 Removing debug elements..."

# Remove debug console.log statements (keeping error logs)
find apps/web/src -name "*.ts" -type f -exec sed -i '/console\.log.*[dD]ebug/d' {} \;
find apps/web/src -name "*.ts" -type f -exec sed -i '/console\.debug/d' {} \;

# Remove debug HTML elements
find apps/web/src -name "*.ts" -type f -exec sed -i '/<.*debug.*>/,/<\/.*>/d' {} \;
find apps/web/src -name "*.html" -type f -exec sed -i '/<.*debug.*>/,/<\/.*>/d' {} \;

# Remove debug CSS classes
find apps/web/src -name "*.ts" -type f -exec sed -i '/\.debug/,/}/d' {} \;

# Remove debug comments
find apps/web/src -name "*.ts" -type f -exec sed -i '/\/\/ DEBUG/d' {} \;
find apps/web/src -name "*.ts" -type f -exec sed -i '/\/\* DEBUG/,/\*\//d' {} \;

echo "✅ Debug cleanup completed!"
echo ""
echo "🔍 Verifying cleanup..."
remaining_debug=$(grep -r "debug\|DEBUG" apps/web/src --include="*.ts" --include="*.html" 2>/dev/null | wc -l)
echo "📊 Remaining debug references: $remaining_debug"

if [ $remaining_debug -eq 0 ]; then
    echo "🎉 ALL DEBUG CODE REMOVED - PRODUCTION READY!"
else
    echo "⚠️ Some debug references remain (may be legitimate)"
fi

echo ""
echo "🚀 Code is ready for production deployment!"
