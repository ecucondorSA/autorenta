#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "  Aplicando Correcciones de Seguridad P0 - Supabase"
echo "  Fecha: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "supabase/migrations/20251027_security_fixes_p0_critical.sql" ]; then
  echo "❌ Error: Archivo de migración no encontrado"
  echo "   Asegúrate de estar en el directorio raíz del proyecto"
  exit 1
fi

echo "📋 Issues a corregir:"
echo "   1. spatial_ref_sys - Revocar acceso público"
echo "   2. platform_config - Habilitar RLS"
echo "   3. v_payment_authorizations - Remover exposición auth.users"
echo ""

# Verificar conexión Supabase
echo "🔍 Verificando conexión a Supabase..."
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI no está instalado"
  echo "   Instalación: npm install -g supabase"
  echo ""
  echo "📝 Para aplicar manualmente:"
  echo "   1. Abre Supabase Dashboard"
  echo "   2. Ve a SQL Editor"
  echo "   3. Pega el contenido de: supabase/migrations/20251027_security_fixes_p0_critical.sql"
  echo "   4. Ejecuta el script"
  exit 1
fi

# Aplicar migración
echo ""
echo "🚀 Aplicando migración de seguridad..."
echo ""

# Opción 1: Si tienes supabase CLI linkeado
if supabase db push 2>/dev/null; then
  echo ""
  echo "✅ Migración aplicada con éxito vía Supabase CLI"
else
  echo ""
  echo "⚠️  No se pudo aplicar automáticamente"
  echo ""
  echo "📝 INSTRUCCIONES MANUALES:"
  echo ""
  echo "1. Abre Supabase Dashboard:"
  echo "   https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql"
  echo ""
  echo "2. En SQL Editor, ejecuta el archivo:"
  echo "   supabase/migrations/20251027_security_fixes_p0_critical.sql"
  echo ""
  echo "3. Verifica los mensajes de éxito en la consola"
  echo ""
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  VERIFICACIÓN POST-APLICACIÓN"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Ejecuta estas queries para verificar:"
echo ""
echo "-- 1. Verificar RLS en platform_config:"
echo "SELECT relrowsecurity FROM pg_class WHERE relname = 'platform_config';"
echo ""
echo "-- 2. Verificar permisos spatial_ref_sys:"
echo "SELECT grantee, privilege_type FROM information_schema.table_privileges"
echo "WHERE table_name = 'spatial_ref_sys' AND grantee IN ('anon', 'authenticated');"
echo ""
echo "-- 3. Verificar v_payment_authorizations sin SECURITY DEFINER:"
echo "SELECT pg_get_viewdef('public.v_payment_authorizations'::regclass);"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📊 Estado esperado después de la migración:"
echo "   ✅ spatial_ref_sys: Sin permisos para anon/authenticated"
echo "   ✅ platform_config: RLS habilitado con políticas"
echo "   ✅ v_payment_authorizations: SECURITY INVOKER, sin auth.users"
echo ""
echo "📖 Referencia completa: docs/reports/SUPABASE_SECURITY_LINTER_ISSUES.md"
echo ""

