#!/bin/bash

# Script para generar y abrir reporte de coverage
# Uso: ./scripts/generate-coverage-report.sh

set -e

echo "📊 Generando reporte de coverage..."

# Ejecutar tests con coverage
npm run test:coverage

# Esperar a que termine
echo "✅ Tests completados"

# Verificar que el reporte se generó
COVERAGE_DIR="coverage"
HTML_REPORT="$COVERAGE_DIR/index.html"

if [ ! -f "$HTML_REPORT" ]; then
  echo "❌ Error: No se encontró el reporte de coverage en $HTML_REPORT"
  exit 1
fi

echo "📄 Reporte generado en: $HTML_REPORT"
echo ""
echo "📈 Resumen de coverage:"
echo ""

# Extraer resumen del reporte (si está disponible)
if command -v grep &> /dev/null; then
  # Buscar líneas con porcentajes en el HTML
  grep -oP '\d+\.\d+%' "$HTML_REPORT" | head -5 || true
fi

# Abrir el reporte en el navegador (si está disponible)
if command -v xdg-open &> /dev/null; then
  echo "🌐 Abriendo reporte en el navegador..."
  xdg-open "$HTML_REPORT" 2>/dev/null || true
elif command -v open &> /dev/null; then
  echo "🌐 Abriendo reporte en el navegador..."
  open "$HTML_REPORT" 2>/dev/null || true
else
  echo "💡 Abre manualmente: file://$(pwd)/$HTML_REPORT"
fi

echo ""
echo "✅ Coverage report generado exitosamente"









