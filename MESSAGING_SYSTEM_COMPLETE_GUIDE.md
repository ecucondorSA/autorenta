# 📬 Sistema de Mensajería - Guía Completa de Resolución

## 🔴 Problema Identificado

### Error en Producción
```
POST https://obxvffplochgeiclibng.supabase.co/rest/v1/messages 400 (Bad Request)
POST https://obxvffplochgeiclibng.supabase.co/rest/v1/messages 404 (Not Found)
```

## 🔍 Diagnóstico

### Causas Posibles:
1. **Tabla `messages` no existe en producción**
2. **RLS policies incorrectas o faltantes**
3. **Realtime no habilitado para la tabla**
4. **Columnas diferentes entre local y producción**

## ✅ Solución Implementada

### 1. Migration SQL Creada
📁 `supabase/migrations/20251101_fix_messages_table_production.sql`

Esta migración:
- ✅ Crea la tabla `messages` si no existe
- ✅ Agrega todos los índices necesarios
- ✅ Configura RLS policies correctamente
- ✅ Habilita Realtime
- ✅ Crea funciones helper

### 2. Servicio de Notificaciones de Sonido
📁 `apps/web/src/app/core/services/notification-sound.service.ts`

Características:
- 🔊 Reproduce sonido cuando llega un mensaje
- 🎵 Sonido diferente para mensajes enviados
- 🔇 Puede deshabilitarse
- 📱 Compatible con móviles (requiere interacción del usuario)
- 🌐 Usa Web Audio API (fallback a Audio element)

### 3. Componentes Actualizados
- ✅ `booking-chat.component.ts` - Sonido en mensajes de reserva
- ✅ `car-chat.component.ts` - Sonido en consultas de autos

### 4. Badge de Mensajes No Leídos
✅ Ya implementado en `mobile-bottom-nav.component.ts`
- Muestra contador en el ícono de mensajes
- Se actualiza en tiempo real
- Usa `UnreadMessagesService`

## 🚀 Pasos para Desplegar

### Paso 1: Aplicar Migration en Producción

#### Opción A: Desde Supabase Dashboard
```bash
1. Ve a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/sql
2. Copia el contenido de: supabase/migrations/20251101_fix_messages_table_production.sql
3. Pega en el editor SQL
4. Click en "Run"
```

#### Opción B: Desde CLI (si tienes acceso)
```bash
cd /home/edu/autorenta
supabase db push
```

#### Opción C: Conectar directamente a la base de datos
```bash
# Usar las credenciales que proporcionaste:
psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023EN@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Luego ejecutar el contenido del archivo SQL
\i supabase/migrations/20251101_fix_messages_table_production.sql
```

### Paso 2: Verificar que la Tabla Existe

Ejecuta en SQL Editor de Supabase:

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'messages';

-- Verificar columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'messages';

-- Verificar que Realtime está habilitado
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
AND tablename = 'messages';
```

### Paso 3: Rebuild y Deploy de la App

```bash
cd /home/edu/autorenta
npm run build
# Deploy a Cloudflare Pages
```

## 🧪 Testing

### Test 1: Enviar Mensaje desde la UI
1. Ve a un detalle de auto
2. Click en "Contactar al dueño"
3. Envía un mensaje
4. Verifica que no hay error 400/404 en Console

### Test 2: Verificar Sonido
1. Abre la página en dos navegadores (o incógnito)
2. Loguéate con diferentes usuarios
3. Envía un mensaje desde uno
4. Verifica que suena en el otro

### Test 3: Badge de No Leídos
1. En móvil, ve al bottom nav
2. Envía mensajes desde otra cuenta
3. Verifica que aparece el badge con número

## 🐛 Debug si Sigue Fallando

### Verificar en Browser Console

```javascript
// Verificar que el token de Supabase es correcto
console.log(localStorage.getItem('supabase.auth.token'));

// Verificar estructura de mensaje
const testMessage = {
  car_id: 'SOME_CAR_ID',
  sender_id: 'USER_ID',
  recipient_id: 'OWNER_ID',
  body: 'Mensaje de prueba'
};

