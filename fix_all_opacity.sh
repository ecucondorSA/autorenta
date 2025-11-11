#!/bin/bash
# Fix all opacity modifier syntax errors in Angular templates
# Pattern: [class.xxx/NN]="condition" -> move to [ngClass]

# This script will NOT automate the fix (too complex), but will generate a report
# showing all locations that need manual fixes

echo "Searching for problematic class bindings..."
echo "==========================================="

# Find all HTML files with opacity modifiers
grep -rn "\[class\.[^]]*/" apps/web/src --include="*.html" | while IFS=: read -r file line content; do
    echo "$file:$line"
    echo "  $content"
done

echo ""
echo "==========================================="
echo "All locations listed above need manual conversion to [ngClass]"
echo "==========================================="
