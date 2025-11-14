# Test de Notificaciones en Tiempo Real

## ✅ Notificaciones de Prueba Creadas

Se han creado **3 notificaciones de prueba** en la base de datos para el usuario:
- **Email**: `owner.test@autorentar.com`
- **User ID**: `44ff666d-42b8-4d04-adf2-730e43cbbd0e`

### Notificaciones Creadas:

1. **🔔 Notificación de Prueba - Sistema Funcionando**
   - ID: `f840d105-9c94-4516-a5bb-daa375822b06`
   - Creada: 2025-11-13 20:18:04 UTC

2. **✅ Test de Realtime - Notificación #2**
   - ID: `a5f7cfb2-bc74-4ae7-aa8d-b388fa619ca2`
   - Creada: 2025-11-13 20:18:05 UTC

3. **⚡ Notificación en Tiempo Real - Test #3**
   - Creada: Recién creada para probar en tiempo real

## 🧪 Cómo Verificar que Funciona

### Paso 1: Abrir el Frontend
```bash
# Si no está corriendo, inicia el servidor de desarrollo
npm run dev
```

Abre el navegador en: `http://localhost:4200`

### Paso 2: Iniciar Sesión
- **Email**: `owner.test@autorentar.com`
- **Password**: (la contraseña de este usuario de prueba)

### Paso 3: Abrir Consola del Navegador
1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Console**
3. Filtra por: `[NotificationsService]`

### Paso 4: Verificar Logs Esperados

Deberías ver logs como estos:

```
[NotificationsService] Subscribing to Realtime notifications for user: 44ff666d-42b8-4d04-adf2-730e43cbbd0e
[NotificationsService] Realtime subscription status: SUBSCRIBED
[NotificationsService] ✅ Successfully subscribed to Realtime notifications
[NotificationsService] Loading notifications...
```

### Paso 5: Verificar Notificaciones en la UI

1. Haz clic en el **botón de campana** (🔔) en el header
2. Deberías ver las 3 notificaciones de prueba
3. El indicador de estado debería mostrar: **"Conectado"** (verde)

### Paso 6: Probar Notificación en Tiempo Real

1. **Mantén el frontend abierto** con la consola visible
2. Abre otra pestaña y ve a **Supabase SQL Editor**
3. Ejecuta esta consulta:

```sql
INSERT INTO public.notifications (
  user_id,
  title,
  body,
  type
)
VALUES (
  '44ff666d-42b8-4d04-adf2-730e43cbbd0e',
  '⚡ Notificación en Tiempo Real',
  'Esta notificación debería aparecer INSTANTÁNEAMENTE sin refrescar. Si la ves, ¡Realtime funciona!',
  'generic_announcement'
);
```

4. **Observa el frontend**: La notificación debería aparecer automáticamente
5. **Revisa la consola**: Deberías ver:
   ```
   [NotificationsService] New notification received via Realtime: {...}
   ```

## ✅ Checklist de Verificación

- [ ] Las notificaciones aparecen en el dropdown
- [ ] El indicador de estado muestra "Conectado" (verde)
- [ ] Los logs muestran "Successfully subscribed to Realtime notifications"
- [ ] Las notificaciones nuevas aparecen automáticamente sin refrescar
- [ ] El badge de "sin leer" muestra el número correcto
- [ ] Al hacer clic en una notificación, se marca como leída

## 🔍 Troubleshooting

### Si NO ves las notificaciones:

1. **Verifica que estás logueado con el usuario correcto**
   - Debe ser: `owner.test@autorentar.com`

2. **Revisa la consola para errores**
   - Busca mensajes con `[NotificationsService]`
   - Si ves `CHANNEL_ERROR` o `TIMED_OUT`, haz clic en "🔄 Reconectar"

3. **Verifica la conexión a Supabase**
   - Revisa que `NG_APP_SUPABASE_URL` y `NG_APP_SUPABASE_ANON_KEY` estén correctos en `.env.local`

4. **Verifica que Realtime está habilitado**
   - Ejecuta en Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'notifications';
   ```
   - Debe retornar 1 fila

### Si el indicador muestra "Error de conexión":

1. Haz clic en el botón **"🔄 Reconectar"** en el dropdown
2. Revisa los logs de la consola para ver el error específico
3. Verifica tu conexión a internet
4. Verifica que Supabase esté accesible

## 📊 Estado Actual del Sistema

- ✅ Tabla `notifications` existe
- ✅ Tabla en publicación `supabase_realtime`
- ✅ `REPLICA IDENTITY FULL` configurado
- ✅ RLS habilitado y políticas correctas
- ✅ Frontend con reconexión automática
- ✅ Logging completo para diagnóstico

## 🎯 Próximos Pasos

Una vez verificado que funciona:

1. **Limpiar notificaciones de prueba** (opcional):
   ```sql
   DELETE FROM public.notifications 
   WHERE user_id = '44ff666d-42b8-4d04-adf2-730e43cbbd0e'
   AND metadata->>'test' = 'true';
   ```

2. **Probar con notificaciones reales**:
   - Enviar un mensaje de chat (debería crear notificación automáticamente)
   - Crear una reserva (debería notificar al propietario)

3. **Monitorear logs en producción**:
   - Revisar logs de `[NotificationsService]` periódicamente
   - Verificar que las reconexiones automáticas funcionan



