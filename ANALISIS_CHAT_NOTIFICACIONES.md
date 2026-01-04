# Analisis: chat y notificaciones (mensajes)

## Estado actual (segun codigo)
- Chat usa realtime para mensajes y typing:
  - `apps/web/src/app/shared/components/base-chat/base-chat.component.ts:447-516`
  - `apps/web/src/app/core/services/bookings/messages.service.ts:212-259` (subscribe)
- Bandeja (inbox) tambien se actualiza con realtime:
  - `apps/web/src/app/features/messages/inbox.page.ts:270-304`

## Problemas detectados

### 1) Contador de no leidos se infla en Inbox
- Inbox escucha `event: '*'` (INSERT + UPDATE) y siempre incrementa `unreadCount` si el sender no es el usuario.
  - `apps/web/src/app/features/messages/inbox.page.ts:285-334`
- Esto significa:
  - Cuando un mensaje se marca como `read_at` (UPDATE), el handler lo trata como nuevo y suma 1.
  - No hay ningun path que reduzca `unreadCount` en Inbox.
- Resultado: el badge de no leidos queda incorrecto y solo sube.

### 2) Lectura de conversacion no limpia el contador en la UI del Inbox
- Al abrir una conversacion se llama a `markConversationAsRead`, pero la lista del inbox no se actualiza.
  - `apps/web/src/app/features/messages/inbox.page.ts:410-421`
- `markConversationAsRead` actualiza DB, pero el handler del inbox no decrementa.
  - `apps/web/src/app/core/services/bookings/unread-messages.service.ts:208-251`
  - `apps/web/src/app/features/messages/inbox.page.ts:310-334`

### 3) Adjuntos: se suben archivos pero no se envian al chat
- `handleFileSelect` sube a Storage y muestra notificacion, pero **no crea un mensaje** con el link.
  - `apps/web/src/app/features/messages/inbox.page.ts:467-546`
- Resultado: el otro usuario no recibe ningun mensaje con el archivo.

### 4) Bloqueo de usuarios es unidireccional
- `isUserBlocked` solo verifica si **yo** bloquee al otro.
  - `apps/web/src/app/core/services/bookings/messages.service.ts:520-533`
- `sendMessage` no valida si **el otro** me bloqueo.
  - `apps/web/src/app/core/services/bookings/messages.service.ts:170-209`
- Si no hay RLS en DB, un usuario bloqueado puede seguir enviando mensajes.

### 5) Indicador "En linea" es estatico
- La UI muestra estado online fijo (punto verde + texto) sin chequear presencia real.
  - `apps/web/src/app/shared/components/base-chat/base-chat.component.ts:47-57`

### 6) UX offline inconsistente
- Si falla el envio, se encola offline y se hace retry automatico...
  - `apps/web/src/app/core/services/bookings/messages.service.ts:177-206`
- ...pero el chat elimina el mensaje optimista y muestra error al usuario.
  - `apps/web/src/app/shared/components/base-chat/base-chat.component.ts:562-586`
- Resultado: el usuario ve "error", pero el mensaje puede aparecer despues igual.

## Archivos clave para cambios
- Inbox realtime + unread logic: `apps/web/src/app/features/messages/inbox.page.ts`
- Chat base UI + envio: `apps/web/src/app/shared/components/base-chat/base-chat.component.ts`
- Servicio de mensajes: `apps/web/src/app/core/services/bookings/messages.service.ts`
- Servicio de no leidos: `apps/web/src/app/core/services/bookings/unread-messages.service.ts`
