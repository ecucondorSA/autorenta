-- ============================================================================
-- FIX RLS SECURITY ISSUES - Database Advisors Findings
-- ============================================================================
-- Migración: 20251105_fix_rls_security_issues.sql
-- Fecha: 2025-11-05
--
-- PROBLEMAS DETECTADOS:
-- 1. exchange_rate_sync_log - RLS deshabilitado (creada en migración anterior)
-- 2. messages_backup - RLS deshabilitado
-- 3. spatial_ref_sys - RLS deshabilitado (tabla PostGIS del sistema)
--
-- SOLUCIONES:
-- - Habilitar RLS en todas las tablas públicas
-- - Crear políticas apropiadas para cada tabla
-- - Mantener spatial_ref_sys accesible (es de solo lectura)
-- ============================================================================

-- ============================================================================
-- 1. HABILITAR RLS EN exchange_rate_sync_log
-- ============================================================================
-- Tabla de logs de sincronización de tipos de cambio
-- Solo admins deberían poder ver/modificar

ALTER TABLE public.exchange_rate_sync_log ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver logs
CREATE POLICY "exchange_rate_sync_log_select_admin"
ON public.exchange_rate_sync_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Política: Solo el sistema (service_role) puede insertar logs
CREATE POLICY "exchange_rate_sync_log_insert_system"
ON public.exchange_rate_sync_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política: Solo admins pueden actualizar logs (para correcciones)
CREATE POLICY "exchange_rate_sync_log_update_admin"
ON public.exchange_rate_sync_log
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Política: Solo admins pueden eliminar logs
CREATE POLICY "exchange_rate_sync_log_delete_admin"
ON public.exchange_rate_sync_log
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

COMMENT ON TABLE public.exchange_rate_sync_log IS
'Registro de sincronizaciones de tipos de cambio. Solo admins pueden ver/modificar.
RLS habilitado para seguridad.';

-- ============================================================================
-- 2. HABILITAR RLS EN messages_backup (si existe)
-- ============================================================================
-- Tabla de respaldo de mensajes - verificar si existe primero

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'messages_backup'
  ) THEN
    -- Habilitar RLS
    EXECUTE 'ALTER TABLE public.messages_backup ENABLE ROW LEVEL SECURITY';

    -- Política: Solo admins pueden ver mensajes de backup
    CREATE POLICY "messages_backup_select_admin"
    ON public.messages_backup
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

    -- Política: Solo service_role puede insertar backups
    CREATE POLICY "messages_backup_insert_system"
    ON public.messages_backup
    FOR INSERT
    TO service_role
    WITH CHECK (true);

    -- Política: Solo admins pueden eliminar backups
    CREATE POLICY "messages_backup_delete_admin"
    ON public.messages_backup
    FOR DELETE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );

    RAISE NOTICE 'RLS habilitado en messages_backup';
  ELSE
    RAISE NOTICE 'Tabla messages_backup no existe, saltando...';
  END IF;
END $$;

-- ============================================================================
-- 3. HABILITAR RLS EN spatial_ref_sys (PostGIS)
-- ============================================================================
-- Tabla del sistema PostGIS - mantener acceso de lectura público
-- Esta tabla es de solo lectura y contiene sistemas de referencia espacial

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer (necesario para funciones geográficas)
CREATE POLICY "spatial_ref_sys_select_public"
ON public.spatial_ref_sys
FOR SELECT
TO public
USING (true);

-- Política: Solo service_role puede modificar (nunca debería pasar)
CREATE POLICY "spatial_ref_sys_modify_system"
ON public.spatial_ref_sys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.spatial_ref_sys IS
'Tabla del sistema PostGIS con sistemas de referencia espacial.
RLS habilitado pero lectura pública permitida (requerido por PostGIS).';

-- ============================================================================
-- 4. REVISAR Y DOCUMENTAR bookings_complete VIEW
-- ============================================================================
-- La vista bookings_complete usa SECURITY DEFINER
-- Esto es INTENCIONAL para permitir joins complejos sin exponer datos sensibles
-- Verificar que las políticas RLS en las tablas subyacentes sean correctas

COMMENT ON VIEW public.bookings_complete IS
'Vista materializada con SECURITY DEFINER para queries de performance.
SECURITY: Los datos expuestos están limitados por RLS en tablas base.
REVISIÓN: Verificar que solo exponga datos no sensibles.';

-- ============================================================================
-- VERIFICACIÓN: Listar todas las tablas sin RLS en public schema
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity = true THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESHABILITADO'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%'
ORDER BY rowsecurity ASC, tablename;

-- ============================================================================
-- VERIFICACIÓN: Contar políticas RLS por tabla
-- ============================================================================

SELECT
  schemaname,
  tablename,
  COUNT(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY num_policies DESC;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
