#!/bin/bash
set -e

# AutoRenta Color Migration Script
# Replaces all old color references with new AutoRenta palette colors

echo "🎨 AutoRenta Color Palette Migration"
echo "======================================"

# Function to replace in all files of a given pattern
replace_in_files() {
    local old_value="$1"
    local new_value="$2"
    local file_pattern="$3"
    local description="$4"

    echo "  Replacing $description..."
    find apps/web/src -type f -name "$file_pattern" -exec sed -i "s/$old_value/$new_value/g" {} +
}

# === HTML/Template Files: Tailwind Classes ===
echo ""
echo "📝 Updating HTML Templates (Tailwind classes)..."

# Replace old color class names with new ones
replace_in_files "white-pure" "white" "*.html" "white-pure → white"
replace_in_files "accent-petrol" "sky-600" "*.html" "accent-petrol → sky-600"
replace_in_files "accent-warm" "beige-400" "*.html" "accent-warm → beige-400"
replace_in_files "sand-light" "beige-100" "*.html" "sand-light → beige-100"
replace_in_files "charcoal-medium" "gray-600" "*.html" "charcoal-medium → gray-600"
replace_in_files "ash-gray" "gray-400" "*.html" "ash-gray → gray-400"
replace_in_files "smoke-black" "gray-900" "*.html" "smoke-black → gray-900"
replace_in_files "ivory-soft" "ivory-100" "*.html" "ivory-soft → ivory-100"
replace_in_files "ivory-luminous" "ivory-50" "*.html" "ivory-luminous → ivory-50"
replace_in_files "pearl-gray" "gray-200" "*.html" "pearl-gray → gray-200"
replace_in_files "pearl-light" "beige-200" "*.html" "pearl-light → beige-200"
replace_in_files "slate-deep" "gray-700" "*.html" "slate-deep → gray-700"
replace_in_files "graphite-dark" "gray-900" "*.html" "graphite-dark → gray-900"
replace_in_files "anthracite" "gray-800" "*.html" "anthracite → gray-800"

# === CSS Files: Hardcoded Hex Colors ===
echo ""
echo "🎨 Updating CSS Files (hex colors)..."

# Replace hardcoded hex colors with new palette (case insensitive)
replace_in_files "#[Ff]8[Ff]6[Ff]3" "#FDF9F3" "*.css" "#F8F6F3 (ivory-soft) → #FDF9F3 (ivory-100)"
replace_in_files "#[Ee][Dd][Ee][Aa][Ee]3" "#F5F0E8" "*.css" "#EDEAE3 (sand-light) → #F5F0E8 (beige-100)"
replace_in_files "#1[Aa]1[Aa]1[Aa]" "#171717" "*.css" "#1A1A1A (smoke-black) → #171717 (gray-900)"
replace_in_files "#4[Bb]4[Bb]4[Bb]" "#525252" "*.css" "#4B4B4B (charcoal-medium) → #525252 (gray-600)"
replace_in_files "#8[Ee]8[Ee]8[Ee]" "#A3A3A3" "*.css" "#8E8E8E (ash-gray) → #A3A3A3 (gray-400)"
replace_in_files "#[Dd]9[Dd]6[Dd]0" "#E5E5E5" "*.css" "#D9D6D0 (pearl-gray) → #E5E5E5 (gray-200)"
replace_in_files "#2[Cc]4[Aa]52" "#0284C7" "*.css" "#2C4A52 (accent-petrol) → #0284C7 (sky-600)"
replace_in_files "#8[Bb]7355" "#DDCCA9" "*.css" "#8B7355 (accent-warm) → #DDCCA9 (beige-400)"
replace_in_files "#2[Aa]2[Aa]2[Aa]" "#404040" "*.css" "#2A2A2A (slate-deep) → #404040 (gray-700)"
replace_in_files "#[Ff][Aa][Ff]9[Ff]6" "#FEFCF9" "*.css" "#FAF9F6 (ivory-luminous) → #FEFCF9 (ivory-50)"
replace_in_files "#[Ee]5[Ee]3[Dd][Dd]" "#EDE4D3" "*.css" "#E5E3DD (pearl-light) → #EDE4D3 (beige-200)"
replace_in_files "#1[Ee]1[Ee]1[Ee]" "#262626" "*.css" "#1E1E1E (anthracite) → #262626 (gray-800)"

# Replace RGBA colors
replace_in_files "rgba(44, 74, 82" "rgba(2, 132, 199" "*.css" "rgba(accent-petrol) → rgba(sky-600)"
replace_in_files "rgba(139, 115, 85" "rgba(221, 204, 169" "*.css" "rgba(accent-warm) → rgba(beige-400)"
replace_in_files "rgba(217, 214, 208" "rgba(229, 229, 229" "*.css" "rgba(pearl-gray) → rgba(gray-200)"

# === SCSS Files ===
echo ""
echo "💎 Updating SCSS Files..."

# Same replacements for SCSS
replace_in_files "#[Ff]8[Ff]6[Ff]3" "#FDF9F3" "*.scss" "#F8F6F3 → #FDF9F3"
replace_in_files "#[Ee][Dd][Ee][Aa][Ee]3" "#F5F0E8" "*.scss" "#EDEAE3 → #F5F0E8"
replace_in_files "#1[Aa]1[Aa]1[Aa]" "#171717" "*.scss" "#1A1A1A → #171717"
replace_in_files "#4[Bb]4[Bb]4[Bb]" "#525252" "*.scss" "#4B4B4B → #525252"
replace_in_files "#8[Ee]8[Ee]8[Ee]" "#A3A3A3" "*.scss" "#8E8E8E → #A3A3A3"
replace_in_files "#[Dd]9[Dd]6[Dd]0" "#E5E5E5" "*.scss" "#D9D6D0 → #E5E5E5"
replace_in_files "#2[Cc]4[Aa]52" "#0284C7" "*.scss" "#2C4A52 → #0284C7"
replace_in_files "#8[Bb]7355" "#DDCCA9" "*.scss" "#8B7355 → #DDCCA9"
replace_in_files "#2[Aa]2[Aa]2[Aa]" "#404040" "*.scss" "#2A2A2A → #404040"
replace_in_files "rgba(44, 74, 82" "rgba(2, 132, 199" "*.scss" "rgba(accent-petrol) → rgba(sky-600)"
replace_in_files "rgba(139, 115, 85" "rgba(221, 204, 169" "*.scss" "rgba(accent-warm) → rgba(beige-400)"

# === TypeScript Files (in case colors are used in component code) ===
echo ""
echo "📜 Checking TypeScript Files for hardcoded colors..."
replace_in_files "#2[Cc]4[Aa]52" "#0284C7" "*.ts" "#2C4A52 → #0284C7"
replace_in_files "#8[Bb]7355" "#DDCCA9" "*.ts" "#8B7355 → #DDCCA9"

echo ""
echo "✅ Color migration completed!"
echo ""
echo "📊 Summary:"
echo "  - HTML templates updated with new Tailwind classes"
echo "  - CSS files updated with new hex colors"
echo "  - SCSS files updated with new hex colors"
echo "  - TypeScript files checked for hardcoded colors"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run lint:fix' to fix any formatting issues"
echo "  2. Run 'npm run build' to verify no build errors"
echo "  3. Review changes with 'git diff'"
echo "  4. Test the application visually"
