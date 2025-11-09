#!/bin/bash
set -e

echo "🔧 Final comprehensive color fix..."

# Function to replace
fix() {
    local old="$1"
    local new="$2"
    echo "  $old → $new"
    find apps/web/src -type f -name "*.ts" -exec sed -i "s/${old}/${new}/g" {} +
}

# Background colors with opacity
fix "bg-pearl-gray" "bg-gray-200"
fix "hover:bg-pearl-gray" "hover:bg-gray-200"

# Ivory variations
fix "bg-ivory-100" "bg-ivory-100"
fix "hover:bg-ivory-100" "hover:bg-ivory-100"
fix "dark:bg-graphite-dark" "dark:bg-gray-900"
fix "hover:bg-graphite-dark" "hover:bg-gray-900"
fix "dark:hover:bg-graphite-dark" "dark:hover:bg-gray-900"

# Text colors
fix "text-white-pure" "text-white"
fix "dark:text-white-pure" "dark:text-white"
fix "text-ivory-luminous" "text-ivory-50"
fix "dark:text-ivory-luminous" "dark:text-ivory-50"

# Gradient colors
fix "from-accent-warm" "from-beige-400"
fix "from-accent-petrol" "from-sky-600"
fix "to-accent-warm" "to-beige-400"
fix "to-accent-petrol" "to-sky-600"
fix "via-accent-warm" "via-beige-400"
fix "via-accent-petrol" "via-sky-600"

fix "from-sand-light" "from-beige-100"
fix "to-ivory-soft" "to-ivory-100"
fix "dark:to-anthracite" "dark:to-gray-800"

# Class conditionals
fix "\[class.dark:text-white-pure\]" "[class.dark:text-white]"

echo ""
echo "✅ Final color fix completed!"
