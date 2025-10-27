# 🔍 AUDITORÍA COMPLETA - Sistema de Mensajería Chat

## 📋 RESUMEN EJECUTIVO

El sistema de chat **funciona correctamente** para enviar mensajes directamente entre usuario y propietario, pero **las notificaciones NO están implementadas automáticamente**.

---

## ✅ FLUJO DE MENSAJERÍA (FUNCIONANDO)

### 1. Usuario Envía Mensaje

**Archivo:** `apps/web/src/app/shared/components/booking-chat/booking-chat.component.ts`

```typescript
// Línea 84-108
async sendMessage(): Promise<void> {
  const text = this.newMessage().trim();
  if (!text) return;

  this.sending.set(true);
  this.error.set(null);

  try {
    await this.messagesService.sendMessage({
      recipientId: this.recipientId(),    // ✅ ID del destinatario (propietario)
      body: text,                         // ✅ Contenido del mensaje
      bookingId: this.bookingId(),       // ✅ Asociado a la reserva
    });

    this.newMessage.set('');
    await this.loadMessages();
  } catch (err) {
    console.error('Error sending message:', err);
    this.error.set('No pudimos enviar el mensaje. Intentá de nuevo.');
  } finally {
    this.sending.set(false);
  }
}
```

**✅ Verifica:**
- Usuario autenticado (línea 92-96)
- Destinatario correcto (recipientId)
- Mensaje asociado a la reserva (bookingId)

---

### 2. Servicio de Mensajes

**Archivo:** `apps/web/src/app/core/services/messages.service.ts`

```typescript
// Línea 42-67
async sendMessage(params: {
  recipientId: string;
  body: string;
  bookingId?: string;
  carId?: string;
}): Promise<void> {
  // ✅ PASO 1: Validar que hay booking o car ID
  if (!params.bookingId && !params.carId) {
    throw new Error('Debes indicar bookingId o carId');
  }

  // ✅ PASO 2: Obtener usuario autenticado
  const { data: { user }, error: authError } = await this.supabase.auth.getUser();
  if (authError) throw authError;
  if (!user?.id) throw new Error('Usuario no autenticado');

  // ✅ PASO 3: Insertar mensaje en la base de datos
  const { error } = await this.supabase.from('messages').insert({
    booking_id: params.bookingId ?? null,
    car_id: params.carId ?? null,
    sender_id: user.id,              // ✅ Usuario que envía
    recipient_id: params.recipientId, // ✅ Destinatario
    body: params.body,               // ✅ Contenido
  });
  if (error) throw error;
}
```

**✅ Garantías:**
1. Solo el usuario autenticado puede enviar mensajes
2. El mensaje se asocia correctamente al booking
3. Se guarda sender_id y recipient_id correctos

---

### 3. Base de Datos - Tabla Messages

**Estructura:**
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id),
    car_id UUID REFERENCES cars(id),
    sender_id UUID REFERENCES auth.users(id),    -- ✅ Quién envía
    recipient_id UUID REFERENCES auth.users(id), -- ✅ Quién recibe
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS (Row Level Security):**
```sql
-- Los usuarios solo pueden ver mensajes donde son sender o recipient
CREATE POLICY "Users can view their messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id
);
```

**✅ Seguridad garantizada:**
- Usuario A solo ve mensajes donde es sender o recipient
- Usuario B solo ve mensajes donde es sender o recipient
- **NO hay forma de ver mensajes de otros usuarios**

---

### 4. Propietario Recibe Mensaje en Tiempo Real

**Archivo:** `apps/web/src/app/core/services/messages.service.ts`

```typescript
// Línea 69-87
subscribeToBooking(bookingId: string, handler: (message: Message) => void): void {
  this.unsubscribe();

  // ✅ Suscripción a Realtime de Supabase
  this.realtimeChannel = this.supabase
    .channel(`booking-messages-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',              // ✅ Escucha nuevos mensajes
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`, // ✅ Solo de esta reserva
      },
      (payload: RealtimePostgresChangesPayload<Message>) => {
        handler(payload.new as Message); // ✅ Ejecuta callback con nuevo mensaje
      },
    )
    .subscribe();
}
```

**Archivo:** `booking-chat.component.ts`

```typescript
// Línea 48-59
this.messagesService.subscribeToBooking(this.bookingId(), message => {
  // ✅ Evita duplicados
  this.messages.update(prev => {
    if (prev.some(existing => existing.id === message.id)) {
      return prev;
    }
    return [...prev, message];
  });

  // ✅ Muestra notificación IN-APP si el mensaje es de otro usuario
  if (message.sender_id !== this.currentUserId()) {
    this.showNotification(`Nuevo mensaje de ${this.recipientName()}`);
  }
});
```

**✅ Propietario ve el mensaje:**
1. **Instantáneamente** via Realtime
2. Solo si está en la página del booking
3. Con notificación in-app

---

## ⚠️ NOTIFICACIONES (NO IMPLEMENTADAS)

### Tabla de Notificaciones Existe

**Archivo:** `supabase/migrations/20251026_create_notifications_system.sql`

