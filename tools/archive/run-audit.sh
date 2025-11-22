#!/bin/bash
# Script para ejecutar auditoría de base de datos en Supabase
# Ejecuta múltiples verificaciones y genera un reporte

echo "🔍 AUDITORÍA DE BASE DE DATOS AUTORENTA"
echo "========================================"
echo "Fecha: $(date)"
echo ""

# Verificar si el CLI de Supabase está disponible
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx no está disponible"
    exit 1
fi

echo "📋 Instrucciones:"
echo "1. Abre Supabase Dashboard: https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql/new"
echo "2. Copia el contenido de audit-database.sql"
echo "3. Ejecuta cada sección para obtener el reporte completo"
echo ""
echo "📊 Verificaciones incluidas:"
echo "   ✓ Columna onboarding en profiles"
echo "   ✓ Estado RLS de todas las tablas"
echo "   ✓ Políticas RLS por tabla"
echo "   ✓ Índices existentes"
echo "   ✓ Foreign keys y constraints"
echo "   ✓ Tablas críticas"
echo "   ✓ Enum types"
echo "   ✓ Storage buckets y policies"
echo "   ✓ Funciones RPC críticas"
echo "   ✓ Migraciones aplicadas"
echo "   ✓ Tablas sin RLS"
echo "   ✓ Estructura de wallet_transactions"
echo ""

# Intentar verificar conexión
echo "🔌 Verificando conexión a Supabase..."
if npx supabase projects list --format json 2>/dev/null | grep -q "pisqjmoklivzpwufhscx"; then
    echo "✅ Conexión establecida"
    echo ""
    echo "📝 Ejecutando verificaciones rápidas..."
    echo ""
    
    # Verificar migraciones locales vs remotas
    echo "📦 Estado de migraciones:"
    npx supabase migration list 2>/dev/null | tail -10
else
    echo "⚠️  No se pudo conectar automáticamente"
    echo "   Por favor usa el SQL Editor manualmente"
fi

echo ""
echo "📄 Archivo SQL completo: audit-database.sql"
echo "💡 Tip: Puedes ejecutar secciones individuales copiando solo la query que necesites"
