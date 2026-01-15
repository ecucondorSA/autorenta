#!/bin/bash
# Script para verificar status da tradução dos slides

echo "📊 Status da Tradução - AutoRentar Pitchdeck"
echo "============================================"
echo ""

# Verificar quais slides usam useTranslations
slides_using_translations=$(grep -l "useTranslations" src/slides/*.tsx | wc -l)
total_slides=$(ls src/slides/*.tsx | wc -l)

echo "Slides totais: $total_slides"
echo "Slides com tradução: $slides_using_translations"
echo "Slides pendentes: $((total_slides - slides_using_translations))"
echo ""

echo "✅ Slides com tradução:"
grep -l "useTranslations" src/slides/*.tsx | xargs -n1 basename | sed 's/\.tsx//'

echo ""
echo "❌ Slides pendentes:"
for slide in src/slides/*.tsx; do
    if ! grep -q "useTranslations" "$slide"; then
        basename "$slide" .tsx
    fi
done