// Intentar enviar directamente
const { data, error } = await supabase
  .from('messages')
  .insert(testMessage);

console.log('Result:', data, error);
```

### Verificar RLS en Supabase

```sql
-- Verificar que el usuario puede insertar
SELECT * FROM messages WHERE false; -- Esto debería funcionar sin error

-- Intentar insertar manualmente (reemplaza los UUIDs)
INSERT INTO messages (car_id, sender_id, recipient_id, body)
VALUES (
  'CAR_UUID_AQUI',
  'TU_USER_UUID',
  'OTRO_USER_UUID',
  'Test message'
);
```

## 📱 Cómo Ver los Mensajes (Inbox)

### Para el Locatario (quien alquila):
1. Bottom nav → Ícono "Mensajes" (4to botón)
2. Se abre `/messages` (Inbox)
3. Lista de conversaciones
4. Click en conversación → abre chat

### Para el Locador (dueño del auto):
1. Mismo flujo
2. Ve mensajes de personas interesadas en su auto
3. Badge muestra cantidad de no leídos

### Flujo Completo:
```
Locatario → Detalle de Auto → "Contactar" → Envía mensaje
                                                ↓
Locador → Bottom Nav → Mensajes → Ve nuevo mensaje (badge: 1)
                                                ↓
Locador → Click en conversación → Responde
                                                ↓
Locatario → Recibe notificación + sonido
```

## 🔧 Configuración de API Keys

### Verificar que estás usando las keys correctas:

```typescript
// En environment.prod.ts o .env
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU
```

## 📊 Arquitectura del Sistema de Mensajería

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Angular)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Inbox      │  │  Booking     │  │    Car       │      │
│  │   Page       │  │  Chat        │  │    Chat      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────┬───────┴─────────┬───────┘               │
│                   │                 │                       │
│         ┌─────────▼─────────────────▼───────┐               │
│         │    MessagesService                │               │
│         │  + Realtime subscriptions         │               │
│         │  + Offline queue                  │               │
│         └─────────┬───────────────────────────┘             │
│                   │                                         │
│         ┌─────────▼─────────────────────┐                   │
│         │  UnreadMessagesService        │                   │
│         │  + Badge counter              │                   │
│         └─────────┬───────────────────────┘                 │
│                   │                                         │
│         ┌─────────▼─────────────────────┐                   │
│         │  NotificationSoundService     │                   │
│         │  + Play sound on new message  │                   │
│         └───────────────────────────────┘                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Supabase Client
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Supabase Backend                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐            │
│  │        messages table                        │            │
│  │  + RLS policies                             │            │
│  │  + Realtime enabled                         │            │
│  │  + Indexes for performance                  │            │
│  └─────────────────────────────────────────────┘            │
│                                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │  Helper Functions                            │            │
│  │  + get_unread_messages_count()              │            │
│  │  + mark_conversation_as_read()              │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Checklist Final

- [ ] Migration aplicada en producción
- [ ] Tabla `messages` existe
- [ ] RLS policies activas
- [ ] Realtime habilitado
- [ ] App rebuildeada y deployeada
- [ ] Test de envío de mensaje (sin error 400)
- [ ] Sonido de notificación funciona
- [ ] Badge de no leídos se actualiza
- [ ] Inbox muestra conversaciones
- [ ] Chat funciona en ambas direcciones

## 💡 Mejoras Futuras

1. **Push Notifications** (con Capacitor)
2. **Encriptación E2E** de mensajes
3. **Envío de imágenes** en chat
4. **Mensajes de audio**
5. **Indicador de "visto"** (doble check)
6. **Reacciones** a mensajes
7. **Búsqueda** en mensajes
8. **Archivar** conversaciones

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Verifica los logs de Supabase
2. Revisa Network tab en DevTools
3. Comprueba que no hay CORS issues
4. Valida que el usuario está autenticado

¡El sistema está listo para funcionar en producción! 🚀
