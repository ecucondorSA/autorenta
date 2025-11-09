#!/bin/bash
set -e

echo "🎨 AutoRenta Color Palette Migration - Phase 2"
echo "==============================================="
echo "Replacing standard Tailwind colors with AutoRenta palette..."
echo ""

# Function to replace in all files
replace_all() {
    local old="$1"
    local new="$2"
    local desc="$3"
    
    echo "  $desc"
    find apps/web/src -type f \( -name "*.html" -o -name "*.ts" -o -name "*.css" -o -name "*.scss" \) \
        -exec sed -i "s/${old}/${new}/g" {} +
}

# === Blue → Sky ===
echo "📘 Replacing blue-* with sky-*..."
replace_all "text-blue-50" "text-sky-50" "text-blue-50 → text-sky-50"
replace_all "text-blue-100" "text-sky-100" "text-blue-100 → text-sky-100"
replace_all "text-blue-200" "text-sky-200" "text-blue-200 → text-sky-200"
replace_all "text-blue-300" "text-sky-300" "text-blue-300 → text-sky-300"
replace_all "text-blue-400" "text-sky-400" "text-blue-400 → text-sky-400"
replace_all "text-blue-500" "text-sky-500" "text-blue-500 → text-sky-500"
replace_all "text-blue-600" "text-sky-600" "text-blue-600 → text-sky-600"
replace_all "text-blue-700" "text-sky-700" "text-blue-700 → text-sky-700"
replace_all "text-blue-800" "text-sky-600" "text-blue-800 → text-sky-600"
replace_all "text-blue-900" "text-sky-700" "text-blue-900 → text-sky-700"

replace_all "bg-blue-50" "bg-sky-50" "bg-blue-50 → bg-sky-50"
replace_all "bg-blue-100" "bg-sky-100" "bg-blue-100 → bg-sky-100"
replace_all "bg-blue-200" "bg-sky-200" "bg-blue-200 → bg-sky-200"
replace_all "bg-blue-300" "bg-sky-300" "bg-blue-300 → bg-sky-300"
replace_all "bg-blue-400" "bg-sky-400" "bg-blue-400 → bg-sky-400"
replace_all "bg-blue-500" "bg-sky-500" "bg-blue-500 → bg-sky-500"
replace_all "bg-blue-600" "bg-sky-600" "bg-blue-600 → bg-sky-600"
replace_all "bg-blue-700" "bg-sky-700" "bg-blue-700 → bg-sky-700"
replace_all "bg-blue-800" "bg-sky-600" "bg-blue-800 → bg-sky-600"
replace_all "bg-blue-900" "bg-sky-700" "bg-blue-900 → bg-sky-700"

replace_all "border-blue-50" "border-sky-50" "border-blue-50 → border-sky-50"
replace_all "border-blue-100" "border-sky-100" "border-blue-100 → border-sky-100"
replace_all "border-blue-200" "border-sky-200" "border-blue-200 → border-sky-200"
replace_all "border-blue-300" "border-sky-300" "border-blue-300 → border-sky-300"
replace_all "border-blue-400" "border-sky-400" "border-blue-400 → border-sky-400"
replace_all "border-blue-500" "border-sky-500" "border-blue-500 → border-sky-500"
replace_all "border-blue-600" "border-sky-600" "border-blue-600 → border-sky-600"
replace_all "border-blue-700" "border-sky-700" "border-blue-700 → border-sky-700"

# === Yellow → Beige ===
echo ""
echo "💛 Replacing yellow-* with beige-*..."
replace_all "text-yellow-50" "text-beige-50" "text-yellow-50 → text-beige-50"
replace_all "text-yellow-100" "text-beige-100" "text-yellow-100 → text-beige-100"
replace_all "text-yellow-200" "text-beige-200" "text-yellow-200 → text-beige-200"
replace_all "text-yellow-300" "text-beige-300" "text-yellow-300 → text-beige-300"
replace_all "text-yellow-400" "text-beige-400" "text-yellow-400 → text-beige-400"
replace_all "text-yellow-500" "text-beige-400" "text-yellow-500 → text-beige-400"
replace_all "text-yellow-600" "text-beige-500" "text-yellow-600 → text-beige-500"
replace_all "text-yellow-700" "text-beige-500" "text-yellow-700 → text-beige-500"
replace_all "text-yellow-800" "text-beige-500" "text-yellow-800 → text-beige-500"
replace_all "text-yellow-900" "text-beige-500" "text-yellow-900 → text-beige-500"

replace_all "bg-yellow-50" "bg-beige-50" "bg-yellow-50 → bg-beige-50"
replace_all "bg-yellow-100" "bg-beige-100" "bg-yellow-100 → bg-beige-100"
replace_all "bg-yellow-200" "bg-beige-200" "bg-yellow-200 → bg-beige-200"
replace_all "bg-yellow-300" "bg-beige-300" "bg-yellow-300 → bg-beige-300"
replace_all "bg-yellow-400" "bg-beige-400" "bg-yellow-400 → bg-beige-400"
replace_all "bg-yellow-500" "bg-beige-400" "bg-yellow-500 → bg-beige-400"

replace_all "border-yellow-50" "border-beige-50" "border-yellow-50 → border-beige-50"
replace_all "border-yellow-100" "border-beige-100" "border-yellow-100 → border-beige-100"
replace_all "border-yellow-200" "border-beige-200" "border-yellow-200 → border-beige-200"
replace_all "border-yellow-300" "border-beige-300" "border-yellow-300 → border-beige-300"
replace_all "border-yellow-400" "border-beige-400" "border-yellow-400 → border-beige-400"
replace_all "border-yellow-500" "border-beige-400" "border-yellow-500 → border-beige-400"

# === Indigo → Sky ===
echo ""
echo "💙 Replacing indigo-* with sky-*..."
replace_all "text-indigo-" "text-sky-" "text-indigo-* → text-sky-*"
replace_all "bg-indigo-" "bg-sky-" "bg-indigo-* → bg-sky-*"
replace_all "border-indigo-" "border-sky-" "border-indigo-* → border-sky-*"
replace_all "hover:bg-indigo-" "hover:bg-sky-" "hover:bg-indigo-* → hover:bg-sky-*"
replace_all "hover:text-indigo-" "hover:text-sky-" "hover:text-indigo-* → hover:text-sky-*"

# === Purple → Sky ===
echo ""
echo "💜 Replacing purple-* with sky-*..."
replace_all "text-purple-" "text-sky-" "text-purple-* → text-sky-*"
replace_all "bg-purple-" "bg-sky-" "bg-purple-* → bg-sky-*"
replace_all "border-purple-" "border-sky-" "border-purple-* → border-sky-*"

# === Pink → Sky ===
echo ""
echo "💗 Replacing pink-* with sky-*..."
replace_all "text-pink-" "text-sky-" "text-pink-* → text-sky-*"
replace_all "bg-pink-" "bg-sky-" "bg-pink-* → bg-sky-*"
replace_all "border-pink-" "border-sky-" "border-pink-* → border-sky-*"

echo ""
echo "✅ Phase 2 migration completed!"
echo ""
echo "Standard Tailwind colors have been replaced with AutoRenta palette:"
echo "  - blue → sky"
echo "  - yellow → beige"
echo "  - indigo, purple, pink → sky"
echo ""
