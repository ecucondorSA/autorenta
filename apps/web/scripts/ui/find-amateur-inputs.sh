#!/bin/bash
# Script para encontrar inputs con problemas de UI amateur
# Ejecutar desde apps/web: ./tools/find-amateur-inputs.sh

echo "🔍 Buscando inputs con problemas de UI amateur..."
echo "=================================================="
echo ""

# 1. Inputs con iconos dentro (padding-left grande)
echo "📌 1. Inputs con iconos internos (pl-10, pl-11, pl-3.5):"
echo "   Problema: El icono puede tapar el texto/placeholder"
echo ""
grep -rn --include="*.html" -E "pl-10|pl-11|pl-3\.5" src/ | grep -i "input\|class=" | head -20

echo ""
echo "=================================================="

# 2. Placeholders cortados o poco claros
echo "📌 2. Placeholders problemáticos (muy largos o confusos):"
echo ""
grep -rn --include="*.html" -E 'placeholder="[^"]{20,}"' src/ | head -10
grep -rn --include="*.html" -E 'placeholder="tu@|placeholder="••' src/ | head -10

echo ""
echo "=================================================="

# 3. Inputs con div relative + absolute (patrón de icono interno)
echo "📌 3. Patrón de icono absoluto dentro de input:"
echo "   Archivos con este patrón:"
echo ""
grep -l --include="*.html" -r "absolute inset-y-0.*pointer-events-none" src/

echo ""
echo "=================================================="

# 4. Inputs sin placeholder:text-gray para estilo consistente
echo "📌 4. Inputs sin estilo de placeholder consistente:"
echo ""
grep -rn --include="*.html" "placeholder=" src/ | grep -v "placeholder:text-" | head -15

echo ""
echo "=================================================="
echo "✅ Análisis completado"
echo ""
echo "💡 Recomendaciones:"
echo "   - Usar px-4 en lugar de pl-10/pl-11 (quitar iconos internos)"
echo "   - Placeholders cortos y claros: 'ejemplo@correo.com' en vez de 'tu@email.com'"
echo "   - Agregar placeholder:text-gray-400 para consistencia"
echo "   - Evitar placeholders con caracteres especiales como ••••••••"
