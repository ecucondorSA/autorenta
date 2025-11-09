#!/bin/bash
set -e

echo "🔧 Ultra final color fix..."

find apps/web/src -type f -name "*.ts" -exec sed -i '
    s/dark:bg-anthracite/dark:bg-gray-800/g
    s/bg-anthracite/bg-gray-800/g
    s/hover:bg-sand-light/hover:bg-beige-100/g
    s/bg-sand-light/bg-beige-100/g
    s/hover:bg-ivory-luminous/hover:bg-ivory-50/g
    s/bg-ivory-luminous/bg-ivory-50/g
' {} +

echo "  anthracite → gray-800"
echo "  sand-light → beige-100"
echo "  ivory-luminous → ivory-50"
echo ""
echo "✅ Ultra final fix completed!"
