#!/bin/bash
# Hook ejecutado después de cambios de código
# Sincroniza tipos de Supabase automáticamente

set -e

echo "🔄 Sincronizando tipos de Supabase..."
npm run sync:types > /dev/null 2>&1 || {
    echo "⚠️  Sync types falló (puede ser normal si no hay cambios DB)"
}

echo "✅ Post-code hook completado"
