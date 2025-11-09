#!/bin/bash
set -e

echo "🔧 Fixing remaining color references in TypeScript files..."

# Function to replace in TypeScript files
replace_ts() {
    local old="$1"
    local new="$2"
    echo "  Replacing $old → $new"
    find apps/web/src -type f -name "*.ts" -exec sed -i "s/${old}/${new}/g" {} +
}

# Replace remaining color references in TypeScript inline templates
replace_ts "text-accent-petrol" "text-sky-600"
replace_ts "text-accent-warm" "text-beige-400"
replace_ts "hover:text-accent-petrol" "hover:text-sky-600"
replace_ts "hover:text-accent-warm" "hover:text-beige-400"
replace_ts "bg-accent-petrol" "bg-sky-600"
replace_ts "bg-accent-warm" "bg-beige-400"
replace_ts "dark:bg-slate-deep" "dark:bg-gray-700"
replace_ts "bg-slate-deep" "bg-gray-700"
replace_ts "bg-smoke-black" "bg-gray-900"
replace_ts "text-smoke-black" "text-gray-900"
replace_ts "bg-ivory-soft" "bg-ivory-100"
replace_ts "text-ivory-soft" "text-ivory-100"

echo ""
echo "✅ Remaining colors fixed in TypeScript files!"