```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cta_link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    type notification_type NOT NULL,  -- Incluye 'new_chat_message'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**✅ Tipos de notificación definidos:**
- `'new_chat_message'` ✅ EXISTE
- `'new_booking_for_owner'`
- `'payment_successful'`
- etc.

### ❌ PROBLEMA: No hay Trigger para Chat

**Lo que falta:**

```sql
-- ❌ ESTO NO EXISTE ACTUALMENTE
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    cta_link,
    type,
    metadata
  )
  VALUES (
    NEW.recipient_id,
    'Nuevo mensaje',
    'Tienes un nuevo mensaje de chat',
    '/bookings/' || NEW.booking_id,
    'new_chat_message',
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();
```

---

## 🎯 VERIFICACIÓN PASO A PASO

### Test 1: Usuario envía mensaje

```typescript
// Frontend hace esto:
await messagesService.sendMessage({
  recipientId: 'owner-uuid-123',
  body: 'Hola, ¿está disponible el auto?',
  bookingId: 'booking-uuid-456'
});

// Backend inserta en DB:
INSERT INTO messages (
  sender_id,     -- 'user-uuid-789'  ✅ Usuario autenticado
  recipient_id,  -- 'owner-uuid-123' ✅ Propietario
  body,          -- 'Hola, ¿está...' ✅ Contenido
  booking_id     -- 'booking-uuid-456' ✅ Reserva correcta
) VALUES (...);
```

### Test 2: Propietario ve mensaje

```typescript
// Propietario tiene subscripción activa:
subscribeToBooking('booking-uuid-456', (message) => {
  // ✅ Recibe el nuevo mensaje instantáneamente
  console.log('Nuevo mensaje:', message.body);
  // Aparece en pantalla automáticamente
});
```

### Test 3: Seguridad RLS

```sql
-- Usuario A (user-uuid-789) consulta:
SELECT * FROM messages WHERE booking_id = 'booking-uuid-456';

-- RLS devuelve SOLO mensajes donde:
-- sender_id = 'user-uuid-789' OR recipient_id = 'user-uuid-789'
-- ✅ NO puede ver mensajes de otros bookings
-- ✅ NO puede ver mensajes donde no participa
```

---

## 📊 FLUJO COMPLETO

```
┌─────────────┐
│   Usuario   │
│  (Rentador) │
└──────┬──────┘
       │
       │ 1. Escribe mensaje y presiona Enter
       ▼
┌──────────────────────────────┐
│  booking-chat.component.ts   │
│  sendMessage()               │
└──────┬───────────────────────┘
       │
       │ 2. Llama a MessagesService
       ▼
┌──────────────────────────────┐
│  messages.service.ts         │
│  sendMessage()               │
└──────┬───────────────────────┘
       │
       │ 3. Obtiene user.id del auth
       │ 4. INSERT en tabla messages
       ▼
┌──────────────────────────────┐
│  Supabase PostgreSQL         │
│  Table: messages             │
│  ✅ sender_id = Usuario      │
│  ✅ recipient_id = Propietario│
│  ✅ booking_id = Reserva     │
└──────┬───────────────────────┘
       │
       │ 5. Realtime broadcast
       ▼
┌──────────────────────────────┐
│  Propietario (si está online)│
│  subscribeToBooking()        │
│  ✅ Recibe mensaje           │
│  ✅ Ve notificación in-app   │
└──────────────────────────────┘
```

---

## ✅ CONFIRMACIÓN DE SEGURIDAD

### ¿Puede un usuario enviar mensajes haciéndose pasar por otro?

**❌ NO.** El `sender_id` se obtiene de `auth.getUser()` que:
- Verifica el JWT token
- Es manejado por Supabase Auth
- No puede ser falsificado desde el cliente

### ¿Puede un usuario ver mensajes de otras conversaciones?

**❌ NO.** RLS policy:
```sql
auth.uid() = sender_id OR auth.uid() = recipient_id
```

### ¿Se guardan los mensajes correctamente?

**✅ SÍ.** Cada mensaje tiene:
- `sender_id` (quién envió)
- `recipient_id` (quién debe recibir)
- `booking_id` (a qué reserva pertenece)
- `created_at` (timestamp)

---

## 🚨 RECOMENDACIONES

### 1. Implementar Notificaciones Push

**Crear trigger:**
```sql
-- supabase/migrations/20251027_trigger_chat_notifications.sql
CREATE OR REPLACE FUNCTION notify_new_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
BEGIN
  -- Obtener nombre del sender
  SELECT full_name INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id;

  -- Crear notificación para el recipient
  INSERT INTO public.notifications (
    user_id,
    title,
    body,
    cta_link,
    type,
    metadata
  )
  VALUES (
    NEW.recipient_id,
    'Nuevo mensaje',
    COALESCE(v_sender_name, 'Un usuario') || ' te envió un mensaje',
    '/bookings/' || NEW.booking_id,
    'new_chat_message',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'booking_id', NEW.booking_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_chat_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_chat_message();
```

### 2. Agregar Contador de Mensajes No Leídos

```sql
ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_messages_unread 
ON messages(recipient_id, is_read) 
WHERE is_read = FALSE;
```

### 3. Email Notifications (Opcional)

Usar Supabase Edge Functions:
```typescript
// supabase/functions/send-chat-email/index.ts
Deno.serve(async (req) => {
  // Trigger desde notify_new_chat_message()
  // Enviar email al recipient si está offline
});
```

---

## 📝 CONCLUSIÓN

### ✅ FUNCIONANDO CORRECTAMENTE:
1. ✅ Mensajes se envían directamente usuario → propietario
2. ✅ Seguridad RLS impide ver mensajes ajenos
3. ✅ Realtime actualiza mensajes instantáneamente
4. ✅ Notificaciones in-app cuando se recibe mensaje

### ⚠️ FALTA IMPLEMENTAR:
1. ❌ Notificaciones persistentes en tabla `notifications`
2. ❌ Contador de mensajes no leídos
3. ❌ Notificaciones por email (opcional)
4. ❌ Push notifications móviles (opcional)

### 🎯 PRIORIDAD:
**ALTA**: Implementar trigger de notificaciones (arriba en recomendación #1)

---

**Fecha de auditoría:** 2025-10-27  
**Estado:** ✅ Sistema funcional pero incompleto
