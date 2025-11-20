#!/bin/bash
# Hook ejecutado antes de cada commit via Claude Code
# Ejecuta lint:fix automático para mantener código limpio

set -e

echo "🎨 Ejecutando lint:fix automático..."
npm run lint:fix > /dev/null 2>&1 || true

echo "✅ Pre-commit hook completado"
