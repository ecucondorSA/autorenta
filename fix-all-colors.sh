#!/bin/bash
set -e

echo "🔧 Comprehensive color fix for all TypeScript files..."

# Function to replace all occurrences
fix_color() {
    local old="$1"
    local new="$2"
    echo "  $old → $new"
    find apps/web/src -type f -name "*.ts" -exec sed -i "s/${old}/${new}/g" {} +
}

# Border colors
fix_color "border-accent-petrol" "border-sky-600"
fix_color "border-accent-warm" "border-beige-400"
fix_color "border-pearl-gray" "border-gray-200"

# Ring colors
fix_color "ring-accent-petrol" "ring-sky-600"
fix_color "ring-accent-warm" "ring-beige-400"

# Hover states
fix_color "hover:border-accent-petrol" "hover:border-sky-600"
fix_color "hover:border-accent-warm" "hover:border-beige-400"
fix_color "dark:hover:border-accent-petrol" "dark:hover:border-sky-600"

# Focus states
fix_color "focus:border-accent-petrol" "focus:border-sky-600"
fix_color "focus:ring-accent-petrol" "focus:ring-sky-600"
fix_color "focus-visible:ring-accent-petrol" "focus-visible:ring-sky-600"
fix_color "focus:ring-offset-ivory-soft" "focus:ring-offset-ivory-100"
fix_color "focus-visible:ring-offset-ivory-soft" "focus-visible:ring-offset-ivory-100"
fix_color "focus:ring-offset-graphite-dark" "focus:ring-offset-gray-900"
fix_color "focus-visible:ring-offset-graphite-dark" "focus-visible:ring-offset-gray-900"
fix_color "dark:focus:ring-offset-graphite-dark" "dark:focus:ring-offset-gray-900"
fix_color "dark:focus-visible:ring-offset-graphite-dark" "dark:focus-visible:ring-offset-gray-900"

# Other colors
fix_color "bg-white-pure" "bg-white"
fix_color "text-charcoal-medium" "text-gray-600"
fix_color "text-ash-gray" "text-gray-400"
fix_color "text-pearl-light" "text-beige-200"
fix_color "bg-ash-gray" "bg-gray-400"
fix_color "dark:bg-slate-deep" "dark:bg-gray-700"
fix_color "from-slate-deep" "from-gray-700"
fix_color "to-slate-deep" "to-gray-700"
fix_color "dark:from-slate-deep" "dark:from-gray-700"
fix_color "dark:to-slate-deep" "dark:to-gray-700"
fix_color "dark:from-accent-petrol" "dark:from-sky-600"
fix_color "dark:to-accent-petrol" "dark:to-sky-600"
fix_color "dark:border-slate-deep" "dark:border-gray-700"

# Class bindings  
fix_color "\[class.ring-accent-petrol\]" "[class.ring-sky-600]"

echo ""
echo "✅ All color references fixed!"

