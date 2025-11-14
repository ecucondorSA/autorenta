#!/bin/bash

# Script to migrate from ToastService to NotificationManagerService
# This script updates all TypeScript files that use ToastService

set -e

echo "🔄 Migrating from ToastService to NotificationManagerService..."
echo ""

# Find all .ts files that import toast.service
FILES=$(cd /home/edu/autorenta/apps/web/src && find . -name "*.ts" -type f -exec grep -l "from.*toast.service" {} \; 2>/dev/null)

COUNT=0
for file in $FILES; do
  FULL_PATH="/home/edu/autorenta/apps/web/src/$file"

  echo "📝 Updating: $file"

  # Replace import statement
  sed -i "s|from '\(.*\)toast\.service'|from '\1notification-manager.service'|g" "$FULL_PATH"
  sed -i 's|from "\(.*\)toast\.service"|from "\1notification-manager.service"|g' "$FULL_PATH"

  # Replace ToastService with NotificationManagerService in imports
  sed -i 's/import { ToastService }/import { NotificationManagerService }/g' "$FULL_PATH"
  sed -i 's/, ToastService/, NotificationManagerService/g' "$FULL_PATH"
  sed -i 's/ToastService,/NotificationManagerService,/g' "$FULL_PATH"

  # Replace inject(ToastService) with inject(NotificationManagerService)
  sed -i 's/inject(ToastService)/inject(NotificationManagerService)/g' "$FULL_PATH"

  COUNT=$((COUNT + 1))
done

echo ""
echo "✅ Migration complete! Updated $COUNT files."
echo ""
echo "Note: Variable names (toastService) remain unchanged for backward compatibility."
echo "The NotificationManagerService maintains the same API as ToastService."
