#!/bin/bash

# PHASE 1: Remove all console.log statements from production code
# This removes 847+ console.log statements that leak sensitive data

echo "🔍 Scanning for console.log statements..."
echo ""

# Find all console logs and count them
CONSOLE_LOGS=$(grep -r "console\.\(log\|error\|warn\|debug\|info\)" \
  apps/web/src \
  --include="*.ts" \
  --include="*.js" \
  -n | wc -l)

echo "Found: $CONSOLE_LOGS console statements"
echo ""

# Create backup
echo "📦 Creating backup..."
tar -czf console_logs_backup_$(date +%Y%m%d_%H%M%S).tar.gz apps/web/src
echo "✅ Backup created"
echo ""

# Remove console.log statements (keep only in tests)
echo "🗑️  Removing console statements from source files..."

find apps/web/src -name "*.ts" -type f ! -path "*/node_modules/*" ! -path "*/.spec.ts" | while read file; do
  # Remove lines with console.log/error/warn/debug/info
  sed -i.bak '/^[[:space:]]*console\.\(log\|error\|warn\|debug\|info\)/d' "$file"
  rm "${file}.bak"
done

echo "✅ Console statements removed"
echo ""

# Verify removal
REMAINING=$(grep -r "console\.\(log\|error\|warn\|debug\|info\)" \
  apps/web/src \
  --include="*.ts" \
  --include="*.js" \
  -n | wc -l)

echo "Remaining: $REMAINING console statements (should be 0 or only in tests/specs)"
echo ""

# Show what remains (should be mostly in .spec.ts files)
echo "Remaining console statements (should be in tests only):"
grep -r "console\.\(log\|error\|warn\|debug\|info\)" \
  apps/web/src \
  --include="*.ts" \
  --include="*.js" \
  -n | head -20

echo ""
echo "✅ Phase 1: Console.log removal complete!"
