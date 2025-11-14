-- Script de verificación: Notifications Realtime Configuration
-- Ejecutar en Supabase SQL Editor para diagnosticar problemas de notificaciones

-- 1. Verificar que la tabla notifications existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications')
    THEN '✅ Tabla notifications existe'
    ELSE '❌ Tabla notifications NO existe'
  END as table_status;

-- 2. Verificar que la tabla está en la publicación supabase_realtime
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'notifications'
    )
    THEN '✅ Tabla notifications está en supabase_realtime'
    ELSE '❌ Tabla notifications NO está en supabase_realtime'
  END as realtime_status;

-- 3. Verificar REPLICA IDENTITY
SELECT 
  CASE 
    WHEN (SELECT relreplident FROM pg_class WHERE relname = 'notifications') = 'f'
    THEN '✅ REPLICA IDENTITY FULL está configurado'
    ELSE '❌ REPLICA IDENTITY NO está configurado como FULL'
  END as replica_identity_status;

-- 4. Listar todas las tablas en supabase_realtime (para referencia)
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 5. Si la tabla NO está en la publicación, ejecutar esto:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6. Si REPLICA IDENTITY NO está configurado, ejecutar esto:
-- ALTER TABLE public.notifications REPLICA IDENTITY FULL;



