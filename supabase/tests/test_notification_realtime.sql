-- ============================================================================
-- SCRIPT DE PRUEBA: Notificaciones en Tiempo Real
-- ============================================================================
-- Este script crea notificaciones de prueba para verificar que el sistema
-- de notificaciones en tiempo real funciona correctamente.
--
-- USO:
-- 1. Ejecuta este script en Supabase SQL Editor
-- 2. Abre el frontend en http://localhost:4200 (o tu URL de desarrollo)
-- 3. Inicia sesión con el usuario: owner.test@autorentar.com
-- 4. Abre la consola del navegador (F12)
-- 5. Observa los logs de [NotificationsService]
-- 6. Las notificaciones deberían aparecer automáticamente sin refrescar
-- ============================================================================

-- Notificación de prueba #1: Sistema funcionando
INSERT INTO public.notifications (
  user_id,
  title,
  body,
  type,
  cta_link,
  metadata
)
VALUES (
  '44ff666d-42b8-4d04-adf2-730e43cbbd0e', -- owner.test@autorentar.com
  '🔔 Notificación de Prueba - Sistema Funcionando',
  'Esta es una notificación de prueba generada automáticamente para verificar que el sistema de notificaciones en tiempo real está funcionando correctamente. Si ves esto, significa que Realtime está activo.',
  'generic_announcement',
  '/notifications',
  jsonb_build_object(
    'test', true,
    'timestamp', NOW(),
    'source', 'diagnostic_test'
  )
);

-- Notificación de prueba #2: Test de Realtime
INSERT INTO public.notifications (
  user_id,
  title,
  body,
  type,
  cta_link,
  metadata
)
VALUES (
  '44ff666d-42b8-4d04-adf2-730e43cbbd0e',
  '✅ Test de Realtime - Notificación #2',
  'Esta es la segunda notificación de prueba. Debería aparecer automáticamente en el frontend sin necesidad de refrescar la página gracias a la suscripción de Supabase Realtime.',
  'generic_announcement',
  '/dashboard',
  jsonb_build_object(
    'test', true,
    'notification_number', 2,
    'timestamp', NOW()
  )
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Ejecuta esta consulta para verificar que las notificaciones se crearon:
--
-- SELECT 
--   id,
--   title,
--   body,
--   type,
--   is_read,
--   created_at
-- FROM public.notifications
-- WHERE user_id = '44ff666d-42b8-4d04-adf2-730e43cbbd0e'
-- ORDER BY created_at DESC
-- LIMIT 5;
--
-- ============================================================================
-- PRUEBA EN TIEMPO REAL
-- ============================================================================
-- Para probar que Realtime funciona mientras estás viendo la página:
-- 1. Abre el frontend y mantén la consola abierta
-- 2. Ejecuta esta consulta en otra pestaña del SQL Editor:
--
-- INSERT INTO public.notifications (
--   user_id,
--   title,
--   body,
--   type
-- )
-- VALUES (
--   '44ff666d-42b8-4d04-adf2-730e43cbbd0e',
--   '⚡ Notificación en Tiempo Real',
--   'Esta notificación debería aparecer INSTANTÁNEAMENTE en el frontend sin refrescar la página. Si la ves, ¡Realtime está funcionando perfectamente!',
--   'generic_announcement'
-- );
--
-- 3. Observa que la notificación aparece automáticamente en el frontend
-- 4. Revisa la consola para ver el log: [NotificationsService] New notification received via Realtime
-- ============================================================================



